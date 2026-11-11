// Kinosalen rules: which Gotham clip is today's, what Mike recommends from the
// notebook, and how watching + proving pays. Pure and tested; the YouTube
// player only reports seconds watched.
import { CLIPS, getClip, type Clip } from "@/data/gotham";
import { classOf, seed, type Period } from "./curriculum";
import type { LessonId } from "./notebook";
import type { Progress } from "./progress";

export type CinemaSeen = { day: string; secs: number; done: boolean; proven: boolean };
/** Gotham Shorts feed: shorts already counted (ids, oldest first) and per-day tallies. */
export type FeedDay = { coins: number; watched: number; pauses: number; bonus: number };
export type Feed = { seen: string[]; day: Record<string, FeedDay> };
export type Cinema = { seen: Record<string, CinemaSeen>; dayCoins: Record<string, number>; feed?: Feed };
export const emptyCinema = (): Cinema => ({ seen: {}, dayCoins: {} });

/** Coins per day from the cinema, all clips included. */
export const DAY_CAP = 20;
export const SHORTS_PER_DAY = 5;
export const PROVE_COINS = 8;
export const PROVE_XP = 15;
export const WATCH_XP = 5;
/** Seen enough to count. */
export const DONE_AT = 0.8;

export const cinemaOf = (p: Progress): Cinema => p.cinema ?? emptyCinema();
export const seenOf = (p: Progress, id: string): CinemaSeen | undefined => cinemaOf(p).seen[id];
export const coinsToday = (p: Progress, day: string): number => cinemaOf(p).dayCoins[day] ?? 0;

/** One coin per short, one per two minutes of a video (1–10). */
export function watchCoins(c: Clip): number {
  if (c.kind === "short") return 1;
  return Math.max(1, Math.min(10, Math.round(c.secs / 120)));
}
export const clipLabel = (c: Clip): string => (c.kind === "short" ? "Short" : `${Math.round(c.secs / 60)} min`);

/** Clips this class may watch. */
export const clipsFor = (p: Progress): Clip[] => CLIPS.filter((c) => c.cls <= classOf(p).n);
export const clipLocked = (p: Progress, c: Clip): boolean => c.cls > classOf(p).n;

const topicsOf = (period: Period | undefined): string[] => {
  if (!period) return ["strategy"];
  switch (period.kind) {
    case "opening": return [`opening:${period.ref}`, "opening:general"];
    case "tactic": case "warmup": case "homework": return [`tactic:${period.ref}`];
    case "endgame": return [`endgame:${period.ref}`, "endgame:*"];
    case "strategy": return [`game:${period.ref}`, "game:*"];
    case "exam": return ["mindset"];
    default: return ["strategy"];
  }
};

/** Today's video: matches the subject of the day, unseen first, stable per day. */
export function dailyClip(p: Progress, day: string, periods: Period[]): Clip {
  const wanted = topicsOf(periods[1]);
  const pool = clipsFor(p).filter((c) => c.kind === "video");
  const unseen = (c: Clip) => !seenOf(p, c.id)?.done;
  const hit = (t: string, w: string) => (w.endsWith(":*") ? t.startsWith(w.slice(0, -1)) : t === w);
  const byTopic = (ts: string[]) => pool.filter((c) => c.topics.some((t) => ts.some((w) => hit(t, w))));
  const cands = [byTopic(wanted).filter(unseen), byTopic(wanted), pool.filter(unseen), pool].find((xs) => xs.length) ?? pool;
  return cands[seed(day + ":kino") % cands.length]!;
}

/** Notebook lesson → the clip topic that fixes it. */
export const LESSON_TOPIC: Record<LessonId, string> = {
  hanging: "tactic:defensiveMove",
  "capture-blunder": "tactic:defensiveMove",
  missedMate: "tactic:mateIn2",
  allowedMate: "tactic:defensiveMove",
  opening: "opening:general",
  endgame: "tactic:pawnEndgame",
  "tactic-missed": "tactic:fork",
};
const LESSON_WHY: Record<LessonId, string> = {
  hanging: "du har hengt brikker i flere partier",
  "capture-blunder": "slag som kostet dyrt går igjen i partiene dine",
  missedMate: "du har oversett matt i flere partier",
  allowedMate: "du har sluppet motstanderen inn til kongen din",
  opening: "åpningene har gått galt i flere partier",
  endgame: "sluttspillene koster deg poeng",
  "tactic-missed": "du har gått glipp av taktikk i flere partier",
};

/** Mike's recommendation from the notebook's most common pattern (videos first, then shorts). */
export function recommendation(p: Progress): { clip: Clip; why: string; lesson: LessonId } | null {
  const pats = Object.entries(p.notebook?.patterns ?? {}) as [LessonId, number][];
  pats.sort((a, b) => b[1] - a[1]);
  for (const [lesson, n] of pats) {
    if (!n || n < 2) continue;
    const topic = LESSON_TOPIC[lesson];
    if (!topic) continue;
    const pool = clipsFor(p).filter((c) => c.topics.includes(topic)).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "video" ? -1 : 1));
    const clip = pool.find((c) => !seenOf(p, c.id)?.done) ?? pool[0];
    if (clip) return { clip, why: LESSON_WHY[lesson], lesson };
  }
  return null;
}

/** Shorts watched today (for the daily shorts cap). */
export function shortsToday(p: Progress, day: string): number {
  return Object.entries(cinemaOf(p).seen).filter(([id, s]) => s.day === day && s.done && getClip(id)?.kind === "short").length;
}

/** Keep only the latest `n` day keys so per-day tallies never grow without bound. */
function lastDays<T>(rec: Record<string, T>, n = 14): Record<string, T> {
  const keys = Object.keys(rec).sort();
  return keys.length <= n ? rec : Object.fromEntries(keys.slice(-n).map((k) => [k, rec[k]!]));
}

function pay(p: Progress, day: string, coins: number): [Progress, number] {
  const used = coinsToday(p, day);
  const give = Math.max(0, Math.min(coins, DAY_CAP - used));
  if (!give) return [p, 0];
  const c = cinemaOf(p);
  return [{ ...p, coins: p.coins + give, cinema: { ...c, dayCoins: lastDays({ ...c.dayCoins, [day]: used + give }) } }, give];
}

/** Record seconds watched; when the clip crosses 80 %, mark it done and pay once. */
export function withWatched(p: Progress, id: string, secs: number, day: string): { p: Progress; paid: number; justDone: boolean } {
  const clip = getClip(id);
  if (!clip) return { p, paid: 0, justDone: false };
  const c = cinemaOf(p);
  const prev = c.seen[id];
  const best = Math.max(prev?.secs ?? 0, Math.min(secs, clip.secs));
  const done = prev?.done || best >= clip.secs * DONE_AT;
  let next: Progress = { ...p, cinema: { ...c, seen: { ...c.seen, [id]: { day: prev?.done ? prev.day : day, secs: best, done, proven: prev?.proven ?? false } } } };
  if (prev?.done || !done) return { p: next, paid: 0, justDone: false };
  if (clip.kind === "short" && shortsToday(p, day) >= SHORTS_PER_DAY) return { p: next, paid: 0, justDone: true };
  const credit = `kino:${id}:seen`;
  if (next.credits[credit] === undefined) next = { ...next, xp: next.xp + WATCH_XP, credits: { ...next.credits, [credit]: WATCH_XP } };
  const [paidP, paid] = pay(next, day, watchCoins(clip));
  return { p: paidP, paid, justDone: true };
}

/** The proof after the video (puzzles / drill / master game) passed: bonus once. */
export function withProven(p: Progress, id: string, day: string): { p: Progress; paid: number } {
  const clip = getClip(id);
  const prev = seenOf(p, id);
  if (!clip || !prev?.done || prev.proven) return { p, paid: 0 };
  const c = cinemaOf(p);
  let next: Progress = { ...p, cinema: { ...c, seen: { ...c.seen, [id]: { ...prev, proven: true } } } };
  const credit = `kino:${id}:proof`;
  if (next.credits[credit] === undefined) next = { ...next, xp: next.xp + PROVE_XP, credits: { ...next.credits, [credit]: PROVE_XP } };
  const [paidP, paid] = pay(next, day, PROVE_COINS);
  return { p: paidP, paid };
}

export function cinemaSummary(p: Progress): { seen: number; proven: number; total: number } {
  const seen = Object.values(cinemaOf(p).seen);
  return { seen: seen.filter((s) => s.done).length, proven: seen.filter((s) => s.proven).length, total: CLIPS.length };
}

export const GROUPS: { id: string; name: string; match: (c: Clip) => boolean }[] = [
  { id: "opening", name: "Åpninger", match: (c) => c.kind === "video" && c.topics.some((t) => t.startsWith("opening:")) },
  { id: "tactic", name: "Taktikk og forsvar", match: (c) => c.kind === "video" && c.topics.some((t) => t.startsWith("tactic:")) && !c.topics.some((t) => t.startsWith("opening:") || t.startsWith("endgame:")) },
  { id: "endgame", name: "Sluttspill", match: (c) => c.kind === "video" && c.topics.some((t) => t.startsWith("endgame:")) },
  { id: "game", name: "Mesterpartier", match: (c) => c.kind === "video" && c.topics.some((t) => t.startsWith("game:")) },
  { id: "mind", name: "Strategi og hodet", match: (c) => c.kind === "video" && c.topics.every((t) => !/^(opening|tactic|endgame|game):/.test(t)) },
  { id: "short", name: "Shorts", match: (c) => c.kind === "short" },
];
export function grouped(): { group: (typeof GROUPS)[number]; clips: Clip[] }[] {
  const used = new Set<string>();
  return GROUPS.map((group) => {
    const clips = CLIPS.filter((c) => !used.has(c.id) && group.match(c));
    for (const c of clips) used.add(c.id);
    return { group, clips };
  });
}

/** Mike in the cinema (English). */
export function mikeCinemaLine(p: Progress, today: Clip, day: string): { text: string; mood: "chill" | "happy" | "think" } {
  const s = seenOf(p, today.id);
  const used = coinsToday(p, day);
  if (s?.proven) return { text: `Watched and proven. ${used >= DAY_CAP ? "That's the cinema budget for today – the rest is for fun." : "Pick another one from the list, or go play."}`, mood: "happy" };
  if (s?.done) return { text: "You watched it. Now the part that matters: prove it. Three puzzles, no pressure – just show me it stuck.", mood: "think" };
  return { text: `Today's video: ${today.orig}. ${today.mike}`, mood: "chill" };
}

// ---- Gotham Shorts: the scroll feed ----

/** Coins per day from scrolling (one per short not seen before). */
export const FEED_CAP = 15;
/** Mike's scroll break: one puzzle after this many shorts. */
export const FEED_PAUSE_EVERY = 8;
export const FEED_PAUSE_COINS = 2;
export const FEED_BONUS_PER_DAY = 5;
export const FEED_SEEN_MAX = 1500;

const EMPTY_DAY: FeedDay = { coins: 0, watched: 0, pauses: 0, bonus: 0 };
export const feedOf = (p: Progress): Feed => cinemaOf(p).feed ?? { seen: [], day: {} };
export const feedToday = (p: Progress, day: string): FeedDay => ({ ...EMPTY_DAY, ...feedOf(p).day[day] });

/** A short counts once it has played 8 seconds, or 60 % of a shorter one. */
export function shortWatched(playedSecs: number, duration: number): boolean {
  const need = duration > 0 ? Math.min(8, duration * 0.6) : 8;
  return playedSecs >= need;
}

/** Scroll order: shorts not seen yet first (newest first), then the seen ones reshuffled per day. */
export function feedOrder(ids: readonly string[], seen: readonly string[], salt: string): string[] {
  const was = new Set(seen);
  const fresh = ids.filter((id) => !was.has(id));
  const old = ids.filter((id) => was.has(id)).map((id) => [seed(salt + id), id] as const).sort((a, b) => a[0] - b[0]).map(([, id]) => id);
  return [...fresh, ...old];
}

function withFeedDay(p: Progress, day: string, f: (d: FeedDay) => FeedDay, seen?: string[]): Progress {
  const c = cinemaOf(p);
  const feed = feedOf(p);
  return { ...p, cinema: { ...c, feed: { seen: seen ?? feed.seen, day: lastDays({ ...feed.day, [day]: f({ ...EMPTY_DAY, ...feed.day[day] }) }) } } };
}

/** A short was watched in the feed: one coin the first time, up to the daily cap; always counted towards Mike's break. */
export function withFeedShort(p: Progress, id: string, day: string): { p: Progress; paid: number } {
  const feed = feedOf(p);
  const isNew = !feed.seen.includes(id);
  const paid = isNew && feedToday(p, day).coins < FEED_CAP ? 1 : 0;
  const seen = isNew ? [...feed.seen, id].slice(-FEED_SEEN_MAX) : feed.seen;
  const next = withFeedDay(p, day, (d) => ({ ...d, coins: d.coins + paid, watched: d.watched + 1 }), seen);
  return { p: paid ? { ...next, coins: next.coins + paid } : next, paid };
}

/** Time for Mike's scroll break? */
export const pauseDue = (p: Progress, day: string): boolean => {
  const d = feedToday(p, day);
  return d.watched >= (d.pauses + 1) * FEED_PAUSE_EVERY;
};

/** The break's puzzle was attempted: the feed opens again; a correct answer pays a small bonus (a few per day). */
export function withFeedPause(p: Progress, day: string, ok: boolean): { p: Progress; paid: number } {
  const paid = ok && feedToday(p, day).bonus < FEED_BONUS_PER_DAY ? FEED_PAUSE_COINS : 0;
  const next = withFeedDay(p, day, (d) => ({ ...d, pauses: Math.max(d.pauses + 1, Math.floor(d.watched / FEED_PAUSE_EVERY)), bonus: d.bonus + (paid ? 1 : 0) }));
  return { p: paid ? { ...next, coins: next.coins + paid } : next, paid };
}
