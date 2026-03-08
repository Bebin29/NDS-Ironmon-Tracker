"use client";

import { useState, useEffect, useCallback } from "react";
import type { RomTrainer, RomTrainerExport } from "@/lib/types";

interface UseTrainerDataResult {
  trainers: Map<number, RomTrainer>;
  trainersByBadge: Map<number, RomTrainer[]>;
  gameName: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTrainerData(currentGameName?: string): UseTrainerDataResult {
  const [data, setData] = useState<RomTrainerExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/trainers");
      if (!res.ok) {
        if (res.status === 404) {
          setData(null);
          setError(null);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as RomTrainerExport;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch trainer data");
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

  // Build lookup maps
  const trainers = new Map<number, RomTrainer>();
  const trainersByBadge = new Map<number, RomTrainer[]>();

  if (data?.trainers) {
    for (const trainer of data.trainers) {
      trainers.set(trainer.id, trainer);

      if (trainer.badgeNumber != null && trainer.badgeNumber > 0) {
        const existing = trainersByBadge.get(trainer.badgeNumber) || [];
        existing.push(trainer);
        trainersByBadge.set(trainer.badgeNumber, existing);
      }
    }
  }

  return {
    trainers,
    trainersByBadge,
    gameName: data?.gameName ?? null,
    loading,
    error,
    refetch: fetchData,
  };
}

/** Get important trainers (gym leaders, E4, champion, rivals) from ROM data */
export function getImportantTrainers(
  trainers: Map<number, RomTrainer>,
): {
  gymLeaders: RomTrainer[];
  elite4: RomTrainer[];
  rivals: RomTrainer[];
  other: RomTrainer[];
} {
  const gymLeaders: RomTrainer[] = [];
  const elite4: RomTrainer[] = [];
  const rivals: RomTrainer[] = [];
  const other: RomTrainer[] = [];

  for (const trainer of trainers.values()) {
    if (trainer.trainerType === 2) {
      gymLeaders.push(trainer);
    } else if (trainer.trainerType === 1) {
      rivals.push(trainer);
    } else if (trainer.groupName === "Elite 4" || trainer.groupName === "Elite 4 / Bosses") {
      elite4.push(trainer);
    } else if (trainer.groupName) {
      other.push(trainer);
    }
  }

  // Sort gym leaders by badge number
  gymLeaders.sort((a, b) => (a.badgeNumber ?? 0) - (b.badgeNumber ?? 0));

  return { gymLeaders, elite4, rivals, other };
}
