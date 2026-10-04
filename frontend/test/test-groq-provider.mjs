import fs from "fs";
import path from "path";
import Groq from "groq-sdk";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const content = fs.readFileSync(envPath, "utf8");
for (const line of content.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) {
    process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
}

async function runGroqProviderTest() {
  const apiKey = process.env.GROQ_API_KEY;
  const client = new Groq({ apiKey });

  const startTime = Date.now();
  let firstTokenTime = null;
  let receivedContent = "";
  let chunkCount = 0;

  try {
    const stream = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: "You are GenChat AI." },
        { role: "user", content: "Name 3 primary colors in comma-separated format." }
      ],
      stream: true,
      max_completion_tokens: 256,
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      chunkCount++;
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        if (!firstTokenTime) {
          firstTokenTime = Date.now();
        }
        receivedContent += delta;
      }
    }

    const endTime = Date.now();
    console.log(JSON.stringify({
      provider: "Groq",
      model: "openai/gpt-oss-120b",
      status: "SUCCESS",
      httpStatus: 200,
      streamingSuccess: true,
      chunkCount,
      timeToFirstTokenMs: firstTokenTime ? firstTokenTime - startTime : null,
      totalLatencyMs: endTime - startTime,
      response: receivedContent.trim()
    }, null, 2));

  } catch (err) {
    console.error("Groq provider error:", err);
    process.exit(1);
  }
}

runGroqProviderTest();
