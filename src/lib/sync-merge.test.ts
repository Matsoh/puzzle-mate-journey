import { describe, expect, it } from "vitest";
import { dedupeCredits, mergeState } from "./sync-merge";
import { DEFAULT_PROGRESS, withCredit, type Progress } from "./progress";

const P = (o: Partial<Progress>): Progress => ({ ...DEFAULT_PROGRESS, ...o });
const mergeP = (b: Progress, s: Progress, l: Progress) => dedupeCredits(b, s, l, mergeState(b, s, l) as Progress);

describe("three-way merge of two devices", () => {
  it("keeps two independent XP gains and game counts (not the max)", () => {
    const base = P({ xp: 100, games: 4, wins: 2 });
    const phone = P({ xp: 115, games: 5, wins: 3 }); // won a game
    const ipad = P({ xp: 110, games: 5, wins: 2 }); // lost a game
    const m = mergeP(base, phone, ipad);
    expect(m.xp).toBe(125);
    expect(m.games).toBe(6);
    expect(m.wins).toBe(3);
  });
  it("applies rating changes as deltas, not a stale snapshot", () => {
    const m = mergeP(P({ rating: 1550 }), P({ rating: 1562 }), P({ rating: 1544 }));
    expect(m.rating).toBe(1556);
  });
  it("credits the same event only once, even if earned on both devices", () => {
    const base = P({ xp: 100 });
    const a = withCredit(base, "session:2026-10-12:magnus", 15);
    const b = withCredit(base, "session:2026-10-12:magnus", 15);
    expect(withCredit(a, "session:2026-10-12:magnus", 15).xp).toBe(115);
    expect(mergeP(base, a, b).xp).toBe(115);
  });
  it("still sums different events from each device", () => {
    const base = P({ xp: 100 });
    const a = withCredit(base, "session:2026-10-12:magnus", 15);
    const b = withCredit(base, "session:2026-10-12:hikaru", 15);
    expect(mergeP(base, a, b).xp).toBe(130);
  });
  it("keeps history from both devices, sorted, without duplicates", () => {
    const a = { t: 1, game: 1550, puzzle: 1550 }, b = { t: 2, game: 1560, puzzle: 1550 }, c = { t: 3, game: 1555, puzzle: 1560 };
    expect(mergeState({ history: [a] }, { history: [a, c] }, { history: [a, b] })).toEqual({ history: [a, b, c] });
  });
  it("a setting changed on only one device survives", () => {
    expect(mergeState({ coach: "magnus" }, { coach: "hikaru" }, { coach: "magnus" })).toEqual({ coach: "hikaru" });
  });
});
