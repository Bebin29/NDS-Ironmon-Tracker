"use client";

import ReactMarkdown from "react-markdown";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded px-3 py-2 ${
          isUser
            ? "bg-pine-border"
            : "border border-pine-border bg-pine-bg"
        }`}
      >
        <div className="mb-1 text-[8px] font-bold uppercase tracking-wider text-pine-muted">
          {isUser ? "You" : "Advisor"}
        </div>
        {isUser ? (
          <div className="text-[11px] leading-relaxed text-pine-secondary">
            {message.content}
          </div>
        ) : (
          <div className="prose-pine text-[11px] leading-relaxed text-pine-secondary">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                strong: ({ children }) => (
                  <strong className="font-bold text-pine-text">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-pine-accent">{children}</em>
                ),
                ul: ({ children }) => (
                  <ul className="mb-1.5 ml-3 list-disc space-y-0.5 last:mb-0">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-1.5 ml-3 list-decimal space-y-0.5 last:mb-0">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-pine-secondary">{children}</li>
                ),
                code: ({ children }) => (
                  <code className="rounded-sm bg-pine-surface px-1 py-px text-[10px] text-pine-accent">
                    {children}
                  </code>
                ),
                h1: ({ children }) => (
                  <div className="mb-1 mt-2 text-xs font-bold text-pine-accent">{children}</div>
                ),
                h2: ({ children }) => (
                  <div className="mb-1 mt-2 text-xs font-bold text-pine-accent">{children}</div>
                ),
                h3: ({ children }) => (
                  <div className="mb-1 mt-1.5 text-[11px] font-bold text-pine-text">{children}</div>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
