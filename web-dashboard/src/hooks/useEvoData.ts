"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { RomEvolution, RomEvoExport } from "@/lib/types";

interface UseEvoDataResult {
  /** Map from speciesID (string) to its evolutions */
  evolutions: Map<string, RomEvolution[]>;
  gameName: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEvoData(currentGameName?: string): UseEvoDataResult {
  const [data, setData] = useState<RomEvoExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/evolutions");
      if (!res.ok) {
        if (res.status === 404) {
          setData(null);
          setError(null);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as RomEvoExport;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch evolution data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch when game changes
  useEffect(() => {
    if (currentGameName && data && data.gameName !== currentGameName) {
      fetchData();
    }
  }, [currentGameName, data, fetchData]);

  const evolutions = useMemo(() => {
    const map = new Map<string, RomEvolution[]>();
    if (data?.evolutions) {
      for (const [speciesID, evos] of Object.entries(data.evolutions)) {
        map.set(speciesID, evos);
      }
    }
    return map;
  }, [data]);

  return {
    evolutions,
    gameName: data?.gameName ?? null,
    loading,
    error,
    refetch: fetchData,
  };
}

/** Build a forward evolution chain for a given species ID. */
export function getEvoChain(
  speciesID: number,
  evolutions: Map<string, RomEvolution[]>,
  maxDepth = 3,
): EvoChainNode {
  const root: EvoChainNode = { speciesID, name: "", evolvesTo: [] };
  buildChain(root, evolutions, 0, maxDepth, new Set([speciesID]));
  return root;
}

export interface EvoChainNode {
  speciesID: number;
  name: string;
  method?: string;
  param?: number;
  paramName?: string;
  evolvesTo: EvoChainNode[];
}

function buildChain(
  node: EvoChainNode,
  evolutions: Map<string, RomEvolution[]>,
  depth: number,
  maxDepth: number,
  visited: Set<number>,
) {
  if (depth >= maxDepth) return;
  const evos = evolutions.get(String(node.speciesID));
  if (!evos) return;
  for (const evo of evos) {
    if (visited.has(evo.targetID)) continue;
    const child: EvoChainNode = {
      speciesID: evo.targetID,
      name: evo.targetName,
      method: evo.method,
      param: evo.param,
      paramName: evo.paramName,
      evolvesTo: [],
    };
    visited.add(evo.targetID);
    node.evolvesTo.push(child);
    buildChain(child, evolutions, depth + 1, maxDepth, visited);
  }
}

/** Find the base (pre-evolution) form by walking backwards through the evo data. */
export function findBaseForm(
  speciesID: number,
  evolutions: Map<string, RomEvolution[]>,
): number {
  // Build a reverse map: targetID -> sourceID
  const reverseMap = new Map<number, number>();
  for (const [sourceID, evos] of evolutions.entries()) {
    for (const evo of evos) {
      reverseMap.set(evo.targetID, Number(sourceID));
    }
  }

  let current = speciesID;
  const visited = new Set<number>([current]);
  while (reverseMap.has(current)) {
    const prev = reverseMap.get(current)!;
    if (visited.has(prev)) break;
    visited.add(prev);
    current = prev;
  }
  return current;
}
