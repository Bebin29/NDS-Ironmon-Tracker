"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { useModels } from "@/hooks/useModels";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ChatSettings } from "./ChatSettings";
import { LoginScreen } from "./LoginScreen";

import type { GraveyardEntry } from "@/lib/types";
import type { RouteClaimEntry } from "@/hooks/useEncounterChecklist";

export function ChatPanel({ deaths, encounterClaims }: { deaths?: GraveyardEntry[]; encounterClaims?: Record<string, RouteClaimEntry> }) {
  const auth = useAuth();
  const { models } = useModels(auth.authenticated);
  const [selectedModel, setSelectedModel] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const { messages, loading, sendMessage, clearChat } = useChat(
    selectedModel || undefined,
    deaths,
    encounterClaims,
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  // Set default model when models load
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      // Prefer sonnet for speed/cost balance
      const sonnet = models.find((m) => m.value?.includes("sonnet"));
      setSelectedModel(sonnet?.value ?? models[0]?.value ?? "");
    }
  }, [models, selectedModel]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Show login screen if not authenticated
  if (!auth.checking && !auth.authenticated) {
    return (
      <LoginScreen
        error={auth.error}
        checking={auth.checking}
        onRetry={auth.retry}
      />
    );
  }

  return (
    <div className="flex h-full flex-col rounded border border-pine-border bg-pine-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-pine-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[1.5px] text-pine-accent">
            AI Advisor
          </span>
          <span className="rounded-sm bg-pine-border px-1.5 py-px text-[8px] font-bold uppercase text-pine-muted">
            Beta
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-[10px] uppercase tracking-wider text-pine-muted hover:text-pine-text transition-colors"
            title="Settings"
          >
            {showSettings ? "▲" : "⚙"}
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-[10px] uppercase tracking-wider text-pine-muted hover:text-pine-text transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Settings panel (collapsible) */}
      {showSettings && (
        <ChatSettings
          models={models}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          email={auth.email}
          plan={auth.plan}
        />
      )}

      {/* Auth loading state */}
      {auth.checking && (
        <div className="flex flex-1 items-center justify-center">
          <span className="animate-pulse text-[10px] text-pine-muted">
            Checking authentication...
          </span>
        </div>
      )}

      {/* Messages */}
      {!auth.checking && (
        <>
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="py-8 text-center text-[10px] text-pine-muted">
                Ask me anything about your run!
                <br />
                <span className="text-pine-muted/60">
                  e.g. &quot;What moves should I teach my starter?&quot;
                </span>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="animate-pulse rounded border border-pine-border bg-pine-bg px-3 py-2 text-[10px] text-pine-muted">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-pine-border p-3">
            <ChatInput onSend={sendMessage} disabled={loading} />
          </div>
        </>
      )}
    </div>
  );
}
