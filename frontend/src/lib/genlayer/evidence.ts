import { EVIDENCE_LIMITS, computeEvidenceCommitment } from "../utils/crypto.ts";

/**
 * Server-side HELPER that previews the commitment a requester should submit.
 * It mirrors the contract's retrieval rules (HTTP 200, supported content type, UTF-8,
 * non-empty, per-response and aggregate caps) but it is NOT authoritative: the contract's
 * validators re-fetch independently and the contract recomputes the hash.
 *
 * Because this performs a server-side fetch of a user-supplied URL, it additionally refuses
 * non-public host forms (localhost, IP literals, internal suffixes) and never follows
 * redirects. That guard is not DNS-rebinding proof; it is defence in depth for a preview helper.
 */

export interface EvidenceFetchResult {
  urls: string[];
  commitment: string;
}

const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost", ".lan", ".home"];

export function assertPublicHttpUrl(url: string): void {
  if (typeof url !== "string" || url.length === 0 || url.length > EVIDENCE_LIMITS.maxUrlLength) {
    throw new Error(`URL length must be between 1 and ${EVIDENCE_LIMITS.maxUrlLength} characters`);
  }
  if (!/^https?:\/\/[\x21-\x7e]+$/i.test(url)) {
    throw new Error("All source URLs must be printable-ASCII http/https URLs");
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Malformed source URL");
  }
  if (parsed.username || parsed.password) throw new Error("Credentials in URLs are not allowed");
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.startsWith("[") ||
    /^[0-9.]+$/.test(host) ||
    !host.includes(".") ||
    BLOCKED_SUFFIXES.some((s) => host.endsWith(s))
  ) {
    throw new Error("Source host must be a public DNS name (no localhost, IP literal or internal host)");
  }
}

export async function fetchEvidenceCommitment(
  urls: string[],
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 10000
): Promise<EvidenceFetchResult> {
  if (!Array.isArray(urls) || urls.length === 0) throw new Error("At least one source URL is required");
  if (urls.length > EVIDENCE_LIMITS.maxSourceUrls) {
    throw new Error(`Too many source URLs (maximum ${EVIDENCE_LIMITS.maxSourceUrls})`);
  }
  if (new Set(urls).size !== urls.length) throw new Error("Duplicate source URL");

  const bodies: string[] = [];
  for (const url of urls) {
    assertPublicHttpUrl(url);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetchImpl(url, { redirect: "error", signal: ctrl.signal });
    } catch (e: any) {
      throw new Error(`Could not retrieve ${url}: ${e?.message ?? "request failed"}`);
    } finally {
      clearTimeout(timer);
    }
    if (res.status !== 200) throw new Error(`HTTP ${res.status} from source: ${url}`);
    const ctype = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!(EVIDENCE_LIMITS.supportedContentTypes as readonly string[]).includes(ctype)) {
      throw new Error(`Unsupported or missing content type '${ctype}' from source: ${url}`);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0) throw new Error(`Empty content from source: ${url}`);
    if (bytes.length > EVIDENCE_LIMITS.maxResponseBytes) {
      throw new Error(`Response exceeds ${EVIDENCE_LIMITS.maxResponseBytes} bytes from source: ${url}`);
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error(`Response is not valid UTF-8 from source: ${url}`);
    }
    if (text.includes("\u0000")) throw new Error(`Response contains NUL bytes from source: ${url}`);
    if (text.trim() === "") throw new Error(`Empty content from source: ${url}`);
    bodies.push(text);
  }
  return { urls, commitment: await computeEvidenceCommitment(urls, bodies) };
}
