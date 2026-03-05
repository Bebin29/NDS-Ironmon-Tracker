"use client";

import type { PartyPokemon, EnemyPokemon } from "@/lib/types";
import { NATURE_NAMES } from "@/lib/types";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { HPBar } from "@/components/ui/HPBar";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { StatBar } from "@/components/ui/StatBar";
import { getAttackMultiplier, isSTAB } from "@/lib/type-effectiveness";
import { calculateMoveMatchup, type KOChance, type DamageOptions } from "@/lib/damage-calc";
import { isNearLevelCap } from "@/lib/nuzlocke-rules";
import { getLevelCap } from "@/lib/game-data";

function MoveEffTag({ multiplier }: { multiplier: number }) {
  if (multiplier === 1) return null;
  const label = multiplier === 0 ? "0x" : `${multiplier}x`;
  const color =
    multiplier === 0
      ? "text-pine-muted"
      : multiplier > 1
        ? "text-green-400"
        : "text-red-400";
  return <span className={`${color} text-[9px] font-bold`}>{label}</span>;
}

const KO_COLORS: Record<string, string> = {
  OHKO: "text-green-400",
  "2HKO": "text-yellow-400",
  "3HKO": "text-orange-400",
};

function MoveKOTag({ ko }: { ko: KOChance }) {
  if (!ko || ko === "4HKO+") return null;
  return <span className={`${KO_COLORS[ko]} text-[8px] font-bold`}>{ko}</span>;
}

function PokemonCard({ pokemon, enemy, badgeCount, gameName }: { pokemon: PartyPokemon; enemy?: EnemyPokemon | null; badgeCount: number; gameName?: string }) {
  const isDead = pokemon.curHP === 0 && pokemon.maxHP > 0;
  const nature = NATURE_NAMES[pokemon.nature] || "???";
  const levelCap = getLevelCap(badgeCount, gameName);
  const nearCap = isNearLevelCap(pokemon.level, badgeCount, gameName);
  const overCap = pokemon.level > levelCap;

  return (
    <div
      className={`rounded border p-3 transition-all ${
        isDead
          ? "border-pine-danger/50 bg-pine-danger/10 opacity-60"
          : "border-pine-border bg-pine-surface"
      }`}
    >
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <PokemonSprite pokemonID={pokemon.pokemonID} size={56} />
          <span className={`mt-1 text-[10px] ${
            overCap ? "font-bold text-pine-danger"
              : nearCap ? "font-bold text-amber-400"
              : "text-pine-muted"
          }`}>
            Lv.{pokemon.level}{nearCap && !overCap && " \u26A0"}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold uppercase text-pine-text">
              {pokemon.nickname || pokemon.name}
            </span>
            {isDead && (
              <span className="text-[10px] font-bold text-pine-danger">
                DEAD
              </span>
            )}
            <StatusIcon status={pokemon.status} />
          </div>

          {pokemon.nickname && pokemon.nickname !== pokemon.name && (
            <span className="text-[10px] text-pine-muted">
              ({pokemon.name})
            </span>
          )}

          <div className="mt-1 flex gap-1">
            {pokemon.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>

          <div className="mt-2">
            <HPBar current={pokemon.curHP} max={pokemon.maxHP} />
          </div>

          <div className="mt-1 text-[10px] text-pine-muted">
            {nature} | {pokemon.ability} | {pokemon.heldItemName}
          </div>
        </div>
      </div>

      {/* Moves */}
      <div className="mt-2 grid grid-cols-2 gap-1">
        {pokemon.moves
          .filter((m) => m.id > 0)
          .map((move) => {
            const mult = enemy ? getAttackMultiplier(move.type, enemy.types) : null;
            const stab = isSTAB(move.type, pokemon.types);
            const matchup = enemy
              ? calculateMoveMatchup(pokemon, enemy, move, enemy.curHP, {
                  attackerAbilityID: pokemon.abilityID,
                  defenderAbilityID: enemy.abilityID,
                  attackerItemID: pokemon.heldItem,
                  defenderItemID: enemy.heldItem,
                } as DamageOptions)
              : null;
            return (
              <div
                key={move.id}
                className="flex items-center gap-1 rounded-sm bg-pine-bg px-2 py-0.5 text-[10px]"
              >
                <TypeBadge type={move.type} />
                <span className="truncate text-pine-secondary">{move.name}</span>
                {stab && enemy && (
                  <span className="rounded-sm bg-yellow-600/80 px-0.5 py-px text-[8px] font-bold text-white">
                    S
                  </span>
                )}
                {mult !== null && <MoveEffTag multiplier={mult} />}
                {matchup && <MoveKOTag ko={matchup.ko} />}
                <span className="ml-auto text-pine-muted">
                  {move.pp}pp
                </span>
              </div>
            );
          })}
      </div>

      {/* Stats */}
      <div className="mt-2 space-y-0.5">
        {(["HP", "ATK", "DEF", "SPA", "SPD", "SPE"] as const).map((stat) => (
          <StatBar
            key={stat}
            label={stat}
            value={pokemon.stats[stat] || 0}
          />
        ))}
      </div>
    </div>
  );
}

export function PartyPanel({ party, enemy, badgeCount, gameName }: { party: PartyPokemon[]; enemy?: EnemyPokemon | null; badgeCount: number; gameName?: string }) {
  if (party.length === 0) {
    return (
      <div className="rounded border border-pine-border bg-pine-surface p-4 text-center text-sm text-pine-muted">
        No party data yet...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-[1.5px] text-pine-accent">
        Party
      </h2>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {party.map((pokemon) => (
          <PokemonCard key={pokemon.slot} pokemon={pokemon} enemy={enemy} badgeCount={badgeCount} gameName={gameName} />
        ))}
      </div>
    </div>
  );
}
