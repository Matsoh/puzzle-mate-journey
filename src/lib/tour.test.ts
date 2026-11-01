import { describe, expect, it } from "vitest";
import { advance, boardIntro, drawField, FIELD, mikeTourLine, myBoard, myIndex, newTour, pairRound, pendingBoards, phase, placeOf, podiums, revealOffsets, rng, ROUNDS, scores, simulate, standings, summary, tierFor, tierOpen, tourOpponent, withMyResult, withTourPrize, type Tour } from "./tour";
import { TOUR_BOTS, tierBots } from "./tour-bots";
import { DEFAULT_PROGRESS } from "./progress";
import { existsSync } from "node:fs";

const ME = { name: "Tobias", elo: 1520 };
const T0 = 1_700_000_000_000;

/** Play a whole tournament with the given outcomes for my games. */
function playAll(t: Tour, outcomes: ("win" | "draw" | "loss")[]): Tour {
  let now = T0;
  for (let r = 0; r < ROUNDS; r++) {
    t = withMyResult(t, r, outcomes[r] ?? "draw", 4 * 60_000, now);
    now += 120_000;
    t = advance(t, now);
  }
  return t;
}

describe("tournament bots", () => {
  it("has a portrait, a unique id and a rating inside its tier for every bot", () => {
    const ids = new Set(TOUR_BOTS.map((b) => b.id));
    expect(ids.size).toBe(TOUR_BOTS.length);
    for (const b of TOUR_BOTS) {
      expect(existsSync(`public${b.portrait}`), b.portrait).toBe(true);
      const lo = { begynner: 1200, amator: 1450, proff: 1750 }[b.tier], hi = { begynner: 1450, amator: 1750, proff: 2050 }[b.tier];
      expect(b.elo).toBeGreaterThanOrEqual(lo);
      expect(b.elo).toBeLessThanOrEqual(hi);
    }
    for (const tier of ["begynner", "amator", "proff"] as const) expect(tierBots(tier).length).toBeGreaterThanOrEqual(FIELD - 1);
  });
  it("shapes a bot as a ladder opponent", () => {
    const o = tourOpponent("t128")!;
    expect(o.id).toBe("tour:t128");
    expect(tourOpponent("tour:t128")?.name).toBe(o.name);
    expect(o.elo).toBe(2050);
    expect(tourOpponent("nope")).toBeUndefined();
  });
});

describe("tiers", () => {
  it("recommends by rating and unlocks by rating or podium below", () => {
    expect(tierFor(1300)).toBe("begynner");
    expect(tierFor(1520)).toBe("amator");
    expect(tierFor(1800)).toBe("proff");
    const none = { begynner: 0, amator: 0, proff: 0 };
    expect(tierOpen("begynner", 1200, none)).toBe(true);
    expect(tierOpen("amator", 1300, none)).toBe(false);
    expect(tierOpen("amator", 1300, { ...none, begynner: 1 })).toBe(true);
    expect(tierOpen("proff", 1520, { ...none, begynner: 3 })).toBe(false);
    expect(tierOpen("proff", 1520, { ...none, amator: 1 })).toBe(true);
    expect(podiums([{ id: "a", tier: "amator", tc: "10+0", place: 2, score: 4, finishedAt: 1 }, { id: "b", tier: "amator", tc: "10+0", place: 7, score: 2, finishedAt: 1 }])).toEqual({ ...none, amator: 1 });
  });
});

describe("field and pairings", () => {
  it("draws ten players sorted by rating, with me in it, deterministically", () => {
    const f = drawField("amator", ME, 42);
    expect(f).toHaveLength(FIELD);
    expect(f.filter((p) => p.id === "me")).toHaveLength(1);
    for (let i = 1; i < f.length; i++) expect(f[i - 1]!.elo).toBeGreaterThanOrEqual(f[i]!.elo);
    expect(drawField("amator", ME, 42)).toEqual(f);
    expect(drawField("amator", ME, 43).map((p) => p.id)).not.toEqual(f.map((p) => p.id));
  });
  it("pairs round one top half vs bottom half and never repeats a pairing over five rounds", () => {
    const t = newTour("amator", "10+0", ME, 7, T0);
    expect(t.rounds).toHaveLength(1);
    expect(t.rounds[0]!.boards).toHaveLength(FIELD / 2);
    const r1 = t.rounds[0]!.boards.map((b) => [Math.min(b.w, b.b), Math.max(b.w, b.b)]);
    expect(r1).toEqual([[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]]);
    const done = playAll(t, ["win", "win", "draw", "loss", "win"]);
    expect(done.rounds).toHaveLength(ROUNDS);
    expect(done.finishedAt).not.toBeNull();
    const seen = new Set<string>();
    for (const r of done.rounds) {
      const used = new Set<number>();
      for (const b of r.boards) {
        const k = `${Math.min(b.w, b.b)}-${Math.max(b.w, b.b)}`;
        expect(seen.has(k), k).toBe(false);
        seen.add(k);
        used.add(b.w); used.add(b.b);
        expect(b.result).not.toBeNull();
      }
      expect(used.size).toBe(FIELD);
    }
    // colours: nobody has more than two of the same colour in a row, balance within ±2
    for (let i = 0; i < FIELD; i++) {
      const cols = done.rounds.map((r) => (r.boards.find((b) => b.w === i) ? "w" : "b"));
      const w = cols.filter((c) => c === "w").length;
      expect(Math.abs(w - (ROUNDS - w))).toBeLessThanOrEqual(2);
      expect(cols.join("")).not.toMatch(/www|bbb/);
    }
  });
  it("holds the no-repeat and colour rules over many tournaments", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const tier = (["begynner", "amator", "proff"] as const)[seed % 3]!;
      const r = rng(seed);
      const outs = Array.from({ length: ROUNDS }, () => (["win", "draw", "loss"] as const)[Math.floor(r() * 3)]!);
      const done = playAll(newTour(tier, "10+0", { name: "T", elo: 1200 + seed * 13 }, seed, T0), outs);
      const seen = new Set<string>();
      for (const rd of done.rounds) for (const b of rd.boards) { const k = `${Math.min(b.w, b.b)}-${Math.max(b.w, b.b)}`; expect(seen.has(k)).toBe(false); seen.add(k); }
      for (let i = 0; i < FIELD; i++) {
        const cols = done.rounds.map((rd) => (rd.boards.find((b) => b.w === i) ? "w" : "b")).join("");
        expect(cols, `seed ${seed} player ${i}`).not.toMatch(/www|bbb/);
      }
    }
  });
  it("pairs later rounds by score group", () => {
    let t = newTour("begynner", "10+0", { name: "T", elo: 1300 }, 3, T0);
    t = withMyResult(t, 0, "win", 60_000, T0);
    t = advance(t, T0 + 60_000);
    const sc = scores(t, null, 1);
    for (const b of t.rounds[1]!.boards) expect(Math.abs(sc[b.w]! - sc[b.b]!)).toBeLessThanOrEqual(0.5);
    // the leaders meet on board 1
    const top = t.rounds[1]!.boards[0]!;
    expect(Math.max(sc[top.w]!, sc[top.b]!)).toBe(1);
  });
});

describe("results, reveals and standings", () => {
  it("records my result, simulates the rest and reveals them one by one within 50 s", () => {
    let t = newTour("amator", "10+0", ME, 11, T0);
    expect(phase(t, T0)).toBe("play");
    t = withMyResult(t, 0, "win", 3 * 60_000, T0);
    expect(withMyResult(t, 0, "loss", 1, T0)).toEqual(t); // never twice
    const mine = myBoard(t)!;
    expect(mine.board.result).toBe(mine.color === "w" ? "1-0" : "0-1");
    expect(phase(t, T0)).toBe("reveal");
    expect(scores(t, T0)[myIndex(t)]).toBe(1);
    const times = t.rounds[0]!.boards.filter((b) => b.revealAt !== null).map((b) => b.revealAt! - T0);
    expect(times).toHaveLength(4);
    expect(Math.max(...times)).toBeLessThanOrEqual(50_000);
    const sorted = [...times].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) if (sorted[i]! > 0) expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThanOrEqual(3_000);
    expect(pendingBoards(t, T0).length).toBeGreaterThan(0);
    expect(pendingBoards(t, T0 + 50_001)).toEqual([]);
    expect(phase(t, T0 + 50_001)).toBe("between");
    expect(advance(t, T0)).toEqual(t); // not before everything is shown
    const next = advance(t, T0 + 60_000);
    expect(next.rounds).toHaveLength(2);
    expect(phase(next, T0 + 60_000)).toBe("play");
  });
  it("shows boards that ended while I played at once, and takes longer after a quick game", () => {
    const quick = revealOffsets(rng(5), 4, 60_000, "10+0");
    const long = revealOffsets(rng(5), 4, 18 * 60_000, "10+0");
    expect(long.filter((x) => x === 0).length).toBeGreaterThan(quick.filter((x) => x === 0).length);
    expect(Math.max(...quick)).toBeGreaterThan(Math.max(...long));
  });
  it("simulates by rating: the stronger side scores more, draws exist", () => {
    const r = rng(1);
    let w = 0, d = 0;
    for (let i = 0; i < 2000; i++) { const x = simulate(r, 1900, 1500, "proff"); if (x === "1-0") w++; else if (x === "½-½") d++; }
    expect(w / 2000).toBeGreaterThan(0.75);
    expect(d).toBeGreaterThan(0);
    let b = 0;
    for (let i = 0; i < 2000; i++) if (simulate(r, 1300, 1450, "begynner") === "0-1") b++;
    expect(b / 2000).toBeGreaterThan(0.5);
  });
  it("ranks by score, then Buchholz, and keeps unrevealed results out of the table", () => {
    let t = newTour("amator", "10+0", ME, 11, T0);
    t = withMyResult(t, 0, "win", 60_000, T0);
    const early = standings(t, T0);
    expect(early[0]!.idx).toBe(myIndex(t));
    expect(early.filter((s) => s.score > 0)).toHaveLength(1);
    const late = standings(t, T0 + 60_000);
    expect(late.filter((s) => s.cells[0]!.result !== null)).toHaveLength(FIELD);
    for (let i = 1; i < late.length; i++) {
      const a = late[i - 1]!, b = late[i]!;
      expect(a.score > b.score || (a.score === b.score && a.buchholz >= b.buchholz)).toBe(true);
      expect(b.place).toBe(i + 1);
    }
    const done = playAll(newTour("amator", "10+0", ME, 11, T0), ["win", "win", "win", "win", "win"]);
    expect(placeOf(done, myIndex(done))).toBe(1);
    expect(summary(done).score).toBe(5);
    expect(summary(done).place).toBe(1);
  });
  it("pays the prize once and counts trophies", () => {
    const done = playAll(newTour("amator", "10+0", ME, 11, T0), ["win", "win", "win", "win", "win"]);
    const p = withTourPrize(DEFAULT_PROGRESS, done);
    expect(p.xp).toBe(150);
    expect(p.coins).toBe(60);
    expect(p.tourWins).toBe(1);
    expect(p.tourPodiums).toBe(1);
    expect(withTourPrize(p, done)).toEqual(p);
    const lost = playAll(newTour("amator", "10+0", ME, 11, T0), ["loss", "loss", "loss", "loss", "loss"]);
    const q = withTourPrize(DEFAULT_PROGRESS, lost);
    expect(q.xp).toBe(40);
    expect(q.tourWins).toBe(0);
    expect(placeOf(lost, myIndex(lost))).toBeGreaterThan(5);
    expect(withTourPrize(DEFAULT_PROGRESS, newTour("amator", "10+0", ME, 1, T0))).toEqual(DEFAULT_PROGRESS); // not finished
  });
  it("gives Mike something to say in every phase, in English", () => {
    let t = newTour("amator", "10+0", ME, 11, T0);
    expect(mikeTourLine(null, T0).text).toMatch(/tier/);
    expect(boardIntro(t)).toMatch(/Round 1 of 5, board \d/);
    expect(mikeTourLine(t, T0).mood).toBe("chill");
    t = withMyResult(t, 0, "win", 60_000, T0);
    expect(mikeTourLine(t, T0).text).toMatch(/other boards/);
    expect(mikeTourLine(t, T0 + 60_000).text).toMatch(/Full point/);
    t = advance(t, T0 + 60_000);
    expect(boardIntro(t)).toMatch(/Round 2 of 5/);
    const done = playAll(newTour("amator", "10+0", ME, 11, T0), ["win", "win", "win", "win", "win"]);
    expect(mikeTourLine(done, T0).text).toMatch(/First place/);
  });
  it("pairRound is deterministic for a given rng", () => {
    const t = newTour("proff", "15+10", { name: "T", elo: 1800 }, 99, T0);
    expect(pairRound(t, rng(1))).toEqual(pairRound(t, rng(1)));
  });
});
