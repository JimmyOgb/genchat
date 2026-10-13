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

## 2. Honest Verification Claims Framework (Steward Guidance)

GenChat explicitly separates and articulates what GenLayer validator consensus does and does not establish:

1. **Content Integrity:**
   Cryptographic verification that the byte content retrieved from the web yields an identical SHA-256 hash when canonicalized (LF line endings, trimmed trailing whitespace) to the caller's committed `expected_evidence_hash`.
2. **Source Provenance:**
   GenLayer validators independently execute `gl.nondet.web.get` against the specific HTTP(S) URL(s) provided. Provenance confirms which URLs served the content to the validator quorum at execution time.
3. **Semantic Assessment:**
   Decentralized validator LLMs adjudicate whether the retrieved text unequivocally supports the claim under the supplied evaluation criteria according to GenLayer's Equivalence Principle (`gl.vm.run_nondet_unsafe`).
4. **Factual Truth Limitations (Crucial Disclosure):**
   Decentralized consensus on evidence does **not** automatically establish objective, real-world truth. A requester-selected source may be authentic yet biased, outdated, incomplete, or controlled by an interested party. GenChat certifies **evidence integrity and validator agreement against stated criteria**, never infallible real-world factuality.

### Authoritative Timestamps & GenVM Runtime Limitations
- **Requester Metadata (`created_at`):** Supplied by the client at transaction submission time. Stored purely as non-authoritative client metadata. The contract, UI, and ledger explicitly label this field as untrusted caller metadata.
- **Consensus Finalization (`finalized_at`):** Represents the consensus state transition time recorded upon validator finalization.
- **Protocol Resource Limits:**
  - Max source URLs: 10 URLs per verification request.
  - Max claim length: 500 characters.
  - Max criteria length: 2,000 characters.
  - Max user summary: 4,000 characters (strictly isolated as metadata; never fed as evidence).
  - Evaluatable evidence context: 6,000 characters per model prompt slice.
  - Retrieval failures (HTTP 4xx/5xx, timeouts, empty responses) immediately yield `INCONCLUSIVE` (never `APPROVED`).

---

## 3. Pinned Intelligent Contracts on GenLayer StudioNet

| Parameter | Value |
|---|---|
| **Network** | GenLayer StudioNet |
| **Chain ID** | `61999` (`0xF22F`) |
| **RPC Endpoint** | `https://studio.genlayer.com/api` |
| **Explorer** | `https://studio.genlayer.com` |
| **Current Contract (active)** | `0x02DF9f0Cd7abF48Dea426725567b03032a65651A` |
| **Deployment Tx** | [`0xfddb9161348fb9a89133039d8f50778e0f3ca96bfb08bc5094d4ad124dd5af03`](https://studio.genlayer.com/tx/0xfddb9161348fb9a89133039d8f50778e0f3ca96bfb08bc5094d4ad124dd5af03) |
| **Superseded deployment (historical, refused by the app)** | `0x1b06F421f1d7228aC34f087f37309456D2434344` — legacy 7-argument interface; never used as a default or fallback |
| **Runner Dependency** | `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` |

---

## 4. Real StudioNet Evidence Verification Proof

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

## 5. Test Matrix & Protocol Invariant Verification

The protocol test suite covers all 12 steward-required verification scenarios plus additional boundary invariants. All results are committed in machine-readable format at [`contract/test_suite_results.json`](contract/test_suite_results.json):

| Test ID | Scenario & Purpose | Environment | Real Tx Hash / Explorer | Result |
|---|---|---|---|---|
| **PROTOCOL-01** | **Valid matching evidence:** Public source fetched, hash matched, claim approved. | `live_studionet` | [`0x45f19d47...`](https://studio.genlayer.com/tx/0x45f19d4777fc7fda24f0f01f06c8b64291cee6f6a3e082135c624e0a58d1c092) | **PASS** (`APPROVED`, 100%) |
| **PROTOCOL-02** | **Expected-hash mismatch:** Altered hash commitment `0xdeadbeef...`. | `live_studionet` | [`0x4bb516b0...`](https://studio.genlayer.com/tx/0x4bb516b0e7060925a2898cee84f859d276c32a7cd4fc87ce5f84b522bb3b675a) | **PASS** (`INCONCLUSIVE`, ev=false) |
| **PROTOCOL-03** | **Unavailable or 404 source:** Broken source URL fails retrieval. | `live_studionet` | [`0x249cdadc...`](https://studio.genlayer.com/tx/0x249cdadc1c47890abc0049d9142a143de78f6eff207561c2dc98b6eff73ab50c) | **PASS** (`INCONCLUSIVE`, ev=false) |
| **PROTOCOL-04** | **Prompt-injection defense:** Adversarial instructions in source treated strictly as DATA. | `live_studionet` | [`0x0d4acc21...`](https://studio.genlayer.com/tx/0x0d4acc21d889883389cf9394e8e8b12ac9c8f8bf429bdf61da931514343ad7f8) | **PASS** (`REJECTED`, 100%) |
| **PROTOCOL-05** | **Empty source list:** Empty URL array `[]` submitted. | `local_direct_stubbed` | Reverts deterministically | **PASS** (Revert confirmed) |
| **PROTOCOL-06** | **Validator disagreement:** Equivalence rule tests for hash, decision, confidence divergence >35%. | `local_direct_stubbed` | N/A (contract equivalence logic) | **PASS** (Disagreement rejected) |
| **PROTOCOL-07** | **Modified source content:** Web body altered after commitment forces hash mismatch. | `local_direct_stubbed` | N/A (direct VM) | **PASS** (`INCONCLUSIVE`) |
| **PROTOCOL-08** | **Oversized individual response:** Large source documents bounded safely into prompt context. | `local_direct_stubbed` | N/A (direct VM) | **PASS** (Bounded, summary ignored) |
| **PROTOCOL-09** | **Oversized aggregate evidence:** Multi-source aggregate evidence bounded and hash-bound. | `local_direct_stubbed` | N/A (direct VM) | **PASS** (Composite hash bound) |
| **PROTOCOL-10** | **Malformed model response:** Validator LLM non-JSON or invalid decision fallback. | `local_direct_stubbed` | N/A (direct VM) | **PASS** (`INCONCLUSIVE` fallback) |
| **PROTOCOL-11** | **Contradictory multiple sources:** Conflicting facts across URLs detected by validators. | `local_direct_stubbed` | N/A (direct VM) | **PASS** (`REJECTED`, conflict noted) |
| **PROTOCOL-12** | **Question commitment mismatch & malformed hash:** Altered question detected; short hash reverts. | `local_direct_stubbed` | N/A (direct VM) | **PASS** (Hash mismatch detected) |
| **PROTOCOL-13** | **Untrusted caller summary override defense:** False caller summary contradicted by source. | `live_studionet` | [`0x63bf11f0...`](https://studio.genlayer.com/tx/0x63bf11f0b486bb4060ad84c408534a82000479ca5e356065ffc5e78c31566dc2) | **PASS** (`REJECTED`, summary ignored) |
| **PROTOCOL-14** | **Timestamp metadata boundaries:** Valid ISO format accepted; invalid format rejected. | `local_direct_stubbed` | N/A (direct VM) | **PASS** (Boundary validated) |
| **PROTOCOL-15** | **Duplicate verification ID defense:** Prevents overwriting finalized consensus records. | `local_direct_stubbed` | N/A (direct VM) | **PASS** (Duplicate reverts) |

Every test scenario records exact reproducible fixtures, expected vs actual outcomes, and network status in [`contract/test_suite_results.json`](contract/test_suite_results.json).

---

## 6. Product Modes

| Mode | Engine / Provider | Wallet Required? | Typical Latency | Best For |
|---|---|---|---|---|
| **⚡ Fast** | Groq Cloud (`openai/gpt-oss-120b`) | **No** | ~200ms first token | Brainstorming, coding, drafting, general knowledge |
| **🔎 Research** | Groq + `SearchProvider` (Serper / Tavily) | **No** | ~1.5s (live search) | Recent news, technical documentation, factual evidence |
| **⚖️ Verified** | GenLayer StudioNet Intelligent Contract | **Yes (EIP-1193)** | Network consensus | Verifiable claims, contractual criteria, evidence-bound adjudication |

---

## 7. Local Development & Configuration

### Prerequisites
- Node.js 20+ (Node 24 tested; the offline tests import `.ts` sources directly, which needs Node 22.6+)
- npm 10+
- Python 3.11+ / 3.12+ (contract tests and linter)

### Environment configuration
```bash
git clone https://github.com/JimmyOgb/genchat.git
cd genchat
cp .env.example frontend/.env.local   # then fill in the secrets
```

`NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS` is **required** and has **no default**. The frontend and the API
routes both read this single variable, so they always target the same contract. If it is missing,
malformed, the zero address, or a deprecated deployment, the app fails with a clear error instead of
silently falling back. Production (e.g. Vercel) must set it explicitly to the current deployment:

```env
NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS=0x02DF9f0Cd7abF48Dea426725567b03032a65651A
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
```

Do not set a separate `GENCHAT_CONTRACT_ADDRESS`; if present it must equal the public value.
Server-only secrets (`GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SERPER_API_KEY`, `TAVILY_API_KEY`)
never use the `NEXT_PUBLIC_` prefix and are never committed.

### Request signature (8 arguments)
Source of truth: [`contract/GenChatVerifier.py`](contract/GenChatVerifier.py). The frontend builds
arguments in [`frontend/src/lib/genlayer/protocol.ts`](frontend/src/lib/genlayer/protocol.ts) (`buildRequestArgs`),
and a unit test asserts the order matches the contract source exactly.

```python
request_verification(
    verification_id: str,        # 1..64 chars, unique
    question_title: str,         # claim / question, <= 500 chars
    question_hash: str,          # hash of the claim, >= 32 chars
    expected_evidence_hash: str, # 0x SHA-256 commitment over the canonicalized source(s)
    source_urls_json: str,       # JSON array of http(s) URLs (non-empty)
    criteria: str,               # evaluation criteria, <= 2000 chars
    user_context_summary: str,   # NON-AUTHORITATIVE metadata only, <= 4000 chars
    created_at: str,             # ISO timestamp, <= 60 chars
) -> str                         # APPROVED | REJECTED | INCONCLUSIVE
```

### Evidence retrieval and hash verification
Validators fetch every URL with `gl.nondet.web.get`, canonicalize (LF line endings, trimmed whitespace),
join sources with `\n---\n`, and compute `0x` + SHA-256. `evidence_verified` is true only if retrieval
succeeded **and** the hash equals `expected_evidence_hash`. `APPROVED` is impossible otherwise.

### Record schema (`get_verification`)
`verification_id`, `requester`, `question_title`, `question_hash`, `expected_evidence_hash`,
`actual_evidence_hash`, `source_urls_json`, `evidence_verified`, `status` (`CONSENSUS`), `decision`,
`confidence` (0-100), `rationale`, `user_context_summary`, `created_at`, `finalized_at`.
The transaction hash and explorer URL are not returned by the contract; the client attaches them from the
transaction receipt. The UI shows the record exactly as decoded from the contract; nothing is synthesized.

Supabase `public.verifications` mirrors these fields. Existing databases: apply the additive,
non-destructive migration [`supabase/migrations/20261013_add_verification_requester.sql`](supabase/migrations/20261013_add_verification_requester.sql).

### Test commands
| Command | Scope | Network |
|---|---|---|
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint | offline |
| `npm test` | Frontend unit + contract-consistency tests (`frontend/test/`) | **offline** |
| `npm run contract:lint` | `genvm-lint` on the contract | offline (needs GenVM bundle cache) |
| `npm run contract:test` | Direct-mode contract tests (`contract/tests/`) | **offline** (web/LLM inputs stubbed; contract logic is real) |
| `npm run test:integration` | Real StudioNet transactions and consensus (`contract/test_*.mjs`) | **requires StudioNet** |
| `npm run build` | Production build | offline |

```bash
cd frontend && npm install && cd ..
npm run typecheck && npm run lint && npm test && npm run contract:test && npm run build
```


---

## 8. License

MIT
