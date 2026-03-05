"use client";

import type { EnemyPokemon, PartyPokemon } from "@/lib/types";
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
import { calculateMoveMatchup, type KOChance } from "@/lib/damage-calc";

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

function SpeedIndicator({ own, enemy, ownStatus }: { own: number; enemy: number; ownStatus: number }) {
  // Gen 4: Paralysis quarters speed
  const effectiveOwn = ownStatus === 4 ? Math.floor(own / 4) : own;
  const diff = effectiveOwn - enemy;
  const label = diff > 0 ? "FASTER" : diff < 0 ? "SLOWER" : "SPEED TIE";
  const color = diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-yellow-400";
  const arrow = diff > 0 ? "\u25B2" : diff < 0 ? "\u25BC" : "\u25C6";
  return (
    <div className={`flex items-center gap-1 text-[10px] font-bold ${color}`}>
      <span>{arrow}</span>
      <span>{label}</span>
      <span className="font-normal text-pine-muted">
        ({effectiveOwn}{ownStatus === 4 ? "*" : ""} vs {enemy})
      </span>
    </div>
  );
}

export function BattleView({
  enemy,
  leadPokemon,
}: {
  enemy: EnemyPokemon;
  leadPokemon?: PartyPokemon;
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
          </div>

          <div className="mt-1 flex gap-1">
            {enemy.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>

          <div className="mt-2">
            <HPBar current={enemy.curHP} max={enemy.maxHP} />
          </div>

          <div className="mt-1 text-[10px] text-pine-muted">
            Ability: {enemy.ability}
          </div>

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
                    const matchup = calculateMoveMatchup(leadPokemon, enemy, move, enemy.curHP);
                    return (
                      <div
                        key={move.id}
                        className="rounded-sm bg-pine-surface px-2 py-0.5 text-[10px]"
                      >
                        <div className="flex items-center gap-1">
                          <TypeBadge type={move.type} />
                          <span className="truncate text-pine-secondary">{move.name}</span>
                          {stab && (
                            <span className="rounded-sm bg-yellow-600/80 px-1 py-px text-[9px] font-bold text-white">
                              STAB
                            </span>
                          )}
                          <EffectivenessTag multiplier={mult} />
                        </div>
                        {matchup.damage && matchup.damage.max > 0 && (
                          <div className="mt-0.5 flex items-center gap-1 pl-4">
                            <DamageRange min={matchup.damage.min} max={matchup.damage.max} />
                            <span className="text-[9px] text-pine-muted">
                              ({matchup.damage.minPercent}-{matchup.damage.maxPercent}%)
                            </span>
                            <KOTag ko={matchup.ko} />
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
                      ? calculateMoveMatchup(enemy, leadPokemon, move, leadPokemon.curHP)
                      : null;
                    return (
                      <div
                        key={move.id}
                        className="rounded-sm bg-pine-surface px-2 py-0.5 text-[10px]"
                      >
                        <div className="flex items-center gap-1">
                          <TypeBadge type={move.type} />
                          <span className="truncate text-pine-secondary">{move.name}</span>
                        </div>
                        {matchup?.damage && matchup.damage.max > 0 && (
                          <div className="mt-0.5 flex items-center gap-1 pl-4">
                            <DamageRange min={matchup.damage.min} max={matchup.damage.max} />
                            <span className="text-[9px] text-pine-muted">
                              ({matchup.damage.minPercent}-{matchup.damage.maxPercent}%)
                            </span>
                            <KOTag ko={matchup.ko} />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

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
