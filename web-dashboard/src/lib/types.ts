export interface StatStages {
  ATK: number;
  DEF: number;
  SPA: number;
  SPD: number;
  SPE: number;
  ACC: number;
  EVA: number;
}

export interface MoveData {
  id: number;
  name: string;
  pp: number;
  type: string;
  category?: string;
  power?: number | string;
  accuracy?: number | string;
}

export interface PartyPokemon {
  slot: number;
  pokemonID: number;
  name: string;
  types: string[];
  level: number;
  curHP: number;
  maxHP: number;
  stats: {
    HP: number;
    ATK: number;
    DEF: number;
    SPA: number;
    SPD: number;
    SPE: number;
  };
  moves: MoveData[];
  ability: string;
  abilityID: number;
  nature: number;
  heldItem: number;
  heldItemName: string;
  status: number;
  nickname: string;
  experience: number;
  friendship: number;
  isEgg: number;
  pid: number;
}

export interface EnemyPokemon {
  pokemonID: number;
  name: string;
  types: string[];
  level: number;
  curHP: number;
  maxHP: number;
  stats: {
    HP: number;
    ATK: number;
    DEF: number;
    SPA: number;
    SPD: number;
    SPE: number;
  };
  moves: MoveData[];
  ability: string;
  abilityID: number;
  isWild: boolean;
  statStages?: StatStages;
  heldItem: number;
  heldItemName: string;
  status?: number;
  catchRate?: number;
}

export interface BallItem {
  id: number;
  name: string;
  quantity: number;
}

export interface HealingItem {
  id: number;
  name: string;
  quantity: number;
}

export interface RouteEncounterPokemon {
  name: string;
  pokemonID: number;
  levels: number[];
}

export interface RouteEncounterData {
  totalPokemon: number;
  seen: RouteEncounterPokemon[];
}

export interface EncounterData {
  areaOrder: string[];
  routes: Record<string, RouteEncounterData>;
}

export interface TrackerState {
  timestamp: number;
  gameName: string;
  gen: number;
  party: PartyPokemon[];
  enemy: EnemyPokemon | null;
  enemies?: EnemyPokemon[];
  isDoubleBattle?: boolean;
  inBattle: boolean;
  badges: number[];
  badgeCount: number;
  progress: number;
  timerSeconds: number;
  location: string;
  healingItems: HealingItem[];
  ballItems?: BallItem[];
  pokecenterCount: number;
  runOver: boolean;
  leadStatStages?: StatStages;
  activeBattlePID?: number;
  activeBattleSlot?: number;
  encounters?: EncounterData;
}

export interface GraveyardEntry {
  pid: number;
  pokemonID: number;
  name: string;
  nickname: string;
  level: number;
  location: string;
  timestamp: number;
  types: string[];
  killedBy?: string;
  killedByLevel?: number;
  wasWildEncounter?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const NATURE_NAMES: Record<number, string> = {
  0: "Hardy",
  1: "Lonely",
  2: "Brave",
  3: "Adamant",
  4: "Naughty",
  5: "Bold",
  6: "Docile",
  7: "Relaxed",
  8: "Impish",
  9: "Lax",
  10: "Timid",
  11: "Hasty",
  12: "Serious",
  13: "Jolly",
  14: "Naive",
  15: "Modest",
  16: "Mild",
  17: "Quiet",
  18: "Bashful",
  19: "Rash",
  20: "Calm",
  21: "Gentle",
  22: "Sassy",
  23: "Careful",
  24: "Quirky",
};

/** Find the active battle Pokemon from the party using the best available identifier. */
export function getActiveBattlePokemon(state: TrackerState): PartyPokemon | undefined {
  if (!state.inBattle) return undefined;
  // Best: direct slot index from Lua (1-indexed, party array is 0-indexed)
  if (state.activeBattleSlot != null) {
    const mon = state.party[state.activeBattleSlot - 1];
    if (mon) return mon;
  }
  // Fallback: PID match
  if (state.activeBattlePID != null) {
    const mon = state.party.find((p) => p.pid === state.activeBattlePID);
    if (mon) return mon;
  }
  // Last resort: first alive
  return state.party.find((p) => p.curHP > 0 && p.maxHP > 0);
}

// ROM-exported trainer data types
export interface RomTrainerMove {
  id: number;
  name: string;
  type: string;
  category: string;
  power: number | string;
  accuracy: number | string;
}

export interface RomTrainerPokemon {
  speciesID: number;
  name: string;
  types: string[];
  level: number;
  form: number;
  heldItem: number;
  heldItemName: string;
  moves: RomTrainerMove[];
  ability: string;
  abilityID: number;
}

export interface RomTrainer {
  id: number;
  trainerClass: number;
  pokemonCount: number;
  pokemon: RomTrainerPokemon[];
  // Present for important trainers (gym leaders, E4, rivals)
  groupName?: string;
  name?: string;
  trainerType?: number; // 0=standard, 1=rival, 2=gym
  location?: string;
  badgeNumber?: number;
}

export interface RomTrainerExport {
  gameName: string;
  gen: number;
  trainerCount: number;
  exportTimestamp: number;
  trainers: RomTrainer[];
}

// ROM-exported evolution data types
export interface RomEvolution {
  methodID: number;
  method: string;
  param: number;
  paramName?: string;
  targetID: number;
  targetName: string;
}

export interface RomEvoExport {
  gameName: string;
  gen: number;
  speciesCount: number;
  exportTimestamp: number;
  evolutions: Record<string, RomEvolution[]>; // key = speciesID as string
}

export const STATUS_NAMES: Record<number, string> = {
  0: "None",
  1: "PSN",
  2: "BRN",
  3: "FRZ",
  4: "PAR",
  5: "SLP",
  6: "TOX",
};
