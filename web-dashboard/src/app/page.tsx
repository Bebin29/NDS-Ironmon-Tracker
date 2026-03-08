"use client";

import { useState, useMemo } from "react";
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
import { useEncounterChecklist } from "@/hooks/useEncounterChecklist";
import { getActiveBattlePokemon } from "@/lib/types";
import { TrainerPreview } from "@/components/dashboard/TrainerPreview";
import { useTrainerData } from "@/hooks/useTrainerData";
import { useEvoData } from "@/hooks/useEvoData";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { getDefensiveWeaknesses } from "@/lib/type-effectiveness";

export default function Dashboard() {
  const { state, connected } = useTrackerState();
  const [runResetKey, setRunResetKey] = useState(0);
  const { deaths, clearGraveyard } = useGraveyard(state);
  const { claims, setRouteStatus, removeRouteClaim, clearChecklist, summary: encounterSummary } = useEncounterChecklist(state);
  const { trainers: romTrainers } = useTrainerData(state?.gameName);
  const { evolutions: romEvolutions } = useEvoData(state?.gameName);

  const resetRun = () => {
    clearGraveyard();
    clearChecklist();
    setRunResetKey((k) => k + 1);
  };

  // Summary strings for collapsed sections
  const partySummary = useMemo(() => {
    if (!state) return "";
    const alive = state.party.filter((p) => p.curHP > 0 && p.maxHP > 0 && p.isEgg !== 1);
    const totalHP = alive.reduce((s, p) => s + p.curHP, 0);
    const maxHP = alive.reduce((s, p) => s + p.maxHP, 0);
    return `${alive.length} alive · ${totalHP}/${maxHP} HP`;
  }, [state]);

  const weaknessSummary = useMemo(() => {
    if (!state) return "";
    const alive = state.party.filter((p) => p.curHP > 0 && p.maxHP > 0);
    const counts: Record<string, number> = {};
    for (const p of alive) {
      for (const w of getDefensiveWeaknesses(p.types)) {
        counts[w.type] = (counts[w.type] || 0) + 1;
      }
    }
    const critical = Object.values(counts).filter((c) => c >= 2).length;
    return critical > 0 ? `${critical} shared` : "none";
  }, [state]);

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
        onResetRun={resetRun}
        romTrainers={romTrainers}
      />

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-4 p-4 pt-0">
        {/* Left: Battle + Party + Healing */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {state.inBattle && state.enemy && (() => {
            const enemies = state.enemies && state.enemies.length > 0 ? state.enemies : [state.enemy];
            const isDouble = enemies.length > 1;
            const battleLabel = state.enemy.isWild ? "Wild Battle" : isDouble ? "Double Battle" : "Trainer Battle";
            const summaryText = isDouble
              ? `vs ${enemies.map((e) => `${e.name} Lv.${e.level}`).join(" & ")}`
              : `vs ${state.enemy.name} Lv.${state.enemy.level}`;
            return (
              <CollapsibleSection
                id="battle"
                title={battleLabel}
                variant="danger"
                defaultOpen={true}
                summary={summaryText}
              >
                <BattleView
                  enemies={enemies}
                  leadPokemon={getActiveBattlePokemon(state)}
                  leadStatStages={state.leadStatStages}
                  party={state.party}
                  ballItems={state.ballItems}
                  gen={state.gen}
                />
              </CollapsibleSection>
            );
          })()}
          <CollapsibleSection
            id="party"
            title="Party"
            defaultOpen={!state.inBattle}
            summary={partySummary}
          >
            <PartyPanel
              party={state.party}
              enemy={state.inBattle ? state.enemy : null}
              badgeCount={state.badgeCount}
              gameName={state.gameName}
              romTrainers={romTrainers}
              evolutions={romEvolutions}
            />
          </CollapsibleSection>
          <CollapsibleSection
            id="team-weaknesses"
            title="Team Weaknesses"
            variant="warning"
            defaultOpen={false}
            summary={weaknessSummary}
          >
            <TeamWeaknesses party={state.party} />
          </CollapsibleSection>
          <CollapsibleSection
            id="route-encounters"
            title="Route Encounters"
            defaultOpen={false}
            summary={`${encounterSummary.caught} caught · ${encounterSummary.total} routes`}
          >
            <RouteEncounters
              encounters={state.encounters}
              currentLocation={state.location}
              claims={claims}
              onSetStatus={setRouteStatus}
              onRemoveClaim={removeRouteClaim}
              summary={encounterSummary}
            />
          </CollapsibleSection>
          <CollapsibleSection
            id="healing"
            title="Healing Items"
            defaultOpen={false}
            summary={`${state.healingItems.length} items`}
          >
            <HealingInventory items={state.healingItems} />
          </CollapsibleSection>
        </div>

        {/* Right sidebar: Nuzlocke + Chat */}
        <div className="flex w-80 shrink-0 flex-col gap-2 overflow-y-auto">
          <CollapsibleSection
            id="trainer-preview"
            title="Next Gym Leader"
            defaultOpen={true}
          >
            <TrainerPreview
              badgeCount={state.badgeCount}
              gameName={state.gameName}
              party={state.party}
              romTrainers={romTrainers}
              inBattle={state.inBattle}
            />
          </CollapsibleSection>
          <CollapsibleSection
            id="nuzlocke"
            title="Nuzlocke Status"
            defaultOpen={false}
          >
            <NuzlockeTracker state={state} romTrainers={romTrainers} />
          </CollapsibleSection>
          {deaths.length > 0 && (
            <CollapsibleSection
              id="graveyard"
              title={`Graveyard (${deaths.length})`}
              variant="danger"
              defaultOpen={false}
              summary={`${deaths.length} dead`}
              headerRight={
                <button
                  onClick={clearGraveyard}
                  className="text-[9px] uppercase tracking-wider text-pine-muted hover:text-pine-text transition-colors"
                >
                  Clear
                </button>
              }
            >
              <Graveyard deaths={deaths} onClear={clearGraveyard} />
            </CollapsibleSection>
          )}
          <CollapsibleSection
            id="ai-advisor"
            title="AI Advisor"
            defaultOpen={true}
          >
            <div className="min-h-[300px]">
              <ChatPanel key={runResetKey} deaths={deaths} encounterClaims={claims} />
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
