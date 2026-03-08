// ---------------------------------------------------------------------------
// Trainer Database — Gym Leaders, Elite 4, Champions for NDS games
// Data verified against Bulbapedia (March 2026)
// ---------------------------------------------------------------------------

export interface TrainerPokemon {
  name: string;
  pokemonID: number;
  level: number;
  types: string[];
  moves: string[];
  ability?: string;
  item?: string;
}

export interface ImportantTrainer {
  name: string;
  type: string;
  badge?: number; // 1-8 for gym leaders, 0 for E4/champion
  location: string;
  team: TrainerPokemon[];
  role: "gym" | "elite4" | "champion";
  tips?: string[];
}

export interface GameTrainerData {
  gymLeaders: ImportantTrainer[];
  elite4: ImportantTrainer[];
  champion: ImportantTrainer;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLATINUM  (verified via Bulbapedia)
// ═══════════════════════════════════════════════════════════════════════════
const PLATINUM: GameTrainerData = {
  gymLeaders: [
    {
      name: "Roark", type: "Rock", badge: 1, location: "Oreburgh City", role: "gym",
      tips: ["Grass/Water/Fighting all work well", "Cranidos has Mold Breaker — ignores abilities like Sturdy"],
      team: [
        { name: "Geodude", pokemonID: 74, level: 12, types: ["Rock", "Ground"], moves: ["Rock Throw", "Stealth Rock"], ability: "Rock Head" },
        { name: "Onix", pokemonID: 95, level: 12, types: ["Rock", "Ground"], moves: ["Rock Throw", "Screech", "Stealth Rock"], ability: "Rock Head" },
        { name: "Cranidos", pokemonID: 408, level: 14, types: ["Rock"], moves: ["Headbutt", "Pursuit", "Leer"], ability: "Mold Breaker" },
      ],
    },
    {
      name: "Gardenia", type: "Grass", badge: 2, location: "Eterna City", role: "gym",
      tips: ["Fire/Flying/Poison resist her STAB", "Roserade has Stun Spore — lead with something fast"],
      team: [
        { name: "Turtwig", pokemonID: 387, level: 20, types: ["Grass"], moves: ["Grass Knot", "Razor Leaf", "Sunny Day", "Reflect"], ability: "Overgrow" },
        { name: "Cherrim", pokemonID: 421, level: 20, types: ["Grass"], moves: ["Grass Knot", "Magical Leaf", "Leech Seed", "Safeguard"], ability: "Flower Gift" },
        { name: "Roserade", pokemonID: 407, level: 22, types: ["Grass", "Poison"], moves: ["Grass Knot", "Magical Leaf", "Poison Sting", "Stun Spore"], ability: "Natural Cure", item: "Sitrus Berry" },
      ],
    },
    {
      name: "Maylene", type: "Fighting", badge: 3, location: "Veilstone City", role: "gym",
      tips: ["Flying/Psychic are ideal", "Meditite has Pure Power — doubles ATK", "Meditite leads with Fake Out — expect to lose first turn"],
      team: [
        { name: "Meditite", pokemonID: 307, level: 28, types: ["Fighting", "Psychic"], moves: ["Drain Punch", "Confusion", "Fake Out", "Rock Tomb"], ability: "Pure Power" },
        { name: "Machoke", pokemonID: 67, level: 29, types: ["Fighting"], moves: ["Karate Chop", "Strength", "Focus Energy", "Rock Tomb"], ability: "Guts" },
        { name: "Lucario", pokemonID: 448, level: 32, types: ["Fighting", "Steel"], moves: ["Drain Punch", "Metal Claw", "Bone Rush", "Force Palm"], ability: "Steadfast" },
      ],
    },
    {
      name: "Crasher Wake", type: "Water", badge: 4, location: "Pastoria City", role: "gym",
      tips: ["Grass hits both Gyarados and Quagsire super-effectively", "Gyarados has Intimidate — lead with a special attacker", "Floatzel's Aqua Jet bypasses speed"],
      team: [
        { name: "Gyarados", pokemonID: 130, level: 33, types: ["Water", "Flying"], moves: ["Brine", "Waterfall", "Bite", "Twister"], ability: "Intimidate" },
        { name: "Quagsire", pokemonID: 195, level: 34, types: ["Water", "Ground"], moves: ["Water Pulse", "Mud Shot", "Rock Tomb", "Yawn"], ability: "Damp" },
        { name: "Floatzel", pokemonID: 419, level: 37, types: ["Water"], moves: ["Brine", "Crunch", "Ice Fang", "Aqua Jet"], ability: "Swift Swim", item: "Sitrus Berry" },
      ],
    },
    {
      name: "Fantina", type: "Ghost", badge: 5, location: "Hearthome City", role: "gym",
      tips: ["Dark-type moves are your best bet", "All 3 have Levitate — Ground moves are useless", "Mismagius has high SpA — don't let it set up"],
      team: [
        { name: "Duskull", pokemonID: 355, level: 24, types: ["Ghost"], moves: ["Will-O-Wisp", "Future Sight", "Shadow Sneak", "Pursuit"], ability: "Levitate" },
        { name: "Haunter", pokemonID: 93, level: 24, types: ["Ghost", "Poison"], moves: ["Shadow Claw", "Sucker Punch", "Confuse Ray", "Hypnosis"], ability: "Levitate" },
        { name: "Mismagius", pokemonID: 429, level: 26, types: ["Ghost"], moves: ["Shadow Ball", "Psybeam", "Magical Leaf", "Confuse Ray"], ability: "Levitate", item: "Sitrus Berry" },
      ],
    },
    {
      name: "Byron", type: "Steel", badge: 6, location: "Canalave City", role: "gym",
      tips: ["Fire/Fighting/Ground are key", "Bastiodon has Sturdy — can't OHKO from full HP", "Magneton has Magnet Pull — traps Steel-types"],
      team: [
        { name: "Magneton", pokemonID: 82, level: 37, types: ["Electric", "Steel"], moves: ["Flash Cannon", "Thunderbolt", "Tri Attack", "Metal Sound"], ability: "Magnet Pull" },
        { name: "Steelix", pokemonID: 208, level: 38, types: ["Steel", "Ground"], moves: ["Flash Cannon", "Earthquake", "Ice Fang", "Sandstorm"], ability: "Rock Head" },
        { name: "Bastiodon", pokemonID: 411, level: 41, types: ["Rock", "Steel"], moves: ["Metal Burst", "Stone Edge", "Iron Defense", "Taunt"], ability: "Sturdy", item: "Sitrus Berry" },
      ],
    },
    {
      name: "Candice", type: "Ice", badge: 7, location: "Snowpoint City", role: "gym",
      tips: ["Fire/Fighting/Rock/Steel all work", "Abomasnow sets up Hail via Snow Warning — chip damage adds up", "Froslass has Snow Cloak evasion in Hail + Double Team"],
      team: [
        { name: "Sneasel", pokemonID: 215, level: 40, types: ["Dark", "Ice"], moves: ["Faint Attack", "Ice Shard", "Slash", "Aerial Ace"], ability: "Keen Eye" },
        { name: "Piloswine", pokemonID: 221, level: 40, types: ["Ice", "Ground"], moves: ["Hail", "Earthquake", "Stone Edge", "Avalanche"], ability: "Oblivious" },
        { name: "Abomasnow", pokemonID: 460, level: 42, types: ["Grass", "Ice"], moves: ["Wood Hammer", "Focus Blast", "Water Pulse", "Avalanche"], ability: "Snow Warning" },
        { name: "Froslass", pokemonID: 478, level: 44, types: ["Ice", "Ghost"], moves: ["Shadow Ball", "Double Team", "Psychic", "Blizzard"], ability: "Snow Cloak", item: "Sitrus Berry" },
      ],
    },
    {
      name: "Volkner", type: "Electric", badge: 8, location: "Sunyshore City", role: "gym",
      tips: ["Ground is king here — hits 3/4 super-effectively", "Electivire has Motor Drive — DO NOT use Electric moves on it", "Luxray has Rivalry, NOT Intimidate"],
      team: [
        { name: "Jolteon", pokemonID: 135, level: 46, types: ["Electric"], moves: ["Charge Beam", "Thunder Wave", "Iron Tail", "Quick Attack"], ability: "Volt Absorb" },
        { name: "Raichu", pokemonID: 26, level: 46, types: ["Electric"], moves: ["Charge Beam", "Signal Beam", "Focus Blast", "Quick Attack"], ability: "Static" },
        { name: "Luxray", pokemonID: 405, level: 48, types: ["Electric"], moves: ["Thunder Fang", "Ice Fang", "Fire Fang", "Crunch"], ability: "Rivalry" },
        { name: "Electivire", pokemonID: 466, level: 50, types: ["Electric"], moves: ["Thunder Punch", "Fire Punch", "Giga Impact", "Quick Attack"], ability: "Motor Drive", item: "Sitrus Berry" },
      ],
    },
  ],
  elite4: [
    {
      name: "Aaron", type: "Bug", location: "Pokemon League", role: "elite4",
      tips: ["Rock-type moves hit most of his team hard", "Drapion is Poison/Dark, NOT Bug — don't rely on Fire", "Yanmega has Speed Boost — kill it fast"],
      team: [
        { name: "Yanmega", pokemonID: 469, level: 49, types: ["Bug", "Flying"], moves: ["Bug Buzz", "Air Slash", "U-turn", "Double Team"], ability: "Speed Boost" },
        { name: "Scizor", pokemonID: 212, level: 49, types: ["Bug", "Steel"], moves: ["X-Scissor", "Iron Head", "Night Slash", "Quick Attack"], ability: "Swarm" },
        { name: "Vespiquen", pokemonID: 416, level: 50, types: ["Bug", "Flying"], moves: ["Attack Order", "Defend Order", "Heal Order", "Power Gem"], ability: "Pressure" },
        { name: "Heracross", pokemonID: 214, level: 51, types: ["Bug", "Fighting"], moves: ["Megahorn", "Close Combat", "Night Slash", "Stone Edge"], ability: "Swarm" },
        { name: "Drapion", pokemonID: 452, level: 53, types: ["Poison", "Dark"], moves: ["X-Scissor", "Cross Poison", "Ice Fang", "Aerial Ace"], ability: "Battle Armor", item: "Sitrus Berry" },
      ],
    },
    {
      name: "Bertha", type: "Ground", location: "Pokemon League", role: "elite4",
      tips: ["Water/Grass hit most of her team", "Whiscash is Water/Ground — Grass does 4x", "Gliscor has 4x Ice weakness", "Rhyperior has Lightningrod — don't use Electric"],
      team: [
        { name: "Whiscash", pokemonID: 340, level: 50, types: ["Water", "Ground"], moves: ["Earth Power", "Aqua Tail", "Zen Headbutt", "Sandstorm"], ability: "Oblivious" },
        { name: "Gliscor", pokemonID: 472, level: 53, types: ["Ground", "Flying"], moves: ["Earthquake", "Ice Fang", "Fire Fang", "Thunder Fang"], ability: "Hyper Cutter" },
        { name: "Hippowdon", pokemonID: 450, level: 52, types: ["Ground"], moves: ["Earthquake", "Stone Edge", "Crunch", "Yawn"], ability: "Sand Stream" },
        { name: "Golem", pokemonID: 76, level: 52, types: ["Rock", "Ground"], moves: ["Earthquake", "Fire Punch", "Thunder Punch", "Sandstorm"], ability: "Rock Head" },
        { name: "Rhyperior", pokemonID: 464, level: 55, types: ["Ground", "Rock"], moves: ["Earthquake", "Rock Wrecker", "Megahorn", "Avalanche"], ability: "Lightningrod", item: "Sitrus Berry" },
      ],
    },
    {
      name: "Flint", type: "Fire", location: "Pokemon League", role: "elite4",
      tips: ["Water/Ground/Rock are strong here", "Infernape has Earthquake — Ground-types beware", "Magmortar has Thunderbolt + SolarBeam — wide coverage"],
      team: [
        { name: "Houndoom", pokemonID: 229, level: 52, types: ["Dark", "Fire"], moves: ["Flamethrower", "Sludge Bomb", "Dark Pulse", "Sunny Day"], ability: "Early Bird" },
        { name: "Flareon", pokemonID: 136, level: 55, types: ["Fire"], moves: ["Overheat", "Giga Impact", "Quick Attack", "Will-O-Wisp"], ability: "Flash Fire" },
        { name: "Rapidash", pokemonID: 78, level: 53, types: ["Fire"], moves: ["Flare Blitz", "Solar Beam", "Bounce", "Sunny Day"], ability: "Run Away" },
        { name: "Infernape", pokemonID: 392, level: 55, types: ["Fire", "Fighting"], moves: ["Flare Blitz", "Thunder Punch", "Mach Punch", "Earthquake"], ability: "Blaze" },
        { name: "Magmortar", pokemonID: 467, level: 57, types: ["Fire"], moves: ["Flamethrower", "Thunderbolt", "Solar Beam", "Hyper Beam"], ability: "Flame Body", item: "Sitrus Berry" },
      ],
    },
    {
      name: "Lucian", type: "Psychic", location: "Pokemon League", role: "elite4",
      tips: ["Dark-type moves are ideal", "Bronzong has Levitate — only Fire hits super-effectively", "Gallade has Leaf Blade + Stone Edge — wide coverage"],
      team: [
        { name: "Mr. Mime", pokemonID: 122, level: 53, types: ["Psychic"], moves: ["Psychic", "Thunderbolt", "Reflect", "Light Screen"], ability: "Soundproof" },
        { name: "Espeon", pokemonID: 196, level: 55, types: ["Psychic"], moves: ["Psychic", "Shadow Ball", "Quick Attack", "Signal Beam"], ability: "Synchronize" },
        { name: "Bronzong", pokemonID: 437, level: 54, types: ["Steel", "Psychic"], moves: ["Psychic", "Gyro Ball", "Earthquake", "Calm Mind"], ability: "Levitate" },
        { name: "Alakazam", pokemonID: 65, level: 56, types: ["Psychic"], moves: ["Psychic", "Energy Ball", "Focus Blast", "Recover"], ability: "Synchronize" },
        { name: "Gallade", pokemonID: 475, level: 59, types: ["Psychic", "Fighting"], moves: ["Drain Punch", "Psycho Cut", "Leaf Blade", "Stone Edge"], ability: "Steadfast", item: "Sitrus Berry" },
      ],
    },
  ],
  champion: {
    name: "Cynthia", type: "Mixed", location: "Pokemon League", role: "champion",
    tips: [
      "Garchomp is the biggest threat — Ice does 4x",
      "Spiritomb has NO weaknesses in Gen 4 (no Fairy type)",
      "Togekiss has Hustle (NOT Serene Grace) — its moves can miss",
      "Milotic has Marvel Scale — status moves boost its DEF",
      "Lucario has ExtremeSpeed — always goes first",
    ],
    team: [
      { name: "Spiritomb", pokemonID: 442, level: 58, types: ["Ghost", "Dark"], moves: ["Dark Pulse", "Psychic", "Silver Wind", "Shadow Ball"], ability: "Pressure" },
      { name: "Roserade", pokemonID: 407, level: 58, types: ["Grass", "Poison"], moves: ["Energy Ball", "Sludge Bomb", "Toxic", "Extrasensory"], ability: "Natural Cure" },
      { name: "Togekiss", pokemonID: 468, level: 60, types: ["Normal", "Flying"], moves: ["Air Slash", "Aura Sphere", "Water Pulse", "Shock Wave"], ability: "Hustle" },
      { name: "Lucario", pokemonID: 448, level: 60, types: ["Fighting", "Steel"], moves: ["Aura Sphere", "Extreme Speed", "Shadow Ball", "Stone Edge"], ability: "Steadfast" },
      { name: "Milotic", pokemonID: 350, level: 58, types: ["Water"], moves: ["Surf", "Ice Beam", "Mirror Coat", "Dragon Pulse"], ability: "Marvel Scale" },
      { name: "Garchomp", pokemonID: 445, level: 62, types: ["Dragon", "Ground"], moves: ["Dragon Rush", "Earthquake", "Flamethrower", "Giga Impact"], ability: "Sand Veil", item: "Sitrus Berry" },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Game lookup  (other games: TODO — only Platinum verified so far)
// ═══════════════════════════════════════════════════════════════════════════

const GAME_TRAINER_DATA: Record<string, GameTrainerData> = {
  "Pokemon Platinum": PLATINUM,
  // Diamond/Pearl, HGSS, BW, B2W2 — to be added later
};

export function getGameTrainerData(gameName?: string): GameTrainerData | null {
  if (!gameName) return null;
  return GAME_TRAINER_DATA[gameName] ?? null;
}

/**
 * Get the next important trainer(s) based on badge count.
 * Returns the next gym leader, or E4+Champion if all badges obtained.
 */
export function getUpcomingTrainers(
  badgeCount: number,
  gameName?: string,
): ImportantTrainer[] {
  const data = getGameTrainerData(gameName);
  if (!data) return [];

  if (badgeCount < 8) {
    const nextGym = data.gymLeaders.find((g) => g.badge === badgeCount + 1);
    return nextGym ? [nextGym] : [];
  }

  // All badges: show E4 + Champion
  return [...data.elite4, data.champion];
}

/**
 * Get a specific gym leader by badge number.
 */
export function getGymLeader(
  badgeNumber: number,
  gameName?: string,
): ImportantTrainer | null {
  const data = getGameTrainerData(gameName);
  if (!data) return null;
  return data.gymLeaders.find((g) => g.badge === badgeNumber) ?? null;
}
