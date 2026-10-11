import { useSyncExternalStore } from "react";
import { dayKey, nextStreak } from "./rules";

export type RatingPoint = { t: number; game: number; puzzle: number };
export type DailyState = { day: string; ids: string[]; results: Record<string, "solved" | "failed"> };

export type Progress = {
  version: 1;
  xp: number;
  rating: number;
  puzzleRating: number;
  streak: number;
  bestStreak: number;
  lastDay: string | null;
  history: RatingPoint[];
  beaten: string[];
  maxBeatenElo: number;
  badges: string[];
  games: number;
  wins: number;
  draws: number;
  puzzlesSolved: number;
  puzzlesTried: number;
  seenPuzzles: string[];
  daily: DailyState | null;
  muted: boolean;
};

export const DEFAULT_PROGRESS: Progress = {
  version: 1,
  xp: 0,
  rating: 1550,
  puzzleRating: 1550,
  streak: 0,
  bestStreak: 0,
  lastDay: null,
  history: [],
  beaten: [],
  maxBeatenElo: 0,
  badges: [],
  games: 0,
  wins: 0,
  draws: 0,
  puzzlesSolved: 0,
  puzzlesTried: 0,
  seenPuzzles: [],
  daily: null,
  muted: false,
};

// Key intentionally unchanged after renaming the app to "Goblin Chess" — do not bump, or saved progress is lost.
const KEY = "sjakkstorm.progress.v1";
let state: Progress = DEFAULT_PROGRESS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    /* corrupt storage — start fresh */
  }
}

export function getProgress(): Progress {
  load();
  return state;
}

export function updateProgress(fn: (p: Progress) => Progress) {
  load();
  state = fn(state);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full / private mode */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, () => DEFAULT_PROGRESS);
}

export const today = () => dayKey(new Date());

/** Mark today as an active training day (updates streak). */
export function markActive(p: Progress): Progress {
  const t = today();
  const streak = nextStreak(p.lastDay, t, p.streak);
  return { ...p, lastDay: t, streak, bestStreak: Math.max(p.bestStreak, streak) };
}

export function withHistoryPoint(p: Progress): Progress {
  const history = [...p.history, { t: Date.now(), game: p.rating, puzzle: p.puzzleRating }].slice(-300);
  return { ...p, history };
}
