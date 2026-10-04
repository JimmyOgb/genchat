/**
 * AI Provider Abstraction Interface
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onError: (error: Error) => void;
  onFinish: (fullResponse: string) => void;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AIProvider {
  name: string;
  defaultModel: string;
  streamChat(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    options?: ChatOptions
  ): Promise<void>;
}
