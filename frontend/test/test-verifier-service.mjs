import { createClient, chains } from "../node_modules/genlayer-js/dist/index.js";
import fs from "fs";

const deployment = JSON.parse(fs.readFileSync("../contract/deployment.json", "utf8"));
const contractAddress = deployment.contractAddress;

const client = createClient({
  chain: chains.studionet,
  endpoint: "https://studio.genlayer.com/api",
});

async function verifyRead() {
  const rawData = await client.readContract({
    address: contractAddress,
    functionName: "get_verification",
    args: ["v_1791108314337_677c44"],
  });

  const get = (key) => (rawData instanceof Map ? rawData.get(key) : rawData[key]);

  const record = {
    verificationId: get("verification_id"),
    requester: get("requester"),
    questionHash: get("question_hash"),
    evidenceHash: get("evidence_hash"),
    questionTitle: get("question_title"),
    status: get("status"),
    decision: get("decision"),
    confidence: Number(get("confidence")),
    rationale: get("rationale"),
    createdAt: get("created_at"),
    finalizedAt: get("finalized_at"),
  };

  console.log("PARSED ON-CHAIN RECORD:", JSON.stringify(record, null, 2));

  if (record.decision === "APPROVED" && record.evidenceHash && record.confidence === 99) {
    console.log("SUCCESS: On-chain record read & parsed perfectly!");
  } else {
    console.error("Mismatch in record content");
    process.exit(1);
  }
}

verifyRead();
