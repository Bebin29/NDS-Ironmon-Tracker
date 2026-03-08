"use client";

import { useMemo, useState, useCallback } from "react";
import type { PartyPokemon, RomTrainer } from "@/lib/types";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { getAttackMultiplier } from "@/lib/type-effectiveness";
import { getLevelCap } from "@/lib/game-data";
import {
  getUpcomingTrainers,
  type ImportantTrainer,
  type TrainerPokemon,
} from "@/lib/trainer-data";

// ── Danger Analysis ──────────────────────────────────────────────────────

interface DangerInfo {
  canHitSuperEffective: boolean;
  weakToTeam: string[];
  threatsTeam: string[];
}

function analyzeDanger(
  trainerMon: TrainerPokemon,
  party: PartyPokemon[],
): DangerInfo {
  const alive = party.filter((p) => p.curHP > 0 && p.maxHP > 0 && p.isEgg !== 1);

  const weakToTeam: string[] = [];
  const seenMoveTypes = new Set<string>();
  for (const p of alive) {
    for (const m of p.moves) {
      if (m.id <= 0) continue;
      const mt = m.type.toUpperCase();
      if (seenMoveTypes.has(mt)) continue;
      seenMoveTypes.add(mt);
      const mult = getAttackMultiplier(mt, trainerMon.types);
      if (mult > 1 && !weakToTeam.includes(mt)) {
        weakToTeam.push(mt);
      }
    }
  }

  const threatsTeam: string[] = [];
  for (const enemyType of trainerMon.types) {
    const et = enemyType.toUpperCase();
    let threatCount = 0;
    for (const p of alive) {
      const mult = getAttackMultiplier(et, p.types);
      if (mult > 1) threatCount++;
    }
    if (threatCount >= 2) {
      threatsTeam.push(et);
    }
  }

  return {
    canHitSuperEffective: weakToTeam.length > 0,
    weakToTeam,
    threatsTeam,
  };
}

// ── ROM data → TrainerPokemon adapter ───────────────────────────────────

function mergeTrainerData(
  hardcoded: ImportantTrainer,
  romTrainers: Map<number, RomTrainer>,
): ImportantTrainer {
  let romTrainer: RomTrainer | undefined;

  for (const rt of romTrainers.values()) {
    if (rt.badgeNumber === hardcoded.badge && rt.trainerType === 2) {
      romTrainer = rt;
      break;
    }
    if (rt.name === hardcoded.name && rt.groupName) {
      romTrainer = rt;
      break;
    }
  }

  if (!romTrainer) return hardcoded;

  const romTeam: TrainerPokemon[] = romTrainer.pokemon.map((mon) => ({
    name: mon.name,
    pokemonID: mon.speciesID,
    level: mon.level,
    types: mon.types,
    moves: mon.moves.filter((m) => m.id > 0).map((m) => m.name),
    ability: mon.ability || undefined,
    item: mon.heldItemName !== "None" ? mon.heldItemName : undefined,
  }));

  return {
    ...hardcoded,
    team: romTeam.length > 0 ? romTeam : hardcoded.team,
  };
}

// ── Rare Candy Button ───────────────────────────────────────────────────

function RareCandyButton({
  candiesNeeded,
  inBattle,
}: {
  candiesNeeded: number;
  inBattle: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleClick = useCallback(async () => {
    if (candiesNeeded <= 0 || inBattle) return;
    setStatus("sending");
    setMessage("");

    try {
      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "addRareCandy", count: candiesNeeded }),
      });
      const data = await res.json() as { success: boolean; message: string };
      if (data.success) {
        setStatus("success");
        setMessage(data.message);
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setMessage(data.message);
        setTimeout(() => setStatus("idle"), 4000);
      }
    } catch {
      setStatus("error");
      setMessage("Failed to send command");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }, [candiesNeeded, inBattle]);

  if (candiesNeeded <= 0) return null;

  const disabled = inBattle || status === "sending";

  return (
    <div className="mt-2">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`flex w-full items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
          status === "success"
            ? "border-green-600/50 bg-green-900/30 text-green-400"
            : status === "error"
              ? "border-red-600/50 bg-red-900/30 text-red-400"
              : disabled
                ? "border-pine-border/30 bg-pine-surface/50 text-pine-muted cursor-not-allowed"
                : "border-pine-accent/40 bg-pine-accent/10 text-pine-accent hover:bg-pine-accent/20"
        }`}
      >
        {status === "sending" ? (
          "Adding..."
        ) : status === "success" ? (
          message
        ) : status === "error" ? (
          message
        ) : (
          <>
            <span>Add {candiesNeeded} Rare {candiesNeeded === 1 ? "Candy" : "Candies"}</span>
            <span className="text-[8px] font-normal text-pine-muted">(to level cap)</span>
          </>
        )}
      </button>
      {inBattle && status === "idle" && (
        <p className="mt-1 text-center text-[8px] text-pine-muted">
          Cannot modify bag during battle
        </p>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function TrainerPokemonCard({
  mon,
  danger,
  isAce,
}: {
  mon: TrainerPokemon;
  danger: DangerInfo;
  isAce: boolean;
}) {
  return (
    <div
      className={`rounded border px-2 py-1.5 ${
        isAce
          ? "border-pine-warning/40 bg-pine-warning/5"
          : "border-pine-border/50 bg-pine-bg/50"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <PokemonSprite pokemonID={mon.pokemonID} size={28} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-pine-text truncate">
              {mon.name}
            </span>
            <span className="text-[9px] text-pine-muted">Lv.{mon.level}</span>
            {isAce && (
              <span className="rounded-sm bg-pine-warning/80 px-1 py-px text-[8px] font-bold text-white">
                ACE
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {mon.types.filter(Boolean).map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
            {mon.ability && (
              <span className="ml-1 text-[8px] text-pine-muted">{mon.ability}</span>
            )}
            {mon.item && (
              <span className="ml-1 rounded-sm bg-yellow-600/20 px-1 py-px text-[8px] text-yellow-500">
                {mon.item}
              </span>
            )}
          </div>
        </div>

        {/* Danger indicators */}
        <div className="flex flex-col items-end gap-0.5">
          {!danger.canHitSuperEffective && (
            <span className="rounded-sm bg-red-800/80 px-1 py-px text-[8px] font-bold text-white">
              NO SE
            </span>
          )}
          {danger.threatsTeam.length > 0 && (
            <span className="rounded-sm bg-orange-600/80 px-1 py-px text-[8px] font-bold text-white">
              DANGER
            </span>
          )}
        </div>
      </div>

      {/* Moves */}
      {mon.moves.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5 pl-8">
          {mon.moves.map((moveName) => (
            <span
              key={moveName}
              className="rounded-sm bg-pine-surface px-1 py-px text-[8px] text-pine-muted"
            >
              {moveName}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TrainerCard({
  trainer,
  party,
  expanded,
  onToggle,
}: {
  trainer: ImportantTrainer;
  party: PartyPokemon[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const dangers = useMemo(
    () => trainer.team.map((mon) => analyzeDanger(mon, party)),
    [trainer, party],
  );

  const uncoveredCount = dangers.filter((d) => !d.canHitSuperEffective).length;
  const dangerCount = dangers.filter((d) => d.threatsTeam.length > 0).length;
  const aceIndex = trainer.team.length - 1;

  const roleLabel =
    trainer.role === "gym"
      ? `Gym ${trainer.badge}`
      : trainer.role === "elite4"
        ? "Elite 4"
        : "Champion";

  return (
    <div className="rounded border border-pine-border/50 bg-pine-surface">
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-pine-border/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-pine-muted">
              {roleLabel}
            </span>
            <span className="text-[11px] font-bold text-pine-text">
              {trainer.name}
            </span>
            <TypeBadge type={trainer.type} />
          </div>
          <div className="flex items-center gap-2 text-[9px] text-pine-muted">
            <span>{trainer.location}</span>
            <span>{trainer.team.length} Pokemon</span>
            <span>Ace: Lv.{trainer.team[aceIndex].level}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {uncoveredCount > 0 && (
            <span className="rounded-sm bg-red-800/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {uncoveredCount} no SE
            </span>
          )}
          {dangerCount > 0 && (
            <span className="rounded-sm bg-orange-600/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {dangerCount} threats
            </span>
          )}
          {uncoveredCount === 0 && dangerCount === 0 && (
            <span className="rounded-sm bg-green-700/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
              Covered
            </span>
          )}
          <span className="text-[10px] text-pine-muted">
            {expanded ? "\u25B2" : "\u25BC"}
          </span>
        </div>
      </button>

      {/* Expanded team details */}
      {expanded && (
        <div className="border-t border-pine-border/30 px-3 py-2 space-y-1.5">
          {/* Tips */}
          {trainer.tips && trainer.tips.length > 0 && (
            <div className="rounded bg-pine-accent/10 px-2 py-1 space-y-0.5">
              {trainer.tips.map((tip, i) => (
                <div key={i} className="text-[9px] text-pine-accent">
                  {tip}
                </div>
              ))}
            </div>
          )}

          {/* Team */}
          {trainer.team.map((mon, i) => (
            <TrainerPokemonCard
              key={`${mon.name}-${i}`}
              mon={mon}
              danger={dangers[i]}
              isAce={i === aceIndex}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export function TrainerPreview({
  badgeCount,
  gameName,
  party,
  romTrainers,
  inBattle,
}: {
  badgeCount: number;
  gameName: string;
  party: PartyPokemon[];
  romTrainers?: Map<number, RomTrainer>;
  inBattle?: boolean;
}) {
  const upcoming = useMemo(() => {
    const hardcoded = getUpcomingTrainers(badgeCount, gameName);
    if (!romTrainers || romTrainers.size === 0) return hardcoded;

    return hardcoded.map((t) => mergeTrainerData(t, romTrainers));
  }, [badgeCount, gameName, romTrainers]);

  // For gym leaders, auto-expand the first one. For E4, collapse all.
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    upcoming.length === 1 ? 0 : null,
  );

  // Calculate Rare Candies needed: sum of (levelCap - level) for all alive party members below cap
  const levelCap = getLevelCap(badgeCount, gameName, romTrainers);
  const candiesNeeded = useMemo(() => {
    const alive = party.filter((p) => p.curHP > 0 && p.maxHP > 0 && p.isEgg !== 1);
    let total = 0;
    for (const p of alive) {
      if (p.level < levelCap) {
        total += levelCap - p.level;
      }
    }
    return total;
  }, [party, levelCap]);

  if (upcoming.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {romTrainers && romTrainers.size > 0 && (
          <span className="rounded-sm bg-pine-accent/20 px-1 py-px text-[8px] text-pine-accent">
            ROM
          </span>
        )}
        <span className="ml-auto text-[9px] text-pine-muted">
          Cap: Lv.{levelCap}
        </span>
      </div>
      <div className="space-y-1.5">
        {upcoming.map((trainer, i) => (
          <TrainerCard
            key={`${trainer.name}-${i}`}
            trainer={trainer}
            party={party}
            expanded={expandedIndex === i}
            onToggle={() =>
              setExpandedIndex(expandedIndex === i ? null : i)
            }
          />
        ))}
      </div>

      <RareCandyButton
        candiesNeeded={candiesNeeded}
        inBattle={inBattle ?? false}
      />
    </div>
  );
}
