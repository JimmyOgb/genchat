import { NextRequest } from "next/server";
import { GroqProvider } from "@/lib/ai/GroqProvider";
import { getActiveSearchProvider } from "@/lib/research/SearchProvider";
import type { ChatMessage } from "@/lib/ai/AIProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { messages, mode = "fast", attachedDocuments = [] } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request: 'messages' array is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const lastMessage = messages[messages.length - 1];
    const augmentedMessages: ChatMessage[] = [...messages];

    // Document context augmentation (off-chain analysis)
    if (attachedDocuments && attachedDocuments.length > 0) {
      const docSummaries = attachedDocuments
        .map(
          (doc: any) =>
            `[ATTACHED EVIDENCE DOCUMENT: ${doc.fileName} | SHA-256 Hash: ${doc.evidenceHash}]\n${doc.extractedText}`
        )
        .join("\n\n---\n\n");

      const systemDocContext: ChatMessage = {
        role: "system",
        content: `The user has provided the following verified evidence documents:\n\n${docSummaries}\n\nReference these documents accurately in your analysis.`,
      };
      augmentedMessages.splice(augmentedMessages.length - 1, 0, systemDocContext);
    }

    // Research Mode Handling
    if (mode === "research") {
      const searchProvider = getActiveSearchProvider();

      if (!searchProvider) {
        // Honest reporting when live search provider is unconfigured
        const unconfiguredNotice = `[RESEARCH MODE NOTICE]\nWeb search provider is currently not configured on this instance.\nTo enable live research mode, set SERPER_API_KEY or TAVILY_API_KEY in your environment variables.\n\nProviding preliminary model knowledge response based on internal training data:`;

        const encoder = new TextEncoder();
        const customStream = new ReadableStream({
          async start(controller) {
            controller.enqueue(encoder.encode(unconfiguredNotice + "\n\n"));
            const groq = new GroqProvider();
            await groq.streamChat(
              augmentedMessages,
              {
                onToken: (token) => controller.enqueue(encoder.encode(token)),
                onError: (err) => {
                  controller.enqueue(encoder.encode(`\n\n[Error: ${err.message}]`));
                  controller.close();
                },
                onFinish: () => controller.close(),
              },
              { signal: req.signal }
            );
          },
        });

        return new Response(customStream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-GenChat-Mode": "research",
            "X-GenChat-Search-Status": "unconfigured",
          },
        });
      }

      // Live search is configured!
      try {
        const searchQuery = lastMessage.content.slice(0, 200);
        const searchRes = await searchProvider.search(searchQuery, 4);

        const searchContextText = searchRes.results
          .map(
            (r, i) =>
              `[${i + 1}] "${r.title}"\nURL: ${r.url}\nSummary: ${r.snippet}\nSource: ${r.source}`
          )
          .join("\n\n");

        const searchContextMessage: ChatMessage = {
          role: "system",
          content: `Real-time search results retrieved via ${searchProvider.name}:\n\n${searchContextText}\n\nInstructions: Distinguish your model knowledge from these retrieved search results. Cite sources using [1], [2] brackets where relevant. Do not fabricate citations.`,
        };

        augmentedMessages.splice(augmentedMessages.length - 1, 0, searchContextMessage);
      } catch (searchErr: any) {
        console.warn(`[${requestId}] Search provider error:`, searchErr.message);
      }
    }

    // Verified Mode Handling: prompt model to provide verification criteria and structured evaluation
    if (mode === "verified") {
      const verificationGuidance: ChatMessage = {
        role: "system",
        content: `The user is operating in VERIFIED MODE.
Analyze the claim/decision thoroughly.
Provide:
1. Preliminary AI Analysis: Clear breakdown of the facts.
2. Verification Criteria: Exact standards required for independent consensus.
3. Recommended Decision: State whether the available evidence supports "APPROVED", "REJECTED", or "INCONCLUSIVE".
4. Prompt the user that they can click "⚖️ Verify with GenLayer" below to submit this exact question to independent validators on StudioNet.`,
      };
      augmentedMessages.splice(augmentedMessages.length - 1, 0, verificationGuidance);
    }

    // Stream response from Groq
    const groq = new GroqProvider();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        await groq.streamChat(
          augmentedMessages,
          {
            onToken(token) {
              controller.enqueue(encoder.encode(token));
            },
            onError(err) {
              console.error(`[${requestId}] Groq streaming error:`, err.message);
              controller.enqueue(encoder.encode(`\n\n[Error: ${err.message}]`));
              controller.close();
            },
            onFinish() {
              const latencyMs = Date.now() - startTime;
              console.log(
                JSON.stringify({
                  requestId,
                  provider: "Groq",
                  model: "openai/gpt-oss-120b",
                  mode,
                  latencyMs,
                  status: "success",
                })
              );
              controller.close();
            },
          },
          {
            signal: req.signal,
          }
        );
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-GenChat-Request-Id": requestId,
        "X-GenChat-Provider": "Groq",
        "X-GenChat-Model": "openai/gpt-oss-120b",
      },
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.error(
      JSON.stringify({
        requestId,
        error: err.message,
        latencyMs,
        status: "failed",
      })
    );

    return new Response(
      JSON.stringify({
        error: err.message || "An unexpected error occurred while processing your chat request.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
