"use client";

import { useState, useCallback } from "react";
import type { ChatMessage, GraveyardEntry } from "@/lib/types";
import type { RouteClaimEntry } from "@/hooks/useEncounterChecklist";

export function useChat(model?: string, deaths?: GraveyardEntry[], encounterClaims?: Record<string, RouteClaimEntry>) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: ChatMessage = { role: "user", content };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages,
            ...(model ? { model } : {}),
            ...(deaths && deaths.length > 0 ? { deaths } : {}),
            ...(encounterClaims && Object.keys(encounterClaims).length > 0 ? { encounterClaims } : {}),
          }),
        });

        const data = await res.json();

        if (data.error) {
          setMessages([
            ...updatedMessages,
            { role: "assistant", content: `Error: ${data.error}` },
          ]);
        } else {
          setMessages([
            ...updatedMessages,
            { role: "assistant", content: data.response },
          ]);
        }
      } catch {
        setMessages([
          ...updatedMessages,
          {
            role: "assistant",
            content: "Failed to reach the AI service. Is Claude CLI authenticated?",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, model, deaths, encounterClaims]
  );

  const clearChat = useCallback(() => setMessages([]), []);

  return { messages, loading, sendMessage, clearChat };
}
