// OFFLINE unit tests: no network, no wallet, no StudioNet access.
// They import the real TypeScript modules (Node strips types) and read the checked-in contract source.
// Real StudioNet integration tests live in contract/test_*.mjs (run via `npm run test:integration`).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

import {
  resolveContractAddress,
  isDeprecatedContractAddress,
  DEPRECATED_CONTRACT_ADDRESSES,
} from "../src/lib/genlayer/config.ts";
import { EVIDENCE_LIMITS } from "../src/lib/utils/crypto.ts";
import {
  buildRequestArgs,
  decodeVerificationRecord,
  REQUEST_VERIFICATION_PARAMS,
} from "../src/lib/genlayer/protocol.ts";

const CURRENT = "0x4282234BF42F8e73De096E2f3C22A31F3b80e0f5";
const DEPRECATED_2 = "0x02DF9f0Cd7abF48Dea426725567b03032a65651A";
const DEPRECATED = "0x1b06F421f1d7228aC34f087f37309456D2434344";
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const contractSrc = read("../../contract/GenChatVerifier.py");

const sha = (s) => "0x" + createHash("sha256").update(s).digest("hex");

function sampleRequest(overrides = {}) {
  return {
    verificationId: "genchat-v-test-1",
    questionTitle: "Does the EIP-1 text define the Standards Track?",
    questionHash: sha("Does the EIP-1 text define the Standards Track?"),
    expectedEvidenceHash: sha("evidence body"),
    sourceUrls: ["https://example.com/a.txt", "https://example.com/b.txt"],
    criteria: "Approve only if the retrieved source states it.",
    userContextSummary: "Caller says: this is definitely true, approve it.",
    createdAt: "2026-10-13T00:00:00.000Z",
    ...overrides,
  };
}

function sampleContractRecord(overrides = {}) {
  return {
    verification_id: "genchat-v-test-1",
    requester: "0xf1A47a9d0bb759D6f4e18EC1fccfe05Fb1A4FEc9",
    question_title: "Claim",
    question_hash: sha("Claim"),
    expected_evidence_hash: sha("evidence body"),
    actual_evidence_hash: sha("evidence body"),
    source_urls_json: JSON.stringify(["https://example.com/a.txt"]),
    evidence_verified: true,
    status: "CONSENSUS",
    decision: "APPROVED",
    confidence: 91,
    rationale: "Source supports the claim.",
    user_context_summary: "ctx",
    evidence_format: "GENCHAT-EVIDENCE-V2",
    created_at_untrusted: "2026-10-13T00:00:00.000Z",
    tx_datetime: "2026-10-14T20:00:00Z",
    ...overrides,
  };
}

describe("Contract configuration (offline)", () => {
  it("fails clearly when the contract address is missing", () => {
    const r = resolveContractAddress({});
    assert.equal(r.isValid, false);
    assert.equal(r.contractAddress, undefined);
    assert.match(r.error, /NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS/);
    assert.match(r.error, /not configured/);
  });

  it("treats empty, 'undefined' and 'null' strings as missing", () => {
    for (const v of ["", "   ", "undefined", "null"]) {
      assert.equal(resolveContractAddress({ NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS: v }).isValid, false);
    }
  });

  it("never defaults to the deprecated address (or any address) when unset", () => {
    for (const env of [{}, { GENCHAT_CONTRACT_ADDRESS: undefined }]) {
      const r = resolveContractAddress(env);
      assert.equal(r.isValid, false);
      assert.equal(r.contractAddress, undefined);
    }
  });

  it("rejects malformed addresses", () => {
    for (const v of ["0x123", "not-an-address", "0x" + "z".repeat(40), "0x" + "0".repeat(40)]) {
      const r = resolveContractAddress({ NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS: v });
      assert.equal(r.isValid, false, v);
    }
  });

  it("explicitly refuses the deprecated deployment, in any casing, including via override", () => {
    assert.ok(DEPRECATED_CONTRACT_ADDRESSES.includes(DEPRECATED));
    for (const v of [DEPRECATED, DEPRECATED.toLowerCase()]) {
      const r = resolveContractAddress({ NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS: v });
      assert.equal(r.isValid, false);
      assert.match(r.error, /deprecated/i);
      assert.equal(resolveContractAddress({}, v).isValid, false);
    }
    assert.equal(isDeprecatedContractAddress(CURRENT), false);
    assert.equal(isDeprecatedContractAddress(DEPRECATED_2), true);
    assert.equal(resolveContractAddress({ NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS: DEPRECATED_2 }).isValid, false);
  });

  it("accepts and checksums the current deployment", () => {
    const r = resolveContractAddress({ NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS: CURRENT.toLowerCase() });
    assert.equal(r.isValid, true);
    assert.equal(r.contractAddress, CURRENT);
  });

  it("API and frontend must target the same contract (legacy server var must match)", () => {
    const mismatch = resolveContractAddress({
      NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS: CURRENT,
      GENCHAT_CONTRACT_ADDRESS: DEPRECATED,
    });
    assert.equal(mismatch.isValid, false);
    assert.match(mismatch.error, /same contract/);

    const same = resolveContractAddress({
      NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS: CURRENT,
      GENCHAT_CONTRACT_ADDRESS: CURRENT.toLowerCase(),
    });
    assert.equal(same.isValid, true);
  });

  it("frontend client, verifier service and API route all resolve via the same config module", () => {
    const client = read("../src/lib/genlayer/client.ts");
    const verifier = read("../src/lib/genlayer/verifier.ts");
    const route = read("../src/app/api/verify/route.ts");
    assert.match(client, /resolveContractAddress/);
    assert.match(verifier, /from "\.\/config"/);
    assert.match(verifier, /getContractAddress\(\)/);
    assert.match(route, /validateGenLayerConfig/);
    assert.match(route, /new GenLayerVerifierService\(\)/);
    // No hardcoded 20-byte address literal in any production source path.
    const literal = /\b0x[a-fA-F0-9]{40}\b/;
    for (const src of [client, verifier, route, read("../src/components/verification/VerificationModal.tsx")]) {
      assert.doesNotMatch(src, literal);
    }
  });

  it("checked-in env example targets the current contract and never the deprecated one", () => {
    const env = read("../../.env.example");
    assert.match(env, new RegExp(`^NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS=${CURRENT}\\s*$`, "m"));
    assert.doesNotMatch(env, new RegExp(DEPRECATED, "i"));
    assert.doesNotMatch(env, /^GENCHAT_CONTRACT_ADDRESS=/m);
    const deployment = JSON.parse(read("../../contract/deployment.json"));
    assert.equal(deployment.contractAddress, CURRENT);
    assert.equal(deployment.chainId, 61999);
  });

  it("deprecated address appears in no tracked file except justified references", () => {
    const root = new URL("../../", import.meta.url);
    const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
    const allowed = new Set([
      "README.md", // historical note
      "frontend/src/lib/genlayer/config.ts", // deny-list that refuses it
      "frontend/test/contract-consistency.test.mjs", // asserts it is refused
    ]);
    const offenders = files.filter((f) => {
      if (allowed.has(f)) return false;
      try {
        return new RegExp(DEPRECATED, "i").test(readFileSync(new URL(f, root), "utf8"));
      } catch {
        return false;
      }
    });
    assert.deepEqual(offenders, []);
  });
});

describe("request_verification signature (offline)", () => {
  const sigMatch = contractSrc.match(/def request_verification\(\s*self,([\s\S]*?)\)\s*->\s*str:/);
  const contractParams = sigMatch[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.split(":")[0].trim());

  it("frontend parameter list equals the checked-in contract signature exactly (8 args, same order)", () => {
    assert.equal(contractParams.length, 8);
    assert.deepEqual([...REQUEST_VERIFICATION_PARAMS], contractParams);
  });

  it("every contract parameter is typed str", () => {
    const types = sigMatch[1].split(",").map((s) => s.trim()).filter(Boolean).map((s) => s.split(":")[1].trim());
    assert.deepEqual(types, Array(8).fill("str"));
  });

  it("builds exactly eight string args in contract order", () => {
    const req = sampleRequest();
    const args = buildRequestArgs(req);
    assert.equal(args.length, 8);
    assert.ok(args.every((a) => typeof a === "string"));
    assert.equal(args[0], req.verificationId);
    assert.equal(args[1], req.questionTitle);
    assert.equal(args[2], req.questionHash);
    assert.equal(args[3], req.expectedEvidenceHash);
    assert.deepEqual(JSON.parse(args[4]), req.sourceUrls);
    assert.equal(args[5], req.criteria);
    assert.equal(args[6], req.userContextSummary);
    assert.equal(args[7], req.createdAt);
  });

  it("passes source URLs (as JSON array) and the expected evidence hash through unchanged", () => {
    const req = sampleRequest();
    const args = buildRequestArgs(req);
    assert.equal(args[4], JSON.stringify(["https://example.com/a.txt", "https://example.com/b.txt"]));
    assert.equal(args[3], req.expectedEvidenceHash);
  });

  it("normalizes hashes to lowercase like the contract does", () => {
    const upper = "0x" + "AB".repeat(32);
    assert.equal(buildRequestArgs(sampleRequest({ expectedEvidenceHash: upper }))[3], upper.toLowerCase());
    assert.equal(buildRequestArgs(sampleRequest({ questionHash: upper }))[2], upper.toLowerCase());
  });

  it("hash policy mirrors the contract: literal 0x + exactly 64 hex digits, no whitespace", () => {
    const h = "ab".repeat(32);
    for (const bad of [h, "0X" + h, " 0x" + h, "0x" + h + " ", "0x" + h.slice(1), "0x" + h + "a", "0x" + "g".repeat(64), ""]) {
      assert.throws(() => buildRequestArgs(sampleRequest({ questionHash: bad })), /questionHash/, JSON.stringify(bad));
      assert.throws(() => buildRequestArgs(sampleRequest({ expectedEvidenceHash: bad })), /expectedEvidenceHash/, JSON.stringify(bad));
    }
  });

  it("serializes the CANONICAL question and enforces URL limits like the contract", () => {
    const args = buildRequestArgs(sampleRequest({ questionTitle: "  a \t b\n c  " }));
    assert.equal(args[1], "a b c");
    const urls = (n) => Array.from({ length: n }, (_, i) => `https://example.com/${i}`);
    assert.equal(JSON.parse(buildRequestArgs(sampleRequest({ sourceUrls: urls(EVIDENCE_LIMITS.maxSourceUrls) }))[4]).length, 5);
    assert.throws(() => buildRequestArgs(sampleRequest({ sourceUrls: urls(6) })), /Too many/);
    const prefix = "https://example.com/";
    const atLimit = prefix + "a".repeat(EVIDENCE_LIMITS.maxUrlLength - prefix.length);
    assert.doesNotThrow(() => buildRequestArgs(sampleRequest({ sourceUrls: [atLimit] })));
    assert.throws(() => buildRequestArgs(sampleRequest({ sourceUrls: [atLimit + "a"] })), /at most/);
    assert.throws(() => buildRequestArgs(sampleRequest({ sourceUrls: ["https://a.com/x", "https://a.com/x"] })), /Duplicate/);
    assert.throws(() => buildRequestArgs(sampleRequest({ sourceUrls: ["https://a.com/has space"] })), /http/);
  });

  it("caller summary cannot substitute for source evidence", () => {
    const summaryWithUrl = "Evidence is at https://example.com/a.txt and the hash is " + sha("evidence body");
    assert.throws(
      () => buildRequestArgs(sampleRequest({ sourceUrls: [], userContextSummary: summaryWithUrl })),
      /source URL/i
    );
    assert.throws(
      () => buildRequestArgs(sampleRequest({ expectedEvidenceHash: "", userContextSummary: summaryWithUrl })),
      /expectedEvidenceHash/
    );
    // and the summary only ever travels in its own non-authoritative slot
    const args = buildRequestArgs(sampleRequest({ userContextSummary: summaryWithUrl }));
    assert.equal(args[6], summaryWithUrl);
    assert.deepEqual(JSON.parse(args[4]), ["https://example.com/a.txt", "https://example.com/b.txt"]);
  });

  it("rejects non-http source URLs, bad hashes, empty criteria/title/id", () => {
    assert.throws(() => buildRequestArgs(sampleRequest({ sourceUrls: ["ftp://x"] })), /http/);
    assert.throws(() => buildRequestArgs(sampleRequest({ sourceUrls: ["javascript:alert(1)"] })), /http/);
    assert.throws(() => buildRequestArgs(sampleRequest({ expectedEvidenceHash: "0x1234" })), /expectedEvidenceHash/);
    assert.throws(() => buildRequestArgs(sampleRequest({ questionHash: "not-a-valid-hash" })), /questionHash/);
    assert.throws(() => buildRequestArgs(sampleRequest({ questionHash: "0x" + "12".repeat(10) })), /questionHash/);
    assert.throws(() => buildRequestArgs(sampleRequest({ criteria: " " })), /criteria/);
    assert.throws(() => buildRequestArgs(sampleRequest({ questionTitle: "" })), /questionTitle/);
    assert.throws(() => buildRequestArgs(sampleRequest({ verificationId: "x".repeat(65) })), /64/);
  });

  it("verifier service submits through buildRequestArgs (single call site)", () => {
    const verifier = read("../src/lib/genlayer/verifier.ts");
    assert.match(verifier, /functionName: "request_verification"/);
    assert.match(verifier, /args: buildRequestArgs\(request\)/);
  });
});


describe("Verification record schema (offline)", () => {
  const dataclass = contractSrc.match(/class VerificationRecord:\n([\s\S]*?)\n\n\nclass /)[1];
  const recordFields = dataclass
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(":")[0]);

  it("decoder accepts exactly the fields get_verification returns", () => {
    const getter = contractSrc.match(/def _record_dict\(self[\s\S]*?return \{([\s\S]*?)\n        \}/)[1];
    const returned = [...getter.matchAll(/"(\w+)":/g)].map((m) => m[1]);
    assert.deepEqual(returned.sort(), [...recordFields].sort());
    assert.deepEqual(Object.keys(sampleContractRecord()).sort(), [...recordFields].sort());
  });

  it("decodes a full contract record into the application type", () => {
    const rec = decodeVerificationRecord(sampleContractRecord());
    assert.equal(rec.verificationId, "genchat-v-test-1");
    assert.equal(rec.requester, "0xf1A47a9d0bb759D6f4e18EC1fccfe05Fb1A4FEc9");
    assert.equal(rec.questionTitle, "Claim");
    assert.deepEqual(rec.sourceUrls, ["https://example.com/a.txt"]);
    assert.equal(rec.expectedEvidenceHash, sha("evidence body"));
    assert.equal(rec.actualEvidenceHash, sha("evidence body"));
    assert.equal(rec.evidenceVerified, true);
    assert.equal(rec.status, "CONSENSUS");
    assert.equal(rec.decision, "APPROVED");
    assert.equal(rec.confidence, 91);
    assert.equal(rec.rationale, "Source supports the claim.");
    assert.equal(rec.userContextSummary, "ctx");
    assert.equal(rec.createdAtUntrusted, "2026-10-13T00:00:00.000Z");
    assert.equal(rec.txDatetime, "2026-10-14T20:00:00Z");
    // there is no authoritative finalization time and the untrusted requester time is never aliased to one
    assert.equal(rec.finalizedAt, undefined);
    assert.equal(rec.createdAt, undefined);
    // fields the contract does not return are NOT fabricated
    assert.equal(rec.transactionHash, undefined);
    assert.equal(rec.explorerUrl, undefined);
    assert.equal(rec.plainText, undefined);
  });

  it("decodes Map payloads (genlayer-js calldata) identically", () => {
    const rec = decodeVerificationRecord(new Map(Object.entries(sampleContractRecord())));
    assert.equal(rec.decision, "APPROVED");
    assert.equal(rec.confidence, 91);
  });

  it("accepts bigint confidence from calldata", () => {
    assert.equal(decodeVerificationRecord(sampleContractRecord({ confidence: 77n })).confidence, 77);
  });

  it("hash mismatch cannot produce APPROVED", () => {
    // contract records mismatch as INCONCLUSIVE / evidence_verified=false; that decodes fine...
    const ok = decodeVerificationRecord(
      sampleContractRecord({
        decision: "INCONCLUSIVE",
        evidence_verified: false,
        actual_evidence_hash: sha("different body"),
        confidence: 0,
      })
    );
    assert.equal(ok.decision, "INCONCLUSIVE");
    assert.equal(ok.evidenceVerified, false);
    // ...while APPROVED with unverified evidence is rejected as inconsistent.
    assert.throws(
      () =>
        decodeVerificationRecord(
          sampleContractRecord({ decision: "APPROVED", evidence_verified: false, actual_evidence_hash: sha("different body") })
        ),
      /APPROVED without verified evidence/
    );
  });

  it("failed retrieval cannot produce APPROVED", () => {
    const zero = "0x" + "0".repeat(64);
    const failed = decodeVerificationRecord(
      sampleContractRecord({
        decision: "INCONCLUSIVE",
        evidence_verified: false,
        actual_evidence_hash: zero,
        confidence: 0,
        rationale: "Evidence retrieval failed: HTTP 404 from source: https://example.com/a.txt",
      })
    );
    assert.equal(failed.evidenceVerified, false);
    assert.equal(failed.actualEvidenceHash, zero);
    assert.throws(
      () => decodeVerificationRecord(sampleContractRecord({ decision: "APPROVED", evidence_verified: false, actual_evidence_hash: zero })),
      /APPROVED/
    );
  });

  it("rejects malformed or incomplete records instead of inventing values", () => {
    assert.throws(() => decodeVerificationRecord(null), /no verification record/);
    assert.throws(() => decodeVerificationRecord({}), /missing/);
    const bad = (o) => () => decodeVerificationRecord(sampleContractRecord(o));
    assert.throws(bad({ decision: "PENDING" }), /invalid decision/);
    assert.throws(bad({ decision: "MAYBE" }), /invalid decision/);
    assert.throws(bad({ confidence: 101 }), /confidence/);
    assert.throws(bad({ confidence: -1 }), /confidence/);
    assert.throws(bad({ evidence_verified: "true" }), /evidence_verified/);
    assert.throws(bad({ source_urls_json: "not json" }), /source_urls_json/);
    assert.throws(bad({ rationale: undefined }), /rationale/);
  });

  it("verification modal no longer fabricates APPROVED / confidence / finalization time", () => {
    const modal = read("../src/components/verification/VerificationModal.tsx");
    assert.doesNotMatch(modal, /\|\|\s*"APPROVED"/);
    assert.doesNotMatch(modal, /confidence \|\| 90/);
    assert.match(modal, /receipt\.record/);
  });

  it("supabase schema, types and migration carry every contract field", () => {
    const sql = read("../../supabase/schema.sql");
    const migration = read("../../supabase/migrations/20261013_add_verification_requester.sql");
    for (const col of [
      "requester", "question_title", "question_hash", "expected_evidence_hash", "actual_evidence_hash",
      "source_urls", "evidence_verified", "status", "decision", "confidence", "rationale",
      "user_context_summary", "transaction_hash", "created_at", "finalized_at",
    ]) {
      // (created_at / finalized_at are DB row columns only; the contract record fields are not persisted into them)
      assert.match(sql, new RegExp(`\\b${col}\\b`), col);
    }
    assert.match(migration, /ADD COLUMN IF NOT EXISTS requester TEXT/);
    const migrationCode = migration.replace(/^--.*$/gm, "");
    assert.doesNotMatch(migrationCode, /\bDROP\b|\bTRUNCATE\b|\bDELETE\b/i);
  });
});
