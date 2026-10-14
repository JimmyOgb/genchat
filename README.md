# GenChat

> **Ask anything. Get a fast answer. Verify what matters with decentralized evidence consensus.**

GenChat is a production-grade AI assistant combining high-speed conversational intelligence with on-demand, decentralized validator consensus on **GenLayer StudioNet**. Built with a strict separation of concerns, GenChat delivers immediate streaming answers for everyday queries while enabling cryptographically verifiable, multi-validator adjudication for high-stakes decisions through connected browser wallets.

[![Vercel Deployment](https://img.shields.io/badge/Vercel-genchat--nine.vercel.app-black?logo=vercel)](https://genchat-nine.vercel.app)
[![GenLayer StudioNet](https://img.shields.io/badge/GenLayer-StudioNet%20(61999)-amber?logo=ethereum)](https://studio.genlayer.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-blue?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Cloud%20Auth%20%26%20RLS-emerald?logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org)

---

## 1. Verifiable Evidence Protocol Architecture (Steward Blocker Fixes)

### Summary of Fixed Invariants
1. **Bounded, Complete Evidence Assessment (No 6,000-character truncation):**
   - The contract defines strict bounds: maximum 5 source URLs, max 2,048 characters per URL, max 16,384 raw response bytes per source, and max 32,768 bytes total canonical framed evidence.
   - Evidence is framed in an unambiguous source-boundary format (`GENCHAT-EVIDENCE-V2`) with length-prefixed chunks (`SOURCE <i> <url>\nBYTES <len>\n<text>\n`).
   - The validator assesses the **complete** canonical evidence frame. No evidence is ever silently sliced or truncated.
   - If evidence cannot be retrieved, exceeds byte limits, has unsupported media types or charsets, contains NUL bytes, or cannot be completely assessed by validators, the contract fails closed with `INCONCLUSIVE` and `evidence_verified = false`. `APPROVED` can never be produced on incomplete evidence.
2. **In-Contract Question Commitment Verification:**
   - The contract independently normalizes question titles using the documented canonical question function (`canonicalize_question`: trimming and collapsing consecutive whitespace into a single ASCII space) and independently calculates its SHA-256 commitment.
   - The caller's `question_hash` is strictly validated (must be `0x` followed by 64 hexadecimal digits) and must exactly match the contract's computed hash. Altered questions or mismatches revert before evidence retrieval.
3. **Honest Timestamp Semantics:**
   - The contract records `created_at_untrusted` from the caller and labels it as untrusted requester metadata.
   - The contract records `tx_datetime` from the authoritative GenLayer runtime (`gl.message_raw["datetime"]`).
   - No caller timestamp is ever copied into or presented as an authoritative finalization timestamp. The contract environment does not fabricate block finality timestamps where no runtime API exists.
4. **Enforced URL, Scheme, and Content-Type Limits:**
   - Only HTTP/HTTPS URLs with printable ASCII and no credentials or whitespace are accepted.
   - Content types are checked against supported text formats (`text/plain`, `text/markdown`, `text/csv`, `application/json`) with supported charsets (`utf-8`, `us-ascii`).

```text
CLAIM & CRITERIA + SOURCE URL(S) + QUESTION HASH + EVIDENCE COMMITMENT
        │
        ▼ (Write Contract via Connected Browser Wallet)
GenLayer StudioNet Intelligent Contract
        │
        ├─► [In-Contract Deterministic Validations]
        │     ├── Verify question_hash == SHA256(canonicalize_question(question_title))
        │     ├── Enforce URL count (<= 5), length (<= 2048), ASCII, schemes, duplicates
        │     ├── Validate format of question_hash and expected_evidence_hash (0x + 64 hex)
        │     └── If validation fails, REVERT immediately (zero state change)
        │
        ├─► [GenLayer Leader Node (gl.vm.run_nondet_unsafe)]
        │     ├── gl.nondet.web.get(url) for every accepted source
        │     ├── Enforce HTTP 200, supported Content-Type, valid UTF-8, no NUL bytes
        │     ├── Enforce raw size <= 16,384 bytes per source
        │     ├── Deterministic canonicalization (LF normalization & trailing whitespace trimming)
        │     ├── Build unambiguous frame: GENCHAT-EVIDENCE-V2 with per-source byte lengths
        │     ├── Enforce aggregate canonical evidence <= 32,768 bytes
        │     ├── Computes actual_evidence_hash = SHA256(frame)
        │     ├── Check commitment: actual_evidence_hash == expected_evidence_hash
        │     ├── Prompt Injection Defense: source content treated strictly as UNTRUSTED DATA
        │     └── AI Claim Evaluation against COMPLETE retrieved canonical frame
        │
        └─► [GenLayer Checking Validator Nodes]
              ├── Independently re-executes retrieval and hashing over ALL sources
              ├── Validates hash commitment match
              ├── Independently assesses complete evidence against criteria
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
  - question_title (canonicalized)
  - question_hash (verified in-contract)
  - expected_evidence_hash
  - actual_evidence_hash
  - source_urls_json
  - evidence_format ("GENCHAT-EVIDENCE-V2")
  - evidence_verified (boolean)
  - decision (APPROVED / REJECTED / INCONCLUSIVE)
  - confidence (0-100)
  - rationale
  - user_context_summary (non-authoritative)
  - created_at_untrusted (requester metadata)
  - tx_datetime (runtime transaction execution timestamp)
```

---

## 2. Honest Verification Claims Framework (Steward Guidance)

GenChat explicitly separates and articulates what GenLayer validator consensus does and does not establish:

1. **Content Integrity:**
   Cryptographic verification that the byte content retrieved from the web yields an identical SHA-256 hash when canonicalized and framed (`GENCHAT-EVIDENCE-V2`) to the caller's committed `expected_evidence_hash`.
2. **Source Provenance:**
   GenLayer validators independently execute `gl.nondet.web.get` against the specific HTTP(S) URL(s) provided. Provenance confirms which URLs served the content to the validator quorum at execution time.
3. **Semantic Assessment:**
   Decentralized validator LLMs adjudicate whether the complete retrieved text unequivocally supports the claim under the supplied evaluation criteria according to GenLayer's Equivalence Principle (`gl.vm.run_nondet_unsafe`).
4. **Factual Truth Limitations (Crucial Disclosure):**
   Decentralized consensus on evidence does **not** automatically establish objective, real-world truth. Requester-selected sources may be authentic yet biased, outdated, incomplete, or controlled by an interested party. GenChat certifies **evidence integrity and validator agreement against stated criteria**, never infallible real-world factuality.

### Authoritative Timestamps & GenVM Runtime Limitations
- **Requester Metadata (`created_at_untrusted`):** Supplied by the client at transaction submission time. Stored purely as non-authoritative client metadata. The contract, UI, and ledger explicitly label this field as untrusted caller metadata.
- **Transaction Execution Datetime (`tx_datetime`):** Recorded from `gl.message_raw["datetime"]` provided by the GenLayer runtime environment. It reflects the execution time of the transaction, not a block-finality or finalization timestamp (which the GenVM contract API does not expose).
- **Protocol Resource Limits (Enforced In Contract):**
  - Max source URLs: 5 URLs per verification request.
  - Max URL length: 2,048 characters (printable ASCII only).
  - Max single response size: 16,384 raw bytes per source.
  - Max aggregate evidence size: 32,768 UTF-8 bytes for the canonical framed evidence.
  - Supported Content-Types: `text/plain`, `text/markdown`, `text/csv`, `application/json`.
  - Supported Charsets: `utf-8`, `us-ascii`.
  - Max question length: 500 characters.
  - Max criteria length: 2,000 characters.
  - Max user summary: 4,000 characters (strictly isolated as metadata; never fed as evidence).
  - Retrieval failures (HTTP 4xx/5xx, timeouts, empty responses, invalid UTF-8, NUL bytes) immediately yield `INCONCLUSIVE` (never `APPROVED`).

---

## 3. Pinned Intelligent Contracts on GenLayer StudioNet

| Parameter | Value |
|---|---|
| **Network** | GenLayer StudioNet |
| **Chain ID** | `61999` (`0xF22F`) |
| **RPC Endpoint** | `https://studio.genlayer.com/api` |
| **Explorer** | `https://studio.genlayer.com` |
| **Current Contract (active & verified)** | `0x4282234BF42F8e73De096E2f3C22A31F3b80e0f5` |
| **Deployment Transaction** | [`0xf5c0ea87cc4e8859da2b1a7f915a0283f144c6ff2c6fb952a8597f7d0d9282f1`](https://studio.genlayer.com/tx/0xf5c0ea87cc4e8859da2b1a7f915a0283f144c6ff2c6fb952a8597f7d0d9282f1) |
| **Deployer Address** | `0x958fe9480C493B1f7C9410D03401D2312C3e9306` |
| **Deployed Source Parity** | SHA-256 `027e5bcb7c98da288fcfe343d8a0ecfde22c2d50f92d45703323a77709f343c5` (Verified via `gen_getContractCode`) |
| **Superseded Deployments (refused by application)** | `0x02DF9f0Cd7abF48Dea426725567b03032a65651A` (pre-V2 evidence truncation), `0x1b06F421f1d7228aC34f087f37309456D2434344` (legacy 7-arg) |
| **Runner Dependency** | `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` |

---

## 4. Product Modes

| Mode | Engine / Provider | Wallet Required? | Typical Latency | Best For |
|---|---|---|---|---|
| **⚡ Fast** | Groq Cloud (`openai/gpt-oss-120b`) | **No** | ~200ms first token | Brainstorming, coding, drafting, general knowledge |
| **🔎 Research** | Groq + `SearchProvider` (Serper / Tavily) | **No** | ~1.5s (live search) | Recent news, technical documentation, factual evidence |
| **⚖️ Verified** | GenLayer StudioNet Intelligent Contract | **Yes (EIP-1193)** | Network consensus | Verifiable claims, contractual criteria, evidence-bound adjudication |

---

## 5. Local Development & Configuration

### Prerequisites
- Node.js 20+ (Node 22.6+ or Node 24 recommended)
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
NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS=0x4282234BF42F8e73De096E2f3C22A31F3b80e0f5
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
```

Do not set a separate `GENCHAT_CONTRACT_ADDRESS`; if present it must equal the public value.
Server-only secrets (`GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SERPER_API_KEY`, `TAVILY_API_KEY`)
never use the `NEXT_PUBLIC_` prefix and are never committed.

### Request signature (8 arguments)
Source of truth: [`contract/GenChatVerifier.py`](contract/GenChatVerifier.py). The frontend builds
arguments in [`frontend/src/lib/genlayer/protocol.ts`](frontend/src/lib/genlayer/protocol.ts) (`buildRequestArgs`),
and unit tests assert the order matches the contract source exactly.

```python
request_verification(
    verification_id: str,        # 1..64 chars, unique
    question_title: str,         # claim / question, <= 500 chars (canonicalized)
    question_hash: str,          # 0x + 64 hex digits (verified in contract)
    expected_evidence_hash: str, # 0x + 64 hex digits (GENCHAT-EVIDENCE-V2 commitment)
    source_urls_json: str,       # JSON array of 1..5 http(s) URLs (<= 2048 chars each)
    criteria: str,               # evaluation criteria, <= 2000 chars
    user_context_summary: str,   # NON-AUTHORITATIVE metadata only, <= 4000 chars
    created_at: str,             # ISO timestamp, <= 60 chars (untrusted requester metadata)
) -> str                         # APPROVED | REJECTED | INCONCLUSIVE
```

### Record schema (`get_verification`)
`verification_id`, `requester`, `question_title`, `question_hash`, `expected_evidence_hash`,
`actual_evidence_hash`, `source_urls_json`, `evidence_format` (`GENCHAT-EVIDENCE-V2`), `evidence_verified`, `status` (`CONSENSUS`), `decision`,
`confidence` (0-100), `rationale`, `user_context_summary`, `created_at_untrusted`, `tx_datetime`.
The transaction hash and explorer URL are not returned by the contract; the client attaches them from the
transaction receipt. The UI shows the record exactly as decoded from the contract; nothing is synthesized.

### Test commands
| Command | Scope | Network |
|---|---|---|
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint | offline |
| `npm test` | Frontend unit, contract consistency & evidence policy tests (`frontend/test/`) | **offline** |
| `npm run contract:lint` | `genvm-lint` AST & validation checks on contract | offline |
| `npm run contract:test` | Direct-mode contract tests (173 test cases in `contract/tests/`) | **offline** |
| `npm run contract:verify-source` | StudioNet RPC source parity check | StudioNet RPC |
| `npm run test:integration` | StudioNet live multi-validator integration suite | **requires StudioNet** |
| `npm run build` | Next.js production build | offline |

```bash
npm run typecheck
npm run lint
npm test
npm run contract:lint
npm run contract:test
npm run contract:verify-source
npm run build
```

---

## 6. License

MIT
