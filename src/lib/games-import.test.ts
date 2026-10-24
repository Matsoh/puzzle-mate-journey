import { describe, expect, it } from "vitest";
import { mergeGames, parseChesscomGames, parseLichessNdjson, playedMovesFromSan, sansFromPgn } from "./games-import";
import { DEFAULT_PROGRESS } from "./progress";
import { lessonsFrom, notebookContext, notebookLine, withNotebookEntry } from "./notebook";
import type { Mistake } from "./coach";

const PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[White "tobias"]
[Black "someone"]
[Result "1-0"]

1. e4 {[%clk 0:09:58]} e5 {[%clk 0:09:55]} 2. Nf3 {[%clk 0:09:50]} Nc6 3. Bb5 a6 4. Ba4 Nf6 1-0`;

describe("game import", () => {
  it("reads chess.com PGN with clock comments", () => {
    const sans = sansFromPgn(PGN);
    expect(sans).toEqual(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6"]);
    const pm = playedMovesFromSan(sans)!;
    expect(pm.moves[0]!.uci).toBe("e2e4");
    expect(pm.moves).toHaveLength(8);
    expect(playedMovesFromSan(["e4", "Kxe9"])).toBeNull();
  });
  it("parses a chess.com month and finds the player's side and result", () => {
    const json = { games: [{ url: "https://www.chess.com/game/live/123", pgn: PGN, end_time: 1760000000, time_class: "rapid", white: { username: "Tobias", rating: 1510, result: "win" }, black: { username: "someone", rating: 1480, result: "checkmated" } }] };
    const g = parseChesscomGames(json, "tobias");
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ id: "chesscom:123", player: "w", result: "win", opponent: "someone", opponentRating: 1480, timeClass: "rapid" });
    expect(parseChesscomGames(json, "nobody")).toHaveLength(0);
  });
  it("parses lichess ndjson", () => {
    const line = JSON.stringify({ id: "abcd1234", createdAt: 1760000000000, speed: "blitz", winner: "black", moves: "e4 e5 Nf3 Nc6 Bb5", players: { white: { user: { name: "Other" }, rating: 1600 }, black: { user: { name: "Tobias" }, rating: 1550 } } });
    const g = parseLichessNdjson(line + "\n" + "not json\n", "tobias");
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ id: "lichess:abcd1234", player: "b", result: "win", opponent: "Other", timeClass: "blitz" });
  });
  it("merges without duplicates, newest first", () => {
    const a = { id: "x:1", playedAt: 10 } as never;
    const b = { id: "x:2", playedAt: 20 } as never;
    const m = mergeGames([a], [a, b]);
    expect(m.map((g) => g.id)).toEqual(["x:2", "x:1"]);
  });
});

describe("Mikes notatbok", () => {
  const mk = (over: Partial<Mistake["facts"]>, ply = 30, fen = "r1bqkbnr/pppppppp/2n5/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"): Mistake =>
    ({ ply, moveNumber: Math.ceil(ply / 2), fenBefore: fen, playedUci: "e2e4", bestUci: "d2d4", pvUci: [], text: "", facts: { playedSan: "e4", bestSan: "d4", evalBefore: 0, evalAfter: -2, lossPct: 20, severity: "feil", pvSan: [], ...over } });
  it("categorises engine facts into lessons", () => {
    expect(lessonsFrom([mk({ replyCaptures: "springeren" })])).toEqual(["hanging"]);
    expect(lessonsFrom([mk({ replyCaptures: "springeren" }, 60, "8/8/4k3/8/8/4K3/4P3/8 w - - 0 1")])).toEqual(["hanging", "endgame"]);
    expect(lessonsFrom([mk({ allowedMateIn: 2 }, 12)])).toEqual(["allowedMate", "opening"]);
    expect(lessonsFrom([mk({ severity: "tabbe" }, 40, "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")])).toEqual(["tactic-missed"]);
  });
  it("records each game once and counts patterns", () => {
    let p = withNotebookEntry(DEFAULT_PROGRESS, { id: "g1", day: "2026-10-24", label: "Tap mot X", result: "loss", lessons: ["hanging"] });
    p = withNotebookEntry(p, { id: "g1", day: "2026-10-24", label: "Tap mot X", result: "loss", lessons: ["hanging"] });
    p = withNotebookEntry(p, { id: "g2", day: "2026-10-25", label: "Seier mot Y", result: "win", lessons: ["hanging", "opening"] });
    expect(p.notebook.entries).toHaveLength(2);
    expect(p.notebook.patterns.hanging).toBe(2);
    expect(notebookLine(p)).toMatch(/Hanging pieces/);
    expect(notebookContext(p)).toContain("Hengende brikker (2x)");
    expect(notebookLine(DEFAULT_PROGRESS)).toBeNull();
  });
});
