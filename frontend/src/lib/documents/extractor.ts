import { sha256Hex } from "../utils/crypto";

export interface ExtractedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  extractedText: string;
  characterCount: number;
  evidenceHash: string; // SHA-256 of the normalized text & metadata
}

/**
 * Parses and extracts text content from uploaded files.
 * Supports TXT, Markdown, CSV, JSON, and common text formats directly.
 */
export async function extractDocumentContent(
  file: File | { name: string; type: string; size: number; content: string }
): Promise<ExtractedDocument> {
  const id = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const fileName = file.name;
  const mimeType = file.type || "text/plain";
  const fileSize = file.size;

  let rawText = "";

  if ("content" in file) {
    rawText = file.content;
  } else {
    // Browser File object
    if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".json") || file.name.endsWith(".csv")) {
      rawText = await file.text();
    } else {
      // For binary formats in client-side preview, read as text fallback or extract header
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      // Clean readable ascii / utf-8 characters for text-like documents
      const decoder = new TextDecoder("utf-8", { fatal: false });
      rawText = decoder.decode(bytes);
    }
  }

  // Normalize extracted text: trim excessive whitespace
  const sanitizedText = rawText.replace(/\r\n/g, "\n").trim();
  
  // Calculate deterministic evidence hash based on normalized content
  const evidencePayload = `file:${fileName}|size:${sanitizedText.length}|content:${sanitizedText}`;
  const evidenceHash = await sha256Hex(evidencePayload);

  return {
    id,
    fileName,
    fileSize,
    mimeType,
    extractedText: sanitizedText.slice(0, 100000), // Cap at 100k chars for prompt safety
    characterCount: sanitizedText.length,
    evidenceHash,
  };
}
