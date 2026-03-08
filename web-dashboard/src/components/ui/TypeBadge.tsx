"use client";

const TYPE_COLORS: Record<string, string> = {
  NORMAL: "bg-type-normal",
  FIRE: "bg-type-fire",
  WATER: "bg-type-water",
  ELECTRIC: "bg-type-electric",
  GRASS: "bg-type-grass",
  ICE: "bg-type-ice",
  FIGHTING: "bg-type-fighting",
  POISON: "bg-type-poison",
  GROUND: "bg-type-ground",
  FLYING: "bg-type-flying",
  PSYCHIC: "bg-type-psychic",
  BUG: "bg-type-bug",
  ROCK: "bg-type-rock",
  GHOST: "bg-type-ghost",
  DRAGON: "bg-type-dragon",
  DARK: "bg-type-dark",
  STEEL: "bg-type-steel",
};

export function TypeBadge({ type }: { type: string }) {
  if (!type) return null;
  const colorClass = TYPE_COLORS[type.toUpperCase()] || "bg-pine-muted";
  return (
    <span
      className={`${colorClass} inline-block rounded-sm px-1.5 py-px text-[10px] font-bold uppercase text-white`}
    >
      {type.toUpperCase()}
    </span>
  );
}
