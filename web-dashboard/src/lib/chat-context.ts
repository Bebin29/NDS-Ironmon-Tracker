import type { TrackerState, StatStages, GraveyardEntry, RomTrainer, RomEvolution } from "./types";
import type { RouteClaimEntry } from "@/hooks/useEncounterChecklist";
import { getLevelCap, getNextGymLeader } from "./game-data";
import { NATURE_NAMES, STATUS_NAMES, getActiveBattlePokemon } from "./types";
import { getAbilityShortDesc } from "./ability-effects";
import { getItemShortDesc } from "./item-effects";
import { getStatStageMult, calculateMoveMatchup, type DamageOptions } from "./damage-calc";
import { isSTAB, getDefensiveWeaknesses, getAttackMultiplier } from "./type-effectiveness";
import { analyzeSwitchins } from "./switchin-calc";
import { getUpcomingTrainers } from "./trainer-data";
import { findBaseForm, getEvoChain } from "@/hooks/useEvoData";

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

export function buildSystemPrompt(state: TrackerState | null, deaths?: GraveyardEntry[], encounterClaims?: Record<string, RouteClaimEntry>, romTrainers?: Map<number, RomTrainer>, romEvolutions?: Map<string, RomEvolution[]>): string {
  if (!state) {
    return `You are a concise Pokemon Ironmon/Nuzlocke advisor. The tracker is not connected — answer general strategy questions. Keep answers short and direct.`;
  }

  const levelCap = getLevelCap(state.badgeCount, state.gameName, romTrainers);
  const nextGym = getNextGymLeader(state.badgeCount, state.gameName);
  const genLabel = state.gen === 4 ? "Gen 4" : state.gen === 5 ? "Gen 5" : `Gen ${state.gen}`;

  const partyLines = state.party
    .map((p) => {
      const hpPct = p.maxHP > 0 ? Math.round((p.curHP / p.maxHP) * 100) : 0;
      const nature = NATURE_NAMES[p.nature] || "???";
      const natureEffect = getNatureEffect(p.nature);
      const moves = p.moves
        .filter((m) => m.id > 0 && m.name)
        .map((m) => m.name)
        .join(", ");
      const levelsToCapDiff = levelCap - p.level;
      const activeMon = getActiveBattlePokemon(state);
      const isActiveBattler = state.inBattle && activeMon != null && p.pid === activeMon.pid;
      const flags = [
        isActiveBattler ? "ACTIVE IN BATTLE" : null,
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

      // Evolution info
      let evoNote = "";
      if (romEvolutions && romEvolutions.size > 0) {
        const evos = romEvolutions.get(String(p.pokemonID));
        if (evos && evos.length > 0) {
          const evoDescs = evos.map((e) => {
            let method = e.method;
            if (e.method === "Level Up" && e.param > 0) method = `Lv.${e.param}`;
            else if (e.paramName) method = `${e.method}: ${e.paramName}`;
            return `${e.targetName} (${method})`;
          });
          evoNote = ` | Evolves: ${evoDescs.join(", ")}`;
        }
      }

      return `${p.nickname || p.name} (${p.name}) Lv.${p.level} ${p.types.filter(Boolean).join("/")} | ${hpPct}% HP | ${abilityStr} | ${nature} (${natureEffect}) | Item: ${itemStr} | Stats: ${statsStr} | Moves: ${moves}${friendshipNote}${evoNote}${flags ? ` [${flags}]` : ""}`;
    })
    .join("\n");

  let battleInfo = "";
  if (state.inBattle && state.enemy) {
    const allEnemies = state.enemies && state.enemies.length > 0 ? state.enemies : [state.enemy];
    const isDoubleBattle = allEnemies.length > 1;
    if (isDoubleBattle) {
      battleInfo += `\nDOUBLE BATTLE (${allEnemies.length} enemies active)`;
    }
    const e = state.enemy;
    const eMoves = e.moves
      .filter((m) => m.id > 0 && m.name)
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
    battleInfo = `\nBATTLE: ${e.isWild ? "Wild" : "Trainer"} ${e.name} Lv.${e.level} ${e.types.filter(Boolean).join("/")} | HP: ${e.curHP}/${e.maxHP} | Ability: ${abilityStr} | Item: ${enemyItemStr}${enemyStatusName ? ` | Status: ${enemyStatusName}` : ""} | Known moves: ${eMoves || "none"}`;
    if (enemyStages) battleInfo += ` | Enemy stat stages: ${enemyStages}`;
    if (leadStages) battleInfo += ` | Your stat stages: ${leadStages}`;

    // Effective speed comparison
    const lead = getActiveBattlePokemon(state);
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
    const switchAnalysis = analyzeSwitchins(state.party, e, lead?.pid);
    if (switchAnalysis.candidates.length > 0) {
      const switchLines = switchAnalysis.candidates.slice(0, 3).map((c, i) => {
        const speedStr = c.isFaster === true ? "faster" : c.isFaster === false ? "slower" : "speed tie";
        const worstHit = c.worstEnemyMove ? `worst hit: ${c.worstEnemyMove} (${c.worstDamagePercent}%)` : "no known enemy moves";
        const expectedHit = c.expectedDamagePercent > 0 ? `expected damage: ~${c.expectedDamagePercent}%` : "";
        const bestMove = c.bestOwnMove ? `best move: ${c.bestOwnMove} (${c.bestDamagePercent}%${c.bestKO ? `, ${c.bestKO}` : ""})` : "no damaging moves";
        const intimidateNote = c.hasIntimidate ? " [has Intimidate — lowers enemy ATK on switch]" : "";
        const topPrediction = c.enemyMovePredictions
          .filter((p) => p.damagePercent > 0)
          .sort((a, b) => b.probability - a.probability)[0];
        const likelyMove = topPrediction ? `likely enemy move: ${topPrediction.move.name} (${Math.round(topPrediction.probability * 100)}% chance, ${Math.round(topPrediction.damagePercent)}% dmg)` : "";
        return `#${i + 1} ${c.pokemon.nickname || c.pokemon.name} (${c.pokemon.name}) [${c.rating}] score=${c.totalScore} | ${worstHit}${expectedHit ? ` | ${expectedHit}` : ""}${likelyMove ? ` | ${likelyMove}` : ""} | ${bestMove} | ${speedStr}${intimidateNote}`;
      });
      battleInfo += `\nSWITCH-IN RANKING:\n${switchLines.join("\n")}`;
    }

    // Additional enemies in double battles
    if (isDoubleBattle) {
      for (let ei = 1; ei < allEnemies.length; ei++) {
        const e2 = allEnemies[ei];
        const e2Moves = e2.moves.filter((m) => m.id > 0 && m.name).map((m) => m.name).join(", ");
        const e2AbilityNote = e2.abilityID > 0 ? getAbilityShortDesc(e2.abilityID) : null;
        const e2AbilityStr = e2AbilityNote ? `${e2.ability} (${e2AbilityNote})` : e2.ability;
        const e2ItemStr = e2.heldItemName && e2.heldItemName !== "None" ? e2.heldItemName : "None";
        const e2StatusName = e2.status && e2.status > 0 ? STATUS_NAMES[e2.status] || null : null;
        battleInfo += `\nENEMY #${ei + 1}: ${e2.name} Lv.${e2.level} ${e2.types.filter(Boolean).join("/")} | HP: ${e2.curHP}/${e2.maxHP} | Ability: ${e2AbilityStr} | Item: ${e2ItemStr}${e2StatusName ? ` | Status: ${e2StatusName}` : ""} | Known moves: ${e2Moves || "none"}`;
        battleInfo += ` | Stats: ATK ${e2.stats.ATK} DEF ${e2.stats.DEF} SPA ${e2.stats.SPA} SPD ${e2.stats.SPD} SPE ${e2.stats.SPE}`;
      }
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
      const claim = encounterClaims?.[routeName];
      const statusTag = claim
        ? ` [${claim.status.toUpperCase()}${claim.pokemonName ? `: ${claim.pokemonName}` : ""}]`
        : route.seen.length > 0 ? " [UNCLAIMED]" : "";
      return `${routeName}: ${route.seen.length}/${route.totalPokemon || "?"}${seen ? ` (${seen})` : ""}${statusTag}`;
    }).filter(Boolean);
    if (routeLines.length > 0) {
      const claimValues = encounterClaims ? Object.values(encounterClaims) : [];
      const caughtCount = claimValues.filter((c) => c.status === "caught").length;
      const failedCount = claimValues.filter((c) => c.status === "failed").length;
      const skippedCount = claimValues.filter((c) => c.status === "skipped").length;
      const summaryLine = `Nuzlocke encounters: ${caughtCount} caught, ${failedCount} failed, ${skippedCount} dupes skipped`;
      encounterInfo = `\nROUTE ENCOUNTERS (${summaryLine}):\n${routeLines.join("\n")}`;
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

  // Upcoming trainer info
  let trainerInfo = "";
  const upcoming = getUpcomingTrainers(state.badgeCount, state.gameName);
  if (upcoming.length > 0) {
    const trainerLines = upcoming.map((t) => {
      // If ROM data available, try to overlay ROM team onto hardcoded metadata
      let team = t.team;
      if (romTrainers && romTrainers.size > 0) {
        for (const rt of romTrainers.values()) {
          if ((rt.badgeNumber === t.badge && rt.trainerType === 2) || rt.name === t.name) {
            if (rt.pokemon.length > 0) {
              team = rt.pokemon.map((mon) => ({
                name: mon.name,
                pokemonID: mon.speciesID,
                level: mon.level,
                types: mon.types,
                moves: mon.moves.filter((m) => m.id > 0).map((m) => m.name),
                ability: mon.ability || undefined,
                item: mon.heldItemName !== "None" ? mon.heldItemName : undefined,
              }));
            }
            break;
          }
        }
      }

      const teamStr = team.map((mon) =>
        `${mon.name} Lv.${mon.level} (${mon.types.join("/")}) — ${mon.moves.join(", ")}${mon.item ? ` [${mon.item}]` : ""}${mon.ability ? ` {${mon.ability}}` : ""}`
      ).join("\n  ");
      const tipsStr = t.tips ? `\n  Tips: ${t.tips.join("; ")}` : "";
      return `${t.role === "gym" ? `Gym ${t.badge}` : t.role === "elite4" ? "Elite 4" : "Champion"}: ${t.name} (${t.type}) at ${t.location}\n  ${teamStr}${tipsStr}`;
    });
    const romLabel = romTrainers && romTrainers.size > 0 ? " (ROM data — may be randomized)" : "";
    trainerInfo = `\nUPCOMING TRAINERS${romLabel}:\n${trainerLines.join("\n")}`;
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
Items: ${items || "none"}${teamWeaknessInfo}${trainerInfo}${encounterInfo}${graveyardInfo}
${battleInfo}

PARTY:
${partyLines || "(empty)"}`;
}
