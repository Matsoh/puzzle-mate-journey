import { describe, expect, it } from "vitest";
import { DEFAULT_PROGRESS, type Progress } from "./progress";
import { allQuestsDone, dailyQuests, dayStat, levelTitle, withDayGame } from "./quests";
import { mikeHomeLine } from "./mike";

const DAY = "2026-10-24";

describe("daily quests", () => {
  it("starts with nothing done", () => {
    const q = dailyQuests(DEFAULT_PROGRESS, DAY);
    expect(q.map((x) => x.done)).toEqual([0, 0, 0]);
    expect(allQuestsDone(q)).toBe(false);
  });

  it("counts today's puzzles but not yesterday's", () => {
    const p: Progress = { ...DEFAULT_PROGRESS, daily: { day: DAY, ids: ["a", "b", "c", "d", "e"], results: { a: "solved", b: "failed" } } };
    expect(dailyQuests(p, DAY)[0]!.done).toBe(2);
    expect(dailyQuests(p, "2026-10-25")[0]!.done).toBe(0);
  });

  it("records games and wins per day and completes all three", () => {
    let p = withDayGame(DEFAULT_PROGRESS, DAY, false);
    expect(dayStat(p, DAY)).toEqual({ games: 1, wins: 0 });
    p = withDayGame(p, DAY, true);
    p = { ...p, daily: { day: DAY, ids: ["a", "b", "c", "d", "e"], results: { a: "solved", b: "solved", c: "solved", d: "failed", e: "solved" } } };
    expect(allQuestsDone(dailyQuests(p, DAY))).toBe(true);
  });

  it("keeps only the last two weeks of day stats", () => {
    let p = DEFAULT_PROGRESS;
    for (let d = 1; d <= 20; d++) p = withDayGame(p, `2026-10-${String(d).padStart(2, "0")}`, false);
    expect(Object.keys(p.dayStats)).toHaveLength(14);
    expect(p.dayStats["2026-10-06"]).toBeUndefined();
    expect(p.dayStats["2026-10-20"]).toBeDefined();
  });

  it("tolerates old saves without dayStats", () => {
    const old = { ...DEFAULT_PROGRESS } as Partial<Progress>;
    delete old.dayStats;
    expect(dayStat(old as Progress, DAY)).toEqual({ games: 0, wins: 0 });
  });
});

describe("level titles", () => {
  it("picks the highest title at or below the level", () => {
    expect(levelTitle(1)).toBe("Rekrutt");
    expect(levelTitle(4)).toBe("Bondestormer");
    expect(levelTitle(10)).toBe("Tårn");
    expect(levelTitle(99)).toBe("Legende");
  });
});

describe("Mike", () => {
  it("is stable within a day and changes with progress", () => {
    const q = dailyQuests(DEFAULT_PROGRESS, DAY);
    const a = mikeHomeLine(DEFAULT_PROGRESS, q, DAY, 0);
    expect(mikeHomeLine(DEFAULT_PROGRESS, q, DAY, 0)).toEqual(a);
    const done = q.map((x) => ({ ...x, done: x.goal }));
    expect(mikeHomeLine(DEFAULT_PROGRESS, done, DAY, 0).mood).toBe("happy");
    expect(mikeHomeLine(DEFAULT_PROGRESS, q, DAY, 5).text).toContain("5");
  });
});
