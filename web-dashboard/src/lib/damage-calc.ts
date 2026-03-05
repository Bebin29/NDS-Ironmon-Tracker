import type { MoveData, PartyPokemon, EnemyPokemon } from "@/lib/types";
import { getAttackMultiplier, isSTAB } from "@/lib/type-effectiveness";

export interface DamageResult {
  min: number;
  max: number;
  minPercent: number;
  maxPercent: number;
}

export type KOChance = "OHKO" | "2HKO" | "3HKO" | "4HKO+" | null;

export interface MoveMatchup {
  damage: DamageResult | null;
  ko: KOChance;
}

/**
 * Gen 4 damage formula with floor-chain after each modifier.
 * Returns null for status moves, zero-power moves, or immunities.
 */
export function calculateDamage(
  attackerLevel: number,
  attackerAtk: number,
  attackerSpa: number,
  attackerTypes: string[],
  attackerStatus: number,
  defenderDef: number,
  defenderSpd: number,
  defenderTypes: string[],
  move: MoveData
): DamageResult | null {
  const power = typeof move.power === "string" ? parseInt(move.power, 10) : move.power;
  if (!power || power <= 0) return null;

  const category = (move.category || "").toUpperCase();
  if (category === "STATUS" || category === "NONE" || category === "") return null;

  const isPhysical = category === "PHYSICAL";
  const A = isPhysical ? attackerAtk : attackerSpa;
  const D = isPhysical ? defenderDef : defenderSpd;

  const typeMultiplier = getAttackMultiplier(move.type, defenderTypes);
  if (typeMultiplier === 0) return { min: 0, max: 0, minPercent: 0, maxPercent: 0 };

  // Base damage: floor(floor(floor(2 * Level / 5 + 2) * Power * A / D) / 50 + 2)
  const levelFactor = Math.floor(2 * attackerLevel / 5 + 2);
  const base = Math.floor(Math.floor(levelFactor * power * A / D) / 50 + 2);

  // Apply modifiers with floor after each
  const applyMod = (dmg: number, mod: number) => Math.floor(dmg * mod);

  const stabMod = isSTAB(move.type, attackerTypes) ? 1.5 : 1;
  const burnMod = (attackerStatus === 2 && isPhysical) ? 0.5 : 1;

  // Random roll: 85-100 (divide by 100)
  const results: number[] = [];
  for (let roll = 85; roll <= 100; roll++) {
    let dmg = base;
    dmg = applyMod(dmg, stabMod);
    dmg = applyMod(dmg, typeMultiplier);
    dmg = applyMod(dmg, burnMod);
    dmg = Math.floor(dmg * roll / 100);
    if (dmg < 1 && typeMultiplier > 0) dmg = 1;
    results.push(dmg);
  }

  const min = Math.min(...results);
  const max = Math.max(...results);

  return { min, max, minPercent: 0, maxPercent: 0 };
}

export function calculateKOChance(damage: DamageResult | null, defenderHP: number): KOChance {
  if (!damage || defenderHP <= 0 || damage.max === 0) return null;
  if (damage.min >= defenderHP) return "OHKO";
  if (damage.min * 2 >= defenderHP) return "2HKO";
  if (damage.min * 3 >= defenderHP) return "3HKO";
  return "4HKO+";
}

type Combatant = Pick<PartyPokemon, "level" | "stats" | "types" | "status"> | Pick<EnemyPokemon, "level" | "stats" | "types">;

export function calculateMoveMatchup(
  attacker: Combatant,
  defender: Combatant,
  move: MoveData,
  defenderHP: number
): MoveMatchup {
  const status = "status" in attacker ? attacker.status : 0;
  const damage = calculateDamage(
    attacker.level,
    attacker.stats.ATK,
    attacker.stats.SPA,
    attacker.types,
    status,
    defender.stats.DEF,
    defender.stats.SPD,
    defender.types,
    move
  );

  if (damage && defenderHP > 0) {
    damage.minPercent = Math.round(damage.min / defenderHP * 100);
    damage.maxPercent = Math.round(damage.max / defenderHP * 100);
  }

  return { damage, ko: calculateKOChance(damage, defenderHP) };
}
