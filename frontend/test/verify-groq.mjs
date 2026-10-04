import fs from "fs";
import path from "path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const apiKey = process.env.GROQ_API_KEY || env.GROQ_API_KEY;

async function verifyGroq() {
  if (!apiKey) {
    console.log(JSON.stringify({
      provider: "groq",
      model: "openai/gpt-oss-120b",
      configured: false,
      status: "MISSING_KEY",
      error: "GROQ_API_KEY is not defined in environment"
    }, null, 2));
    process.exit(1);
  }

  const startTime = Date.now();
  let firstTokenTime = null;
  let tokenCount = 0;
  let fullText = "";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "You are GenChat AI." },
          { role: "user", content: "Say hello in one short sentence." }
        ],
        stream: true,
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.log(JSON.stringify({
        provider: "groq",
        model: "openai/gpt-oss-120b",
        httpStatus: res.status,
        status: "HTTP_ERROR",
        error: errText
      }, null, 2));
      process.exit(1);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (!firstTokenTime) {
        firstTokenTime = Date.now();
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === "[DONE]") continue;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            tokenCount++;
            fullText += delta;
          }
        } catch {
          // ignore stream chunk parse errors
        }
      }
    }

    const endTime = Date.now();

    console.log(JSON.stringify({
      provider: "groq",
      model: "openai/gpt-oss-120b",
      httpStatus: res.status,
      streamingSuccess: true,
      timeToFirstTokenMs: firstTokenTime ? firstTokenTime - startTime : null,
      totalLatencyMs: endTime - startTime,
      tokenCount,
      responseSample: fullText.trim()
    }, null, 2));

  } catch (err) {
    console.log(JSON.stringify({
      provider: "groq",
      model: "openai/gpt-oss-120b",
      status: "REQUEST_FAILED",
      error: err.message
    }, null, 2));
    process.exit(1);
  }
}

verifyGroq();
