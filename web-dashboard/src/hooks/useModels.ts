"use client";

import { useState, useEffect } from "react";

export interface ModelInfo {
  value: string;
  displayName: string;
  description?: string;
}

export function useModels(authenticated: boolean) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authenticated) return;

    setLoading(true);
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        if (data.models) {
          setModels(data.models);
        }
      })
      .catch(() => {
        // Fallback models if the API call fails
        setModels([
          { value: "default", displayName: "Default (recommended)" },
          { value: "sonnet", displayName: "Sonnet" },
          { value: "haiku", displayName: "Haiku" },
        ]);
      })
      .finally(() => setLoading(false));
  }, [authenticated]);

  return { models, loading };
}
