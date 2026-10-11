import { describe, expect, it } from "vitest";
import { categorize, clockCap, remainingDelay, searchTimeMs, thinkTimeMs, NO_CLOCK_MAX_MS, type ThinkInput } from "./think-time";

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
const base: ThinkInput = { elo: 1700, ply: 20, legalMoves: 30, inCheck: false, captures: 1, promotions: 0, pieces: 26, remainingMs: 600_000, initialMs: 600_000, incrementMs: 0 };
const sample = (i: Partial<ThinkInput>, n = 400, seed = 7) => {
  const r = seeded(seed);
  return Array.from({ length: n }, () => thinkTimeMs({ ...base, ...i }, r));
};
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]!;
const stdev = (a: number[]) => {
  const m = a.reduce((s, x) => s + x, 0) / a.length;
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
};

describe("think time", () => {
  it("categorizes forced, normal and complex positions", () => {
    expect(categorize({ ...base, legalMoves: 1 })).toBe("forced");
    expect(categorize({ ...base, ply: 3 })).toBe("forced");
    expect(categorize(base)).toBe("normal");
    expect(categorize({ ...base, captures: 5 })).toBe("complex");
  });

  it("follows the 10-minute design targets", () => {
    expect(median(sample({ ply: 2 }))).toBeLessThanOrEqual(3_000);
    const n = median(sample({}));
    expect(n).toBeGreaterThan(2_500);
    expect(n).toBeLessThan(8_000);
    expect(median(sample({ captures: 5 }))).toBeGreaterThan(6_000);
  });

  it("varies instead of a fixed delay", () => {
    expect(new Set(sample({}, 50)).size).toBeGreaterThan(40);
  });

  it("lower rated bots use time more unevenly, not just faster", () => {
    const low = sample({ elo: 1500, captures: 5 });
    const high = sample({ elo: 2050, captures: 5 });
    expect(stdev(low) / median(low)).toBeGreaterThan(stdev(high) / median(high));
    expect(Math.max(...sample({ elo: 1500 }))).toBeGreaterThan(10_000); // sometimes overthinks
  });

  it("low remaining time shrinks the budget and keeps a reserve", () => {
    const t = sample({ remainingMs: 20_000, captures: 5 });
    expect(Math.max(...t)).toBeLessThanOrEqual(1_000);
    expect(clockCap(3_000, 600_000, 0, 60)).toBe(0);
    expect(clockCap(20_000, 900_000, 10_000, 60)).toBeGreaterThan(clockCap(20_000, 900_000, 0, 60));
  });

  it("caps time without a clock", () => {
    expect(Math.max(...sample({ remainingMs: null, initialMs: null, elo: 1500, captures: 6 }))).toBeLessThanOrEqual(NO_CLOCK_MAX_MS);
  });

  it("counts engine search time once and keeps old search strength", () => {
    expect(searchTimeMs(600_000, 9_000)).toBe(1500);
    expect(searchTimeMs(null, 9_000)).toBe(1000);
    expect(searchTimeMs(600_000, 400)).toBe(400);
    expect(remainingDelay(6_000, 1_500)).toBe(4_500);
    expect(remainingDelay(1_000, 1_500)).toBe(0);
  });
});
