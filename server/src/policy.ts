// Pure request rules for the proxy, kept apart from the Worker so they can be unit-tested.

/** The only request fields the app sends. Anything else (tools, thinking, speed…) is dropped. */
const ALLOWED_FIELDS = ["model", "max_tokens", "system", "messages", "output_config", "fallbacks"] as const;
const ALLOWED_EFFORT = new Set(["low", "medium", "high"]);
export const MAX_TOKENS_CAP = 16000;

export type Checked = { ok: true; body: Record<string, unknown>; light: boolean } | { ok: false; message: string };

/**
 * Keeps a Messages request inside what the app needs: one of the server's two models,
 * at most 16k output tokens, no tools, and effort no higher than "high".
 *
 * The app asks for `lightModel` for simple extraction (photos, receipts, nutrition);
 * anything else runs on `model`. The light model takes no effort level and no refusal
 * fallbacks, so those are removed for it.
 */
export function checkRequest(raw: unknown, model: string, lightModel = ""): Checked {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }
  const input = raw as Record<string, unknown>;
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    return { ok: false, message: "messages must be a non-empty array." };
  }
  const body: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (input[field] !== undefined) body[field] = input[field];
  }
  const light = lightModel !== "" && input.model === lightModel;
  body.model = light ? lightModel : model;
  const requested = typeof input.max_tokens === "number" ? Math.floor(input.max_tokens) : MAX_TOKENS_CAP;
  body.max_tokens = Math.min(Math.max(requested, 1), MAX_TOKENS_CAP);
  if (light) delete body.fallbacks;
  else body.fallbacks = "default";

  if (body.output_config !== undefined) {
    if (typeof body.output_config !== "object" || body.output_config === null) {
      return { ok: false, message: "output_config must be an object." };
    }
    const config = { ...(body.output_config as Record<string, unknown>) };
    if (config.effort !== undefined && !ALLOWED_EFFORT.has(String(config.effort))) config.effort = "high";
    for (const key of Object.keys(config)) {
      if (key !== "effort" && key !== "format") delete config[key];
    }
    if (light) delete config.effort;
    if (Object.keys(config).length > 0) body.output_config = config;
    else delete body.output_config;
  }
  return { ok: true, body, light };
}

/** Install IDs are random UUIDs made by the app. */
export function isInstallID(value: string | null): value is string {
  return value !== null && /^[A-Za-z0-9-]{16,64}$/.test(value);
}

/** Accepts any of the comma-separated tokens, so a token can be rotated without breaking older builds. */
export function tokenAccepted(given: string | null, configured: string | undefined): boolean {
  if (!given || !configured) return false;
  return configured
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .some((token) => constantTimeEqual(given, token));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** UTC calendar day, the unit quotas reset on. */
export function dayStamp(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Seconds until the next UTC midnight, for Retry-After. */
export function secondsUntilReset(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

/** The subset of Workers KV the quota needs; tests pass an in-memory map. */
export interface Counter {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export type QuotaResult =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: "install" | "global"; remaining: number };

/**
 * Counts one request against the install's daily allowance and the whole app's daily cap.
 * KV is eventually consistent, so a burst can go slightly over; that's fine for a cost guard.
 */
export async function takeQuota(
  kv: Counter,
  install: string,
  now: Date,
  perInstall: number,
  global: number,
): Promise<QuotaResult> {
  const day = dayStamp(now);
  const installKey = `q:${day}:${install}`;
  const globalKey = `q:${day}:*`;
  const [installUsed, globalUsed] = await Promise.all([kv.get(installKey), kv.get(globalKey)]);
  const mine = Number(installUsed ?? 0);
  const everyone = Number(globalUsed ?? 0);
  if (mine >= perInstall) return { allowed: false, reason: "install", remaining: 0 };
  if (everyone >= global) return { allowed: false, reason: "global", remaining: perInstall - mine };
  const ttl = { expirationTtl: 60 * 60 * 48 };
  await Promise.all([kv.put(installKey, String(mine + 1), ttl), kv.put(globalKey, String(everyone + 1), ttl)]);
  return { allowed: true, remaining: perInstall - mine - 1 };
}

/**
 * Gives back a request that failed on Anthropic's side or ours (overloaded, network, bad key),
 * so testers aren't charged for errors they couldn't avoid.
 */
export async function refundQuota(kv: Counter, install: string, now: Date): Promise<void> {
  const day = dayStamp(now);
  const ttl = { expirationTtl: 60 * 60 * 48 };
  await Promise.all(
    [`q:${day}:${install}`, `q:${day}:*`].map(async (key) => {
      const used = Number((await kv.get(key)) ?? 0);
      if (used > 0) await kv.put(key, String(used - 1), ttl);
    }),
  );
}

/** Failures that aren't the request's fault: rate limits, overload, server errors. */
export function shouldRefund(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function remainingToday(kv: Counter, install: string, now: Date, perInstall: number): Promise<number> {
  const used = Number((await kv.get(`q:${dayStamp(now)}:${install}`)) ?? 0);
  return Math.max(0, perInstall - used);
}
