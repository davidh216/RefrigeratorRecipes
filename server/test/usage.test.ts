import assert from "node:assert/strict";
import { test } from "node:test";
import { addRequest, costOf, emptyDay, lastDays, parseDay } from "../src/usage.ts";

test("tallies requests per model and prices them", () => {
  let day = emptyDay();
  day = addRequest(day, "claude-opus-5-5", 1_000_000, 100_000, true);
  day = addRequest(day, "claude-haiku-4-5", 2_000_000, 0);
  assert.equal(day.requests, 2);
  assert.equal(day.phones, 1);
  assert.deepEqual(day.models["claude-opus-5-5"], { requests: 1, input: 1_000_000, output: 100_000 });
  // Opus: $4 + $2; Haiku: $2.
  assert.equal(costOf(day), 8);
});

test("unknown models are priced conservatively", () => {
  const day = addRequest(emptyDay(), "claude-something-new", 1_000_000, 0);
  assert.equal(costOf(day), 5);
});

test("bad stored values read as an empty day", () => {
  assert.deepEqual(parseDay(null), emptyDay());
  assert.deepEqual(parseDay("not json"), emptyDay());
  assert.deepEqual(parseDay('{"x":1}'), emptyDay());
});

test("last days are newest first in UTC", () => {
  assert.deepEqual(lastDays(new Date("2026-10-01T01:00:00Z"), 3), ["2026-10-01", "2026-09-30", "2026-09-29"]);
});
