# GenChat

> **Ask anything. Get a fast answer. Verify what matters.**

GenChat is a production-grade AI assistant combining high-speed conversational intelligence with on-demand, decentralized validator consensus on **GenLayer StudioNet**. Built with a strict separation of concerns, GenChat delivers immediate streaming answers for everyday queries while enabling cryptographically verifiable, multi-validator adjudication for high-stakes decisions through connected browser wallets.

[![Vercel Deployment](https://img.shields.io/badge/Vercel-genchat--nine.vercel.app-black?logo=vercel)](https://genchat-nine.vercel.app)
[![GenLayer StudioNet](https://img.shields.io/badge/GenLayer-StudioNet%20(61999)-amber?logo=ethereum)](https://studio.genlayer.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-blue?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Cloud%20Auth%20%26%20RLS-emerald?logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org)

---

## 1. Overview

GenChat is an AI application engineered around a pragmatic philosophy:
- **Everyday questions** require low-latency streaming responses without cryptocurrency barriers, wallet popups, or unnecessary fees.
- **Critical claims and agreements** (contract criteria, milestone approvals, contested facts, regulatory interpretations) demand independent, tamper-resistant adjudication that no single centralized model or API provider can tamper with.

GenChat unifies:
- **Fast Conversational AI:** Groq-accelerated inference running open-weight LLMs (`openai/gpt-oss-120b`).
- **Live Research:** Source-aware web retrieval that transparently separates internal knowledge from real-time facts.
- **Decentralized Multi-Validator Consensus:** Intelligent contract execution on GenLayer StudioNet where independent validator nodes reach consensus on truth, confidence, and rationale.
- **Secure Cloud Authentication & Persistence:** Real Supabase Cloud authentication, PostgreSQL conversation history, and fine-grained Row Level Security (RLS).
- **Non-Custodial Wallet Safety:** Injected EIP-1193 browser wallet signing (MetaMask, Rabby) with zero server-side private keys, zero token approvals, and zero automatic connection triggers.

---

## 2. Problem

Modern generative AI models are prone to subtle hallucinations, single-provider bias, and subjective inconsistencies. In mission-critical workflows:
- Blindly trusting a single model's output introduces severe operational and legal risk.
- Centralized LLM providers can update, censor, or alter model responses without notice.
- Traditional web3 solutions force users to pay gas or connect wallets just to ask simple questions.

GenChat resolves this dichotomy:
1. **Tier 1 — Fast Chat:** Fast, zero-friction conversation with no blockchain or wallet dependencies.
2. **Tier 2 — Researched Chat:** Live factual grounding with source attribution.
3. **Tier 3 — Independently Verified:** Transparent on-chain validator consensus on GenLayer StudioNet, providing an auditable public receipt.

---

## 3. Product Modes

| Mode | Engine / Provider | Wallet Required? | Typical Latency | Best For |
|---|---|---|---|---|
| **⚡ Fast** | Groq Cloud (`openai/gpt-oss-120b`) | **No** | ~200ms first token | Brainstorming, coding, drafting, general knowledge |
| **🔎 Research** | Groq + `SearchProvider` (Serper / Tavily) | **No** | ~1.5s (live search) | Recent news, technical documentation, factual evidence |
| **⚖️ Verified** | GenLayer StudioNet Intelligent Contract | **Yes (EIP-1193)** | Network consensus | Milestone approvals, contractual criteria, truth adjudication |

---

## 4. Architecture

```text
User Browser
    │
    ├── Fast / Research Queries (No Wallet Needed)
    │     │
    │     ▼
    │   Next.js Application (App Router / Edge & Node Runtime)
    │     ├── API Route: /api/chat
    │     │     ├── Groq Cloud Provider (openai/gpt-oss-120b)
    │     │     └── SearchProvider Abstraction (Serper / Tavily)
    │     └── Supabase Cloud (PostgreSQL + RLS + Auth / PKCE)
    │
    └── High-Stakes Claim Verification (Explicit User Action)
          │
          ▼
        Verification Modal (Explicit "Connect Wallet")
          │
          ▼
        Injected Browser Wallet (window.ethereum via EIP-1193)
          │  [eth_requestAccounts, wallet_switchEthereumChain: 0xF22F]
          │  [eth_sendTransaction signed by user]
          ▼
        GenLayer StudioNet (Chain ID: 61999)
          │
          ▼
        GenChatVerifier Intelligent Contract (0x1b06F421f1d7228aC34f087f37309456D2434344)
          │
          ▼
        Independent Multi-Validator AI Consensus (Comparative Execution)
          │
          ▼
        On-Chain Verification Record (APPROVED / REJECTED / INCONCLUSIVE)
          │
          ▼
        Public Explorer Audit Link (https://studio.genlayer.com)
```

---

## 5. AI Layer

- **Provider:** Groq Cloud SDK.
- **Model:** `openai/gpt-oss-120b` (default).
- **Streaming:** Server-Sent Events (SSE) via Next.js `ReadableStream` for instantaneous UI updates.
- **Safety Guidelines:** System prompts prohibit the model from presenting itself as a certified legal authority or claiming on-chain verification has occurred unless validated on GenLayer.
- **Security Invariant:** `GROQ_API_KEY` is strictly server-only. It is never exposed via `NEXT_PUBLIC_*` or bundled into client-side JavaScript.

---

## 6. Research Layer

- **Abstraction:** Modular `SearchProvider` interface (`SerperProvider`, `TavilyProvider`).
- **Integrity Guarantee:** Never fabricates citations. If research API keys are unconfigured, GenChat honestly explains that live search is unconfigured rather than pretending to browse the web.
- **Evidence Formatting:** Distinguishes internal parametric weights from external retrieved snippets.

---

## 7. GenLayer Verification

GenChat interacts with a live, real intelligent contract deployed on **GenLayer StudioNet**:

- **Network:** GenLayer StudioNet
- **Chain ID:** `61999` (Hex: `0xF22F` / `0xf22f`)
- **RPC Endpoint:** `https://studio.genlayer.com/api`
- **Explorer:** `https://studio.genlayer.com`
- **Contract Address:** `0x1b06F421f1d7228aC34f087f37309456D2434344`

### Contract Methods

- `request_verification(verification_id: str, question_title: str, evidence_hash: str) -> None`: Submits a verification request to GenLayer validators.
- `get_verification(verification_id: str) -> dict`: Returns the full consensus record including `decision`, `confidence`, `rationale`, `leader_model`, and `timestamp`.
- `get_verification_text(verification_id: str) -> str`: Returns a formatted, human-readable plaintext consensus certificate.
- `get_verification_decision(verification_id: str) -> str`: Returns the consensus decision (`APPROVED`, `REJECTED`, or `INCONCLUSIVE`).
- `get_verification_count() -> int`: Returns the total number of processed verification requests.
- `list_verifications(offset: int, limit: int) -> list`: Retrieves paginated verification IDs.

---

## 8. Wallet Architecture & Transaction Routing

GenChat implements a safe, non-intrusive Web3 wallet connection flow:

1. **Standard Injected Provider:** Uses `getInjectedProvider()` to detect standard EIP-1193 providers (`window.ethereum`, MetaMask, Rabby).
2. **Explicit User Interaction:** `eth_requestAccounts` is **never** triggered on page load, during Supabase login, or during Fast/Research chat. It is only called when the user opens the verification modal and clicks **"Connect Wallet"**.
3. **Chain Validation:** Non-StudioNet networks are detected immediately, prompting the user with an explicit **"Switch to GenLayer StudioNet"** action (`wallet_switchEthereumChain` with chain ID `0xf22f`).
4. **RPC Routing Invariant:**
   In `genlayer-js`, transaction dispatch relies on:
   ```javascript
   config.account = getAddress(senderAddress); // string
   config.provider = getInjectedProvider();     // EIP-1193 window.ethereum
   ```
   Because `typeof config.account !== 'object'`, `genlayer-js` routes `eth_sendTransaction` directly to `window.ethereum` for user signing, rather than sending it to the GenLayer RPC endpoint (`https://studio.genlayer.com/api`), preventing `Method not found: eth_sendTransaction`.
5. **Zero Token Approvals:** GenChat requires zero token allowances, zero ERC-20 approvals, and no token transfers. Transactions invoke the contract directly on StudioNet.

---

## 9. Verification State Lifecycle

The verification modal coordinates through explicit, deterministic lifecycle states:

```text
DISCONNECTED
    │  (User clicks "Connect Wallet")
    ▼
CONNECTING
    │
    ├── (Wrong Chain) ──► WRONG_NETWORK ──► (Switch to 0xF22F) ──┐
    ▼                                                           │
CONNECTED ──────────────────────────────────────────────────────┘
    │
    ▼
READY (Shortened address displayed: e.g. 0x71C8...6f76)
    │  (User clicks "Submit Verification to GenLayer")
    ▼
AWAITING_WALLET (Wallet popup opens for user signature)
    │
    ▼
WALLET_SUBMITTED (Transaction broadcasted with txHash)
    │
    ▼
PROCESSING (Contract execution initiated)
    │
    ▼
CONSENSUS (Validators execute comparative evaluation)
    │
    ▼
FINALIZED
    │
    ├── VERIFIED (APPROVED)
    ├── REJECTED
    └── INCONCLUSIVE
```

---

## 10. Authentication and Data Layer

- **Supabase Cloud:** Uses real Supabase Cloud Auth with email/password and PKCE authentication flow.
- **Route Protection:** Authenticated `/chat` route with automatic session restoration and session refresh.
- **Persistence:** Real PostgreSQL tables for `conversations`, `messages`, and `verification_records`.
- **Row Level Security (RLS):** All tables strictly enforce `auth.uid() = user_id`, guaranteeing cross-tenant data isolation.

---

## 11. Security Model

- **No Leaked Private Keys:** No server-side private keys, seed phrases, or master signers exist in the codebase.
- **Server Secret Isolation:** `GROQ_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only secrets.
- **No Mock Consensus:** Zero synthetic consensus, fake balances, or fabricated transaction hashes.
- **Off-Chain Document Safety:** Documents uploaded for verification are hashed locally via deterministic SHA-256 (`crypto.subtle`); only sanitized criteria and hashes are submitted on-chain.

---

## 12. Environment Variables

Create `.env.local` in `frontend/` (or configure in Vercel):

```bash
# ==========================================
# PUBLIC CLIENT VARIABLES (Exposed to Browser)
# ==========================================
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>

NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_CHAIN_NAME="GenLayer StudioNet"
NEXT_PUBLIC_GENLAYER_SYMBOL=GEN
NEXT_PUBLIC_GENLAYER_EXPLORER_URL=https://studio.genlayer.com
NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS=0x1b06F421f1d7228aC34f087f37309456D2434344

# ==========================================
# SERVER-ONLY SECRETS (Never exposed to Browser)
# ==========================================
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
GROQ_API_KEY=<your-groq-api-key>

# Optional server-side fallbacks & search providers
GENLAYER_RPC_URL=https://studio.genlayer.com/api
GENLAYER_CHAIN_ID=61999
GENCHAT_CONTRACT_ADDRESS=0x1b06F421f1d7228aC34f087f37309456D2434344
SERPER_API_KEY=
TAVILY_API_KEY=
```

> [!CAUTION]
> Never commit `.env.local` or any production secret keys to version control.

---

## 13. Local Development

### Prerequisites
- Node.js 20+ (Node 24 tested)
- npm 10+
- Python 3.11+ (for intelligent contract testing)

### Installation & Execution

```bash
# 1. Clone repository
git clone https://github.com/JimmyOgb/genchat.git
cd genchat

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Type check
npm run typecheck

# 4. Lint check
npm run lint

# 5. Run test suite
npm test

# 6. Build production package
npm run build

# 7. Start local server
npm run dev
```

---

## 14. Testing Suite

The repository contains an automated test suite with **43 passing tests across 17 suites**:

```text
▶ Deterministic SHA-256 Hashing Utilities (3 tests)
▶ AI Provider Configuration & Model Integrity (3 tests)
▶ SearchProvider Abstraction (2 tests)
▶ Document Extraction & Evidence Hashing (2 tests)
▶ Verification State Machine Transitions (2 tests)
▶ System Prompt & Safety Rules Compliance (2 tests)
▶ Plaintext Verification Format & Contract Invariants (4 tests)
▶ Decoupled Sign In & Chat from Wallet APIs (3 tests)
▶ StudioNet Network Safety & Chain Validation (4 tests)
▶ Explicit Safe Wallet UX & Network Switching Prompts (2 tests)
▶ User Cancellation Handling & Resilience (3 tests)
▶ Zero Token Approvals Enforcement (1 test)
▶ Favicon & Public Assets Integrity (1 test)
▶ Supabase Schema & Row Level Security (RLS) Invariants (1 test)
▶ Environment Variable Classification & Secret Leak Prevention (1 test)
▶ GenLayer Contract Address Validation & Viem Integration (4 tests)
▶ Browser Wallet Connection & GenLayer RPC Routing Safety (5 tests)

Total: 43 passed, 0 failed, 17 suites
```

In addition, `frontend/test/manual_e2e_browser_test.mjs` executes headless browser testing across:
- Fresh page load (0 wallet calls)
- Real Supabase Cloud sign-in / sign-out / session persistence
- Fast Mode & Research Mode queries
- Verification Modal wallet connection & StudioNet switching
- Transaction signing dispatch to `window.ethereum` (0 `InvalidAddressError`, 0 `Method not found: eth_sendTransaction`)

---

## 15. Deployment

### Vercel Production Deployment

- **Production URL:** [https://genchat-nine.vercel.app](https://genchat-nine.vercel.app)
- **Deployment Status:** Active & Tested (`READY`)
- **Next.js Framework:** App Router with Server Components

### Supabase Redirect URL Configuration
In your Supabase Cloud Dashboard under **Authentication ➔ URL Configuration**:
- **Site URL:** `https://genchat-nine.vercel.app`
- **Redirect URLs:**
  - `https://genchat-nine.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (for local development)

---

## 16. Repository Structure

```text
genchat/
├── contract/
│   ├── GenChatVerifier.py             # GenVM intelligent contract on StudioNet
│   ├── deployment.json                # StudioNet deployment metadata & tx hash
│   ├── requirements.txt               # Contract build dependencies
│   └── tests/
│       └── test_genchat_verifier.py   # Direct mode pytest suite
├── frontend/
│   ├── public/
│   │   ├── favicon.ico                # GenChat application icon
│   │   └── logo.png                   # Brand asset
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── chat/route.ts      # Groq streaming endpoint
│   │   │   │   ├── documents/route.ts # Evidence extraction & SHA-256
│   │   │   │   └── verify/route.ts    # GenLayer readback endpoint
│   │   │   ├── auth/callback/route.ts # Supabase PKCE code exchange
│   │   │   ├── chat/page.tsx          # Conversational workspace
│   │   │   ├── verify/page.tsx        # Verification explorer
│   │   │   ├── layout.tsx             # Root layout & providers
│   │   │   └── page.tsx               # Landing page
│   │   ├── components/
│   │   │   ├── chat/                  # Chat Composer, Messages, Markdown
│   │   │   ├── layout/                # Header, AuthModal, ModeToggle
│   │   │   └── verification/          # VerificationModal, ConsensusMeter
│   │   └── lib/
│   │       ├── ai/                    # Groq SDK provider & system prompts
│   │       ├── genlayer/              # GenLayer client, verifier, EIP-1193 utils
│   │       ├── research/              # SearchProvider abstraction
│   │       └── supabase/              # Supabase browser & server clients
│   ├── test/
│   │   ├── unit.test.mjs              # 43 automated unit tests
│   │   └── manual_e2e_browser_test.mjs# Headless browser integration test
│   ├── package.json
│   ├── tsconfig.json
│   └── vercel.json
├── supabase/
│   └── schema.sql                     # Cloud PostgreSQL schema with RLS
├── .env.example                       # Reference environment configuration
├── .gitignore                         # Secret, node_modules, and cache ignores
└── README.md
```

---

## 17. Smart Contract

The core verification contract is located at [`contract/GenChatVerifier.py`](file:///contract/GenChatVerifier.py).

- **Deployment Hash:** `0x1230c231ef09c1f24d9c7c2bfa03ecda739a8264d8a24da8396e8e815610e3d5`
- **Contract Address:** `0x1b06F421f1d7228aC34f087f37309456D2434344`
- **Execution Engine:** GenVM (WebAssembly-based intelligent contract runner).
- **Consensus Rule:** Non-deterministic comparative validator adjudication (`gl.vm.run_nondet_unsafe`). Both the leader validator and independent checking validators evaluate the claims against the evidence hash before committing the state.

---

## 18. Limitations

- **Decentralized AI Consensus:** GenLayer consensus represents the synchronized determination of independent AI validators, not a binding judicial decree or certified legal advice.
- **Network Dependency:** On-chain verification latency is subject to GenLayer validator availability and StudioNet block finality.
- **Inconclusive Outcomes:** If evidence is ambiguous or contradictory, validators may conclude `INCONCLUSIVE`, which is a legitimate and honest consensus result.
- **Wallet Requirement:** While Fast Chat and Research Mode require no wallet, Verified Mode requires an EIP-1193 compliant wallet (MetaMask, Rabby).

---

## 19. Roadmap

- [x] Groq `openai/gpt-oss-120b` fast streaming integration.
- [x] Live web research fallback and citation formatting.
- [x] Real GenLayer StudioNet contract deployment.
- [x] Injected browser-wallet transaction signing with StudioNet chain switching.
- [x] Supabase Cloud authentication and Row Level Security persistence.
- [x] Vercel production deployment and live smoke testing.
- [ ] Multi-turn interactive contract dispute appeals.
- [ ] Cross-chain verification anchoring to Ethereum/Arbitrum L2s.

---

## 20. Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Ensure all tests pass (`npm run typecheck && npm run lint && npm test`).
4. Commit your changes with conventional commit syntax (`git commit -m 'feat: add amazing feature'`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## 21. Security Disclosure

If you discover a potential vulnerability or security issue, please do not open a public issue. Contact the project maintainers directly or submit a private security advisory through GitHub.

---

## 22. License

Private / All rights reserved unless otherwise licensed by the repository owner.
