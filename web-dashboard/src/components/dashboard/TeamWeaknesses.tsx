"use client";

import type { PartyPokemon } from "@/lib/types";
import { getDefensiveWeaknesses } from "@/lib/type-effectiveness";
import { TypeBadge } from "@/components/ui/TypeBadge";

export function TeamWeaknesses({ party }: { party: PartyPokemon[] }) {
  const alive = party.filter((p) => p.curHP > 0 && p.maxHP > 0);
  if (alive.length === 0) return null;

  // Count how many alive pokemon are weak to each type
  const weaknessCounts: Record<string, number> = {};
  for (const p of alive) {
    const weaknesses = getDefensiveWeaknesses(p.types);
    for (const w of weaknesses) {
      weaknessCounts[w.type] = (weaknessCounts[w.type] || 0) + 1;
    }
  }

  const sorted = Object.entries(weaknessCounts)
    .sort(([, a], [, b]) => b - a)
    .filter(([, count]) => count >= 2);

  if (sorted.length === 0) return null;

  return (
    <div className="rounded border border-pine-border bg-pine-surface p-3">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-[1.5px] text-pine-warning">
        Team Weaknesses
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map(([type, count]) => (
          <div
            key={type}
            className={`flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] ${
              count >= 3
                ? "bg-pine-danger/20 text-pine-danger"
                : "bg-pine-bg text-pine-muted"
            }`}
          >
            <TypeBadge type={type} />
            <span className="font-bold">({count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
