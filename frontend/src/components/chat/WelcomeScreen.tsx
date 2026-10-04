"use client";

import React from "react";
import { Zap, Search, Scale, Sparkles, ArrowRight } from "lucide-react";
import type { ChatMode } from "./ModeSelector";

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string, mode: ChatMode) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectPrompt }) => {
  const suggestions = [
    {
      title: "Fast AI Conversation",
      desc: "Explain the architectural difference between optimistic rollups and ZK rollups.",
      prompt: "Explain the architectural difference between optimistic rollups and ZK rollups in terms of finality, proof generation, and throughput.",
      mode: "fast" as ChatMode,
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      tag: "⚡ Fast Mode",
    },
    {
      title: "Research with Citations",
      desc: "What are the latest developments in intelligent contracts on GenLayer?",
      prompt: "What are intelligent contracts on GenLayer and how do they enable smart contracts to access the internet and use LLMs?",
      mode: "research" as ChatMode,
      icon: <Search className="w-5 h-5 text-blue-400" />,
      tag: "🔎 Research Mode",
    },
    {
      title: "Verify High-Stakes Decision",
      desc: "Should I release contractor payment for completed milestone 3?",
      prompt: "Should I release milestone payment #3 to the contractor? The contract specifies 99.9% uptime and Swagger documentation, which have both been provided in the attached logs.",
      mode: "verified" as ChatMode,
      icon: <Scale className="w-5 h-5 text-emerald-400" />,
      tag: "⚖️ Verified Mode",
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full text-center">
      {/* Brand Icon */}
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-zinc-950 shadow-xl mb-4">
        <Sparkles className="w-7 h-7" />
      </div>

      {/* Main Title */}
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100 mb-2">
        Ask anything. Get a fast answer. Verify what matters.
      </h1>

      {/* Subtitle */}
      <p className="text-sm text-zinc-400 max-w-xl mb-8 leading-relaxed">
        GenChat pairs fast conversational AI powered by{" "}
        <span className="text-zinc-200 font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-800">
          openai/gpt-oss-120b
        </span>{" "}
        with an on-demand decentralized verification layer on{" "}
        <span className="text-amber-400 font-semibold">GenLayer StudioNet</span>.
      </p>

      {/* Prompt Starter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full text-left">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(item.prompt, item.mode)}
            className="flex flex-col justify-between p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition-all text-zinc-300 group shadow-sm"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/40">
                  {item.icon}
                </div>
                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700/60">
                  {item.tag}
                </span>
              </div>
              <h3 className="text-xs font-semibold text-zinc-100 pt-1">{item.title}</h3>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {item.desc}
              </p>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-medium text-amber-400 pt-3 group-hover:translate-x-1 transition-transform">
              <span>Try prompt</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
