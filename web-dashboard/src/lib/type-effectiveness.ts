// Gen 4 type chart — ported from ironmon_tracker/constants/MoveData.lua lines 40-90
// Only lists non-1x multipliers. Missing entries = 1x (neutral).

const TYPE_CHART: Record<string, Record<string, number>> = {
  NORMAL: { ROCK: 0.5, GHOST: 0, STEEL: 0.5 },
  FIRE: { FIRE: 0.5, WATER: 0.5, GRASS: 2, ICE: 2, BUG: 2, ROCK: 0.5, DRAGON: 0.5, STEEL: 2 },
  WATER: { FIRE: 2, WATER: 0.5, GRASS: 0.5, GROUND: 2, ROCK: 2, DRAGON: 0.5 },
  GRASS: { FIRE: 0.5, WATER: 2, GRASS: 0.5, POISON: 0.5, GROUND: 2, FLYING: 0.5, BUG: 0.5, ROCK: 2, DRAGON: 0.5, STEEL: 0.5 },
  ELECTRIC: { WATER: 2, GRASS: 0.5, ELECTRIC: 0.5, GROUND: 0, FLYING: 2, DRAGON: 0.5 },
  ICE: { FIRE: 0.5, WATER: 0.5, GRASS: 2, ICE: 0.5, GROUND: 2, FLYING: 2, DRAGON: 2, STEEL: 0.5 },
  FIGHTING: { NORMAL: 2, ICE: 2, POISON: 0.5, FLYING: 0.5, PSYCHIC: 0.5, BUG: 0.5, ROCK: 2, GHOST: 0, DARK: 2, STEEL: 2 },
  POISON: { GRASS: 2, POISON: 0.5, GROUND: 0.5, ROCK: 0.5, GHOST: 0.5, STEEL: 0 },
  GROUND: { FIRE: 2, GRASS: 0.5, ELECTRIC: 2, POISON: 2, FLYING: 0, BUG: 0.5, ROCK: 2, STEEL: 2 },
  FLYING: { GRASS: 2, ELECTRIC: 0.5, FIGHTING: 2, BUG: 2, ROCK: 0.5, STEEL: 0.5 },
  PSYCHIC: { FIGHTING: 2, POISON: 2, PSYCHIC: 0.5, DARK: 0, STEEL: 0.5 },
  BUG: { FIRE: 0.5, GRASS: 2, FIGHTING: 0.5, POISON: 0.5, FLYING: 0.5, PSYCHIC: 2, GHOST: 0.5, DARK: 2, STEEL: 0.5 },
  ROCK: { FIRE: 2, ICE: 2, FIGHTING: 0.5, GROUND: 0.5, FLYING: 2, BUG: 2, STEEL: 0.5 },
  GHOST: { NORMAL: 0, PSYCHIC: 2, GHOST: 2, DARK: 0.5, STEEL: 0.5 },
  DRAGON: { DRAGON: 2, STEEL: 0.5 },
  DARK: { FIGHTING: 0.5, PSYCHIC: 2, GHOST: 2, DARK: 0.5, STEEL: 0.5 },
  STEEL: { FIRE: 0.5, WATER: 0.5, ICE: 2, ROCK: 2, STEEL: 0.5, ELECTRIC: 0.5 },
};

const ALL_TYPES = Object.keys(TYPE_CHART);

/** Get attack multiplier for a single attacking type vs one or more defending types */
export function getAttackMultiplier(atkType: string, defTypes: string[]): number {
  const atk = atkType.toUpperCase();
  const chart = TYPE_CHART[atk];
  if (!chart) return 1;
  let mult = 1;
  for (const dt of defTypes) {
    const d = dt.toUpperCase();
    mult *= chart[d] ?? 1;
  }
  return mult;
}

export interface TypeMultiplier {
  type: string;
  multiplier: number;
}

/** Get all types the defender is weak to (multiplier > 1) */
export function getDefensiveWeaknesses(defTypes: string[]): TypeMultiplier[] {
  const result: TypeMultiplier[] = [];
  for (const atk of ALL_TYPES) {
    const mult = getAttackMultiplier(atk, defTypes);
    if (mult > 1) result.push({ type: atk, multiplier: mult });
  }
  return result.sort((a, b) => b.multiplier - a.multiplier);
}

/** Get all types the defender resists (0 < multiplier < 1) */
export function getDefensiveResistances(defTypes: string[]): TypeMultiplier[] {
  const result: TypeMultiplier[] = [];
  for (const atk of ALL_TYPES) {
    const mult = getAttackMultiplier(atk, defTypes);
    if (mult > 0 && mult < 1) result.push({ type: atk, multiplier: mult });
  }
  return result.sort((a, b) => a.multiplier - b.multiplier);
}

/** Get all types the defender is immune to (multiplier === 0) */
export function getDefensiveImmunities(defTypes: string[]): string[] {
  const result: string[] = [];
  for (const atk of ALL_TYPES) {
    if (getAttackMultiplier(atk, defTypes) === 0) result.push(atk);
  }
  return result;
}

/** Check if a move type gets STAB from the pokemon's types */
export function isSTAB(moveType: string, pokemonTypes: string[]): boolean {
  const mt = moveType.toUpperCase();
  return pokemonTypes.some((t) => t.toUpperCase() === mt);
}

/** Get effectiveness label for a move type vs target types */
export function getMoveEffectiveness(
  moveType: string,
  targetTypes: string[]
): "super" | "neutral" | "resist" | "immune" {
  const mult = getAttackMultiplier(moveType, targetTypes);
  if (mult === 0) return "immune";
  if (mult > 1) return "super";
  if (mult < 1) return "resist";
  return "neutral";
}
