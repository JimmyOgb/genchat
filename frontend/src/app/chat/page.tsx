"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { PanelLeft, Scale } from "lucide-react";
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

  // Modals
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [targetVerificationMessage, setTargetVerificationMessage] = useState<MessageItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Load user session on mount
  useEffect(() => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) {
          setUserEmail(data.user.email);
        }
      });
    }
  }, []);

  const handleNewChat = () => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const newId = `conv-${Date.now()}`;
    const newConv: ConversationSummary = {
      id: newId,
      title: "New Conversation",
      updatedAt: new Date().toISOString(),
      mode: currentMode,
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newId);
    setMessages([]);
  };

  const handleSelectConversation = (id: string) => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setActiveConversationId(id);
    // In production, fetch messages from Supabase or state
  };

  const handleDeleteConversation = (id: string) => {
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

    // Update conversation title if first user message
    if (messages.length === 0 && content.trim()) {
      const generatedTitle = content.slice(0, 32).trim() + "...";
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, title: generatedTitle, updatedAt: new Date().toISOString() }
            : c
        )
      );
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

  const handleVerificationComplete = (
    messageId: string,
    record: VerificationRecord
  ) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, verification: record } : msg
      )
    );
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
          setUserEmail(null);
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
        onSuccess={(email) => setUserEmail(email)}
      />
    </div>
  );
}
