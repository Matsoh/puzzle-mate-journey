import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { gameReaction, materialBalance, reviewContext, tournamentLine, MODE_RULES } from "./mike-game";
import { newTournament, defaultSetup } from "./tournament";
import type { PlayedMove } from "./coach";

function playMoves(sans: string[]): { fen: string; moves: PlayedMove[] } {
  const c = new Chess();
  const moves: PlayedMove[] = [];
  for (const san of sans) {
    const fenBefore = c.fen();
    const mv = c.move(san);
    moves.push({ fenBefore, uci: mv.from + mv.to + (mv.promotion ?? ""), san: mv.san, color: mv.color });
  }
  return { fen: c.fen(), moves };
}

describe("Mike at the board", () => {
  it("counts material from the player's side", () => {
    expect(materialBalance(new Chess().fen(), "w")).toBe(0);
    expect(materialBalance("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN1 w Qkq - 0 1", "w")).toBe(-5);
    expect(materialBalance("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN1 w Qkq - 0 1", "b")).toBe(5);
  });
  it("reacts to captures and checks without naming moves", () => {
    const g = playMoves(["e4", "d5", "exd5"]);
    const r = gameReaction({ ...g, player: "w" });
    expect(r?.text).toMatch(/grab|Took|Capture/);
    const h = playMoves(["e4", "e5", "Qh5", "Nc6", "Qxf7+"]);
    const inCheck = gameReaction({ ...h, player: "b" });
    expect(inCheck?.text).toMatch(/check/i);
    expect(inCheck?.text).not.toMatch(/Kxf7|f7/);
  });
  it("is quiet on ordinary moves and strict about hints in game mode", () => {
    const g = playMoves(["e4", "e5", "Nf3"]);
    expect(gameReaction({ ...g, player: "w" })).toBeNull();
    expect(MODE_RULES.game).toMatch(/Never suggest/);
  });
  it("builds a review context only from engine facts", () => {
    const ctx = reviewContext([], "loss");
    expect(ctx).toContain("no big mistakes");
  });
  it("gives tournament lines per state", () => {
    const t = newTournament(defaultSetup("2026-10-25"), "t1", 0);
    expect(tournamentLine(t, t.rounds[0], 0).text).toMatch(/Round 1/);
    const lost = { ...t, rounds: t.rounds.map((r, i) => (i === 0 ? { ...r, status: "done" as const, result: "loss" as const } : r)) };
    expect(tournamentLine(lost, lost.rounds[1], 1).text).toMatch(/Lost the last one/);
  });
});
