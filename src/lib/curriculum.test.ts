import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { BOSSES, CLASSES, daysInClass, daysUntil, examItems, examOpen, grade, periodsDone, pickItems, startExam, timetable, weekday, withExamGame, withExamPuzzle, withPeriod } from "./curriculum";
import { MASTER_GAMES } from "@/data/master-games";
import { OPENINGS } from "@/data/openings";
import { DEFAULT_PROGRESS, type Progress } from "./progress";
import { schoolDone } from "./school";
import { THEMES } from "./adaptive";

const P: Progress = { ...DEFAULT_PROGRESS, schoolClass: 1, schoolClassSince: "2026-10-01" };
const MON = "2026-10-26", TUE = "2026-10-27", WED = "2026-10-28", THU = "2026-10-29", FRI = "2026-10-30", SAT = "2026-10-31", SUN = "2026-11-01";

describe("curriculum", () => {
  it("knows the weekday", () => {
    expect([MON, TUE, WED, THU, FRI, SAT, SUN].map(weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it("every class refers to real content", () => {
    for (const c of CLASSES) {
      for (const o of c.openings) expect(OPENINGS.some((x) => x.id === o), o).toBe(true);
      for (const t of c.tactics) expect(THEMES.mike.some((x) => x.id === t), t).toBe(true);
      for (const b of c.endgames) expect(BOSSES.some((x) => x.id === b), b).toBe(true);
      for (const g of c.games) expect(MASTER_GAMES.some((x) => x.id === g), g).toBe(true);
      expect(c.exam.pass).toBeLessThanOrEqual(c.exam.puzzles);
    }
  });
  it("bosses are legal positions with the right side to move; master games are legal and end in mate", () => {
    for (const b of BOSSES) { const c = new Chess(b.fen); expect(c.turn()).toBe(b.side); expect(c.isGameOver()).toBe(false); }
    for (const g of MASTER_GAMES) {
      const c = new Chess();
      for (const m of g.moves) c.move(m);
      expect(c.isCheckmate()).toBe(true);
      expect(g.from % 2).toBe(g.hero === "w" ? 0 : 1);
      for (const k of Object.keys(g.notes)) expect(Number(k)).toBeLessThan(g.moves.length);
    }
  });
  it("builds a four-period timetable that rotates by weekday and is stable per day", () => {
    const t = timetable(P, MON);
    expect(t.map((x) => x.kind)).toEqual(["warmup", "opening", "game", "homework"]);
    expect(timetable(P, TUE)[1]!.kind).toBe("tactic");
    expect(timetable(P, WED)[1]!.kind).toBe("endgame");
    expect(timetable(P, THU)[1]!.kind).toBe("strategy");
    expect(timetable(P, FRI)[1]!.kind).toBe("tactic"); // exam not open yet
    expect(timetable(P, SAT)[1]!.kind).toBe("opening");
    expect(timetable(P, SUN)[1]!.kind).toBe("strategy");
    expect(timetable(P, MON)).toEqual(t);
    expect(t[2]!.ref).toMatch(/^1450:[wb]$/);
    expect(t.every((x) => x.mike.length > 10)).toBe(true);
  });
  it("drills the player's own repertoire when one is chosen", () => {
    expect(["italiensk", "carokann"]).toContain(timetable(P, MON)[1]!.ref);
    expect(timetable(P, MON, null, ["spansk"])[1]!.ref).toBe("spansk");
    expect(timetable(P, WED, 2, ["london", "slavisk"])[1]!.ref).toMatch(/london|slavisk/);
  });
  it("switches to tournament prep in the last week before a tournament", () => {
    expect(timetable(P, WED, 3)[1]!.kind).toBe("opening");
    expect(timetable(P, WED, 3)[1]!.title).toMatch(/Turneringsuke/);
    expect(timetable(P, WED, 9)[1]!.kind).toBe("endgame");
    expect(daysUntil(WED, "2026-10-31")).toBe(3);
    expect(daysUntil(WED, "")).toBeNull();
  });
  it("homework follows the notebook", () => {
    const p: Progress = { ...P, notebook: { entries: [], patterns: { missedMate: 3, hanging: 1 } } };
    expect(timetable(p, MON)[3]!.ref).toBe("mateIn2");
  });
  it("picks distinct puzzles per theme and enough for an exam", () => {
    for (const t of THEMES.mike) {
      const items = pickItems(t.id, 3, MON);
      expect(items).toHaveLength(3);
      expect(new Set(items.map((i) => i.id)).size).toBe(3);
      expect(items.every((i) => i.line.length >= 2)).toBe(true);
    }
    expect(pickItems("fork", 3, MON)).toEqual(pickItems("fork", 3, MON));
    expect(pickItems("fork", 3, MON)).not.toEqual(pickItems("fork", 3, TUE));
    expect(examItems(CLASSES[0]!, FRI)).toHaveLength(6);
  });
  it("credits periods, closes the day on the fourth and keeps a report card", () => {
    let p = P;
    for (let i = 0; i < 3; i++) p = withPeriod(p, MON, i, "tactic", i !== 1);
    expect(periodsDone(p, MON)).toBe(3);
    expect(schoolDone(p, MON)).toBe(false);
    p = withPeriod(p, MON, 3, "tactic", true);
    expect(schoolDone(p, MON)).toBe(true);
    expect(p.xp).toBe(4 * 15 + 40);
    expect(withPeriod(p, MON, 3).xp).toBe(p.xp); // never twice
    expect(grade(p, "tactic")).toEqual({ letter: "B", pct: 75 });
    expect(grade(p, "opening").letter).toBe("–");
  });
  it("opens the exam after four school days and promotes on a won or drawn game", () => {
    let p = P;
    for (const d of [MON, TUE, WED, THU]) for (let i = 0; i < 4; i++) p = withPeriod(p, d, i);
    expect(daysInClass(p)).toBe(4);
    expect(examOpen(p, FRI)).toBe(true);
    expect(examOpen(p, THU)).toBe(false);
    expect(timetable(p, FRI)[1]!.kind).toBe("exam");
    p = startExam(p, FRI);
    for (let i = 0; i < 5; i++) p = withExamPuzzle(p, true);
    expect(p.schoolExam?.stage).toBe("game");
    const lost = withExamGame(p, "loss", FRI);
    expect(lost.schoolExam?.stage).toBe("failed");
    expect(lost.schoolClass).toBe(1);
    expect(periodsDone(lost, FRI)).toBe(1); // the day moves on
    expect(withExamGame(p, "stopped", FRI).schoolExam?.stage).toBe("game");
    const won = withExamGame(p, "draw", FRI);
    expect(won.schoolClass).toBe(2);
    expect(won.schoolClassSince).toBe(FRI);
    expect(won.schoolPassed).toEqual([1]);
    expect(won.coins).toBe(P.coins + 50);
    expect(daysInClass(won)).toBe(0);
    expect(timetable(won, MON)[2]!.ref).toMatch(/^1520/);
  });
  it("fails the exam early when the pass mark is out of reach", () => {
    let p = startExam({ ...P, schoolClassSince: "2026-01-01" }, FRI);
    p = withExamPuzzle(p, false); p = withExamPuzzle(p, false);
    expect(p.schoolExam?.stage).toBe("failed");
    expect(periodsDone(p, FRI)).toBe(1);
  });
});
