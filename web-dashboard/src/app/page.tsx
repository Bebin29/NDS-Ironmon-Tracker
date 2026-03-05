"use client";

import { useState } from "react";
import { useTrackerState } from "@/hooks/useTrackerState";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { PartyPanel } from "@/components/dashboard/PartyPanel";
import { BattleView } from "@/components/dashboard/BattleView";
import { NuzlockeTracker } from "@/components/dashboard/NuzlockeTracker";
import { HealingInventory } from "@/components/dashboard/HealingInventory";
import { TeamWeaknesses } from "@/components/dashboard/TeamWeaknesses";
import { RouteEncounters } from "@/components/dashboard/RouteEncounters";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Graveyard } from "@/components/dashboard/Graveyard";
import { useGraveyard } from "@/hooks/useGraveyard";

export default function Dashboard() {
  const { state, connected } = useTrackerState();
  const [chatOpen, setChatOpen] = useState(true);
  const { deaths, clearGraveyard } = useGraveyard(state);

  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">🎮</div>
          <h1 className="mb-2 text-lg font-bold uppercase tracking-widest text-pine-accent">
            Ironmon Tracker
          </h1>
          <p className="text-sm text-pine-muted">
            Waiting for tracker data...
          </p>
          <p className="mt-2 text-xs text-pine-muted">
            Make sure BizHawk is running with the Ironmon Tracker loaded.
          </p>
          <div className="mt-4">
            <div className="inline-flex items-center gap-2 rounded border border-pine-border bg-pine-surface px-4 py-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-pine-warning" />
              <span className="text-xs text-pine-muted">
                Watching for tracker-state.json...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <ProgressBar
        gameName={state.gameName}
        badges={state.badges}
        timerSeconds={state.timerSeconds}
        location={state.location}
        connected={connected}
        runOver={state.runOver}
        pokecenterCount={state.pokecenterCount}
      />

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-4 p-4 pt-0">
        {/* Left: Battle + Party + Healing */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {state.inBattle && state.enemy && (
            <BattleView
              enemy={state.enemy}
              leadPokemon={state.party.find((p) => p.curHP > 0 && p.maxHP > 0)}
              leadStatStages={state.leadStatStages}
              party={state.party}
            />
          )}
          <PartyPanel
            party={state.party}
            enemy={state.inBattle ? state.enemy : null}
            badgeCount={state.badgeCount}
            gameName={state.gameName}
          />
          <TeamWeaknesses party={state.party} />
          <RouteEncounters
            encounters={state.encounters}
            currentLocation={state.location}
          />
          <HealingInventory items={state.healingItems} />
        </div>

        {/* Right sidebar: Nuzlocke + Chat */}
        <div className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto">
          <NuzlockeTracker state={state} />
          <Graveyard deaths={deaths} onClear={clearGraveyard} />

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="rounded border border-pine-border bg-pine-surface px-3 py-2 text-xs font-bold uppercase tracking-wider text-pine-accent hover:bg-pine-border/50 transition-colors"
          >
            {chatOpen ? "▼ Hide AI Advisor" : "▶ Show AI Advisor"}
          </button>

          {chatOpen && (
            <div className="min-h-[300px] flex-1">
              <ChatPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
