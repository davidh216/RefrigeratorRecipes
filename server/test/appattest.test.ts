import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { AttestError, fromBase64, verifyAssertion, verifyAttestation } from "../src/appattest.ts";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
// The sample certificates were valid in 2024.
const WHEN = new Date("2024-06-01T00:00:00Z");

for (const env of ["development", "production"] as const) {
  test(`accepts Apple's ${env} attestation`, async () => {
    const f = fixture(`attestation-${env}`);
    const result = await verifyAttestation({
      attestation: fromBase64(f.attestation), challenge: fromBase64(f.challenge), keyId: f.keyId,
      appId: `${f.teamId}.${f.bundleId}`, now: WHEN, allowDevelopment: true,
    });
    assert.equal(result.environment, env);
    assert.ok(result.publicKey.length > 80);
  });
}

test("rejects a wrong challenge, app, key, date or environment", async () => {
  const f = fixture("attestation-production");
  const base = {
    attestation: fromBase64(f.attestation), challenge: fromBase64(f.challenge), keyId: f.keyId,
    appId: `${f.teamId}.${f.bundleId}`, now: WHEN,
  };
  await assert.rejects(verifyAttestation({ ...base, challenge: new TextEncoder().encode("replayed") }), AttestError);
  await assert.rejects(verifyAttestation({ ...base, appId: `${f.teamId}.com.someone.else` }), AttestError);
  await assert.rejects(verifyAttestation({ ...base, keyId: fixture("attestation-development").keyId }), AttestError);
  await assert.rejects(verifyAttestation({ ...base, now: new Date("2026-01-01T00:00:00Z") }), AttestError);
  const dev = fixture("attestation-development");
  await assert.rejects(verifyAttestation({
    attestation: fromBase64(dev.attestation), challenge: fromBase64(dev.challenge), keyId: dev.keyId,
    appId: `${dev.teamId}.${dev.bundleId}`, now: WHEN,
  }), /environment/);
});

test("rejects a tampered certificate", async () => {
  const f = fixture("attestation-production");
  const bytes = fromBase64(f.attestation);
  bytes[400] ^= 0xff; // inside the leaf certificate
  await assert.rejects(verifyAttestation({
    attestation: bytes, challenge: fromBase64(f.challenge), keyId: f.keyId, appId: `${f.teamId}.${f.bundleId}`, now: WHEN,
  }));
});

test("verifies a request assertion and its counter", async () => {
  const f = fixture("assertion");
  const publicKey = f.publicKeyPem.replace(/-----[A-Z ]+-----|\s/g, "");
  const base = {
    assertion: fromBase64(f.assertion), clientData: new TextEncoder().encode(f.payload), publicKey,
    appId: `${f.teamId}.${f.bundleId}`,
  };
  assert.equal(await verifyAssertion({ ...base, previousCounter: 0 }), 1);
  await assert.rejects(verifyAssertion({ ...base, previousCounter: 1 }), /Replayed/);
  await assert.rejects(verifyAssertion({ ...base, clientData: new TextEncoder().encode(f.payload + " ") }), /signature/);
  await assert.rejects(verifyAssertion({ ...base, appId: "X.com.someone.else", previousCounter: 0 }), /Different app/);
});
