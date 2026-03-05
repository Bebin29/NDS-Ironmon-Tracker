"use client";

import { useEffect, useState, useRef } from "react";
import type { TrackerState } from "@/lib/types";

export function useTrackerState() {
  const [state, setState] = useState<TrackerState | null>(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    function connect() {
      const es = new EventSource("/api/state");
      eventSourceRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as TrackerState;
          setState(data);
          setConnected(true);
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        // Auto-reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  return { state, connected };
}
