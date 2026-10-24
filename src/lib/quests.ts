// Dagens tre oppdrag — rene regler uten nettleser-API, testet i quests.test.ts.
import type { Progress } from "./progress";

export type QuestId = "puzzles" | "game" | "win";
export type Quest = {
  id: QuestId;
  title: string;
  /** Short hint shown under the title. */
  hint: string;
  done: number;
  goal: number;
  xp: number;
  to: "/pusler" | "/stigen";
};

export const QUEST_BONUS_XP = 40;
export const questCreditId = (day: string) => `quests:${day}`;

/** Games played/won on a given day (kept for the last few days only). */
export function dayStat(p: Progress, day: string): { games: number; wins: number } {
  return p.dayStats?.[day] ?? { games: 0, wins: 0 };
}

/** Pure: bump today's game counter, dropping days older than two weeks. */
export function withDayGame(p: Progress, day: string, won: boolean): Progress {
  const cur = dayStat(p, day);
  const next = { ...(p.dayStats ?? {}), [day]: { games: cur.games + 1, wins: cur.wins + (won ? 1 : 0) } };
  const keys = Object.keys(next).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 14))) delete next[k];
  return { ...p, dayStats: next };
}

export function dailyQuests(p: Progress, day: string): Quest[] {
  const puzzles = p.daily && p.daily.day === day ? Object.keys(p.daily.results).length : 0;
  const d = dayStat(p, day);
  return [
    { id: "puzzles", title: "Løs 5 oppgaver", hint: "Dagens oppgaver", done: Math.min(5, puzzles), goal: 5, xp: 15 * 5, to: "/pusler" },
    { id: "game", title: "Spill ett parti", hint: "Mot neste på stigen", done: Math.min(1, d.games), goal: 1, xp: 50, to: "/stigen" },
    { id: "win", title: "Vinn ett parti", hint: "Uansett motstander", done: Math.min(1, d.wins), goal: 1, xp: 50, to: "/stigen" },
  ];
}

export const questDone = (q: Quest) => q.done >= q.goal;
export const allQuestsDone = (qs: Quest[]) => qs.every(questDone);

/** Level titles — the highest entry at or below the level applies. */
export const LEVEL_TITLES: [number, string][] = [
  [1, "Rekrutt"],
  [2, "Bonde"],
  [3, "Bondestormer"],
  [5, "Springer"],
  [7, "Løper"],
  [10, "Tårn"],
  [13, "Dronningjeger"],
  [16, "Mester"],
  [20, "Stormesterkandidat"],
  [25, "Legende"],
];

export function levelTitle(level: number): string {
  let title = LEVEL_TITLES[0]![1];
  for (const [min, t] of LEVEL_TITLES) if (level >= min) title = t;
  return title;
}
