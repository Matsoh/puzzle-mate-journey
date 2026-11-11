import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { CAST, PERSONAS, REMATCH_GAP_MS, REMATCH_PER_DAY, SHADOW_ELO, SHADOW_LINES, WILD_GAP_MS, WILD_PER_DAY, emptyRivals, firstElo, gamesOf, h2h, migrateRivals, pendingRequests, rematchDue, rematchText, requestDue, rivalDef, rivalIntro, rivalOpponent, rivalbook, shadowBeaten, shadowOpponent, spawnRematch, spawnWild, tick, unread, wildDue, winBonus, withChallenge, withDay, withDecline, withGame, withNotesRead, withRequestAnswer, withShadowWin, type RivalState } from "./rivals";
import { CLASSES } from "./curriculum";
import { rng } from "./tour";

const D1 = "2026-11-12", D2 = "2026-11-13";
const T = 1_800_000_000_000;

describe("the cast", () => {
  it("has unique aliases with a portrait and a persona each", () => {
    expect(CAST.length).toBeGreaterThanOrEqual(40);
    expect(new Set(CAST.map((c) => c.id)).size).toBe(CAST.length);
    expect(new Set(CAST.map((c) => c.alias)).size).toBe(CAST.length);
    expect(new Set(CAST.map((c) => c.figure)).size).toBe(CAST.length);
    for (const c of CAST) {
      expect(existsSync(`public/figures/${c.figure}.png`), c.alias).toBe(true);
      expect(PERSONAS[c.persona]).toBeDefined();
      expect(Math.abs(c.offset)).toBeLessThanOrEqual(150);
      expect(c.id).toMatch(/^[a-z0-9]+$/);
    }
    for (const p of Object.values(PERSONAS)) for (const k of ["challenge", "ahead", "behind", "even", "won", "lost", "request", "accepted"] as const) expect(p[k].length).toBeGreaterThan(0);
  });
  it("shapes a rival as an opponent: secret until played, stable identity", () => {
    const o = rivalOpponent("rival:nattugla", undefined, 1520, D1)!;
    expect(o.id).toBe("rival:nattugla");
    expect(o.secret).toBe(true);
    expect(o.portrait).toBe("/figures/33.png");
    expect(Math.abs(o.elo - 1560)).toBeLessThanOrEqual(40);
    expect(rivalOpponent("nattugla", undefined, 1520, D1)).toBe(o);
    const known = rivalOpponent("rival:nattugla", { elo: 1600, met: D1, w: 1, d: 0, l: 0, friend: "no", last: null }, 1520, D1)!;
    expect(known.secret).toBeUndefined();
    expect(known.elo).toBe(1600);
    expect(rivalOpponent("rival:nobody", undefined, 1500, D1)).toBeUndefined();
    expect(firstElo(rivalDef("maur")!, 1500, D1)).toBeLessThan(1500);
  });
});

describe("encounters", () => {
  it("lets a mysterious player appear, at most three a day with a pause between", () => {
    let s = emptyRivals();
    expect(wildDue(s, D1, T)).toBe(true);
    s = spawnWild(s, 1520, D1, T);
    expect(s.encounters).toHaveLength(1);
    expect(s.encounters[0]!.kind).toBe("wild");
    expect(s.notes[0]).toMatchObject({ kind: "spotted", read: false, text: "En mystisk spiller har fått øye på deg!" });
    expect(unread(s)).toBe(1);
    // one at a time
    expect(wildDue(s, D1, T + WILD_GAP_MS * 2)).toBe(false);
    expect(spawnWild(s, 1520, D1, T + WILD_GAP_MS * 2)).toEqual(s);
    // play it → next one only after the gap
    const first = s.encounters[0]!;
    s = withGame(s, first.rival, "loss", 1500, D1, T + 60_000, first.id);
    expect(s.encounters).toHaveLength(0);
    expect(wildDue(s, D1, T + 120_000)).toBe(false);
    expect(wildDue(s, D1, T + WILD_GAP_MS + 1)).toBe(true);
    let now = T;
    for (let i = 0; i < 6; i++) {
      now += WILD_GAP_MS + 1;
      s = spawnWild(s, 1520, D1, now);
      const e = s.encounters.find((x) => x.kind === "wild");
      if (e) s = withDecline(s, e.id);
    }
    expect(s.today.wild).toBe(WILD_PER_DAY);
    // a new day resets
    expect(wildDue(s, D2, now)).toBe(true);
    const next = spawnWild(s, 1520, D2, now);
    expect(next.today).toMatchObject({ day: D2, wild: 1 });
  });
  it("is deterministic for the same state and moment", () => {
    const a = spawnWild(emptyRivals(), 1520, D1, T), b = spawnWild(emptyRivals(), 1520, D1, T);
    expect(a).toEqual(b);
  });
  it("mostly brings new faces until the book is full", () => {
    let s = emptyRivals();
    const seen = new Set<string>();
    for (let d = 1; d <= 20; d++) {
      const day = `2026-12-${String(d).padStart(2, "0")}`;
      let now = T + d * 86_400_000;
      for (let i = 0; i < WILD_PER_DAY; i++) {
        s = spawnWild(s, 1520, day, now);
        const e = s.encounters.find((x) => x.kind === "wild")!;
        seen.add(e.rival);
        s = withGame(s, e.rival, "draw", 1500, day, now, e.id);
        now += WILD_GAP_MS + 1;
      }
    }
    expect(seen.size).toBeGreaterThan(25);
    expect(rivalbook(s).met).toBe(seen.size);
  });
});

describe("games, requests and rematches", () => {
  const played = (outcome: "win" | "draw" | "loss"): RivalState => {
    const s = spawnWild(emptyRivals(), 1520, D1, T);
    const e = s.encounters[0]!;
    return withGame(s, e.rival, outcome, 1540, D1, T + 1000, e.id);
  };
  it("keeps the score, lets the rival train after losing and asks to be added after a good game", () => {
    const s = played("win");
    const id = Object.keys(s.recs)[0]!;
    const rec = s.recs[id]!;
    expect(rec).toMatchObject({ w: 1, d: 0, l: 0, elo: 1550, met: D1, last: { day: D1, outcome: "win" } });
    expect(h2h(rec)).toBe("1–0");
    expect(h2h(rec, "rival")).toBe("0–1");
    expect(gamesOf(rec)).toBe(1);
    expect(h2h({ ...rec, d: 1 })).toBe("1½–½");
    // requests: most wins lead to one; never more than one a day
    let asked = 0;
    for (const c of CAST.slice(0, 20)) { const x = withGame(emptyRivals(), c.id, "win", 1500, D1, T); if (x.recs[c.id]!.friend === "asked") asked++; }
    expect(asked).toBeGreaterThan(10);
    let many = emptyRivals();
    for (const c of CAST.slice(0, 10)) many = withGame(many, c.id, "win", 1500, D1, T);
    expect(pendingRequests(many)).toHaveLength(1);
    expect(many.notes.filter((n) => n.kind === "request")).toHaveLength(1);
  });
  it("accepting makes a friend who challenges him later with the score in mind", () => {
    let s = emptyRivals();
    const id = CAST.find((c) => withGame(emptyRivals(), c.id, "win", 1500, D1, T).recs[c.id]!.friend === "asked")!.id;
    s = withGame(s, id, "win", 1500, D1, T);
    s = withRequestAnswer(s, id, true, T + 1);
    expect(s.recs[id]!.friend).toBe("yes");
    expect(s.notes.at(-1)).toMatchObject({ kind: "accepted", rival: id });
    expect(withRequestAnswer(s, id, true, T + 2)).toEqual(s);
    // no rematch the same day they played, none too soon
    expect(rematchDue(s, D1, T + REMATCH_GAP_MS * 2)).toBe(false);
    let next = withDay(s, D2, 1520);
    next = { ...next, today: { ...next.today, lastAt: T } };
    expect(rematchDue(next, D2, T + 1000)).toBe(false);
    expect(rematchDue(next, D2, T + REMATCH_GAP_MS + 1)).toBe(true);
    next = spawnRematch(next, 1520, D2, T + REMATCH_GAP_MS + 1);
    const e = next.encounters.find((x) => x.kind === "rematch")!;
    expect(e.rival).toBe(id);
    expect(next.notes.at(-1)).toMatchObject({ kind: "challenge", enc: e.id });
    expect(next.notes.at(-1)!.text).toContain(rivalDef(id)!.alias);
    expect(rematchDue(next, D2, T + REMATCH_GAP_MS * 3)).toBe(false); // one open at a time
    expect(REMATCH_PER_DAY).toBeGreaterThan(0);
    // declining a request
    const no = withRequestAnswer(withGame(emptyRivals(), id, "win", 1500, D1, T), id, false, T + 1);
    expect(no.recs[id]!.friend).toBe("declined");
    expect(rematchDue(withDay(no, D2, 1520), D2, T + REMATCH_GAP_MS * 5)).toBe(false);
  });
  it("words the rematch by who leads", () => {
    const def = rivalDef("dommer")!;
    const base = { elo: 1600, met: D1, friend: "yes" as const, last: null };
    expect(PERSONAS.mur.challenge).toContain(rematchText(def, undefined, rng(1)));
    expect(rematchText(def, { ...base, w: 0, d: 0, l: 2 }, rng(1))).toMatch(/2–0/);
    expect(PERSONAS.mur.behind.map((x) => x.replace("{h2h}", "0–2"))).toContain(rematchText(def, { ...base, w: 2, d: 0, l: 0 }, rng(1)));
    expect(PERSONAS.mur.even.map((x) => x.replace("{h2h}", "1–1"))).toContain(rematchText(def, { ...base, w: 1, d: 0, l: 1 }, rng(1)));
    expect(rivalIntro(def, undefined)).toMatch(/Never seen/);
    expect(rivalIntro(def, { ...base, w: 2, d: 0, l: 1 })).toMatch(/You lead 2–1/);
    expect(rivalIntro(def, { ...base, w: 0, d: 0, l: 1 })).toMatch(/1–0 to them/);
  });
  it("lets him challenge a rival he knows, any time", () => {
    const s = played("loss");
    const id = Object.keys(s.recs)[0]!;
    const r = withChallenge(s, id, 1520, D1, T + 5000);
    expect(r.enc).toMatchObject({ rival: id, kind: "rematch" });
    expect(withChallenge(r.s, id, 1520, D1, T + 6000).enc!.id).toBe(r.enc!.id);
    expect(withChallenge(s, "nattugla-x", 1520, D1, T).enc).toBeNull();
    expect(withChallenge(emptyRivals(), "nattugla", 1520, D1, T).enc).toBeNull(); // not met yet
  });
  it("friends train towards his level overnight; yesterday's encounters vanish", () => {
    let s = withGame(emptyRivals(), "dommer", "loss", 1400, D1, T);
    s = spawnWild(s, 1700, D1, T + WILD_GAP_MS + 1);
    expect(s.encounters).toHaveLength(1);
    const next = withDay(s, D2, 1700);
    expect(next.encounters).toHaveLength(0);
    expect(next.recs["dommer"]!.elo).toBeGreaterThan(s.recs["dommer"]!.elo);
    expect(next.recs["dommer"]!.elo).toBeLessThan(1780);
    expect(withDay(next, D2, 1700)).toBe(next);
  });
  it("lets someone he played on an earlier day ask to be added – some days, one at a time", () => {
    const base = { ...emptyRivals(), recs: { dommer: { elo: 1600, met: D1, w: 0, d: 0, l: 1, friend: "no" as const, last: { day: D1, outcome: "loss" as const } } } };
    // never on the day they played
    expect(requestDue(withDay(base, D1, 1520), D1)).toBeNull();
    let asked = 0, days = 0;
    for (let d = 14; d <= 30; d++) {
      const day = `2026-11-${d}`;
      const s = tick(base, 1520, day, T + d * 86_400_000);
      days++;
      if (s.recs["dommer"]!.friend === "asked") {
        asked++;
        expect(s.notes.at(-1)).toMatchObject({ kind: "request", rival: "dommer" });
        expect(s.encounters).toHaveLength(0); // one thing per tick
        expect(requestDue(s, day)).toBeNull(); // not while one is waiting
        const after = tick(s, 1520, day, T + d * 86_400_000 + 1000);
        expect(after.encounters).toHaveLength(1); // the world goes on at the next tick
      }
    }
    expect(asked).toBeGreaterThan(3);
    expect(asked).toBeLessThan(days);
    // declined or already friends: nobody asks again
    const no = { ...base, recs: { dommer: { ...base.recs.dommer, friend: "declined" as const } } };
    for (let d = 14; d <= 30; d++) expect(requestDue(withDay(no, `2026-11-${d}`, 1520), `2026-11-${d}`)).toBeNull();
  });
  it("tick prefers a friend's rematch, else a new face; reading clears the bell but keeps requests", () => {
    let s = tick(emptyRivals(), 1520, D1, T);
    expect(s.encounters[0]!.kind).toBe("wild");
    expect(tick(s, 1520, D1, T + 1000)).toEqual(s);
    expect(unread(withNotesRead(s))).toBe(0);
    const id = CAST.find((c) => withGame(emptyRivals(), c.id, "win", 1500, D1, T).recs[c.id]!.friend === "asked")!.id;
    const asked = withGame(emptyRivals(), id, "win", 1500, D1, T);
    expect(unread(withNotesRead(asked))).toBe(1);
    expect(migrateRivals(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(migrateRivals(null)).toEqual(emptyRivals());
    expect(migrateRivals({ encounters: [{ id: "x", rival: "gone" }] }).encounters).toEqual([]);
  });
});

describe("bonuses", () => {
  it("pays the first win over a rival and Skyggen's fall once each, and nothing for losses or ladder bosses", () => {
    expect(winBonus({}, "rival:nattugla", "win")).toEqual({ id: "rival:nattugla:first", xp: 20, coins: 0 });
    expect(winBonus({ "rival:nattugla:first": 20 }, "rival:nattugla", "win")).toBeNull();
    expect(winBonus({}, "rival:nattugla", "draw")).toBeNull();
    expect(winBonus({}, "rival:nobody", "win")).toBeNull();
    expect(winBonus({}, "shadow:2", "win")).toEqual({ id: "shadow:2", xp: 40, coins: 20 });
    expect(winBonus({ "shadow:2": 40 }, "shadow:2", "win")).toBeNull();
    expect(winBonus({ "shadow:2": 40 }, "shadow:3", "win")).not.toBeNull();
    expect(winBonus({}, "shadow:9", "win")).toBeNull();
    expect(winBonus({}, "pelle", "win")).toBeNull();
    expect(winBonus({}, undefined, "win")).toBeNull();
  });
});

describe("Skyggen", () => {
  it("waits in every region, a little stronger than the class bot, and falls once", () => {
    expect(SHADOW_ELO).toHaveLength(CLASSES.length);
    expect(SHADOW_LINES).toHaveLength(CLASSES.length);
    CLASSES.forEach((c, i) => { expect(SHADOW_ELO[i]!).toBeGreaterThan(c.botElo); expect(SHADOW_ELO[i]!).toBeLessThanOrEqual(c.botElo + 80); });
    const o = shadowOpponent("shadow:3")!;
    expect(o).toMatchObject({ id: "shadow:3", name: "Skyggen", elo: 1660, secret: true });
    expect(shadowOpponent("shadow:3")).toBe(o);
    expect(shadowOpponent("shadow:9")).toBeUndefined();
    expect(existsSync("public/rivals/shadow.svg")).toBe(true);
    let s = emptyRivals();
    expect(shadowBeaten(s, 3)).toBe(false);
    s = withShadowWin(withShadowWin(s, 3), 1);
    expect(s.shadow).toEqual([1, 3]);
    expect(withShadowWin(s, 3)).toBe(s);
  });
});
