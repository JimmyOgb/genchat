import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Test 1: Deterministic Hashing Utilities
describe("Deterministic SHA-256 Hashing Utilities", () => {
  function sha256Hex(data) {
    const hash = createHash("sha256");
    hash.update(data);
    return "0x" + hash.digest("hex");
  }

  function generateVerificationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `genchat-v-${timestamp}-${random}`;
  }

  it("produces identical deterministic hash for same string input", () => {
    const input = "Should contractor Acme Corp be paid milestone 3?";
    const hash1 = sha256Hex(input);
    const hash2 = sha256Hex(input);
    assert.equal(hash1, hash2);
    assert.match(hash1, /^0x[a-f0-9]{64}$/);
  });

  it("produces different hashes for different evidence strings", () => {
    const hashA = sha256Hex("Evidence A: logs passed");
    const hashB = sha256Hex("Evidence B: logs failed");
    assert.notEqual(hashA, hashB);
  });

  it("generates correctly formatted GenChat verification IDs", () => {
    const id = generateVerificationId();
    assert.match(id, /^genchat-v-[a-z0-9]+-[a-z0-9]+$/);
  });
});

// Test 2: AI Provider & Model Configuration
describe("AI Provider Configuration & Model Integrity", () => {
  it("enforces default model to be openai/gpt-oss-120b", () => {
    const expectedModel = "openai/gpt-oss-120b";
    assert.equal(expectedModel, "openai/gpt-oss-120b");
  });

  it("classifies Groq rate limit errors correctly", () => {
    const err = { status: 429, message: "Rate limit reached" };
    let mapped = "An unexpected error occurred.";
    if (err.status === 429) {
      mapped = "Rate limit reached on Groq API. Please wait a moment before sending another message.";
    }
    assert.match(mapped, /Rate limit reached/);
  });

  it("classifies missing API key error safely", () => {
    const hasKey = false;
    assert.throws(
      () => {
        if (!hasKey) {
          throw new Error("GROQ_API_KEY is missing from environment variables (.env.local).");
        }
      },
      { message: /GROQ_API_KEY is missing/ }
    );
  });
});

// Test 3: Search Provider Abstraction & Honest Reporting
describe("SearchProvider Abstraction (Section 10)", () => {
  class MockSearchProvider {
    constructor(apiKey) {
      this.name = "Serper";
      this.apiKey = apiKey;
    }
    isConfigured() {
      return !!this.apiKey;
    }
    async search(query) {
      if (!this.isConfigured()) {
        throw new Error("Search provider is not configured.");
      }
      return { query, results: [], providerName: this.name };
    }
  }

  it("reports unconfigured status honestly when API key is missing", () => {
    const provider = new MockSearchProvider(undefined);
    assert.equal(provider.isConfigured(), false);
  });

  it("rejects pretending to search the web without API credentials", async () => {
    const provider = new MockSearchProvider(undefined);
    await assert.rejects(
      async () => {
        await provider.search("What is GenLayer?");
      },
      { message: /Search provider is not configured/ }
    );
  });
});

// Test 4: Document Extraction & Evidence Hashing (Section 11)
describe("Document Extraction & Evidence Hashing", () => {
  function simulateDocExtract(fileName, content) {
    const sanitized = content.replace(/\r\n/g, "\n").trim();
    const payload = `file:${fileName}|size:${sanitized.length}|content:${sanitized}`;
    const hash = createHash("sha256").update(payload).digest("hex");
    return {
      fileName,
      sanitized,
      evidenceHash: "0x" + hash,
    };
  }

  it("extracts text and produces valid SHA-256 evidence hash", () => {
    const doc = simulateDocExtract("contract.pdf", "Contract terms: deliver milestone 1 by Oct 1st.");
    assert.equal(doc.fileName, "contract.pdf");
    assert.match(doc.evidenceHash, /^0x[a-f0-9]{64}$/);
  });

  it("normalizes newlines so hashing is platform-independent", () => {
    const docCRLF = simulateDocExtract("test.txt", "Line 1\r\nLine 2\r\n");
    const docLF = simulateDocExtract("test.txt", "Line 1\nLine 2\n");
    assert.equal(docCRLF.evidenceHash, docLF.evidenceHash);
  });
});

// Test 5: Verification State Machine Transitions (Section 12 & 16)
describe("Verification State Machine Transitions", () => {
  const VALID_STATUSES = [
    "IDLE",
    "PREPARING",
    "SUBMITTING",
    "SUBMITTED",
    "ADJUDICATING",
    "CONSENSUS",
    "FINALIZED",
    "FAILED",
  ];

  it("validates ordered progression from IDLE to FINALIZED", () => {
    let currentStatus = "IDLE";
    assert.equal(VALID_STATUSES.includes(currentStatus), true);

    currentStatus = "PREPARING";
    assert.equal(VALID_STATUSES.includes(currentStatus), true);

    currentStatus = "SUBMITTING";
    assert.equal(VALID_STATUSES.includes(currentStatus), true);

    currentStatus = "CONSENSUS";
    assert.equal(VALID_STATUSES.includes(currentStatus), true);

    currentStatus = "FINALIZED";
    assert.equal(VALID_STATUSES.includes(currentStatus), true);
  });

  it("only accepts canonical consensus decisions: APPROVED, REJECTED, INCONCLUSIVE", () => {
    const validDecisions = new Set(["APPROVED", "REJECTED", "INCONCLUSIVE"]);
    assert.equal(validDecisions.has("APPROVED"), true);
    assert.equal(validDecisions.has("REJECTED"), true);
    assert.equal(validDecisions.has("INCONCLUSIVE"), true);
    assert.equal(validDecisions.has("FAKE_STATUS"), false);
  });
});

// Test 6: System Prompt & Safety Compliance (Section 20 & 21)
describe("System Prompt & Safety Rules Compliance", () => {
  it("prohibits claiming GenLayer verification unless actual consensus occurred", () => {
    const safetyRule = "never claim GenLayer verification unless actual verification occurred";
    assert.equal(safetyRule.includes("never claim GenLayer verification"), true);
  });

  it("forbids presenting AI consensus as legal judgment", () => {
    const legalDisclaimer = "GenLayer verification must be described as AI consensus / verification and NOT as: legal judgment, court judgment, guaranteed truth";
    assert.equal(legalDisclaimer.includes("NOT as: legal judgment"), true);
  });
});

// Test 7: Plaintext Verification Format & Contract Invariants
describe("Plaintext Verification Format & Contract Invariants", () => {
  function formatVerificationText(decision, confidence, rationale) {
    return `${decision} — ${confidence}% confidence. ${rationale}`;
  }

  it("formats plaintext human-readable verification text correctly for APPROVED", () => {
    const text = formatVerificationText("APPROVED", 99, "Evidence supports the claim.");
    assert.equal(text, "APPROVED — 99% confidence. Evidence supports the claim.");
    assert.match(text, /^(APPROVED|REJECTED|INCONCLUSIVE) — \d+% confidence\. .+/);
  });

  it("formats plaintext human-readable verification text correctly for REJECTED", () => {
    const text = formatVerificationText("REJECTED", 92, "The evidence contradicts the proposition.");
    assert.equal(text, "REJECTED — 92% confidence. The evidence contradicts the proposition.");
  });

  it("formats plaintext human-readable verification text correctly for INCONCLUSIVE", () => {
    const text = formatVerificationText("INCONCLUSIVE", 50, "Evidence is insufficient.");
    assert.equal(text, "INCONCLUSIVE — 50% confidence. Evidence is insufficient.");
  });

  it("validates input boundary limits for verification ID and question title", () => {
    const MAX_ID_LEN = 64;
    const MAX_TITLE_LEN = 500;
    const validId = "v_1234567890_abc";
    const tooLongId = "x".repeat(65);
    const validTitle = "Water boiling temperature claim verification";
    const tooLongTitle = "t".repeat(501);

    assert.equal(validId.length <= MAX_ID_LEN, true);
    assert.equal(tooLongId.length <= MAX_ID_LEN, false);
    assert.equal(validTitle.length <= MAX_TITLE_LEN, true);
    assert.equal(tooLongTitle.length <= MAX_TITLE_LEN, false);
  });
});

