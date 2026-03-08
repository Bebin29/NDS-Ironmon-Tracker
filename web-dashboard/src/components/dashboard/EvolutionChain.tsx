"use client";

import type { RomEvolution } from "@/lib/types";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import { findBaseForm, getEvoChain, type EvoChainNode } from "@/hooks/useEvoData";

function formatMethod(node: EvoChainNode): string {
  if (!node.method) return "";
  switch (node.method) {
    case "Level Up":
      return node.param && node.param > 0 ? `Lv.${node.param}` : "Level Up";
    case "Level Up (ATK > DEF)":
      return `Lv.${node.param} ATK>DEF`;
    case "Level Up (ATK < DEF)":
      return `Lv.${node.param} ATK<DEF`;
    case "Level Up (ATK = DEF)":
      return `Lv.${node.param} ATK=DEF`;
    case "Stone":
    case "Use Item":
      return node.paramName || "Item";
    case "Trade":
      return node.paramName ? `Trade w/ ${node.paramName}` : "Trade";
    case "Friendship":
      return "Friendship";
    case "Friendship (Day)":
      return "Friend (Day)";
    case "Friendship (Night)":
      return "Friend (Night)";
    case "Level Up (Hold Item Day)":
    case "Level Up (Hold Item Night)":
      return node.paramName ? `Hold ${node.paramName}` : node.method;
    case "Level Up (Know Move)":
      return node.paramName ? `Know ${node.paramName}` : "Know Move";
    case "Level Up (Male)":
      return `Lv.${node.param} (M)`;
    case "Level Up (Female)":
      return `Lv.${node.param} (F)`;
    case "Beauty":
      return `Beauty ${node.param}`;
    default:
      return node.paramName || node.method;
  }
}

function EvoNode({
  node,
  currentSpeciesID,
  isFirst,
}: {
  node: EvoChainNode;
  currentSpeciesID: number;
  isFirst?: boolean;
}) {
  const isCurrent = node.speciesID === currentSpeciesID;

  return (
    <div className="flex items-center gap-1">
      {!isFirst && (
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-pine-muted">{"\u2192"}</span>
          <span className="max-w-[60px] text-center text-[8px] leading-tight text-pine-muted">
            {formatMethod(node)}
          </span>
        </div>
      )}
      <div
        className={`flex flex-col items-center rounded px-1 py-0.5 ${
          isCurrent
            ? "bg-pine-accent/20 ring-1 ring-pine-accent/40"
            : "opacity-60"
        }`}
      >
        <PokemonSprite pokemonID={node.speciesID} size={32} />
        <span className="text-[9px] text-pine-text">{node.name}</span>
      </div>
      {node.evolvesTo.length > 0 && (
        <>
          {node.evolvesTo.length === 1 ? (
            <EvoNode
              node={node.evolvesTo[0]}
              currentSpeciesID={currentSpeciesID}
            />
          ) : (
            <div className="flex flex-col gap-0.5">
              {node.evolvesTo.map((child) => (
                <div key={child.speciesID} className="flex items-center">
                  <EvoNode
                    node={child}
                    currentSpeciesID={currentSpeciesID}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function EvolutionChain({
  speciesID,
  speciesName,
  evolutions,
}: {
  speciesID: number;
  speciesName: string;
  evolutions: Map<string, RomEvolution[]>;
}) {
  if (evolutions.size === 0) return null;

  const baseID = findBaseForm(speciesID, evolutions);
  const chain = getEvoChain(baseID, evolutions);

  // Set the root name from chain data or fallback
  if (!chain.name) {
    // If root is current pokemon, use its name
    if (baseID === speciesID) {
      chain.name = speciesName;
    } else {
      // Try to find name from reverse lookup — evolutions that target this base
      chain.name = `#${baseID}`;
      // Search for any evo that targets one of the chain's children to find source name
      for (const [, evos] of evolutions.entries()) {
        for (const evo of evos) {
          if (evo.targetID === baseID) {
            chain.name = `#${baseID}`;
            break;
          }
        }
      }
    }
  }

  // Don't show if no evolutions exist (single-stage Pokemon)
  if (chain.evolvesTo.length === 0 && baseID === speciesID) {
    // Check if this pokemon is a final evo (something evolves into it)
    let isFinalEvo = false;
    for (const [, evos] of evolutions.entries()) {
      if (evos.some((e) => e.targetID === speciesID)) {
        isFinalEvo = true;
        break;
      }
    }
    if (!isFinalEvo) return null;
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      <EvoNode node={chain} currentSpeciesID={speciesID} isFirst />
    </div>
  );
}
