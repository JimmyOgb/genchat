// LIVE StudioNet suite (NOT stubbed). Submits real transactions to the contract in deployment.json.
// Run with:  npm run test:integration   (needs network; fixtures must be pushed to GitHub master first)
// Writes contract/live_studionet_results.json containing ONLY what actually happened.
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import crypto from "crypto";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";

function nodeHttpsFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request(parsed, { method: options.method || "GET", headers: options.headers || {}, timeout: 45000 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve(new Response(Buffer.concat(chunks).toString("utf-8"), { status: res.statusCode, statusText: res.statusMessage, headers: res.headers }))
      );
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("request timed out after 45s")); });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}
globalThis.fetch = nodeHttpsFetch;

const { createClient, chains, createAccount, generatePrivateKey } = await import("../frontend/node_modules/genlayer-js/dist/index.js");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- documented protocol (identical to contract + frontend) ----
const canonicalizeEvidence = (raw) =>
  raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n").map((l) => l.trimEnd()).join("\n");
const canonicalQuestion = (q) => q.trim().replace(/\s+/g, " ");
const sha = (s) => "0x" + crypto.createHash("sha256").update(s, "utf8").digest("hex");
function frame(urls, bodies) {
  let out = `GENCHAT-EVIDENCE-V2\nSOURCES ${urls.length}\n`;
  urls.forEach((u, i) => {
    const c = canonicalizeEvidence(bodies[i]);
    out += `SOURCE ${i} ${u}\nBYTES ${Buffer.byteLength(c, "utf8")}\n${c}\n`;
  });
  return out;
}
const evidenceHash = (urls, bodies) => sha(frame(urls, bodies));

const RAW = "https://raw.githubusercontent.com/JimmyOgb/genchat/master/contract/live_fixtures/";
const SMALL_URL = RAW + "small.txt";
const BIG_URL = RAW + "big.txt";
const MISSING_URL = RAW + "does-not-exist-404.txt";
const smallBody = readFileSync(path.join(__dirname, "live_fixtures/small.txt"), "utf8");

const deployment = JSON.parse(readFileSync(path.join(__dirname, "deployment.json"), "utf8"));
const contractAddress = deployment.contractAddress;
const client = createClient({ chain: chains.studionet, account: createAccount(generatePrivateKey()), endpoint: "https://studio.genlayer.com/api" });

const get = (raw, k) => (raw instanceof Map ? raw.get(k) : raw[k]);
const results = [];

async function run(name, { claim, urls, expected, criteria, summary = "non-authoritative", questionHash, expectRevert = false }) {
  const id = `live_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const qh = questionHash ?? sha(canonicalQuestion(claim));
  console.log(`\n>>> ${name}`);
  const entry = { name, verificationId: id };
  try {
    const tx = await client.writeContract({
      address: contractAddress,
      functionName: "request_verification",
      args: [id, claim, qh, expected, JSON.stringify(urls), criteria, summary, "2000-01-01T00:00:00Z"],
      value: BigInt(0),
    });
    entry.transactionHash = tx;
    console.log("tx:", tx);
    const receipt = await client.waitForTransactionReceipt({ hash: tx, status: "ACCEPTED", retries: 80, interval: 4000, fullTransaction: true });
    entry.receiptStatus = receipt.statusName || String(receipt.status);
    let raw;
    try {
      raw = await client.readContract({ address: contractAddress, functionName: "get_verification", args: [id] });
    } catch (e) {
      entry.readback = "record not found";
      entry.pass = expectRevert;
      results.push(entry);
      console.log(expectRevert ? "PASS (no record created)" : "FAIL (no record)");
      return entry;
    }
    const rec = {};
    for (const k of ["decision", "confidence", "evidence_verified", "actual_evidence_hash", "expected_evidence_hash", "question_hash", "rationale", "created_at_untrusted", "tx_datetime", "source_urls_json", "evidence_format"]) {
      const v = get(raw, k);
      rec[k] = typeof v === "bigint" ? Number(v) : v;
    }
    entry.record = rec;
    entry.pass = !expectRevert;
  } catch (e) {
    entry.error = String(e?.message || e).slice(0, 300);
    entry.pass = expectRevert;
  }
  results.push(entry);
  return entry;
}

const claimA = "Does the retrieved evidence state that EIP stands for Ethereum Improvement Proposal?";
const crit = "APPROVED only if the retrieved source unequivocally states it; REJECTED if contradicted; otherwise INCONCLUSIVE.";

// L1: valid evidence + valid commitment -> evidence verified, tx_datetime from runtime != caller created_at
let e = await run("L1 happy path (single small source)", { claim: claimA, urls: [SMALL_URL], expected: evidenceHash([SMALL_URL], [smallBody]), criteria: crit });
if (e.record) {
  e.pass = e.record.evidence_verified === true && e.record.actual_evidence_hash === e.record.expected_evidence_hash &&
    e.record.created_at_untrusted === "2000-01-01T00:00:00Z" && e.record.tx_datetime && e.record.tx_datetime !== e.record.created_at_untrusted &&
    e.record.evidence_format === "GENCHAT-EVIDENCE-V2";
  e.note = `decision=${e.record.decision} (semantic assessment by validators; not a proof of factual truth)`;
}

// L2: wrong commitment -> not verified, never APPROVED
e = await run("L2 evidence hash mismatch", { claim: claimA, urls: [SMALL_URL], expected: sha("not the evidence"), criteria: crit });
if (e.record) e.pass = e.record.evidence_verified === false && e.record.decision === "INCONCLUSIVE";

// L3: HTTP 404 -> fail closed
e = await run("L3 source returns HTTP 404", { claim: claimA, urls: [MISSING_URL], expected: sha("x"), criteria: crit });
if (e.record) e.pass = e.record.evidence_verified === false && e.record.decision === "INCONCLUSIVE";

// L4: oversized single response (>16384 bytes) -> fail closed
e = await run("L4 oversized response (> 16384 bytes)", { claim: claimA, urls: [BIG_URL], expected: sha("x"), criteria: crit });
if (e.record) e.pass = e.record.evidence_verified === false && e.record.decision === "INCONCLUSIVE" && /exceeds/i.test(e.record.rationale);

// L5: question hash mismatch -> contract rejects, no record
await run("L5 question hash does not match canonical question", { claim: claimA, urls: [SMALL_URL], expected: evidenceHash([SMALL_URL], [smallBody]), criteria: crit, questionHash: sha("a different question"), expectRevert: true });

// L6: too many URLs -> contract rejects, no record
await run("L6 six source URLs", { claim: claimA, urls: Array.from({ length: 6 }, (_, i) => SMALL_URL + "?n=" + i), expected: sha("x"), criteria: crit, expectRevert: true });

const out = {
  kind: "LIVE_STUDIONET",
  network: "studionet",
  chainId: 61999,
  contractAddress,
  deploymentTransaction: deployment.transactionHash,
  ranAt: new Date().toISOString(),
  allPassed: results.every((r) => r.pass),
  results,
};
writeFileSync(path.join(__dirname, "live_studionet_results.json"), JSON.stringify(out, null, 2), "utf8");
console.log("\n" + JSON.stringify(results.map((r) => ({ name: r.name, pass: r.pass, tx: r.transactionHash, decision: r.record?.decision })), null, 2));
process.exit(out.allPassed ? 0 : 1);
