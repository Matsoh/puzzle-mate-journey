// Mike Skolen as a real chess school: seven classes from 1500 to 2000, a fixed
// timetable every day (Mike decides, Tobias just starts the next period), an
// exam to move up a class, and a report card. Pure and tested; the page only
// renders what this module says.
import { withCredit, type Progress } from "./progress";
import { BANK, THEMES, type TrainingItem } from "./adaptive";
import { OPENINGS } from "@/data/openings";
import { MASTER_GAMES } from "@/data/master-games";
import { PUZZLES, type Puzzle } from "./puzzles";
import { topPatterns, type LessonId as NoteLesson } from "./notebook";
import { schoolDone, withWeekReward, SCHOOL_BONUS_XP } from "./school";

export type PeriodKind = "warmup" | "opening" | "tactic" | "endgame" | "strategy" | "game" | "homework" | "exam";
export type Subject = "opening" | "tactic" | "endgame" | "strategy" | "game";
export const SUBJECT_LABEL: Record<Subject, string> = { opening: "Åpning", tactic: "Taktikk", endgame: "Sluttspill", strategy: "Strategi", game: "Partier" };

/** A fixed endgame Tobias plays out against the engine; the goal decides "bestått". */
export type Boss = { id: string; name: string; fen: string; side: "w" | "b"; goal: "win" | "draw"; mike: string; tip: string };
export const BOSSES: Boss[] = [
  { id: "kq", name: "Dronning mot konge", fen: "4k3/8/8/8/8/8/8/4K2Q w - - 0 1", side: "w", goal: "win", mike: "Queen versus king. Box the king in with the queen, walk your king up, mate on the edge. No stalemate, please.", tip: "Bruk dronningen som et gjerde (en springers avstand fra kongen), gå med kongen, matt på kanten. Pass på patt!" },
  { id: "kr", name: "Tårn mot konge", fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1", side: "w", goal: "win", mike: "Rook versus king. Cut the king off with the rook, bring your king to face his, then check him back a rank. Repeat.", tip: "Tårnet sperrer en rad, kongen din går fram til kongene står rett mot hverandre, så sjakk – kongen må bakover." },
  { id: "kp-win", name: "Konge og bonde – vinn", fen: "8/4k3/8/4K3/8/4P3/8/8 w - - 0 1", side: "w", goal: "win", mike: "King two squares in front of the pawn. That's a win every time – if you keep the king in front and use opposition.", tip: "Kongen foran bonden, bonden bak. Ta opposisjonen, gå til siden, bonden ruller inn." },
  { id: "kp-draw", name: "Konge og bonde – hold remis", fen: "4k3/8/8/8/4K3/8/4P3/8 b - - 0 1", side: "b", goal: "draw", mike: "You're a pawn down. Keep your king in front of the pawn and take the opposition when the pawn stops. Stalemate is your friend.", tip: "Kongen din foran bonden. Når bonden står stille: ta opposisjonen (kongene rett mot hverandre med ett felt mellom)." },
  { id: "lucena", name: "Lucena-broen", fen: "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1", side: "w", goal: "win", mike: "The Lucena. Your king hides in front of the pawn. Build a bridge: rook to the fourth rank, then the king walks out under it.", tip: "Rc4! Så Kc7, og når sjakkene kommer: kongen går nedover mot tårnet ditt – broen stopper sjakkene." },
];
export const getBoss = (id: string) => BOSSES.find((b) => b.id === id);

/** Short strategy lessons Mike reads before a master game (one per class). */
export type ClassDef = {
  n: number;
  name: string;
  ratingTo: number;
  motto: string;
  openings: string[];
  tactics: string[];
  endgames: string[];
  games: string[];
  botElo: number;
  exam: { puzzles: number; pass: number; elo: number };
};
export const CLASSES: ClassDef[] = [
  { n: 1, name: "1. klasse", ratingTo: 1550, motto: "Heng ingenting.", openings: ["italiensk", "carokann"], tactics: ["fork", "mateIn2", "defensiveMove"], endgames: ["kq", "kr"], games: ["reti-tartakower"], botElo: 1450, exam: { puzzles: 6, pass: 5, elo: 1450 } },
  { n: 2, name: "2. klasse", ratingTo: 1620, motto: "Sjekk alle slag.", openings: ["italiensk", "carokann"], tactics: ["fork", "pin", "mateIn2"], endgames: ["kp-win", "kq"], games: ["opera"], botElo: 1520, exam: { puzzles: 6, pass: 5, elo: 1520 } },
  { n: 3, name: "3. klasse", ratingTo: 1700, motto: "Hvert trekk har en grunn.", openings: ["skotsk", "fransk"], tactics: ["pin", "advancedPawn", "defensiveMove"], endgames: ["kp-draw", "kp-win"], games: ["evergreen"], botElo: 1600, exam: { puzzles: 6, pass: 5, elo: 1600 } },
  { n: 4, name: "4. klasse", ratingTo: 1780, motto: "Aktiv konge i sluttspillet.", openings: ["london", "carokann"], tactics: ["quietMove", "fork", "pawnEndgame"], endgames: ["kr", "kp-draw"], games: ["immortal"], botElo: 1680, exam: { puzzles: 7, pass: 6, elo: 1680 } },
  { n: 5, name: "5. klasse", ratingTo: 1860, motto: "Tårnet bak fribonden.", openings: ["spansk", "fransk"], tactics: ["rookEndgame", "pin", "mateIn2"], endgames: ["lucena", "kr"], games: ["opera"], botElo: 1760, exam: { puzzles: 7, pass: 6, elo: 1760 } },
  { n: 6, name: "6. klasse", ratingTo: 1940, motto: "Planen før trekket.", openings: ["spansk", "london"], tactics: ["quietMove", "rookEndgame", "advancedPawn"], endgames: ["lucena", "kp-win"], games: ["evergreen"], botElo: 1850, exam: { puzzles: 8, pass: 7, elo: 1850 } },
  { n: 7, name: "7. klasse", ratingTo: 2000, motto: "Spill som en 2000-spiller.", openings: ["italiensk", "spansk", "carokann"], tactics: ["fork", "pin", "quietMove", "rookEndgame"], endgames: ["lucena", "kp-draw", "kr"], games: ["immortal"], botElo: 1950, exam: { puzzles: 8, pass: 7, elo: 1950 } },
];
export const classOf = (p: Progress): ClassDef => CLASSES[Math.min(CLASSES.length, Math.max(1, p.schoolClass ?? 1)) - 1]!;
export const graduated = (p: Progress) => (p.schoolClass ?? 1) > CLASSES.length;

/** Tiny deterministic hash so the same day always gets the same timetable. */
export function seed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
const pick = <T,>(list: readonly T[], n: number): T => list[n % Math.max(1, list.length)]!;
function dayIndex(day: string): number { const [y, m, d] = day.split("-").map(Number); return Math.round(Date.UTC(y!, m! - 1, d!) / 86_400_000); }
/** 0 = Monday … 6 = Sunday. */
export function weekday(day: string): number { return (dayIndex(day) + 3) % 7; }

export type Period = {
  idx: number;
  kind: PeriodKind;
  subject: Subject;
  title: string;
  hint: string;
  /** What Mike says when the period starts (English, read aloud). */
  mike: string;
  /** Content reference: theme id, opening id, boss id, master game id, or bot elo. */
  ref: string;
  /** Number of puzzles for puzzle periods. */
  count?: number;
};

/** Lessons from the notebook → the puzzle theme that trains it. */
export const HOMEWORK_THEME: Record<NoteLesson, string> = { hanging: "defensiveMove", missedMate: "mateIn2", allowedMate: "defensiveMove", opening: "fork", endgame: "pawnEndgame", "capture-blunder": "defensiveMove", "tactic-missed": "fork" };
const THEME_LABEL = (id: string) => THEMES.mike.find((t) => t.id === id)?.label ?? id;

/** Is the exam open today? Friday, in a class with at least 4 completed school days, and not yet passed. */
export function examOpen(p: Progress, day: string): boolean {
  if (graduated(p)) return false;
  if (weekday(day) !== 4 && !(p.schoolExam?.day === day)) return false;
  return daysInClass(p) >= 4;
}
export function daysInClass(p: Progress): number {
  const since = p.schoolClassSince ?? "0000-00-00";
  return Object.keys(p.credits).filter((k) => k.startsWith("school:") && k.endsWith(":done") && k.slice(7, 17) >= since).length;
}

/** The day's timetable: warm-up, the subject of the day, a game, homework (or the exam on Fridays). */
export function timetable(p: Progress, day: string, tournamentInDays: number | null = null): Period[] {
  const c = classOf(p);
  const wd = weekday(day);
  const h = seed(day);
  const side = h % 2 === 0 ? "w" : "b";
  const warm: Period = { idx: 0, kind: "warmup", subject: "tactic", title: "Oppvarming", hint: "3 taktikkoppgaver, rett i gang", mike: "Warm-up. Three puzzles. Checks, captures, threats – every move.", ref: pick(c.tactics, h), count: 3 };
  const game: Period = { idx: 2, kind: "game", subject: "game", title: `Treningsparti · ${side === "w" ? "hvit" : "svart"}`, hint: `Mot bot ${c.botElo} med Mike ved brettet`, mike: `Training game. You're ${side === "w" ? "White" : "Black"}. Use what we just worked on – I'm right here.`, ref: `${c.botElo}:${side}` };
  let subject: Period;
  const prep = tournamentInDays !== null && tournamentInDays >= 0 && tournamentInDays <= 7;
  if (prep) {
    subject = { idx: 1, kind: "opening", subject: "opening", title: "Turneringsuke: repertoar", hint: `Turnering om ${tournamentInDays} dag${tournamentInDays === 1 ? "" : "er"} – terp åpningen`, mike: `Tournament in ${tournamentInDays} days. We drill your opening until your hands know it.`, ref: pick(c.openings, h) };
  } else if (wd === 0 || wd === 5) {
    subject = { idx: 1, kind: "opening", subject: "opening", title: wd === 5 ? "Åpningslab" : "Åpning", hint: "Spill repertoarlinjen din – Mike retter", mike: "Opening class. You play your line, I play the other side and stop you when you drift.", ref: pick(c.openings, h) };
  } else if (wd === 1) {
    subject = { idx: 1, kind: "tactic", subject: "tactic", title: `Taktikk: ${THEME_LABEL(pick(c.tactics, h >>> 3))}`, hint: "3 oppgaver med samme motiv", mike: `Tactics. Today's pattern: ${THEME_LABEL(pick(c.tactics, h >>> 3)).toLowerCase()}. See it once, you see it forever.`, ref: pick(c.tactics, h >>> 3), count: 3 };
  } else if (wd === 2) {
    const b = getBoss(pick(c.endgames, h >>> 2))!;
    subject = { idx: 1, kind: "endgame", subject: "endgame", title: `Sluttspill-boss: ${b.name}`, hint: b.goal === "win" ? "Vinn mot motoren fra denne stillingen" : "Hold remis mot motoren", mike: b.mike, ref: b.id };
  } else if (wd === 3 || wd === 6) {
    const g = pick(c.games, h >>> 4);
    subject = { idx: 1, kind: "strategy", subject: "strategy", title: "Gjett mesterens trekk", hint: `${MASTER_GAMES.find((x) => x.id === g)?.title ?? g} – du spiller mesterens side`, mike: "Strategy. A famous game – you guess the master's moves. Points for every hit.", ref: g };
  } else {
    // Friday: exam when it's open, otherwise tactics.
    subject = examOpen(p, day)
      ? { idx: 1, kind: "exam", subject: "tactic", title: `Eksamen · ${c.name}`, hint: `${c.exam.puzzles} oppgaver (minst ${c.exam.pass} rett) + ett parti mot bot ${c.exam.elo}`, mike: "Exam day. Puzzles first, then a game. Pass and you move up a class. No pressure. Some pressure.", ref: String(c.n), count: c.exam.puzzles }
      : { idx: 1, kind: "tactic", subject: "tactic", title: `Taktikk: ${THEME_LABEL(pick(c.tactics, h >>> 5))}`, hint: "3 oppgaver med samme motiv", mike: `Tactics on a Friday. ${THEME_LABEL(pick(c.tactics, h >>> 5))}. Then the weekend.`, ref: pick(c.tactics, h >>> 5), count: 3 };
  }
  const top = topPatterns(p, 1)[0];
  const hwTheme = top ? HOMEWORK_THEME[top.id] : pick(c.tactics, h >>> 6);
  const homework: Period = { idx: 3, kind: "homework", subject: "tactic", title: "Lekse", hint: top ? `Fra notatboken: ${THEME_LABEL(hwTheme).toLowerCase()} – det du bommet på sist` : `Repetisjon: ${THEME_LABEL(hwTheme).toLowerCase()}`, mike: top ? "Homework. This is the thing that cost you a game recently. We fix it here, not there." : "Homework. Two puzzles on the week's pattern. Then you're done.", ref: hwTheme, count: 2 };
  return [warm, subject, game, homework];
}

// ---------- puzzle picking ----------
/** Main-set puzzles mapped onto the trainer item shape so AdaptivePuzzle can show them. */
const PUZZLE_THEME_MAP: Record<string, string[]> = { fork: ["fork"], pin: ["pin"], mateIn2: ["mateIn2", "mateIn1"], defensiveMove: ["defensiveMove", "hangingPiece"], pawnEndgame: ["pawnEndgame"], rookEndgame: ["rookEndgame"], advancedPawn: ["advancedPawn", "promotion"], quietMove: ["quietMove"] };
export function asItem(z: Puzzle, theme: string): TrainingItem {
  return { id: z.id, coach: "mike", theme, level: 1, fen: z.fen, moves: z.moves, line: z.moves.split(" "), rating: z.rating, plays: 0, popularity: 0, lichessThemes: z.themes, gameUrl: z.gameUrl ?? "", themeLabel: THEME_LABEL(theme) };
}
/** `n` items for a theme, deterministic per day, bank first then the main set. */
export function pickItems(theme: string, n: number, day: string, salt = ""): TrainingItem[] {
  const h = seed(`${day}:${theme}:${salt}`);
  const fromBank = BANK.filter((b) => b.theme === theme);
  const extra = PUZZLES.filter((z) => (PUZZLE_THEME_MAP[theme] ?? [theme]).some((t) => z.themes.includes(t))).map((z) => asItem(z, theme));
  const pool = [...fromBank, ...extra];
  if (!pool.length) return BANK.slice(0, n);
  const out: TrainingItem[] = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice((h + i * 7919) % pool.length, 1)[0]!);
  return out;
}
/** Exam puzzles: spread over the class's themes. */
export function examItems(c: ClassDef, day: string): TrainingItem[] {
  const out: TrainingItem[] = [];
  let i = 0;
  while (out.length < c.exam.puzzles) { const t = c.tactics[i % c.tactics.length]!; const got = pickItems(t, 1, day, `exam${i}`)[0]; if (got && !out.some((x) => x.id === got.id)) out.push(got); i++; if (i > 40) break; }
  return out;
}

// ---------- progress ----------
export const PERIOD_XP = 15;
export const periodId = (day: string, idx: number) => `school:${day}:p${idx}`;
export const periodDone = (p: Progress, day: string, idx: number) => p.credits[periodId(day, idx)] !== undefined;
export const periodsDone = (p: Progress, day: string) => [0, 1, 2, 3].filter((i) => periodDone(p, day, i)).length;
/** Credit a finished period; the fourth closes the school day (bonus + week reward). */
export function withPeriod(p: Progress, day: string, idx: number, subject?: Subject, ok = true): Progress {
  let n = withCredit(p, periodId(day, idx), PERIOD_XP);
  if (subject) n = withScore(n, subject, ok);
  if (periodsDone(n, day) >= 4 && !schoolDone(p, day)) n = withWeekReward(withCredit(n, `school:${day}:done`, SCHOOL_BONUS_XP), day);
  return n;
}
/** Report card: rolling score per subject (last 20 results). */
export function withScore(p: Progress, subject: Subject, ok: boolean): Progress {
  const cur = p.schoolScores?.[subject] ?? [];
  return { ...p, schoolScores: { ...(p.schoolScores ?? {}), [subject]: [...cur, ok ? 1 : 0].slice(-20) } };
}
export function grade(p: Progress, subject: Subject): { letter: string; pct: number | null } {
  const xs = p.schoolScores?.[subject] ?? [];
  if (xs.length < 3) return { letter: "–", pct: null };
  const pct = Math.round((100 * xs.reduce((a, b) => a + b, 0)) / xs.length);
  return { letter: pct >= 90 ? "A" : pct >= 75 ? "B" : pct >= 60 ? "C" : pct >= 45 ? "D" : "E", pct };
}

// ---------- exam ----------
export type ExamState = { day: string; cls: number; puzzlesOk: number; puzzlesDone: number; stage: "puzzles" | "game" | "passed" | "failed" };
export function startExam(p: Progress, day: string): Progress {
  const cur = p.schoolExam;
  if (cur && cur.day === day && cur.cls === (p.schoolClass ?? 1)) return p;
  return { ...p, schoolExam: { day, cls: p.schoolClass ?? 1, puzzlesOk: 0, puzzlesDone: 0, stage: "puzzles" } };
}
export function withExamPuzzle(p: Progress, ok: boolean): Progress {
  const e = p.schoolExam;
  if (!e || e.stage !== "puzzles") return p;
  const c = CLASSES[e.cls - 1]!;
  const done = e.puzzlesDone + 1, good = e.puzzlesOk + (ok ? 1 : 0);
  const left = c.exam.puzzles - done;
  const stage: ExamState["stage"] = good >= c.exam.pass ? "game" : good + left < c.exam.pass ? "failed" : "puzzles";
  const n: Progress = { ...p, schoolExam: { ...e, puzzlesDone: done, puzzlesOk: good, stage } };
  // A failed exam still counts as the day's period, so the timetable moves on.
  return stage === "failed" ? withPeriod(n, e.day, 1, undefined, false) : n;
}
/** The exam game: win or draw passes, and passing moves Tobias up a class. */
export function withExamGame(p: Progress, result: "win" | "draw" | "loss" | "stopped", day: string): Progress {
  const e = p.schoolExam;
  if (!e || e.stage !== "game") return p;
  if (result === "win" || result === "draw") {
    const cls = e.cls;
    let n: Progress = { ...p, schoolExam: { ...e, stage: "passed" }, schoolClass: cls + 1, schoolClassSince: day, schoolPassed: [...(p.schoolPassed ?? []), cls] };
    n = withCredit(n, `school:exam:${cls}`, 100);
    n = { ...n, coins: (n.coins ?? 0) + 50 };
    return withPeriod(n, day, 1, "game", true);
  }
  if (result === "loss") return withPeriod({ ...p, schoolExam: { ...e, stage: "failed" } }, day, 1, "game", false);
  return p; // stopped: try the game again
}

// ---------- tournaments ----------
export function daysUntil(day: string, date: string | null | undefined): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return dayIndex(date) - dayIndex(day);
}
