/**
 * Deterministic Evidence Canonicalization and SHA-256 Hashing
 * Works seamlessly in both browser and Node.js server environments.
 * Shared exact algorithm with GenChatVerifier smart contract.
 */

export function canonicalizeQuestion(raw: string): string {
  if (!raw) return "";
  return raw.trim().split(/\s+/).join(" ");
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

export async function computeCanonicalEvidenceHash(rawContent: string): Promise<string> {
  const canonical = canonicalizeEvidence(rawContent);
  const hash = await sha256Hex(canonical);
  return hash.toLowerCase();
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
