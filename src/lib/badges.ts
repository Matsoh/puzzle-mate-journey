import type { Progress } from "./progress";
import { levelFromXp } from "./rules";

export type Badge = { id: string; name: string; desc: string; icon: string; check: (p: Progress) => boolean };

export const BADGES: Badge[] = [
  { id: "forste-seier", name: "Første seier", desc: "Vinn ditt første parti", icon: "🏆", check: (p) => p.wins >= 1 },
  { id: "3-dager", name: "3 dager på rad", desc: "Tren 3 dager på rad", icon: "🔥", check: (p) => p.bestStreak >= 3 },
  { id: "7-dager", name: "7 dager på rad", desc: "Tren en hel uke på rad", icon: "🌟", check: (p) => p.bestStreak >= 7 },
  { id: "30-dager", name: "30 dager på rad", desc: "En hel måned uten pause!", icon: "💎", check: (p) => p.bestStreak >= 30 },
  { id: "pusler-10", name: "Puslemester 10", desc: "Løs 10 pusler", icon: "🧩", check: (p) => p.puzzlesSolved >= 10 },
  { id: "pusler-50", name: "Puslemester 50", desc: "Løs 50 pusler", icon: "🧠", check: (p) => p.puzzlesSolved >= 50 },
  { id: "pusler-100", name: "Puslelegende", desc: "Løs 100 pusler", icon: "🦾", check: (p) => p.puzzlesSolved >= 100 },
  { id: "slo-1600", name: "Slo 1600", desc: "Slå en motstander på 1600+", icon: "🥉", check: (p) => p.maxBeatenElo >= 1600 },
  { id: "slo-1800", name: "Slo 1800", desc: "Slå en motstander på 1800+", icon: "🥈", check: (p) => p.maxBeatenElo >= 1800 },
  { id: "slo-2000", name: "Slo 2000", desc: "Slå en motstander på 2000+", icon: "🥇", check: (p) => p.maxBeatenElo >= 2000 },
  { id: "rating-1700", name: "1700-klubben", desc: "Nå 1700 i partirating", icon: "📈", check: (p) => p.rating >= 1700 },
  { id: "rating-1850", name: "1850-klubben", desc: "Nå 1850 i partirating", icon: "🚀", check: (p) => p.rating >= 1850 },
  { id: "rating-2000", name: "2000!", desc: "Nå målet: 2000 i rating", icon: "👑", check: (p) => p.rating >= 2000 },
  { id: "niva-10", name: "Nivå 10", desc: "Nå nivå 10", icon: "⚡", check: (p) => levelFromXp(p.xp).level >= 10 },
];

export function applyBadges(p: Progress): { progress: Progress; earned: Badge[] } {
  const earned = BADGES.filter((b) => !p.badges.includes(b.id) && b.check(p));
  if (!earned.length) return { progress: p, earned };
  return { progress: { ...p, badges: [...p.badges, ...earned.map((b) => b.id)] }, earned };
}
