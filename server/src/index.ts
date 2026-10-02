// Fridge's Claude proxy: holds the Anthropic API key so testers don't need their own,
// and gives each install a daily allowance.
//
//   POST /v1/messages   same body the app would send to Anthropic; answer passed through
//   GET  /v1/quota      { remaining, limit } for this install today
//   GET  /v1/attest/challenge, POST /v1/attest   App Attest key registration
//   GET  /v1/content/super-ingredients   extra "super ingredient" editions (public)
//   GET  /v1/content/recipes   recipe packs: new recipes without an app update (public)
//   GET  /v1/content/menus     menus: named sets of recipes, weekly and seasonal (public)
//   GET  /privacy       the app's privacy policy (public)
//   GET  /admin         the owner's usage page; its data comes from /admin/usage (ADMIN_TOKEN)
//
// Every /v1 request carries x-fridge-token (built into the app) and x-fridge-install
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
import { AttestError, fromBase64, toBase64, verifyAssertion, verifyAttestation } from "./appattest.ts";
import { adminPage, privacyPage } from "./pages.ts";
import superIngredients from "../content/super-ingredients.json";
import recipePacks from "../content/recipe-packs.json";
import menus from "../content/menus.json";
import { servedMenus } from "./menus.ts";

// The packs are a few hundred KB; serialise them once rather than on every request.
const recipePacksBody = JSON.stringify((({ about: _about, ...content }) => content)(recipePacks));
// Built once a day: a holiday's current window depends on the date.
let menusCache: { day: string; body: string } | undefined;
function menusBody(day: string): string {
  if (menusCache?.day !== day) menusCache = { day, body: JSON.stringify(servedMenus(menus, day)) };
  return menusCache.body;
}
import { addRequest, costOf, lastDays, parseDay } from "./usage.ts";

export interface Env {
  ANTHROPIC_API_KEY: string;
  /** Comma-separated app tokens; list old and new together while rotating. */
  APP_TOKEN: string;
  QUOTA: KVNamespace;
  MODEL: string;
  /** Cheaper model the app may ask for by name for simple extraction jobs. */
  LIGHT_MODEL: string;
  DAILY_LIMIT: string;
  GLOBAL_DAILY_LIMIT: string;
  /** Password for the usage page. Without it the page is off. */
  ADMIN_TOKEN?: string;
  /** Shown on the privacy policy as the contact address; optional. */
  CONTACT_EMAIL?: string;
  /** Apple Team ID and bundle ID, for App Attest. */
  APPLE_TEAM_ID?: string;
  BUNDLE_ID?: string;
  /**
   * "report" (default): answer everyone, count who is verified. "require": only answer
   * requests signed by an attested copy of the app. "off": ignore App Attest.
   */
  ATTEST_MODE?: string;
}

type Verification = "verified" | "missing" | "invalid";

const HEALTH_CHECK_INSTALL = "github-actions-health-check";

const MAX_BODY_BYTES = 20 * 1024 * 1024;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") return json(200, { ok: true });
    if (url.pathname === "/privacy" && request.method === "GET") return html(privacyPage(env.CONTACT_EMAIL ?? ""));
    if (url.pathname === "/v1/content/super-ingredients" && request.method === "GET") {
      // Public, read-only content; phones cache it and fall back to the editions built into the app.
      const { about: _about, ...content } = superIngredients;
      return json(200, content, { "cache-control": "public, max-age=3600" });
    }
    if (url.pathname === "/v1/content/recipes" && request.method === "GET") {
      // Public, read-only content; phones cache it and keep working offline with the last copy.
      return new Response(recipePacksBody, {
        headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" },
      });
    }
    if (url.pathname === "/v1/content/menus" && request.method === "GET") {
      return new Response(menusBody(new Date().toISOString().slice(0, 10)), {
        headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" },
      });
    }
    if (url.pathname === "/admin" && request.method === "GET") return html(adminPage());
    if (url.pathname === "/admin/usage" && request.method === "GET") return usageReport(request, env, url);

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

    if (url.pathname === "/v1/attest/challenge" && request.method === "GET") return attestChallenge(env);
    if (url.pathname === "/v1/attest" && request.method === "POST") return registerKey(request, env);

    const mode = env.ATTEST_MODE ?? "report";
    if (url.pathname === "/v1/quota" && request.method === "GET") {
      const verification = await verifyRequest(request, env, new TextEncoder().encode("GET /v1/quota"));
      if (mode === "require" && verification !== "verified") return attestationRequired();
      return json(200, { remaining: await remainingToday(env.QUOTA, install, now, perInstall), limit: perInstall },
                  { "x-fridge-attest": verification });
    }
    if (url.pathname !== "/v1/messages" || request.method !== "POST") {
      return error(404, "not_found_error", "Not found.");
    }

    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
      return error(413, "request_too_large", "That request is too large.");
    }
    // The assertion signs the exact body bytes, so read them once and parse from them.
    const bodyBytes = new Uint8Array(await request.arrayBuffer());
    const verification = mode === "off" ? "missing" : await verifyRequest(request, env, bodyBytes);
    if (mode === "require" && verification !== "verified") return attestationRequired();
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder().decode(bodyBytes));
    } catch {
      return error(400, "invalid_request_error", "Body must be JSON.");
    }
    if (!env.ANTHROPIC_API_KEY) {
      return error(503, "api_error", "AI features aren't switched on yet. Add your own API key in Settings to use them now.");
    }
    const checked = checkRequest(raw, env.MODEL || "claude-opus-5-5", env.LIGHT_MODEL ?? "claude-haiku-4-5");
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
        // Refusal fallbacks only apply to the main model.
        ...(checked.light ? {} : { betas: ["server-side-fallback-2026-07-01"] }),
      });
      if (install !== HEALTH_CHECK_INSTALL) {
        const firstToday = quota.remaining === perInstall - 1;
        ctx.waitUntil(recordUsage(env.QUOTA, now, message.model, message.usage.input_tokens, message.usage.output_tokens,
                                  firstToday, verification === "verified"));
      }
      return json(200, message, { "x-fridge-remaining": String(quota.remaining), "x-fridge-attest": verification });
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

/** Adds one answered request to today's totals. KV isn't transactional, so a burst can undercount slightly. */
async function recordUsage(kv: KVNamespace, now: Date, model: string, input: number, output: number,
                           firstToday: boolean, verified: boolean): Promise<void> {
  const key = `u:${now.toISOString().slice(0, 10)}`;
  const day = addRequest(parseDay(await kv.get(key)), model, input, output, firstToday, verified);
  await kv.put(key, JSON.stringify(day), { expirationTtl: 60 * 60 * 24 * 400 });
}

async function usageReport(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.ADMIN_TOKEN) return error(404, "not_found_error", "The usage page isn't switched on.");
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!tokenAccepted(given, env.ADMIN_TOKEN)) return error(401, "authentication_error", "Wrong password.");
  const count = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 90);
  const light = env.LIGHT_MODEL ?? "claude-haiku-4-5";
  const days = await Promise.all(
    lastDays(new Date(), count).map(async (day) => {
      const usage = parseDay(await env.QUOTA.get(`u:${day}`));
      const tallies = Object.values(usage.models);
      return {
        day,
        phones: usage.phones ?? 0,
        requests: usage.requests,
        verified: usage.verified ?? 0,
        light: usage.models[light]?.requests ?? 0,
        input: tallies.reduce((sum, t) => sum + t.input, 0),
        output: tallies.reduce((sum, t) => sum + t.output, 0),
        cost: costOf(usage),
        models: usage.models,
      };
    }),
  );
  const limits = { perPhone: Number(env.DAILY_LIMIT) || 15, overall: Number(env.GLOBAL_DAILY_LIMIT) || 150 };
  return json(200, { days, limits, attestMode: env.ATTEST_MODE ?? "report" }, { "cache-control": "no-store" });
}

// MARK: - App Attest

function appId(env: Env): string | null {
  return env.APPLE_TEAM_ID && env.BUNDLE_ID ? `${env.APPLE_TEAM_ID}.${env.BUNDLE_ID}` : null;
}

interface StoredKey {
  publicKey: string;
  counter: number;
  environment: string;
}

/** A one-time challenge for registering a new key; it expires after 5 minutes. */
async function attestChallenge(env: Env): Promise<Response> {
  const challenge = toBase64(crypto.getRandomValues(new Uint8Array(32)));
  await env.QUOTA.put(`ch:${challenge}`, "1", { expirationTtl: 300 });
  return json(200, { challenge }, { "cache-control": "no-store" });
}

/** Registers a device key after checking Apple's attestation for it. */
async function registerKey(request: Request, env: Env): Promise<Response> {
  const app = appId(env);
  if (!app) return error(503, "api_error", "App Attest isn't set up on the server.");
  let body: { keyId?: string; attestation?: string; challenge?: string };
  try {
    body = await request.json();
  } catch {
    return error(400, "invalid_request_error", "Body must be JSON.");
  }
  const { keyId, attestation, challenge } = body;
  if (!keyId || !attestation || !challenge) return error(400, "invalid_request_error", "Missing keyId, attestation or challenge.");
  if (!(await env.QUOTA.get(`ch:${challenge}`))) return error(400, "invalid_request_error", "Unknown or expired challenge.");
  await env.QUOTA.delete(`ch:${challenge}`);
  try {
    const key = await verifyAttestation({
      attestation: fromBase64(attestation), challenge: fromBase64(challenge), keyId, appId: app, allowDevelopment: true,
    });
    const stored: StoredKey = { publicKey: key.publicKey, counter: 0, environment: key.environment };
    await env.QUOTA.put(`ak:${keyId}`, JSON.stringify(stored));
    return json(200, { ok: true, environment: key.environment });
  } catch (err) {
    const reason = err instanceof AttestError ? err.message : "Couldn't read the attestation.";
    console.error("Attestation rejected:", reason);
    return error(400, "invalid_request_error", `Attestation rejected: ${reason}`);
  }
}

/** Checks the request's App Attest assertion over `clientData` and advances the key's counter. */
async function verifyRequest(request: Request, env: Env, clientData: Uint8Array): Promise<Verification> {
  const keyId = request.headers.get("x-fridge-key-id");
  const assertion = request.headers.get("x-fridge-assertion");
  const app = appId(env);
  if (!keyId || !assertion || !app) return "missing";
  const raw = await env.QUOTA.get(`ak:${keyId}`);
  if (!raw) return "invalid";
  const stored = JSON.parse(raw) as StoredKey;
  try {
    const counter = await verifyAssertion({
      assertion: fromBase64(assertion), clientData, publicKey: stored.publicKey, appId: app, previousCounter: stored.counter,
    });
    await env.QUOTA.put(`ak:${keyId}`, JSON.stringify({ ...stored, counter }));
    return "verified";
  } catch {
    return "invalid";
  }
}

/** The app re-registers its key when it sees this, then retries once. */
function attestationRequired(): Response {
  return error(401, "attestation_required", "This copy of the app couldn't be verified. Update Fridge from TestFlight and try again.");
}

function html(body: string): Response {
  return new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
}

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
