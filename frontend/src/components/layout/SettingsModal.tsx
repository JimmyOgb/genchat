"use client";

import React, { useState } from "react";
import { X, Moon, Sun, Cpu, Shield, Lock } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  if (!isOpen) return null;

  const toggleTheme = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    if (newTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-6 text-zinc-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold tracking-tight text-zinc-100">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Appearance */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">Appearance</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => toggleTheme("dark")}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                theme === "dark"
                  ? "bg-zinc-900 border-amber-500/60 text-amber-300"
                  : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Dark Theme</span>
            </button>
            <button
              type="button"
              onClick={() => toggleTheme("light")}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                theme === "light"
                  ? "bg-zinc-100 text-zinc-900 border-amber-500 font-semibold"
                  : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Light Theme</span>
            </button>
          </div>
        </div>

        {/* AI Model Information */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>AI Architecture & Model</span>
          </label>
          <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs space-y-1 text-zinc-400">
            <div className="flex justify-between">
              <span>Primary Provider:</span>
              <span className="font-semibold text-zinc-200">Groq Cloud (Server-Side)</span>
            </div>
            <div className="flex justify-between">
              <span>Model ID:</span>
              <span className="font-mono text-amber-300">openai/gpt-oss-120b</span>
            </div>
            <div className="flex justify-between">
              <span>Streaming:</span>
              <span className="text-emerald-400 font-medium">Enabled (Direct SSE)</span>
            </div>
          </div>
        </div>

        {/* GenLayer Network Information */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Decentralized Consensus Layer</span>
          </label>
          <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs space-y-1 text-zinc-400">
            <div className="flex justify-between">
              <span>Network:</span>
              <span className="font-semibold text-zinc-200">GenLayer StudioNet</span>
            </div>
            <div className="flex justify-between">
              <span>Chain ID:</span>
              <span className="font-mono text-zinc-200">61999 (0xF22F)</span>
            </div>
            <div className="flex justify-between">
              <span>Gas Policy:</span>
              <span className="text-emerald-400 font-medium">Gasless Execution</span>
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-zinc-400" />
            <span>Data & Privacy Policy</span>
          </label>
          <p className="text-[11px] text-zinc-400 leading-relaxed p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
            Raw uploaded documents and sensitive personal credentials are never published to public blockchain state. Only deterministic cryptographic hashes (SHA-256) and verified criteria summaries are submitted to GenLayer intelligent contracts for independent validator verification.
          </p>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
