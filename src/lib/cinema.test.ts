import { describe, expect, it } from "vitest";
import { CLIPS, getClip } from "@/data/gotham";
import { DAY_CAP, PROVE_COINS, SHORTS_PER_DAY, clipsFor, dailyClip, grouped, mikeCinemaLine, recommendation, shortsToday, watchCoins, withProven, withWatched } from "./cinema";
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
