import fs from "fs";
import path from "path";
import type { TrackerState } from "./types";

type Subscriber = (state: TrackerState) => void;

const subscribers = new Set<Subscriber>();
let currentState: TrackerState | null = null;
let watcherInitialized = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function getStateFilePath(): string {
  return (
    process.env.STATE_FILE_PATH ||
    path.resolve(process.cwd(), "..", "ironmon_tracker", "tracker-state.json")
  );
}

function readStateFile(): TrackerState | null {
  try {
    const filePath = getStateFilePath();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw || raw.trim() === "[]") return null;
    return JSON.parse(raw) as TrackerState;
  } catch {
    return null;
  }
}

function notifySubscribers(state: TrackerState) {
  for (const sub of subscribers) {
    try {
      sub(state);
    } catch {
      // subscriber error, ignore
    }
  }
}

function onFileChange() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const state = readStateFile();
    if (state && state.timestamp !== currentState?.timestamp) {
      currentState = state;
      notifySubscribers(state);
    }
  }, 100);
}

function initWatcher() {
  if (watcherInitialized) return;
  watcherInitialized = true;

  const filePath = getStateFilePath();
  const dir = path.dirname(filePath);

  // Initial read
  currentState = readStateFile();

  // Watch file for changes
  try {
    fs.watch(dir, (eventType, filename) => {
      if (filename === path.basename(filePath)) {
        onFileChange();
      }
    });
  } catch {
    // Fallback: poll every 2 seconds
    setInterval(onFileChange, 2000);
  }
}

export function subscribe(callback: Subscriber): () => void {
  initWatcher();
  subscribers.add(callback);

  // Send current state immediately if available
  if (currentState) {
    callback(currentState);
  }

  return () => {
    subscribers.delete(callback);
  };
}

export function getCurrentState(): TrackerState | null {
  initWatcher();
  return currentState;
}
