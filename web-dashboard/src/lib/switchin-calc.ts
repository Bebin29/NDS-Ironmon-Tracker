import type { PartyPokemon, EnemyPokemon } from "@/lib/types";
import { calculateMoveMatchup, getStatStageMult, type KOChance, type DamageOptions } from "@/lib/damage-calc";
import { getAttackMultiplier } from "@/lib/type-effectiveness";
import { getDefenderTypeImmunity, ignoresDefenderAbility } from "@/lib/ability-effects";

export interface SwitchinScore {
  pokemon: PartyPokemon;
  totalScore: number;
  survivalScore: number;
  offensiveScore: number;
  typeMatchupScore: number;
  speedScore: number;
  hpScore: number;
  worstEnemyMove: string | null;
  worstDamagePercent: number;
  bestOwnMove: string | null;
  bestDamagePercent: number;
  bestKO: KOChance;
  isFaster: boolean | null;
  rating: "GOOD" | "OK" | "RISKY" | "BAD";
}

export interface SwitchinAnalysis {
  candidates: SwitchinScore[];
  bestSwitch: SwitchinScore | null;
}

function getRating(score: number): "GOOD" | "OK" | "RISKY" | "BAD" {
  if (score >= 70) return "GOOD";
  if (score >= 45) return "OK";
  if (score >= 20) return "RISKY";
  return "BAD";
}

function scoreCandidate(candidate: PartyPokemon, enemy: EnemyPokemon): SwitchinScore {
  const moldBreaker = ignoresDefenderAbility(enemy.abilityID);

  // --- Survival score (40%) ---
  // Enemy attacks candidate: enemy keeps stages, candidate has neutral stages
  const survivalOpts: DamageOptions = {
    attackerStages: enemy.statStages,
    attackerAbilityID: enemy.abilityID,
    defenderAbilityID: candidate.abilityID,
    defenderStatus: candidate.status,
    attackerItemID: enemy.heldItem,
    defenderItemID: candidate.heldItem,
  };

  const enemyDamagingMoves = enemy.moves.filter(
    (m) => m.id > 0 && m.power && m.power !== 0 && m.category
  );

  let worstDamagePercent = 0;
  let worstEnemyMove: string | null = null;

  if (enemyDamagingMoves.length > 0) {
    for (const move of enemyDamagingMoves) {
      const matchup = calculateMoveMatchup(enemy, candidate, move, candidate.curHP, survivalOpts);
      const pct = matchup.damage?.maxPercent ?? 0;
      if (pct > worstDamagePercent) {
        worstDamagePercent = pct;
        worstEnemyMove = move.name;
      }
    }
  }

  const survivalScore = enemyDamagingMoves.length > 0
    ? Math.max(0, 100 - worstDamagePercent)
    : 70;

  // --- Offensive score (25%) ---
  // Candidate attacks enemy: candidate neutral stages, enemy keeps stages
  const offensiveOpts: DamageOptions = {
    defenderStages: enemy.statStages,
    attackerAbilityID: candidate.abilityID,
    defenderAbilityID: enemy.abilityID,
    defenderStatus: enemy.status ?? 0,
    attackerItemID: candidate.heldItem,
    defenderItemID: enemy.heldItem,
  };

  let bestDamagePercent = 0;
  let bestOwnMove: string | null = null;
  let bestKO: KOChance = null;

  const candidateDamagingMoves = candidate.moves.filter(
    (m) => m.id > 0 && m.power && m.power !== 0 && m.category
  );

  for (const move of candidateDamagingMoves) {
    const matchup = calculateMoveMatchup(candidate, enemy, move, enemy.curHP, offensiveOpts);
    const pct = matchup.damage?.maxPercent ?? 0;
    if (pct > bestDamagePercent) {
      bestDamagePercent = pct;
      bestOwnMove = move.name;
      bestKO = matchup.ko;
    }
  }

  const offensiveScore = Math.min(100, bestDamagePercent);

  // --- Type matchup score (20%) ---
  // Collect unique types from enemy's known damaging moves, or use enemy STAB types
  const enemyMoveTypes = new Set<string>();
  for (const m of enemyDamagingMoves) {
    enemyMoveTypes.add(m.type.toUpperCase());
  }
  if (enemyMoveTypes.size === 0) {
    for (const t of enemy.types) {
      enemyMoveTypes.add(t.toUpperCase());
    }
  }

  // Ability-based type immunity
  const abilityImmune = !moldBreaker ? getDefenderTypeImmunity(candidate.abilityID) : null;

  let typeMatchupRaw = 50; // baseline
  for (const atkType of enemyMoveTypes) {
    const mult = getAttackMultiplier(atkType, candidate.types);
    if (mult === 0 || (abilityImmune && atkType === abilityImmune)) {
      typeMatchupRaw += 30; // immunity
    } else if (mult < 1) {
      typeMatchupRaw += 15; // resistance
    } else if (mult > 1) {
      typeMatchupRaw -= 20; // weakness
    }
  }
  const typeMatchupScore = Math.max(0, Math.min(100, typeMatchupRaw));

  // --- Speed score (10%) ---
  const candidateSpd = candidate.stats.SPE; // neutral stages on switch
  let enemySpd = enemy.stats.SPE;
  if (enemy.statStages?.SPE !== undefined) {
    enemySpd = Math.floor(enemySpd * getStatStageMult(enemy.statStages.SPE));
  }
  if (enemy.status === 4) enemySpd = Math.floor(enemySpd / 4);

  const isFaster = candidateSpd > enemySpd ? true : candidateSpd < enemySpd ? false : null;
  const speedScore = isFaster === true ? 100 : isFaster === null ? 50 : 0;

  // --- HP remaining score (5%) ---
  const hpScore = candidate.maxHP > 0
    ? Math.round((candidate.curHP / candidate.maxHP) * 100)
    : 0;

  // --- Weighted total ---
  const totalScore = Math.round(
    survivalScore * 0.4 +
    offensiveScore * 0.25 +
    typeMatchupScore * 0.2 +
    speedScore * 0.1 +
    hpScore * 0.05
  );

  return {
    pokemon: candidate,
    totalScore,
    survivalScore,
    offensiveScore,
    typeMatchupScore,
    speedScore,
    hpScore,
    worstEnemyMove,
    worstDamagePercent,
    bestOwnMove,
    bestDamagePercent,
    bestKO,
    isFaster,
    rating: getRating(totalScore),
  };
}

export function analyzeSwitchins(
  party: PartyPokemon[],
  enemy: EnemyPokemon
): SwitchinAnalysis {
  // Exclude the lead (first alive) and dead Pokemon
  const lead = party.find((p) => p.curHP > 0 && p.maxHP > 0);
  const candidates = party
    .filter((p) => p.curHP > 0 && p.maxHP > 0 && p !== lead && !p.isEgg)
    .map((p) => scoreCandidate(p, enemy))
    .sort((a, b) => b.totalScore - a.totalScore);

  return {
    candidates,
    bestSwitch: candidates[0] ?? null,
  };
}
