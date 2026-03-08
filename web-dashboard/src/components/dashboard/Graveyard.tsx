"use client";

import type { GraveyardEntry } from "@/lib/types";

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function Graveyard({
  deaths,
  onClear,
}: {
  deaths: GraveyardEntry[];
  onClear: () => void;
}) {
  if (deaths.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {deaths.map((entry) => (
        <div
          key={entry.pid}
          className="flex items-start gap-2 text-[10px]"
        >
          <span className="text-pine-danger">&#x1F480;</span>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-pine-text">
              {entry.nickname && entry.nickname !== entry.name
                ? `${entry.nickname} (${entry.name})`
                : entry.name}
            </div>
            <div className="text-pine-muted">
              Lv.{entry.level} &middot; {entry.location} &middot;{" "}
              {timeAgo(entry.timestamp)}
            </div>
            {entry.killedBy && (
              <div className="text-pine-danger/70">
                vs {entry.wasWildEncounter ? "Wild " : ""}{entry.killedBy} Lv.{entry.killedByLevel}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
