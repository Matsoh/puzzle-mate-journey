import { describe, expect, it } from "vitest";
import { expectedScore, levelFromXp, liveStreak, newRating, nextStreak } from "./rules";
import { applyBadges } from "./badges";
import { DEFAULT_PROGRESS } from "./progress";
import { isUnlocked, OPPONENTS } from "./opponents";
import { parseLichessCsv, pickDaily, PUZZLES } from "./puzzles";

describe("rules", () => {
  it("equal ratings expect 0.5", () => expect(expectedScore(1550, 1550)).toBe(0.5));
  it("win vs equal opponent with K=24 gives +12", () => expect(newRating(1550, 1550, 1, 24)).toBe(1562));
  it("loss vs equal opponent with K=20 gives -10", () => expect(newRating(1550, 1550, 0, 20)).toBe(1540));
  it("level 2 starts at 100 xp", () => {
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
  });
  it("streak continues the next day and resets after a gap", () => {
    expect(nextStreak("2026-10-10", "2026-10-11", 4)).toBe(5);
    expect(nextStreak("2026-10-08", "2026-10-11", 4)).toBe(1);
    expect(nextStreak("2026-10-11", "2026-10-11", 4)).toBe(4);
    expect(liveStreak("2026-10-08", "2026-10-11", 4)).toBe(0);
  });
  it("awards Første seier after first win", () => {
    const { earned } = applyBadges({ ...DEFAULT_PROGRESS, wins: 1 });
    expect(earned.map((b) => b.id)).toContain("forste-seier");
  });
  it("ladder has 10 opponents from 1500 to 2000+, unlocking in order", () => {
    expect(OPPONENTS).toHaveLength(10);
    expect(OPPONENTS[0]!.elo).toBe(1500);
    expect(OPPONENTS[9]!.elo).toBeGreaterThanOrEqual(2000);
    expect(isUnlocked(1, [])).toBe(false);
    expect(isUnlocked(1, [OPPONENTS[0]!.id])).toBe(true);
  });
  it("picks 5 daily puzzles, ~60 seeded", () => {
    expect(PUZZLES.length).toBeGreaterThanOrEqual(60);
    expect(pickDaily(PUZZLES, 1550, [], "2026-10-11")).toHaveLength(5);
  });
  it("parses Lichess CSV rows", () => {
    const rows = parseLichessCsv(
      "PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags\n00008,r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24,f2g3 e6e7,1811,76,95,10282,crushing hangingPiece,https://lichess.org/787zsVup,",
    );
    expect(rows[0]).toMatchObject({ id: "00008", rating: 1811, themes: ["crushing", "hangingPiece"] });
  });
});
