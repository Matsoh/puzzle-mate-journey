import { describe, expect, it } from "vitest";
import { emptyRound, activeRound, applySetup, clampSetup, defaultSetup, formatPoints, migrateTournaments, newTournament, parseTimeControl, prepPlan, emptyPrep, roundsLostBy, score, tcToMs } from "./tournament";

const t0 = () => newTournament(defaultSetup("2026-10-20"), "a", 0);

describe("tournament", () => {
  it("defaults to 6 rounds of 10+0", () => { const t = t0(); expect(t.rounds).toHaveLength(6); expect(t.setup.minutes).toBe(10); expect(t.setup.increment).toBe(0); });
  it("clamps rounds to 1–9", () => { expect(clampSetup({ ...defaultSetup("x"), rounds: 12 }).rounds).toBe(9); expect(clampSetup({ ...defaultSetup("x"), rounds: 0 }).rounds).toBe(1); });
  it("scores 1 / ½ / 0 from finished rounds only", () => {
    const t = t0();
    t.rounds[0] = { ...emptyRound(), status: "done", result: "win" };
    t.rounds[1] = { ...emptyRound(), status: "done", result: "draw" };
    t.rounds[2] = { ...emptyRound(), status: "done", result: "loss" };
    t.rounds[3] = { ...emptyRound(), status: "playing", result: "win" };
    expect(score(t)).toEqual({ points: 1.5, played: 3 });
    expect(formatPoints(1.5)).toBe("1½");
    expect(formatPoints(0.5)).toBe("½");
    expect(activeRound(t)).toBe(3);
  });
  it("warns before shrinking away rounds with data", () => {
    const t = t0(); t.rounds[5] = { ...emptyRound(), status: "done", result: "win" };
    expect(roundsLostBy(t, 4)).toBe(1); expect(roundsLostBy(t, 6)).toBe(0);
    expect(applySetup(t, { ...t.setup, rounds: 8 }).rounds[5]?.result).toBe("win");
  });
  it("parses and converts time controls", () => {
    expect(parseTimeControl("10+5")).toBe("10+5"); expect(parseTimeControl("abc")).toBe("15+10");
    expect(tcToMs("10+5")).toEqual([600_000, 5000]); expect(tcToMs("none")).toBeNull();
  });
  it("prep plan only asks for missing own notes, never invents repertoire", () => {
    expect(prepPlan(5, emptyPrep())[0]).toMatch(/hvitåpningen din/);
    expect(prepPlan(5, { whiteOpening: "1.e4", vsE4: "1...e5", vsD4: "1...d5", plan: "" })[0]).toMatch(/Hva er planen/);
  });
  it("migrates bad storage safely", () => { expect(migrateTournaments("x").list).toEqual([]); expect(migrateTournaments({ version: 1, current: "z", list: [] }).current).toBeNull(); });
});
