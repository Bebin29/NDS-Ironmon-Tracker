"use client";

import { BadgeIcon } from "@/components/ui/Badge";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { getLevelCap, getNextGymLeader } from "@/lib/game-data";

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
}: {
  gameName: string;
  badges: number[];
  timerSeconds: number;
  location: string;
  connected: boolean;
  runOver: boolean;
  pokecenterCount: number;
}) {
  const badgeCount = badges.filter((b) => b === 1).length;
  const levelCap = getLevelCap(badgeCount, gameName);
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
      </div>
    </div>
  );
}
