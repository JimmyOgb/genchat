"use client";

import React, { useRef, useState, useEffect } from "react";
import { Send, Square, Paperclip, Loader2 } from "lucide-react";
import { ModeSelector, type ChatMode } from "./ModeSelector";
import { DocumentAttachment } from "./DocumentAttachment";
import type { ExtractedDocument } from "@/lib/documents/extractor";

interface ComposerProps {
  onSendMessage: (
    content: string,
    mode: ChatMode,
    attachedDocuments: ExtractedDocument[]
  ) => void;
  onStopGeneration?: () => void;
  isStreaming: boolean;
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  onStopGeneration,
  isStreaming,
  currentMode,
  onModeChange,
}) => {
  const [input, setInput] = useState("");
  const [documents, setDocuments] = useState<ExtractedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!input.trim() && documents.length === 0) || isStreaming) return;
    onSendMessage(input.trim(), currentMode, documents);
    setInput("");
    setDocuments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.document) {
            setDocuments((prev) => [...prev, data.document]);
          }
        } else {
          console.error("Failed to upload document");
        }
      }
    } catch (err) {
      console.error("Upload error", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      <div className="flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl focus-within:border-zinc-700 transition-all p-3">
        {/* Attachments preview */}
        {documents.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-3 pt-1 border-b border-zinc-800/80 mb-2">
            {documents.map((doc) => (
              <DocumentAttachment
                key={doc.id}
                document={doc}
                onRemove={() => removeDocument(doc.id)}
              />
            ))}
          </div>
        )}

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            currentMode === "verified"
              ? "Ask a critical decision question to verify with GenLayer consensus..."
              : currentMode === "research"
              ? "Ask a research question for live search retrieval and cited sources..."
              : "Message GenChat... (Shift+Enter for newline)"
          }
          rows={1}
          className="w-full bg-transparent resize-none text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none max-h-48 py-1 px-1"
        />

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-2 mt-1">
          <div className="flex items-center gap-2">
            {/* Mode selector */}
            <ModeSelector
              currentMode={currentMode}
              onModeChange={onModeChange}
              disabled={isStreaming}
            />

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              multiple
              accept=".txt,.md,.pdf,.json,.csv,.docx"
            />

            {/* Attachment button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isStreaming}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Attach evidence or document (PDF, TXT, MD, DOCX)"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Action button: Send or Stop */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopGeneration}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
              title="Stop generating"
            >
              <Square className="w-4 h-4 fill-zinc-200" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim() && documents.length === 0}
              className={`p-2 rounded-xl transition-all ${
                input.trim() || documents.length > 0
                  ? "bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-md font-semibold"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              }`}
              title="Send message (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="text-center pt-2 text-[11px] text-zinc-500">
        GenChat can make mistakes. Verify important decisions with GenLayer independent consensus.
      </div>
    </div>
  );
};
