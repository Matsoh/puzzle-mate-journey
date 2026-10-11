import { describe, expect, it } from "vitest";
import { CHESS_FACTS, PEPTALKS, dailyFact, dailyPeptalk, recentLadderWin, rememberLadderWin } from "./daily-coach";
import { DEFAULT_PROGRESS, type Progress } from "./progress";

const day = "2026-10-11";
const p = (patch: Partial<Progress> = {}): Progress => ({ ...DEFAULT_PROGRESS, lastDay: day, streak: 1, ...patch });

describe("daily coach rules", () => {
  it("rotates all ten approved facts once every ten days", () => {
    const facts = Array.from({ length: 10 }, (_, i) => dailyFact(`2026-10-${11 + i}`));
    expect(new Set(facts).size).toBe(10);
    expect(new Set(facts)).toEqual(new Set(CHESS_FACTS));
    expect(dailyFact(day)).toBe(dailyFact("2026-10-21"));
  });
  it("rotates forty motivational lines deterministically by day", () => {
    expect(PEPTALKS).toHaveLength(40);
    expect(dailyPeptalk(p(), day)).toEqual(dailyPeptalk(p(), day));
    expect(dailyPeptalk(p(), day).text).not.toBe(dailyPeptalk(p(), "2026-10-12").text);
  });
  it("nudges at zero streak or after missing yesterday", () => {
    expect(dailyPeptalk(p({ streak: 0 }), day).kind).toBe("return");
    expect(dailyPeptalk(p({ lastDay: "2026-10-09", streak: 9 }), day).kind).toBe("return");
  });
  it("praises a live streak at three days", () => {
    expect(dailyPeptalk(p({ streak: 2 }), day).kind).toBe("daily");
    expect(dailyPeptalk(p({ streak: 3 }), day).kind).toBe("streak3");
  });
  it("uses the stronger streak praise from seven days", () => {
    expect(dailyPeptalk(p({ streak: 6 }), day).kind).toBe("streak3");
    expect(dailyPeptalk(p({ streak: 7 }), day).kind).toBe("streak7");
  });
  it("recognizes five completed daily puzzles, not four or yesterday", () => {
    const daily = { day, ids: ["a", "b", "c", "d", "e"], results: { a: "solved", b: "failed", c: "solved", d: "solved", e: "solved" } } as const;
    const full = { ...daily, ids: [...daily.ids] };
    expect(dailyPeptalk(p({ daily: full }), day).kind).toBe("puzzles");
    expect(dailyPeptalk(p({ daily: { ...full, results: { a: "solved", b: "failed", c: "solved", d: "solved" } } }), day).kind).not.toBe("puzzles");
    expect(dailyPeptalk(p({ daily: { ...full, day: "2026-10-10" } }), day).kind).not.toBe("puzzles");
  });
  it("uses confirmed ladder wins and targets the next opponent", () => {
    const pep = dailyPeptalk(p({ beaten: ["pelle"] }), day, "pelle");
    expect(pep.kind).toBe("win");
    expect(pep.goal).toBe("Kaptein Kaos · 1560 i rating");
    expect(dailyPeptalk(p(), day, "pelle").kind).not.toBe("win");
  });
  it("approaches rating milestones within 25 points", () => {
    expect(dailyPeptalk(p({ rating: 1975 }), day).kind).toBe("milestone");
    expect(dailyPeptalk(p({ rating: 1974 }), day).kind).toBe("daily");
    expect(dailyPeptalk(p({ rating: 2000 }), day).kind).toBe("daily");
  });
  it("approaches an unearned puzzle badge within three solves", () => {
    expect(dailyPeptalk(p({ puzzlesSolved: 7 }), day).kind).toBe("badge");
    expect(dailyPeptalk(p({ puzzlesSolved: 6 }), day).kind).toBe("daily");
    expect(dailyPeptalk(p({ puzzlesSolved: 7, badges: ["pusler-10"] }), day).kind).toBe("daily");
  });
  it("expires victory context on the next day without touching progress", () => {
    const before = localStorage.getItem("sjakkstorm.progress.v1");
    rememberLadderWin("pelle", day);
    expect(recentLadderWin(day)).toBe("pelle");
    expect(recentLadderWin("2026-10-12")).toBeUndefined();
    expect(localStorage.getItem("sjakkstorm.progress.v1")).toBe(before);
  });
});