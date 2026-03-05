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
  isWild: boolean;
}

export interface HealingItem {
  id: number;
  name: string;
  quantity: number;
}

export interface TrackerState {
  timestamp: number;
  gameName: string;
  gen: number;
  party: PartyPokemon[];
  enemy: EnemyPokemon | null;
  inBattle: boolean;
  badges: number[];
  badgeCount: number;
  progress: number;
  timerSeconds: number;
  location: string;
  healingItems: HealingItem[];
  pokecenterCount: number;
  runOver: boolean;
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

export const STATUS_NAMES: Record<number, string> = {
  0: "None",
  1: "PSN",
  2: "BRN",
  3: "FRZ",
  4: "PAR",
  5: "SLP",
  6: "TOX",
};
