"use client";

import { useState } from "react";
import { BadgeIcon } from "@/components/ui/Badge";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { getLevelCap, getNextGymLeader } from "@/lib/game-data";
import type { RomTrainer } from "@/lib/types";

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ProgressBar({
  gameName,
  badges,
  timerSeconds,
  location,
  connected,
  runOver,
  pokecenterCount,
  onResetRun,
  romTrainers,
}: {
  gameName: string;
  badges: number[];
  timerSeconds: number;
  location: string;
  connected: boolean;
  runOver: boolean;
  pokecenterCount: number;
  onResetRun?: () => void;
  romTrainers?: Map<number, RomTrainer>;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const badgeCount = badges.filter((b) => b === 1).length;
  const levelCap = getLevelCap(badgeCount, gameName, romTrainers);
  const nextGym = getNextGymLeader(badgeCount, gameName);

  return (
    <div className="flex items-center justify-between bg-pine-surface px-6 py-3">
      {/* Left: Logo + Game Name */}
      <div className="flex items-center gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold uppercase tracking-[3px] text-pine-accent">
            Ironmon
          </span>
          <span className="text-xs font-medium uppercase tracking-[2px] text-pine-muted">
            Tracker
          </span>
        </div>
        <div className="h-6 w-px bg-pine-border" />
        <span className="text-sm font-semibold text-pine-text">{gameName}</span>
        {runOver && (
          <span className="rounded bg-pine-danger px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Run Over
          </span>
        )}
      </div>

      {/* Center: Badges */}
      <div className="flex items-center gap-2">
        {badges.slice(0, 8).map((earned, i) => (
          <BadgeIcon key={i} index={i} earned={earned === 1} />
        ))}
      </div>

      {/* Right: Location + Level Cap + Timer + Connection */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-pine-text">
          {location || "Unknown"}
        </span>
        <div className="h-6 w-px bg-pine-border" />
        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-pine-muted">
            Lv Cap
          </span>
          <span className="text-sm font-bold text-pine-warning">{levelCap}</span>
        </div>
        <div className="h-6 w-px bg-pine-border" />
        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-pine-muted">Heals</span>
          <span className={`text-sm font-bold ${
            pokecenterCount <= 2 ? "text-pine-danger"
              : pokecenterCount <= 5 ? "text-pine-warning"
              : "text-pine-accent"
          }`}>
            {pokecenterCount}
          </span>
        </div>
        <div className="h-6 w-px bg-pine-border" />
        <span className="text-sm font-medium text-pine-muted">
          {formatTimer(timerSeconds)}
        </span>
        <div className="h-6 w-px bg-pine-border" />
        <ConnectionStatus connected={connected} />
        {onResetRun && (
          <>
            <div className="h-6 w-px bg-pine-border" />
            {confirmReset ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-pine-warning">Reset?</span>
                <button
                  onClick={() => { onResetRun(); setConfirmReset(false); }}
                  className="rounded bg-pine-danger px-2 py-0.5 text-[10px] font-bold uppercase text-white hover:bg-red-500 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="rounded bg-pine-border px-2 py-0.5 text-[10px] font-bold uppercase text-pine-muted hover:text-pine-text transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="rounded border border-pine-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pine-muted hover:border-pine-accent hover:text-pine-accent transition-colors"
              >
                New Run
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
