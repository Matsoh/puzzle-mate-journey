import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { moveAccuracy, reviewGame, type PlayedMove } from "./coach";
import type { AnalysisResult, StockfishEngine } from "./engine";

/** Fake engine: eval and best move per FEN (white cp), fallback = first legal move at 0. */
function fakeEngine(table: Record<string, Partial<AnalysisResult>>): StockfishEngine {
  return {
    setStrength: async () => {},
    analyse: async (fen: string): Promise<AnalysisResult> => {
      const c = new Chess(fen);
      const first = c.moves({ verbose: true })[0]!;
      const base: AnalysisResult = { cp: 0, bestMove: first.from + first.to, pv: [first.from + first.to] };
      const row = table[fen] ?? {};
      const bestMove = row.bestMove ?? base.bestMove;
      // engine reports from side-to-move; our table is white-cp → convert
      const cp = row.cp !== undefined ? (c.turn() === "w" ? row.cp : -row.cp) : 0;
      return { ...base, ...row, cp, bestMove, pv: row.pv ?? [bestMove] };
    },
  } as unknown as StockfishEngine;
}

function playMoves(sans: string[]): { moves: PlayedMove[]; finalFen: string } {
  const c = new Chess();
  const moves: PlayedMove[] = [];
  for (const san of sans) {
    const fenBefore = c.fen();
    const m = c.move(san);
    moves.push({ fenBefore, uci: m.from + m.to + (m.promotion ?? ""), san: m.san, color: m.color });
  }
  return { moves, finalFen: c.fen() };
}

describe("reviewGame", () => {
  it("marks opening theory as book and classifies by win-chance loss", async () => {
    const { moves, finalFen } = playMoves(["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "d3", "Be7", "O-O", "h6"]);
    // 5...h6 leaves theory and (in this fake) drops to +150 for white
    const table: Record<string, Partial<AnalysisResult>> = {};
    table[finalFen] = { cp: 150 };
    const r = await reviewGame(fakeEngine(table), moves, finalFen, "b");
    expect(r.moves).toHaveLength(10);
    expect(r.moves.slice(0, 8).every((m) => m.cls === "book"), r.moves.map((m) => m.cls).join()).toBe(true);
    // 5...h6 went from 0 to -150 for black → mistake, with a best-move suggestion
    const last = r.moves[9]!;
    expect(last.color).toBe("b");
    expect(last.lossPct).toBeGreaterThan(10);
    expect(["mistake", "blunder"]).toContain(last.cls);
    expect(last.bestSan).not.toBe("");
    expect(r.mistakes.length).toBeGreaterThanOrEqual(1);
    expect(r.mistakes[0]!.ply).toBe(9);
    expect(r.counts.b.book + r.counts.b.mistake + r.counts.b.blunder).toBe(5);
    expect(r.accuracy.w).toBe(100);
    expect(r.accuracy.b).toBeLessThan(100);
  });

  it("calls the engine's own choice best and a hanging-piece recapture a miss when still winning", async () => {
    const { moves, finalFen } = playMoves(["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"]);
    const r = await reviewGame(fakeEngine({}), moves, finalFen, "w");
    expect(r.moves[6]!.san).toBe("Qxf7#");
    expect(r.moves[6]!.evalAfter).toBeGreaterThan(9000);
    expect(r.moves[6]!.cls).toBe("best");
  });

  it("accuracy curve is 100 at zero loss and falls off", () => {
    expect(moveAccuracy(0)).toBeCloseTo(100, 2);
    expect(moveAccuracy(10)).toBeGreaterThan(60);
    expect(moveAccuracy(50)).toBeLessThan(10);
  });
});

describe("Mike Skolen", () => {
  it("pays each lesson once and a bonus when the day is complete", async () => {
    const { DEFAULT_PROGRESS } = await import("./progress");
    const { withLesson, lessonDone, schoolDone, schoolDays, LESSON_XP, SCHOOL_BONUS_XP } = await import("./school");
    let p = withLesson(DEFAULT_PROGRESS, "2026-10-25", "lesson");
    expect(lessonDone(p, "2026-10-25", "lesson")).toBe(true);
    expect(withLesson(p, "2026-10-25", "lesson").xp).toBe(p.xp);
    p = withLesson(withLesson(p, "2026-10-25", "game"), "2026-10-25", "drill");
    expect(schoolDone(p, "2026-10-25")).toBe(true);
    expect(p.xp).toBe(DEFAULT_PROGRESS.xp + 3 * LESSON_XP + SCHOOL_BONUS_XP);
    expect(schoolDays(p)).toBe(1);
    expect(schoolDone(p, "2026-10-26")).toBe(false);
  });
});
