"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  RotateCcw,
  Scale,
  Sparkles,
  User,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { DocumentAttachment } from "./DocumentAttachment";
import type { ExtractedDocument } from "@/lib/documents/extractor";
import type { VerificationRecord } from "@/lib/genlayer/types";

export interface MessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  mode?: "fast" | "research" | "verified";
  attachedDocuments?: ExtractedDocument[];
  verification?: VerificationRecord;
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: MessageItem;
  onRegenerate?: () => void;
  onInitiateVerification?: (message: MessageItem) => void;
  isLatestAssistant?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onRegenerate,
  onInitiateVerification,
  isLatestAssistant = false,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  return (
    <div
      className={`group w-full py-6 px-4 md:px-6 transition-colors ${
        isUser ? "bg-transparent" : "bg-zinc-900/40 border-y border-zinc-800/40"
      }`}
    >
      <div className="max-w-3xl mx-auto flex items-start gap-4">
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-semibold shadow-sm ${
            isUser
              ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
              : "bg-gradient-to-tr from-amber-600 to-amber-400 text-zinc-950 font-bold"
          }`}
        >
          {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Header info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-300">
                {isUser ? "You" : "GenChat"}
              </span>
              {message.mode && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                    message.mode === "verified"
                      ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                      : message.mode === "research"
                      ? "bg-blue-950/60 text-blue-400 border-blue-800/60"
                      : "bg-amber-950/40 text-amber-400 border-amber-800/40"
                  }`}
                >
                  {message.mode === "verified"
                    ? "⚖️ Verified Mode"
                    : message.mode === "research"
                    ? "🔎 Research Mode"
                    : "⚡ Fast Mode"}
                </span>
              )}
            </div>

            <span className="text-[11px] text-zinc-500">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Attached documents */}
          {message.attachedDocuments && message.attachedDocuments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 pb-2">
              {message.attachedDocuments.map((doc) => (
                <DocumentAttachment key={doc.id} document={doc} readOnly />
              ))}
            </div>
          )}

          {/* Body Content */}
          <div className="text-zinc-200">
            <MarkdownRenderer content={message.content} />
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse-subtle align-middle" />
            )}
          </div>

          {/* Verification Badge if verified on GenLayer */}
          {message.verification && (
            <div className="mt-4 p-3 rounded-xl bg-zinc-950 border border-emerald-500/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">
                    GenLayer Consensus Verified
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 font-mono">
                    {message.verification.decision}
                  </span>
                </div>
                {message.verification.explorerUrl && (
                  <a
                    href={message.verification.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 underline"
                  >
                    <span>Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-xs text-zinc-300 italic">
                &ldquo;{message.verification.rationale}&rdquo;
              </p>
              <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                <span>Confidence: {message.verification.confidence}%</span>
                <span>•</span>
                <span>ID: {message.verification.verificationId}</span>
              </div>
            </div>
          )}

          {/* Action Bar (Assistant only) */}
          {!isUser && !message.isStreaming && (
            <div className="flex items-center flex-wrap gap-2 pt-2 text-zinc-400 text-xs">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Copy response"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {isLatestAssistant && onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Regenerate answer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}

              {/* Verify with GenLayer Button */}
              {onInitiateVerification && !message.verification && (
                <button
                  type="button"
                  onClick={() => onInitiateVerification(message)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 transition-all font-medium ml-auto shadow-sm"
                  title="Submit this question and analysis for independent GenLayer validator consensus"
                >
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>⚖️ Verify with GenLayer</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
