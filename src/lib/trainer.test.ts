import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { EXERCISES, dailyPlan, exercisesFor, checkMove, shouldAwardXp } from "./trainer";

describe("trainer exercises", () => {
  it("has at least 3 per profile", () => {
    expect(exercisesFor("magnus").length).toBeGreaterThanOrEqual(3);
    expect(exercisesFor("hikaru").length).toBeGreaterThanOrEqual(3);
  });
  it.each(EXERCISES)("$id: valid FEN and all accepted moves legal", (ex) => {
    const c = new Chess(ex.fen);
    const legal = c.moves();
    for (const m of ex.accept) expect(legal).toContain(m);
  });
  it("back-rank answer is mate", () => {
    const c = new Chess(EXERCISES.find((e) => e.id === "h-baklinje")!.fen);
    c.move("Ra8");
    expect(c.isCheckmate()).toBe(true);
  });
  it("every accepted defence leaves no mate in one", () => {
    const ex = EXERCISES.find((e) => e.id === "h-forsvar")!;
    for (const m of ex.accept) {
      const c = new Chess(ex.fen); c.move(m);
      const mate = c.moves().some((r) => { const x = new Chess(c.fen()); x.move(r); return x.isCheckmate(); });
      expect(mate).toBe(false);
    }
  });
  it("fork wins the queen", () => {
    const c = new Chess(EXERCISES.find((e) => e.id === "h-gaffel")!.fen);
    c.move("Nf7+");
    expect(c.moves()).toEqual(["Kg8"]);
  });
  it("checkMove grades right, wrong and illegal", () => {
    const ex = EXERCISES.find((e) => e.id === "m-fribonde")!;
    expect(checkMove(ex, "a6", "a7")).toMatchObject({ legal: true, correct: true });
    expect(checkMove(ex, "g1", "h2")).toMatchObject({ legal: true, correct: false });
    expect(checkMove(ex, "a6", "a5")).toEqual({ legal: false });
  });
});

describe("daily plan", () => {
  it("differs between profiles and is deterministic", () => {
    expect(dailyPlan("magnus", "2026-10-11").advice).not.toBe(dailyPlan("hikaru", "2026-10-11").advice);
    expect(dailyPlan("magnus", "2026-10-11")).toEqual(dailyPlan("magnus", "2026-10-11"));
    expect(dailyPlan("hikaru", "2026-10-11").exercise.coach).toBe("hikaru");
  });
  it("awards session XP only once", () => {
    expect(shouldAwardXp({ exercise: true, reflection: "", done: true, xpGiven: false })).toBe(true);
    expect(shouldAwardXp({ exercise: true, reflection: "", done: true, xpGiven: true })).toBe(false);
    expect(shouldAwardXp(undefined)).toBe(false);
  });
});
