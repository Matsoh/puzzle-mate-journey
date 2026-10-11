import { Chess } from "chess.js";
import bank from "@/data/trainer-bank.json";
import type { CoachId } from "./trainer";

/** Training level — never an estimated FIDE rating. */
export type Level = 0 | 1 | 2;
export const LEVELS: Record<Level, string> = { 0: "Grunnlag", 1: "Utfordring", 2: "Fordypning" };
export const DEFAULT_LEVEL: Level = 1;

export type Outcome = "good" | "helped" | "fail";

export type BankRow = {
  id: string; coach: CoachId; theme: string; level: Level; fen: string; moves: string;
  rating: number; plays: number; popularity: number; lichessThemes: string[]; gameUrl: string;
};

export const THEMES: Record<CoachId, { id: string; label: string; goal: string; hint: string }[]> = {
  magnus: [
    { id: "pawnEndgame", label: "Bondesluttspill", goal: "Finn trekket som vinner eller redder bondesluttspillet.", hint: "Tell trekk: hvem rekker fram først? Husk opposisjon og aktiv konge." },
    { id: "rookEndgame", label: "Tårnsluttspill", goal: "Finn det beste trekket i tårnsluttspillet.", hint: "Aktive tårn og konger vinner. Se etter sjakker, 7. rad og bønder som henger." },
    { id: "advancedPawn", label: "Fribønder", goal: "Bruk eller stopp den langt framskutte bonden.", hint: "En bonde nær forvandling er like mye verdt som en brikke. Hvem kontrollerer forvandlingsfeltet?" },
    { id: "quietMove", label: "Stille trekk og brikkeaktivitet", goal: "Finn det rolige trekket som forbedrer stillingen.", hint: "Det beste trekket er ikke alltid sjakk eller slag. Hvilken brikke kan få en bedre rute?" },
  ],
  hikaru: [
    { id: "fork", label: "Gaffel", goal: "Angrip to ting samtidig og vinn materiale.", hint: "Se etter et felt der én brikke angriper to verdifulle mål." },
    { id: "pin", label: "Binding", goal: "Utnytt eller lag en binding.", hint: "En brikke som står foran kongen eller dronningen kan ikke flytte fritt." },
    { id: "mateIn2", label: "Matt i to", goal: "Sett matt i to trekk.", hint: "Sjekk alle sjakker først – også de som ofrer materiale." },
    { id: "defensiveMove", label: "Forsvar", goal: "Finn trekket som stopper motstanderens trussel.", hint: "Spør først: hva truer motstanderen etter siste trekk?" },
  ],
};

export type TrainingItem = BankRow & { line: string[]; themeLabel: string };

export const BANK: TrainingItem[] = (bank as BankRow[]).map((r) => ({
  ...r,
  line: r.moves.split(" "),
  themeLabel: THEMES[r.coach].find((t) => t.id === r.theme)?.label ?? r.theme,
}));
export const getItem = (id: string | null | undefined) => BANK.find((b) => b.id === id);
export const bankFor = (coach: CoachId) => BANK.filter((b) => b.coach === coach);

/** Lichess puzzles: line[0] is the opponent's move; the player moves at odd indices. */
export function playerColor(item: TrainingItem): "white" | "black" {
  return item.fen.split(" ")[1] === "w" ? "black" : "white";
}

const uciObj = (u: string) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

/** FEN after the first `n` moves of the line. */
export function fenAfter(item: TrainingItem, n: number): string {
  const c = new Chess(item.fen);
  for (const u of item.line.slice(0, n)) c.move(uciObj(u));
  return c.fen();
}

export function sanLine(item: TrainingItem): string[] {
  const c = new Chess(item.fen);
  return item.line.map((u) => c.move(uciObj(u)).san);
}

export type StepResult =
  | { legal: false }
  | { legal: true; correct: false; san: string }
  | { legal: true; correct: true; san: string; fen: string; reply?: { san: string; fen: string; uci: string }; done: boolean };

/** Grade a player move at line index `ply` (odd). Any mate on the final move is accepted, as on Lichess. */
export function gradeStep(item: TrainingItem, ply: number, from: string, to: string): StepResult {
  const c = new Chess(fenAfter(item, ply));
  const want = item.line[ply]!;
  let m;
  try { m = c.move({ from, to, promotion: from + to === want.slice(0, 4) && want[4] ? want[4] : "q" }); } catch { return { legal: false }; }
  const last = ply === item.line.length - 1;
  const correct = m.lan === want || (last && c.isCheckmate());
  if (!correct) return { legal: true, correct: false, san: m.san };
  if (last) return { legal: true, correct: true, san: m.san, fen: c.fen(), done: true };
  const r = c.move(uciObj(item.line[ply + 1]!));
  return { legal: true, correct: true, san: m.san, fen: c.fen(), reply: { san: r.san, fen: c.fen(), uci: r.lan }, done: ply + 2 >= item.line.length };
}

/** Stepwise hints for the current player move; increasingly concrete. */
export function hintsFor(item: TrainingItem, ply: number): string[] {
  const theme = THEMES[item.coach].find((t) => t.id === item.theme)!;
  const c = new Chess(fenAfter(item, ply));
  const u = item.line[ply]!;
  const piece = c.get(u.slice(0, 2) as never);
  const names: Record<string, string> = { p: "bonden", n: "springeren", b: "løperen", r: "tårnet", q: "dronningen", k: "kongen" };
  const san = new Chess(fenAfter(item, ply)).move(uciObj(u)).san;
  return [
    theme.hint,
    `Se på ${piece ? names[piece.type] : "brikken"} på ${u.slice(0, 2)}.${san.includes("+") ? " Trekket gir sjakk." : ""}${san.includes("x") ? " Trekket slår noe." : ""}`,
    `Flytt den til ${u.slice(2, 4)}.`,
  ];
}

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function material(fen: string, color: "w" | "b") {
  let s = 0;
  for (const row of new Chess(fen).board()) for (const sq of row) if (sq) s += (sq.color === color ? 1 : -1) * VALUE[sq.type]!;
  return s;
}

/** Facts only from the verified line: moves, mate and material change. */
export function explain(item: TrainingItem): string {
  const sans = sanLine(item);
  const me = playerColor(item) === "white" ? "w" : "b";
  const end = fenAfter(item, item.line.length);
  const start = fenAfter(item, 1);
  const diff = material(end, me) - material(start, me);
  const mate = new Chess(end).isCheckmate();
  const result = mate ? "Linja ender med matt." : diff > 0 ? `Linja vinner ${diff} bondeenhet${diff === 1 ? "" : "er"} materiale.` : diff === 0 ? "Materialet er likt etter linja, men stillingen er klart bedre ifølge Lichess' motoranalyse." : "Du gir litt materiale, men får en klart bedre stilling ifølge Lichess' motoranalyse.";
  const line = sans.slice(1).map((s, i) => (i % 2 === 0 ? s : `(${s})`)).join(" ");
  return `Motstanderen spilte ${sans[0]}. Løsningen: ${line}. ${result}`;
}

/* ---------------- Skill model ---------------- */

export type ItemRec = { attempts: number; hints: number; best: Outcome | null; last: Outcome | null; lastSeq: number; lastDay: string; dueSeq?: number; dueDay?: string };
export type CoachState = {
  levels: Record<string, Level>;
  recent: Record<string, Outcome[]>;
  reason: Record<string, string>;
  items: Record<string, ItemRec>;
  seq: number;
  current: string | null;
  currentReview: boolean;
  trail: string[];
  test: { ids: string[]; results: Outcome[] } | null;
};

export function emptyCoach(coach: CoachId, level: Level = DEFAULT_LEVEL): CoachState {
  const levels: Record<string, Level> = {}; const reason: Record<string, string> = {};
  for (const t of THEMES[coach]) { levels[t.id] = level; reason[t.id] = level === DEFAULT_LEVEL ? "Anbefalt start: du løste grunnoppgavene raskt." : "Valgt av deg."; }
  return { levels, recent: {}, reason, items: {}, seq: 0, current: null, currentReview: false, trail: [], test: null };
}

const hasLevel = (coach: CoachId, theme: string, level: number) => BANK.some((b) => b.coach === coach && b.theme === theme && b.level === level);

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}

export const REVIEW_GAP = 3;

/** Record a real attempt (not a skip, not a look-back). Returns the new state. */
export function recordOutcome(cs: CoachState, item: TrainingItem, outcome: Outcome, hints: number, day: string): CoachState {
  const seq = cs.seq + 1;
  const prev = cs.items[item.id];
  const rank = { good: 2, helped: 1, fail: 0 } as const;
  const rec: ItemRec = {
    attempts: (prev?.attempts ?? 0) + 1, hints: (prev?.hints ?? 0) + hints,
    best: prev?.best && rank[prev.best] >= rank[outcome] ? prev.best : outcome,
    last: outcome, lastSeq: seq, lastDay: day,
    // Weak results return after a few other tasks AND on a later day; good ones much later.
    ...(outcome === "good" ? { dueSeq: seq + 15, dueDay: addDays(day, prev?.last === "good" ? 21 : 7) } : { dueSeq: seq + REVIEW_GAP, dueDay: addDays(day, 1) }),
  };
  const t = item.theme;
  let recent = [...(cs.recent[t] ?? []), outcome].slice(-4);
  let level = cs.levels[t] ?? DEFAULT_LEVEL;
  let why = cs.reason[t] ?? "";
  // Only count tasks at (or above) the current level towards promotion.
  const atLevel = item.level >= level;
  const good = recent.filter((o) => o === "good").length;
  const bad = recent.filter((o) => o !== "good").length;
  if (atLevel && recent.length >= 4 && good >= 3 && level < 2 && hasLevel(item.coach, t, level + 1)) {
    level = (level + 1) as Level; recent = []; why = `Opp ett nivå: ${good} av de siste 4 løst uten hjelp.`;
  } else if (recent.length >= 4 && bad >= 3 && level > 0) {
    level = (level - 1) as Level; recent = []; why = `Ned ett nivå for å bygge trygghet: ${bad} av de siste 4 trengte hjelp.`;
  }
  let test = cs.test;
  if (test && test.ids.includes(item.id) && test.results.length < test.ids.length) test = { ...test, results: [...test.results, outcome] };
  return { ...cs, seq, items: { ...cs.items, [item.id]: rec }, recent: { ...cs.recent, [t]: recent }, levels: { ...cs.levels, [t]: level }, reason: { ...cs.reason, [t]: why }, test };
}

/** Skip: marks as seen so it isn't served right away, but counts as nothing. */
export function markSeen(cs: CoachState, id: string, day: string): CoachState {
  const prev = cs.items[id];
  const rec: ItemRec = prev ? { ...prev, lastSeq: cs.seq, lastDay: day } : { attempts: 0, hints: 0, best: null, last: null, lastSeq: cs.seq, lastDay: day };
  return { ...cs, items: { ...cs.items, [id]: rec } };
}

export type Pick = { id: string; review: boolean; why: string } | { exhausted: true; suggest: Level | null };

const isDue = (r: ItemRec | undefined, cs: CoachState, day: string) => !!r && r.last !== null && r.dueSeq !== undefined && cs.seq >= r.dueSeq && !!r.dueDay && day >= r.dueDay;

/** Pick the next task. Never returns `avoid`. Due weak reviews first (mixed with new), then unseen at the theme level. */
export function pickNext(cs: CoachState, coach: CoachId, day: string, avoid: string[] = []): Pick {
  const items = bankFor(coach).filter((b) => !avoid.includes(b.id) && b.id !== cs.current);
  const themes = THEMES[coach].map((t) => t.id);
  const lastTheme = getItem(cs.current)?.theme;
  const lastWeak = cs.current && cs.items[cs.current]?.last && cs.items[cs.current]!.last !== "good";
  const strength = (t: string) => (cs.recent[t] ?? []).filter((o) => o === "good").length - (cs.recent[t] ?? []).length / 2;
  const due = items.filter((b) => isDue(cs.items[b.id], cs, day) && cs.items[b.id]!.last !== "good").sort((a, b) => strength(a.theme) - strength(b.theme));
  // Alternate: after a review, prefer something new.
  if (due.length && !cs.currentReview) return { id: due[0]!.id, review: true, why: "Repetisjon: du trengte hjelp på denne sist." };
  const unseen = (t: string) => items.filter((b) => b.theme === t && b.level === (cs.levels[t] ?? DEFAULT_LEVEL) && !cs.items[b.id]);
  // After trouble, give a similar task in the same theme first.
  let order = [...themes].sort((a, b) => (cs.items[pickLastOf(cs, a)]?.lastSeq ?? -1) - (cs.items[pickLastOf(cs, b)]?.lastSeq ?? -1));
  if (lastWeak && lastTheme) order = [lastTheme, ...order.filter((t) => t !== lastTheme)];
  for (const t of order) {
    const u = unseen(t);
    if (u.length) return { id: u[0]!.id, review: false, why: lastWeak && t === lastTheme ? "Lignende oppgave i samme tema." : "Ny oppgave." };
  }
  if (due.length) return { id: due[0]!.id, review: true, why: "Repetisjon: du trengte hjelp på denne sist." };
  const goodDue = items.filter((b) => isDue(cs.items[b.id], cs, day));
  if (goodDue.length) return { id: goodDue[0]!.id, review: true, why: "Repetisjon av en oppgave du løste for en stund siden." };
  const levelNow = Math.max(...themes.map((t) => cs.levels[t] ?? DEFAULT_LEVEL)) as Level;
  const suggest = ([0, 1, 2] as Level[]).find((l) => l !== levelNow && items.some((b) => b.level === l && !cs.items[b.id])) ?? null;
  return { exhausted: true, suggest };
}
function pickLastOf(cs: CoachState, theme: string) {
  let best = ""; let s = -1;
  for (const [id, r] of Object.entries(cs.items)) if (getItem(id)?.theme === theme && r.lastSeq > s) { s = r.lastSeq; best = id; }
  return best;
}

/** Plain repetition of the least recently seen task at the current level (used when the bank is used up). */
export function pickReview(cs: CoachState, coach: CoachId): string | null {
  const c = bankFor(coach).filter((b) => b.id !== cs.current && b.level === (cs.levels[b.theme] ?? DEFAULT_LEVEL));
  c.sort((a, b) => (cs.items[a.id]?.lastSeq ?? -1) - (cs.items[b.id]?.lastSeq ?? -1));
  return c[0]?.id ?? null;
}

export function setAllLevels(cs: CoachState, coach: CoachId, level: Level, why: string): CoachState {
  const levels = { ...cs.levels }; const reason = { ...cs.reason }; const recent = { ...cs.recent };
  for (const t of THEMES[coach]) { levels[t.id] = level; reason[t.id] = why; recent[t.id] = []; }
  return { ...cs, levels, reason, recent };
}

/** Optional level test: one Fordypning task from each theme, preferring unseen. */
export function levelTestIds(cs: CoachState, coach: CoachId): string[] {
  return THEMES[coach].map((t) => {
    const c = bankFor(coach).filter((b) => b.theme === t.id && b.level === 2);
    return (c.find((b) => !cs.items[b.id]) ?? c[0])!.id;
  });
}
export function levelFromTest(results: Outcome[]): Level {
  const good = results.filter((r) => r === "good").length;
  return good >= 3 ? 2 : good >= 1 ? 1 : 0;
}

export function overallLevel(cs: CoachState, coach: CoachId): Level {
  const ls = THEMES[coach].map((t) => cs.levels[t.id] ?? DEFAULT_LEVEL);
  return Math.round(ls.reduce((a, b) => a + b, 0) / ls.length) as Level;
}
