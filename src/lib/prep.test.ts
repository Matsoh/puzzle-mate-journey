import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { OPENINGS, getOpening } from "@/data/openings";
import {
  buildSession, cleanPlan, drillHint, emptyRec, ENDGAME_TOPICS, fenAt, forkAfter, gradeDrillMove, migratePrep, oldNotes, pickTopicItem,
  playerMovesAt, recordDrill, recordTopic, sessionSummary, TACTIC_TOPICS, threats, topicStartFen, branchFor, trainedCount,
} from "./prep";
import { newTournament, defaultSetup } from "./tournament";

describe("opening catalog", () => {
  it("has 10 unique openings, each with ≥2 legal branches and a Lichess ECO", () => {
    expect(OPENINGS).toHaveLength(10);
    expect(new Set(OPENINGS.map((o) => o.id)).size).toBe(10);
    for (const o of OPENINGS) {
      expect(o.branches.length).toBeGreaterThanOrEqual(2);
      expect(o.why.options[o.why.correct]).toBeTruthy();
      for (const b of o.branches) {
        const c = new Chess();
        for (const m of b.moves) c.move(m);
        expect(b.eco).toMatch(/^[A-E]\d\d$/);
      }
      expect(o.side === "white" ? b0(o).moves[0] : b0(o).moves[1]).toBeTruthy();
    }
  });
  it("black openings start with the right first move for their group", () => {
    for (const o of OPENINGS.filter((x) => x.side === "black")) for (const b of o.branches) expect(b.moves[0]).toBe(o.group === "e4" ? "e4" : "d4");
  });
});
const b0 = (o: (typeof OPENINGS)[number]) => o.branches[0]!;

describe("plan", () => {
  it("removes duplicates and unknown ids, one-plan keeps one", () => {
    expect(cleanPlan({ mode: "many", openings: ["italiensk", "italiensk", "x", "fransk"] }).openings).toEqual(["italiensk", "fransk"]);
    expect(cleanPlan({ mode: "one", openings: ["london", "fransk"] }).openings).toEqual(["london"]);
  });
  it("three chosen openings give three different training runs", () => {
    const plan = { mode: "many" as const, openings: ["italiensk", "carokann", "kongeindisk"] };
    const s = buildSession(plan, {}, "2026-10-12", 15, "fork", "kp");
    expect(s.steps.filter((x) => x.kind === "opening").map((x) => x.ref)).toEqual(["italiensk", "carokann", "kongeindisk"]);
    const starts = plan.openings.map((id) => branchFor(getOpening(id)!, undefined).moves.join(" "));
    expect(new Set(starts).size).toBe(3);
    expect(s.steps.map((x) => x.kind)).toEqual(["opening", "opening", "opening", "tactic", "endgame"]);
    expect(buildSession(plan, {}, "d", 5, "fork", "kp").steps).toHaveLength(1);
  });
});

describe("drill", () => {
  const ital = getOpening("italiensk")!, caro = getOpening("carokann")!;
  it("grades line move, off-line legal move and illegal move", () => {
    expect(gradeDrillMove(ital.branches[0]!, 0, "e2", "e4").kind).toBe("line");
    expect(gradeDrillMove(ital.branches[0]!, 0, "d2", "d4").kind).toBe("offline");
    expect(gradeDrillMove(ital.branches[0]!, 0, "e2", "e5").kind).toBe("illegal");
  });
  it("black side: player moves at odd plies with correct turn", () => {
    expect(playerMovesAt(caro, 1)).toBe(true);
    expect(fenAt(caro.branches[1]!, 1).split(" ")[1]).toBe("b");
    expect(gradeDrillMove(caro.branches[1]!, 1, "c7", "c6").kind).toBe("line");
  });
  it("hints go idea → piece/square → move", () => {
    expect(drillHint(ital, ital.branches[0]!, 4, 1).text).toMatch(/planen/);
    expect(drillHint(ital, ital.branches[0]!, 4, 2).text).toBe("Flytt løperen på f1.");
    expect(drillHint(ital, ital.branches[0]!, 4, 3).arrow).toEqual(["f1", "c4"]);
  });
  it("scheduler: 1/3/7 days, help resets, early repeat is not mastery, alternates branch", () => {
    let r = recordDrill(emptyRec(), ital, "giuoco", "2026-10-12", true);
    expect(r.dueDay).toBe("2026-10-13"); expect(r.nextBranch).toBe(1);
    const early = recordDrill(r, ital, "tospringer", "2026-10-12", true);
    expect(early.independent).toBe(1); expect(early.dueDay).toBe("2026-10-13");
    r = recordDrill(r, ital, "tospringer", "2026-10-13", true); expect(r.dueDay).toBe("2026-10-16");
    r = recordDrill(r, ital, "giuoco", "2026-10-16", true); expect(r.dueDay).toBe("2026-10-23");
    const h = recordDrill(r, ital, "giuoco", "2026-10-23", false);
    expect(h.streak).toBe(0); expect(h.dueDay).toBe("2026-10-24"); expect(h.nextBranch).toBe(0); expect(h.independent).toBe(r.independent);
  });
  it("progress counts only practised openings", () => {
    expect(trainedCount({ mode: "many", openings: ["a", "b", "c"] }, { a: { ...emptyRec(), practiced: 1 } })).toEqual({ trained: 1, total: 3 });
  });
  it("summary only uses recorded events", () => {
    expect(sessionSummary([])).toHaveLength(1);
    expect(sessionSummary([{ kind: "opening", ref: "x", independent: true, note: "" }])).toEqual(["Du øvde på 1 åpning.", "Én spilte du helt uten hjelp."]);
  });
});

describe("topics", () => {
  it("every dropdown topic has real bank puzzles of that theme", () => {
    for (const t of [...TACTIC_TOPICS, ...ENDGAME_TOPICS]) expect(t.items.length).toBeGreaterThan(0);
    expect(TACTIC_TOPICS.find((t) => t.id === "fork")!.items.every((i) => i.theme === "fork")).toBe(true);
    for (const i of ENDGAME_TOPICS.find((t) => t.id === "aktivkonge")!.items) expect(new Chess(topicStartFen(i)).get(i.line[1]!.slice(0, 2) as never)?.type).toBe("k");
  });
  it("picks unseen first, then due review; help re-queues for tomorrow", () => {
    const t = TACTIC_TOPICS[0]!;
    const a = pickTopicItem(t, {}, "2026-10-12")!;
    const recs = { [a.id]: recordTopic(undefined, "2026-10-12", false) };
    expect(pickTopicItem(t, recs, "2026-10-12")!.id).not.toBe(a.id);
    expect(pickTopicItem(t, recs, "2026-10-13")!.id).toBe(a.id);
  });
});

describe("verified facts", () => {
  it("detects a real knight fork", () => {
    expect(forkAfter("3q3k/6pp/8/4N3/8/8/6PP/6K1 w - - 0 1", "e5f7")?.targets).toEqual(["dronningen på d8", "kongen på h8"]);
    expect(forkAfter("3q3k/6pp/8/4N3/8/8/6PP/6K1 w - - 0 1", "e5d3")).toBeNull();
  });
  it("lists the bot's threats from the real position", () => {
    const t = threats("6k1/5ppp/8/8/8/8/5PPP/r5K1 w - - 0 1");
    expect(t.inCheck).toBe(true);
    const u = threats("r5k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1");
    expect(u.list.join(" ")).toMatch(/Ra1#/);
  });
});

describe("storage", () => {
  it("migrates bad data safely and keeps old notes readable", () => {
    expect(migratePrep("x").plan).toBeNull();
    expect(migratePrep({ version: 1, plan: { mode: "many", openings: ["fransk", "fransk"] }, tacticTopic: "zzz" }).plan?.openings).toEqual(["fransk"]);
    expect(migratePrep({ version: 1, tacticTopic: "zzz" }).tacticTopic).toBe("fork");
    const t = newTournament(defaultSetup("2026-10-20"), "a", 0);
    t.prep.vsE4 = "Caro-Kann";
    expect(oldNotes([t])).toEqual([{ from: "Turnering", label: "Mitt svar mot 1.e4", text: "Caro-Kann" }]);
  });
});
