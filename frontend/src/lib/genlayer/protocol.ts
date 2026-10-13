import type { VerificationDecision, VerificationRecord, VerificationRequest } from "./types";

/**
 * Wire-level protocol for GenChatVerifier (contract/GenChatVerifier.py).
 * Pure functions, no relative runtime imports, so they can be unit-tested offline.
 */

/** Exact argument order of `request_verification` in contract/GenChatVerifier.py. */
export const REQUEST_VERIFICATION_PARAMS = [
  "verification_id",
  "question_title",
  "question_hash",
  "expected_evidence_hash",
  "source_urls_json",
  "criteria",
  "user_context_summary",
  "created_at",
] as const;

export type RequestVerificationArgs = [
  verification_id: string,
  question_title: string,
  question_hash: string,
  expected_evidence_hash: string,
  source_urls_json: string,
  criteria: string,
  user_context_summary: string,
  created_at: string,
];

const HASH_RE = /^(0x)?[0-9a-fA-F]{64}$/;

/**
 * Validates a request against the contract's input rules and serializes it
 * into the eight positional arguments of `request_verification`.
 * `user_context_summary` is passed through as non-authoritative metadata only;
 * source URLs and the expected evidence hash are mandatory.
 */
export function buildRequestArgs(request: VerificationRequest): RequestVerificationArgs {
  const id = (request.verificationId ?? "").trim();
  if (!id) throw new Error("verificationId is required");
  if (id.length > 64) throw new Error("verificationId exceeds 64 characters");

  const title = (request.questionTitle ?? "").trim();
  if (!title) throw new Error("questionTitle is required");
  if (title.length > 500) throw new Error("questionTitle exceeds 500 characters");

  const questionHash = (request.questionHash ?? "").trim().toLowerCase();
  if (questionHash.length < 32) throw new Error("questionHash must be a valid cryptographic hash");

  const expected = (request.expectedEvidenceHash ?? "").trim();
  if (!HASH_RE.test(expected)) {
    throw new Error("expectedEvidenceHash is required and must be a 32-byte SHA-256 hex hash");
  }

  const urls = (request.sourceUrls ?? []).map((u) => (typeof u === "string" ? u.trim() : u));
  if (urls.length === 0) {
    throw new Error("At least one source URL is required; caller summaries cannot replace source evidence");
  }
  for (const u of urls) {
    if (typeof u !== "string" || !/^https?:\/\/\S+$/.test(u)) {
      throw new Error("All source URLs must be valid http/https URLs");
    }
  }

  const criteria = (request.criteria ?? "").trim();
  if (!criteria) throw new Error("criteria is required");
  if (criteria.length > 2000) throw new Error("criteria exceeds 2000 characters");

  const summary = (request.userContextSummary ?? "").trim();
  if (summary.length > 4000) throw new Error("userContextSummary exceeds 4000 characters");

  const createdAt = (request.createdAt ?? "").trim();
  if (!createdAt || createdAt.length > 60) throw new Error("createdAt is required (max 60 characters)");

  return [
    id,
    title,
    questionHash,
    expected.toLowerCase(),
    JSON.stringify(urls),
    criteria,
    summary,
    createdAt,
  ];
}

const DECISIONS = new Set(["APPROVED", "REJECTED", "INCONCLUSIVE"]);

/**
 * Decodes the dict returned by `get_verification` into a VerificationRecord.
 * Nothing is fabricated: malformed or internally inconsistent data throws.
 * `transactionHash` and `explorerUrl` are not returned by the contract; callers attach them.
 */
export function decodeVerificationRecord(raw: unknown): VerificationRecord {
  if (!raw || typeof raw !== "object") {
    throw new Error("Contract returned no verification record");
  }
  const get = (key: string): unknown =>
    raw instanceof Map ? raw.get(key) : (raw as Record<string, unknown>)[key];

  const str = (key: string): string => {
    const v = get(key);
    if (typeof v !== "string") throw new Error(`Record field "${key}" missing or not a string`);
    return v;
  };

  const decision = str("decision").trim().toUpperCase();
  if (!DECISIONS.has(decision)) throw new Error(`Record has invalid decision "${decision}"`);

  const evidenceVerifiedRaw = get("evidence_verified");
  if (typeof evidenceVerifiedRaw !== "boolean") {
    throw new Error('Record field "evidence_verified" missing or not a boolean');
  }
  if (decision === "APPROVED" && !evidenceVerifiedRaw) {
    throw new Error("Inconsistent record: APPROVED without verified evidence");
  }

  const confidence = Number(get("confidence"));
  if (!Number.isInteger(confidence) || confidence < 0 || confidence > 100) {
    throw new Error("Record field \"confidence\" must be an integer between 0 and 100");
  }

  let sourceUrls: string[];
  try {
    const parsed = JSON.parse(str("source_urls_json"));
    if (!Array.isArray(parsed) || !parsed.every((u) => typeof u === "string")) throw new Error();
    sourceUrls = parsed;
  } catch {
    throw new Error('Record field "source_urls_json" is not a JSON array of strings');
  }

  return {
    verificationId: str("verification_id"),
    requester: str("requester"),
    questionTitle: str("question_title"),
    questionHash: str("question_hash"),
    expectedEvidenceHash: str("expected_evidence_hash"),
    actualEvidenceHash: str("actual_evidence_hash"),
    sourceUrls,
    evidenceVerified: evidenceVerifiedRaw,
    status: str("status"),
    decision: decision as VerificationDecision,
    confidence,
    rationale: str("rationale"),
    userContextSummary: str("user_context_summary"),
    createdAt: str("created_at"),
    finalizedAt: str("finalized_at"),
  };
}
