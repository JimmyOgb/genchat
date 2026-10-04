"use client";

import React from "react";
import { FileText, X, Hash } from "lucide-react";
import type { ExtractedDocument } from "@/lib/documents/extractor";

interface DocumentAttachmentProps {
  document: ExtractedDocument;
  onRemove?: () => void;
  readOnly?: boolean;
}

export const DocumentAttachment: React.FC<DocumentAttachmentProps> = ({
  document,
  onRemove,
  readOnly = false,
}) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 max-w-sm">
      <FileText className="w-4 h-4 text-amber-400 shrink-0" />
      <div className="truncate flex-1">
        <span className="font-medium text-zinc-200">{document.fileName}</span>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <span>{(document.fileSize / 1024).toFixed(1)} KB</span>
          <span>•</span>
          <span className="flex items-center gap-0.5" title={`Evidence SHA-256: ${document.evidenceHash}`}>
            <Hash className="w-2.5 h-2.5" />
            {document.evidenceHash.substring(0, 10)}...
          </span>
        </div>
      </div>
      {!readOnly && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-zinc-500 hover:text-zinc-200 p-0.5 rounded transition-colors"
          title="Remove attachment"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
