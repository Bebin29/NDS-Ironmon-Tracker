"use client";

export function PokemonSprite({
  pokemonID,
  size = 68,
}: {
  pokemonID: number;
  size?: number;
}) {
  const spriteUrl =
    pokemonID > 0
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonID}.png`
      : null;

  if (!spriteUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-sm bg-pine-bg text-pine-muted"
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }

  return (
    <img
      src={spriteUrl}
      alt={`Pokemon #${pokemonID}`}
      width={size}
      height={size}
      className="pixelated"
    />
  );
}
