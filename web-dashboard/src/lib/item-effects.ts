interface ItemEffect {
  name: string;
  shortDesc: string;
  atkMod?: (isPhysical: boolean) => number;
  spaMod?: (isPhysical: boolean) => number;
  damageMod?: number;
  defMod?: number;
  superEffectiveMod?: number;
  typeMod?: { type: string; multiplier: number };
}

export const ITEM_EFFECTS: Record<number, ItemEffect> = {
  220: {
    name: "Choice Band", shortDesc: "1.5x Phys ATK",
    atkMod: (phys) => phys ? 1.5 : 1,
  },
  297: {
    name: "Choice Specs", shortDesc: "1.5x Sp. ATK",
    spaMod: (phys) => phys ? 1 : 1.5,
  },
  270: { name: "Life Orb", shortDesc: "1.3x DMG", damageMod: 1.3 },
  538: { name: "Eviolite", shortDesc: "1.5x DEF/SPD", defMod: 1.5 },
  268: { name: "Expert Belt", shortDesc: "1.2x SE", superEffectiveMod: 1.2 },
  266: {
    name: "Muscle Band", shortDesc: "1.1x Phys",
    atkMod: (phys) => phys ? 1.1 : 1,
  },
  267: {
    name: "Wise Glasses", shortDesc: "1.1x Spec",
    spaMod: (phys) => phys ? 1 : 1.1,
  },
  // Type-boosting items (1.2x to matching type)
  222: { name: "Silver Powder", shortDesc: "1.2x Bug", typeMod: { type: "BUG", multiplier: 1.2 } },
  233: { name: "Metal Coat", shortDesc: "1.2x Steel", typeMod: { type: "STEEL", multiplier: 1.2 } },
  237: { name: "Soft Sand", shortDesc: "1.2x Ground", typeMod: { type: "GROUND", multiplier: 1.2 } },
  238: { name: "Hard Stone", shortDesc: "1.2x Rock", typeMod: { type: "ROCK", multiplier: 1.2 } },
  239: { name: "Miracle Seed", shortDesc: "1.2x Grass", typeMod: { type: "GRASS", multiplier: 1.2 } },
  240: { name: "BlackGlasses", shortDesc: "1.2x Dark", typeMod: { type: "DARK", multiplier: 1.2 } },
  241: { name: "Black Belt", shortDesc: "1.2x Fighting", typeMod: { type: "FIGHTING", multiplier: 1.2 } },
  242: { name: "Magnet", shortDesc: "1.2x Electric", typeMod: { type: "ELECTRIC", multiplier: 1.2 } },
  243: { name: "Mystic Water", shortDesc: "1.2x Water", typeMod: { type: "WATER", multiplier: 1.2 } },
  244: { name: "Sharp Beak", shortDesc: "1.2x Flying", typeMod: { type: "FLYING", multiplier: 1.2 } },
  245: { name: "Poison Barb", shortDesc: "1.2x Poison", typeMod: { type: "POISON", multiplier: 1.2 } },
  246: { name: "NeverMeltIce", shortDesc: "1.2x Ice", typeMod: { type: "ICE", multiplier: 1.2 } },
  247: { name: "Spell Tag", shortDesc: "1.2x Ghost", typeMod: { type: "GHOST", multiplier: 1.2 } },
  248: { name: "Twisted Spoon", shortDesc: "1.2x Psychic", typeMod: { type: "PSYCHIC", multiplier: 1.2 } },
  249: { name: "Charcoal", shortDesc: "1.2x Fire", typeMod: { type: "FIRE", multiplier: 1.2 } },
  250: { name: "Dragon Fang", shortDesc: "1.2x Dragon", typeMod: { type: "DRAGON", multiplier: 1.2 } },
  251: { name: "Silk Scarf", shortDesc: "1.2x Normal", typeMod: { type: "NORMAL", multiplier: 1.2 } },
  // Plates (1.2x to matching type)
  298: { name: "Flame Plate", shortDesc: "1.2x Fire", typeMod: { type: "FIRE", multiplier: 1.2 } },
  299: { name: "Splash Plate", shortDesc: "1.2x Water", typeMod: { type: "WATER", multiplier: 1.2 } },
  300: { name: "Zap Plate", shortDesc: "1.2x Electric", typeMod: { type: "ELECTRIC", multiplier: 1.2 } },
  301: { name: "Meadow Plate", shortDesc: "1.2x Grass", typeMod: { type: "GRASS", multiplier: 1.2 } },
  302: { name: "Icicle Plate", shortDesc: "1.2x Ice", typeMod: { type: "ICE", multiplier: 1.2 } },
  303: { name: "Fist Plate", shortDesc: "1.2x Fighting", typeMod: { type: "FIGHTING", multiplier: 1.2 } },
  304: { name: "Toxic Plate", shortDesc: "1.2x Poison", typeMod: { type: "POISON", multiplier: 1.2 } },
  305: { name: "Earth Plate", shortDesc: "1.2x Ground", typeMod: { type: "GROUND", multiplier: 1.2 } },
  306: { name: "Sky Plate", shortDesc: "1.2x Flying", typeMod: { type: "FLYING", multiplier: 1.2 } },
  307: { name: "Mind Plate", shortDesc: "1.2x Psychic", typeMod: { type: "PSYCHIC", multiplier: 1.2 } },
  308: { name: "Insect Plate", shortDesc: "1.2x Bug", typeMod: { type: "BUG", multiplier: 1.2 } },
  309: { name: "Stone Plate", shortDesc: "1.2x Rock", typeMod: { type: "ROCK", multiplier: 1.2 } },
  310: { name: "Spooky Plate", shortDesc: "1.2x Ghost", typeMod: { type: "GHOST", multiplier: 1.2 } },
  311: { name: "Draco Plate", shortDesc: "1.2x Dragon", typeMod: { type: "DRAGON", multiplier: 1.2 } },
  312: { name: "Dread Plate", shortDesc: "1.2x Dark", typeMod: { type: "DARK", multiplier: 1.2 } },
  313: { name: "Iron Plate", shortDesc: "1.2x Steel", typeMod: { type: "STEEL", multiplier: 1.2 } },
};

/** Stat-level modifier for attacker (Choice Band, Muscle Band, etc.) */
export function getAttackerItemStatMod(itemID: number, isPhysical: boolean): number {
  const effect = ITEM_EFFECTS[itemID];
  if (!effect) return 1;
  let mod = 1;
  if (effect.atkMod) mod *= effect.atkMod(isPhysical);
  if (effect.spaMod) mod *= effect.spaMod(isPhysical);
  return mod;
}

/** Final damage modifier for attacker (Life Orb, Expert Belt, type-boosting items) */
export function getAttackerItemDamageMod(itemID: number, typeMultiplier: number, moveType?: string): number {
  const effect = ITEM_EFFECTS[itemID];
  if (!effect) return 1;
  let mod = 1;
  if (effect.damageMod) mod *= effect.damageMod;
  if (effect.superEffectiveMod && typeMultiplier > 1) mod *= effect.superEffectiveMod;
  if (effect.typeMod && moveType && (moveType || "").toUpperCase() === effect.typeMod.type) {
    mod *= effect.typeMod.multiplier;
  }
  return mod;
}

/** Defensive stat modifier (Eviolite) */
export function getDefenderItemMod(itemID: number): number {
  const effect = ITEM_EFFECTS[itemID];
  if (!effect?.defMod) return 1;
  return effect.defMod;
}

export function getItemShortDesc(itemID: number): string | null {
  return ITEM_EFFECTS[itemID]?.shortDesc ?? null;
}
