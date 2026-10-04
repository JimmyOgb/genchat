"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  Search,
  Scale,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-amber-500 selection:text-zinc-950">
      {/* Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-black text-zinc-950 shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight">GenChat</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/verify"
              className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-1.5"
            >
              Verification Ledger
            </Link>
            <Link
              href="/chat?auth=true"
              className="text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900"
            >
              Sign In
            </Link>
            <Link
              href="/chat"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-lg transition-all"
            >
              <span>Start Chatting</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 md:py-24 text-center max-w-4xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium animate-pulse-subtle">
          <Scale className="w-3.5 h-3.5" />
          <span>Decentralized AI Consensus on GenLayer StudioNet</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-100 max-w-3xl leading-tight">
          Ask anything. Get a fast answer.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">
            Verify what matters.
          </span>
        </h1>

        <p className="text-base md:text-lg text-zinc-400 max-w-2xl leading-relaxed">
          GenChat is a production-quality AI assistant with an optional, independent
          verification layer powered by GenLayer intelligent contracts. Fast conversational
          AI for ordinary queries, decentralized validator consensus for critical decisions.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            href="/chat"
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-xl hover:shadow-amber-500/10 transition-all w-full sm:w-auto"
          >
            <span>Start Chatting</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="#how-it-works"
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-semibold text-sm transition-all w-full sm:w-auto"
          >
            <span>See How Verification Works</span>
          </a>
        </div>

        {/* Visual Workflow Diagram */}
        <div
          id="how-it-works"
          className="w-full pt-16 pb-8 space-y-6 text-left border-t border-zinc-800/80 mt-12"
        >
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100">
              How GenChat Works
            </h2>
            <p className="text-xs text-zinc-400">
              The primary experience is instant and lightweight. GenLayer consensus appears on
              demand when high-stakes decisions require independent verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-semibold text-zinc-200">User Question</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Type general explanations, writing, code, or high-stakes business questions.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-semibold text-zinc-200">Fast AI Answer</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Instant streaming response from Groq using openai/gpt-oss-120b.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-semibold text-zinc-200">⚖️ Verify Option</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Click verify on critical questions. Evidence is deterministically hashed off-chain.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h3 className="text-xs font-semibold text-zinc-200">GenLayer Consensus</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Multiple independent AI validators evaluate criteria and reach consensus on StudioNet.
              </p>
            </div>

            {/* Step 5 */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                5
              </div>
              <h3 className="text-xs font-semibold text-zinc-200">Transparent Result</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Approved, Rejected, or Inconclusive outcome with audit link on GenLayer Explorer.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left pt-6">
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100">⚡ Fast Mode (Default)</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Ultra-low latency streaming conversational AI powered by Groq and openai/gpt-oss-120b.
              No blockchain delays or wallet requirements for day-to-day chats.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 w-fit">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100">🔎 Research Mode</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Live web search retrieval with clear separation between model knowledge, retrieved data,
              and genuine cited sources. No fabricated citations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100">⚖️ Verified Mode</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Off-chain evidence hashing paired with on-chain intelligent contract execution on
              GenLayer StudioNet for transparent, multi-validator AI consensus.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-8 px-4 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-zinc-400">GenChat</span>
            <span>—</span>
            <span>Ask anything. Verify what matters.</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <Link href="/chat" className="hover:text-zinc-200">
              Chat
            </Link>
            <Link href="/verify" className="hover:text-zinc-200">
              Explorer
            </Link>
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-zinc-200"
            >
              <span>GenLayer Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
