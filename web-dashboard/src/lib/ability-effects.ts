import type { MoveData } from "@/lib/types";

interface AbilityEffect {
  name: string;
  shortDesc: string;
  atkMod?: (ctx: { move: MoveData; status: number }) => number;
  defMod?: (ctx: { move: MoveData; status: number }) => number;
  stabOverride?: number;
  powerMod?: (ctx: { move: MoveData }) => number;
  typeImmunity?: string;
  superEffectiveMod?: number;
  ignoresDefenderAbility?: boolean;
}

const isPhysical = (m: MoveData) => (m.category || "").toUpperCase() === "PHYSICAL";
const hasStatus = (s: number) => s > 0;

export const ABILITY_EFFECTS: Record<number, AbilityEffect> = {
  10: { name: "Volt Absorb", shortDesc: "Electric immune, heals", typeImmunity: "ELECTRIC" },
  11: { name: "Water Absorb", shortDesc: "Water immune, heals", typeImmunity: "WATER" },
  18: { name: "Flash Fire", shortDesc: "Fire immune, boosts Fire", typeImmunity: "FIRE" },
  22: { name: "Intimidate", shortDesc: "-1 ATK on switch-in" },
  26: { name: "Levitate", shortDesc: "Ground immune", typeImmunity: "GROUND" },
  31: { name: "Lightningrod", shortDesc: "Electric immune, +1 SPA", typeImmunity: "ELECTRIC" },
  37: { name: "Huge Power", shortDesc: "2x ATK", atkMod: () => 2 },
  74: { name: "Pure Power", shortDesc: "2x ATK", atkMod: () => 2 },
  47: {
    name: "Thick Fat",
    shortDesc: "0.5x Fire/Ice",
    defMod: ({ move }) => {
      const t = (move.type || "").toUpperCase();
      return t === "FIRE" || t === "ICE" ? 2 : 1;
    },
  },
  62: {
    name: "Guts",
    shortDesc: "1.5x ATK w/ status",
    atkMod: ({ status }) => (hasStatus(status) ? 1.5 : 1),
  },
  55: {
    name: "Hustle",
    shortDesc: "1.5x Phys ATK",
    atkMod: ({ move }) => (isPhysical(move) ? 1.5 : 1),
  },
  63: {
    name: "Marvel Scale",
    shortDesc: "1.5x DEF w/ status",
    defMod: ({ status }) => (hasStatus(status) ? 1.5 : 1),
  },
  91: { name: "Adaptability", shortDesc: "STAB=2x", stabOverride: 2 },
  101: {
    name: "Technician",
    shortDesc: "1.5x if BP\u226460",
    powerMod: ({ move }) => {
      const p = typeof move.power === "string" ? parseInt(move.power, 10) : move.power;
      return p && p <= 60 ? 1.5 : 1;
    },
  },
  111: { name: "Filter", shortDesc: "0.75x SE", superEffectiveMod: 0.75 },
  116: { name: "Solid Rock", shortDesc: "0.75x SE", superEffectiveMod: 0.75 },
  78: { name: "Motor Drive", shortDesc: "Electric immune, +1 SPE", typeImmunity: "ELECTRIC" },
  85: {
    name: "Heatproof",
    shortDesc: "0.5x Fire",
    defMod: ({ move }) => ((move.type || "").toUpperCase() === "FIRE" ? 2 : 1),
  },
  87: { name: "Dry Skin", shortDesc: "Water immune; Fire 1.25x", typeImmunity: "WATER" },
  104: { name: "Mold Breaker", shortDesc: "Ignores target ability", ignoresDefenderAbility: true },
  114: { name: "Storm Drain", shortDesc: "Water immune, +1 SPA", typeImmunity: "WATER" },
  157: { name: "Sap Sipper", shortDesc: "Grass immune, +1 ATK", typeImmunity: "GRASS" },
  163: { name: "Turboblaze", shortDesc: "Ignores target ability", ignoresDefenderAbility: true },
  164: { name: "Teravolt", shortDesc: "Ignores target ability", ignoresDefenderAbility: true },
};

export function getAttackerAbilityMod(
  abilityID: number,
  move: MoveData,
  status: number
): number {
  const effect = ABILITY_EFFECTS[abilityID];
  if (!effect?.atkMod) return 1;
  return effect.atkMod({ move, status });
}

export function getDefenderAbilityMod(
  abilityID: number,
  move: MoveData,
  status: number,
  typeMultiplier: number
): number {
  const effect = ABILITY_EFFECTS[abilityID];
  if (!effect) return 1;
  let mod = 1;
  if (effect.defMod) mod *= effect.defMod({ move, status });
  if (effect.superEffectiveMod && typeMultiplier > 1) mod *= effect.superEffectiveMod;
  return mod;
}

export function getDefenderTypeImmunity(abilityID: number): string | null {
  return ABILITY_EFFECTS[abilityID]?.typeImmunity ?? null;
}

export function getSTABOverride(abilityID: number): number | null {
  return ABILITY_EFFECTS[abilityID]?.stabOverride ?? null;
}

export function getPowerMod(abilityID: number, move: MoveData): number {
  const effect = ABILITY_EFFECTS[abilityID];
  if (!effect?.powerMod) return 1;
  return effect.powerMod({ move });
}

export function ignoresDefenderAbility(abilityID: number): boolean {
  return ABILITY_EFFECTS[abilityID]?.ignoresDefenderAbility === true;
}

export function getAbilityShortDesc(abilityID: number): string | null {
  return ABILITY_EFFECTS[abilityID]?.shortDesc ?? null;
}
