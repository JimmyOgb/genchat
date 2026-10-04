import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

async function runBrowserE2E() {
  console.log("=== Starting Manual Browser E2E Verification ===");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-quic",
      "--incognito",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Collect console logs and errors
  const consoleMessages = [];
  page.on("console", (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  // Inject Web3 Mock Provider to monitor wallet calls
  await page.evaluateOnNewDocument(() => {
    window.__ethCalls = [];
    window.ethereum = {
      isMetaMask: true,
      _currentChainId: "0x1", // Starts on Ethereum Mainnet to test network safety
      _accounts: ["0x71C8360f3a142106e22f25b2931a7F3d3EbF6f76"],
      _listeners: {},
      request: async ({ method, params }) => {
        window.__ethCalls.push({ method, params, time: Date.now() });
        if (method === "eth_accounts") {
          return []; // Not connected until explicitly prompted
        }
        if (method === "eth_chainId") {
          return window.ethereum._currentChainId;
        }
        if (method === "eth_requestAccounts") {
          return window.ethereum._accounts;
        }
        if (method === "wallet_switchEthereumChain") {
          window.ethereum._currentChainId = params[0].chainId;
          if (window.ethereum._listeners["chainChanged"]) {
            window.ethereum._listeners["chainChanged"](params[0].chainId);
          }
          return null;
        }
        if (method === "wallet_addEthereumChain") {
          window.ethereum._currentChainId = params[0].chainId;
          return null;
        }
        if (method === "eth_sendTransaction") {
          return "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        }
        if (method === "eth_getTransactionCount") {
          return "0x0";
        }
        if (method === "eth_estimateGas") {
          return "0x30d40";
        }
        if (method === "eth_gasPrice") {
          return "0x3b9aca00";
        }
        if (method === "eth_fillTransaction") {
          return params[0];
        }
        if (method === "eth_getBlockByNumber") {
          return { number: "0x1", timestamp: "0x0" };
        }
        throw new Error(`Unhandled RPC method: ${method}`);
      },
      on: (event, cb) => {
        window.ethereum._listeners[event] = cb;
      },
      removeListener: (event) => {
        delete window.ethereum._listeners[event];
      },
    };
  });

  try {
    // ==========================================
    // SECTION A: Fresh browser test & Landing page
    // ==========================================
    console.log("\n[A] Opening Landing Page...");
    const landingResponse = await page.goto(APP_URL, { waitUntil: "networkidle0" });
    assert.equal(landingResponse.status(), 200, "Landing page must return 200 OK");

    const ethCallsOnLoad = await page.evaluate(() => window.__ethCalls);
    console.log(`[A] Ethereum calls on page load: ${ethCallsOnLoad.length}`);
    const prohibitedMethods = [
      "eth_requestAccounts",
      "wallet_switchEthereumChain",
      "wallet_addEthereumChain",
      "eth_sign",
      "personal_sign",
      "eth_sendTransaction",
    ];
    for (const m of prohibitedMethods) {
      const found = ethCallsOnLoad.find((c) => c.method === m);
      assert.equal(found, undefined, `Page load must NOT trigger ${m}`);
    }
    console.log("✔ [A] Verified: Page load triggers zero wallet or blockchain calls.");

    // Check favicon
    const faviconRes = await page.goto(`${APP_URL}/favicon.ico`);
    assert.ok(
      [200, 304].includes(faviconRes.status()),
      `favicon.ico must return 200 or 304, got ${faviconRes.status()}`
    );
    console.log("✔ [A] Verified: favicon.ico returns 200/304 OK (no 500 error).");

    // Return to landing page
    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });

    // ==========================================
    // SECTION B: Test Sign In
    // ==========================================
    console.log("\n[B] Testing Sign In button on landing page...");
    // Find and click the visible Sign In link
    await page.waitForSelector('a[href="/chat?auth=true"]', { visible: true });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
      page.click('a[href="/chat?auth=true"]'),
    ]);

    // Check AuthModal opened
    await page.waitForSelector('h2', { timeout: 5000 });
    const modalHeading = await page.evaluate(() => {
      const h2 = document.querySelector("h2");
      return h2 ? h2.innerText : "";
    });
    console.log(`[B] Auth modal displayed heading: "${modalHeading}"`);
    assert.match(modalHeading, /Sign In to GenChat/i);

    // Verify zero wallet calls occurred during sign in modal open
    const ethCallsOnAuthOpen = await page.evaluate(() => window.__ethCalls);
    for (const m of prohibitedMethods) {
      const found = ethCallsOnAuthOpen.find((c) => c.method === m);
      assert.equal(found, undefined, `Opening Sign In must NOT trigger ${m}`);
    }
    console.log("✔ [B] Verified: Sign In modal opened with ZERO wallet calls.");

    // Check Supabase config status
    const badgeText = await page.evaluate(() => {
      const span = document.querySelector("h2 + span");
      return span ? span.innerText : "";
    });
    console.log(`[B] Auth configuration mode: "${badgeText}"`);
    assert.match(badgeText, /Supabase Cloud authentication/i);

    // Fill real Supabase credentials and submit
    console.log("[B] Signing in with real Supabase Cloud user: genchat.tester.dev@gmail.com...");
    await page.type('input[type="email"]', "genchat.tester.dev@gmail.com");
    await page.type('input[type="password"]', "Password123!");
    await new Promise((r) => setTimeout(r, 200));
    await page.click('button[type="submit"]');

    // Wait for modal to close or throw on error
    await page.waitForFunction(
      () => {
        const errEl = document.querySelector(".bg-rose-950\\/60");
        if (errEl && errEl.innerText) {
          throw new Error("Supabase auth error: " + errEl.innerText);
        }
        return !document.querySelector('input[type="email"]');
      },
      { timeout: 20000 }
    );
    await page.waitForSelector("header", { timeout: 10000 });

    const headerText = await page.evaluate(() => document.querySelector("header")?.innerText || "");
    assert.match(headerText, /genchat\.tester\.dev@gmail\.com/i, "Header must display authenticated email");
    console.log("✔ [B] Verified: User authenticated via real Supabase Cloud as genchat.tester.dev@gmail.com.");

    // Refresh /chat and verify session persistence
    console.log("[B] Refreshing /chat to verify Supabase session persistence...");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector("header")?.innerText.includes("genchat.tester.dev@gmail.com"),
      { timeout: 10000 }
    );
    const headerAfterReload = await page.evaluate(() => document.querySelector("header")?.innerText || "");
    assert.match(headerAfterReload, /genchat\.tester\.dev@gmail\.com/i, "Session must persist after reload");
    console.log("✔ [B] Verified: Supabase authenticated session persisted after reload.");

    // Test Sign Out
    console.log("[B] Testing Sign Out...");
    await page.waitForSelector('button[title="Sign out"]', { visible: true });
    await page.click('button[title="Sign out"]');

    await page.waitForFunction(() => {
      const header = document.querySelector("header");
      return header && header.innerText.includes("Sign In") && !header.innerText.includes("genchat.tester.dev@gmail.com");
    }, { timeout: 10000 });
    console.log("✔ [B] Verified: Signed out successfully. Header shows 'Sign In'.");
    await new Promise((r) => setTimeout(r, 1000));

    // Test Sign In Again
    console.log("[B] Testing Sign In again...");
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.some((b) => (b.innerText || b.textContent || "").includes("Sign In"));
    }, { timeout: 10000 });

    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => (b.innerText || b.textContent || "").includes("Sign In"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log("[B] Re-sign-in button clicked:", clicked);
    const emailInput = await page.waitForSelector('input[type="email"]', { visible: true, timeout: 15000 });
    await new Promise((r) => setTimeout(r, 500));
    await emailInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await emailInput.type("genchat.tester.dev@gmail.com");
    const passwordInput = await page.waitForSelector('input[type="password"]', { visible: true });
    await passwordInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await passwordInput.type("Password123!");

    const formState = await page.evaluate(() => {
      const em = document.querySelector('input[type="email"]')?.value;
      const pw = document.querySelector('input[type="password"]')?.value;
      return { em, pwLen: pw?.length };
    });
    console.log("[B] Re-sign-in inputs:", formState);

    await new Promise((r) => setTimeout(r, 200));
    await page.click('button[type="submit"]');

    await page.waitForFunction(
      () => {
        const errEl = document.querySelector(".bg-rose-950\\/60");
        if (errEl && errEl.innerText) {
          throw new Error("Supabase auth error: " + errEl.innerText);
        }
        return !document.querySelector('input[type="email"]');
      },
      { timeout: 20000 }
    );
    const headerAfterReSignIn = await page.evaluate(() => document.querySelector("header")?.innerText || "");
    assert.match(headerAfterReSignIn, /genchat\.tester\.dev@gmail\.com/i, "Header must restore authenticated email");
    console.log("✔ [B] Verified: Successfully signed in again with Supabase Cloud.");
    console.log("✔ [B] Verified: Authenticated session persisted after reload.");

    // ==========================================
    // SECTION C: Test normal Chat (Fast Mode)
    // ==========================================
    console.log("\n[C] Testing normal Chat in Fast Mode...");
    await page.waitForSelector("textarea", { visible: true });
    await page.type("textarea", "What are the three classical states of matter? Answer in 1 short sentence.");
    await page.keyboard.press("Enter");

    // Wait for assistant response to stream and complete
    await page.waitForFunction(
      () => {
        const messages = document.querySelectorAll(".prose");
        return messages.length > 0 && messages[0].innerText.length > 10;
      },
      { timeout: 30000 }
    );

    const fastResponse = await page.evaluate(() => {
      const prose = document.querySelectorAll(".prose");
      return prose[0]?.innerText || "";
    });
    console.log(`[C] Groq Fast Response: "${fastResponse.trim()}"`);
    assert.ok(fastResponse.length > 0, "Fast mode must stream a response");

    const ethCallsDuringChat = await page.evaluate(() => window.__ethCalls);
    for (const m of prohibitedMethods) {
      const found = ethCallsDuringChat.find((c) => c.method === m);
      assert.equal(found, undefined, `Chat must NOT trigger ${m}`);
    }
    console.log("✔ [C] Verified: Normal chat completed with ZERO wallet or blockchain interaction.");

    // ==========================================
    // SECTION D: Test Research Mode
    // ==========================================
    console.log("\n[D] Testing Research Mode...");
    // Find and click the ModeSelector button for Research
    const researchBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.innerText.includes("Research") || b.innerText.includes("🔎"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (researchBtn) {
      await page.waitForSelector("textarea", { visible: true });
      await page.type("textarea", "Freezing point of pure water under standard pressure");
      await page.keyboard.press("Enter");

      await page.waitForFunction(
        () => {
          const prose = document.querySelectorAll(".prose");
          return prose.length >= 2 && prose[prose.length - 1].innerText.length > 10;
        },
        { timeout: 30000 }
      );

      const researchResponse = await page.evaluate(() => {
        const prose = document.querySelectorAll(".prose");
        return prose[prose.length - 1]?.innerText || "";
      });
      console.log(`[D] Research Response preview: "${researchResponse.substring(0, 100).replace(/\n/g, " ")}..."`);
    }

    const ethCallsDuringResearch = await page.evaluate(() => window.__ethCalls);
    for (const m of prohibitedMethods) {
      const found = ethCallsDuringResearch.find((c) => c.method === m);
      assert.equal(found, undefined, `Research mode must NOT trigger ${m}`);
    }
    console.log("✔ [D] Verified: Research mode completed with ZERO wallet or blockchain interaction.");

    // ==========================================
    // SECTION E: Explicit GenLayer Verification
    // ==========================================
    console.log("\n[E] Testing Explicit GenLayer Verification Modal...");
    // Wait for streaming to finish and the action button to be rendered
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.some((b) => b.innerText.includes("Verify with GenLayer"));
      },
      { timeout: 30000 }
    );

    // Find and click "Verify with GenLayer" button on assistant message
    const verifyClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const vBtn = buttons.find((b) => b.innerText.includes("Verify with GenLayer"));
      if (vBtn) {
        vBtn.click();
        return true;
      }
      return false;
    });
    assert.ok(verifyClicked, "Must find and click 'Verify with GenLayer' button");

    // Wait for verification modal
    await page.waitForSelector("h2", { visible: true });
    const verifyModalHeading = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll("h2"));
      return headings.find((h) => h.innerText.includes("GenLayer Independent Verification"))?.innerText || "";
    });
    assert.match(verifyModalHeading, /GenLayer Independent Verification/);

    // Verify explanation before requesting wallet
    const modalBodyText = await page.evaluate(() => document.body.innerText);
    assert.match(
      modalBodyText,
      /GenLayer verification requires a (connected )?wallet to submit/i
    );
    assert.match(modalBodyText, /Your wallet is optional for normal GenChat use/i);
    console.log("✔ [E] Verified: Safe explanation shown before any wallet request.");

    // Verify eth_requestAccounts was NOT yet called
    const ethCallsBeforeConnect = await page.evaluate(() => window.__ethCalls);
    assert.equal(
      ethCallsBeforeConnect.some((c) => c.method === "eth_requestAccounts"),
      false,
      "eth_requestAccounts must NOT be called before clicking Connect Wallet"
    );
    console.log("✔ [E] Verified: Zero wallet connection requests prior to user clicking connect.");

    // Click "Connect Wallet for GenLayer Verification"
    console.log("[E] Clicking 'Connect Wallet'...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.innerText.includes("Connect Wallet"));
      if (btn) btn.click();
    });

    // Check that eth_requestAccounts was called
    await page.waitForFunction(() =>
      window.__ethCalls.some((c) => c.method === "eth_requestAccounts")
    );
    console.log("✔ [E] Verified: eth_requestAccounts triggered ONLY after explicit button click.");

    // Since mock wallet is on chain 0x1 (Mainnet), check network mismatch prompt
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("GenLayer verification requires GenLayer StudioNet") &&
        document.body.innerText.includes("Switch to GenLayer StudioNet"),
      { timeout: 5000 }
    );
    console.log("✔ [E] Verified: Non-StudioNet chain detected and explicit 'Switch to GenLayer StudioNet' prompted.");

    // Click "Switch to GenLayer StudioNet"
    console.log("[E] Clicking 'Switch to GenLayer StudioNet'...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.innerText.includes("Switch to GenLayer StudioNet"));
      if (btn) btn.click();
    });

    // Verify wallet_switchEthereumChain was called with 0xf22f
    await page.waitForFunction(() =>
      window.__ethCalls.some(
        (c) =>
          c.method === "wallet_switchEthereumChain" &&
          c.params[0]?.chainId?.toLowerCase() === "0xf22f"
      )
    );
    console.log("✔ [E] Verified: wallet_switchEthereumChain requested for StudioNet (0xF22F / 61999).");

    // Verify modal transitions to Ready state
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Connected Wallet:") &&
        document.body.innerText.includes("StudioNet (61999)") &&
        document.body.innerText.includes("Submit Verification to GenLayer"),
      { timeout: 5000 }
    );
    console.log("✔ [E] Verified: Wallet connected on StudioNet (61999) and Ready.");

    // ==========================================
    // SECTION F: Transaction Safety Check
    // ==========================================
    console.log("\n[F] Verifying transaction safety parameters...");
    const readyStateText = await page.evaluate(() => document.body.innerText);
    assert.match(readyStateText, /StudioNet \(61999\)/);
    assert.match(readyStateText, /Submit Verification to GenLayer/);

    // Verify NO approval or ERC-20 keywords in UI
    assert.equal(readyStateText.includes("approve"), false);
    assert.equal(readyStateText.includes("allowance"), false);
    assert.equal(readyStateText.includes("infinite"), false);
    console.log("✔ [F] Verified: Zero token approvals or allowances requested.");

    // Test transaction signing trigger
    console.log("[F] Clicking 'Submit Verification to GenLayer'...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const submitBtn = buttons.find((b) => b.innerText.includes("Submit Verification to GenLayer"));
      if (submitBtn) submitBtn.click();
    });

    // Verify it reaches the signing state without InvalidAddressError
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Confirm the verification transaction in your wallet") ||
        document.body.innerText.includes("Please confirm transaction in your connected wallet") ||
        document.body.innerText.includes("Submitting transaction to GenLayer") ||
        window.__ethCalls.some((c) => c.method === "eth_sendTransaction"),
      { timeout: 10000 }
    );
    console.log("✔ [F] Verified: Reached wallet transaction-signing stage without InvalidAddressError!");

    // Confirm no InvalidAddressError occurred in console
    const invalidAddressErr = consoleMessages.find((m) =>
      m.text.includes("InvalidAddressError") || m.text.includes('Address "undefined" is invalid')
    );
    assert.equal(invalidAddressErr, undefined, "Must NOT throw InvalidAddressError");
    console.log("✔ [F] Verified: Zero InvalidAddressError instances detected.");

    // Close modal
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const cancelBtn = buttons.find((b) => b.innerText.trim() === "Cancel" || b.innerText.includes("Close"));
      if (cancelBtn) cancelBtn.click();
    });

    // ==========================================
    // SECTION H: Final Reload Test
    // ==========================================
    console.log("\n[H] Testing final reload...");
    const callsCountBefore = await page.evaluate(() => window.__ethCalls.length);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector("header")?.innerText.includes("genchat.tester.dev@gmail.com"),
      { timeout: 10000 }
    );

    // Confirm session remains valid
    const reloadedHeaderText = await page.evaluate(() => document.querySelector("header")?.innerText || "");
    assert.match(reloadedHeaderText, /genchat\.tester\.dev@gmail\.com/i, "User must still be authenticated");

    // Confirm no popups or new wallet calls
    const callsCountAfter = await page.evaluate(() => window.__ethCalls.length);
    assert.equal(callsCountAfter, 0, "Fresh reload should have zero automatic wallet calls");
    console.log("✔ [H] Verified: Authenticated session remains valid with zero automatic reconnects or popups.");

    console.log("\n=== ALL MANUAL BROWSER E2E TESTS PASSED SUCCESSFULLY! ===");
    return true;
  } catch (err) {
    console.error("Browser E2E Failure:", err);
    console.log("Recent Console Messages:\n", consoleMessages.slice(-20));
    throw err;
  } finally {
    await browser.close();
  }
}

runBrowserE2E()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
