"use client";

import type { ModelInfo } from "@/hooks/useModels";

export function ChatSettings({
  models,
  selectedModel,
  onSelectModel,
  email,
  plan,
}: {
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
  email: string | null;
  plan: string | null;
}) {
  return (
    <div className="space-y-2 border-b border-pine-border px-3 py-2">
      {/* Account info */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-pine-muted">
          {email ?? "Unknown"}
        </span>
        {plan && (
          <span className="rounded-sm bg-pine-accent/20 px-1.5 py-px text-[8px] font-bold uppercase text-pine-accent">
            {plan}
          </span>
        )}
      </div>

      {/* Model selector */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="model-select"
          className="text-[10px] uppercase tracking-wider text-pine-muted"
        >
          Model:
        </label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => onSelectModel(e.target.value)}
          className="flex-1 rounded border border-pine-border bg-pine-bg px-2 py-1 text-[10px] text-pine-text focus:border-pine-accent focus:outline-none"
        >
          {models.length > 0 ? (
            models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.displayName} {m.description ? `— ${m.description}` : ""}
              </option>
            ))
          ) : (
            <option key="loading" value="">Loading models...</option>
          )}
        </select>
      </div>
    </div>
  );
}
