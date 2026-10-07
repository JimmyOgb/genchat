"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Scale,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Cpu,
  RefreshCw,
  Hash,
  Globe,
} from "lucide-react";
import type { VerificationRecord } from "@/lib/genlayer/types";
import { getExplorerUrl } from "@/lib/genlayer/client";

export default function VerificationLedgerPage() {
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "count" }),
      });
      if (res.ok) {
        const data = await res.json();
        setCount(data.count || 0);
        if (data.records) {
          setVerifications(data.records);
        }
      }
    } catch (e) {
      console.warn("Could not fetch verification count:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case "APPROVED":
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[11px] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            APPROVED
          </span>
        );
      case "REJECTED":
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800 text-[11px] font-semibold">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            REJECTED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 text-[11px] font-semibold">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            INCONCLUSIVE
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-amber-500 selection:text-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
              title="Back to Chat"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" />
              <h1 className="font-bold text-sm tracking-tight text-zinc-100">
                GenLayer Verification Ledger
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchVerifications}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/chat"
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow transition-all"
            >
              Start Chat
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Network & Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-1.5">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Network
            </span>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse-subtle" />
              <span className="font-bold text-sm text-zinc-100">GenLayer StudioNet</span>
            </div>
            <p className="text-[11px] text-zinc-500">Chain ID: 61999 (0xF22F) • Gasless</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-1.5">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Consensus Protocol
            </span>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm text-zinc-100">Evidence Content-Bound</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Nondeterministic Web Retrieval + Hash Match
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-1.5">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Total Verified Decisions
            </span>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-bold text-xl text-zinc-100">{count}</span>
            </div>
            <p className="text-[11px] text-zinc-500">Indexed from intelligent contract</p>
          </div>
        </div>

        {/* Verification Records Table */}
        <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                On-Chain Verification Records & Evidence Provenance
              </h2>
              <p className="text-[11px] text-zinc-400">
                Auditable state transitions and validator consensus outcomes
              </p>
            </div>
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 underline font-medium"
            >
              <span>GenLayer Studio Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {verifications.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 mx-auto flex items-center justify-center text-zinc-500">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-300">
                No verifications initiated yet
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Open a conversation in GenChat, ask a high-impact question, and click{" "}
                <span className="text-amber-400 font-semibold">⚖️ Verify with GenLayer</span> to
                trigger decentralized validator consensus.
              </p>
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow transition-all mt-2"
              >
                Go to GenChat
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {verifications.map((item) => (
                <div key={item.verificationId} className="p-4 hover:bg-zinc-900/60 transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-400">
                        {item.verificationId}
                      </span>
                      {getDecisionBadge(item.decision)}
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${item.evidenceVerified ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800" : "bg-zinc-800 text-zinc-400"}`}>
                        {item.evidenceVerified ? "Evidence: VERIFIED" : "Evidence: UNVERIFIED"}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {new Date(item.finalizedAt || item.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-zinc-200">
                    {item.questionTitle}
                  </p>

                  <p className="text-xs text-zinc-400 italic">
                    &ldquo;{item.rationale}&rdquo;
                  </p>

                  {item.sourceUrls && item.sourceUrls.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate max-w-md font-mono text-[10px]">
                        {item.sourceUrls.join(", ")}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center flex-wrap gap-4 pt-1 text-[11px] text-zinc-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-zinc-600" />
                      Commitment: {item.expectedEvidenceHash ? item.expectedEvidenceHash.substring(0, 10) : "N/A"}...
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-zinc-600" />
                      Retrieved: {item.actualEvidenceHash ? item.actualEvidenceHash.substring(0, 10) : "N/A"}...
                    </span>
                    <span>Confidence: {item.confidence}%</span>
                    {item.transactionHash && (
                      <a
                        href={getExplorerUrl(item.transactionHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:text-amber-300 underline ml-auto"
                      >
                        View Tx
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
