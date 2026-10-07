# GenChat

> **Ask anything. Get a fast answer. Verify what matters with decentralized evidence consensus.**

GenChat is a production-grade AI assistant combining high-speed conversational intelligence with on-demand, decentralized validator consensus on **GenLayer StudioNet**. Built with a strict separation of concerns, GenChat delivers immediate streaming answers for everyday queries while enabling cryptographically verifiable, multi-validator adjudication for high-stakes decisions through connected browser wallets.

[![Vercel Deployment](https://img.shields.io/badge/Vercel-genchat--nine.vercel.app-black?logo=vercel)](https://genchat-nine.vercel.app)
[![GenLayer StudioNet](https://img.shields.io/badge/GenLayer-StudioNet%20(61999)-amber?logo=ethereum)](https://studio.genlayer.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-blue?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Cloud%20Auth%20%26%20RLS-emerald?logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org)

---

## 1. Verifiable Evidence Protocol Architecture (Critical Steward Fix)

### The Problem in Legacy Design
Previously, GenChat validators assessed a caller-supplied context summary without authenticating or retrieving the underlying web/document evidence behind the claimed factual verification. This allowed a caller to potentially submit an inaccurate summary and receive an approval.

### The New Verifiable Architecture
GenChat does **NOT** treat caller-provided summaries as authoritative evidence. The user-provided summary is purely non-authoritative description metadata.

Instead, GenChat uses GenLayer's native nondeterministic web access (`gl.nondet.web.get`) so that **GenLayer validators independently retrieve and inspect the referenced evidence source contents**:

```text
CLAIM & CRITERIA + SOURCE URL(S) + COMMITMENT HASH
        │
        ▼ (Write Contract via Connected Browser Wallet)
GenLayer StudioNet Intelligent Contract
        │
        ├─► [GenLayer Leader Node]
        │     ├── gl.nondet.web.get(source_url)
        │     ├── Deterministic canonicalization (LF normalization & whitespace trimming)
        │     ├── Computes actual_evidence_hash = SHA256(canonical_content)
        │     ├── Hash commitment check: actual_evidence_hash == expected_evidence_hash
        │     ├── Prompt Injection Defense: source content treated strictly as UNTRUSTED DATA
        │     └── AI Claim Evaluation against retrieved canonical content
        │
        └─► [GenLayer Checking Validator Nodes] (gl.vm.run_nondet_unsafe)
              ├── Independently re-executes gl.nondet.web.get(source_url)
              ├── Independently computes actual_evidence_hash
              ├── Validates hash commitment match
              ├── Independently evaluates claim under criteria
              ├── Equivalence Principle:
              │     - evidence_verified flags MUST match
              │     - actual_evidence_hash MUST match exactly
              │     - decision MUST match
              │     - confidence within 35% tolerance
              │     - invariant: APPROVED requires evidence_verified == true
              └── Multi-validator consensus achieved (MAJORITY_AGREE)
        │
        ▼
On-Chain Auditable Record Stored in Contract State:
  - verification_id
  - claim / question
  - source_urls_json
  - expected_evidence_hash
  - actual_evidence_hash
  - evidence_verified (boolean)
  - decision (APPROVED / REJECTED / INCONCLUSIVE)
  - confidence
  - validator rationale
  - user_context_summary (non-authoritative)
  - timestamps & requester address
```

---

## 2. Pinned Intelligent Contracts on GenLayer StudioNet

| Parameter | Value |
|---|---|
| **Network** | GenLayer StudioNet |
| **Chain ID** | `61999` (`0xF22F`) |
| **RPC Endpoint** | `https://studio.genlayer.com/api` |
| **Explorer** | `https://studio.genlayer.com` |
| **New Upgraded Contract** | `0x02DF9f0Cd7abF48Dea426725567b03032a65651A` |
| **New Deployment Tx** | [`0xfddb9161348fb9a89133039d8f50778e0f3ca96bfb08bc5094d4ad124dd5af03`](https://studio.genlayer.com/tx/0xfddb9161348fb9a89133039d8f50778e0f3ca96bfb08bc5094d4ad124dd5af03) |
| **Old Contract (Deprecated)** | `0x1b06F421f1d7228aC34f087f37309456D2434344` |
| **Runner Dependency** | `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` |

---

## 3. Real StudioNet Evidence Verification Proof

A live multi-validator consensus transaction was submitted and finalized on GenLayer StudioNet to demonstrate the end-to-end evidence path:

- **Transaction Hash:** [`0x45f19d4777fc7fda24f0f01f06c8b64291cee6f6a3e082135c624e0a58d1c092`](https://studio.genlayer.com/tx/0x45f19d4777fc7fda24f0f01f06c8b64291cee6f6a3e082135c624e0a58d1c092)
- **Verification ID:** `v_1791352846702_c2ea0c`
- **Claim:** `"Does the retrieved evidence confirm that EIP stands for Ethereum Improvement Proposal?"`
- **Source URL:** `https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-1.md`
- **Expected Hash Commitment:** `0xad42acaf7e1139ce648a9c5561d1e00e777faf848941e9ee50c3f69792882122`
- **Actual Retrieved Evidence Hash:** `0xad42acaf7e1139ce648a9c5561d1e00e777faf848941e9ee50c3f69792882122`
- **Evidence Verified:** `true` (Exact match)
- **Consensus Result:** `MAJORITY_AGREE` / `ACCEPTED`
- **Final Decision:** `APPROVED` (100% confidence)
- **Validator Rationale:** *"The source explicitly states \"EIP stands for Ethereum Improvement Proposal\" in the definition section."*

---

## 4. Test Matrix & Protocol Invariant Verification

The protocol test suite (`contract/test_protocol_suite.mjs`) validates the security boundaries against attacks and failure modes:

| Test Case | Scenario | Result |
|---|---|---|
| **Test 1 — Caller Summary Alone** | False summary provided, but source contradicts claim. | **PASS** (Validators reject claim: `REJECTED`, summary ignored) |
| **Test 2 — Source Retrieval** | Real public source URL provided. | **PASS** (Validators retrieve source directly via `gl.nondet.web.get`) |
| **Test 3 — Hash Match** | Retrieved canonical hash equals committed hash. | **PASS** (`evidence_verified: true`, eligible for `APPROVED`) |
| **Test 4 — Hash Mismatch** | Caller commits altered hash `0xdeadbeef...`. | **PASS** (`evidence_verified: false`, forced `INCONCLUSIVE`, cannot be approved) |
| **Test 5 — Source Changed** | Source content differs from commitment. | **PASS** (Mismatch detected, `INCONCLUSIVE`) |
| **Test 6 — Source Unavailable** | HTTP 404 URL provided. | **PASS** (`INCONCLUSIVE`, `evidence_verified: false`) |
| **Test 7 — Source Contradiction** | Evidence contradicts claim under criteria. | **PASS** (`REJECTED`) |
| **Test 8 — Adversarial Webpage** | Prompt injection instructions in source content. | **PASS** (Treated strictly as UNTRUSTED DATA; instructions ignored) |
| **Test 9 — Multiple Sources** | Array of URLs passed in `source_urls_json`. | **PASS** (Retrieved, concatenated deterministically, and bound) |
| **Test 10 — No Source URL** | Empty URL array submitted. | **PASS** (Transaction reverts, no record created) |
| **Test 11 — No Evidence Hash** | Empty hash commitment submitted. | **PASS** (Transaction reverts, no record created) |
| **Test 12 — Real StudioNet Run** | Real wallet transaction on live network. | **PASS** (Consensus reached in ~20s, full on-chain provenance stored) |

---

## 5. Product Modes

| Mode | Engine / Provider | Wallet Required? | Typical Latency | Best For |
|---|---|---|---|---|
| **⚡ Fast** | Groq Cloud (`openai/gpt-oss-120b`) | **No** | ~200ms first token | Brainstorming, coding, drafting, general knowledge |
| **🔎 Research** | Groq + `SearchProvider` (Serper / Tavily) | **No** | ~1.5s (live search) | Recent news, technical documentation, factual evidence |
| **⚖️ Verified** | GenLayer StudioNet Intelligent Contract | **Yes (EIP-1193)** | Network consensus | Verifiable claims, contractual criteria, evidence-bound adjudication |

---

## 6. Local Development

### Prerequisites
- Node.js 20+ (Node 24 tested)
- npm 10+
- Python 3.11+ / 3.12+

```bash
# 1. Clone repository
git clone https://github.com/JimmyOgb/genchat.git
cd genchat

# 2. Install dependencies & build frontend
cd frontend
npm install
npm run build

# 3. Test contract with genvm linter
cd ..
python -c "import genvm_linter; print(genvm_linter.GenVMLinter().lint_file('contract/GenChatVerifier.py'))"

# 4. Run real StudioNet evidence verification test
node contract/test_real_studionet_evidence.mjs
```

---

## 7. License

MIT
