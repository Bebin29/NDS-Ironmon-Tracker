import type { PartyPokemon, EnemyPokemon, MoveData, StatStages } from "@/lib/types";
import { calculateMoveMatchup, getStatStageMult, type KOChance, type DamageOptions } from "@/lib/damage-calc";
import { getAttackMultiplier, isSTAB } from "@/lib/type-effectiveness";
import { getDefenderTypeImmunity, ignoresDefenderAbility, ABILITY_EFFECTS } from "@/lib/ability-effects";

// --- Ability IDs for switch-in effects ---
const INTIMIDATE_ID = 22;

export interface MovePrediction {
  move: MoveData;
  probability: number;
  damagePercent: number;
}

export interface OffensiveMoveScore {
  move: MoveData;
  damagePercent: number;
  ko: KOChance;
  categoryAdvantage: number; // bonus for hitting the weaker defensive stat
}

export interface SwitchinScore {
  pokemon: PartyPokemon;
  totalScore: number;
  survivalScore: number;
  offensiveScore: number;
  typeMatchupScore: number;
  speedScore: number;
  hpScore: number;
  abilityBonusScore: number;
  worstEnemyMove: string | null;
  worstDamagePercent: number;
  expectedDamagePercent: number;
  enemyMovePredictions: MovePrediction[];
  bestOwnMove: string | null;
  bestDamagePercent: number;
  bestKO: KOChance;
  offensiveMoves: OffensiveMoveScore[];
  isFaster: boolean | null;
  hasIntimidate: boolean;
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

// ---------------------------------------------------------------------------
// Enemy move usage prediction
// ---------------------------------------------------------------------------
// The AI in Pokemon games strongly favours super-effective, high-power, STAB
// moves.  We assign a raw weight to each damaging move and normalise to
// probabilities.  Non-damaging moves get a small baseline weight since the AI
// might use them too (setup, status, etc.).

function predictEnemyMoveUsage(
  enemy: EnemyPokemon,
  candidate: PartyPokemon,
  moldBreaker: boolean,
): MovePrediction[] {
  const candidateImmunity = !moldBreaker ? getDefenderTypeImmunity(candidate.abilityID) : null;

  const damagingMoves = enemy.moves.filter(
    (m) => m.id > 0 && m.power && m.power !== 0 && m.category &&
      m.category.toUpperCase() !== "STATUS"
  );
  const statusMoves = enemy.moves.filter(
    (m) => m.id > 0 && (!m.power || m.power === 0 || (m.category || "").toUpperCase() === "STATUS")
  );

  if (damagingMoves.length === 0) {
    // Only status moves known — equal probability
    const total = enemy.moves.filter((m) => m.id > 0).length || 1;
    return enemy.moves
      .filter((m) => m.id > 0)
      .map((m) => ({ move: m, probability: 1 / total, damagePercent: 0 }));
  }

  // Compute raw weights for damaging moves
  const rawWeights: { move: MoveData; weight: number; dmgPct: number }[] = [];

  for (const move of damagingMoves) {
    const typeMult = getAttackMultiplier(move.type, candidate.types);
    const isImmune = typeMult === 0 ||
      (candidateImmunity && (move.type || "").toUpperCase() === candidateImmunity);

    if (isImmune) {
      rawWeights.push({ move, weight: 0.1, dmgPct: 0 }); // AI rarely picks immune moves
      continue;
    }

    const power = typeof move.power === "string" ? parseInt(move.power, 10) : move.power;
    const stab = isSTAB(move.type, enemy.types) ? 1.5 : 1;
    const effectivenessBonus = typeMult >= 2 ? 3 : typeMult > 1 ? 2 : typeMult < 1 ? 0.4 : 1;

    // Weight = power * STAB * effectiveness bias
    const weight = (power ?? 50) * stab * effectivenessBonus;
    rawWeights.push({ move, weight, dmgPct: 0 });
  }

  // Status moves get a small fixed weight (AI sometimes uses them)
  const statusWeight = 15;
  const totalDamagingWeight = rawWeights.reduce((s, w) => s + w.weight, 0);
  const totalStatusWeight = statusMoves.length * statusWeight;
  const totalWeight = totalDamagingWeight + totalStatusWeight;

  const predictions: MovePrediction[] = [];

  for (const entry of rawWeights) {
    predictions.push({
      move: entry.move,
      probability: totalWeight > 0 ? entry.weight / totalWeight : 0,
      damagePercent: 0, // filled later
    });
  }

  for (const move of statusMoves) {
    predictions.push({
      move,
      probability: totalWeight > 0 ? statusWeight / totalWeight : 0,
      damagePercent: 0,
    });
  }

  return predictions;
}

// ---------------------------------------------------------------------------
// Apply Intimidate: returns adjusted enemy stat stages for physical calc
// ---------------------------------------------------------------------------
function applyIntimidateStages(
  enemyStages: StatStages | undefined,
  candidateAbilityID: number,
  enemyAbilityID: number,
): StatStages | undefined {
  if (candidateAbilityID !== INTIMIDATE_ID) return enemyStages;
  // Intimidate is blocked by abilities that ignore it (Clear Body, etc.)
  // For simplicity we just check Mold Breaker on the enemy side
  if (ignoresDefenderAbility(enemyAbilityID)) return enemyStages;

  const base: StatStages = enemyStages
    ? { ...enemyStages }
    : { ATK: 6, DEF: 6, SPA: 6, SPD: 6, SPE: 6, ACC: 6, EVA: 6 };

  // -1 ATK stage, minimum 0
  base.ATK = Math.max(0, base.ATK - 1);
  return base;
}

// ---------------------------------------------------------------------------
// Compute effective speed factoring in stat stages, paralysis, abilities
// ---------------------------------------------------------------------------
function getEffectiveSpeed(
  baseSpe: number,
  stages?: StatStages,
  status?: number,
): number {
  let spd = baseSpe;
  if (stages?.SPE !== undefined) {
    spd = Math.floor(spd * getStatStageMult(stages.SPE));
  }
  // Paralysis: speed quartered in Gen 4
  if (status === 4) spd = Math.floor(spd / 4);
  return spd;
}

// ---------------------------------------------------------------------------
// Evaluate how well a candidate's move category exploits enemy stat drops
// ---------------------------------------------------------------------------
function getCategoryAdvantage(
  move: MoveData,
  enemyStages: StatStages | undefined,
): number {
  if (!enemyStages) return 0;
  const cat = (move.category || "").toUpperCase();
  if (cat === "PHYSICAL") {
    // Bonus if enemy DEF is lowered below neutral
    const defDrop = 6 - enemyStages.DEF;
    return defDrop > 0 ? defDrop * 8 : 0;
  }
  if (cat === "SPECIAL") {
    // Bonus if enemy SPD is lowered below neutral
    const spdDrop = 6 - enemyStages.SPD;
    return spdDrop > 0 ? spdDrop * 8 : 0;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------
function scoreCandidate(candidate: PartyPokemon, enemy: EnemyPokemon): SwitchinScore {
  const moldBreaker = ignoresDefenderAbility(enemy.abilityID);
  const hasIntimidate = candidate.abilityID === INTIMIDATE_ID;

  // Adjust enemy ATK stages if candidate has Intimidate
  const adjustedEnemyStages = applyIntimidateStages(
    enemy.statStages,
    candidate.abilityID,
    enemy.abilityID,
  );

  // ------------------------------------------------------------------
  // 1. Predict enemy move usage probabilities
  // ------------------------------------------------------------------
  const predictions = predictEnemyMoveUsage(enemy, candidate, moldBreaker);

  // ------------------------------------------------------------------
  // 2. Survival score (35%) — expected damage, not just worst-case
  // ------------------------------------------------------------------
  const survivalOpts: DamageOptions = {
    attackerStages: adjustedEnemyStages,
    attackerAbilityID: enemy.abilityID,
    defenderAbilityID: candidate.abilityID,
    defenderStatus: candidate.status,
    attackerItemID: enemy.heldItem,
    defenderItemID: candidate.heldItem,
  };

  let worstDamagePercent = 0;
  let worstEnemyMove: string | null = null;
  let expectedDamagePercent = 0;

  for (const pred of predictions) {
    const move = pred.move;
    const power = typeof move.power === "string" ? parseInt(move.power, 10) : move.power;
    if (!power || power <= 0) continue;

    const matchup = calculateMoveMatchup(enemy, candidate, move, candidate.curHP, survivalOpts);
    const avgPct = matchup.damage
      ? (matchup.damage.minPercent + matchup.damage.maxPercent) / 2
      : 0;

    pred.damagePercent = avgPct;
    expectedDamagePercent += avgPct * pred.probability;

    if (avgPct > worstDamagePercent) {
      worstDamagePercent = avgPct;
      worstEnemyMove = move.name;
    }
  }

  // Blend expected (70%) and worst-case (30%) for a balanced survival metric
  const blendedDamage = expectedDamagePercent * 0.7 + worstDamagePercent * 0.3;
  const survivalScore = Math.max(0, Math.min(100, 100 - blendedDamage));

  // ------------------------------------------------------------------
  // 3. Offensive score (25%) — best move + category advantage
  // ------------------------------------------------------------------
  const offensiveOpts: DamageOptions = {
    defenderStages: enemy.statStages,
    attackerAbilityID: candidate.abilityID,
    defenderAbilityID: enemy.abilityID,
    defenderStatus: enemy.status ?? 0,
    attackerItemID: candidate.heldItem,
    defenderItemID: enemy.heldItem,
  };

  const offensiveMoves: OffensiveMoveScore[] = [];
  let bestDamagePercent = 0;
  let bestOwnMove: string | null = null;
  let bestKO: KOChance = null;

  const candidateDamagingMoves = candidate.moves.filter(
    (m) => m.id > 0 && m.power && m.power !== 0 && m.category &&
      m.category.toUpperCase() !== "STATUS"
  );

  for (const move of candidateDamagingMoves) {
    const matchup = calculateMoveMatchup(candidate, enemy, move, enemy.curHP, offensiveOpts);
    const avgPct = matchup.damage
      ? (matchup.damage.minPercent + matchup.damage.maxPercent) / 2
      : 0;
    const catAdv = getCategoryAdvantage(move, enemy.statStages);

    offensiveMoves.push({
      move,
      damagePercent: avgPct,
      ko: matchup.ko,
      categoryAdvantage: catAdv,
    });

    // Effective offensive score = damage + category bonus
    const effectivePct = avgPct + catAdv;
    if (effectivePct > bestDamagePercent || bestOwnMove === null) {
      bestDamagePercent = avgPct;
      bestOwnMove = move.name;
      bestKO = matchup.ko;
    }
  }

  // Sort offensive moves by effective damage
  offensiveMoves.sort((a, b) =>
    (b.damagePercent + b.categoryAdvantage) - (a.damagePercent + a.categoryAdvantage)
  );

  // Cap at 100, add a KO bonus
  const koBonus = bestKO === "OHKO" ? 20 : bestKO === "2HKO" ? 10 : bestKO === "3HKO" ? 3 : 0;
  const offensiveScore = Math.min(100, bestDamagePercent + koBonus);

  // ------------------------------------------------------------------
  // 4. Type matchup score (15%) — resistance/immunity vs enemy moves
  // ------------------------------------------------------------------
  const enemyMoveTypes = new Set<string>();
  for (const pred of predictions) {
    if (pred.damagePercent > 0 || (pred.move.power && pred.move.power !== 0)) {
      enemyMoveTypes.add((pred.move.type || "").toUpperCase());
    }
  }
  if (enemyMoveTypes.size === 0) {
    for (const t of enemy.types.filter(Boolean)) {
      enemyMoveTypes.add(t.toUpperCase());
    }
  }

  const abilityImmune = !moldBreaker ? getDefenderTypeImmunity(candidate.abilityID) : null;

  let typeMatchupRaw = 50;
  for (const atkType of enemyMoveTypes) {
    const mult = getAttackMultiplier(atkType, candidate.types);
    if (mult === 0 || (abilityImmune && atkType === abilityImmune)) {
      typeMatchupRaw += 30;
    } else if (mult < 1) {
      typeMatchupRaw += 15;
    } else if (mult > 1) {
      typeMatchupRaw -= 20;
    }
  }
  const typeMatchupScore = Math.max(0, Math.min(100, typeMatchupRaw));

  // ------------------------------------------------------------------
  // 5. Speed score (10%)
  // ------------------------------------------------------------------
  const candidateSpd = getEffectiveSpeed(candidate.stats.SPE, undefined, candidate.status);
  const enemySpd = getEffectiveSpeed(enemy.stats.SPE, enemy.statStages, enemy.status);

  const isFaster = candidateSpd > enemySpd ? true : candidateSpd < enemySpd ? false : null;
  const speedScore = isFaster === true ? 100 : isFaster === null ? 50 : 0;

  // ------------------------------------------------------------------
  // 6. HP remaining score (5%)
  // ------------------------------------------------------------------
  const hpScore = candidate.maxHP > 0
    ? Math.round((candidate.curHP / candidate.maxHP) * 100)
    : 0;

  // ------------------------------------------------------------------
  // 7. Ability bonus score (10%) — Intimidate, type immunities, etc.
  // ------------------------------------------------------------------
  let abilityBonusScore = 0;
  if (hasIntimidate) {
    // Bonus scales with how much the enemy relies on physical moves
    const physicalProb = predictions
      .filter((p) => (p.move.category || "").toUpperCase() === "PHYSICAL")
      .reduce((sum, p) => sum + p.probability, 0);
    abilityBonusScore += Math.round(physicalProb * 60);
  }
  if (abilityImmune) {
    // Bonus if enemy has moves of the immune type
    const immuneProb = predictions
      .filter((p) => (p.move.type || "").toUpperCase() === abilityImmune)
      .reduce((sum, p) => sum + p.probability, 0);
    abilityBonusScore += Math.round(immuneProb * 80);
  }
  // Other defensive abilities (Thick Fat, Filter, etc.)
  const defAbility = ABILITY_EFFECTS[candidate.abilityID];
  if (defAbility?.superEffectiveMod) {
    abilityBonusScore += 15;
  }
  abilityBonusScore = Math.min(100, abilityBonusScore);

  // ------------------------------------------------------------------
  // Weighted total
  // ------------------------------------------------------------------
  const totalScore = Math.round(
    survivalScore * 0.35 +
    offensiveScore * 0.25 +
    typeMatchupScore * 0.15 +
    speedScore * 0.10 +
    hpScore * 0.05 +
    abilityBonusScore * 0.10
  );

  return {
    pokemon: candidate,
    totalScore,
    survivalScore,
    offensiveScore,
    typeMatchupScore,
    speedScore,
    hpScore,
    abilityBonusScore,
    worstEnemyMove,
    worstDamagePercent,
    expectedDamagePercent: Math.round(expectedDamagePercent),
    enemyMovePredictions: predictions,
    bestOwnMove,
    bestDamagePercent,
    bestKO,
    offensiveMoves,
    isFaster,
    hasIntimidate,
    rating: getRating(totalScore),
  };
}

export function analyzeSwitchins(
  party: PartyPokemon[],
  enemy: EnemyPokemon,
  activeBattlePID?: number
): SwitchinAnalysis {
  const lead = (activeBattlePID != null
    ? party.find((p) => p.pid === activeBattlePID)
    : undefined)
    ?? party.find((p) => p.curHP > 0 && p.maxHP > 0);
  const candidates = party
    .filter((p) => p.curHP > 0 && p.maxHP > 0 && p !== lead && !p.isEgg)
    .map((p) => scoreCandidate(p, enemy))
    .sort((a, b) => b.totalScore - a.totalScore);

  return {
    candidates,
    bestSwitch: candidates[0] ?? null,
  };
}
