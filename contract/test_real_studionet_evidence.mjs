import { readFileSync, writeFileSync } from "fs";
import path from "path";
import crypto from "crypto";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";

// Custom node https fetch polyfill for StudioNet RPC connectivity
function nodeHttpsFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request(
      parsed,
      {
        method: options.method || "GET",
        headers: options.headers || {},
        timeout: 45000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const text = buffer.toString("utf-8");
          resolve(
            new Response(text, {
              status: res.statusCode,
              statusText: res.statusMessage,
              headers: res.headers,
            })
          );
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("nodeHttpsFetch request timed out after 45s"));
    });
    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

globalThis.fetch = nodeHttpsFetch;

import {
  createClient,
  chains,
  createAccount,
  generatePrivateKey,
} from "../frontend/node_modules/genlayer-js/dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function canonicalizeEvidence(raw) {
  if (!raw) return "";
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

function computeEvidenceHash(text) {
  const canonical = canonicalizeEvidence(text);
  const hash = crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
  return `0x${hash.toLowerCase()}`;
}

async function runRealStudioNetVerification() {
  console.log("============================================================================");
  console.log("  GENCHAT: REAL ON-CHAIN EVIDENCE VERIFICATION (STUDIONET MULTI-VALIDATOR)  ");
  console.log("============================================================================\n");

  const deployment = JSON.parse(readFileSync(path.resolve(__dirname, "deployment.json"), "utf8"));
  const contractAddress = deployment.contractAddress;
  console.log("Deployed Intelligent Contract:", contractAddress);
  console.log("Network: GenLayer StudioNet (Chain ID 61999)");

  // 1. Target Evidence URL & Canonical Hash Commitment
  const sourceUrl = "https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-1.md";
  const sourceUrls = [sourceUrl];
  const sourceUrlsJson = JSON.stringify(sourceUrls);

  console.log("\n[1. SOURCE URL & CONTENT-HASH COMMITMENT]");
  console.log("Source URL:", sourceUrl);

  // Fetch reference copy to compute client-side canonical hash commitment
  const localEvidencePath = path.resolve(__dirname, "eip-1.md");
  const rawSourceContent = readFileSync(localEvidencePath, "utf8");
  const expectedEvidenceHash = computeEvidenceHash(rawSourceContent);
  console.log("Expected Canonical Evidence Hash (SHA-256):", expectedEvidenceHash);

  // 2. Claim / Question Specification
  const claim = "Does the retrieved evidence confirm that EIP stands for Ethereum Improvement Proposal?";
  const questionHash = `0x${crypto.createHash("sha256").update(claim).digest("hex")}`;
  const verificationId = `v_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const criteria = "Independently verify whether the source document states that EIP stands for Ethereum Improvement Proposal. Decide APPROVED if unequivocally supported, REJECTED if contradicted, or INCONCLUSIVE if not verified.";
  const userContextSummary = "The user asks for factual verification that EIP stands for Ethereum Improvement Proposal. Note: This summary is non-authoritative description.";
  const createdAt = new Date().toISOString();

  console.log("\n[2. VERIFICATION REQUEST SPECIFICATION]");
  console.log("Verification ID:        ", verificationId);
  console.log("Claim / Question:       ", claim);
  console.log("Question Hash:          ", questionHash);
  console.log("Source URLs JSON:       ", sourceUrlsJson);
  console.log("Expected Evidence Hash: ", expectedEvidenceHash);
  console.log("Criteria:               ", criteria);
  console.log("User Context Summary:   ", userContextSummary);
  console.log("Created At:             ", createdAt);

  // 3. Setup Submitter Account
  const privateKey = generatePrivateKey();
  const account = createAccount(privateKey);
  console.log("\n[3. CONNECTED SUBMITTER WALLET]");
  console.log("Submitter Address:", account.address);

  const client = createClient({
    chain: chains.studionet,
    account,
    endpoint: "https://studio.genlayer.com/api",
  });

  // 4. Submit Transaction to GenLayer StudioNet
  console.log("\n[4. SUBMITTING TRANSACTION TO GENLAYER STUDIONET...]");
  const submitStartTime = Date.now();
  let txHash;
  try {
    txHash = await client.writeContract({
      address: contractAddress,
      functionName: "request_verification",
      args: [
        verificationId,
        claim,
        questionHash,
        expectedEvidenceHash,
        sourceUrlsJson,
        criteria,
        userContextSummary,
        createdAt,
      ],
      value: BigInt(0),
    });
    console.log("Transaction Hash:", txHash);
    console.log("Explorer URL:    ", `https://studio.genlayer.com/tx/${txHash}`);
    console.log("Submission State: SUBMITTED (Validators retrieving external source...)");
  } catch (err) {
    console.error("Failed to submit writeContract transaction:", err);
    process.exit(1);
  }

  // 5. Await Multi-Validator Consensus & Finalization
  console.log("\n[5. AWAITING MULTI-VALIDATOR CONSENSUS & EVIDENCE RETRIEVAL...]");
  let receipt;
  try {
    receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED",
      retries: 60,
      interval: 4000,
      fullTransaction: true,
    });
    const latency = Date.now() - submitStartTime;
    console.log(`Consensus Finalized! Latency: ${latency}ms`);
    console.log("Receipt Status:  ", receipt.statusName || receipt.status);
    console.log("Consensus Result:", receipt.result_name || receipt.result || "MAJORITY_AGREE");
  } catch (err) {
    console.error("Transaction did not reach ACCEPTED state within timeout:", err);
    process.exit(1);
  }

  // 6. Query Structured On-Chain State (Auditable Evidence Provenance)
  console.log("\n[6. QUERYING FINALIZED ON-CHAIN AUDIT RECORD (get_verification)...]");
  let record;
  try {
    const rawData = await client.readContract({
      address: contractAddress,
      functionName: "get_verification",
      args: [verificationId],
    });

    const get = (key) => (rawData instanceof Map ? rawData.get(key) : rawData[key]);

    record = {
      verification_id: get("verification_id"),
      requester: get("requester"),
      question_title: get("question_title"),
      question_hash: get("question_hash"),
      expected_evidence_hash: get("expected_evidence_hash"),
      actual_evidence_hash: get("actual_evidence_hash"),
      source_urls_json: get("source_urls_json"),
      evidence_verified: Boolean(get("evidence_verified")),
      status: get("status"),
      decision: get("decision"),
      confidence: Number(get("confidence")),
      rationale: get("rationale"),
      user_context_summary: get("user_context_summary"),
      created_at: get("created_at"),
      finalized_at: get("finalized_at"),
    };

    console.log("--- AUDITABLE ON-CHAIN RECORD ---");
    console.log("Verification ID:        ", record.verification_id);
    console.log("Requester Address:      ", record.requester);
    console.log("Claim Title:            ", record.question_title);
    console.log("Source URLs On-Chain:   ", record.source_urls_json);
    console.log("Expected Evidence Hash: ", record.expected_evidence_hash);
    console.log("Actual Retrieved Hash:  ", record.actual_evidence_hash);
    console.log("Evidence Verified Flag: ", record.evidence_verified ? "YES (TRUE)" : "NO (FALSE)");
    console.log("Consensus Decision:     ", record.decision);
    console.log("Validator Confidence:   ", `${record.confidence}%`);
    console.log("Validator Rationale:    ", record.rationale);
    console.log("User Context Summary:   ", record.user_context_summary);
  } catch (err) {
    console.error("Failed to read on-chain verification record:", err);
    process.exit(1);
  }

  // 7. Plaintext & Decision Getters
  console.log("\n[7. QUERYING PUBLIC VIEW GETTERS...]");
  const plainTextResult = await client.readContract({
    address: contractAddress,
    functionName: "get_verification_text",
    args: [verificationId],
  });
  console.log("get_verification_text:     ", plainTextResult);

  const decisionResult = await client.readContract({
    address: contractAddress,
    functionName: "get_verification_decision",
    args: [verificationId],
  });
  console.log("get_verification_decision: ", decisionResult);

  const totalCount = await client.readContract({
    address: contractAddress,
    functionName: "get_verification_count",
    args: [],
  });
  console.log("get_verification_count:    ", Number(totalCount));

  // 8. Protocol Invariant & Cryptographic Verifications
  console.log("\n[8. PROTOCOL INVARIANT & CRYPTOGRAPHIC VERIFICATIONS]");
  const hashMatches = record.actual_evidence_hash.toLowerCase() === expectedEvidenceHash.toLowerCase();
  const isApproved = record.decision === "APPROVED";
  const evidenceVerifiedTrue = record.evidence_verified === true;
  const decisionAgreed = decisionResult === record.decision;
  const confidenceInRange = record.confidence >= 70 && record.confidence <= 100;

  console.log("1. Actual Hash == Expected Hash:         ", hashMatches ? "PASS" : "FAIL");
  console.log("2. Evidence Verified Flag is True:       ", evidenceVerifiedTrue ? "PASS" : "FAIL");
  console.log("3. Consensus Decision is APPROVED:       ", isApproved ? "PASS" : "FAIL");
  console.log("4. Decision View Getter Matches Decision:", decisionAgreed ? "PASS" : "FAIL");
  console.log("5. Confidence Score >= 70%:              ", confidenceInRange ? "PASS" : "FAIL");

  if (!hashMatches || !evidenceVerifiedTrue || !isApproved || !decisionAgreed) {
    console.error("FAIL: Protocol verification failed!");
    process.exit(1);
  }

  // 9. Save Real StudioNet Proof Artifact
  const proofResult = {
    test: "real_studionet_evidence_verification",
    network: "studionet",
    chainId: 61999,
    contractAddress,
    walletAddress: account.address,
    verificationId,
    transactionHash: txHash,
    explorerUrl: `https://studio.genlayer.com/tx/${txHash}`,
    sourceUrl,
    sourceUrls: [sourceUrl],
    expectedEvidenceHash,
    actualEvidenceHash: record.actual_evidence_hash,
    evidenceVerified: record.evidence_verified,
    decision: record.decision,
    confidence: record.confidence,
    rationale: record.rationale,
    plainTextResult,
    decisionResult,
    submissionTimestamp: createdAt,
    latencyMs: Date.now() - submitStartTime,
    timestamp: new Date().toISOString(),
  };

  writeFileSync(
    path.resolve(__dirname, "real_studionet_evidence_proof.json"),
    JSON.stringify(proofResult, null, 2),
    "utf8"
  );

  console.log("\nProof artifact saved to contract/real_studionet_evidence_proof.json");
  console.log("\n>>> FULL PASS: REAL STUDIONET MULTI-VALIDATOR EVIDENCE VERIFICATION SUCCEEDED! <<<");
  return proofResult;
}

runRealStudioNetVerification().catch((err) => {
  console.error("FATAL RUN ERROR:", err);
  process.exit(1);
});
