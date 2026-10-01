// Apple App Attest verification with WebCrypto, so the server only answers genuine copies of
// Fridge. Follows Apple's "Validating apps that connect to your server":
// https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server
//
// Small, self-contained CBOR and DER readers cover the few structures App Attest uses.

/** Apple App Attestation Root CA (valid 2020–2045), SHA-256 fingerprint
 * 1C:B9:82:3B:A2:8B:A6:AD:2D:33:A0:06:94:1D:E2:AE:4F:51:3E:F1:D4:E8:31:B9:F7:E0:FA:7B:62:42:C9:32.
 * The Server workflow re-downloads it from apple.com on every deploy and stops if it differs. */
export const APPLE_ROOT_CA_BASE64 =
  "MIICITCCAaegAwIBAgIQC/O+DvHN0uD7jG5yH2IXmDAKBggqhkjOPQQDAzBSMSYwJAYDVQQDDB1BcHBsZSBBcHAgQXR0ZXN0YXRpb24gUm9vdCBDQTETMBEGA1UECgwKQXBwbGUgSW5jLjETMBEGA1UECAwKQ2FsaWZvcm5pYTAeFw0yMDAzMTgxODMyNTNaFw00NTAzMTUwMDAwMDBaMFIxJjAkBgNVBAMMHUFwcGxlIEFwcCBBdHRlc3RhdGlvbiBSb290IENBMRMwEQYDVQQKDApBcHBsZSBJbmMuMRMwEQYDVQQIDApDYWxpZm9ybmlhMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAERTHhmLW07ATaFQIEVwTtT4dyctdhNbJhFs/Ii2FdCgAHGbpphY3+d8qjuDngIN3WVhQUBHAoMeQ/cLiP1sOUtgjqK9auYen1mMEvRq9Sk3Jm5X8U62H+xTD3FE9TgS41o0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBSskRBTM72+aEH/pwyp5frq5eWKoTAOBgNVHQ8BAf8EBAMCAQYwCgYIKoZIzj0EAwMDaAAwZQIwQgFGnByvsiVbpTKwSga0kP0e8EeDS4+sQmTvb7vn53O5+FRXgeLhpJ06ysC5PrOyAjEAp5U4xDgEgllF7En3VcE3iexZZtKeYnpqtijVoyFraWVIyd/dganmrduC1bmTBGwD";

const NONCE_EXTENSION_OID = "1.2.840.113635.100.8.2";
const AAGUID_PRODUCTION = "appattest\0\0\0\0\0\0\0";
const AAGUID_DEVELOPMENT = "appattestdevelop";

export class AttestError extends Error {}

// MARK: - Bytes

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function sha256(...parts: Uint8Array[]): Promise<Uint8Array> {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return new Uint8Array(await crypto.subtle.digest("SHA-256", joined));
}

function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

const utf8 = (text: string) => new TextEncoder().encode(text);

// MARK: - CBOR (maps, arrays, byte and text strings, integers)

type Cbor = number | string | Uint8Array | Cbor[] | { [key: string]: Cbor };

export function decodeCbor(bytes: Uint8Array): Cbor {
  let pos = 0;
  const length = (info: number): number => {
    if (info < 24) return info;
    let size = 0;
    if (info === 24) size = 1;
    else if (info === 25) size = 2;
    else if (info === 26) size = 4;
    else throw new AttestError("Unsupported CBOR length");
    let value = 0;
    for (let i = 0; i < size; i++) value = value * 256 + bytes[pos++];
    return value;
  };
  const item = (): Cbor => {
    if (pos >= bytes.length) throw new AttestError("Truncated CBOR");
    const head = bytes[pos++];
    const major = head >> 5;
    const n = length(head & 31);
    switch (major) {
      case 0: return n;
      case 1: return -1 - n;
      case 2: { const out = bytes.slice(pos, pos + n); pos += n; return out; }
      case 3: { const out = new TextDecoder().decode(bytes.slice(pos, pos + n)); pos += n; return out; }
      case 4: return Array.from({ length: n }, () => item());
      case 5: {
        const map: { [key: string]: Cbor } = {};
        for (let i = 0; i < n; i++) map[String(item())] = item();
        return map;
      }
      default: throw new AttestError("Unsupported CBOR type");
    }
  };
  return item();
}

// MARK: - DER

interface Der {
  tag: number;
  /** Whole element, header included. */
  raw: Uint8Array;
  /** Contents only. */
  body: Uint8Array;
}

function readDer(bytes: Uint8Array, start = 0): Der {
  const tag = bytes[start];
  let pos = start + 1;
  let len = bytes[pos++];
  if (len & 0x80) {
    const count = len & 0x7f;
    len = 0;
    for (let i = 0; i < count; i++) len = len * 256 + bytes[pos++];
  }
  if (pos + len > bytes.length) throw new AttestError("Truncated DER");
  return { tag, raw: bytes.slice(start, pos + len), body: bytes.slice(pos, pos + len) };
}

function derChildren(parent: Der): Der[] {
  const out: Der[] = [];
  let pos = 0;
  while (pos < parent.body.length) {
    const child = readDer(parent.body, pos);
    out.push(child);
    pos += child.raw.length;
  }
  return out;
}

function oid(body: Uint8Array): string {
  const parts = [Math.floor(body[0] / 40), body[0] % 40];
  let value = 0;
  for (let i = 1; i < body.length; i++) {
    value = value * 128 + (body[i] & 0x7f);
    if (!(body[i] & 0x80)) {
      parts.push(value);
      value = 0;
    }
  }
  return parts.join(".");
}

function derTime(element: Der): Date {
  const text = new TextDecoder().decode(element.body);
  // UTCTime YYMMDDHHMMSSZ or GeneralizedTime YYYYMMDDHHMMSSZ
  const full = element.tag === 0x17 ? (Number(text.slice(0, 2)) >= 50 ? "19" : "20") + text : text;
  return new Date(Date.UTC(+full.slice(0, 4), +full.slice(4, 6) - 1, +full.slice(6, 8),
                           +full.slice(8, 10), +full.slice(10, 12), +full.slice(12, 14)));
}

interface Certificate {
  tbs: Uint8Array;
  signatureAlgorithm: string;
  signature: Uint8Array;
  notBefore: Date;
  notAfter: Date;
  spki: Uint8Array;
  curve: string;
  extensions: Map<string, Uint8Array>;
}

function parseCertificate(der: Uint8Array): Certificate {
  const [tbs, sigAlg, sigValue] = derChildren(readDer(der));
  const fields = derChildren(tbs);
  const offset = fields[0].tag === 0xa0 ? 1 : 0; // optional [0] version
  const validity = derChildren(fields[offset + 3]);
  const spki = fields[offset + 5];
  const spkiAlg = derChildren(derChildren(spki)[0]);
  const extensions = new Map<string, Uint8Array>();
  const extWrapper = fields.find((f) => f.tag === 0xa3);
  if (extWrapper) {
    for (const ext of derChildren(derChildren(extWrapper)[0])) {
      const parts = derChildren(ext);
      extensions.set(oid(parts[0].body), parts[parts.length - 1].body);
    }
  }
  return {
    tbs: tbs.raw,
    signatureAlgorithm: oid(derChildren(sigAlg)[0].body),
    signature: sigValue.body.slice(1), // drop the BIT STRING's unused-bits byte
    notBefore: derTime(validity[0]),
    notAfter: derTime(validity[1]),
    spki: spki.raw,
    curve: oid(spkiAlg[1].body),
    extensions,
  };
}

const CURVES: Record<string, { name: string; size: number }> = {
  "1.2.840.10045.3.1.7": { name: "P-256", size: 32 },
  "1.3.132.0.34": { name: "P-384", size: 48 },
};
const HASHES: Record<string, string> = {
  "1.2.840.10045.4.3.2": "SHA-256",
  "1.2.840.10045.4.3.3": "SHA-384",
};

/** DER ECDSA signature (SEQUENCE of r, s) to the fixed-size r||s WebCrypto wants. */
function rawSignature(der: Uint8Array, size: number): Uint8Array {
  const [r, s] = derChildren(readDer(der));
  const out = new Uint8Array(size * 2);
  const place = (value: Uint8Array, at: number) => {
    const trimmed = value.slice(Math.max(0, value.length - size));
    out.set(trimmed, at + size - trimmed.length);
  };
  place(r.body, 0);
  place(s.body, size);
  return out;
}

async function importKey(spki: Uint8Array, curve: string): Promise<CryptoKey> {
  const named = CURVES[curve];
  if (!named) throw new AttestError("Unsupported curve");
  return crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: named.name }, false, ["verify"]);
}

async function verifySignedBy(cert: Certificate, issuer: Certificate): Promise<boolean> {
  const hash = HASHES[cert.signatureAlgorithm];
  if (!hash) throw new AttestError("Unsupported signature algorithm");
  const key = await importKey(issuer.spki, issuer.curve);
  return crypto.subtle.verify({ name: "ECDSA", hash }, key, rawSignature(cert.signature, CURVES[issuer.curve].size), cert.tbs);
}

// MARK: - Attestation

export interface AttestedKey {
  /** The device key's SubjectPublicKeyInfo, base64. */
  publicKey: string;
  environment: "production" | "development";
}

/**
 * Checks a new key's attestation. `challenge` is the one-time value the server handed out;
 * the app passed SHA256(challenge) as clientDataHash. `appId` is "TEAMID.bundle.id".
 */
export async function verifyAttestation(params: {
  attestation: Uint8Array;
  challenge: Uint8Array;
  keyId: string;
  appId: string;
  now?: Date;
  allowDevelopment?: boolean;
}): Promise<AttestedKey> {
  const now = params.now ?? new Date();
  const decoded = decodeCbor(params.attestation) as { fmt?: string; attStmt?: { x5c?: Uint8Array[] }; authData?: Uint8Array };
  if (decoded.fmt !== "apple-appattest" || !decoded.attStmt?.x5c || decoded.attStmt.x5c.length < 2 || !decoded.authData) {
    throw new AttestError("Not an App Attest attestation");
  }
  const authData = decoded.authData;

  // 1. The certificates chain to Apple's App Attestation root and are in date.
  const [leaf, intermediate] = decoded.attStmt.x5c.map(parseCertificate);
  const root = parseCertificate(fromBase64(APPLE_ROOT_CA_BASE64));
  for (const cert of [leaf, intermediate]) {
    if (now < cert.notBefore || now > cert.notAfter) throw new AttestError("Certificate out of date");
  }
  if (!(await verifySignedBy(intermediate, root)) || !(await verifySignedBy(leaf, intermediate))) {
    throw new AttestError("Certificate chain doesn't lead to Apple");
  }

  // 2–4. The leaf certificate commits to SHA256(authData || SHA256(challenge)).
  const nonce = await sha256(authData, await sha256(params.challenge));
  const extension = leaf.extensions.get(NONCE_EXTENSION_OID);
  // SEQUENCE { [1] { OCTET STRING nonce } }
  const expectedPrefix = Uint8Array.from([0x30, 0x24, 0xa1, 0x22, 0x04, 0x20]);
  if (!extension || extension.length !== 38 || !equal(extension.slice(0, 6), expectedPrefix) || !equal(extension.slice(6), nonce)) {
    throw new AttestError("Nonce doesn't match");
  }

  // 5. The key ID is the SHA256 of the leaf's public key (the uncompressed EC point).
  const point = leaf.spki.slice(leaf.spki.length - 65);
  const keyId = fromBase64(params.keyId);
  if (!equal(await sha256(point), keyId)) throw new AttestError("Key ID doesn't match the certificate");

  // 6–9. authData: our app, a fresh key, the right environment, the same key ID.
  if (!equal(authData.slice(0, 32), await sha256(utf8(params.appId)))) throw new AttestError("Different app");
  const counter = new DataView(authData.buffer, authData.byteOffset + 33, 4).getUint32(0);
  if (counter !== 0) throw new AttestError("Counter should start at 0");
  const aaguid = new TextDecoder().decode(authData.slice(37, 53));
  const environment = aaguid === AAGUID_PRODUCTION ? "production" : aaguid === AAGUID_DEVELOPMENT ? "development" : null;
  if (!environment || (environment === "development" && !params.allowDevelopment)) throw new AttestError("Wrong environment");
  const credentialLength = new DataView(authData.buffer, authData.byteOffset + 53, 2).getUint16(0);
  if (!equal(authData.slice(55, 55 + credentialLength), keyId)) throw new AttestError("Credential ID doesn't match");

  return { publicKey: toBase64(leaf.spki), environment };
}

// MARK: - Assertions

/**
 * Checks one request's assertion over `clientData` (the request body, or the path for a GET)
 * and returns the new counter, which must be higher than `previousCounter`.
 */
export async function verifyAssertion(params: {
  assertion: Uint8Array;
  clientData: Uint8Array;
  publicKey: string;
  appId: string;
  previousCounter: number;
}): Promise<number> {
  const decoded = decodeCbor(params.assertion) as { signature?: Uint8Array; authenticatorData?: Uint8Array };
  const { signature, authenticatorData } = decoded;
  if (!(signature instanceof Uint8Array) || !(authenticatorData instanceof Uint8Array) || authenticatorData.length < 37) {
    throw new AttestError("Not an App Attest assertion");
  }
  const nonce = await sha256(authenticatorData, await sha256(params.clientData));
  const key = await importKey(fromBase64(params.publicKey), "1.2.840.10045.3.1.7");
  if (!(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, rawSignature(signature, 32), nonce))) {
    throw new AttestError("Bad signature");
  }
  if (!equal(authenticatorData.slice(0, 32), await sha256(utf8(params.appId)))) throw new AttestError("Different app");
  const counter = new DataView(authenticatorData.buffer, authenticatorData.byteOffset + 33, 4).getUint32(0);
  if (counter <= params.previousCounter) throw new AttestError("Replayed request");
  return counter;
}
