/** Pure tournament-day rules. External results never touch app rating/XP. */
import type { TimeControl } from "@/components/GameSetup";

export type Result = "win" | "draw" | "loss";
export type Feeling = "klar" | "nervos" | "sliten";
export type RoundStatus = "before" | "playing" | "done";
export type Round = {
  status: RoundStatus;
  feeling: Feeling | null;
  goal: string;
  result: Result | null;
  opponent: string;
  color: "w" | "b" | null;
  good: string;
  learn: string;
};
export type Setup = { name: string; date: string; rounds: number; minutes: number; increment: number };
export type Prep = { whiteOpening: string; vsE4: string; vsD4: string; plan: string };
export type Tournament = { id: string; setup: Setup; rounds: Round[]; prep: Prep; afterGood: string; focus: string; archived: boolean; createdAt: number };
export type TournamentState = { version: 1; current: string | null; list: Tournament[] };

export const POINTS: Record<Result, number> = { win: 1, draw: 0.5, loss: 0 };
export const PROCESS_GOALS = ["Sjekk motstanderens trusler", "Bruk klokka klokt", "Behold roen", "Aktiver alle brikkene"];

export const emptyRound = (): Round => ({ status: "before", feeling: null, goal: "", result: null, opponent: "", color: null, good: "", learn: "" });
export const defaultSetup = (date: string): Setup => ({ name: "Turnering", date, rounds: 6, minutes: 10, increment: 0 });
export const emptyPrep = (): Prep => ({ whiteOpening: "", vsE4: "", vsD4: "", plan: "" });

export function clampSetup(s: Setup): Setup {
  const int = (v: number, lo: number, hi: number, d: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
  return { name: s.name.trim().slice(0, 80) || "Turnering", date: s.date, rounds: int(s.rounds, 1, 9, 6), minutes: int(s.minutes, 1, 180, 10), increment: int(s.increment, 0, 60, 0) };
}

export function newTournament(setup: Setup, id: string, now: number): Tournament {
  const s = clampSetup(setup);
  return { id, setup: s, rounds: Array.from({ length: s.rounds }, emptyRound), prep: emptyPrep(), afterGood: "", focus: "", archived: false, createdAt: now };
}

/** Rounds that would lose entered data if the round count shrinks to `n`. */
export function roundsLostBy(t: Tournament, n: number): number {
  return t.rounds.slice(n).filter((r) => r.status !== "before" || r.result || r.feeling || r.goal || r.opponent || r.good || r.learn).length;
}

export function applySetup(t: Tournament, setup: Setup): Tournament {
  const s = clampSetup(setup);
  const rounds = t.rounds.slice(0, s.rounds);
  while (rounds.length < s.rounds) rounds.push(emptyRound());
  return { ...t, setup: s, rounds };
}

/** Actual score only — finished rounds with a recorded result. */
export function score(t: Tournament): { points: number; played: number } {
  const done = t.rounds.filter((r) => r.status === "done" && r.result);
  return { points: done.reduce((a, r) => a + POINTS[r.result!], 0), played: done.length };
}

export const formatPoints = (p: number) => (Number.isInteger(p) ? String(p) : `${Math.floor(p)}½`).replace(/^0½$/, "½");

/** Index of the round to show next: first not finished, or null when all done. */
export function activeRound(t: Tournament): number | null {
  const i = t.rounds.findIndex((r) => r.status !== "done");
  return i === -1 ? null : i;
}

export const tcString = (s: Pick<Setup, "minutes" | "increment">): TimeControl => `${s.minutes}+${s.increment}`;

export function parseTimeControl(v: unknown): TimeControl {
  if (v === "none") return "none";
  if (typeof v === "string") {
    const m = /^(\d{1,3})\+(\d{1,2})$/.exec(v);
    if (m) { const a = Number(m[1]), b = Number(m[2]); if (a >= 1 && a <= 180 && b <= 60) return `${a}+${b}`; }
  }
  return "15+10";
}

export function tcToMs(tc: TimeControl): [number, number] | null {
  if (tc === "none") return null;
  const [m = 15, s = 0] = tc.split("+").map(Number);
  return [m * 60_000, s * 1000];
}

/** Short prep plan from days left + only data the user actually entered. */
export function prepPlan(daysLeft: number, prep: Prep): string[] {
  const out: string[] = [];
  const missing = [!prep.whiteOpening && "hvitåpningen din", !prep.vsE4 && "svaret ditt mot 1.e4", !prep.vsD4 && "svaret ditt mot 1.d4"].filter(Boolean) as string[];
  if (daysLeft < 0) return ["Turneringsdagen er passert. Se oppsummeringen nederst."];
  if (daysLeft === 0) return ["I dag er turneringsdagen. Ingen ny teori nå – les gjennom egne notater én gang, spis og drikk, og ha det gøy."];
  if (missing.length) out.push(`Skriv ned ${missing.join(", ")} under «Åpningsrepetisjon», så kan du øve på dem.`);
  else out.push("Ta selvtesten «Hva er planen?» på åpningene dine.");
  if (daysLeft >= 3) out.push("Gjør dagens pusler eller en taktikkøkt hver dag.");
  else out.push("Gjør noen lette pusler – nå handler det om skarpt blikk, ikke ny teori.");
  if (daysLeft >= 2) out.push("Spill ett treningsparti med turneringens tidskontroll.");
  if (daysLeft >= 5) out.push("Ta en sluttspilløkt hos treneren.");
  if (daysLeft === 1) out.push("Kvelden før: legg deg i god tid.");
  return out;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso + "T00:00:00Z"), b = Date.parse(toIso + "T00:00:00Z");
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 86_400_000) : 0;
}

export function migrateTournaments(raw: unknown): TournamentState {
  const base: TournamentState = { version: 1, current: null, list: [] };
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<TournamentState>;
  if (r.version !== 1 || !Array.isArray(r.list)) return base;
  const list = r.list.filter((t): t is Tournament => !!t && typeof t === "object" && typeof (t as Tournament).id === "string" && Array.isArray((t as Tournament).rounds))
    .map((t) => ({ ...t, prep: { ...emptyPrep(), ...t.prep }, rounds: t.rounds.map((x) => ({ ...emptyRound(), ...x })) }));
  return { version: 1, current: list.some((t) => t.id === r.current) ? r.current! : null, list };
}
