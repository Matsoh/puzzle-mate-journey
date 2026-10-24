// Mike — the one-eyed monster who hangs out on the home screen.
// Pure, deterministic lines (English, dry, never babyish). Later an LLM can
// take over through the same shape; these stay as the offline fallback.
import type { Progress } from "./progress";
import { levelFromXp } from "./rules";
import { allQuestsDone, questDone, type Quest } from "./quests";

export type MikeMood = "chill" | "happy" | "think" | "shock" | "sleep";
export type MikeLine = { text: string; mood: MikeMood };

export const MIKE_NAME = "Mike";

/** Stable pick from a list, same answer all day. */
function pick<T>(list: readonly T[], seed: string): T {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length]!;
}

const IDLE = [
  "Three quests. Ten minutes. Then you can go back to whatever that is.",
  "I've been staring at this board all night. One of us should make a move.",
  "No pressure. I just happen to know the opponent on the ladder is beatable.",
  "Rumour has it 2000 is just 1520 with better habits.",
  "Checks, captures, threats. Same as yesterday. Still works.",
  "I counted. You've got exactly enough time for one game before dinner.",
];

const PARTIAL = [
  "One down. Keep going – I don't do halfway.",
  "Decent start. The board is still warm.",
  "Two left. I'm not going anywhere.",
];

const DONE = [
  "All three. I'd clap, but I don't have hands. Nice.",
  "Quests cleared. Go outside or whatever. I'll guard the board.",
  "That's a full day. Your future opponents just got a bit nervous.",
];

const STREAK_BACK = [
  "You're back. The board missed you. I didn't. Much.",
  "Streak's reset. Who cares. Today counts.",
];

const BIG_STREAK = [
  "{n} days in a row. Even I'm impressed, and I'm made of felt.",
  "{n}-day streak. That's not luck, that's a habit.",
];

export function mikeHomeLine(p: Progress, quests: Quest[], day: string, streak: number): MikeLine {
  const done = quests.filter(questDone).length;
  if (allQuestsDone(quests)) return { text: pick(DONE, day + "d"), mood: "happy" };
  if (done > 0) return { text: pick(PARTIAL, day + "p" + done), mood: "chill" };
  if (streak >= 3) return { text: pick(BIG_STREAK, day + "s").replace("{n}", String(streak)), mood: "happy" };
  if (p.lastDay && streak === 0) return { text: pick(STREAK_BACK, day + "b"), mood: "think" };
  return { text: pick(IDLE, day + "i"), mood: "chill" };
}

export function mikeLevelLine(xp: number): string {
  const l = levelFromXp(xp);
  const left = l.needed - l.into;
  if (left <= 20) return `${left} XP to level ${l.level + 1}. One puzzle. Go on.`;
  return `${left} XP to level ${l.level + 1}.`;
}

/** A mood for a line of Mike's text, so his face follows what he says. */
export function moodFor(text: string): MikeMood {
  const t = text.toLowerCase();
  if (/\b(won|win|nice|yes|great|brilliant|love|best|proud)\b|!/.test(t) && !/\b(lost|blunder|hang|hung)\b/.test(t)) return "happy";
  if (/\b(blunder|hung|hang|ouch|mate|check|lost|careful|uh)\b/.test(t)) return "shock";
  if (/\?|\b(think|plan|candidate|why|what)\b/.test(t)) return "think";
  return "chill";
}
