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
  if (schoolDone(n, day)) n = withCredit(n, `school:${day}:done`, SCHOOL_BONUS_XP);
  return n;
}
/** Number of days the whole school day was completed (for the diploma counter). */
export function schoolDays(p: Progress): number {
  return Object.keys(p.credits).filter((k) => k.startsWith("school:") && k.endsWith(":done")).length;
}
