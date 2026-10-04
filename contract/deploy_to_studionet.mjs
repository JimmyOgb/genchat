import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient, chains, createAccount, generatePrivateKey } from "../frontend/node_modules/genlayer-js/dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deploy() {
  console.log("=== GenChatVerifier Real StudioNet Deployment ===");
  const contractPath = path.resolve(__dirname, "GenChatVerifier.py");
  const codeContent = readFileSync(contractPath, "utf-8");

  // StudioNet is gasless (0 GEN required)
  const privateKey = generatePrivateKey();
  const account = createAccount(privateKey);
  console.log("Deployer Address:", account.address);
  console.log("Network: GenLayer StudioNet (Chain ID 61999)");
  console.log("Endpoint: https://studio.genlayer.com/api");

  const client = createClient({
    chain: chains.studionet,
    account,
    endpoint: "https://studio.genlayer.com/api",
  });

  console.log("\nSubmitting deployContract transaction to StudioNet...");
  try {
    const txHash = await client.deployContract({
      code: codeContent,
      args: [],
    });

    console.log("Deployment Transaction Hash:", txHash);
    console.log("Explorer URL:", `https://studio.genlayer.com/tx/${txHash}`);
    console.log("\nWaiting for StudioNet validator consensus & finalization...");

    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED",
      retries: 40,
      interval: 4000,
      fullTransaction: true,
    });

    console.log("Receipt Status:", receipt.statusName || receipt.status);

    // Extract deployed contract address
    let deployedAddress =
      receipt.contractAddress ||
      receipt.data?.contract_address ||
      receipt.txDataDecoded?.contractAddress ||
      receipt.recipient;

    if (!deployedAddress && receipt.data) {
      deployedAddress = receipt.data.contract_address;
    }

    console.log("\n>>> REAL DEPLOYED CONTRACT ADDRESS:", deployedAddress);
    console.log(">>> DEPLOYED TRANSACTION HASH:", txHash);

    // Save deployment details
    const deploymentInfo = {
      network: "studionet",
      chainId: 61999,
      contractAddress: deployedAddress,
      transactionHash: txHash,
      deployer: account.address,
      deployedAt: new Date().toISOString(),
      explorerUrl: `https://studio.genlayer.com/tx/${txHash}`,
    };

    writeFileSync(
      path.resolve(__dirname, "deployment.json"),
      JSON.stringify(deploymentInfo, null, 2),
      "utf-8"
    );

    console.log("\nSaved deployment artifact to contract/deployment.json");
    return deploymentInfo;
  } catch (err) {
    console.error("StudioNet deployment error:", err);
    throw err;
  }
}

deploy().catch((e) => {
  console.error("FATAL DEPLOYMENT ERROR:", e.message);
  process.exit(1);
});
