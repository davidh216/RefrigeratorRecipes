import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRequest, isInstallID, secondsUntilReset, takeQuota, tokenAccepted, type Counter } from "../src/policy.ts";

function memory(): Counter & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async get(key) { return data.get(key) ?? null; },
    async put(key, value) { data.set(key, value); },
  };
}

test("forces the server model, caps tokens and drops extra fields", () => {
  const result = checkRequest({
    model: "claude-fable-5-1", max_tokens: 128000, messages: [{ role: "user", content: "hi" }],
    tools: [{ name: "x" }], speed: "fast", output_config: { effort: "max", format: { type: "json_schema" }, task_budget: {} },
  }, "claude-opus-5-5");
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.body.model, "claude-opus-5-5");
  assert.equal(result.body.max_tokens, 16000);
  assert.equal(result.body.fallbacks, "default");
  assert.equal(result.body.tools, undefined);
  assert.equal(result.body.speed, undefined);
  assert.deepEqual(result.body.output_config, { effort: "high", format: { type: "json_schema" } });
});

test("keeps what the app sends", () => {
  const result = checkRequest({
    model: "claude-opus-5", max_tokens: 16000, system: "s", messages: [{ role: "user", content: "hi" }],
    fallbacks: "default", output_config: { effort: "medium" },
  }, "claude-opus-5-5");
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.body.system, "s");
  assert.deepEqual(result.body.output_config, { effort: "medium" });
});

test("rejects bodies without messages", () => {
  assert.equal(checkRequest({ model: "x" }, "m").ok, false);
  assert.equal(checkRequest([], "m").ok, false);
  assert.equal(checkRequest(null, "m").ok, false);
});

test("install IDs and tokens", () => {
  assert.ok(isInstallID("6F1C2B7A-0D1E-4F3A-9B2C-123456789ABC"));
  assert.ok(!isInstallID("short"));
  assert.ok(!isInstallID("bad id with spaces and more text"));
  assert.ok(!isInstallID(null));
  assert.ok(tokenAccepted("new", "old, new"));
  assert.ok(!tokenAccepted("nope", "old,new"));
  assert.ok(!tokenAccepted("", "old"));
  assert.ok(!tokenAccepted("old", ""));
});

test("daily quota per install and overall", async () => {
  const kv = memory();
  const now = new Date("2026-09-28T12:00:00Z");
  assert.deepEqual(await takeQuota(kv, "a", now, 2, 3), { allowed: true, remaining: 1 });
  assert.deepEqual(await takeQuota(kv, "a", now, 2, 3), { allowed: true, remaining: 0 });
  assert.equal((await takeQuota(kv, "a", now, 2, 3)).allowed, false);
  assert.equal((await takeQuota(kv, "b", now, 2, 3)).allowed, true);
  const overall = await takeQuota(kv, "c", now, 2, 3);
  assert.equal(overall.allowed, false);
  if (!overall.allowed) assert.equal(overall.reason, "global");
  // A new day starts fresh.
  assert.equal((await takeQuota(kv, "a", new Date("2026-09-29T00:00:01Z"), 2, 3)).allowed, true);
});

test("seconds until midnight UTC", () => {
  assert.equal(secondsUntilReset(new Date("2026-09-28T23:59:00Z")), 60);
});
