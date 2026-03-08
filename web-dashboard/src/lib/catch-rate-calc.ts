import type { EnemyPokemon, BallItem } from "./types";

export interface CatchRateResult {
  ballId: number;
  ballName: string;
  quantity: number;
  catchPercent: number;
  multiplier: number;
  condition?: string; // e.g. "Night/Cave" for Dusk Ball
}

// NDS status byte encoding:
// bits 0-2: sleep turns (1-7 = asleep), bit 3: poison, bit 4: burn,
// bit 5: freeze, bit 6: paralysis, bit 7: toxic
function getStatusMultiplier(status: number, gen: number): number {
  if (!status) return 1;
  const sleepTurns = status & 0x07;
  const isFrozen = (status & 0x20) !== 0;
  if (sleepTurns > 0 || isFrozen) return gen >= 5 ? 2.5 : 2;
  const isPoisoned = (status & 0x08) !== 0;
  const isBurned = (status & 0x10) !== 0;
  const isParalyzed = (status & 0x40) !== 0;
  const isToxic = (status & 0x80) !== 0;
  if (isPoisoned || isBurned || isParalyzed || isToxic) return 1.5;
  return 1;
}

interface BallInfo {
  multiplier: number;
  condition?: string;
}

function getBallMultiplier(
  ballId: number,
  enemy: EnemyPokemon,
  gen: number,
): BallInfo {
  switch (ballId) {
    case 1: // Master Ball
      return { multiplier: 255 };
    case 2: // Ultra Ball
      return { multiplier: 2 };
    case 3: // Great Ball
      return { multiplier: 1.5 };
    case 4: // Poke Ball
      return { multiplier: 1 };
    case 5: // Safari Ball
      return { multiplier: 1.5 };
    case 6: { // Net Ball
      const types = enemy.types.map((t) => t.toUpperCase());
      const applies = types.includes("WATER") || types.includes("BUG");
      return applies
        ? { multiplier: 3, condition: "Water/Bug" }
        : { multiplier: 1 };
    }
    case 7: // Dive Ball — 3.5x when surfing/fishing, hard to detect
      return { multiplier: 1 };
    case 8: { // Nest Ball
      const m = gen >= 5
        ? Math.max(1, (41 - enemy.level) / 10)
        : Math.max(1, (40 - enemy.level) / 10);
      return { multiplier: Math.round(m * 10) / 10, condition: m > 1 ? `Lv≤${gen >= 5 ? 30 : 29}` : undefined };
    }
    case 9: // Repeat Ball — 3x if already caught, can't detect
      return { multiplier: 1 };
    case 10: // Timer Ball — turn-dependent, show turn 1
      return { multiplier: 1, condition: "Turn 1" };
    case 11: // Luxury Ball
      return { multiplier: 1 };
    case 12: // Premier Ball
      return { multiplier: 1 };
    case 13: // Dusk Ball — 3.5x at night or in caves
      return { multiplier: 3.5, condition: "Night/Cave" };
    case 14: // Heal Ball
      return { multiplier: 1 };
    case 15: { // Quick Ball — 4x (Gen4) or 5x (Gen5) on turn 1
      const qm = gen >= 5 ? 5 : 4;
      return { multiplier: qm, condition: "Turn 1" };
    }
    case 16: // Cherish Ball
      return { multiplier: 1 };
    case 576: // Dream Ball
      return { multiplier: 1 };
    default:
      return { multiplier: 1 };
  }
}

/**
 * Calculate the probability of catching a Pokemon.
 * Gen IV formula: a = floor(((3*maxHP - 2*curHP) * catchRate * ballMod) / (3*maxHP)) * statusMod
 * Gen V formula: same but with grassMod (1) and entralinkPower (100)
 * Shake check: b = floor(1048560 / sqrt(sqrt(16711680 / a))) for Gen IV (4 checks)
 *              b = floor(65536 / sqrt(sqrt(255 / a))) for Gen V (3 checks)
 */
function calculateCatchProbability(
  maxHP: number,
  curHP: number,
  catchRate: number,
  ballMod: number,
  statusMod: number,
  gen: number,
): number {
  if (ballMod >= 255) return 100; // Master Ball

  // a value
  let a = Math.floor(((3 * maxHP - 2 * curHP) * catchRate * ballMod) / (3 * maxHP)) * statusMod;
  a = Math.max(1, Math.min(255, Math.floor(a)));

  if (a >= 255) return 100;

  let prob: number;
  if (gen >= 5) {
    // Gen V: b = floor(65536 / sqrt(sqrt(255 / a))), 3 shake checks
    const b = Math.floor(65536 / Math.sqrt(Math.sqrt(255 / a)));
    prob = Math.pow(b / 65536, 3);
  } else {
    // Gen IV: b = floor(1048560 / sqrt(sqrt(16711680 / a))), 4 shake checks
    const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / a)));
    prob = Math.pow(b / 65536, 4);
  }

  return Math.min(100, Math.round(prob * 10000) / 100);
}

/**
 * Calculate catch rates for all balls in the player's inventory.
 */
export function calculateCatchRates(
  enemy: EnemyPokemon,
  balls: BallItem[],
  gen: number,
): CatchRateResult[] {
  if (enemy.catchRate == null || enemy.catchRate <= 0) return [];
  if (enemy.maxHP <= 0) return [];

  const statusMod = getStatusMultiplier(enemy.status ?? 0, gen);
  const results: CatchRateResult[] = [];

  for (const ball of balls) {
    if (ball.quantity <= 0) continue;
    const { multiplier, condition } = getBallMultiplier(ball.id, enemy, gen);
    const catchPercent = calculateCatchProbability(
      enemy.maxHP,
      enemy.curHP,
      enemy.catchRate,
      multiplier,
      statusMod,
      gen,
    );

    results.push({
      ballId: ball.id,
      ballName: ball.name,
      quantity: ball.quantity,
      catchPercent,
      multiplier,
      condition,
    });
  }

  // Sort: highest catch % first
  results.sort((a, b) => b.catchPercent - a.catchPercent);
  return results;
}
