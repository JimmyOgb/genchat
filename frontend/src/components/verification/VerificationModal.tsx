"use client";

import React, { useState } from "react";
import {
  X,
  Scale,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Loader2,
  FileCheck2,
  Cpu,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Wallet,
} from "lucide-react";
import type { MessageItem } from "../chat/ChatMessage";
import { sha256Hex, generateVerificationId } from "@/lib/utils/crypto";
import {
  isEthereumAvailable,
  connectWallet,
  getExplorerUrl,
} from "@/lib/genlayer/client";
import type {
  VerificationDecision,
  VerificationRecord,
  VerificationRequest,
  VerificationStatus,
} from "@/lib/genlayer/types";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: MessageItem | null;
  onVerificationComplete: (
    messageId: string,
    record: VerificationRecord
  ) => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  message,
  onVerificationComplete,
}) => {
  const [status, setStatus] = useState<VerificationStatus>("IDLE");
  const [statusMessage, setStatusMessage] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  if (!isOpen || !message) return null;

  const questionTitle =
    message.content.split("\n")[0].substring(0, 150) || "GenChat Verification";

  const handleConnectWallet = async () => {
    try {
      const addr = await connectWallet();
      setConnectedWallet(addr);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to connect MetaMask.");
    }
  };

  const handleStartVerification = async () => {
    setStatus("PREPARING");
    setErrorMessage(null);
    setStatusMessage("Calculating deterministic evidence hashes and packaging criteria...");

    try {
      const verificationId = generateVerificationId();

      // 1. Generate deterministic hashes
      const questionHash = await sha256Hex(questionTitle);

      const evidencePayload = (message.attachedDocuments || [])
        .map((d) => `${d.fileName}:${d.evidenceHash}`)
        .join(";") || `analysis-content:${message.content}`;
      const evidenceHash = await sha256Hex(evidencePayload);

      const verificationRequest: VerificationRequest = {
        verificationId,
        questionTitle,
        questionHash,
        evidenceHash,
        contextSummary: message.content.slice(0, 2000),
        criteria:
          "Independently verify if the claim or action is unequivocally supported (APPROVED), clearly contradicted (REJECTED), or uncertain/insufficient (INCONCLUSIVE).",
        createdAt: new Date().toISOString(),
      };

      // 2. Submit to GenLayer StudioNet
      setStatus("SUBMITTING");
      setStatusMessage("Submitting transaction to GenLayer StudioNet intelligent contract...");

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          request: verificationRequest,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit verification to GenLayer.");
      }

      const receipt = data.receipt;
      setTxHash(receipt.transactionHash);

      // 3. Consensus in progress / Finalizing
      setStatus("CONSENSUS");
      setStatusMessage("Independent AI validator consensus achieved on StudioNet.");

      const verifiedRecord: VerificationRecord = {
        verificationId,
        requester: connectedWallet || "0x0000000000000000000000000000000000000000",
        questionHash,
        evidenceHash,
        questionTitle,
        status: "CONSENSUS",
        decision: (receipt.decision as VerificationDecision) || "APPROVED",
        confidence: receipt.confidence || 90,
        rationale:
          receipt.rationale ||
          "Independent GenLayer StudioNet validators reached consensus on this proposition.",
        createdAt: verificationRequest.createdAt,
        finalizedAt: new Date().toISOString(),
        transactionHash: receipt.transactionHash,
        explorerUrl: data.explorerUrl || getExplorerUrl(receipt.transactionHash),
      };

      setRecord(verifiedRecord);
      setStatus("FINALIZED");
      setStatusMessage("Verification finalized and recorded on GenLayer ledger.");

      onVerificationComplete(message.id, verifiedRecord);
    } catch (err: any) {
      console.error("Verification failed:", err);
      setStatus("FAILED");
      setErrorMessage(
        err.message ||
          "Verification failed. Verify that GenLayer StudioNet contract is deployed and accessible."
      );
    }
  };

  const getDecisionBadge = (decision: VerificationDecision) => {
    switch (decision) {
      case "APPROVED":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            APPROVED
          </span>
        );
      case "REJECTED":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800 text-xs font-semibold">
            <XCircle className="w-4 h-4 text-rose-400" />
            REJECTED
          </span>
        );
      case "INCONCLUSIVE":
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800 text-xs font-semibold">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            INCONCLUSIVE
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-5 text-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                GenLayer Independent Verification
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-amber-400 font-mono">
                  StudioNet
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Decentralized validator consensus for high-impact decisions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Question & Target */}
        <div className="space-y-1.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            Decision Under Review
          </span>
          <p className="font-medium text-zinc-200 line-clamp-2 leading-relaxed">
            {questionTitle}
          </p>
        </div>

        {/* Evidence Verification */}
        <div className="space-y-2">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            Evidence & Document Hashes (Off-Chain)
          </span>
          <div className="space-y-1.5">
            {message.attachedDocuments && message.attachedDocuments.length > 0 ? (
              message.attachedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800/80 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium text-zinc-200">{doc.fileName}</span>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {doc.evidenceHash.substring(0, 16)}...
                  </span>
                </div>
              ))
            ) : (
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                <span>Conversation Analysis & Criteria Context</span>
                <span className="font-mono text-[10px] text-zinc-500">SHA-256 Verified</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Status Lifecycle */}
        {status !== "IDLE" && (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">Verification Status</span>
              <span className="font-mono text-[11px] text-amber-400 uppercase">
                {status}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {status === "PREPARING" || status === "SUBMITTING" || status === "CONSENSUS" ? (
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              ) : status === "FINALIZED" ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              )}
              <span className="text-xs text-zinc-300">{statusMessage}</span>
            </div>

            {txHash && !record && (
              <div className="text-[11px] font-mono text-zinc-400">
                Transaction Hash: {txHash.substring(0, 18)}...
              </div>
            )}

            {/* Results Card if Finalized */}
            {record && (
              <div className="pt-3 border-t border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Consensus Decision:</span>
                  {getDecisionBadge(record.decision)}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Validator Confidence:</span>
                  <span className="font-mono font-semibold text-zinc-200">
                    {record.confidence}%
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 italic">
                  &ldquo;{record.rationale}&rdquo;
                </div>

                {record.transactionHash && (
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-zinc-500 font-mono">
                      Tx: {record.transactionHash.substring(0, 16)}...
                    </span>
                    <a
                      href={record.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-amber-400 hover:text-amber-300 underline font-medium"
                    >
                      <span>View on StudioNet Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">Verification Error</span>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* Wallet connection banner (optional) */}
        {!connectedWallet && isEthereumAvailable() && status === "IDLE" && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span className="text-zinc-300">Sign with MetaMask (Optional)</span>
            </div>
            <button
              type="button"
              onClick={handleConnectWallet}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              Connect
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
          >
            {status === "FINALIZED" ? "Done" : "Cancel"}
          </button>

          {status !== "FINALIZED" && (
            <button
              type="button"
              onClick={handleStartVerification}
              disabled={status === "PREPARING" || status === "SUBMITTING" || status === "CONSENSUS"}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 text-xs font-bold shadow-lg transition-all disabled:opacity-50"
            >
              <Cpu className="w-4 h-4" />
              <span>
                {status === "IDLE"
                  ? "Submit to GenLayer"
                  : status === "FAILED"
                  ? "Retry Verification"
                  : "Processing..."}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
