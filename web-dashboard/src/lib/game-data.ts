export interface GymLeader {
  name: string;
  type: string;
  badge: string;
  levelCap: number;
}

interface GameGymData {
  gyms: GymLeader[];
  e4Cap: number;
  championCap: number;
  championName: string;
}

const PLATINUM: GameGymData = {
  gyms: [
    { name: "Roark", type: "Rock", badge: "Coal Badge", levelCap: 14 },
    { name: "Gardenia", type: "Grass", badge: "Forest Badge", levelCap: 22 },
    { name: "Maylene", type: "Fighting", badge: "Cobble Badge", levelCap: 30 },
    { name: "Wake", type: "Water", badge: "Fen Badge", levelCap: 32 },
    { name: "Fantina", type: "Ghost", badge: "Relic Badge", levelCap: 36 },
    { name: "Byron", type: "Steel", badge: "Mine Badge", levelCap: 41 },
    { name: "Candice", type: "Ice", badge: "Icicle Badge", levelCap: 44 },
    { name: "Volkner", type: "Electric", badge: "Beacon Badge", levelCap: 50 },
  ],
  e4Cap: 62,
  championCap: 78,
  championName: "Cynthia",
};

const DIAMOND_PEARL: GameGymData = {
  gyms: [
    { name: "Roark", type: "Rock", badge: "Coal Badge", levelCap: 14 },
    { name: "Gardenia", type: "Grass", badge: "Forest Badge", levelCap: 22 },
    { name: "Fantina", type: "Ghost", badge: "Relic Badge", levelCap: 28 },
    { name: "Maylene", type: "Fighting", badge: "Cobble Badge", levelCap: 32 },
    { name: "Wake", type: "Water", badge: "Fen Badge", levelCap: 36 },
    { name: "Byron", type: "Steel", badge: "Mine Badge", levelCap: 41 },
    { name: "Candice", type: "Ice", badge: "Icicle Badge", levelCap: 44 },
    { name: "Volkner", type: "Electric", badge: "Beacon Badge", levelCap: 49 },
  ],
  e4Cap: 59,
  championCap: 66,
  championName: "Cynthia",
};

const HGSS: GameGymData = {
  gyms: [
    { name: "Falkner", type: "Flying", badge: "Zephyr Badge", levelCap: 13 },
    { name: "Bugsy", type: "Bug", badge: "Hive Badge", levelCap: 17 },
    { name: "Whitney", type: "Normal", badge: "Plain Badge", levelCap: 25 },
    { name: "Morty", type: "Ghost", badge: "Fog Badge", levelCap: 31 },
    { name: "Chuck", type: "Fighting", badge: "Storm Badge", levelCap: 35 },
    { name: "Jasmine", type: "Steel", badge: "Mineral Badge", levelCap: 39 },
    { name: "Pryce", type: "Ice", badge: "Glacier Badge", levelCap: 44 },
    { name: "Clair", type: "Dragon", badge: "Rising Badge", levelCap: 50 },
  ],
  e4Cap: 56,
  championCap: 75,
  championName: "Lance",
};

const BLACK_WHITE: GameGymData = {
  gyms: [
    { name: "Cilan/Chili/Cress", type: "Tri-type", badge: "Trio Badge", levelCap: 14 },
    { name: "Lenora", type: "Normal", badge: "Basic Badge", levelCap: 20 },
    { name: "Burgh", type: "Bug", badge: "Insect Badge", levelCap: 24 },
    { name: "Elesa", type: "Electric", badge: "Bolt Badge", levelCap: 29 },
    { name: "Clay", type: "Ground", badge: "Quake Badge", levelCap: 33 },
    { name: "Skyla", type: "Flying", badge: "Jet Badge", levelCap: 39 },
    { name: "Brycen", type: "Ice", badge: "Freeze Badge", levelCap: 43 },
    { name: "Iris/Drayden", type: "Dragon", badge: "Legend Badge", levelCap: 48 },
  ],
  e4Cap: 56,
  championCap: 75,
  championName: "Alder",
};

const BLACK2_WHITE2: GameGymData = {
  gyms: [
    { name: "Cheren", type: "Normal", badge: "Basic Badge", levelCap: 13 },
    { name: "Roxie", type: "Poison", badge: "Toxic Badge", levelCap: 18 },
    { name: "Burgh", type: "Bug", badge: "Insect Badge", levelCap: 23 },
    { name: "Elesa", type: "Electric", badge: "Bolt Badge", levelCap: 28 },
    { name: "Clay", type: "Ground", badge: "Quake Badge", levelCap: 33 },
    { name: "Skyla", type: "Flying", badge: "Jet Badge", levelCap: 39 },
    { name: "Drayden", type: "Dragon", badge: "Legend Badge", levelCap: 46 },
    { name: "Marlon", type: "Water", badge: "Wave Badge", levelCap: 52 },
  ],
  e4Cap: 59,
  championCap: 77,
  championName: "Iris",
};

const GAME_DATA: Record<string, GameGymData> = {
  "Pokemon Platinum": PLATINUM,
  "Pokemon Diamond": DIAMOND_PEARL,
  "Pokemon Pearl": DIAMOND_PEARL,
  "Pokemon HeartGold": HGSS,
  "Pokemon SoulSilver": HGSS,
  "Pokemon Black": BLACK_WHITE,
  "Pokemon White": BLACK_WHITE,
  "Pokemon Black 2": BLACK2_WHITE2,
  "Pokemon White 2": BLACK2_WHITE2,
};

function getGameData(gameName?: string): GameGymData {
  if (gameName && GAME_DATA[gameName]) return GAME_DATA[gameName];
  return PLATINUM;
}

export function getLevelCap(badgeCount: number, gameName?: string): number {
  const data = getGameData(gameName);
  if (badgeCount >= 8) return data.championCap;
  if (badgeCount < 0) return data.gyms[0].levelCap;
  return data.gyms[badgeCount]?.levelCap ?? data.championCap;
}

export const BADGE_NAMES = [
  "Coal",
  "Forest",
  "Cobble",
  "Fen",
  "Relic",
  "Mine",
  "Icicle",
  "Beacon",
];

export function getNextGymLeader(
  badgeCount: number,
  gameName?: string,
): GymLeader {
  const data = getGameData(gameName);
  if (badgeCount >= 8) {
    return {
      name: data.championName,
      type: "Mixed",
      badge: "Champion",
      levelCap: data.championCap,
    };
  }
  return data.gyms[badgeCount];
}
