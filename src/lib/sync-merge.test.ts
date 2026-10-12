import { describe, expect, it } from "vitest";
import { mergeState } from "./sync-merge";

describe("mergeState (two devices)", () => {
  it("never sums XP — takes the larger value", () => {
    expect(mergeState({ xp: 100 }, { xp: 115 })).toEqual({ xp: 115 });
    expect(mergeState({ xp: 130 }, { xp: 115 })).toEqual({ xp: 130 });
  });
  it("keeps history from both devices, sorted, without duplicates", () => {
    const a = { t: 1, game: 1550, puzzle: 1550 }, b = { t: 2, game: 1560, puzzle: 1550 }, c = { t: 3, game: 1555, puzzle: 1560 };
    expect(mergeState({ history: [a, c] }, { history: [a, b] })).toEqual({ history: [a, b, c] });
  });
  it("keeps sessions saved on either device", () => {
    expect(mergeState({ sessions: { d1: { done: true } } }, { sessions: { d2: { done: false } } })).toEqual({ sessions: { d1: { done: true }, d2: { done: false } } });
  });
  it("later daily set wins whole", () => {
    expect(mergeState({ daily: { day: "2026-10-12", ids: ["a"] } }, { daily: { day: "2026-10-11", ids: ["b"] } })).toEqual({ daily: { day: "2026-10-12", ids: ["a"] } });
  });
});
