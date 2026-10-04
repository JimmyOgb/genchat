import Groq from "groq-sdk";
import type { AIProvider, ChatMessage, ChatOptions, StreamCallbacks } from "./AIProvider";
import { GENCHAT_SYSTEM_PROMPT } from "./systemPrompt";

export class GroqProvider implements AIProvider {
  name = "Groq";
  defaultModel = "openai/gpt-oss-120b";
  private groq: Groq | null = null;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    }
  }

  private getClient(): Groq {
    if (!this.groq) {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error(
          process.env.NODE_ENV === "development"
            ? "GROQ_API_KEY is missing from environment variables (.env.local). Please set GROQ_API_KEY to enable AI chat."
            : "Conversational AI service is currently unconfigured. Please contact support."
        );
      }
      this.groq = new Groq({ apiKey });
    }
    return this.groq;
  }

  async streamChat(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    options?: ChatOptions
  ): Promise<void> {
    const client = this.getClient();
    const model = options?.model || this.defaultModel;

    // Ensure system prompt is present at start of messages
    const formattedMessages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];
    const hasSystem = messages.some((m) => m.role === "system");
    if (!hasSystem) {
      formattedMessages.push({
        role: "system",
        content: GENCHAT_SYSTEM_PROMPT,
      });
    }

    for (const msg of messages) {
      formattedMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    try {
      const stream = await client.chat.completions.create(
        {
          model,
          messages: formattedMessages,
          stream: true,
          temperature: options?.temperature ?? 0.7,
          max_completion_tokens: options?.maxTokens ?? 4096,
        },
        {
          signal: options?.signal,
        }
      );

      let fullResponse = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          callbacks.onToken(delta);
        }
      }

      callbacks.onFinish(fullResponse);
    } catch (err: any) {
      if (err.name === "AbortError" || options?.signal?.aborted) {
        callbacks.onError(new Error("Generation cancelled by user."));
        return;
      }

      // Map structured Groq errors
      let errorMessage = "Unable to reach Groq AI provider right now. Please try again.";
      if (err?.status === 401 || err?.message?.includes("Invalid API Key")) {
        errorMessage = "Groq authentication failed. Please verify that GROQ_API_KEY is valid.";
      } else if (err?.status === 429 || err?.message?.includes("rate limit")) {
        errorMessage = "Rate limit reached on Groq API. Please wait a moment before sending another message.";
      } else if (err?.code === "ETIMEDOUT" || err?.message?.includes("timeout")) {
        errorMessage = "Request to Groq timed out. Please check your network connection and retry.";
      } else if (err?.message) {
        errorMessage = `Groq Error: ${err.message}`;
      }

      callbacks.onError(new Error(errorMessage));
    }
  }
}
