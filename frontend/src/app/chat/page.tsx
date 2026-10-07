"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar, type ConversationSummary } from "@/components/chat/Sidebar";
import { ChatMessage, type MessageItem } from "@/components/chat/ChatMessage";
import { Composer } from "@/components/chat/Composer";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { type ChatMode } from "@/components/chat/ModeSelector";
import { VerificationModal } from "@/components/verification/VerificationModal";
import { SettingsModal } from "@/components/layout/SettingsModal";
import { AuthModal } from "@/components/layout/AuthModal";
import type { ExtractedDocument } from "@/lib/documents/extractor";
import type { VerificationRecord } from "@/lib/genlayer/types";
import { PanelLeft, Scale, User, LogOut } from "lucide-react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ChatPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([
    {
      id: "conv-1",
      title: "New Conversation",
      updatedAt: new Date().toISOString(),
      mode: "fast",
    },
  ]);
  const [activeConversationId, setActiveConversationId] = useState<string>("conv-1");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMode, setCurrentMode] = useState<ChatMode>("fast");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Modals & Auth State
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [targetVerificationMessage, setTargetVerificationMessage] = useState<MessageItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Load conversation messages from Supabase
  const loadMessages = useCallback(async (convId: string) => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("messages")
        .select("id, role, content, metadata, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Could not load messages from Supabase:", error.message);
        return;
      }

      if (data) {
        setMessages(
          data.map((m: any) => {
            const meta = (m.metadata as any) || {};
            return {
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              createdAt: m.created_at,
              mode: meta.mode,
              attachedDocuments: meta.attachedDocuments,
              verification: meta.verification,
            };
          })
        );
      }
    } catch (err: any) {
      console.warn("Error loading messages:", err.message);
    }
  }, []);

  // Load conversations list from Supabase
  const loadConversations = useCallback(async (_uid: string) => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, updated_at, mode")
        .order("updated_at", { ascending: false });

      if (error) {
        console.warn("Could not load conversations from Supabase:", error.message);
        return;
      }

      if (data && data.length > 0) {
        const mapped: ConversationSummary[] = data.map((c: any) => ({
          id: c.id,
          title: c.title,
          updatedAt: c.updated_at,
          mode: c.mode,
        }));
        setConversations(mapped);
        setActiveConversationId(mapped[0].id);
        loadMessages(mapped[0].id);
      }
    } catch (err: any) {
      console.warn("Error loading conversations:", err.message);
    }
  }, [loadMessages]);

  // Load user session on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("auth") === "true") {
        setAuthOpen(true);
        window.history.replaceState({}, "", "/chat");
      }
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }: any) => {
        if (data?.user) {
          setUserEmail(data.user.email ?? null);
          setUserId(data.user.id);
          setAuthOpen(false);
          loadConversations(data.user.id);
        }
      });

      const { data: authSubscription } = supabase.auth.onAuthStateChange(
        (event: any, session: any) => {
          if (session?.user) {
            setUserEmail(session.user.email ?? null);
            setUserId(session.user.id);
            setAuthOpen(false);
            loadConversations(session.user.id);
          } else {
            setUserEmail(null);
            setUserId(null);
            setConversations([
              {
                id: "conv-1",
                title: "New Conversation",
                updatedAt: new Date().toISOString(),
                mode: "fast",
              },
            ]);
            setActiveConversationId("conv-1");
            setMessages([]);
          }
        }
      );

      return () => {
        authSubscription.subscription.unsubscribe();
      };
    } else if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("genchat_local_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.email) setUserEmail(parsed.email);
        }
      } catch {
        // ignore
      }
    }
  }, [loadConversations]);

  const handleNewChat = async () => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const tempId = `conv-${Date.now()}`;
    let finalId = tempId;

    if (isSupabaseConfigured() && userId) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("conversations")
          .insert({
            user_id: userId,
            title: "New Conversation",
            mode: currentMode,
          })
          .select()
          .single();

        if (!error && data) {
          finalId = data.id;
        }
      } catch (err: any) {
        console.warn("Failed to create conversation in Supabase:", err.message);
      }
    }

    const newConv: ConversationSummary = {
      id: finalId,
      title: "New Conversation",
      updatedAt: new Date().toISOString(),
      mode: currentMode,
    };
    setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== finalId)]);
    setActiveConversationId(finalId);
    setMessages([]);
  };

  const handleSelectConversation = (id: string) => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setActiveConversationId(id);
    if (isSupabaseConfigured() && userId) {
      loadMessages(id);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (isSupabaseConfigured() && userId && !id.startsWith("conv-")) {
      try {
        const supabase = createClient();
        await supabase.from("conversations").delete().eq("id", id);
      } catch (err: any) {
        console.warn("Error deleting conversation from Supabase:", err.message);
      }
    }

    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      handleNewChat();
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  };

  const handleSendMessage = async (
    content: string,
    mode: ChatMode,
    attachedDocuments: ExtractedDocument[]
  ) => {
    if ((!content.trim() && attachedDocuments.length === 0) || isStreaming) return;

    const userMessage: MessageItem = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
      mode,
      attachedDocuments,
    };

    const assistantMessageId = `msg-${Date.now()}-assistant`;
    const initialAssistantMessage: MessageItem = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      mode,
      isStreaming: true,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, initialAssistantMessage]);
    setIsStreaming(true);

    let activeId = activeConversationId;
    let generatedTitle = "";

    // If first message in conversation, generate title and ensure conversation exists in Supabase
    if (messages.length === 0 && content.trim()) {
      generatedTitle = content.slice(0, 32).trim() + "...";
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, title: generatedTitle, updatedAt: new Date().toISOString() }
            : c
        )
      );
    }

    // Persist user message to Supabase if authenticated
    if (isSupabaseConfigured() && userId) {
      try {
        const supabase = createClient();
        if (activeId.startsWith("conv-")) {
          const { data: newDbConv } = await supabase
            .from("conversations")
            .insert({
              user_id: userId,
              title: generatedTitle || "New Conversation",
              mode,
            })
            .select()
            .single();

          if (newDbConv) {
            activeId = newDbConv.id;
            setActiveConversationId(activeId);
            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeConversationId
                  ? { ...c, id: newDbConv.id, title: newDbConv.title, updatedAt: newDbConv.updated_at }
                  : c
              )
            );
          }
        }

        if (!activeId.startsWith("conv-")) {
          await supabase.from("messages").insert({
            conversation_id: activeId,
            role: "user",
            content,
            metadata: { mode, attachedDocuments },
          });
        }
      } catch (err: any) {
        console.warn("Failed to persist user message to Supabase:", err.message);
      }
    }

    // Set up abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode,
          attachedDocuments,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response stream body returned from server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: accumulatedResponse }
              : msg
          )
        );
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, isStreaming: false, content: accumulatedResponse }
            : msg
        )
      );

      // Persist assistant message and update conversation in Supabase
      if (isSupabaseConfigured() && userId && !activeId.startsWith("conv-")) {
        try {
          const supabase = createClient();
          await supabase.from("messages").insert({
            conversation_id: activeId,
            role: "assistant",
            content: accumulatedResponse,
            metadata: { mode },
          });

          await supabase
            .from("conversations")
            .update({
              title: generatedTitle || undefined,
              updated_at: new Date().toISOString(),
            })
            .eq("id", activeId);
        } catch (err: any) {
          console.warn("Failed to persist assistant message to Supabase:", err.message);
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Stream aborted by user");
      } else {
        console.error("Chat streaming error:", err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  isStreaming: false,
                  content: `⚠️ ${err.message || "Failed to connect to Groq AI provider. Please verify GROQ_API_KEY."}`,
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleInitiateVerification = (message: MessageItem) => {
    setTargetVerificationMessage(message);
    setVerificationModalOpen(true);
  };

  const handleVerificationComplete = async (
    messageId: string,
    record: VerificationRecord
  ) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, verification: record } : msg
      )
    );

    // Save verification record to Supabase
    if (isSupabaseConfigured() && userId && !activeConversationId.startsWith("conv-")) {
      try {
        const supabase = createClient();
        await supabase.from("verifications").insert({
          id: record.verificationId,
          conversation_id: activeConversationId,
          user_id: userId,
          transaction_hash: record.transactionHash,
          question_title: record.questionTitle,
          question_hash: record.questionHash,
          expected_evidence_hash: record.expectedEvidenceHash,
          actual_evidence_hash: record.actualEvidenceHash,
          source_urls: record.sourceUrls,
          evidence_verified: record.evidenceVerified,
          user_context_summary: record.userContextSummary,
          status: record.status,
          decision: record.decision,
          confidence: record.confidence,
          rationale: record.rationale,
          explorer_url: record.explorerUrl,
          created_at: record.createdAt,
          finalized_at: record.finalizedAt,
        });
      } catch (err: any) {
        console.warn("Failed to persist verification to Supabase:", err.message);
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-zinc-950 overflow-hidden text-zinc-100">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        userEmail={userEmail}
        onSignOut={() => {
          if (isSupabaseConfigured()) {
            createClient().auth.signOut();
          }
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem("genchat_local_user");
            } catch {
              // ignore
            }
          }
          setUserEmail(null);
          setUserId(null);
        }}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Chat View */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-background relative">
        {/* Chat Header */}
        <header className="h-14 border-b border-zinc-800/80 flex items-center justify-between px-4 bg-background/80 backdrop-blur z-10 shrink-0">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                title="Open sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-zinc-200">
                {conversations.find((c) => c.id === activeConversationId)?.title || "GenChat"}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono">
                openai/gpt-oss-120b
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/verify"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium transition-colors"
            >
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Verification Ledger</span>
            </Link>

            {userEmail ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span className="max-w-[120px] truncate font-mono text-[11px] hidden sm:inline">
                  {userEmail}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (isSupabaseConfigured()) {
                      await createClient().auth.signOut();
                    }
                    if (typeof window !== "undefined") {
                      try {
                        localStorage.removeItem("genchat_local_user");
                      } catch {
                        // ignore
                      }
                    }
                    setUserEmail(null);
                    setUserId(null);
                  }}
                  className="text-zinc-500 hover:text-zinc-300 ml-1 p-0.5"
                  title="Sign out"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Messages Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {messages.length === 0 ? (
            <WelcomeScreen
              onSelectPrompt={(prompt, mode) => {
                setCurrentMode(mode);
                handleSendMessage(prompt, mode, []);
              }}
            />
          ) : (
            <div className="pb-4">
              {messages.map((msg, index) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onInitiateVerification={handleInitiateVerification}
                  onRegenerate={
                    index === messages.length - 1 && msg.role === "assistant"
                      ? () => {
                          const lastUser = [...messages]
                            .reverse()
                            .find((m) => m.role === "user");
                          if (lastUser) {
                            handleSendMessage(
                              lastUser.content,
                              lastUser.mode || currentMode,
                              lastUser.attachedDocuments || []
                            );
                          }
                        }
                      : undefined
                  }
                  isLatestAssistant={
                    index === messages.length - 1 && msg.role === "assistant"
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Composer */}
        <Composer
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          isStreaming={isStreaming}
          currentMode={currentMode}
          onModeChange={setCurrentMode}
        />
      </div>

      {/* Verification Modal */}
      <VerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        message={targetVerificationMessage}
        onVerificationComplete={handleVerificationComplete}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(email) => {
          setUserEmail(email);
          setAuthOpen(false);
        }}
      />
    </div>
  );
}
