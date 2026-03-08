"use client";

import { useMemo } from "react";
import type { EnemyPokemon, BallItem } from "@/lib/types";
import { calculateCatchRates, type CatchRateResult } from "@/lib/catch-rate-calc";

function getCatchColor(percent: number): string {
  if (percent >= 80) return "text-green-400";
  if (percent >= 50) return "text-yellow-400";
  if (percent >= 25) return "text-orange-400";
  return "text-red-400";
}

function getCatchBg(percent: number): string {
  if (percent >= 80) return "bg-green-500";
  if (percent >= 50) return "bg-yellow-500";
  if (percent >= 25) return "bg-orange-500";
  return "bg-red-500";
}

function CatchRow({ result }: { result: CatchRateResult }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className="text-[10px] font-bold text-pine-text truncate">
          {result.ballName}
        </span>
        <span className="text-[8px] text-pine-muted">x{result.quantity}</span>
        {result.condition && (
          <span className="rounded-sm bg-pine-surface px-1 py-px text-[7px] text-pine-muted">
            {result.condition}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <div className="h-1 w-12 overflow-hidden rounded-full bg-pine-border/30">
          <div
            className={`h-full rounded-full ${getCatchBg(result.catchPercent)} transition-all`}
            style={{ width: `${Math.min(100, result.catchPercent)}%` }}
          />
        </div>
        <span className={`w-10 text-right text-[10px] font-bold ${getCatchColor(result.catchPercent)}`}>
          {result.catchPercent >= 100 ? "100%" : `${result.catchPercent}%`}
        </span>
      </div>
    </div>
  );
}

export function CatchRateDisplay({
  enemy,
  balls,
  gen,
}: {
  enemy: EnemyPokemon;
  balls: BallItem[];
  gen: number;
}) {
  const results = useMemo(
    () => calculateCatchRates(enemy, balls, gen),
    [enemy, balls, gen],
  );

  if (results.length === 0) return null;

  return (
    <div className="rounded border border-pine-border/50 bg-pine-surface px-2.5 py-2">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wider text-pine-accent">
          Catch Rate
        </span>
        <span className="text-[8px] text-pine-muted">
          Base: {enemy.catchRate}
        </span>
      </div>
      <div className="space-y-0.5">
        {results.map((r) => (
          <CatchRow key={`${r.ballId}-${r.condition ?? ""}`} result={r} />
        ))}
      </div>
    </div>
  );
}
