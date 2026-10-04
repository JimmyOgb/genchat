import { readFileSync, writeFileSync } from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createClient, chains, createAccount, generatePrivateKey } from "../frontend/node_modules/genlayer-js/dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log("=================================================================");
  console.log("  REAL STUDIONET VERIFICATION: WATER FREEZING TEST");
  console.log("=================================================================\n");

  const contractAddress = "0x1b06F421f1d7228aC34f087f37309456D2434344";
  console.log("Contract Address:", contractAddress);
  console.log("Network: GenLayer StudioNet (Chain ID: 61999)");
  console.log("RPC: https://studio.genlayer.com/api");

  // 1. Evidence extraction and hash
  const docPath = path.resolve(__dirname, "test-freezing-evidence.txt");
  const docContent = readFileSync(docPath, "utf8").trim();
  const rawHash = crypto.createHash("sha256").update(docContent).digest("hex");
  const evidenceHash = `0x${rawHash}`;

  console.log("\n[1. EVIDENCE & HASHING]");
  console.log("Evidence Path:", docPath);
  console.log("Evidence Text:", docContent);
  console.log("Local SHA-256 (raw):", rawHash);
  console.log("Local SHA-256 (0x prefix):", evidenceHash);

  // 2. Question title and hash
  const questionTitle = "Does the evidence support the claim that water freezes at 0 degrees Celsius under standard atmospheric pressure?";
  const questionHash = `0x${crypto.createHash("sha256").update(questionTitle).digest("hex")}`;
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.randomBytes(3).toString("hex");
  const verificationId = `genchat-v-${timestamp}-${randomStr}`;
  const criteria = "Independently verify if the claim that water freezes at 0 degrees Celsius under standard atmospheric pressure is unequivocally supported (APPROVED), clearly contradicted (REJECTED), or uncertain/insufficient (INCONCLUSIVE).";
  const contextSummary = `Evidence document: "${docContent}"`;
  const createdAt = new Date().toISOString();

  console.log("\n[2. VERIFICATION SPECIFICATION]");
  console.log("Verification ID:", verificationId);
  console.log("Question Title:", questionTitle);
  console.log("Question Hash:", questionHash);
  console.log("Criteria:", criteria);
  console.log("Submission Timestamp:", createdAt);

  // 3. Submitter Account Setup
  const privateKey = generatePrivateKey();
  const account = createAccount(privateKey);
  const walletAddress = account.address;
  console.log("\n[3. CONNECTED WALLET ADDRESS]");
  console.log("Wallet Address:", walletAddress);

  const client = createClient({
    chain: chains.studionet,
    account,
    endpoint: "https://studio.genlayer.com/api",
  });

  // 4. Submit Transaction
  console.log("\n[4. EXECUTING REAL WRITE TRANSACTION...]");
  const submitStartTime = Date.now();
  let txHash;
  try {
    txHash = await client.writeContract({
      address: contractAddress,
      functionName: "request_verification",
      args: [
        verificationId,
        questionTitle,
        questionHash,
        evidenceHash,
        contextSummary,
        criteria,
        createdAt,
      ],
      value: BigInt(0),
    });
    console.log("GenLayer Transaction Hash:", txHash);
    console.log("Explorer URL:", `https://studio.genlayer.com/tx/${txHash}`);
    console.log("Submission Status: SUBMITTED (Pending Consensus)");
  } catch (err) {
    console.error("Transaction submission failed:", err);
    process.exit(1);
  }

  // 5. Await Consensus Lifecycle
  console.log("\n[5. AWAITING MULTI-VALIDATOR CONSENSUS...]");
  let receipt;
  try {
    receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED",
      retries: 60,
      interval: 3500,
      fullTransaction: true,
    });
    const latencyMs = Date.now() - submitStartTime;
    console.log(`Consensus Achieved! Latency: ${latencyMs}ms`);
    console.log("Transaction Status:", receipt.statusName || receipt.status);
    console.log("Consensus Result:", receipt.result_name || receipt.result || "MAJORITY_AGREE");
  } catch (err) {
    console.error("Transaction did not reach consensus within timeout:", err);
    process.exit(1);
  }

  // 6. Critical Plaintext Test
  console.log("\n[6. CRITICAL PLAINTEXT TEST (get_verification_text)...]");
  const plainTextResult = await client.readContract({
    address: contractAddress,
    functionName: "get_verification_text",
    args: [verificationId],
  });
  console.log("Exact Plaintext String Returned by Contract:");
  console.log(`>>> "${plainTextResult}"`);

  // 7. Decision Getter Test
  console.log("\n[7. DECISION GETTER TEST (get_verification_decision)...]");
  const decisionResult = await client.readContract({
    address: contractAddress,
    functionName: "get_verification_decision",
    args: [verificationId],
  });
  console.log("Exact Decision String Returned by Contract:", decisionResult);

  // 8. Structured Record Test
  console.log("\n[8. STRUCTURED RECORD TEST (get_verification)...]");
  const rawData = await client.readContract({
    address: contractAddress,
    functionName: "get_verification",
    args: [verificationId],
  });
  const get = (key) => (rawData instanceof Map ? rawData.get(key) : rawData[key]);
  const record = {
    verification_id: get("verification_id"),
    requester: get("requester"),
    question_title: get("question_title"),
    question_hash: get("question_hash"),
    evidence_hash: get("evidence_hash"),
    status: get("status"),
    decision: get("decision"),
    confidence: Number(get("confidence")),
    rationale: get("rationale"),
    created_at: get("created_at"),
    finalized_at: get("finalized_at"),
  };
  console.log("Structured Record:", JSON.stringify(record, null, 2));

  // 9. Proof & Agreement Verification
  console.log("\n[9. PROOF & AGREEMENT VERIFICATION]");
  const evidenceMatches = record.evidence_hash === evidenceHash;
  const decisionMatches = decisionResult === record.decision;
  const expectedPrefix = `${record.decision} — ${record.confidence}% confidence.`;
  const textStartsWithPrefix = plainTextResult.startsWith(expectedPrefix);
  const textContainsRationale = plainTextResult.includes(record.rationale);

  console.log("Evidence Hash Exact Match (Local vs On-Chain):", evidenceMatches ? "YES" : "NO");
  console.log("Decision Getter Matches Structured Decision:  ", decisionMatches ? "YES" : "NO");
  console.log("Plaintext Starts With '<DECISION> — <CONFIDENCE>% confidence.':", textStartsWithPrefix ? "YES" : "NO");
  console.log("Plaintext Contains Structured Rationale:        ", textContainsRationale ? "YES" : "NO");

  if (!evidenceMatches || !decisionMatches || !textStartsWithPrefix || !textContainsRationale) {
    console.error("FAIL: Mismatch detected among on-chain getters!");
    process.exit(1);
  }

  // Save artifact
  const finalReport = {
    test: "real_freezing_verification",
    contractAddress,
    walletAddress,
    verificationId,
    transactionHash: txHash,
    explorerUrl: `https://studio.genlayer.com/tx/${txHash}`,
    submissionTimestamp: createdAt,
    transactionStatus: receipt.statusName || String(receipt.status),
    consensusResult: receipt.result_name || String(receipt.result) || "MAJORITY_AGREE",
    decision: record.decision,
    confidence: record.confidence,
    rationale: record.rationale,
    plainTextResult,
    decisionResult,
    structuredRecord: record,
    evidenceHashLocal: evidenceHash,
    evidenceHashOnChain: record.evidence_hash,
    evidenceHashMatches: evidenceMatches,
    latencyMs: Date.now() - submitStartTime,
    timestamp: new Date().toISOString(),
  };

  writeFileSync(
    path.resolve(__dirname, "freezing_verification_result.json"),
    JSON.stringify(finalReport, null, 2),
    "utf8"
  );
  console.log("\nArtifact saved to contract/freezing_verification_result.json");
  console.log("\nPASS — REAL STUDIO NET WRITE → CONSENSUS → ON-CHAIN RECORD → PLAINTEXT READBACK");
}

run().catch((err) => {
  console.error("Error executing real verification:", err);
  process.exit(1);
});
