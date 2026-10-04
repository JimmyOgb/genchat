"use client";

import React from "react";
import { Zap, Search, ShieldCheck } from "lucide-react";

export type ChatMode = "fast" | "research" | "verified";

interface ModeSelectorProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
}) => {
  const modes: { id: ChatMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: "fast",
      label: "Fast",
      icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
      desc: "Fast streaming with openai/gpt-oss-120b",
    },
    {
      id: "research",
      label: "Research",
      icon: <Search className="w-3.5 h-3.5 text-blue-400" />,
      desc: "Search retrieval & verified citations",
    },
    {
      id: "verified",
      label: "Verified",
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
      desc: "Structured criteria & GenLayer consensus ready",
    },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl">
      {modes.map((m) => {
        const isActive = currentMode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => onModeChange(m.id)}
            title={m.desc}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};
