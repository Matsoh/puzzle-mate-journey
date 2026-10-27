import { describe, expect, it } from "vitest";
import { applyUci, fmtClock, friendlyError, liveAsArchive, liveClocks, liveRatingChange, myColor, outcomeFor, sideToMove, tcLabel, type LiveGame } from "./online";
import { friendViews, incomingChallenges } from "./online-store";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("online helpers", () => {
  it("applies UCI moves, detects mate, rejects illegal", () => {
    expect(applyUci(START, "e2e4")!.san).toBe("e4");
    expect(applyUci(START, "e2e5")).toBeNull();
    const mateFen = "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4";
    const r = applyUci(mateFen, "h5f7")!;
    expect(r.san).toBe("Qxf7#");
    expect(r.end).toEqual({ result: "w", reason: "Sjakk matt." });
    expect(applyUci("8/P7/8/8/8/8/8/k6K w - - 0 1", "a7a8q")!.san).toMatch(/^a8=Q/);
  });
  it("ticks only the side to move, and not before both have moved", () => {
    const base = { white_ms: 60_000, black_ms: 60_000, last_move_at: new Date(1_000_000).toISOString(), status: "playing" };
    expect(liveClocks({ ...base, moves: ["e2e4"] }, 1_005_000)).toEqual({ w: 60_000, b: 60_000 });
    expect(liveClocks({ ...base, moves: ["e2e4", "e7e5"] }, 1_005_000)).toEqual({ w: 55_000, b: 60_000 });
    expect(liveClocks({ ...base, moves: ["e2e4", "e7e5", "g1f3"] }, 1_005_000)).toEqual({ w: 60_000, b: 55_000 });
    expect(liveClocks({ ...base, moves: ["e2e4", "e7e5"], status: "finished" }, 1_005_000)).toEqual({ w: 60_000, b: 60_000 });
    expect(liveClocks({ ...base, moves: ["e2e4", "e7e5"] }, 1_005_000, 2_000)).toEqual({ w: 57_000, b: 60_000 });
  });
  it("formats clocks and labels", () => {
    expect(fmtClock(65_000)).toBe("1:05");
    expect(fmtClock(9_400)).toBe("0:10.4");
    expect(fmtClock(-5)).toBe("0:00.0");
    expect(tcLabel(600_000, 0)).toBe("10 + 0");
  });
  it("rating change is symmetric-ish and bounded", () => {
    expect(liveRatingChange(1500, 1500, 1)).toBe(12);
    expect(liveRatingChange(1500, 1500, 0)).toBe(-12);
    expect(liveRatingChange(1500, 1800, 1)).toBeGreaterThan(18);
    expect(liveRatingChange(1500, 1200, 0.5)).toBeLessThan(0);
  });
  it("knows sides and outcomes", () => {
    const g = { white: "a", black: "b", moves: ["e2e4"], result: "b" as const };
    expect(sideToMove(g)).toBe("b");
    expect(myColor(g, "b")).toBe("b");
    expect(myColor(g, "zzz")).toBeNull();
    expect(outcomeFor(g, "w")).toBe("loss");
    expect(outcomeFor({ result: "d" }, "w")).toBe("draw");
    expect(outcomeFor({ result: null }, "w")).toBeNull();
  });
  it("maps server errors to Norwegian", () => {
    expect(friendlyError("P0001: unknown code")).toMatch(/koden/);
    expect(friendlyError("boom")).toMatch(/Prøv igjen/);
  });
  it("derives friend views and incoming challenges", () => {
    const f = (id: string, requester: string, addressee: string, status: string) => ({ id, requester, addressee, status, created_at: "" });
    const s = { friendships: [f("1", "me", "x", "accepted"), f("2", "y", "me", "pending")], profiles: {}, online: new Set(["x"]), challenges: [{ id: "c1", from_user: "x", to_user: "me", status: "pending", initial_ms: 1, inc_ms: 0, color: "random", game_id: null, created_at: "" }] };
    const v = friendViews(s, "me");
    expect(v[0]!.userId).toBe("x"); expect(v[0]!.online).toBe(true);
    expect(v[1]!.pendingFromThem).toBe(true);
    expect(incomingChallenges(s, "me")).toHaveLength(1);
  });

  it("maps a finished live game to an archive row from either player's side", () => {
    const g = { id: "g1", white: "A", black: "B", initial_ms: 600_000, inc_ms: 0, moves: ["e2e4", "e7e5"], sans: ["e4", "e5"], fen: "", status: "finished", result: "w", reason: "Sjakkmatt", white_ms: 1, black_ms: 1, last_move_at: "", draw_offer: null, created_at: "2026-10-20T10:00:00Z", finished_at: "2026-10-20T10:20:00Z" } as unknown as LiveGame;
    const a = liveAsArchive(g, "A", "Bea", 1600);
    expect(a).toMatchObject({ id: "venn:g1", source: "venn", player: "w", result: "win", opponent: "Bea", opponentRating: 1600, timeClass: "rapid", moves: ["e4", "e5"], day: "2026-10-20" });
    expect(a.url).toContain("for=A");
    const b = liveAsArchive(g, "B", "Al", null);
    expect(b.player).toBe("b"); expect(b.result).toBe("loss");
    expect(liveAsArchive({ ...g, result: "d" } as LiveGame, "B", "Al", null).result).toBe("draw");
  });
});
