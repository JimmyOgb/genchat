// Verifies that the code deployed at contracts/deployment.json matches contract/GenChatVerifier.py.
// Uses the StudioNet JSON-RPC method gen_getContractCode. Read-only; needs no key.
import { readFileSync } from "fs";
import { createHash } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const deployment = JSON.parse(readFileSync(path.join(dir, "deployment.json"), "utf8"));
const local = readFileSync(path.join(dir, "GenChatVerifier.py"), "utf8");
const sha = (s) => createHash("sha256").update(s).digest("hex");

const res = await fetch("https://studio.genlayer.com/api", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "gen_getContractCode", params: [deployment.contractAddress] }),
});
const json = await res.json();
if (json.error || typeof json.result !== "string") {
  console.error("RPC error / unexpected response:", JSON.stringify(json).slice(0, 300));
  process.exit(2);
}
let remote = json.result;
// The RPC may return the source as plain text or base64.
if (!remote.includes("class GenChatVerifier")) {
  try { remote = Buffer.from(remote, "base64").toString("utf8"); } catch {}
}
const norm = (s) => s.replace(/\r\n/g, "\n");
const match = norm(remote) === norm(local);
console.log(JSON.stringify({
  contractAddress: deployment.contractAddress,
  localSha256: sha(norm(local)),
  deployedSha256: sha(norm(remote)),
  match,
}, null, 2));
process.exit(match ? 0 : 1);
