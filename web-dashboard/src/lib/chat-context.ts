import type { TrackerState } from "./types";
import { getLevelCap, getNextGymLeader } from "./platinum-data";
import { NATURE_NAMES } from "./types";

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
      return `${p.nickname || p.name} (${p.name}) Lv.${p.level} ${p.types.join("/")} | ${hpPct}% HP | ${p.ability} | ${nature} | Moves: ${moves}${flags ? ` [${flags}]` : ""}`;
    })
    .join("\n");

  let battleInfo = "";
  if (state.inBattle && state.enemy) {
    const e = state.enemy;
    const eMoves = e.moves
      .filter((m) => m.id > 0)
      .map((m) => m.name)
      .join(", ");
    battleInfo = `\nBATTLE: ${e.isWild ? "Wild" : "Trainer"} ${e.name} Lv.${e.level} ${e.types.join("/")} | Ability: ${e.ability} | Known moves: ${eMoves || "none"}`;
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
