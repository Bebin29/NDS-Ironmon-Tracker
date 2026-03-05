import type { TrackerState, StatStages } from "./types";
import { getLevelCap, getNextGymLeader } from "./platinum-data";
import { NATURE_NAMES, STATUS_NAMES } from "./types";
import { getAbilityShortDesc } from "./ability-effects";
import { getItemShortDesc } from "./item-effects";
import { getStatStageMult, calculateMoveMatchup, type DamageOptions } from "./damage-calc";
import { isSTAB } from "./type-effectiveness";

function formatStatStages(stages?: StatStages): string {
  if (!stages) return "";
  const KEYS = ["ATK", "DEF", "SPA", "SPD", "SPE"] as const;
  const parts = KEYS.filter((k) => stages[k] !== 6).map((k) => {
    const val = stages[k] - 6;
    return `${val > 0 ? "+" : ""}${val} ${k}`;
  });
  return parts.length > 0 ? parts.join(", ") : "";
}

export function buildSystemPrompt(state: TrackerState | null): string {
  if (!state) {
    return `You are a concise Pokemon Platinum Soul Link Nuzlocke advisor. The tracker is not connected — answer general Platinum strategy questions. Keep answers short and direct.`;
  }

  const levelCap = getLevelCap(state.badgeCount);
  const nextGym = getNextGymLeader(state.badgeCount);

  const partyLines = state.party
    .map((p) => {
      const hpPct = p.maxHP > 0 ? Math.round((p.curHP / p.maxHP) * 100) : 0;
      const nature = NATURE_NAMES[p.nature] || "???";
      const moves = p.moves
        .filter((m) => m.id > 0)
        .map((m) => m.name)
        .join(", ");
      const flags = [
        p.curHP === 0 && p.maxHP > 0 ? "DEAD" : null,
        p.level >= levelCap ? "AT CAP" : null,
        p.level > levelCap ? "OVERLEVEL" : null,
      ]
        .filter(Boolean)
        .join(", ");
      const abilityNote = p.abilityID > 0 ? getAbilityShortDesc(p.abilityID) : null;
      const abilityStr = abilityNote ? `${p.ability} (${abilityNote})` : p.ability;
      const itemNote = p.heldItem > 0 ? getItemShortDesc(p.heldItem) : null;
      const itemStr = p.heldItemName !== "None" ? (itemNote ? `${p.heldItemName} (${itemNote})` : p.heldItemName) : "None";
      return `${p.nickname || p.name} (${p.name}) Lv.${p.level} ${p.types.join("/")} | ${hpPct}% HP | ${abilityStr} | ${nature} | Item: ${itemStr} | Moves: ${moves}${flags ? ` [${flags}]` : ""}`;
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
  }

  const items = state.healingItems
    .map((i) => `${i.name} x${i.quantity}`)
    .join(", ");

  return `You are a concise Pokemon Platinum Soul Link Nuzlocke advisor embedded in a live tracker dashboard.

RULES:
- Keep answers short (2-4 sentences for simple questions, use bullet points for complex ones).
- Reference the player's actual Pokemon, moves, and matchups — don't give generic advice.
- Use markdown formatting: **bold** for Pokemon/move names, bullet lists for options.
- Don't greet or introduce yourself. Jump straight to the answer.
- Nuzlocke: fainted = dead. Level cap ${levelCap} (next gym: ${nextGym.name}, ${nextGym.type}-type). Soul Link: linked catches die together.

STATE:
${state.gameName} | ${state.location} | ${state.badgeCount}/8 badges | ${state.runOver ? "RUN OVER" : "Active"}
Level cap: ${levelCap} | Next gym: ${nextGym.name} (${nextGym.type})
Items: ${items || "none"}
${battleInfo}

PARTY:
${partyLines || "(empty)"}`;
}
