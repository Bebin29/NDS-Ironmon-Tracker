"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { TrackerState, EncounterData } from "@/lib/types";

export type RouteStatus = "caught" | "failed" | "skipped";

export interface RouteClaimEntry {
  routeName: string;
  status: RouteStatus;
  pokemonName?: string;
  pokemonID?: number;
  timestamp: number;
}

const STORAGE_KEY = "ironmon-encounter-checklist";

function loadChecklist(): Record<string, RouteClaimEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveChecklist(data: Record<string, RouteClaimEntry>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useEncounterChecklist(state: TrackerState | null) {
  const [claims, setClaims] = useState<Record<string, RouteClaimEntry>>(loadChecklist);
  const prevSeenRef = useRef<Record<string, number>>({});
  const prevRunRef = useRef<{ gameName: string; badgeCount: number } | null>(null);

  // Run reset detection (same pattern as useGraveyard)
  useEffect(() => {
    if (!state) return;

    if (prevRunRef.current) {
      const prev = prevRunRef.current;
      const gameChanged = state.gameName !== prev.gameName;
      const badgeReset = prev.badgeCount > 0 && state.badgeCount === 0;
      if (gameChanged || badgeReset) {
        setClaims({});
        saveChecklist({});
        prevSeenRef.current = {};
      }
    }
    prevRunRef.current = { gameName: state.gameName, badgeCount: state.badgeCount };
  }, [state]);

  // Auto-detect new encounters
  useEffect(() => {
    if (!state?.encounters) return;

    const { routes } = state.encounters;
    const prevSeen = prevSeenRef.current;
    const newClaims = { ...claims };
    let changed = false;

    for (const [routeName, routeData] of Object.entries(routes)) {
      const currentSeen = routeData.seen.length;
      const previousSeen = prevSeen[routeName] ?? 0;

      // New first encounter on this route — default to "caught"
      if (previousSeen === 0 && currentSeen > 0 && !newClaims[routeName]) {
        const firstPokemon = routeData.seen[0];
        newClaims[routeName] = {
          routeName,
          status: "caught",
          pokemonName: firstPokemon.name,
          pokemonID: firstPokemon.pokemonID,
          timestamp: Date.now(),
        };
        changed = true;
      }

      prevSeen[routeName] = currentSeen;
    }

    prevSeenRef.current = prevSeen;
    if (changed) {
      setClaims(newClaims);
      saveChecklist(newClaims);
    }
  }, [state?.encounters, claims]);

  const setRouteStatus = useCallback((routeName: string, status: RouteStatus, pokemonName?: string, pokemonID?: number) => {
    setClaims((prev) => {
      const updated = {
        ...prev,
        [routeName]: {
          routeName,
          status,
          pokemonName: pokemonName ?? prev[routeName]?.pokemonName,
          pokemonID: pokemonID ?? prev[routeName]?.pokemonID,
          timestamp: Date.now(),
        },
      };
      saveChecklist(updated);
      return updated;
    });
  }, []);

  const removeRouteClaim = useCallback((routeName: string) => {
    setClaims((prev) => {
      const updated = { ...prev };
      delete updated[routeName];
      saveChecklist(updated);
      return updated;
    });
  }, []);

  const clearChecklist = useCallback(() => {
    setClaims({});
    saveChecklist({});
  }, []);

  // Compute summary
  const claimList = Object.values(claims);
  const summary = {
    caught: claimList.filter((c) => c.status === "caught").length,
    failed: claimList.filter((c) => c.status === "failed").length,
    skipped: claimList.filter((c) => c.status === "skipped").length,
    total: claimList.length,
  };

  return { claims, setRouteStatus, removeRouteClaim, clearChecklist, summary };
}
