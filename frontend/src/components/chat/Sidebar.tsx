"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Plus,
  Search,
  Settings,
  User,
  PanelLeftClose,
  Trash2,
  Scale,
  Sparkles,
  LogOut,
} from "lucide-react";
import Link from "next/link";

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  mode: "fast" | "research" | "verified";
}

interface SidebarProps {
  conversations: ConversationSummary[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  userEmail?: string | null;
  onSignOut?: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onOpenSettings,
  onOpenAuth,
  userEmail,
  onSignOut,
  isOpen,
  onToggleOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col w-72 bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 overflow-hidden"
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-3 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-bold text-zinc-950 text-xs shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-zinc-100 flex items-center gap-1">
                GenChat
                <span className="text-[10px] px-1 py-0.2 bg-amber-500/20 text-amber-400 rounded font-normal">
                  v1.0
                </span>
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onToggleOpen}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-sidebar-hover transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={onNewChat}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm text-xs font-semibold transition-all group"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400 group-hover:rotate-90 transition-transform" />
              New Chat
            </span>
            <span className="text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              Ctrl+K
            </span>
          </button>
        </div>

        {/* Search Conversations */}
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        {/* Conversation History List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          <div className="px-2 pt-2 pb-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Conversations
          </div>

          {filteredConversations.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-zinc-500">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = activeConversationId === c.id;
              return (
                <div
                  key={c.id}
                  className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    isActive
                      ? "bg-zinc-800 text-zinc-100 font-medium"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-sidebar-hover"
                  }`}
                  onClick={() => onSelectConversation(c.id)}
                >
                  <div className="flex items-center gap-2 truncate flex-1 pr-2">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{c.title}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition-opacity"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Verifications Quick Link */}
        <div className="p-3 border-t border-sidebar-border">
          <Link
            href="/verify"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-300 text-xs font-medium transition-colors"
          >
            <Scale className="w-4 h-4 text-amber-400" />
            <span>GenLayer Ledger</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 font-mono">
              Live
            </span>
          </Link>
        </div>

        {/* User Profile & Settings */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:bg-sidebar-hover transition-colors text-left"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            <span>Settings</span>
          </button>

          {userEmail ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-xs text-zinc-300">
              <div className="flex items-center gap-2 truncate">
                <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate font-mono text-[11px]">{userEmail}</span>
              </div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
