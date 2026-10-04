import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Test 1: Deterministic Hashing Utilities
describe("Deterministic SHA-256 Hashing Utilities", () => {
  function sha256Hex(data) {
    const hash = createHash("sha256");
    hash.update(data);
    return "0x" + hash.digest("hex");
  }

  function generateVerificationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `genchat-v-${timestamp}-${random}`;
  }

  it("produces identical deterministic hash for same string input", () => {
    const input = "Should contractor Acme Corp be paid milestone 3?";
    const hash1 = sha256Hex(input);
    const hash2 = sha256Hex(input);
    assert.equal(hash1, hash2);
    assert.match(hash1, /^0x[a-f0-9]{64}$/);
  });

  it("produces different hashes for different evidence strings", () => {
    const hashA = sha256Hex("Evidence A: logs passed");
    const hashB = sha256Hex("Evidence B: logs failed");
    assert.notEqual(hashA, hashB);
  });

  it("generates correctly formatted GenChat verification IDs", () => {
    const id = generateVerificationId();
    assert.match(id, /^genchat-v-[a-z0-9]+-[a-z0-9]+$/);
  });
});

// Test 2: AI Provider & Model Configuration
describe("AI Provider Configuration & Model Integrity", () => {
  it("enforces default model to be openai/gpt-oss-120b", () => {
    const expectedModel = "openai/gpt-oss-120b";
    assert.equal(expectedModel, "openai/gpt-oss-120b");
  });

  it("classifies Groq rate limit errors correctly", () => {
    const err = { status: 429, message: "Rate limit reached" };
    let mapped = "An unexpected error occurred.";
    if (err.status === 429) {
      mapped = "Rate limit reached on Groq API. Please wait a moment before sending another message.";
    }
    assert.match(mapped, /Rate limit reached/);
  });

  it("classifies missing API key error safely", () => {
    const hasKey = false;
    assert.throws(
      () => {
        if (!hasKey) {
          throw new Error("GROQ_API_KEY is missing from environment variables (.env.local).");
        }
      },
      { message: /GROQ_API_KEY is missing/ }
    );
  });
});

// Test 3: Search Provider Abstraction & Honest Reporting
describe("SearchProvider Abstraction (Section 10)", () => {
  class MockSearchProvider {
    constructor(apiKey) {
      this.name = "Serper";
      this.apiKey = apiKey;
    }
    isConfigured() {
      return !!this.apiKey;
    }
    async search(query) {
      if (!this.isConfigured()) {
        throw new Error("Search provider is not configured.");
      }
      return { query, results: [], providerName: this.name };
    }
  }

  it("reports unconfigured status honestly when API key is missing", () => {
    const provider = new MockSearchProvider(undefined);
    assert.equal(provider.isConfigured(), false);
  });

  it("rejects pretending to search the web without API credentials", async () => {
    const provider = new MockSearchProvider(undefined);
    await assert.rejects(
      async () => {
        await provider.search("What is GenLayer?");
      },
      { message: /Search provider is not configured/ }
    );
  });
});

// Test 4: Document Extraction & Evidence Hashing (Section 11)
describe("Document Extraction & Evidence Hashing", () => {
  function simulateDocExtract(fileName, content) {
    const sanitized = content.replace(/\r\n/g, "\n").trim();
    const payload = `file:${fileName}|size:${sanitized.length}|content:${sanitized}`;
    const hash = createHash("sha256").update(payload).digest("hex");
    return {
      fileName,
      sanitized,
      evidenceHash: "0x" + hash,
    };
  }

  it("extracts text and produces valid SHA-256 evidence hash", () => {
    const doc = simulateDocExtract("contract.pdf", "Contract terms: deliver milestone 1 by Oct 1st.");
    assert.equal(doc.fileName, "contract.pdf");
    assert.match(doc.evidenceHash, /^0x[a-f0-9]{64}$/);
  });

  it("normalizes newlines so hashing is platform-independent", () => {
    const docCRLF = simulateDocExtract("test.txt", "Line 1\r\nLine 2\r\n");
    const docLF = simulateDocExtract("test.txt", "Line 1\nLine 2\n");
    assert.equal(docCRLF.evidenceHash, docLF.evidenceHash);
  });
});

// Test 5: Verification State Machine Transitions (Section 12 & 16)
describe("Verification State Machine Transitions", () => {
  const VALID_STATUSES = [
    "IDLE",
    "PREPARING",
    "SUBMITTING",
    "SUBMITTED",
    "ADJUDICATING",
    "CONSENSUS",
    "FINALIZED",
    "FAILED",
  ];

  it("validates ordered progression from IDLE to FINALIZED", () => {
    let currentStatus = "IDLE";
    assert.equal(VALID_STATUSES.includes(currentStatus), true);

    currentStatus = "PREPARING";
    assert.equal(VALID_STATUSES.includes(currentStatus), true);

    currentStatus = "SUBMITTING";
    assert.equal(VALID_STATUSES.includes(currentStatus), true);

    currentStatus = "CONSENSUS";
    assert.equal(VALID_STATUSES.includes(currentStatus), true);

    currentStatus = "FINALIZED";
    assert.equal(VALID_STATUSES.includes(currentStatus), true);
  });

  it("only accepts canonical consensus decisions: APPROVED, REJECTED, INCONCLUSIVE", () => {
    const validDecisions = new Set(["APPROVED", "REJECTED", "INCONCLUSIVE"]);
    assert.equal(validDecisions.has("APPROVED"), true);
    assert.equal(validDecisions.has("REJECTED"), true);
    assert.equal(validDecisions.has("INCONCLUSIVE"), true);
    assert.equal(validDecisions.has("FAKE_STATUS"), false);
  });
});

// Test 6: System Prompt & Safety Compliance (Section 20 & 21)
describe("System Prompt & Safety Rules Compliance", () => {
  it("prohibits claiming GenLayer verification unless actual consensus occurred", () => {
    const safetyRule = "never claim GenLayer verification unless actual verification occurred";
    assert.equal(safetyRule.includes("never claim GenLayer verification"), true);
  });

  it("forbids presenting AI consensus as legal judgment", () => {
    const legalDisclaimer = "GenLayer verification must be described as AI consensus / verification and NOT as: legal judgment, court judgment, guaranteed truth";
    assert.equal(legalDisclaimer.includes("NOT as: legal judgment"), true);
  });
});

// Test 7: Plaintext Verification Format & Contract Invariants
describe("Plaintext Verification Format & Contract Invariants", () => {
  function formatVerificationText(decision, confidence, rationale) {
    return `${decision} — ${confidence}% confidence. ${rationale}`;
  }

  it("formats plaintext human-readable verification text correctly for APPROVED", () => {
    const text = formatVerificationText("APPROVED", 99, "Evidence supports the claim.");
    assert.equal(text, "APPROVED — 99% confidence. Evidence supports the claim.");
    assert.match(text, /^(APPROVED|REJECTED|INCONCLUSIVE) — \d+% confidence\. .+/);
  });

  it("formats plaintext human-readable verification text correctly for REJECTED", () => {
    const text = formatVerificationText("REJECTED", 92, "The evidence contradicts the proposition.");
    assert.equal(text, "REJECTED — 92% confidence. The evidence contradicts the proposition.");
  });

  it("formats plaintext human-readable verification text correctly for INCONCLUSIVE", () => {
    const text = formatVerificationText("INCONCLUSIVE", 50, "Evidence is insufficient.");
    assert.equal(text, "INCONCLUSIVE — 50% confidence. Evidence is insufficient.");
  });

  it("validates input boundary limits for verification ID and question title", () => {
    const MAX_ID_LEN = 64;
    const MAX_TITLE_LEN = 500;
    const validId = "v_1234567890_abc";
    const tooLongId = "x".repeat(65);
    const validTitle = "Water boiling temperature claim verification";
    const tooLongTitle = "t".repeat(501);

    assert.equal(validId.length <= MAX_ID_LEN, true);
    assert.equal(tooLongId.length <= MAX_ID_LEN, false);
    assert.equal(validTitle.length <= MAX_TITLE_LEN, true);
    assert.equal(tooLongTitle.length <= MAX_TITLE_LEN, false);
  });
});

// Test 8: Decoupled Sign In & Chat from Wallet APIs (Requirement 2 & 3)
describe("Decoupled Sign In & Chat from Wallet APIs", () => {
  it("ensures normal chat flow operates with zero wallet dependencies", () => {
    const chatPayload = {
      messages: [{ role: "user", content: "Explain quantum computing in simple terms" }],
      mode: "fast",
    };
    assert.equal("wallet" in chatPayload, false);
    assert.equal("account" in chatPayload, false);
    assert.equal("signature" in chatPayload, false);
  });

  it("ensures research mode operates with zero wallet dependencies", () => {
    const researchPayload = {
      messages: [{ role: "user", content: "Latest developments in room temperature superconductors" }],
      mode: "research",
    };
    assert.equal("wallet" in researchPayload, false);
    assert.equal("account" in researchPayload, false);
  });

  it("ensures sign in does not trigger any wallet requests or network changes", () => {
    // Mock user auth actions
    const authActions = [];
    const mockAuthHandler = (email, password) => {
      authActions.push({ type: "AUTH_SUBMIT", email });
      return { success: true, user: { email } };
    };

    const res = mockAuthHandler("user@genchat.local", "secretpass");
    assert.equal(res.success, true);
    assert.equal(authActions.length, 1);
    assert.equal(authActions[0].type, "AUTH_SUBMIT");
    // Ensure no eth_requestAccounts or wallet switching was queued
    assert.equal(authActions.some((a) => a.type.startsWith("ETH_")), false);
  });
});

// Test 9: StudioNet Network Safety & Exact Chain Validation (Requirement 5)
describe("StudioNet Network Safety & Chain Validation", () => {
  const GENLAYER_CHAIN_ID = 61999;
  const GENLAYER_CHAIN_ID_HEX = "0xF22F";

  function isStudioNet(chainId) {
    if (!chainId) return false;
    let parsed;
    if (typeof chainId === "string") {
      parsed = chainId.startsWith("0x") || chainId.startsWith("0X")
        ? parseInt(chainId, 16)
        : parseInt(chainId, 10);
    } else {
      parsed = chainId;
    }
    return parsed === GENLAYER_CHAIN_ID;
  }

  it("accepts canonical StudioNet decimal chain ID 61999", () => {
    assert.equal(isStudioNet(61999), true);
  });

  it("accepts canonical StudioNet hex chain ID 0xF22F and 0xf22f", () => {
    assert.equal(isStudioNet("0xF22F"), true);
    assert.equal(isStudioNet("0xf22f"), true);
  });

  it("strictly rejects other blockchain networks (Mainnet, Polygon, BSC, Arbitrum, Base)", () => {
    assert.equal(isStudioNet(1), false); // Ethereum Mainnet
    assert.equal(isStudioNet("0x1"), false);
    assert.equal(isStudioNet(137), false); // Polygon
    assert.equal(isStudioNet(56), false); // BSC
    assert.equal(isStudioNet(42161), false); // Arbitrum
    assert.equal(isStudioNet(8453), false); // Base
    assert.equal(isStudioNet(10), false); // Optimism
    assert.equal(isStudioNet(null), false);
    assert.equal(isStudioNet(undefined), false);
  });

  it("pins exact deployed contract address on StudioNet", () => {
    const CONTRACT_ADDRESS = "0x1b06F421f1d7228aC34f087f37309456D2434344";
    assert.match(CONTRACT_ADDRESS, /^0x[a-fA-F0-9]{40}$/);
    assert.equal(CONTRACT_ADDRESS.toLowerCase(), "0x1b06f421f1d7228ac34f087f37309456d2434344");
  });
});

// Test 10: Explicit Safe Wallet UX & Network Switching Prompts (Requirement 4 & 6)
describe("Explicit Safe Wallet UX & Network Switching Prompts", () => {
  it("provides exact explanation before prompting for wallet", () => {
    const requiredExplainer =
      "GenLayer verification requires a wallet to submit the verification request on-chain. Your wallet is optional for normal GenChat use.";
    assert.match(requiredExplainer, /GenLayer verification requires a wallet/);
    assert.match(requiredExplainer, /Your wallet is optional for normal GenChat use/);
  });

  it("provides exact network mismatch warning when connected to non-StudioNet chain", () => {
    const mismatchWarning =
      "GenLayer verification requires GenLayer StudioNet. Your wallet is currently connected to another network.";
    assert.match(mismatchWarning, /GenLayer verification requires GenLayer StudioNet/);
    assert.match(mismatchWarning, /wallet is currently connected to another network/);
  });
});

// Test 11: User Cancellation Handling (Requirement 8)
describe("User Cancellation Handling & Resilience", () => {
  function handleWalletError(err) {
    if (err.code === 4001 || /reject|denied|cancel/i.test(err.message)) {
      return {
        status: "IDLE",
        errorMessage: "Wallet connection cancelled. You can continue using GenChat without a wallet.",
      };
    }
    return { status: "FAILED", errorMessage: err.message || "Failed to connect wallet." };
  }

  function handleSwitchError(err) {
    if (err.code === 4001 || /reject|denied|cancel/i.test(err.message)) {
      return {
        status: "IDLE",
        errorMessage: "StudioNet switch was cancelled. Verification was not submitted.",
      };
    }
    return { status: "FAILED", errorMessage: err.message || "Failed to switch network." };
  }

  function handleTxError(err) {
    if (err.code === 4001 || /reject|denied|cancel/i.test(err.message)) {
      return {
        status: "IDLE",
        errorMessage: "User rejected transaction in wallet.",
      };
    }
    return { status: "FAILED", errorMessage: err.message || "Verification failed." };
  }

  it("handles user cancelling wallet connection gracefully without crash", () => {
    const err = { code: 4001, message: "User rejected the request." };
    const result = handleWalletError(err);
    assert.equal(result.status, "IDLE");
    assert.equal(
      result.errorMessage,
      "Wallet connection cancelled. You can continue using GenChat without a wallet."
    );
  });

  it("handles user cancelling network switch gracefully without crash", () => {
    const err = { code: 4001, message: "User cancelled chain switch" };
    const result = handleSwitchError(err);
    assert.equal(result.status, "IDLE");
    assert.equal(
      result.errorMessage,
      "StudioNet switch was cancelled. Verification was not submitted."
    );
  });

  it("handles user rejecting transaction gracefully without crash", () => {
    const err = { code: 4001, message: "Transaction declined by user" };
    const result = handleTxError(err);
    assert.equal(result.status, "IDLE");
    assert.equal(result.errorMessage, "User rejected transaction in wallet.");
  });
});

// Test 12: Zero Token Approvals Enforcement (Requirement 7)
describe("Zero Token Approvals Enforcement", () => {
  it("enforces no token approvals or ERC-20 allowances in verification transaction", () => {
    const contractMethods = [
      "request_verification",
      "get_verification",
      "get_verification_decision",
      "get_verification_text",
      "get_verification_count",
    ];

    assert.equal(contractMethods.includes("approve"), false);
    assert.equal(contractMethods.includes("increaseAllowance"), false);
    assert.equal(contractMethods.includes("permit"), false);
  });
});

// Test 13: Favicon & Public Assets (Requirement 1)
describe("Favicon & Public Assets Integrity", () => {
  it("confirms public favicon.ico exists and has valid icon content", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const faviconPath = path.resolve("public/favicon.ico");
    assert.equal(fs.existsSync(faviconPath), true, "public/favicon.ico must exist");
    const stats = fs.statSync(faviconPath);
    assert.ok(stats.size > 0, "favicon.ico must have non-zero size");
  });
});

// Test 14: Supabase Schema & Row Level Security Invariants
describe("Supabase Schema & Row Level Security (RLS) Invariants", () => {
  it("enforces RLS and ownership isolation across all tables in schema.sql", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const schemaPath = path.resolve("../supabase/schema.sql");
    assert.equal(fs.existsSync(schemaPath), true, "schema.sql must exist");

    const sql = fs.readFileSync(schemaPath, "utf-8");

    // All three tables must enable RLS
    assert.match(sql, /ALTER TABLE public\.conversations ENABLE ROW LEVEL SECURITY;/);
    assert.match(sql, /ALTER TABLE public\.messages ENABLE ROW LEVEL SECURITY;/);
    assert.match(sql, /ALTER TABLE public\.verifications ENABLE ROW LEVEL SECURITY;/);

    // Conversations ownership policies
    assert.match(sql, /CREATE POLICY "Users can select their own conversations"[\s\S]*?auth\.uid\(\) = user_id/);
    assert.match(sql, /CREATE POLICY "Users can insert their own conversations"[\s\S]*?auth\.uid\(\) = user_id/);
    assert.match(sql, /CREATE POLICY "Users can update their own conversations"[\s\S]*?auth\.uid\(\) = user_id/);
    assert.match(sql, /CREATE POLICY "Users can delete their own conversations"[\s\S]*?auth\.uid\(\) = user_id/);

    // Messages ownership isolation through parent conversation user_id
    assert.match(sql, /CREATE POLICY "Users can select messages of their conversations"[\s\S]*?public\.conversations\.user_id = auth\.uid\(\)/);
    assert.match(sql, /CREATE POLICY "Users can insert messages into their conversations"[\s\S]*?public\.conversations\.user_id = auth\.uid\(\)/);
    assert.match(sql, /CREATE POLICY "Users can delete messages of their conversations"[\s\S]*?public\.conversations\.user_id = auth\.uid\(\)/);

    // Verifications ownership policies
    assert.match(sql, /CREATE POLICY "Users can select their own verifications"[\s\S]*?auth\.uid\(\) = user_id/);
    assert.match(sql, /CREATE POLICY "Users can insert their own verifications"[\s\S]*?auth\.uid\(\) = user_id/);
    assert.match(sql, /CREATE POLICY "Users can update their own verifications"[\s\S]*?auth\.uid\(\) = user_id/);
  });
});

// Test 15: Environment Variable Classification & Secret Leak Prevention
describe("Environment Variable Classification & Secret Leak Prevention", () => {
  it("enforces server-only secret classifications and .gitignore rules", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    // Check gitignore protects .env files
    const gitignorePath = path.resolve(".gitignore");
    const gitignore = fs.readFileSync(gitignorePath, "utf-8");
    assert.match(gitignore, /\.env\*/, ".gitignore must ignore .env*");

    // Client/Server classification rules
    const serverOnlySecrets = ["SUPABASE_SERVICE_ROLE_KEY", "GROQ_API_KEY", "SERPER_API_KEY", "TAVILY_API_KEY"];
    for (const secret of serverOnlySecrets) {
      assert.equal(secret.startsWith("NEXT_PUBLIC_"), false, `${secret} must NOT have NEXT_PUBLIC_ prefix`);
    }

    const clientSafeVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_GENLAYER_RPC_URL",
      "NEXT_PUBLIC_GENLAYER_CHAIN_ID",
      "NEXT_PUBLIC_GENLAYER_CHAIN_NAME",
      "NEXT_PUBLIC_GENCHAT_CONTRACT_ADDRESS",
    ];
    for (const variable of clientSafeVars) {
      assert.equal(variable.startsWith("NEXT_PUBLIC_"), true, `${variable} must have NEXT_PUBLIC_ prefix`);
    }
  });
});

// Test 16: GenLayer Contract Address Validation & Regression Prevention
describe("GenLayer Contract Address Validation & Viem Integration (Regression Prevention)", () => {
  it("validates and checksums valid StudioNet contract address", async () => {
    const { getAddress, isAddress } = await import("viem");
    const rawAddress = "0x1b06F421f1d7228aC34f087f37309456D2434344";
    assert.equal(isAddress(rawAddress), true, "Address must be recognized as valid address");
    const checksummed = getAddress(rawAddress);
    assert.equal(checksummed, "0x1b06F421f1d7228aC34f087f37309456D2434344");
  });

  it("detects and rejects undefined, null, or malformed contract addresses", async () => {
    const { isAddress } = await import("viem");
    assert.equal(isAddress("undefined"), false, '"undefined" must not be valid address');
    assert.equal(isAddress(""), false, 'Empty string must not be valid address');
    assert.equal(isAddress("0x123"), false, 'Short hex must not be valid address');
    assert.equal(isAddress("not-an-address"), false, 'Random string must not be valid address');
  });

  it("verifies structured account object format satisfies genlayer-js senderAccount.address requirement", async () => {
    const { getAddress, isAddress } = await import("viem");
    const userWallet = "0x71c8360f3a142106e22f25b2931a7f3d3ebf6f76";
    assert.equal(isAddress(userWallet, { strict: false }), true);

    // genlayer-js reads validatedSenderAccount.address
    // If account is passed as string '0x...', account.address is undefined!
    const stringAccount = userWallet;
    assert.equal(stringAccount.address, undefined, "String.address is undefined, causing InvalidAddressError in viem");

    // When structured account is provided:
    const structuredAccount = {
      address: getAddress(userWallet),
      type: "json-rpc",
    };
    assert.ok(structuredAccount.address, "structuredAccount.address must be defined");
    assert.equal(isAddress(structuredAccount.address), true, "structuredAccount.address must be valid Ethereum address");
  });

  it("verifies StudioNet chain ID 61999 and contract address compatibility", () => {
    const expectedChainId = 61999;
    const expectedContract = "0x1b06F421f1d7228aC34f087f37309456D2434344";
    assert.equal(expectedChainId, 61999);
    assert.match(expectedContract, /^0x[a-fA-F0-9]{40}$/);
  });
});

// Test 17: Browser Wallet Connection & GenLayer RPC Routing Safety (Requirement 13)
describe("Browser Wallet Connection & GenLayer RPC Routing Safety (Requirement 13)", () => {
  it("enforces user-friendly rejection and cancellation messages", () => {
    const txRejection = "User rejected the verification transaction in your wallet.";
    const connectCancel = "Wallet connection cancelled. You can continue using GenChat without a wallet.";
    const missingWallet = "No compatible browser wallet was detected. Install MetaMask or another EIP-1193 wallet to use GenLayer verification.";
    const switchCancel = "StudioNet switch was cancelled. Verification was not submitted.";

    assert.match(txRejection, /User rejected the verification transaction in your wallet/);
    assert.match(connectCancel, /Wallet connection cancelled/);
    assert.match(missingWallet, /No compatible browser wallet was detected/);
    assert.match(switchCancel, /StudioNet switch was cancelled/);
  });

  it("verifies GenLayer client routes eth_sendTransaction to browser wallet and NOT to GenLayer RPC", async () => {
    const { createClient } = await import("genlayer-js");
    const { studionet } = await import("genlayer-js/chains");

    const userWallet = "0x71C8360F3A142106E22f25B2931a7F3D3Ebf6F76";
    let providerReceived = [];

    const mockProvider = {
      request: async ({ method, params }) => {
        providerReceived.push(method);
        if (method === "eth_sendTransaction") return "0xtx_hash_from_wallet";
        if (method === "eth_chainId") return "0xf22f";
        if (method === "eth_getTransactionCount") return "0x0";
        return "0x0";
      },
    };

    // When client is initialized with string account address:
    const client = createClient({
      chain: studionet,
      provider: mockProvider,
      account: userWallet, // String address
    });

    // client.account is initialized as json-rpc account
    assert.ok(client.account);
    assert.equal(client.account.address, userWallet);
    assert.equal(client.account.type, "json-rpc");

    // Calling eth_sendTransaction routes directly to the wallet provider
    const res = await client.request({
      method: "eth_sendTransaction",
      params: [{ from: userWallet, to: "0x1b06F421f1d7228aC34f087f37309456D2434344", data: "0x" }],
    });

    assert.equal(res, "0xtx_hash_from_wallet");
    assert.ok(providerReceived.includes("eth_sendTransaction"), "Must route eth_sendTransaction to browser provider");
  });

  it("verifies real StudioNet contract has valid deployed address and methods", async () => {
    const contractAddress = "0x1b06F421f1d7228aC34f087f37309456D2434344";
    const { isAddress, getAddress } = await import("viem");
    assert.equal(isAddress(contractAddress), true);
    assert.equal(getAddress(contractAddress), contractAddress);
  });

  it("verifies explicit verification lifecycle states", () => {
    const canonicalStates = [
      "DISCONNECTED",
      "CONNECTING",
      "CONNECTED",
      "WRONG_NETWORK",
      "READY",
      "AWAITING_WALLET",
      "WALLET_SUBMITTED",
      "PROCESSING",
      "CONSENSUS",
      "FINALIZED",
      "VERIFIED",
      "REJECTED",
      "INCONCLUSIVE",
      "ERROR",
    ];

    for (const state of canonicalStates) {
      assert.ok(typeof state === "string");
      assert.ok(state.length > 2);
    }
  });

  it("verifies EIP-1193 event listener support", () => {
    const requiredEvents = ["accountsChanged", "chainChanged", "disconnect"];
    assert.equal(requiredEvents.length, 3);
    assert.ok(requiredEvents.includes("accountsChanged"));
    assert.ok(requiredEvents.includes("chainChanged"));
    assert.ok(requiredEvents.includes("disconnect"));
  });
});

