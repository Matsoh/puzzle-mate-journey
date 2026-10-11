import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { BANK, THEMES, emptyCoach, getItem, gradeStep, recordOutcome, markSeen, pickNext, pickReview, levelFromTest, fenAfter, explain, type CoachState } from "./adaptive";
import { migrate } from "./trainer-store";
import { EXERCISES } from "./trainer";

const D = "2026-10-11";
const uci = (u: string) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

describe("bank", () => {
  it("has ≥36 unique positions across 2 profiles, 8 themes, 3 levels", () => {
    expect(BANK.length).toBeGreaterThanOrEqual(36);
    expect(new Set(BANK.map((b) => b.fen)).size).toBe(BANK.length);
    expect(new Set(BANK.map((b) => b.id)).size).toBe(BANK.length);
    for (const b of BANK) expect(EXERCISES.map((e) => e.fen)).not.toContain(b.fen);
    for (const c of ["magnus", "hikaru"] as const) for (const t of THEMES[c]) for (const l of [0, 1, 2])
      expect(BANK.filter((b) => b.coach === c && b.theme === t.id && b.level === l).length).toBeGreaterThanOrEqual(2);
  });
  it.each(BANK)("$id: every solution move is legal; mate themes end in mate", (b) => {
    const c = new Chess(b.fen);
    for (const u of b.line) expect(() => c.move(uci(u))).not.toThrow();
    if (b.theme === "mateIn2") expect(c.isCheckmate()).toBe(true);
    expect(explain(b)).toContain("Løsningen");
  });
});

describe("solving", () => {
  const it2 = BANK.find((b) => b.line.length >= 4)!;
  it("correct step plays the opponent's reply automatically", () => {
    const u = it2.line[1]!;
    const r = gradeStep(it2, 1, u.slice(0, 2), u.slice(2, 4));
    expect(r).toMatchObject({ legal: true, correct: true, done: false });
    if (r.legal && r.correct) expect(r.reply!.fen).toBe(fenAfter(it2, 3));
  });
  it("wrong legal move is graded wrong, illegal rejected", () => {
    const c = new Chess(fenAfter(it2, 1));
    const wrong = c.moves({ verbose: true }).find((m) => m.lan !== it2.line[1] && !(() => { const x = new Chess(c.fen()); x.move(m.lan); return x.isCheckmate(); })())!;
    expect(gradeStep(it2, 1, wrong.from, wrong.to)).toMatchObject({ legal: true, correct: false });
    expect(gradeStep(it2, 1, "a1", "h8").legal).toBe(false);
  });
});

const run = (cs: CoachState, theme: string, outs: ("good" | "helped" | "fail")[], level?: number) => {
  for (const o of outs) {
    const lvl = level ?? cs.levels[theme];
    const pool = BANK.filter((b) => b.coach === "hikaru" && b.theme === theme && !cs.items[b.id]);
    const item = pool.find((b) => b.level === lvl) ?? pool.find((b) => b.level >= lvl!) ?? pool[0]!;
    cs = recordOutcome(cs, item, o, 0, D);
  }
  return cs;
};

describe("skill model", () => {
  it("starts at Utfordring", () => expect(emptyCoach("hikaru").levels.fork).toBe(1));
  it("3 of last 4 good raises one level", () => {
    const cs = run(emptyCoach("hikaru"), "fork", ["good", "helped", "good", "good"]);
    expect(cs.levels.fork).toBe(2);
    expect(cs.levels.pin).toBe(1);
  });
  it("one mistake does not lower; persistent trouble lowers one", () => {
    let cs = run(emptyCoach("hikaru"), "pin", ["fail"]);
    expect(cs.levels.pin).toBe(1);
    cs = run(cs, "pin", ["helped", "fail", "good"]);
    expect(cs.levels.pin).toBe(0);
  });
  it("skip records nothing", () => {
    const cs = markSeen(emptyCoach("hikaru"), BANK.find((b) => b.coach === "hikaru")!.id, D);
    expect(cs.seq).toBe(0);
    expect(Object.values(cs.recent).flat()).toHaveLength(0);
  });
  it("profiles are separate", () => {
    const cs = run(emptyCoach("hikaru"), "fork", ["good"]);
    const p = pickNext(cs, "magnus", D);
    expect("id" in p && getItem(p.id)!.coach).toBe("magnus");
  });
  it("level test mapping", () => {
    expect(levelFromTest(["good", "good", "good", "fail"])).toBe(2);
    expect(levelFromTest(["good", "fail", "fail", "fail"])).toBe(1);
    expect(levelFromTest(["fail", "helped", "fail", "fail"])).toBe(0);
  });
});

describe("selection and repetition", () => {
  it("serves new, different tasks and not the current one", () => {
    let cs = emptyCoach("hikaru");
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const p = pickNext(cs, "hikaru", D);
      if (!("id" in p)) throw new Error("exhausted");
      expect(seen.has(p.id)).toBe(false);
      seen.add(p.id);
      cs = markSeen({ ...cs, current: p.id }, p.id, D);
    }
  });
  it("failed task returns only after other tasks and a later day", () => {
    let cs = emptyCoach("hikaru");
    const failed = BANK.find((b) => b.coach === "hikaru" && b.level === 1)!;
    cs = recordOutcome({ ...cs, current: failed.id }, failed, "fail", 2, D);
    const idsSameDay: string[] = [];
    for (let i = 0; i < 5; i++) {
      const p = pickNext(cs, "hikaru", D); if (!("id" in p)) break;
      idsSameDay.push(p.id); cs = recordOutcome({ ...cs, current: p.id }, getItem(p.id)!, "helped", 0, D);
    }
    expect(idsSameDay).not.toContain(failed.id);
    const p = pickNext({ ...cs, currentReview: false }, "hikaru", "2026-10-12");
    expect(p).toMatchObject({ id: expect.any(String), review: true });
  });
  it("honestly reports an exhausted level", () => {
    let cs = emptyCoach("hikaru", 0);
    for (const b of BANK.filter((x) => x.coach === "hikaru" && x.level === 0)) cs = markSeen(cs, b.id, D);
    const p = pickNext(cs, "hikaru", D);
    expect(p).toEqual({ exhausted: true, suggest: 1 });
    expect(pickReview(cs, "hikaru")).toBeTruthy();
  });
});

describe("migration", () => {
  it("keeps coach and session rewards from v1", () => {
    const s = migrate({ version: 1, coach: "magnus", sessions: { "2026-10-10:magnus": { exercise: true, reflection: "x", done: true, xpGiven: true } } });
    expect(s.version).toBe(2);
    expect(s.coach).toBe("magnus");
    expect(s.sessions["2026-10-10:magnus"]!.xpGiven).toBe(true);
    expect(s.coaches.hikaru.levels.fork).toBe(1);
  });
  it("ignores garbage", () => expect(migrate("x").coach).toBeNull());
});
