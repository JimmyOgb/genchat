"use client";

import React, { useState } from "react";
import { X, Lock, Mail, Loader2, Sparkles, Info } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isRemoteAuthConfigured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRemoteAuthConfigured) {
        const supabase = createClient();

        if (isSignUp) {
          const { data, error: signUpErr } = await supabase.auth.signUp({
            email,
            password,
          });
          if (signUpErr) throw signUpErr;
          if (data.user?.email) {
            onSuccess(data.user.email);
            onClose();
          }
        } else {
          const { data, error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInErr) throw signInErr;
          if (data.user?.email) {
            onSuccess(data.user.email);
            onClose();
          }
        }
      } else {
        // Local offline / development authentication
        if (!email.includes("@")) {
          throw new Error("Please enter a valid email address.");
        }
        if (password.length < 4) {
          throw new Error("Password must be at least 4 characters.");
        }

        // Store in localStorage for session persistence across page reloads
        try {
          localStorage.setItem("genchat_local_user", JSON.stringify({ email }));
        } catch {
          // ignore localStorage error
        }

        onSuccess(email);
        onClose();
      }
    } catch (err: any) {
      console.error("[AuthModal error]:", err.message || err);
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-5 text-zinc-200">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-zinc-100">
                {isSignUp ? "Create GenChat Account" : "Sign In to GenChat"}
              </h2>
              <span className="text-[10px] text-zinc-400 block font-medium">
                {isRemoteAuthConfigured ? "Supabase Cloud authentication" : "Local development session mode"}
              </span>
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

        {!isRemoteAuthConfigured && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Local session mode. Sign in with any email and password. No wallet required.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-start gap-2">
            <p className="text-[11px] leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="w-3.5 h-3.5 absolute left-3 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">Password</label>
            <div className="relative flex items-center">
              <Lock className="w-3.5 h-3.5 absolute left-3 text-zinc-500" />
              <input
                type="password"
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSignUp ? "Create Account" : "Sign In"}</span>
          </button>
        </form>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs text-amber-400 hover:underline"
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};
