// Bot tournaments: ten players, five rounds Swiss, rapid. Pure rules – the
// field, the pairings, the simulated boards, the staggered reveals, the
// standings table (score + Buchholz) and the prizes. Tested in tour.test.ts.
// Tobias's own games are played in /parti like the ladder; only the result
// comes back here.
import type { TimeControl } from "@/components/GameSetup";
import type { Progress } from "./progress";
import type { Opponent } from "./opponents";
import { tcToMs } from "./tournament";
import { tierBots, tourBot, type Tier, type TourBot } from "./tour-bots";

export type { Tier, TourBot };

export const FIELD = 10;
export const ROUNDS = 5;
export const ME = "me";
export const MY_CLUB = "Goblin SK";

export type TierInfo = { id: Tier; name: string; lo: number; hi: number; emoji: string; blurb: string; minRating: number };
export const TIERS: TierInfo[] = [
  { id: "begynner", name: "Begynner", lo: 1200, hi: 1450, emoji: "🌱", blurb: "Klubbens yngste og bestemor Gerd. Lær deg turneringsfølelsen.", minRating: 0 },
  { id: "amator", name: "Amatør", lo: 1450, hi: 1750, emoji: "⚔️", blurb: "Klubbspillere som ikke gir bort noe. Her avgjøres det i sluttspillet.", minRating: 1450 },
  { id: "proff", name: "Proff", lo: 1750, hi: 2050, emoji: "👑", blurb: "Veteraner, filosofer og en keiser. Pallplass her er en bragd.", minRating: 1750 },
];
export const tierInfo = (t: Tier): TierInfo => TIERS.find((x) => x.id === t)!;

/** The tier a player of this rating belongs in. */
export function tierFor(rating: number): Tier {
  return rating >= 1750 ? "proff" : rating >= 1450 ? "amator" : "begynner";
}
/** Open when the rating is high enough or the tier below has been podiumed. */
export function tierOpen(t: Tier, rating: number, podiums: Record<Tier, number>): boolean {
  const i = TIERS.findIndex((x) => x.id === t);
  if (i === 0 || rating >= TIERS[i]!.minRating) return true;
  return podiums[TIERS[i - 1]!.id] > 0;
}

export type GameResult = "1-0" | "0-1" | "½-½";
export type Board = {
  /** Player numbers (index into players, 0-based). */
  w: number;
  b: number;
  result: GameResult | null;
  /** Absolute time (ms) when this board's result may be shown; null = shown at once. */
  revealAt: number | null;
};
export type Round = { boards: Board[] };
export type TourPlayer = { id: string; name: string; elo: number; club: string; portrait: string | null };
export type Tour = {
  id: string;
  tier: Tier;
  tc: TimeControl;
  seed: number;
  createdAt: number;
  /** Sorted by rating, so index + 1 is the starting number. */
  players: TourPlayer[];
  rounds: Round[];
  finishedAt: number | null;
};
export type TourSummary = { id: string; tier: Tier; tc: TimeControl; place: number; score: number; finishedAt: number };
export type TourState = { version: 1; current: Tour | null; history: TourSummary[] };
export const emptyTourState = (): TourState => ({ version: 1, current: null, history: [] });

export function migrateTourState(raw: unknown): TourState {
  const base = emptyTourState();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<TourState>;
  const ok = (t: unknown): t is Tour => !!t && typeof t === "object" && typeof (t as Tour).id === "string" && Array.isArray((t as Tour).players) && Array.isArray((t as Tour).rounds);
  return { version: 1, current: ok(r.current) ? r.current : null, history: Array.isArray(r.history) ? r.history.filter((h) => h && typeof h.id === "string") : [] };
}

/** Small deterministic RNG (mulberry32) so a tournament replays the same on every device. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = <T,>(xs: T[], r: () => number): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
};

/** Nine bots from the tier's pool, seeded, plus the player; sorted by rating. */
export function drawField(tier: Tier, me: { name: string; elo: number; portrait?: string | null }, seed: number): TourPlayer[] {
  const r = rng(seed);
  const bots = shuffle(tierBots(tier), r).slice(0, FIELD - 1);
  const all: TourPlayer[] = [
    { id: ME, name: me.name, elo: me.elo, club: MY_CLUB, portrait: me.portrait ?? null },
    ...bots.map((b) => ({ id: b.id, name: b.name, elo: b.elo, club: b.club, portrait: b.portrait })),
  ];
  return all.sort((a, b) => b.elo - a.elo || a.name.localeCompare(b.name));
}

export const myIndex = (t: Tour): number => t.players.findIndex((p) => p.id === ME);
export const POINTS: Record<GameResult, [number, number]> = { "1-0": [1, 0], "0-1": [0, 1], "½-½": [0.5, 0.5] };

const seen = (b: Board, now: number | null) => b.result !== null && (now === null || b.revealAt === null || b.revealAt <= now);

/** Points per player from boards whose result is visible at `now` (null = everything recorded). */
export function scores(t: Tour, now: number | null = null, upto = t.rounds.length): number[] {
  const s = t.players.map(() => 0);
  for (const r of t.rounds.slice(0, upto)) for (const b of r.boards) {
    if (!seen(b, now)) continue;
    const [pw, pb] = POINTS[b.result!];
    s[b.w]! += pw; s[b.b]! += pb;
  }
  return s;
}

export type Cell = { opp: number; color: "w" | "b"; result: "1" | "0" | "½" | null; /** Played, but not shown yet. */ pending: boolean };
export type Standing = { idx: number; place: number; score: number; buchholz: number; wins: number; cells: Cell[] };

/** The table: score, then Buchholz (sum of opponents' scores), then wins, then rating. */
export function standings(t: Tour, now: number | null = null): Standing[] {
  const sc = scores(t, now);
  const rows: Standing[] = t.players.map((_, idx) => {
    const cells: Cell[] = [];
    let wins = 0, buchholz = 0;
    for (const r of t.rounds) {
      const b = r.boards.find((x) => x.w === idx || x.b === idx);
      if (!b) continue;
      const color = b.w === idx ? "w" : "b";
      const opp = color === "w" ? b.b : b.w;
      const pts = seen(b, now) ? POINTS[b.result!][color === "w" ? 0 : 1] : null;
      if (pts === 1) wins++;
      buchholz += sc[opp]!;
      cells.push({ opp, color, result: pts === null ? null : pts === 1 ? "1" : pts === 0 ? "0" : "½", pending: pts === null && b.result !== null });
    }
    return { idx, place: 0, score: sc[idx]!, buchholz, wins, cells };
  });
  rows.sort((a, b) => b.score - a.score || b.buchholz - a.buchholz || b.wins - a.wins || t.players[b.idx]!.elo - t.players[a.idx]!.elo);
  rows.forEach((r, i) => { r.place = i + 1; });
  return rows;
}
export const placeOf = (t: Tour, idx: number, now: number | null = null): number => standings(t, now).find((s) => s.idx === idx)!.place;
export const fmtScore = (p: number) => (Number.isInteger(p) ? String(p) : `${Math.floor(p) || ""}½`);

type Colors = { balance: number; last: "w" | "b" | null; streak: number };
function colorHistory(t: Tour, idx: number): Colors {
  let balance = 0, last: "w" | "b" | null = null, streak = 0;
  for (const r of t.rounds) for (const b of r.boards) {
    const c = b.w === idx ? "w" : b.b === idx ? "b" : null;
    if (!c) continue;
    balance += c === "w" ? 1 : -1;
    streak = c === last ? streak + 1 : 1;
    last = c;
  }
  return { balance, last, streak };
}
/** Which colour a player needs next and how badly (two in a row > imbalance > alternate). */
function colorNeed(c: Colors): { want: "w" | "b" | null; weight: number } {
  if (c.streak >= 2 && c.last) return { want: c.last === "w" ? "b" : "w", weight: 3 };
  if (c.balance !== 0) return { want: c.balance > 0 ? "b" : "w", weight: 2 };
  if (c.last) return { want: c.last === "w" ? "b" : "w", weight: 1 };
  return { want: null, weight: 0 };
}

/** Swiss pairing: round 1 top half vs bottom half, then score groups without repeats; colours balanced. */
export function pairRound(t: Tour, r: () => number): Round {
  const n = t.players.length;
  const played = new Set<string>();
  for (const rd of t.rounds) for (const b of rd.boards) played.add(`${Math.min(b.w, b.b)}-${Math.max(b.w, b.b)}`);
  const key = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;
  let pairs: [number, number][];
  if (t.rounds.length === 0) {
    const order = t.players.map((_, i) => i); // already sorted by rating
    const half = n / 2;
    pairs = order.slice(0, half).map((a, i) => [a, order[half + i]!] as [number, number]);
  } else {
    const sc = scores(t);
    const order = t.players.map((_, i) => i).sort((a, b) => sc[b]! - sc[a]! || t.players[b]!.elo - t.players[a]!.elo);
    const need = t.players.map((_, i) => colorNeed(colorHistory(t, i)));
    // Two players who both must have the same colour (two in a row) cannot meet.
    const clash = (a: number, b: number) => need[a]!.weight === 3 && need[b]!.weight === 3 && need[a]!.want === need[b]!.want;
    const solve = (rest: number[], strict: boolean): [number, number][] | null => {
      if (rest.length === 0) return [];
      const a = rest[0]!;
      for (const b of rest.slice(1)) {
        if (played.has(key(a, b)) || (strict && clash(a, b))) continue;
        const sub = solve(rest.filter((x) => x !== a && x !== b), strict);
        if (sub) return [[a, b], ...sub];
      }
      return null;
    };
    pairs = solve(order, true) ?? solve(order, false) ?? order.reduce<[number, number][]>((acc, x, i) => (i % 2 === 0 ? [...acc, [x, order[i + 1]!]] : acc), []);
    const top = (p: [number, number]) => Math.max(sc[p[0]]!, sc[p[1]]!) + Math.max(t.players[p[0]]!.elo, t.players[p[1]]!.elo) / 10_000;
    pairs.sort((x, y) => top(y) - top(x));
  }
  const first = r() < 0.5;
  const boards: Board[] = pairs.map(([a, b], i) => {
    const na = colorNeed(colorHistory(t, a)), nb = colorNeed(colorHistory(t, b));
    let aWhite: boolean;
    if (na.want === "w" && nb.want !== "w") aWhite = true;
    else if (nb.want === "w" && na.want !== "w") aWhite = false;
    else if (na.want === "b" && nb.want !== "b") aWhite = false;
    else if (nb.want === "b" && na.want !== "b") aWhite = true;
    else if (na.want && na.weight !== nb.weight) aWhite = (na.want === "w") === (na.weight > nb.weight);
    else if (t.rounds.length === 0) aWhite = first === (i % 2 === 0);
    else aWhite = r() < 0.5;
    return { w: aWhite ? a : b, b: aWhite ? b : a, result: null, revealAt: null };
  });
  return { boards };
}

export function newTour(tier: Tier, tc: TimeControl, me: { name: string; elo: number; portrait?: string | null }, seed: number, now: number): Tour {
  const t: Tour = { id: `tour-${now.toString(36)}-${(seed >>> 0).toString(36)}`, tier, tc, seed, createdAt: now, players: drawField(tier, me, seed), rounds: [], finishedAt: null };
  return { ...t, rounds: [pairRound(t, rng(seed ^ 0x51))] };
}

/** Elo expectation with a small White bonus and a tier-dependent draw rate. */
export function simulate(r: () => number, wElo: number, bElo: number, tier: Tier): GameResult {
  const e = 1 / (1 + 10 ** ((bElo - (wElo + 35)) / 400));
  const drawBase = { begynner: 0.08, amator: 0.14, proff: 0.22 }[tier];
  const pDraw = Math.min(0.6, drawBase * (1 - Math.abs(e - 0.5) * 2) + 0.03);
  const pW = Math.max(0, e - pDraw / 2);
  const x = r();
  return x < pW ? "1-0" : x < pW + pDraw ? "½-½" : "0-1";
}

export const MAX_WAIT_MS = 50_000;
/**
 * When the other boards finish, relative to the moment my game ended. Boards that
 * "finished while I played" show at once; the rest trickle in over at most ~50 s
 * (one tournament minute ≈ five real seconds), never two at the same moment.
 */
export function revealOffsets(r: () => number, count: number, myMs: number, tc: TimeControl): number[] {
  const ms = tcToMs(tc);
  const base = ms ? ms[0] + ms[1] * 40 : 10 * 60_000;
  const offs: number[] = [];
  for (let i = 0; i < count; i++) {
    const sim = Math.max(3 * 60_000, base * (0.35 + r() * 0.85));
    const diff = sim - Math.max(0, myMs);
    offs.push(diff <= 0 ? 0 : Math.min(MAX_WAIT_MS, Math.max(4_000, diff / 12)));
  }
  offs.sort((a, b) => a - b);
  for (let i = 1; i < offs.length; i++) if (offs[i]! > 0 && offs[i]! - offs[i - 1]! < 3_000) offs[i] = offs[i - 1]! + 3_000;
  return shuffle(offs, r);
}

export type Outcome = "win" | "draw" | "loss";
export const current = (t: Tour): Round | undefined => t.rounds[t.rounds.length - 1];
export const roundNo = (t: Tour): number => t.rounds.length;
export function myBoard(t: Tour, round = t.rounds.length - 1): { board: Board; no: number; color: "w" | "b"; opp: TourPlayer; bot: TourBot | undefined } | null {
  const me = myIndex(t);
  const r = t.rounds[round];
  if (!r) return null;
  const i = r.boards.findIndex((b) => b.w === me || b.b === me);
  if (i < 0) return null;
  const board = r.boards[i]!;
  const color = board.w === me ? "w" : "b";
  const opp = t.players[color === "w" ? board.b : board.w]!;
  return { board, no: i + 1, color, opp, bot: tourBot(opp.id) };
}

/** Record my game, simulate the other boards and schedule their reveals. No-op when already recorded. */
export function withMyResult(t: Tour, round: number, outcome: Outcome, myMs: number, now: number): Tour {
  const me = myIndex(t);
  const r = t.rounds[round];
  if (!r || t.finishedAt) return t;
  const mine = r.boards.findIndex((b) => b.w === me || b.b === me);
  if (mine < 0 || r.boards[mine]!.result !== null) return t;
  const rand = rng(t.seed ^ (round + 1) * 7919);
  const others = r.boards.map((_, i) => i).filter((i) => i !== mine);
  const offs = revealOffsets(rand, others.length, myMs, t.tc);
  const boards = r.boards.map((b, i) => {
    if (i === mine) {
      const iAmWhite = b.w === me;
      const result: GameResult = outcome === "draw" ? "½-½" : (outcome === "win") === iAmWhite ? "1-0" : "0-1";
      return { ...b, result, revealAt: null };
    }
    const k = others.indexOf(i);
    return { ...b, result: simulate(rand, t.players[b.w]!.elo, t.players[b.b]!.elo, t.tier), revealAt: now + offs[k]! };
  });
  return { ...t, rounds: t.rounds.map((x, i) => (i === round ? { boards } : x)) };
}

export type Phase = "play" | "reveal" | "between" | "done";
export function phase(t: Tour, now: number): Phase {
  if (t.finishedAt) return "done";
  const r = current(t);
  if (!r) return "play";
  const mine = myBoard(t);
  if (!mine || mine.board.result === null) return "play";
  if (r.boards.some((b) => !seen(b, now))) return "reveal";
  return "between";
}
/** Boards of the current round that are still "being played" at `now`. */
export const pendingBoards = (t: Tour, now: number): number[] => (current(t)?.boards ?? []).map((b, i) => (seen(b, now) ? -1 : i)).filter((i) => i >= 0);
/** The next reveal in the current round, or null. */
export function nextRevealAt(t: Tour, now: number): number | null {
  const times = (current(t)?.boards ?? []).map((b) => b.revealAt).filter((x): x is number => x !== null && x > now);
  return times.length ? Math.min(...times) : null;
}

/** Pair the next round, or finish after the last one. Only when the round is fully shown. */
export function advance(t: Tour, now: number): Tour {
  if (phase(t, now) !== "between") return t;
  if (t.rounds.length >= ROUNDS) return { ...t, finishedAt: now };
  return { ...t, rounds: [...t.rounds, pairRound(t, rng(t.seed ^ (t.rounds.length + 1) * 104729))] };
}

export type Prize = { xp: number; coins: number };
export const PRIZES: Prize[] = [{ xp: 150, coins: 60 }, { xp: 100, coins: 40 }, { xp: 75, coins: 25 }];
export const PRIZE_DONE: Prize = { xp: 40, coins: 10 };
export const prizeFor = (place: number): Prize => PRIZES[place - 1] ?? PRIZE_DONE;
export const MEDAL = ["🥇", "🥈", "🥉"];
export const medal = (place: number) => MEDAL[place - 1] ?? "";

export function summary(t: Tour): TourSummary {
  const me = myIndex(t);
  return { id: t.id, tier: t.tier, tc: t.tc, place: placeOf(t, me), score: scores(t)[me]!, finishedAt: t.finishedAt ?? Date.now() };
}
export function podiums(history: TourSummary[]): Record<Tier, number> {
  const out: Record<Tier, number> = { begynner: 0, amator: 0, proff: 0 };
  for (const h of history) if (h.place <= 3) out[h.tier]++;
  return out;
}

/** Pay the prize once (credit id = tournament id) and count trophies on the progress record. */
export function withTourPrize(p: Progress, t: Tour): Progress {
  const id = `tour:${t.id}`;
  if (p.credits[id] !== undefined || !t.finishedAt) return p;
  const place = placeOf(t, myIndex(t));
  const prize = prizeFor(place);
  return {
    ...p,
    xp: p.xp + prize.xp,
    coins: p.coins + prize.coins,
    credits: { ...p.credits, [id]: prize.xp },
    tourPlayed: (p.tourPlayed ?? 0) + 1,
    tourWins: (p.tourWins ?? 0) + (place === 1 ? 1 : 0),
    tourPodiums: (p.tourPodiums ?? 0) + (place <= 3 ? 1 : 0),
  };
}

/** A tournament bot shaped like a ladder opponent, so /parti and the avatars work unchanged. Cached: the game screen keys effects on object identity. */
const opponentCache = new Map<string, Opponent>();
export function tourOpponent(id: string): Opponent | undefined {
  const b = tourBot(id.startsWith("tour:") ? id.slice(5) : id);
  if (!b) return undefined;
  let o = opponentCache.get(b.id);
  if (!o) {
    const emoji = { begynner: "🌱", amator: "⚔️", proff: "👑" }[b.tier];
    o = { id: `tour:${b.id}`, name: b.name, elo: b.elo, emoji, hue: b.hue, portrait: b.portrait, style: `${b.style} · ${b.club}`, line: b.line, winLine: b.winLine, tempo: b.tempo };
    opponentCache.set(b.id, o);
  }
  return o;
}
export const isTourOpponent = (id: string | undefined): boolean => !!id && id.startsWith("tour:");

const ord = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

/** Mike's line at the board before a tournament game (English, like all of Mike). */
export function boardIntro(t: Tour, round = t.rounds.length - 1): string {
  const mine = myBoard(t, round);
  if (!mine) return "Tournament time. Play the board, not the table.";
  const me = myIndex(t);
  const sc = scores(t, null, round);
  const my = sc[me]!, his = sc[t.players.indexOf(mine.opp)]!;
  const who = `${mine.opp.name} (${mine.opp.elo}, ${mine.opp.club})`;
  const colour = mine.color === "w" ? "White" : "Black";
  if (round === 0) return `Round 1 of ${ROUNDS}, board ${mine.no}. You've got ${colour} against ${who}. First game sets the mood – calm, solid, no gifts.`;
  const diff = my - his;
  const form = diff > 0 ? `You're on ${fmtScore(my)}, ${mine.opp.name.split(" ")[0]} on ${fmtScore(his)} – a win here and you pull away.` : diff < 0 ? `${mine.opp.name.split(" ")[0]} is ahead on ${fmtScore(his)} to your ${fmtScore(my)}. Beat the leader, change the table.` : `Both on ${fmtScore(my)} points. Whoever stays calm takes this one.`;
  const last = round === ROUNDS - 1 ? " Last round. Everything on this board." : "";
  return `Round ${round + 1} of ${ROUNDS}, board ${mine.no}. ${colour} against ${who}. ${form}${last}`;
}

/** Mike between rounds / in the lobby / at the podium. */
export function mikeTourLine(t: Tour | null, now: number): { text: string; mood: "chill" | "happy" | "think" | "shock" } {
  if (!t) return { text: "Ten players, five rounds, one table. Nobody remembers who led after round one – they remember who kept playing. Pick a tier.", mood: "chill" };
  const me = myIndex(t);
  const ph = phase(t, now);
  if (ph === "done") {
    const place = placeOf(t, me);
    if (place === 1) return { text: "First place. FIRST. Out of ten. I want you to remember this feeling the next time you lose a pawn on move six.", mood: "happy" };
    if (place <= 3) return { text: `${ord(place)} place and a medal. That's a tournament player. Next time we go one step higher.`, mood: "happy" };
    return { text: `${ord(place)} of ten. Five real games against real styles – that's five lessons. We'll find the one that mattered.`, mood: "think" };
  }
  const mine = myBoard(t);
  if (ph === "play") {
    if (t.rounds.length === 1) return { text: "Round one. Breathe. Check every capture twice, and don't rush the opening because the clock looks big.", mood: "chill" };
    const place = placeOf(t, me);
    return { text: place <= 3 ? `You're ${ord(place)} going into round ${t.rounds.length}. Leaders play solid – no hero moves.` : `${ord(place)} place. Doesn't matter. Win this one and the table moves. Board ${mine?.no ?? "?"}, let's go.`, mood: "chill" };
  }
  if (ph === "reveal") return { text: "Your game is done. The other boards are still fighting – watch the results come in. No scrolling, no snacks, this is the fun part.", mood: "think" };
  const place = placeOf(t, me);
  const myCell = mine?.board.result ? POINTS[mine.board.result][mine.color === "w" ? 0 : 1] : null;
  const next = t.rounds.length >= ROUNDS ? "Final table coming up." : `On to round ${t.rounds.length + 1}.`;
  if (myCell === 1) return { text: `Full point. You're ${ord(place)}. Now the hard part: forget it and play the next game exactly the same way. ${next}`, mood: "happy" };
  if (myCell === 0.5) return { text: `Half a point, ${ord(place)} place. Draws are not losses – half the field would take it. ${next}`, mood: "chill" };
  return { text: `Lost one. Happens to everyone in this room. ${ord(place)} place, and there are points left on the table. Shake it off. ${next}`, mood: "think" };
}

export function tourContext(t: Tour | null, now: number): string {
  if (!t) return "Tobias is in the tournament lobby, choosing a tier (Begynner, Amatør, Proff). Ten players, five rounds Swiss, rapid.";
  const me = myIndex(t);
  const st = standings(t, now);
  const lines = st.slice(0, 5).map((s) => `${s.place}. ${t.players[s.idx]!.name} ${fmtScore(s.score)}`).join(", ");
  const mine = myBoard(t);
  return [
    `Bot tournament, tier ${tierInfo(t.tier).name}, ${t.tc}, round ${t.rounds.length} of ${ROUNDS}, phase ${phase(t, now)}.`,
    `Tobias is ${ord(placeOf(t, me, now))} with ${fmtScore(scores(t, now)[me]!)} points. Top of table: ${lines}.`,
    mine ? `This round: ${mine.color === "w" ? "White" : "Black"} vs ${mine.opp.name} (${mine.opp.elo}) on board ${mine.no}${mine.board.result ? `, result ${mine.board.result}` : ", not played yet"}.` : "",
  ].filter(Boolean).join("\n");
}
