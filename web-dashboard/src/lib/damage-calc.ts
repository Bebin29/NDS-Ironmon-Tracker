import type { MoveData, PartyPokemon, EnemyPokemon, StatStages } from "@/lib/types";
import { getAttackMultiplier, isSTAB } from "@/lib/type-effectiveness";
import {
  getAttackerAbilityMod,
  getDefenderAbilityMod,
  getDefenderTypeImmunity,
  getSTABOverride,
  getPowerMod,
  ignoresDefenderAbility,
} from "@/lib/ability-effects";
import { getAttackerItemStatMod, getAttackerItemDamageMod, getDefenderItemMod } from "@/lib/item-effects";

export interface DamageResult {
  min: number;
  max: number;
  minPercent: number;
  maxPercent: number;
  critMin?: number;
  critMax?: number;
  critMinPercent?: number;
  critMaxPercent?: number;
}

export type KOChance = "OHKO" | "2HKO" | "3HKO" | "4HKO+" | null;

export interface MoveMatchup {
  damage: DamageResult | null;
  ko: KOChance;
  critKo?: KOChance;
}

export interface DamageOptions {
  attackerStages?: StatStages;
  defenderStages?: StatStages;
  attackerAbilityID?: number;
  defenderAbilityID?: number;
  defenderStatus?: number;
  attackerItemID?: number;
  defenderItemID?: number;
}

/**
 * Convert raw stat stage (0-12, 6=neutral) to multiplier.
 * stage >= 6: (2 + stage - 6) / 2 = (stage - 4) / 2
 * stage < 6:  2 / (2 + 6 - stage) = 2 / (8 - stage)
 */
export function getStatStageMult(rawStage: number): number {
  const stage = rawStage - 6;
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
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
  move: MoveData,
  options?: DamageOptions
): DamageResult | null {
  let basePower = typeof move.power === "string" ? parseInt(move.power, 10) : move.power;
  if (!basePower || basePower <= 0) return null;

  const category = (move.category || "").toUpperCase();
  if (category === "STATUS" || category === "NONE" || category === "") return null;

  const isPhysical = category === "PHYSICAL";
  const atkAbilityID = options?.attackerAbilityID ?? 0;
  const defAbilityID = options?.defenderAbilityID ?? 0;
  const moldBreaker = ignoresDefenderAbility(atkAbilityID);

  // Defender type immunity from ability (e.g. Levitate vs Ground) — skipped by Mold Breaker
  if (!moldBreaker) {
    const immuneType = getDefenderTypeImmunity(defAbilityID);
    if (immuneType && (move.type || "").toUpperCase() === immuneType) {
      return { min: 0, max: 0, minPercent: 0, maxPercent: 0 };
    }
  }

  // Technician power mod
  const effectivePower = Math.floor(basePower * getPowerMod(atkAbilityID, move));

  const typeMultiplier = getAttackMultiplier(move.type, defenderTypes);
  if (typeMultiplier === 0) return { min: 0, max: 0, minPercent: 0, maxPercent: 0 };

  // STAB with Adaptability override
  const stabOverride = getSTABOverride(atkAbilityID);
  const stabMod = isSTAB(move.type, attackerTypes) ? (stabOverride ?? 1.5) : 1;

  // Attacker item damage modifier (Life Orb, Expert Belt, type-boosting)
  const atkItemDmgMod = getAttackerItemDamageMod(options?.attackerItemID ?? 0, typeMultiplier, move.type);

  // Ability ATK modifier
  const atkAbilityMod = getAttackerAbilityMod(atkAbilityID, move, attackerStatus);

  // Attacker item stat modifier (Choice Band, Muscle Band, etc.)
  const atkItemStatMod = getAttackerItemStatMod(options?.attackerItemID ?? 0, isPhysical);

  // Defender ability mod — skipped by Mold Breaker
  const defAbilityMod = moldBreaker ? 1 : getDefenderAbilityMod(defAbilityID, move, options?.defenderStatus ?? 0, typeMultiplier);

  // Defender item modifier (Eviolite) — NOT skipped by Mold Breaker
  const defItemMod = getDefenderItemMod(options?.defenderItemID ?? 0);

  const applyMod = (dmg: number, mod: number) => Math.floor(dmg * mod);

  // Helper to compute damage rolls for a given set of stage/burn overrides
  function computeRolls(atkStageOverride?: number, defStageOverride?: number, ignoreBurn?: boolean): { min: number; max: number } {
    let A = isPhysical ? attackerAtk : attackerSpa;
    let D = isPhysical ? defenderDef : defenderSpd;

    if (options?.attackerStages) {
      const stageKey = isPhysical ? "ATK" : "SPA";
      const rawStage = options.attackerStages[stageKey];
      const stage = atkStageOverride !== undefined ? Math.max(rawStage, atkStageOverride) : rawStage;
      A = Math.floor(A * getStatStageMult(stage));
    }
    if (options?.defenderStages) {
      const stageKey = isPhysical ? "DEF" : "SPD";
      const rawStage = options.defenderStages[stageKey];
      const stage = defStageOverride !== undefined ? Math.min(rawStage, defStageOverride) : rawStage;
      D = Math.floor(D * getStatStageMult(stage));
    }

    A = Math.floor(A * atkAbilityMod);
    if (atkItemStatMod !== 1) A = Math.floor(A * atkItemStatMod);
    if (defAbilityMod !== 1) D = Math.floor(D * defAbilityMod);
    if (defItemMod !== 1) D = Math.floor(D * defItemMod);

    const levelFactor = Math.floor(2 * attackerLevel / 5 + 2);
    const base = Math.floor(Math.floor(levelFactor * effectivePower * A / D) / 50 + 2);

    const burnMod = (!ignoreBurn && attackerStatus === 2 && isPhysical) ? 0.5 : 1;

    const results: number[] = [];
    for (let roll = 85; roll <= 100; roll++) {
      let dmg = base;
      dmg = applyMod(dmg, stabMod);
      dmg = applyMod(dmg, typeMultiplier);
      dmg = applyMod(dmg, burnMod);
      if (atkItemDmgMod !== 1) dmg = applyMod(dmg, atkItemDmgMod);
      dmg = Math.floor(dmg * roll / 100);
      if (dmg < 1 && typeMultiplier > 0) dmg = 1;
      results.push(dmg);
    }
    return { min: Math.min(...results), max: Math.max(...results) };
  }

  // Normal damage
  const normal = computeRolls();

  // Crit damage: 2x multiplier, ignore negative ATK stages (use max(stage, 6)),
  // ignore positive DEF stages (use min(stage, 6)), ignore burn
  const crit = computeRolls(6, 6, true);
  const critMin = Math.floor(crit.min * 2);
  const critMax = Math.floor(crit.max * 2);

  return {
    min: normal.min, max: normal.max, minPercent: 0, maxPercent: 0,
    critMin, critMax, critMinPercent: 0, critMaxPercent: 0,
  };
}

export function calculateKOChance(damage: DamageResult | null, defenderHP: number): KOChance {
  if (!damage || defenderHP <= 0 || damage.max === 0) return null;
  if (damage.min >= defenderHP) return "OHKO";
  if (damage.min * 2 >= defenderHP) return "2HKO";
  if (damage.min * 3 >= defenderHP) return "3HKO";
  return "4HKO+";
}

type Combatant = Pick<PartyPokemon, "level" | "stats" | "types" | "status"> | Pick<EnemyPokemon, "level" | "stats" | "types" | "status">;

export function calculateMoveMatchup(
  attacker: Combatant,
  defender: Combatant,
  move: MoveData,
  defenderHP: number,
  options?: DamageOptions
): MoveMatchup {
  const status = "status" in attacker ? (attacker.status ?? 0) : 0;
  const damage = calculateDamage(
    attacker.level,
    attacker.stats.ATK,
    attacker.stats.SPA,
    attacker.types,
    status,
    defender.stats.DEF,
    defender.stats.SPD,
    defender.types,
    move,
    options
  );

  if (damage && defenderHP > 0) {
    damage.minPercent = Math.round(damage.min / defenderHP * 100);
    damage.maxPercent = Math.round(damage.max / defenderHP * 100);
    if (damage.critMin !== undefined && damage.critMax !== undefined) {
      damage.critMinPercent = Math.round(damage.critMin / defenderHP * 100);
      damage.critMaxPercent = Math.round(damage.critMax / defenderHP * 100);
    }
  }

  const critDamage = damage?.critMin !== undefined && damage?.critMax !== undefined
    ? { min: damage.critMin, max: damage.critMax, minPercent: damage.critMinPercent ?? 0, maxPercent: damage.critMaxPercent ?? 0 }
    : null;

  return { damage, ko: calculateKOChance(damage, defenderHP), critKo: calculateKOChance(critDamage, defenderHP) };
}
