import type { PartyPokemon, TrackerState } from "./types";
import { getLevelCap } from "./platinum-data";

export interface NuzlockeWarning {
  type: "overlevel" | "dead" | "critical_hp";
  pokemonName: string;
  message: string;
}

export function checkNuzlockeWarnings(state: TrackerState): NuzlockeWarning[] {
  const warnings: NuzlockeWarning[] = [];
  const levelCap = getLevelCap(state.badgeCount);

  for (const pokemon of state.party) {
    if (pokemon.isEgg === 1) continue;

    // Death detection
    if (pokemon.curHP === 0 && pokemon.maxHP > 0) {
      warnings.push({
        type: "dead",
        pokemonName: pokemon.nickname || pokemon.name,
        message: `${pokemon.nickname || pokemon.name} has fainted! (Dead in Nuzlocke)`,
      });
    }

    // Overlevel detection
    if (pokemon.level > levelCap) {
      warnings.push({
        type: "overlevel",
        pokemonName: pokemon.nickname || pokemon.name,
        message: `${pokemon.nickname || pokemon.name} (Lv.${pokemon.level}) exceeds level cap ${levelCap}!`,
      });
    }

    // Critical HP warning (below 25%)
    if (
      pokemon.curHP > 0 &&
      pokemon.maxHP > 0 &&
      pokemon.curHP / pokemon.maxHP < 0.25
    ) {
      warnings.push({
        type: "critical_hp",
        pokemonName: pokemon.nickname || pokemon.name,
        message: `${pokemon.nickname || pokemon.name} is at critical HP! (${pokemon.curHP}/${pokemon.maxHP})`,
      });
    }
  }

  return warnings;
}

export function getDeadPokemon(state: TrackerState): PartyPokemon[] {
  return state.party.filter((p) => p.curHP === 0 && p.maxHP > 0);
}

export function getOverleveledPokemon(state: TrackerState): PartyPokemon[] {
  const levelCap = getLevelCap(state.badgeCount);
  return state.party.filter(
    (p) => p.isEgg !== 1 && p.level > levelCap
  );
}
