"use client";

import { useState, useRef, useEffect } from "react";
import type { TrackerState, GraveyardEntry } from "@/lib/types";

const STORAGE_KEY = "ironmon-graveyard";

function loadDeaths(): GraveyardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDeaths(deaths: GraveyardEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deaths));
}

export function useGraveyard(state: TrackerState | null) {
  const [deaths, setDeaths] = useState<GraveyardEntry[]>(loadDeaths);
  const prevPartyRef = useRef<Map<number, number>>(new Map());
  const prevRunRef = useRef<{ gameName: string; badgeCount: number } | null>(null);

  useEffect(() => {
    if (!state) return;

    // Detect run reset (game change or badge count dropping to 0)
    if (prevRunRef.current) {
      const prevRun = prevRunRef.current;
      const gameChanged = state.gameName !== prevRun.gameName;
      const badgeReset = prevRun.badgeCount > 0 && state.badgeCount === 0;
      if (gameChanged || badgeReset) {
        setDeaths([]);
        saveDeaths([]);
        prevPartyRef.current = new Map();
      }
    }
    prevRunRef.current = { gameName: state.gameName, badgeCount: state.badgeCount };

    const prev = prevPartyRef.current;
    const newDeaths: GraveyardEntry[] = [];

    for (const pokemon of state.party) {
      if (pokemon.isEgg === 1) continue;
      const prevHP = prev.get(pokemon.pid);

      if (
        prevHP !== undefined &&
        prevHP > 0 &&
        pokemon.curHP === 0 &&
        pokemon.maxHP > 0
      ) {
        const alreadyRecorded = deaths.some((d) => d.pid === pokemon.pid);
        if (!alreadyRecorded) {
          newDeaths.push({
            pid: pokemon.pid,
            pokemonID: pokemon.pokemonID,
            name: pokemon.name,
            nickname: pokemon.nickname,
            level: pokemon.level,
            location: state.location,
            timestamp: Date.now(),
            types: pokemon.types,
            killedBy: state.inBattle && state.enemy ? state.enemy.name : undefined,
            killedByLevel: state.inBattle && state.enemy ? state.enemy.level : undefined,
            wasWildEncounter: state.inBattle && state.enemy ? state.enemy.isWild : undefined,
          });
        }
      }
    }

    // Update prev party ref
    const nextMap = new Map<number, number>();
    for (const pokemon of state.party) {
      nextMap.set(pokemon.pid, pokemon.curHP);
    }
    prevPartyRef.current = nextMap;

    if (newDeaths.length > 0) {
      setDeaths((prev) => {
        const updated = [...prev, ...newDeaths];
        saveDeaths(updated);
        return updated;
      });
    }
  }, [state, deaths]);

  const clearGraveyard = () => {
    setDeaths([]);
    saveDeaths([]);
  };

  return { deaths, clearGraveyard };
}
