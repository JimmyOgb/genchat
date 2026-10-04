"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-invert max-w-none text-zinc-200 text-sm leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !String(children).includes("\n");

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-amber-300 font-mono text-xs"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock
                language={match ? match[1] : ""}
                value={String(children).replace(/\n$/, "")}
              />
            );
          },
          table({ children }: any) {
            return (
              <div className="my-4 overflow-x-auto rounded-lg border border-zinc-800">
                <table className="min-w-full divide-y divide-zinc-800 text-left text-xs">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }: any) {
            return (
              <th className="px-3 py-2 bg-zinc-900 font-semibold text-zinc-300">
                {children}
              </th>
            );
          },
          td({ children }: any) {
            return (
              <td className="px-3 py-2 border-t border-zinc-800/60 text-zinc-300">
                {children}
              </td>
            );
          },
          a({ href, children }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 underline underline-offset-4"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }: any) {
            return (
              <blockquote className="border-l-4 border-amber-500/80 pl-4 py-1 my-3 bg-zinc-900/40 rounded-r-lg text-zinc-300 italic">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
