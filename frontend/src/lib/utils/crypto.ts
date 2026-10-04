/**
 * Deterministic SHA-256 Hashing for Evidence and Questions
 * Works seamlessly in both browser and Node.js server environments.
 */

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

/**
 * Generate a unique verification ID
 */
export function generateVerificationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `genchat-v-${timestamp}-${random}`;
}
