"use client";

export function LoginScreen({
  error,
  checking,
  onRetry,
}: {
  error: string | null;
  checking: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded border border-pine-border bg-pine-surface p-6 text-center">
      <div className="mb-4 text-3xl">🔒</div>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-pine-accent">
        Claude Login Required
      </h2>
      <p className="mb-4 max-w-xs text-[11px] leading-relaxed text-pine-muted">
        The AI Advisor uses your Claude subscription. You need to authenticate
        via the Claude CLI first.
      </p>

      <div className="mb-4 w-full rounded border border-pine-border bg-pine-bg p-3 text-left">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-pine-dim">
          Run in your terminal:
        </p>
        <code className="block text-[11px] text-pine-accent">
          npx @anthropic-ai/claude-agent-sdk login
        </code>
        <p className="mt-2 text-[10px] text-pine-muted">
          Or if you have Claude Code installed:
        </p>
        <code className="block text-[11px] text-pine-accent">claude login</code>
      </div>

      {error && (
        <div className="mb-3 w-full rounded border border-pine-danger/30 bg-pine-danger/10 p-2 text-[10px] text-pine-danger">
          {error}
        </div>
      )}

      <button
        onClick={onRetry}
        disabled={checking}
        className="rounded bg-pine-accent px-4 py-2 text-[11px] font-bold text-pine-bg transition-colors hover:bg-pine-accent-dim disabled:opacity-50"
      >
        {checking ? "Checking..." : "Check Again"}
      </button>
    </div>
  );
}
