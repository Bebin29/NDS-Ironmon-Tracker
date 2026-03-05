"use client";

import type { TrackerState } from "@/lib/types";
import {
  checkNuzlockeWarnings,
  getDeadPokemon,
} from "@/lib/nuzlocke-rules";
import { getLevelCap, getNextGymLeader } from "@/lib/platinum-data";
import { useState } from "react";

export function NuzlockeTracker({ state }: { state: TrackerState }) {
  const [soulLinkNotes, setSoulLinkNotes] = useState("");
  const warnings = checkNuzlockeWarnings(state);
  const dead = getDeadPokemon(state);
  const badgeCount = state.badges.filter((b) => b === 1).length;
  const levelCap = getLevelCap(badgeCount);
  const nextGym = getNextGymLeader(badgeCount);

  return (
    <div className="space-y-4">
      {/* Nuzlocke Status Card */}
      <div className="rounded border border-pine-border bg-pine-surface p-3 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-[1.5px] text-pine-accent">
          Nuzlocke Status
        </h2>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase text-pine-dim">Level Cap:</span>
          <span className="text-sm font-bold text-pine-text">{levelCap}</span>
          <span className="text-[10px] text-pine-muted">({nextGym.name})</span>
        </div>

        <div className="h-px bg-pine-border" />

        {/* Warnings */}
        {warnings.length > 0 ? (
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pine-warning">
              Warnings
            </span>
            {warnings.map((w, i) => (
              <div
                key={i}
                className={`text-[10px] ${
                  w.type === "dead"
                    ? "text-pine-danger"
                    : "text-pine-warning"
                }`}
              >
                • {w.message}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-pine-accent">
            All clear — no warnings.
          </div>
        )}

        {/* Dead Pokemon */}
        {dead.length > 0 && (
          <>
            <div className="h-px bg-pine-border" />
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pine-danger">
                Fallen Pokemon
              </span>
              {dead.map((p) => (
                <div key={p.slot} className="text-[10px] text-pine-danger-dim">
                  • {p.nickname || p.name} (Lv.{p.level})
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Soul Link Notes */}
      <div className="rounded border border-pine-border bg-pine-surface p-3 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-[1.5px] text-pine-accent">
          Soul Link Notes
        </h2>
        <p className="text-[10px] text-pine-muted">
          Track your partner&apos;s linked Pokemon:
        </p>
        <textarea
          value={soulLinkNotes}
          onChange={(e) => setSoulLinkNotes(e.target.value)}
          placeholder={"Infernape ↔ Empoleon\nLuxray ↔ Staraptor"}
          className="w-full resize-y rounded border border-pine-border bg-pine-bg p-2 text-[10px] leading-relaxed text-pine-secondary placeholder-pine-muted/50 focus:border-pine-accent focus:outline-none"
          rows={4}
        />
      </div>
    </div>
  );
}
