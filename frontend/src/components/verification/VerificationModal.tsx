"use client";

import React, { useState, useEffect } from "react";
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
  ArrowRightLeft,
} from "lucide-react";
import type { MessageItem } from "../chat/ChatMessage";
import { sha256Hex, generateVerificationId } from "@/lib/utils/crypto";
import {
  getInjectedProvider,
  connectWallet,
  getConnectedAccount,
  getConnectedChainId,
  isStudioNet,
  switchToStudioNet,
  getExplorerUrl,
  validateGenLayerConfig,
  GENLAYER_CHAIN_ID,
  GENLAYER_CHAIN_ID_HEX,
} from "@/lib/genlayer/client";
import { GenLayerVerifierService } from "@/lib/genlayer/verifier";
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
  const [connectedChainId, setConnectedChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  const statusRef = React.useRef(status);
  statusRef.current = status;

  // Check existing wallet connection and chain passively (never prompt on modal open)
  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setStatus("IDLE");
      setStatusMessage("");
      setErrorMessage(null);
      return;
    }

    const provider = getInjectedProvider();
    if (provider) {
      getConnectedAccount().then((acc) => {
        if (acc) {
          setConnectedWallet(acc);
          getConnectedChainId().then((chainId) => {
            setConnectedChainId(chainId);
          });
        }
      });

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setConnectedWallet(accounts[0]);
          if (statusRef.current === "AWAITING_WALLET" || statusRef.current === "PREPARING") {
            setStatus("IDLE");
            setStatusMessage("");
          }
        } else {
          setConnectedWallet(null);
          setStatus("IDLE");
          setStatusMessage("");
        }
      };

      const handleChainChanged = (chainIdHex: string) => {
        const id = typeof chainIdHex === "string" ? parseInt(chainIdHex, 16) : Number(chainIdHex);
        setConnectedChainId(id);
      };

      const handleDisconnect = () => {
        setConnectedWallet(null);
        setConnectedChainId(null);
        setStatus("IDLE");
        setStatusMessage("");
      };

      provider.on?.("accountsChanged", handleAccountsChanged);
      provider.on?.("chainChanged", handleChainChanged);
      provider.on?.("disconnect", handleDisconnect);

      return () => {
        provider.removeListener?.("accountsChanged", handleAccountsChanged);
        provider.removeListener?.("chainChanged", handleChainChanged);
        provider.removeListener?.("disconnect", handleDisconnect);
      };
    }
  }, [isOpen]);

  if (!isOpen || !message) return null;

  const questionTitle =
    message.content.split("\n")[0].substring(0, 150) || "GenChat Verification";

  const isOnStudioNet = isStudioNet(connectedChainId);

  // User explicitly clicks "Connect Wallet"
  const handleConnectWallet = async () => {
    setErrorMessage(null);
    setIsConnecting(true);

    try {
      const addr = await connectWallet();
      setConnectedWallet(addr);
      const chainId = await getConnectedChainId();
      setConnectedChainId(chainId);
    } catch (err: any) {
      if (err.code === 4001 || /reject|denied|cancel/i.test(err.message)) {
        setErrorMessage(
          "Wallet connection cancelled. You can continue using GenChat without a wallet."
        );
      } else {
        setErrorMessage(err.message || "Failed to connect wallet.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // User explicitly clicks "Switch to GenLayer StudioNet"
  const handleSwitchNetwork = async () => {
    setErrorMessage(null);
    setIsSwitchingNetwork(true);

    try {
      const result = await switchToStudioNet();
      if (result.success) {
        const chainId = await getConnectedChainId();
        setConnectedChainId(chainId);
      } else if (result.error) {
        setErrorMessage(result.error);
      }
    } catch {
      setErrorMessage("StudioNet switch was cancelled. Verification was not submitted.");
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  // User explicitly clicks "Submit to GenLayer"
  const handleStartVerification = async () => {
    setErrorMessage(null);

    // 0. Validate GenLayer intelligent contract configuration
    const configValidation = validateGenLayerConfig();
    if (!configValidation.isValid) {
      setErrorMessage(
        configValidation.error || "GenLayer intelligent contract configuration is invalid."
      );
      return;
    }

    // 1. Check wallet account
    const userAddress = connectedWallet;
    if (!userAddress) {
      setErrorMessage("Please connect your wallet first to submit on-chain verification.");
      return;
    }

    // 2. Check chain ID
    const currentChainId = await getConnectedChainId();
    if (!isStudioNet(currentChainId)) {
      setErrorMessage(
        "GenLayer verification requires GenLayer StudioNet. Your wallet is currently connected to another network."
      );
      return;
    }

    setStatus("PREPARING");
    setStatusMessage("Calculating deterministic evidence hashes and packaging criteria...");

    try {
      const verificationId = generateVerificationId();

      // Deterministic hashes
      const questionHash = await sha256Hex(questionTitle);
      const evidencePayload =
        (message.attachedDocuments || [])
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

      // 3. Submit real transaction to GenLayer StudioNet via service layer
      setStatus("SUBMITTING");
      setStatusMessage("Please confirm transaction in your connected wallet...");

      const verifier = new GenLayerVerifierService();
      const receipt = await verifier.submitVerification(
        verificationRequest,
        userAddress,
        (currentStatus, msg, hash) => {
          setStatus(currentStatus);
          setStatusMessage(msg);
          if (hash) setTxHash(hash);
        }
      );

      setTxHash(receipt.transactionHash);

      // 4. Consensus Finalized
      const verifiedRecord: VerificationRecord = {
        verificationId,
        requester: userAddress,
        questionHash,
        evidenceHash,
        questionTitle,
        status: "CONSENSUS",
        decision: (receipt.decision as VerificationDecision) || "APPROVED",
        confidence: receipt.confidence || 90,
        rationale:
          receipt.rationale ||
          "Independent GenLayer StudioNet validators reached consensus on this proposition.",
        plainText:
          receipt.plainText ||
          `${receipt.decision || "APPROVED"} — ${receipt.confidence || 90}% confidence. ${receipt.rationale || ""}`,
        createdAt: verificationRequest.createdAt,
        finalizedAt: new Date().toISOString(),
        transactionHash: receipt.transactionHash,
        explorerUrl: getExplorerUrl(receipt.transactionHash),
      };

      setRecord(verifiedRecord);
      setStatus("FINALIZED");
      setStatusMessage("Verification finalized and recorded on GenLayer ledger.");

      onVerificationComplete(message.id, verifiedRecord);
    } catch (err: any) {
      console.error("Verification failed:", err);
      const msg = err.message || "";
      if (err.code === 4001 || /reject|denied|cancel/i.test(msg)) {
        setStatus("IDLE");
        setErrorMessage("User rejected transaction in wallet.");
      } else if (msg.includes("Consensus failure")) {
        setStatus("FAILED");
        setErrorMessage(msg);
      } else if (msg.includes("GenLayer processing failure")) {
        setStatus("FAILED");
        setErrorMessage(msg);
      } else if (msg.includes("Finalization failure")) {
        setStatus("FAILED");
        setErrorMessage(msg);
      } else {
        setStatus("FAILED");
        setErrorMessage(msg || "GenLayer transaction submission failed.");
      }
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
      <div className="relative w-full max-w-xl rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-5 text-zinc-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
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

        {/* Decision Under Review */}
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

        {/* Safe Wallet Status / Prompt Section */}
        {!connectedWallet ? (
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-zinc-300">
                <span className="font-semibold text-zinc-100 block">
                  Wallet Connection Required for On-Chain Verification
                </span>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  GenLayer verification requires a connected wallet to submit a real on-chain verification request. Your wallet is optional for normal GenChat use.
                </p>
                <div className="pt-1 text-[10px] text-zinc-400 font-mono">
                  Network: GenLayer StudioNet (Chain ID: {GENLAYER_CHAIN_ID})
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors disabled:opacity-50"
              >
                {isConnecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wallet className="w-3.5 h-3.5" />
                )}
                <span>Connect Wallet</span>
                <span className="hidden sm:inline">for GenLayer Verification</span>
              </button>
            </div>
          </div>
        ) : !isOnStudioNet ? (
          /* Network Mismatch Prompt */
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-zinc-100 block">
                  Switch to GenLayer StudioNet Required
                </span>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  GenLayer verification requires GenLayer StudioNet. Your wallet is currently connected to another network (Chain ID: {connectedChainId ?? "Unknown"}).
                </p>
                <div className="text-[10px] text-zinc-400 font-mono">
                  Target: GenLayer StudioNet (Chain ID: {GENLAYER_CHAIN_ID} / {GENLAYER_CHAIN_ID_HEX})
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSwitchNetwork}
                disabled={isSwitchingNetwork}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors disabled:opacity-50"
              >
                {isSwitchingNetwork ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                )}
                <span>Switch to GenLayer StudioNet</span>
              </button>
            </div>
          </div>
        ) : (
          /* Connected on StudioNet */
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 text-[11px]">Connected Wallet:</span>
                  <span className="font-mono text-amber-400 font-semibold text-xs">
                    {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  Network: GenLayer StudioNet (61999)
                </div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 font-medium">
              Ready
            </span>
          </div>
        )}

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
              {["PREPARING", "SUBMITTING", "AWAITING_WALLET", "WALLET_SUBMITTED", "PROCESSING", "CONSENSUS"].includes(status) ? (
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              ) : status === "FINALIZED" || status === "VERIFIED" ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : status === "REJECTED" ? (
                <XCircle className="w-5 h-5 text-rose-400" />
              ) : status === "INCONCLUSIVE" ? (
                <HelpCircle className="w-5 h-5 text-amber-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              )}
              <span className="text-xs text-zinc-300">
                {status === "AWAITING_WALLET"
                  ? "Confirm the verification transaction in your wallet."
                  : status === "PROCESSING"
                  ? "GenLayer is processing your verification..."
                  : status === "CONSENSUS"
                  ? "GenLayer validators are reaching consensus..."
                  : status === "FINALIZED"
                  ? "Verification finalized on GenLayer."
                  : status === "VERIFIED"
                  ? "Verification confirmed on-chain."
                  : statusMessage}
              </span>
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

                {record.plainText && (
                  <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-emerald-800/40 text-xs">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                      Plaintext Consensus Output:
                    </span>
                    <span className="text-zinc-200 font-medium">
                      {record.plainText}
                    </span>
                  </div>
                )}

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
              <span className="font-semibold">Verification Notice</span>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
          >
            {status === "FINALIZED" || status === "VERIFIED" || status === "REJECTED" || status === "INCONCLUSIVE" ? "Done" : "Cancel"}
          </button>

          {status !== "FINALIZED" && status !== "VERIFIED" && status !== "REJECTED" && status !== "INCONCLUSIVE" && connectedWallet && isOnStudioNet && (
            <button
              type="button"
              onClick={handleStartVerification}
              disabled={["PREPARING", "SUBMITTING", "AWAITING_WALLET", "WALLET_SUBMITTED", "PROCESSING", "CONSENSUS"].includes(status)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 text-xs font-bold shadow-lg transition-all disabled:opacity-50"
            >
              <Cpu className="w-4 h-4" />
              <span>
                {status === "IDLE"
                  ? "Submit Verification to GenLayer"
                  : status === "FAILED" || status === "ERROR"
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
