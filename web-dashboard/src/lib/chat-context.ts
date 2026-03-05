import type { TrackerState, StatStages, GraveyardEntry } from "./types";
import { getLevelCap, getNextGymLeader } from "./game-data";
import { NATURE_NAMES, STATUS_NAMES } from "./types";
import { getAbilityShortDesc } from "./ability-effects";
import { getItemShortDesc } from "./item-effects";
import { getStatStageMult, calculateMoveMatchup, type DamageOptions } from "./damage-calc";
import { isSTAB, getDefensiveWeaknesses, getAttackMultiplier } from "./type-effectiveness";
import { analyzeSwitchins } from "./switchin-calc";

const ALL_TYPES = [
  "NORMAL", "FIRE", "WATER", "GRASS", "ELECTRIC", "ICE",
  "FIGHTING", "POISON", "GROUND", "FLYING", "PSYCHIC",
  "BUG", "ROCK", "GHOST", "DRAGON", "DARK", "STEEL",
];

// Nature stat effects: index = floor(natureId/5) for boost, natureId%5 for penalty
// 0=ATK, 1=DEF, 2=SPE, 3=SPA, 4=SPD
const NATURE_STAT_KEYS = ["ATK", "DEF", "SPE", "SPA", "SPD"] as const;

function getNatureEffect(natureId: number): string {
  const boost = Math.floor(natureId / 5);
  const penalty = natureId % 5;
  if (boost === penalty) return "neutral";
  return `+${NATURE_STAT_KEYS[boost]} -${NATURE_STAT_KEYS[penalty]}`;
}

function getReturnPower(friendship: number): number {
  return Math.floor(friendship / 2.5);
}

function getFrustrationPower(friendship: number): number {
  return Math.floor((255 - friendship) / 2.5);
}

function formatStatStages(stages?: StatStages): string {
  if (!stages) return "";
  const KEYS = ["ATK", "DEF", "SPA", "SPD", "SPE"] as const;
  const parts = KEYS.filter((k) => stages[k] !== 6).map((k) => {
    const val = stages[k] - 6;
    return `${val > 0 ? "+" : ""}${val} ${k}`;
  });
  return parts.length > 0 ? parts.join(", ") : "";
}

export function buildSystemPrompt(state: TrackerState | null, deaths?: GraveyardEntry[]): string {
  if (!state) {
    return `You are a concise Pokemon Ironmon/Nuzlocke advisor. The tracker is not connected — answer general strategy questions. Keep answers short and direct.`;
  }

  const levelCap = getLevelCap(state.badgeCount, state.gameName);
  const nextGym = getNextGymLeader(state.badgeCount, state.gameName);
  const genLabel = state.gen === 4 ? "Gen 4" : state.gen === 5 ? "Gen 5" : `Gen ${state.gen}`;

  const partyLines = state.party
    .map((p) => {
      const hpPct = p.maxHP > 0 ? Math.round((p.curHP / p.maxHP) * 100) : 0;
      const nature = NATURE_NAMES[p.nature] || "???";
      const natureEffect = getNatureEffect(p.nature);
      const moves = p.moves
        .filter((m) => m.id > 0)
        .map((m) => m.name)
        .join(", ");
      const levelsToCapDiff = levelCap - p.level;
      const flags = [
        p.curHP === 0 && p.maxHP > 0 ? "DEAD" : null,
        p.level > levelCap ? "OVERLEVEL" : null,
        p.level === levelCap ? "AT CAP" : null,
        levelsToCapDiff > 0 && levelsToCapDiff <= 3 ? `${levelsToCapDiff} lvl${levelsToCapDiff > 1 ? "s" : ""} to cap` : null,
      ]
        .filter(Boolean)
        .join(", ");
      const abilityNote = p.abilityID > 0 ? getAbilityShortDesc(p.abilityID) : null;
      const abilityStr = abilityNote ? `${p.ability} (${abilityNote})` : p.ability;
      const itemNote = p.heldItem > 0 ? getItemShortDesc(p.heldItem) : null;
      const itemStr = p.heldItemName !== "None" ? (itemNote ? `${p.heldItemName} (${itemNote})` : p.heldItemName) : "None";

      // Friendship-based move power
      const hasReturn = p.moves.some((m) => m.name === "Return");
      const hasFrustration = p.moves.some((m) => m.name === "Frustration");
      let friendshipNote = "";
      if (hasReturn) friendshipNote = ` | Return power: ${getReturnPower(p.friendship)}`;
      else if (hasFrustration) friendshipNote = ` | Frustration power: ${getFrustrationPower(p.friendship)}`;

      const statsStr = `HP:${p.stats.HP} ATK:${p.stats.ATK} DEF:${p.stats.DEF} SPA:${p.stats.SPA} SPD:${p.stats.SPD} SPE:${p.stats.SPE}`;
      return `${p.nickname || p.name} (${p.name}) Lv.${p.level} ${p.types.join("/")} | ${hpPct}% HP | ${abilityStr} | ${nature} (${natureEffect}) | Item: ${itemStr} | Stats: ${statsStr} | Moves: ${moves}${friendshipNote}${flags ? ` [${flags}]` : ""}`;
    })
    .join("\n");

  let battleInfo = "";
  if (state.inBattle && state.enemy) {
    const e = state.enemy;
    const eMoves = e.moves
      .filter((m) => m.id > 0)
      .map((m) => m.name)
      .join(", ");
    const abilityNote = e.abilityID > 0 ? getAbilityShortDesc(e.abilityID) : null;
    const abilityStr = abilityNote ? `${e.ability} (${abilityNote})` : e.ability;
    const enemyStages = formatStatStages(e.statStages);
    const leadStages = formatStatStages(state.leadStatStages);

    const enemyItemNote = e.heldItem > 0 ? getItemShortDesc(e.heldItem) : null;
    const enemyItemStr = e.heldItemName && e.heldItemName !== "None"
      ? (enemyItemNote ? `${e.heldItemName} (${enemyItemNote})` : e.heldItemName)
      : "None";

    const enemyStatusName = e.status && e.status > 0 ? STATUS_NAMES[e.status] || null : null;
    battleInfo = `\nBATTLE: ${e.isWild ? "Wild" : "Trainer"} ${e.name} Lv.${e.level} ${e.types.join("/")} | HP: ${e.curHP}/${e.maxHP} | Ability: ${abilityStr} | Item: ${enemyItemStr}${enemyStatusName ? ` | Status: ${enemyStatusName}` : ""} | Known moves: ${eMoves || "none"}`;
    if (enemyStages) battleInfo += ` | Enemy stat stages: ${enemyStages}`;
    if (leadStages) battleInfo += ` | Your stat stages: ${leadStages}`;

    // Effective speed comparison
    const lead = state.party.find((p) => p.curHP > 0 && p.maxHP > 0);
    if (lead) {
      let ownSpd = lead.stats.SPE;
      let enemySpd = e.stats.SPE;
      if (state.leadStatStages?.SPE !== undefined) ownSpd = Math.floor(ownSpd * getStatStageMult(state.leadStatStages.SPE));
      if (e.statStages?.SPE !== undefined) enemySpd = Math.floor(enemySpd * getStatStageMult(e.statStages.SPE));
      if (lead.status === 4) ownSpd = Math.floor(ownSpd / 4);
      const speedResult = ownSpd > enemySpd ? "YOU ARE FASTER" : ownSpd < enemySpd ? "ENEMY IS FASTER" : "SPEED TIE";
      battleInfo += ` | Speed: ${speedResult} (${ownSpd} vs ${enemySpd})`;

      // Stat comparison
      battleInfo += `\nSTAT COMPARISON (you vs enemy): ATK ${lead.stats.ATK} vs ${e.stats.ATK} | DEF ${lead.stats.DEF} vs ${e.stats.DEF} | SPA ${lead.stats.SPA} vs ${e.stats.SPA} | SPD ${lead.stats.SPD} vs ${e.stats.SPD} | SPE ${lead.stats.SPE} vs ${e.stats.SPE}`;
    }

    // Enemy moves damage vs your lead
    if (lead) {
      const enemyMoves = e.moves.filter((m) => m.id > 0 && m.power && m.power !== 0 && m.category);
      if (enemyMoves.length > 0) {
        const dmgOpts: DamageOptions = {
          attackerStages: e.statStages,
          defenderStages: state.leadStatStages,
          attackerAbilityID: e.abilityID,
          defenderAbilityID: lead.abilityID,
          defenderStatus: lead.status,
          attackerItemID: e.heldItem,
          defenderItemID: lead.heldItem,
        };
        const moveLines = enemyMoves.map((m) => {
          const matchup = calculateMoveMatchup(e, lead, m, lead.curHP, dmgOpts);
          if (!matchup.damage || matchup.damage.max === 0) return `- ${m.name} (${m.type}, ${m.category}): 0 dmg`;
          const d = matchup.damage;
          return `- ${m.name} (${m.type}, ${m.category}): ${d.min}-${d.max} dmg (${d.minPercent}-${d.maxPercent}%)${matchup.ko ? `, ${matchup.ko}` : ""}`;
        });
        battleInfo += `\nENEMY MOVES VS YOUR LEAD:\n${moveLines.join("\n")}`;
      }

      // Your moves vs enemy
      const yourMoves = lead.moves.filter((m) => m.id > 0 && m.power && m.power !== 0 && m.category);
      if (yourMoves.length > 0) {
        const yourDmgOpts: DamageOptions = {
          attackerStages: state.leadStatStages,
          defenderStages: e.statStages,
          attackerAbilityID: lead.abilityID,
          defenderAbilityID: e.abilityID,
          defenderStatus: e.status ?? 0,
          attackerItemID: lead.heldItem,
          defenderItemID: e.heldItem,
        };
        const yourMoveLines = yourMoves.map((m) => {
          const matchup = calculateMoveMatchup(lead, e, m, e.curHP, yourDmgOpts);
          const stab = isSTAB(m.type, lead.types) ? " [STAB]" : "";
          if (!matchup.damage || matchup.damage.max === 0) return `- ${m.name} (${m.type}, ${m.category}): 0 dmg${stab}`;
          const d = matchup.damage;
          return `- ${m.name} (${m.type}, ${m.category}): ${d.min}-${d.max} dmg (${d.minPercent}-${d.maxPercent}%)${matchup.ko ? `, ${matchup.ko}` : ""}${stab}`;
        });
        battleInfo += `\nYOUR MOVES VS ENEMY:\n${yourMoveLines.join("\n")}`;
      }
    }

    // Switch-in ranking
    const switchAnalysis = analyzeSwitchins(state.party, e);
    if (switchAnalysis.candidates.length > 0) {
      const switchLines = switchAnalysis.candidates.slice(0, 3).map((c, i) => {
        const speedStr = c.isFaster === true ? "faster" : c.isFaster === false ? "slower" : "speed tie";
        const worstHit = c.worstEnemyMove ? `worst hit: ${c.worstEnemyMove} (${c.worstDamagePercent}%)` : "no known enemy moves";
        const bestMove = c.bestOwnMove ? `best move: ${c.bestOwnMove} (${c.bestDamagePercent}%${c.bestKO ? `, ${c.bestKO}` : ""})` : "no damaging moves";
        return `#${i + 1} ${c.pokemon.nickname || c.pokemon.name} (${c.pokemon.name}) [${c.rating}] score=${c.totalScore} | ${worstHit} | ${bestMove} | ${speedStr}`;
      });
      battleInfo += `\nSWITCH-IN RANKING:\n${switchLines.join("\n")}`;
    }
  }

  const items = state.healingItems
    .map((i) => `${i.name} x${i.quantity}`)
    .join(", ");

  let encounterInfo = "";
  if (state.encounters) {
    const routeLines = (state.encounters.areaOrder || []).map((routeName) => {
      const route = state.encounters!.routes[routeName];
      if (!route) return null;
      const seen = route.seen.map((p) => p.name).join(", ");
      return `${routeName}: ${route.seen.length}/${route.totalPokemon || "?"}${seen ? ` (${seen})` : ""}`;
    }).filter(Boolean);
    if (routeLines.length > 0) {
      encounterInfo = `\nROUTE ENCOUNTERS:\n${routeLines.join("\n")}`;
    }
  }

  // Team weakness summary
  const alive = state.party.filter((p) => p.curHP > 0 && p.maxHP > 0 && p.isEgg !== 1);
  let teamWeaknessInfo = "";
  if (alive.length > 0) {
    const weaknessCounts: Record<string, number> = {};
    for (const p of alive) {
      for (const w of getDefensiveWeaknesses(p.types)) {
        weaknessCounts[w.type] = (weaknessCounts[w.type] || 0) + 1;
      }
    }
    const sharedWeaknesses = Object.entries(weaknessCounts)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => `${type} (${count}/${alive.length})`);
    if (sharedWeaknesses.length > 0) {
      teamWeaknessInfo = `\nTEAM WEAKNESSES (defensive): ${sharedWeaknesses.join(", ")}`;
    }

    // Offensive coverage: which types can the team hit super-effectively?
    const coveredTypes = new Set<string>();
    for (const p of alive) {
      for (const move of p.moves) {
        if (move.id <= 0) continue;
        const mt = move.type.toUpperCase();
        for (const defType of ALL_TYPES) {
          if (getAttackMultiplier(mt, [defType]) > 1) {
            coveredTypes.add(defType);
          }
        }
      }
    }
    const uncovered = ALL_TYPES.filter((t) => !coveredTypes.has(t));
    if (uncovered.length > 0) {
      teamWeaknessInfo += `\nCOVERAGE GAPS (no super-effective moves against): ${uncovered.join(", ")}`;
    }
  }

  // Graveyard / death history
  let graveyardInfo = "";
  if (deaths && deaths.length > 0) {
    const deathLines = deaths.map((d) => {
      let line = `${d.nickname && d.nickname !== d.name ? `${d.nickname} (${d.name})` : d.name} Lv.${d.level} at ${d.location}`;
      if (d.killedBy) {
        line += ` — killed by ${d.wasWildEncounter ? "wild " : ""}${d.killedBy} Lv.${d.killedByLevel}`;
      }
      return line;
    });
    graveyardInfo = `\nGRAVEYARD (${deaths.length} deaths):\n${deathLines.join("\n")}`;
  }

  // Timer
  const timerH = Math.floor(state.timerSeconds / 3600);
  const timerM = Math.floor((state.timerSeconds % 3600) / 60);
  const timerStr = timerH > 0 ? `${timerH}h ${timerM}m` : `${timerM}m`;

  return `You are a concise ${state.gameName} Ironmon/Nuzlocke advisor embedded in a live tracker dashboard.

RULES:
- Keep answers short (2-4 sentences for simple questions, use bullet points for complex ones).
- Reference the player's actual Pokemon, moves, and matchups — don't give generic advice.
- Use markdown formatting: **bold** for Pokemon/move names, bullet lists for options.
- Don't greet or introduce yourself. Jump straight to the answer.
- This is ${genLabel}${state.gen === 4 ? " (physical/special split by move, not type)" : ""}.
- Nuzlocke: fainted = dead. Level cap ${levelCap} (next gym: ${nextGym.name}, ${nextGym.type}-type). Soul Link: linked catches die together.

STATE:
${state.gameName} (${genLabel}) | ${state.location} | ${state.badgeCount}/8 badges | ${state.runOver ? "RUN OVER" : "Active"}
Level cap: ${levelCap} | Next gym: ${nextGym.name} (${nextGym.type})
Pokecenter heals: ${state.pokecenterCount}${state.pokecenterCount <= 2 ? " (CRITICAL — very few heals left!)" : state.pokecenterCount <= 5 ? " (low)" : ""}
Timer: ${timerStr}
Items: ${items || "none"}${teamWeaknessInfo}${encounterInfo}${graveyardInfo}
${battleInfo}

PARTY:
${partyLines || "(empty)"}`;
}
