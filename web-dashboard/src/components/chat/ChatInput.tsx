"use client";

import { useState, type FormEvent } from "react";

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void;
  disabled: boolean;
}) {
  const [input, setInput] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask about strategy..."
        disabled={disabled}
        className="flex-1 rounded border border-pine-border bg-pine-bg px-3 py-2 text-[11px] text-pine-text placeholder-pine-muted/50 focus:border-pine-accent focus:outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="rounded bg-pine-accent px-3 py-2 text-[11px] font-bold text-pine-bg transition-colors hover:bg-pine-accent-dim disabled:opacity-50"
      >
        {disabled ? "..." : "►"}
      </button>
    </form>
  );
}
