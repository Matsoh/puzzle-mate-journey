import { describe, expect, it } from "vitest";
import { CLIPS, getClip } from "@/data/gotham";
import { DAY_CAP, FEED_BONUS_PER_DAY, FEED_CAP, FEED_PAUSE_COINS, FEED_PAUSE_EVERY, PROVE_COINS, SHORTS_PER_DAY, clipsFor, dailyClip, feedOf, feedOrder, feedToday, grouped, mikeCinemaLine, pauseDue, recommendation, shortWatched, shortsToday, watchCoins, withFeedPause, withFeedShort, withProven, withWatched } from "./cinema";
import { SHORT_IDS } from "@/data/gotham-shorts";
import { CLASSES, timetable } from "./curriculum";
import { OPENINGS } from "@/data/openings";
import { MASTER_GAMES } from "@/data/master-games";
import { THEMES } from "./adaptive";
import { DEFAULT_PROGRESS, type Progress } from "./progress";

const P: Progress = { ...DEFAULT_PROGRESS, schoolClass: 1, schoolClassSince: "2026-10-01" };
const MON = "2026-10-26", TUE = "2026-10-27", WED = "2026-10-28", THU = "2026-10-29";

describe("gotham clips", () => {
  it("are unique, well-formed and point at real syllabus content", () => {
    expect(new Set(CLIPS.map((c) => c.id)).size).toBe(CLIPS.length);
    for (const c of CLIPS) {
      expect(c.yt).toMatch(/^[\w-]{11}$/);
      expect(c.secs).toBeGreaterThan(5);
      if (c.start !== undefined && c.end !== undefined) expect(c.end - c.start).toBe(c.secs);
      expect(c.cls).toBeGreaterThanOrEqual(1);
      expect(c.cls).toBeLessThanOrEqual(7);
      expect(c.kind === "short" ? c.secs <= 60 : c.secs > 60).toBe(true);
      for (const t of c.topics) {
        const [k, v] = t.split(":");
        if (k === "opening" && v !== "general") expect(OPENINGS.some((o) => o.id === v), t).toBe(true);
        if (k === "tactic") expect(THEMES.mike.some((x) => x.id === v), t).toBe(true);
        if (k === "game") expect(MASTER_GAMES.some((g) => g.id === v), t).toBe(true);
      }
      if (c.prove.kind === "puzzles") expect(THEMES.mike.some((x) => x.id === (c.prove as { theme: string }).theme)).toBe(true);
      if (c.prove.kind === "opening") expect(OPENINGS.some((o) => o.id === (c.prove as { id: string }).id)).toBe(true);
      if (c.prove.kind === "game") expect(MASTER_GAMES.some((g) => g.id === (c.prove as { id: string }).id)).toBe(true);
    }
    expect(CLIPS.filter((c) => c.kind === "short").length).toBeGreaterThanOrEqual(10);
  });
  it("covers every class's openings, endgames and master games", () => {
    for (const cl of CLASSES) {
      for (const o of cl.openings) expect(CLIPS.some((c) => c.topics.includes(`opening:${o}`) && c.cls <= cl.n), `${cl.n} ${o}`).toBe(true);
      for (const g of cl.games) expect(CLIPS.some((c) => c.topics.includes(`game:${g}`) && c.cls <= cl.n), `${cl.n} ${g}`).toBe(true);
      for (const t of cl.tactics) expect(CLIPS.some((c) => c.topics.includes(`tactic:${t}`) && c.cls <= cl.n), `${cl.n} ${t}`).toBe(true);
    }
  });
  it("groups every clip exactly once", () => {
    const g = grouped();
    expect(g.flatMap((x) => x.clips).length).toBe(CLIPS.length);
  });
});

describe("daily clip", () => {
  it("follows the subject of the day and is stable per day", () => {
    const mon = dailyClip(P, MON, timetable(P, MON));
    expect(mon.topics.some((t) => t.startsWith("opening:"))).toBe(true);
    expect(dailyClip(P, MON, timetable(P, MON))).toEqual(mon);
    const tue = dailyClip(P, TUE, timetable(P, TUE));
    expect(tue.topics.some((t) => t.startsWith("tactic:"))).toBe(true);
    const wed = dailyClip(P, WED, timetable(P, WED));
    expect(wed.topics.some((t) => t.startsWith("endgame:"))).toBe(true);
    const thu = dailyClip(P, THU, timetable(P, THU));
    expect(thu.topics.some((t) => t.startsWith("game:"))).toBe(true);
    expect(mon.cls).toBeLessThanOrEqual(1);
    expect(clipsFor(P).every((c) => c.cls <= 1)).toBe(true);
  });
  it("prefers clips not yet watched", () => {
    const first = dailyClip(P, MON, timetable(P, MON));
    const watched = withWatched(P, first.id, first.secs, MON).p;
    const second = dailyClip(watched, MON, timetable(watched, MON));
    expect(second.id).not.toBe(first.id);
  });
});

describe("watching and proving", () => {
  it("pays once at 80 %, with XP, and never beyond the daily cap", () => {
    const clip = getClip("op-carokann")!;
    const half = withWatched(P, clip.id, clip.secs * 0.5, MON);
    expect(half.paid).toBe(0);
    expect(half.p.cinema.seen[clip.id]?.done).toBe(false);
    const done = withWatched(half.p, clip.id, clip.secs * 0.81, MON);
    expect(done.justDone).toBe(true);
    expect(done.paid).toBe(watchCoins(clip));
    expect(done.p.coins).toBe(P.coins + 5);
    expect(done.p.xp).toBe(P.xp + 5);
    const again = withWatched(done.p, clip.id, clip.secs, MON);
    expect(again.paid).toBe(0);
    expect(again.p.coins).toBe(done.p.coins);
    expect(withWatched(P, "nope", 100, MON).p).toEqual(P);
    // cap
    let p = P;
    let total = 0;
    for (const c of CLIPS.filter((c) => c.kind === "video")) { const r = withWatched(p, c.id, c.secs, MON); p = r.p; total += r.paid; }
    expect(total).toBe(DAY_CAP);
    expect(p.coins).toBe(P.coins + DAY_CAP);
    // a new day opens the budget again
    const r = withWatched(p, "s-fork", 32, TUE);
    expect(r.paid).toBe(1);
  });
  it("limits shorts to five paid per day and keeps them out of the cap when unpaid", () => {
    let p = P;
    const shorts = CLIPS.filter((c) => c.kind === "short");
    let paid = 0;
    for (const s of shorts) { const r = withWatched(p, s.id, s.secs, MON); p = r.p; paid += r.paid; }
    expect(paid).toBe(SHORTS_PER_DAY);
    expect(shortsToday(p, MON)).toBe(shorts.length);
  });
  it("proof pays a bonus once, only after the clip is done", () => {
    const clip = getClip("op-carokann")!;
    expect(withProven(P, clip.id, MON).paid).toBe(0);
    const done = withWatched(P, clip.id, clip.secs, MON).p;
    const proven = withProven(done, clip.id, MON);
    expect(proven.paid).toBe(PROVE_COINS);
    expect(proven.p.xp).toBe(done.xp + 15);
    expect(withProven(proven.p, clip.id, MON).paid).toBe(0);
    expect(mikeCinemaLine(proven.p, clip, MON).mood).toBe("happy");
    expect(mikeCinemaLine(done, clip, MON).text).toMatch(/prove/);
    expect(mikeCinemaLine(P, clip, MON).text).toMatch(/Caro-Kann/);
  });
  it("recommends from the notebook's most common pattern", () => {
    expect(recommendation(P)).toBeNull();
    const p: Progress = { ...P, notebook: { entries: [], patterns: { hanging: 3, missedMate: 1 } } };
    const r = recommendation(p)!;
    expect(r.lesson).toBe("hanging");
    expect(r.clip.topics).toContain("tactic:defensiveMove");
    expect(r.clip.kind).toBe("video");
    expect(r.why).toMatch(/hengt/);
    const q: Progress = { ...P, notebook: { entries: [], patterns: { missedMate: 4 } } };
    expect(recommendation(q)!.clip.topics).toContain("tactic:mateIn2");
  });
});

describe("gotham shorts feed", () => {
  it("has a big, unique, well-formed id list", () => {
    expect(SHORT_IDS.length).toBeGreaterThan(1000);
    expect(new Set(SHORT_IDS).size).toBe(SHORT_IDS.length);
    expect(SHORT_IDS.every((id) => /^[\w-]{11}$/.test(id))).toBe(true);
  });
  it("counts a short after 8 seconds, or 60 % of a shorter one", () => {
    expect(shortWatched(7.9, 30)).toBe(false);
    expect(shortWatched(8, 30)).toBe(true);
    expect(shortWatched(3.1, 5)).toBe(true);
    expect(shortWatched(2.9, 5)).toBe(false);
    expect(shortWatched(7, 0)).toBe(false);
  });
  it("orders unseen shorts first (newest first) and reshuffles the seen ones per day", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    expect(feedOrder(ids, [], "x")).toEqual(ids);
    const o = feedOrder(ids, ["b", "d", "a"], MON);
    expect(o.slice(0, 3)).toEqual(["c", "e", "f"]);
    expect([...o.slice(3)].sort()).toEqual(["a", "b", "d"]);
    expect(feedOrder(ids, ["b", "d", "a"], MON)).toEqual(o);
    expect(feedOrder(ids, ids, MON).length).toBe(6);
  });
  it("pays one coin per new short up to the daily cap, never twice for the same short", () => {
    let p = P;
    let paid = 0;
    for (let i = 0; i < 20; i++) { const r = withFeedShort(p, SHORT_IDS[i]!, MON); p = r.p; paid += r.paid; }
    expect(paid).toBe(FEED_CAP);
    expect(p.coins).toBe(P.coins + FEED_CAP);
    expect(feedToday(p, MON)).toMatchObject({ coins: FEED_CAP, watched: 20 });
    expect(feedOf(p).seen).toHaveLength(20);
    // same short again: counted for the break, never paid
    const again = withFeedShort(p, SHORT_IDS[0]!, TUE);
    expect(again.paid).toBe(0);
    expect(feedToday(again.p, TUE).watched).toBe(1);
    // a new day pays again for new shorts, and the curated cinema budget is untouched
    expect(withFeedShort(p, SHORT_IDS[30]!, TUE).paid).toBe(1);
    expect(p.cinema.dayCoins[MON]).toBeUndefined();
    expect(withWatched(p, "s-fork", 32, MON).paid).toBe(1);
  });
  it("calls Mike's break every eight shorts and pays a small bonus for a solved puzzle", () => {
    let p = P;
    for (let i = 0; i < FEED_PAUSE_EVERY - 1; i++) p = withFeedShort(p, SHORT_IDS[i]!, MON).p;
    expect(pauseDue(p, MON)).toBe(false);
    p = withFeedShort(p, SHORT_IDS[7]!, MON).p;
    expect(pauseDue(p, MON)).toBe(true);
    const solved = withFeedPause(p, MON, true);
    expect(solved.paid).toBe(FEED_PAUSE_COINS);
    expect(pauseDue(solved.p, MON)).toBe(false);
    const failed = withFeedPause(p, MON, false);
    expect(failed.paid).toBe(0);
    expect(pauseDue(failed.p, MON)).toBe(false);
    // bonus runs out, the break still clears
    let q = P;
    let bonus = 0;
    for (let n = 0; n < 8; n++) {
      for (let i = 0; i < FEED_PAUSE_EVERY; i++) q = withFeedShort(q, SHORT_IDS[n * 8 + i]!, MON).p;
      expect(pauseDue(q, MON)).toBe(true);
      const r = withFeedPause(q, MON, true); q = r.p; bonus += r.paid;
      expect(pauseDue(q, MON)).toBe(false);
    }
    expect(bonus).toBe(FEED_BONUS_PER_DAY * FEED_PAUSE_COINS);
    expect(q.coins).toBe(P.coins + FEED_CAP + bonus);
  });
  it("keeps only two weeks of day tallies", () => {
    let p = P;
    for (let d = 1; d <= 20; d++) p = withFeedShort(p, SHORT_IDS[d]!, `2026-10-${String(d).padStart(2, "0")}`).p;
    expect(Object.keys(feedOf(p).day)).toHaveLength(14);
    expect(feedOf(p).day["2026-10-20"]?.watched).toBe(1);
  });
});
