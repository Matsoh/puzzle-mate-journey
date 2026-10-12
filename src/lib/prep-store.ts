import { useSyncExternalStore } from "react";
import { emptyPrep, migratePrep, type PrepState } from "./prep";

const KEY = "goblin-chess.prep.v1";
const SERVER = emptyPrep();
let state = SERVER;
let loaded = false;
const listeners = new Set<() => void>();

const get = () => {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = migratePrep(JSON.parse(raw));
    } catch {
      /* fresh */
    }
  }
  return state;
};
export function updatePrep(f: (s: PrepState) => PrepState) {
  state = f(get());
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l());
}
export const readPrep = get;
export function usePrep(): PrepState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get,
    () => SERVER,
  );
}
