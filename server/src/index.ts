// Fridge's Claude proxy: holds the Anthropic API key so testers don't need their own,
// and gives each install a daily allowance.
//
//   POST /v1/messages   same body the app would send to Anthropic; answer passed through
//   GET  /v1/quota      { remaining, limit } for this install today
//
// Every request carries x-fridge-token (built into the app) and x-fridge-install
// (a random ID the app keeps in its Keychain).

import Anthropic from "@anthropic-ai/sdk";
import {
  checkRequest,
  isInstallID,
  refundQuota,
  remainingToday,
  secondsUntilReset,
  shouldRefund,
  takeQuota,
  tokenAccepted,
} from "./policy.ts";

export interface Env {
  ANTHROPIC_API_KEY: string;
  /** Comma-separated app tokens; list old and new together while rotating. */
  APP_TOKEN: string;
  QUOTA: KVNamespace;
  MODEL: string;
  DAILY_LIMIT: string;
  GLOBAL_DAILY_LIMIT: string;
}

const MAX_BODY_BYTES = 20 * 1024 * 1024;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") return json(200, { ok: true });

    if (!tokenAccepted(request.headers.get("x-fridge-token"), env.APP_TOKEN)) {
      return error(401, "authentication_error", "This build of the app isn't recognized.");
    }
    const install = request.headers.get("x-fridge-install");
    if (!isInstallID(install)) return error(400, "invalid_request_error", "Missing install ID.");
    if (await env.QUOTA.get(`block:${install}`)) {
      return error(403, "permission_error", "AI features are turned off for this device.");
    }

    const perInstall = Number(env.DAILY_LIMIT) || 15;
    const now = new Date();

    if (url.pathname === "/v1/quota" && request.method === "GET") {
      return json(200, { remaining: await remainingToday(env.QUOTA, install, now, perInstall), limit: perInstall });
    }
    if (url.pathname !== "/v1/messages" || request.method !== "POST") {
      return error(404, "not_found_error", "Not found.");
    }

    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
      return error(413, "request_too_large", "That request is too large.");
    }
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return error(400, "invalid_request_error", "Body must be JSON.");
    }
    const checked = checkRequest(raw, env.MODEL || "claude-opus-5-5");
    if (!checked.ok) return error(400, "invalid_request_error", checked.message);

    const quota = await takeQuota(env.QUOTA, install, now, perInstall, Number(env.GLOBAL_DAILY_LIMIT) || 150);
    if (!quota.allowed) {
      const message =
        quota.reason === "install"
          ? `You've used today's ${perInstall} AI requests. They reset at midnight UTC, or add your own API key in Settings.`
          : "The app's shared AI allowance is used up for today. Try again tomorrow, or add your own API key in Settings.";
      return error(429, "rate_limit_error", message, {
        "retry-after": String(secondsUntilReset(now)),
        "x-fridge-remaining": String(quota.remaining),
      });
    }

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 170_000 });
    try {
      const message = await client.beta.messages.create({
        ...(checked.body as unknown as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming),
        betas: ["server-side-fallback-2026-07-01"],
      });
      return json(200, message, { "x-fridge-remaining": String(quota.remaining) });
    } catch (err) {
      const status = err instanceof Anthropic.APIError && !(err instanceof Anthropic.APIConnectionError) ? (err.status ?? 502) : 502;
      if (shouldRefund(status) || status === 401 || status === 403) {
        ctx.waitUntil(refundQuota(env.QUOTA, install, now));
      }
      if (err instanceof Anthropic.APIConnectionError) {
        return error(502, "api_error", "Couldn't reach Claude. Try again in a moment.");
      }
      if (err instanceof Anthropic.APIError) {
        // Pass Anthropic's own status and error body straight through; the app already reads them.
        if (status === 401 || status === 403) {
          console.error("Anthropic rejected the server key", status, err.message);
          return error(502, "api_error", "The server's Claude key isn't working. Tell whoever runs this app.");
        }
        const body = (err.error as { error?: { type?: string; message?: string } } | undefined)?.error;
        return error(status, body?.type ?? "api_error", body?.message ?? err.message);
      }
      console.error("Proxy failure", err);
      ctx.waitUntil(refundQuota(env.QUOTA, install, now));
      return error(500, "api_error", "Something went wrong on the server.");
    }
  },
} satisfies ExportedHandler<Env>;

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/** Same envelope as the Anthropic API, so the app handles both identically. */
function error(status: number, type: string, message: string, headers: Record<string, string> = {}): Response {
  return json(status, { type: "error", error: { type, message } }, headers);
}
