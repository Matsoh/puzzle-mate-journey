/** Pure tournament-prep rules: plan, opening drill, scheduler, sessions, topics, verified hints. Never touches app rating/XP. */
import { Chess, type Square } from "chess.js";
import { OPENINGS, getOpening, type Branch, type Opening } from "@/data/openings";
import { BANK, playerColor, type TrainingItem } from "./adaptive";
import { addDays } from "./adaptive";
import type { Tournament } from "./tournament";

export type PlanMode = "one" | "many";
export type Plan = { mode: PlanMode; openings: string[] };
export type OpeningRec = {
  practiced: number;
  independent: number;
  helped: number;
  streak: number;
  lastDay: string;
  dueDay: string;
  nextBranch: number;
  seen: string[];
};
export type TopicRec = {
  attempts: number;
  independent: number;
  streak: number;
  lastDay: string;
  dueDay: string;
};
export type StepKind = "opening" | "tactic" | "endgame";
export type Step = { kind: StepKind; ref: string };
export type SessionEvent = { kind: StepKind; ref: string; independent: boolean; note: string };
export type Session = {
  day: string;
  minutes: 5 | 10 | 15;
  steps: Step[];
  idx: number;
  events: SessionEvent[];
  done: boolean;
};
export type TrainingGame = {
  id: string;
  day: string;
  source: string;
  elo: number;
  result: "win" | "draw" | "loss" | "stopped";
  plies: number;
  helpUsed: number;
};
export type Current = { kind: "tactic" | "endgame"; topic: string; itemId: string } | null;
export type PrepState = {
  version: 1;
  plan: Plan | null;
  openings: Record<string, OpeningRec>;
  topics: Record<string, TopicRec>;
  session: Session | null;
  games: TrainingGame[];
  current: { tactic: Current; endgame: Current };
  tacticTopic: string;
  endgameTopic: string;
};

export const INTERVALS = [1, 3, 7] as const;
export const MAX_OPENINGS = 5;
export const BOT_LEVELS = [1200, 1400, 1550, 1700, 1850, 2000] as const;

export const emptyPrep = (): PrepState => ({
  version: 1,
  plan: null,
  openings: {},
  topics: {},
  session: null,
  games: [],
  current: { tactic: null, endgame: null },
  tacticTopic: "fork",
  endgameTopic: "kp",
});
export const emptyRec = (): OpeningRec => ({
  practiced: 0,
  independent: 0,
  helped: 0,
  streak: 0,
  lastDay: "",
  dueDay: "",
  nextBranch: 0,
  seen: [],
});

/** Unique, known, 1–5 openings; "one" keeps only the first. */
export function cleanPlan(p: Plan): Plan {
  const ids = [...new Set(p.openings)]
    .filter((id) => !!getOpening(id))
    .slice(0, p.mode === "one" ? 1 : MAX_OPENINGS);
  return { mode: p.mode, openings: ids };
}

/* ---------- Opening drill ---------- */

export const playerMovesAt = (o: Opening, ply: number) =>
  o.side === "white" ? ply % 2 === 0 : ply % 2 === 1;
export function fenAt(b: Branch, ply: number): string {
  const c = new Chess();
  for (const m of b.moves.slice(0, ply)) c.move(m);
  return c.fen();
}
export type DrillGrade =
  | { kind: "illegal" }
  | { kind: "line"; san: string }
  | { kind: "offline"; san: string; fen: string };
export function gradeDrillMove(
  b: Branch,
  ply: number,
  from: string,
  to: string,
  promotion = "q",
): DrillGrade {
  const c = new Chess(fenAt(b, ply));
  try {
    const m = c.move({ from, to, promotion });
    return m.san === b.moves[ply]
      ? { kind: "line", san: m.san }
      : { kind: "offline", san: m.san, fen: c.fen() };
  } catch {
    return { kind: "illegal" };
  }
}
const PIECE_NO: Record<string, string> = {
  p: "bonden",
  n: "springeren",
  b: "løperen",
  r: "tårnet",
  q: "dronningen",
  k: "kongen",
};
/** Level 1 idea → 2 piece/square → 3 show move. */
export function drillHint(
  o: Opening,
  b: Branch,
  ply: number,
  level: 1 | 2 | 3,
): { text: string; arrow?: [string, string] } {
  const c = new Chess(fenAt(b, ply));
  const m = c.move(b.moves[ply]!);
  if (level === 1) return { text: `Tenk på planen: ${o.idea}` };
  if (level === 2) return { text: `Flytt ${PIECE_NO[m.piece]} på ${m.from}.` };
  return { text: `Trekket er ${m.san}.`, arrow: [m.from, m.to] };
}
export const branchFor = (o: Opening, rec: OpeningRec | undefined) =>
  o.branches[(rec?.nextBranch ?? 0) % o.branches.length]!;

/** Spaced repetition 1/3/7 days. Early repeats count as practice only, never as mastery. */
export function recordDrill(
  rec: OpeningRec = emptyRec(),
  o: Opening,
  branchId: string,
  day: string,
  independent: boolean,
): OpeningRec {
  const bi = Math.max(
    0,
    o.branches.findIndex((b) => b.id === branchId),
  );
  const seen = rec.seen.includes(branchId) ? rec.seen : [...rec.seen, branchId];
  const base = { ...rec, practiced: rec.practiced + 1, lastDay: day, seen };
  if (!independent)
    return { ...base, helped: rec.helped + 1, streak: 0, dueDay: addDays(day, 1), nextBranch: bi };
  const due = !rec.dueDay || day >= rec.dueDay;
  if (!due) return { ...base, nextBranch: (bi + 1) % o.branches.length };
  return {
    ...base,
    independent: rec.independent + 1,
    streak: Math.min(rec.streak + 1, 3),
    dueDay: addDays(day, INTERVALS[Math.min(rec.streak, 2)]!),
    nextBranch: (bi + 1) % o.branches.length,
  };
}
export const isDue = (rec: OpeningRec | TopicRec | undefined, day: string) =>
  !rec || !rec.dueDay || day >= rec.dueDay;

/* ---------- Sessions ---------- */

export function orderOpenings(plan: Plan, recs: Record<string, OpeningRec>, day: string): string[] {
  return [...plan.openings].sort((a, b) => {
    const ra = recs[a],
      rb = recs[b];
    const ka = !ra ? 0 : isDue(ra, day) ? 1 : 2,
      kb = !rb ? 0 : isDue(rb, day) ? 1 : 2;
    if (ka !== kb) return ka - kb;
    return (
      (ra?.dueDay ?? "").localeCompare(rb?.dueDay ?? "") ||
      plan.openings.indexOf(a) - plan.openings.indexOf(b)
    );
  });
}
export function buildSession(
  plan: Plan,
  recs: Record<string, OpeningRec>,
  day: string,
  minutes: 5 | 10 | 15,
  tacticTopic: string,
  endgameTopic: string,
): Session {
  const n = minutes === 5 ? 1 : minutes === 10 ? 2 : 3;
  const steps: Step[] = orderOpenings(plan, recs, day)
    .slice(0, n)
    .map((ref) => ({ kind: "opening", ref }));
  if (minutes >= 10) steps.push({ kind: "tactic", ref: tacticTopic });
  if (minutes === 15) steps.push({ kind: "endgame", ref: endgameTopic });
  return { day, minutes, steps, idx: 0, events: [], done: false };
}
export function trainedCount(plan: Plan | null, recs: Record<string, OpeningRec>) {
  const ids = plan?.openings ?? [];
  return { trained: ids.filter((id) => (recs[id]?.practiced ?? 0) > 0).length, total: ids.length };
}
/** Concrete praise only from recorded events. */
export function sessionSummary(events: SessionEvent[]): string[] {
  const out: string[] = [];
  const op = events.filter((e) => e.kind === "opening");
  const solo = op.filter((e) => e.independent);
  if (op.length) out.push(`Du øvde på ${op.length} ${op.length === 1 ? "åpning" : "åpninger"}.`);
  if (solo.length) out.push(`${solo.length === 1 ? "Én" : solo.length} spilte du helt uten hjelp.`);
  for (const e of events.filter((x) => x.kind !== "opening")) out.push(e.note);
  if (!out.length) out.push("Du startet økta. Neste gang fortsetter du der du slapp.");
  return out;
}

/* ---------- Topics (real bank puzzles) ---------- */

export type Topic = { id: string; label: string; note: string; items: TrainingItem[] };
const theme = (t: string) => BANK.filter((b) => b.theme === t);
const firstPlayerMoveIsKing = (it: TrainingItem) => {
  const c = new Chess(it.fen);
  c.move({
    from: it.line[0]!.slice(0, 2),
    to: it.line[0]!.slice(2, 4),
    promotion: it.line[0]![4] ?? "q",
  });
  return c.get(it.line[1]!.slice(0, 2) as Square)?.type === "k";
};
export const TACTIC_TOPICS: Topic[] = [
  { id: "fork", label: "Gaffel", note: "Én brikke angriper to ting.", items: theme("fork") },
  {
    id: "pin",
    label: "Binding",
    note: "En brikke kan ikke flytte uten å miste noe bak.",
    items: theme("pin"),
  },
  { id: "mate", label: "Matting", note: "Matt i to trekk.", items: theme("mateIn2") },
  {
    id: "motspill",
    label: "Finne motspill",
    note: "Stopp trusselen og finn et godt svar.",
    items: theme("defensiveMove"),
  },
];
const ENDGAME_POOL = BANK.filter((b) =>
  ["pawnEndgame", "rookEndgame", "advancedPawn"].includes(b.theme),
);
export const ENDGAME_TOPICS: Topic[] = [
  { id: "kp", label: "Konge og bonde", note: "Bondesluttspill.", items: theme("pawnEndgame") },
  {
    id: "aktivkonge",
    label: "Aktiv konge",
    note: "Første trekk er et kongetrekk.",
    items: ENDGAME_POOL.filter(firstPlayerMoveIsKing),
  },
  {
    id: "fribonde",
    label: "Fribonde",
    note: "Bønder nær forvandling.",
    items: theme("advancedPawn"),
  },
  { id: "taarn", label: "Tårnsluttspill", note: "Tårn og bønder.", items: theme("rookEndgame") },
];
export const topicById = (kind: "tactic" | "endgame", id: string) =>
  (kind === "tactic" ? TACTIC_TOPICS : ENDGAME_TOPICS).find((t) => t.id === id);

/** Due reviews first, then unseen, then oldest. Deterministic. */
export function pickTopicItem(
  t: Topic,
  recs: Record<string, TopicRec>,
  day: string,
  avoid?: string,
): TrainingItem | null {
  const pool = t.items.filter((i) => i.id !== avoid);
  const list = pool.length ? pool : t.items;
  const review = list.filter(
    (i) => recs[i.id] && recs[i.id]!.streak === 0 && isDue(recs[i.id], day),
  );
  if (review.length) return review[0]!;
  const unseen = list.filter((i) => !recs[i.id]);
  if (unseen.length) return unseen[0]!;
  return (
    [...list].sort((a, b) => recs[a.id]!.lastDay.localeCompare(recs[b.id]!.lastDay))[0] ?? null
  );
}
export function recordTopic(
  rec: TopicRec | undefined,
  day: string,
  independent: boolean,
): TopicRec {
  const r = rec ?? { attempts: 0, independent: 0, streak: 0, lastDay: "", dueDay: "" };
  if (!independent)
    return { ...r, attempts: r.attempts + 1, lastDay: day, streak: 0, dueDay: addDays(day, 1) };
  if (!isDue(rec, day)) return { ...r, attempts: r.attempts + 1, lastDay: day };
  return {
    attempts: r.attempts + 1,
    independent: r.independent + 1,
    lastDay: day,
    streak: Math.min(r.streak + 1, 3),
    dueDay: addDays(day, INTERVALS[Math.min(r.streak, 2)]!),
  };
}
export const topicStartFen = (it: TrainingItem) => {
  const c = new Chess(it.fen);
  const u = it.line[0]!;
  c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] ?? "q" });
  return c.fen();
};
export const topicSide = (it: TrainingItem) => playerColor(it);

/* ---------- Verified position facts for coach help ---------- */

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
/** A real fork: after the move the piece attacks ≥2 enemy pieces worth at least as much (or the king). */
export function forkAfter(fen: string, uci: string): { square: string; targets: string[] } | null {
  const c = new Chess(fen);
  let m;
  try {
    m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" });
  } catch {
    return null;
  }
  const me = m.color,
    val = VAL[m.promotion ?? m.piece]!;
  const targets: string[] = [];
  for (const row of c.board())
    for (const sq of row) {
      if (!sq || sq.color === me || (VAL[sq.type]! < val && sq.type !== "k") || sq.type === "p")
        continue;
      if (c.attackers(sq.square, me).includes(m.to))
        targets.push(`${PIECE_NO[sq.type]} på ${sq.square}`);
    }
  return targets.length >= 2 ? { square: m.to, targets } : null;
}
/** What the side NOT to move threatens if it could move again: checks and captures, verified by chess.js. */
export function threats(fen: string): { inCheck: boolean; list: string[]; flipped: string | null } {
  const c = new Chess(fen);
  if (c.inCheck())
    return { inCheck: true, list: ["Du står i sjakk. Først må kongen bli trygg."], flipped: null };
  const parts = fen.split(" ");
  parts[1] = parts[1] === "w" ? "b" : "w";
  parts[3] = "-";
  const flipped = parts.join(" ");
  let o: Chess;
  try {
    o = new Chess(flipped);
  } catch {
    return { inCheck: false, list: [], flipped: null };
  }
  const list: string[] = [];
  for (const m of o.moves({ verbose: true })) {
    if (m.san.includes("#")) list.push(`${m.san} ville vært matt.`);
    else if (m.captured) {
      const defended = c.attackers(m.to as Square, c.turn()).length > 0;
      if (!defended || VAL[m.captured]! > VAL[m.piece]!)
        list.push(
          `${m.san} slår ${PIECE_NO[m.captured]} på ${m.to}${defended ? "" : ", som ikke er dekket"}.`,
        );
    }
  }
  return { inCheck: false, list: [...new Set(list)].slice(0, 4), flipped };
}

/* ---------- Migration of old notes ---------- */

export function oldNotes(list: Tournament[]): { from: string; label: string; text: string }[] {
  const L: [keyof Tournament["prep"], string][] = [
    ["whiteOpening", "Min åpning med hvit"],
    ["vsE4", "Mitt svar mot 1.e4"],
    ["vsD4", "Mitt svar mot 1.d4"],
    ["plan", "Plan og huskeregel"],
  ];
  return list.flatMap((t) =>
    L.filter(([k]) => t.prep?.[k]?.trim()).map(([k, label]) => ({
      from: t.setup.name,
      label,
      text: t.prep[k],
    })),
  );
}

export function migratePrep(raw: unknown): PrepState {
  const base = emptyPrep();
  if (!raw || typeof raw !== "object" || (raw as PrepState).version !== 1) return base;
  const r = raw as Partial<PrepState>;
  const plan = r.plan && Array.isArray(r.plan.openings) ? cleanPlan(r.plan) : null;
  return {
    ...base,
    ...r,
    version: 1,
    plan,
    openings: r.openings && typeof r.openings === "object" ? r.openings : {},
    topics: r.topics && typeof r.topics === "object" ? r.topics : {},
    games: Array.isArray(r.games) ? r.games.slice(-30) : [],
    current: { tactic: r.current?.tactic ?? null, endgame: r.current?.endgame ?? null },
    tacticTopic: topicById("tactic", r.tacticTopic ?? "") ? r.tacticTopic! : "fork",
    endgameTopic: topicById("endgame", r.endgameTopic ?? "") ? r.endgameTopic! : "kp",
  };
}

export { OPENINGS };
