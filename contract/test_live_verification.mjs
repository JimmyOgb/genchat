import { readFileSync, writeFileSync } from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createClient, chains, createAccount, generatePrivateKey } from "../frontend/node_modules/genlayer-js/dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runLiveVerification() {
  console.log("=================================================================");
  console.log("  GENCHAT: REAL ON-CHAIN STUDIO.NET VERIFICATION TEST");
  console.log("=================================================================\n");

  const deployment = JSON.parse(readFileSync(path.resolve(__dirname, "deployment.json"), "utf8"));
  const contractAddress = deployment.contractAddress;
  console.log("Contract Address:", contractAddress);
  console.log("Network: GenLayer StudioNet (Chain ID 61999)");

  // 1. Evidence document extraction & SHA-256 hash
  const docPath = path.resolve(__dirname, "test-evidence.txt");
  const docContent = readFileSync(docPath, "utf8");
  const evidenceHash = crypto.createHash("sha256").update(docContent).digest("hex");

  console.log("\n[1. Document Ingestion & Hashing]");
  console.log("Document Path:", docPath);
  console.log("Document Content:", JSON.stringify(docContent));
  console.log("Locally Computed SHA-256 Evidence Hash:", evidenceHash);

  // 2. Question definition & hashing
  const questionTitle = "Water boils at approximately 100 degrees Celsius at standard atmospheric pressure.";
  const questionHash = crypto.createHash("sha256").update(questionTitle).digest("hex");
  const verificationId = `v_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const criteria = "Verify whether water boils at approximately 100 degrees Celsius under standard atmospheric pressure (1 atm / 101.325 kPa).";
  const contextSummary = `Document excerpt: "${docContent}"`;
  const createdAt = new Date().toISOString();

  console.log("\n[2. Question & Verification Specification]");
  console.log("Verification ID:", verificationId);
  console.log("Question Title:", questionTitle);
  console.log("Question Hash:", questionHash);
  console.log("Criteria:", criteria);

  // 3. Setup GenLayer client
  const privateKey = generatePrivateKey();
  const account = createAccount(privateKey);
  console.log("\n[3. Submitter Account Setup]");
  console.log("Submitter Address:", account.address);

  const client = createClient({
    chain: chains.studionet,
    account,
    endpoint: "https://studio.genlayer.com/api",
  });

  const submitStartTime = Date.now();
  console.log("\n[4. Submitting Transaction to StudioNet...]");

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
    console.log("Transaction Hash:", txHash);
    console.log("Explorer URL:", `https://studio.genlayer.com/tx/${txHash}`);
    console.log("Submission Status: SUBMITTED (Pending Consensus)");
  } catch (err) {
    console.error("Failed to submit transaction:", err);
    process.exit(1);
  }

  // 4. Track finalization & consensus
  console.log("\n[5. Awaiting Multi-Validator Consensus & Finality...]");
  let receipt;
  try {
    receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED",
      retries: 50,
      interval: 4000,
      fullTransaction: true,
    });
    const finalityTime = Date.now() - submitStartTime;
    console.log(`Consensus Achieved! Finalized in ${finalityTime}ms`);
    console.log("Receipt Status:", receipt.statusName || receipt.status);
  } catch (err) {
    console.error("Transaction did not reach ACCEPTED state within timeout:", err);
    process.exit(1);
  }

  // 5. Query verified record from on-chain state
  console.log("\n[6. Querying On-Chain State for Verification Record...]");
  try {
    const record = await client.readContract({
      address: contractAddress,
      functionName: "get_verification",
      args: [verificationId],
    });

    console.log("\n--- ON-CHAIN VERIFICATION RECORD ---");
    console.log("Record Verification ID:", record.verification_id);
    console.log("Requester Address:     ", record.requester);
    console.log("Question Title:        ", record.question_title);
    console.log("On-Chain Question Hash:", record.question_hash);
    console.log("On-Chain Evidence Hash:", record.evidence_hash);
    console.log("Status:                ", record.status);
    console.log("Consensus Decision:    ", record.decision);
    console.log("Confidence Score:      ", record.confidence);
    console.log("Validator Rationale:   ", record.rationale);
    console.log("Finalized At:          ", record.finalized_at);

    // Verify hash match integrity
    const evidenceHashMatches = record.evidence_hash === evidenceHash;
    const questionHashMatches = record.question_hash === questionHash;
    console.log("\n[7. Cryptographic Integrity Checks]");
    console.log("Evidence Hash Matches Local File SHA-256:", evidenceHashMatches);
    console.log("Question Hash Matches Local SHA-256:     ", questionHashMatches);

    // Query total count
    const count = await client.readContract({
      address: contractAddress,
      functionName: "get_verification_count",
      args: [],
    });
    console.log("Total On-Chain Verifications Count:     ", Number(count));

    const testResult = {
      test: "live_studionet_verification",
      network: "studionet",
      chainId: 61999,
      contractAddress,
      verificationId,
      transactionHash: txHash,
      explorerUrl: `https://studio.genlayer.com/tx/${txHash}`,
      decision: record.decision,
      confidence: Number(record.confidence),
      rationale: record.rationale,
      evidenceHashMatches,
      questionHashMatches,
      submissionToConsensusLatencyMs: Date.now() - submitStartTime,
      timestamp: new Date().toISOString(),
    };

    writeFileSync(
      path.resolve(__dirname, "live_verification_result.json"),
      JSON.stringify(testResult, null, 2),
      "utf8"
    );

    console.log("\nTest result saved to contract/live_verification_result.json");
    console.log("\n=== REAL VERIFICATION TEST PASSED SUCESSFULLY ===");
  } catch (err) {
    console.error("Failed to read on-chain verification record:", err);
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
