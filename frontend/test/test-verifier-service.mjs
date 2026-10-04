import { createClient, chains } from "../node_modules/genlayer-js/dist/index.js";
import fs from "fs";

const deployment = JSON.parse(fs.readFileSync("../contract/deployment.json", "utf8"));
const contractAddress = deployment.contractAddress;

const client = createClient({
  chain: chains.studionet,
  endpoint: "https://studio.genlayer.com/api",
});

async function verifyUpgradedService() {
  const verificationId = "v_1791114595811_813838";

  console.log("Testing contract:", contractAddress);
  console.log("Reading verificationId:", verificationId);

  // 1. Structured read
  const rawData = await client.readContract({
    address: contractAddress,
    functionName: "get_verification",
    args: [verificationId],
  });
  const get = (key) => (rawData instanceof Map ? rawData.get(key) : rawData[key]);

  // 2. Plaintext read
  const text = await client.readContract({
    address: contractAddress,
    functionName: "get_verification_text",
    args: [verificationId],
  });

  // 3. Decision read
  const decision = await client.readContract({
    address: contractAddress,
    functionName: "get_verification_decision",
    args: [verificationId],
  });

  console.log("STRUCTURED DECISION:", get("decision"));
  console.log("STRUCTURED CONFIDENCE:", Number(get("confidence")));
  console.log("PLAINTEXT TEXT:", text);
  console.log("SIMPLE DECISION:", decision);

  if (
    get("decision") === "APPROVED" &&
    text.startsWith("APPROVED — 99% confidence.") &&
    decision === "APPROVED"
  ) {
    console.log("\n>>> SUCCESS: All frontend getters read accurately from upgraded contract!");
  } else {
    console.error("Mismatch in returned data");
    process.exit(1);
  }
}

verifyUpgradedService();
