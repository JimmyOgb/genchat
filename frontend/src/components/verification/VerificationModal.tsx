"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Scale,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Loader2,
  Cpu,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Wallet,
  ArrowRightLeft,
  Globe,
  Hash,
  Info,
} from "lucide-react";
import type { MessageItem } from "../chat/ChatMessage";
import { generateVerificationId, computeCanonicalQuestionHash } from "@/lib/utils/crypto";
import {
  getInjectedProvider,
  connectWallet,
  getConnectedAccount,
  getConnectedChainId,
  isStudioNet,
  switchToStudioNet,
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

  // New Evidence Verification Architecture Fields
  const [sourceUrl, setSourceUrl] = useState("https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-1.md");
  const [secondaryUrl, setSecondaryUrl] = useState("");
  const [criteria, setCriteria] = useState(
    "Independently verify whether the referenced source document unequivocally supports the claim. Decide APPROVED if fully supported, REJECTED if contradicted, or INCONCLUSIVE if ambiguous or unverified."
  );
  const [userDescription, setUserDescription] = useState("");
  const [expectedHashCommitment, setExpectedHashCommitment] = useState("0xad42acaf7e1139ce648a9c5561d1e00e777faf848941e9ee50c3f69792882122");

  const statusRef = React.useRef(status);
  statusRef.current = status;

  // Initialize fields from message when opened
  useEffect(() => {
    if (message) {
      setUserDescription(message.content.slice(0, 500));
    }
  }, [message]);

  // Check existing wallet connection and chain passively (never prompt on modal open)
  useEffect(() => {
    if (!isOpen) {
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
    message.content.split("\n")[0].substring(0, 150) || "GenChat Evidence Verification";

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

    const cleanSourceUrl = sourceUrl.trim();
    if (!cleanSourceUrl || !cleanSourceUrl.startsWith("http")) {
      setErrorMessage("A valid public HTTP/HTTPS Evidence Source URL is required. GenLayer validators must independently retrieve this source.");
      return;
    }

    const sourceUrls = [cleanSourceUrl];
    if (secondaryUrl.trim() && secondaryUrl.trim().startsWith("http")) {
      sourceUrls.push(secondaryUrl.trim());
    }

    setStatus("PREPARING");
    setStatusMessage("Packaging source URLs, cryptographic commitment hash, and criteria...");

    try {
      const verificationId = generateVerificationId();
      const questionHash = await computeCanonicalQuestionHash(questionTitle);

      const verificationRequest: VerificationRequest = {
        verificationId,
        questionTitle,
        questionHash,
        expectedEvidenceHash: expectedHashCommitment.trim().toLowerCase(),
        sourceUrls,
        criteria: criteria.trim(),
        userContextSummary: userDescription.trim() || message.content.slice(0, 1000),
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

      // 4. Consensus finalized: use the record exactly as decoded from the contract.
      //    No decision/confidence/rationale/timestamps are synthesized client-side.
      if (!receipt.record) {
        throw new Error("Finalization failure: contract record was not returned.");
      }
      const verifiedRecord: VerificationRecord = receipt.record;


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
                GenLayer Verifiable Evidence Consensus
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-amber-400 font-mono">
                  StudioNet
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Validators independently retrieve external source evidence & verify content hash binding
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

        {/* Honest Verification Claims & Trust Boundary */}
        <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/50 text-[11px] text-blue-200 space-y-2">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-blue-300 block">
                Honest Verification Principles & Trust Boundaries
              </span>
              <p className="leading-relaxed text-blue-200/90">
                GenLayer consensus provides cryptographically verifiable evidence adjudication across four distinct tiers:
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[10px]">
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-blue-900/40">
              <span className="font-bold text-amber-400 block mb-0.5">1. Content Integrity</span>
              <span className="text-zinc-300">Retrieved bytes strictly match the submitted SHA-256 commitment.</span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-blue-900/40">
              <span className="font-bold text-amber-400 block mb-0.5">2. Source Provenance</span>
              <span className="text-zinc-300">Validators independently fetch from specified HTTPS URL(s).</span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-blue-900/40">
              <span className="font-bold text-amber-400 block mb-0.5">3. Semantic Assessment</span>
              <span className="text-zinc-300">Multi-validator LLMs evaluate whether evidence satisfies criteria.</span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-blue-900/40">
              <span className="font-bold text-rose-400 block mb-0.5">4. Objective Truth Notice</span>
              <span className="text-zinc-300">Requester-selected sources can be incomplete, biased, or outdated. Consensus proves agreement on retrieved text, not absolute reality.</span>
            </div>
          </div>
        </div>

        {/* Claim Under Review */}
        <div className="space-y-1.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            Claim / Question to Verify
          </span>
          <p className="font-medium text-zinc-200 line-clamp-2 leading-relaxed">
            {questionTitle}
          </p>
        </div>

        {/* Evidence Source URL(s) Inputs */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              Evidence Source URL (Validators Retrieve Directly)
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://raw.githubusercontent.com/... or public web source"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-zinc-500" />
              Optional Secondary Source URL
            </label>
            <input
              type="url"
              value={secondaryUrl}
              onChange={(e) => setSecondaryUrl(e.target.value)}
              placeholder="https://... (Optional secondary independent source)"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-amber-400" />
              Expected Source Content Hash Commitment (SHA-256)
            </label>
            <input
              type="text"
              value={expectedHashCommitment}
              onChange={(e) => setExpectedHashCommitment(e.target.value)}
              placeholder="0x... (Canonical source content hash)"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Verification Criteria
            </label>
            <textarea
              rows={2}
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            />
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
                {statusMessage}
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
                  <span className="text-zinc-400">Content Integrity:</span>
                  <span className={`font-semibold ${record.evidenceVerified ? "text-emerald-400" : "text-amber-400"}`}>
                    {record.evidenceVerified ? "MATCHED (SHA-256 Verified)" : "MISMATCHED / UNVERIFIED"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Actual Retrieved Hash:</span>
                  <span className="font-mono text-[11px] text-zinc-300">
                    {record.actualEvidenceHash ? `${record.actualEvidenceHash.slice(0, 14)}...` : "None"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Semantic Consensus Confidence:</span>
                  <span className="font-mono font-semibold text-zinc-200">
                    {record.confidence}%
                  </span>
                </div>

                <div className="pt-1 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400">
                  <div>
                    <span className="text-zinc-500 block">Requester Timestamp (Metadata):</span>
                    <span>{record.createdAt ? new Date(record.createdAt).toLocaleTimeString() : "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Finalized (Consensus State):</span>
                    <span className="text-emerald-400">{record.finalizedAt ? new Date(record.finalizedAt).toLocaleTimeString() : "Confirmed"}</span>
                  </div>
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
