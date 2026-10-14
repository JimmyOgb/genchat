// OFFLINE: question canonicalization vectors shared with the contract tests, evidence frame, and the
// server-side commitment helper (stubbed fetch; no network).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  canonicalizeQuestion, computeCanonicalQuestionHash, buildEvidenceFrame, computeEvidenceCommitment, EVIDENCE_LIMITS,
} from "../src/lib/utils/crypto.ts";
import { fetchEvidenceCommitment, assertPublicHttpUrl } from "../src/lib/genlayer/evidence.ts";

const vectors = JSON.parse(readFileSync(new URL("../../contract/tests/question_vectors.json", import.meta.url), "utf8"));
const sha = (s) => "0x" + createHash("sha256").update(s, "utf8").digest("hex");

describe("question canonicalization shared with the contract", () => {
  for (const v of vectors) {
    it(`vector: ${v.name}`, async () => {
      assert.equal(canonicalizeQuestion(v.input), v.canonical);
      assert.equal(await computeCanonicalQuestionHash(v.input), sha(v.canonical));
    });
  }
});

describe("evidence frame (GENCHAT-EVIDENCE-V2)", () => {
  it("matches the documented layout", () => {
    assert.equal(
      buildEvidenceFrame(["https://a.com/x"], ["hello \r\nworld  "]),
      "GENCHAT-EVIDENCE-V2\nSOURCES 1\nSOURCE 0 https://a.com/x\nBYTES 11\nhello\nworld\n"
    );
  });
  it("lengths are UTF-8 bytes", () => {
    assert.match(buildEvidenceFrame(["https://a.com/x"], ["é"]), /BYTES 2\n/);
  });
  it("enforces the aggregate limit", async () => {
    const urls = ["https://a.com/1", "https://a.com/2"];
    await assert.rejects(() => computeEvidenceCommitment(urls, ["a".repeat(16384), "b".repeat(16384)]), /exceeds/);
    await computeEvidenceCommitment(urls, ["a".repeat(16000), "b".repeat(16000)]);
  });
});

const resp = (body, { status = 200, type = "text/plain; charset=utf-8" } = {}) => {
  const headers = type === null ? {} : { "content-type": type };
  const rawBody = type === null ? (typeof body === "string" ? new TextEncoder().encode(body) : body) : body;
  return new Response(rawBody, { status, headers });
};

describe("fetchEvidenceCommitment helper limits (stubbed fetch)", () => {
  const U = "https://example.com/e.txt";
  it("computes the same commitment as the frame hash", async () => {
    const r = await fetchEvidenceCommitment([U], async () => resp("body"));
    assert.equal(r.commitment, await computeEvidenceCommitment([U], ["body"]));
  });
  it("fails closed on status, type, empty, size, utf8, count, duplicates", async () => {
    const f = (x) => async () => x;
    await assert.rejects(fetchEvidenceCommitment([U], f(resp("x", { status: 404 }))), /HTTP 404/);
    await assert.rejects(fetchEvidenceCommitment([U], f(resp("x", { type: "text/html" }))), /content type/);
    await assert.rejects(fetchEvidenceCommitment([U], f(resp("x", { type: null }))), /content type/);
    await assert.rejects(fetchEvidenceCommitment([U], f(resp("  \n"))), /Empty/);
    await assert.rejects(fetchEvidenceCommitment([U], f(resp(""))), /Empty/);
    await assert.rejects(fetchEvidenceCommitment([U], async () => resp("a".repeat(EVIDENCE_LIMITS.maxResponseBytes + 1))), /exceeds/);
    await fetchEvidenceCommitment([U], async () => resp("a".repeat(EVIDENCE_LIMITS.maxResponseBytes)));
    await assert.rejects(fetchEvidenceCommitment([U], f(resp(new Uint8Array([0xff, 0xfe])))), /UTF-8/);
    const many = Array.from({ length: 6 }, (_, i) => `https://example.com/${i}`);
    await assert.rejects(fetchEvidenceCommitment(many, async () => resp("x")), /Too many/);
    await assert.rejects(fetchEvidenceCommitment([U, U], async () => resp("x")), /Duplicate/);
    await assert.rejects(fetchEvidenceCommitment([], async () => resp("x")), /At least one/);
  });
  it("refuses non-public hosts (SSRF guard for the preview helper)", () => {
    for (const bad of ["http://localhost/x", "http://127.0.0.1/x", "http://169.254.169.254/x", "http://[::1]/x", "http://intranet/x", "https://svc.internal/x", "https://u:p@example.com/x", "ftp://example.com/x"]) {
      assert.throws(() => assertPublicHttpUrl(bad), undefined, bad);
    }
    assert.doesNotThrow(() => assertPublicHttpUrl("https://raw.githubusercontent.com/a/b/c.txt"));
  });
});
