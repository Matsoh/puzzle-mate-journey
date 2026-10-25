import { withCredit, type Progress } from "./progress";

/** Mike Skolen: three lessons a day. Each pays once, finishing all three pays a bonus. */
export type LessonId = "lesson" | "game" | "drill";
export const LESSON_XP = 15;
export const SCHOOL_BONUS_XP = 40;
export const LESSONS_PLAN: { id: LessonId; title: string; hint: string }[] = [
  { id: "lesson", title: "Dagens leksjon", hint: "Løs én adaptiv oppgave riktig" },
  { id: "game", title: "Treningsparti", hint: "Spill ett parti med Mike ved brettet" },
  { id: "drill", title: "Grunnoppgave", hint: "Løs én av Mikes grunnoppgaver" },
];

const id = (day: string, l: LessonId) => `school:${day}:${l}`;

export function lessonDone(p: Progress, day: string, l: LessonId): boolean {
  return p.credits[id(day, l)] !== undefined;
}
export function schoolDone(p: Progress, day: string): boolean {
  return LESSONS_PLAN.every((l) => lessonDone(p, day, l.id));
}
export function withLesson(p: Progress, day: string, l: LessonId): Progress {
  let n = withCredit(p, id(day, l), LESSON_XP);
  if (schoolDone(n, day)) n = withWeekReward(withCredit(n, `school:${day}:done`, SCHOOL_BONUS_XP), day);
  return n;
}
/** Number of days the whole school day was completed (for the diploma counter). */
export function schoolDays(p: Progress): number {
  return Object.keys(p.credits).filter((k) => k.startsWith("school:") && k.endsWith(":done")).length;
}

// ---------- school week (Mon–Sun) ----------
export const WEEK_COINS = 100;
export const WEEK_XP = 100;
export const DAY_LABELS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d! + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
/** Monday of the week that contains `day`. */
export function weekStart(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const dow = (new Date(y!, m! - 1, d!).getDay() + 6) % 7; // 0 = Monday
  return addDays(day, -dow);
}
export function weekDays(day: string): string[] {
  const start = weekStart(day);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
export type WeekDay = { day: string; label: string; done: boolean; isToday: boolean; isFuture: boolean };
export function weekStatus(p: Progress, today: string): WeekDay[] {
  return weekDays(today).map((day, i) => ({ day, label: DAY_LABELS[i]!, done: schoolDone(p, day), isToday: day === today, isFuture: day > today }));
}
export function weekComplete(p: Progress, day: string): boolean {
  return weekDays(day).every((d) => schoolDone(p, d));
}
/** Full school weeks rewarded so far (drives avatar unlocks of kind "weeks"). */
export function schoolWeeks(p: Progress): number {
  return Object.keys(p.credits).filter((k) => k.startsWith("school:week:")).length;
}
/** Pay the week prize once when all seven days are complete. */
export function withWeekReward(p: Progress, day: string): Progress {
  if (!weekComplete(p, day)) return p;
  const id = `school:week:${weekStart(day)}`;
  if (p.credits[id] !== undefined) return p;
  return { ...withCredit(p, id, WEEK_XP), coins: (p.coins ?? 0) + WEEK_COINS };
}
