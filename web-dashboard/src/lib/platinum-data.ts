export interface GymLeader {
  name: string;
  type: string;
  badge: string;
  levelCap: number;
}

export const PLATINUM_GYM_LEADERS: GymLeader[] = [
  { name: "Roark", type: "Rock", badge: "Coal Badge", levelCap: 14 },
  { name: "Gardenia", type: "Grass", badge: "Forest Badge", levelCap: 22 },
  { name: "Maylene", type: "Fighting", badge: "Cobble Badge", levelCap: 30 },
  { name: "Wake", type: "Water", badge: "Fen Badge", levelCap: 32 },
  { name: "Fantina", type: "Ghost", badge: "Relic Badge", levelCap: 36 },
  { name: "Byron", type: "Steel", badge: "Mine Badge", levelCap: 41 },
  { name: "Candice", type: "Ice", badge: "Icicle Badge", levelCap: 44 },
  { name: "Volkner", type: "Electric", badge: "Beacon Badge", levelCap: 50 },
];

export const ELITE_FOUR_CAP = 62;
export const CHAMPION_CAP = 78;

export function getLevelCap(badgeCount: number): number {
  if (badgeCount >= 8) return CHAMPION_CAP;
  if (badgeCount < 0) return PLATINUM_GYM_LEADERS[0].levelCap;
  return PLATINUM_GYM_LEADERS[badgeCount]?.levelCap ?? CHAMPION_CAP;
}

export function getNextGymLeader(
  badgeCount: number
): GymLeader | { name: string; type: string; badge: string; levelCap: number } {
  if (badgeCount >= 8) {
    return {
      name: "Cynthia",
      type: "Mixed",
      badge: "Champion",
      levelCap: CHAMPION_CAP,
    };
  }
  return PLATINUM_GYM_LEADERS[badgeCount];
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
