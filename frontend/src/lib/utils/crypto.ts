/**
 * Deterministic Evidence Canonicalization and SHA-256 Hashing
 * Works seamlessly in both browser and Node.js server environments.
 * Shared exact algorithm with GenChatVerifier smart contract.
 */

/**
 * Canonical question function. MUST stay identical to `canonicalize_question` in
 * contract/GenChatVerifier.py (the contract recomputes and enforces the commitment):
 * trim() and collapse every run of JavaScript-\s whitespace into one ASCII space.
 * No case folding, no Unicode normalization.
 */
export function canonicalizeQuestion(raw: string): string {
  if (!raw) return "";
  return raw.trim().replace(/\s+/g, " ");
}

/** Limits enforced by the contract (see get_limits()). Keep in sync with contract constants. */
export const EVIDENCE_LIMITS = {
  maxSourceUrls: 5,
  maxUrlLength: 2048,
  maxResponseBytes: 16384,
  maxAggregateEvidenceBytes: 32768,
  supportedContentTypes: ["text/plain", "text/markdown", "text/csv", "application/json"],
} as const;

export const EVIDENCE_FORMAT = "GENCHAT-EVIDENCE-V2";

const utf8Length = (s: string) => new TextEncoder().encode(s).length;

/**
 * Unambiguous evidence frame hashed by the contract (GENCHAT-EVIDENCE-V2):
 *   GENCHAT-EVIDENCE-V2\nSOURCES <n>\n  then per source: SOURCE <i> <url>\nBYTES <utf8 len>\n<canonical>\n
 */
export function buildEvidenceFrame(urls: string[], rawBodies: string[]): string {
  if (urls.length !== rawBodies.length) throw new Error("urls and bodies length mismatch");
  let out = `${EVIDENCE_FORMAT}\nSOURCES ${urls.length}\n`;
  urls.forEach((u, i) => {
    const c = canonicalizeEvidence(rawBodies[i]);
    out += `SOURCE ${i} ${u}\nBYTES ${utf8Length(c)}\n${c}\n`;
  });
  return out;
}

export async function computeEvidenceCommitment(urls: string[], rawBodies: string[]): Promise<string> {
  const frame = buildEvidenceFrame(urls, rawBodies);
  if (utf8Length(frame) > EVIDENCE_LIMITS.maxAggregateEvidenceBytes) {
    throw new Error(`Aggregate canonical evidence exceeds ${EVIDENCE_LIMITS.maxAggregateEvidenceBytes} bytes`);
  }
  return (await sha256Hex(frame)).toLowerCase();
}

export function canonicalizeEvidence(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}


export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const buffer = typeof data === "string" ? new TextEncoder().encode(data) : data;
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer as any);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } else {
    // Node.js runtime
    const { createHash } = await import("crypto");
    const hash = createHash("sha256");
    hash.update(data);
    return "0x" + hash.digest("hex");
  }
}


export async function computeCanonicalQuestionHash(rawQuestion: string): Promise<string> {
  const canonical = canonicalizeQuestion(rawQuestion);
  const hash = await sha256Hex(canonical);
  return hash.toLowerCase();
}


/**
 * Generate a unique verification ID
 */
export function generateVerificationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `genchat-v-${timestamp}-${random}`;
}
