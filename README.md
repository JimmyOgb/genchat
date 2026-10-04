# GenChat

> **Ask anything. Get a fast answer. Verify what matters.**

GenChat is a production-quality, ChatGPT-style AI assistant with a real **GenLayer verification layer**. Built from scratch, GenChat delivers the familiar speed and elegance of modern conversational AI while offering on-demand decentralized verification powered by independent AI consensus on **GenLayer StudioNet**.

---

## 1. What GenChat Is

GenChat is an AI assistant designed around a clear product principle:
Ordinary queries deserve immediate, low-latency streaming responses without unnecessary blockchain delays or wallet requirements. However, when users face **high-stakes, real-world decisions**—such as approving contractor milestone payouts, verifying contractual criteria, or settling disputes—GenChat empowers users to request independent, multi-validator AI consensus directly on GenLayer.

## 2. Why It Exists

Modern LLMs are prone to hallucinations, single-provider bias, and subjective inconsistencies. In critical workflows (escrow releases, legal reviews, compliance checks), a single AI model's judgment cannot be audited or trusted unconditionally.

GenChat bridges fast centralized AI with decentralized consensus:
1. **Centralized Speed for Conversations:** Rapid preliminary analysis powered by Groq and `openai/gpt-oss-120b`.
2. **Decentralized Verification for Decisions:** On-chain intelligent contract execution where multiple validator nodes independently review facts and reach consensus.

---

## 3. Architecture

```text
                               GENCHAT
                                  |
                           Next.js Frontend
                                  |
                                  v
                           Chat API Route
                                  |
              +-------------------+-------------------+
              |                                       |
              v                                       v
        Groq AI Provider                        Tool Router
              |                                       |
              v                                       v
      openai/gpt-oss-120b                     Web / Documents
              |
              v
       Streaming Response
              |
              v
            User


======================= HIGH-STAKES VERIFICATION =======================

        User Decision Question + Document Evidence (Off-Chain)
                                  |
                                  v
                       Deterministic SHA-256 Hashing
                                  |
                                  v
                      ⚖️ Verify with GenLayer
                                  |
                                  v
                  GenLayer Intelligent Contract (StudioNet)
                                  |
                                  v
               Independent Multi-Validator AI Consensus
                                  |
                                  v
                   APPROVE / REJECT / INCONCLUSIVE
                                  |
                                  v
             Transparent On-Chain Record & Explorer Receipt
```

---

## 4. Modes of Operation

GenChat offers three distinct modes:

### ⚡ Fast Mode (Default)
- **Engine:** Groq Cloud running `openai/gpt-oss-120b`.
- **Latency:** Instant first-token streaming via HTTP stream.
- **Scope:** Explanations, brainstorming, general writing, coding questions.
- **Blockchain Requirement:** None. No wallet or crypto tokens needed.

### 🔎 Research Mode
- **Engine:** Groq AI augmented with server-side live web search (`SearchProvider` abstraction).
- **Integrity Guarantee:** Never fabricates citations. If live search is not configured (`SERPER_API_KEY` / `TAVILY_API_KEY`), the app honestly states that live web search is unconfigured rather than pretending to search the web.
- **Output:** Clearly distinguishes internal model knowledge from retrieved search snippets and cited sources.

### ⚖️ Verified Mode
- **Engine:** Dual-layer architecture: Groq generates preliminary structured criteria; GenLayer validators independently adjudicate.
- **Workflow:** Generates deterministic hashes of the question and off-chain documents, submitting them to the `GenChatVerifier` contract on StudioNet.

---

## 5. GenLayer Verification Lifecycle

Verification follows a strict, non-simulated state machine:
```text
CREATED ──► PREPARING ──► SUBMITTED ──► ADJUDICATING ──► CONSENSUS ──► FINALIZED
                                                                  └──► FAILED
```
- **Equivalence Principle:** Multi-validator comparative consensus (`gl.vm.run_nondet_unsafe`). Both the leader validator and independent checking validators execute prompts independently to verify that the evidence unequivocally supports or contradicts the criteria.
- **Decisions:** `APPROVED`, `REJECTED`, or `INCONCLUSIVE`.
- **Honest Feedback:** Real transaction hashes link directly to GenLayer StudioNet Explorer.

---

## 6. Technology Stack

- **Frontend:** Next.js (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons.
- **Conversational AI:** Groq SDK with `openai/gpt-oss-120b`.
- **Decentralized Verification:** GenLayer Intelligent Contracts, Python GenVM SDK, GenLayerJS SDK.
- **Network:** GenLayer StudioNet (Chain ID: `61999`, Gasless).
- **Database & Auth:** Supabase (PostgreSQL with Row Level Security, Supabase Auth).
- **Deployment Platform:** Vercel serverless edge/node runtime.

---

## 7. Directory Structure

```text
GenChat/
├── frontend/                     # Next.js App Router application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/chat/         # Groq streaming route with mode routing
│   │   │   ├── api/verify/       # GenLayer StudioNet verification relay
│   │   │   ├── api/documents/    # Document extraction & evidence hashing
│   │   │   ├── chat/             # ChatGPT-style conversation view
│   │   │   ├── verify/           # Dedicated on-chain verification ledger
│   │   │   ├── globals.css       # Clean dark/light typography & tokens
│   │   │   ├── layout.tsx        # App layout wrapper
│   │   │   └── page.tsx          # Marketing & product landing page
│   │   ├── components/
│   │   │   ├── chat/             # Sidebar, Composer, ChatMessage, Markdown, CodeBlock
│   │   │   ├── verification/     # VerificationModal, ConsensusMeter, StatusCard
│   │   │   └── layout/           # SettingsModal, AuthModal, Header
│   │   └── lib/
│   │       ├── ai/               # AIProvider interface, GroqProvider, systemPrompt
│   │       ├── genlayer/         # GenLayerJS client, verifier contract service, types
│   │       ├── research/         # SearchProvider abstraction (Serper/Tavily)
│   │       ├── documents/        # PDF/TXT extraction & SHA-256 evidence hashing
│   │       ├── supabase/         # Supabase client/server and database schema types
│   │       └── utils/            # Hashing, crypto, and Tailwind merging utilities
│   ├── test/                     # Unit test suite (Node test runner)
│   ├── package.json
│   └── tsconfig.json
├── contract/                     # GenLayer Intelligent Contracts
│   ├── GenChatVerifier.py        # Core verification contract with pinned runner
│   ├── deploy.py                 # Deployment script
│   ├── requirements.txt          # Python dependencies (genlayer-py, genvm-linter)
│   └── tests/
│       └── test_genchat_verifier.py # Direct mode tests (pytest & genlayer-test)
├── supabase/
│   └── schema.sql                # PostgreSQL schema with Row Level Security (RLS)
├── .env.example                  # Environment configuration template
├── .gitignore
├── gltest.config.yaml            # GenLayer testing network configuration
└── README.md
```

---

## 8. Local Development Setup

### Prerequisites
- Node.js v20+ (Node 24 supported)
- Python 3.11+ or 3.12 with pip
- Git

### 1. Clone & Install
```bash
git clone <repository-url>
cd GenChat
npm install --prefix frontend
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` inside `frontend/`:
```bash
cp .env.example frontend/.env.local
```
Fill in:
- `GROQ_API_KEY`: Obtain from [Groq Console](https://console.groq.com/).
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: From your Supabase project.
- `GENCHAT_CONTRACT_ADDRESS`: Deployed address on StudioNet.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 9. Contract Deployment (StudioNet)

The `GenChatVerifier.py` contract is deployed to GenLayer StudioNet (gasless, chain ID 61999):

```bash
# 1. Switch CLI network to StudioNet
genlayer network set studionet

# 2. Deploy the contract
genlayer deploy --contract contract/GenChatVerifier.py

# 3. Add the resulting contract address to .env.local:
# GENCHAT_CONTRACT_ADDRESS=0x...
# NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS=0x...
```

---

## 10. Testing

### Run Frontend Unit Tests
```bash
npm test
```
Tests:
- Deterministic SHA-256 evidence hashing
- AI Provider configuration and error mapping
- Search Provider abstraction & honest unconfigured state handling
- Document extraction and platform-independent newline normalization
- Verification state machine transitions
- System prompt safety compliance

### Run Contract Linting
```bash
npm run contract:lint
```

### Run Contract Direct Mode Tests
```bash
npm run contract:test
```

---

## 11. Security & Non-Negotiables

1. **Zero Secret Leaks:** `GROQ_API_KEY` and other server secrets are strictly confined to server-side Next.js route handlers and are never exposed via `NEXT_PUBLIC_*` or client bundles.
2. **No Mocking Rule:** GenChat contains zero simulated transaction hashes, fake wallet balances, or mocked consensus outcomes. If a provider is unconfigured or unreachable, honest error feedback is displayed.
3. **Off-Chain Privacy:** Private documents are never uploaded in raw form to the public blockchain. Only deterministic SHA-256 evidence hashes and sanitized criteria are evaluated by validators.

---

## 12. Limitations & Disclaimers

- GenLayer verification is **decentralized AI consensus**, not a legal judgment, court order, or certified professional opinion.
- Live web search in Research Mode requires an active `SERPER_API_KEY` or `TAVILY_API_KEY`.
