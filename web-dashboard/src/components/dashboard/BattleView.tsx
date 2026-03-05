"use client";

import type { EnemyPokemon, PartyPokemon, StatStages } from "@/lib/types";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { HPBar } from "@/components/ui/HPBar";
import { StatBar } from "@/components/ui/StatBar";
import {
  getDefensiveWeaknesses,
  getDefensiveResistances,
  getDefensiveImmunities,
  getAttackMultiplier,
  isSTAB,
} from "@/lib/type-effectiveness";
import { calculateMoveMatchup, getStatStageMult, type KOChance, type DamageOptions } from "@/lib/damage-calc";
import { getAbilityShortDesc } from "@/lib/ability-effects";
import { getItemShortDesc } from "@/lib/item-effects";
import { STATUS_NAMES } from "@/lib/types";
import { analyzeSwitchins, type SwitchinScore } from "@/lib/switchin-calc";

const PRIORITY_MOVES: Record<number, number> = {
  98: 1,    // Quick Attack
  245: 2,   // ExtremeSpeed
  183: 1,   // Mach Punch
  418: 1,   // Bullet Punch
  420: 1,   // Ice Shard
  453: 1,   // Aqua Jet
  425: 1,   // Shadow Sneak
  389: 1,   // Sucker Punch
  252: 3,   // Fake Out
  410: 1,   // Vacuum Wave
  68: -5,   // Counter
  243: -5,  // Mirror Coat
};

function EffectivenessTag({ multiplier }: { multiplier: number }) {
  if (multiplier === 1) return null;
  const label = multiplier === 0 ? "0x" : multiplier < 1 ? `${multiplier}x` : `${multiplier}x`;
  const color =
    multiplier === 0
      ? "bg-pine-text text-pine-bg"
      : multiplier > 1
        ? "bg-green-700/80 text-white"
        : "bg-red-800/80 text-white";
  return (
    <span className={`${color} ml-auto rounded-sm px-1 py-px text-[9px] font-bold`}>
      {label}
    </span>
  );
}

const KO_COLORS: Record<string, string> = {
  OHKO: "bg-green-700/80 text-white",
  "2HKO": "bg-yellow-600/80 text-white",
  "3HKO": "bg-orange-600/80 text-white",
  "4HKO+": "bg-pine-text/20 text-pine-muted",
};

function KOTag({ ko }: { ko: KOChance }) {
  if (!ko) return null;
  return (
    <span className={`${KO_COLORS[ko]} rounded-sm px-1 py-px text-[9px] font-bold`}>
      {ko}
    </span>
  );
}

function DamageRange({ min, max }: { min: number; max: number }) {
  if (min === 0 && max === 0) return null;
  const label = min === max ? `${min}` : `${min}-${max}`;
  return <span className="font-mono text-[9px] text-pine-muted">{label}</span>;
}

function PriorityTag({ moveId }: { moveId: number }) {
  const pri = PRIORITY_MOVES[moveId];
  if (pri === undefined) return null;
  const color = pri > 0 ? "bg-cyan-700/80 text-white" : "bg-orange-700/80 text-white";
  return (
    <span className={`${color} rounded-sm px-1 py-px text-[9px] font-bold`}>
      {pri > 0 ? `+${pri}` : `${pri}`}
    </span>
  );
}

function CritRange({ damage }: { damage: { critMin?: number; critMax?: number; critMinPercent?: number; critMaxPercent?: number; max: number } }) {
  if (!damage.critMax || damage.critMax === damage.max) return null;
  const label = damage.critMin === damage.critMax ? `${damage.critMin}` : `${damage.critMin}-${damage.critMax}`;
  return (
    <span className="text-[9px] text-yellow-500">
      crit: {label} ({damage.critMinPercent}-{damage.critMaxPercent}%)
    </span>
  );
}

function StatusTag({ status }: { status?: number }) {
  if (!status || status === 0) return null;
  const name = STATUS_NAMES[status] || "???";
  const colors: Record<number, string> = {
    1: "bg-purple-700/80", // PSN
    2: "bg-red-700/80",    // BRN
    3: "bg-cyan-700/80",   // FRZ
    4: "bg-yellow-600/80", // PAR
    5: "bg-gray-600/80",   // SLP
    6: "bg-purple-900/80", // TOX
  };
  return (
    <span className={`${colors[status] || "bg-pine-text/20"} rounded-sm px-1 py-px text-[9px] font-bold text-white`}>
      {name}
    </span>
  );
}

function SpeedIndicator({
  own, enemy, ownStatus, ownSpeStage, enemySpeStage,
}: {
  own: number; enemy: number; ownStatus: number;
  ownSpeStage?: number; enemySpeStage?: number;
}) {
  // Apply stat stage multipliers (raw 0-12, 6=neutral)
  let effectiveOwn = ownSpeStage !== undefined
    ? Math.floor(own * getStatStageMult(ownSpeStage))
    : own;
  let effectiveEnemy = enemySpeStage !== undefined
    ? Math.floor(enemy * getStatStageMult(enemySpeStage))
    : enemy;
  // Gen 4: Paralysis quarters speed
  if (ownStatus === 4) effectiveOwn = Math.floor(effectiveOwn / 4);
  const diff = effectiveOwn - effectiveEnemy;
  const label = diff > 0 ? "FASTER" : diff < 0 ? "SLOWER" : "SPEED TIE";
  const color = diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-yellow-400";
  const arrow = diff > 0 ? "\u25B2" : diff < 0 ? "\u25BC" : "\u25C6";
  const ownLabel = effectiveOwn !== own ? `${effectiveOwn}` : `${own}`;
  const enemyLabel = effectiveEnemy !== enemy ? `${effectiveEnemy}` : `${enemy}`;
  return (
    <div className={`flex items-center gap-1 text-[10px] font-bold ${color}`}>
      <span>{arrow}</span>
      <span>{label}</span>
      <span className="font-normal text-pine-muted">
        ({ownLabel}{ownStatus === 4 ? "*" : ""} vs {enemyLabel})
      </span>
    </div>
  );
}

function StatStageIndicator({ stages, label }: { stages?: StatStages; label?: string }) {
  if (!stages) return null;
  const STAT_KEYS = ["ATK", "DEF", "SPA", "SPD", "SPE"] as const;
  const nonNeutral = STAT_KEYS.filter((k) => stages[k] !== 6);
  if (nonNeutral.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {label && <span className="text-[9px] text-pine-muted">{label}</span>}
      {nonNeutral.map((k) => {
        const val = stages[k] - 6;
        const color = val > 0 ? "bg-green-700/80 text-white" : "bg-red-800/80 text-white";
        return (
          <span key={k} className={`${color} rounded-sm px-1 py-px text-[9px] font-bold`}>
            {val > 0 ? "+" : ""}{val} {k}
          </span>
        );
      })}
    </div>
  );
}

const RATING_COLORS: Record<SwitchinScore["rating"], string> = {
  GOOD: "bg-green-700/80 text-white",
  OK: "bg-yellow-600/80 text-white",
  RISKY: "bg-orange-600/80 text-white",
  BAD: "bg-red-800/80 text-white",
};

export function BattleView({
  enemy,
  leadPokemon,
  leadStatStages,
  party,
}: {
  enemy: EnemyPokemon;
  leadPokemon?: PartyPokemon;
  leadStatStages?: StatStages;
  party?: PartyPokemon[];
}) {
  const weaknesses = getDefensiveWeaknesses(enemy.types);
  const resistances = getDefensiveResistances(enemy.types);
  const immunities = getDefensiveImmunities(enemy.types);

  return (
    <div className="rounded border border-pine-danger/30 bg-pine-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-pine-danger" />
        <h2 className="text-xs font-bold uppercase tracking-[1.5px] text-pine-danger">
          {enemy.isWild ? "Wild Battle" : "Trainer Battle"}
        </h2>
        {leadPokemon && (
          <SpeedIndicator
            own={leadPokemon.stats.SPE}
            enemy={enemy.stats.SPE}
            ownStatus={leadPokemon.status}
            ownSpeStage={leadStatStages?.SPE}
            enemySpeStage={enemy.statStages?.SPE}
          />
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <PokemonSprite pokemonID={enemy.pokemonID} size={80} />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold uppercase text-pine-text">
              {enemy.name}
            </span>
            <span className="text-xs text-pine-muted">Lv.{enemy.level}</span>
            <StatusTag status={enemy.status} />
          </div>

          <div className="mt-1 flex gap-1">
            {enemy.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>

          <div className="mt-2">
            <HPBar current={enemy.curHP} max={enemy.maxHP} />
          </div>

          <div className="mt-1 flex items-center gap-1 text-[10px] text-pine-muted">
            <span>Ability: {enemy.ability}</span>
            {enemy.abilityID > 0 && getAbilityShortDesc(enemy.abilityID) && (
              <span className="rounded-sm bg-pine-accent/20 px-1 py-px text-[9px] font-bold text-pine-accent">
                {getAbilityShortDesc(enemy.abilityID)}
              </span>
            )}
          </div>

          {enemy.heldItemName && enemy.heldItemName !== "None" && (
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-pine-muted">
              <span>Item: {enemy.heldItemName}</span>
              {enemy.heldItem > 0 && getItemShortDesc(enemy.heldItem) && (
                <span className="rounded-sm bg-yellow-600/20 px-1 py-px text-[9px] font-bold text-yellow-500">
                  {getItemShortDesc(enemy.heldItem)}
                </span>
              )}
            </div>
          )}

          <StatStageIndicator stages={enemy.statStages} label="Enemy:" />
          {leadStatStages && <StatStageIndicator stages={leadStatStages} label="You:" />}

          {/* Weaknesses / Resistances / Immunities */}
          <div className="mt-2 space-y-1 text-[10px]">
            {weaknesses.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-bold text-red-400">Weak:</span>
                {weaknesses.map((w) => (
                  <span key={w.type} className="flex items-center gap-0.5">
                    <TypeBadge type={w.type} />
                    <span className="text-red-400">{w.multiplier}x</span>
                  </span>
                ))}
              </div>
            )}
            {resistances.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-bold text-green-400">Resists:</span>
                {resistances.map((r) => (
                  <span key={r.type} className="flex items-center gap-0.5">
                    <TypeBadge type={r.type} />
                    <span className="text-green-400">{r.multiplier}x</span>
                  </span>
                ))}
              </div>
            )}
            {immunities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-bold text-pine-muted">Immune:</span>
                {immunities.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
            )}
          </div>

          {/* Known enemy moves */}
          <div className="mt-2 flex flex-wrap gap-1">
            {enemy.moves
              .filter((m) => m.id > 0)
              .map((move) => (
                <div
                  key={move.id}
                  className="flex items-center gap-1 rounded-sm bg-pine-bg px-2 py-0.5 text-[10px]"
                >
                  <TypeBadge type={move.type} />
                  <span className="text-pine-secondary">{move.name}</span>
                </div>
              ))}
          </div>

          {/* Lead pokemon's moves with effectiveness + STAB */}
          {leadPokemon && (
            <div className="mt-3 rounded border border-pine-border bg-pine-bg/50 p-2">
              <div className="mb-1 text-[10px] font-bold uppercase text-pine-accent">
                Your Moves vs {enemy.name}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {leadPokemon.moves
                  .filter((m) => m.id > 0)
                  .map((move) => {
                    const mult = getAttackMultiplier(move.type, enemy.types);
                    const stab = isSTAB(move.type, leadPokemon.types);
                    const matchup = calculateMoveMatchup(leadPokemon, enemy, move, enemy.curHP, {
                      attackerStages: leadStatStages,
                      defenderStages: enemy.statStages,
                      attackerAbilityID: leadPokemon.abilityID,
                      defenderAbilityID: enemy.abilityID,
                      defenderStatus: enemy.status ?? 0,
                      attackerItemID: leadPokemon.heldItem,
                      defenderItemID: enemy.heldItem,
                    } as DamageOptions);
                    return (
                      <div
                        key={move.id}
                        className="rounded-sm bg-pine-surface px-2 py-0.5 text-[10px]"
                      >
                        <div className="flex items-center gap-1">
                          <TypeBadge type={move.type} />
                          <span className="truncate text-pine-secondary">{move.name}</span>
                          <PriorityTag moveId={move.id} />
                          {stab && (
                            <span className="rounded-sm bg-yellow-600/80 px-1 py-px text-[9px] font-bold text-white">
                              STAB
                            </span>
                          )}
                          <EffectivenessTag multiplier={mult} />
                        </div>
                        {matchup.damage && matchup.damage.max > 0 && (
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 pl-4">
                            <DamageRange min={matchup.damage.min} max={matchup.damage.max} />
                            <span className="text-[9px] text-pine-muted">
                              ({matchup.damage.minPercent}-{matchup.damage.maxPercent}%)
                            </span>
                            <KOTag ko={matchup.ko} />
                            <CritRange damage={matchup.damage} />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Enemy moves vs our lead */}
          {leadPokemon && enemy.moves.some((m) => m.id > 0) && (
            <div className="mt-3 rounded border border-pine-danger/20 bg-pine-bg/50 p-2">
              <div className="mb-1 text-[10px] font-bold uppercase text-pine-danger">
                Their Moves vs {leadPokemon.nickname || leadPokemon.name}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {enemy.moves
                  .filter((m) => m.id > 0)
                  .map((move) => {
                    const hasPower = move.power && move.power !== 0 && move.category;
                    const matchup = hasPower
                      ? calculateMoveMatchup(enemy, leadPokemon, move, leadPokemon.curHP, {
                          attackerStages: enemy.statStages,
                          defenderStages: leadStatStages,
                          attackerAbilityID: enemy.abilityID,
                          defenderAbilityID: leadPokemon.abilityID,
                          defenderStatus: leadPokemon.status,
                          attackerItemID: enemy.heldItem,
                          defenderItemID: leadPokemon.heldItem,
                        } as DamageOptions)
                      : null;
                    return (
                      <div
                        key={move.id}
                        className="rounded-sm bg-pine-surface px-2 py-0.5 text-[10px]"
                      >
                        <div className="flex items-center gap-1">
                          <TypeBadge type={move.type} />
                          <span className="truncate text-pine-secondary">{move.name}</span>
                          <PriorityTag moveId={move.id} />
                        </div>
                        {matchup?.damage && matchup.damage.max > 0 && (
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 pl-4">
                            <DamageRange min={matchup.damage.min} max={matchup.damage.max} />
                            <span className="text-[9px] text-pine-muted">
                              ({matchup.damage.minPercent}-{matchup.damage.maxPercent}%)
                            </span>
                            <KOTag ko={matchup.ko} />
                            <CritRange damage={matchup.damage} />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Switch-in Advisor */}
          {(() => {
            if (!party) return null;
            const analysis = analyzeSwitchins(party, enemy);
            if (analysis.candidates.length === 0) return null;
            const top3 = analysis.candidates.slice(0, 3);
            return (
              <div className="mt-3 rounded border border-pine-accent/30 bg-pine-bg/50 p-2">
                <div className="mb-1 text-[10px] font-bold uppercase text-pine-accent">
                  Switch-in Advisor
                </div>
                <div className="space-y-1.5">
                  {top3.map((c, i) => {
                    const isBest = i === 0;
                    const speedLabel = c.isFaster === true ? "\u25B2 FASTER" : c.isFaster === false ? "\u25BC SLOWER" : "\u25C6 TIE";
                    const speedColor = c.isFaster === true ? "text-green-400" : c.isFaster === false ? "text-red-400" : "text-yellow-400";
                    return (
                      <div key={c.pokemon.slot} className="rounded-sm bg-pine-surface px-2 py-1">
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="font-bold text-pine-muted">#{i + 1}</span>
                          {isBest && <span className="text-yellow-400">{"\u2605"}</span>}
                          <span className="font-bold text-pine-text">
                            {c.pokemon.nickname || c.pokemon.name}
                          </span>
                          <span className="text-pine-muted">
                            {c.pokemon.types.join("/")}
                          </span>
                          <span className={`${RATING_COLORS[c.rating]} ml-auto rounded-sm px-1 py-px text-[9px] font-bold`}>
                            {c.rating}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 pl-4 text-[9px] text-pine-muted">
                          {c.worstEnemyMove && (
                            <span>
                              Survives {c.worstEnemyMove} ({c.worstDamagePercent}%)
                            </span>
                          )}
                          {!c.worstEnemyMove && <span>No known enemy moves</span>}
                          {c.bestOwnMove && (
                            <>
                              <span>{"\u00B7"}</span>
                              <span>
                                {c.bestOwnMove} {c.bestDamagePercent}%
                                {c.bestKO ? ` (${c.bestKO})` : ""}
                              </span>
                            </>
                          )}
                          <span>{"\u00B7"}</span>
                          <span className={speedColor}>{speedLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Stats */}
          <div className="mt-2 space-y-0.5">
            {(["HP", "ATK", "DEF", "SPA", "SPD", "SPE"] as const).map(
              (stat) => (
                <StatBar
                  key={stat}
                  label={stat}
                  value={enemy.stats[stat] || 0}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
