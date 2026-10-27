import type { Progress } from "./progress";
import { OPPONENTS, ratingLabel } from "./opponents";
import { liveStreak } from "./rules";

export type CoachVoice = "mike" | "neutral";

/** Curated daily lines per profile voice; inspired by playing style, never quotes. */
export const PEPTALKS: Record<CoachVoice, readonly string[]> = {
  mike: [
    "Rolig i dag. Før hvert trekk: hvilken brikke din gjør minst? Gi den en bedre plass.",
    "En liten fordel er nok. Gjør stillingen litt bedre, trekk for trekk.",
    "Når dronningene er byttet: spør deg selv om kongen din kan bli mer aktiv.",
    "Hva er motspillet til motstanderen? Finn det før du legger din egen plan.",
    "Tålmodighet er en styrke. Du trenger ikke vinne på trekk 15.",
    "Se på tårnene dine. Står de på en åpen linje, eller venter de bak bøndene?",
    "Har noen en fribonde? Den bonden bestemmer ofte hele sluttspillet.",
    "Et rolig trekk som forbedrer en brikke kan være sterkere enn et angrep.",
    "Spør stillingen: hva trenger den? Ikke bare: hva kan jeg gjøre?",
    "Gode sluttspill gir trygge partier. Litt øving i dag hjelper i neste parti.",
    "Hvis du er usikker, gjør brikkene dine litt bedre og vent på sjansen.",
    "Hvilken bonde er svak hos motstanderen? Kan du presse den rolig?",
    "Du kan vinne ved å være litt bedre lenge. Det er helt greit å ta tiden.",
    "Pust, se over hele brettet, og velg trekket som gjør stillingen sunnere.",
  ],
  neutral: [
    "Ti minutter med gjennomtenkte trekk er bedre enn en time med hastverk.",
    "Små steg hver dag bygger sjakkstyrke. Du er i gang!",
    "Et tap er et spor som viser hva vi kan trene på.",
    "Se etter sjakker, slag og trusler før du legger planen.",
    "Det er lov å tenke lenge. Gode planer trenger litt tid.",
    "Velg en virtuell trener på trenersiden, så får du råd som passer stilen.",
    "Feil er treningsspor, ikke merkelapper. Vi lærer av dem.",
  ],
};

export const CHESS_FACTS = [
  "Judit Polgár ble stormester da hun var 15 år, i 1991.",
  "Bobby Fischer vant det amerikanske mesterskapet da han var 14 år.",
  "Ordet «sjakk matt» kommer fra persisk «shah mat», som betyr omtrent «kongen er hjelpeløs».",
  "Et sjakkbrett har 64 ruter, og hver spiller starter med 16 brikker.",
  "Antallet mulige sjakkpartier er større enn antallet atomer i det observerbare universet.",
  "Rokade er det eneste trekket der to brikker flytter samtidig.",
  "En bonde som når siste rad kan forvandles til dronning, tårn, løper eller springer.",
  "Selv de beste spillerne i verden taper partier – det viktigste er å lære av dem.",
  "Patt (ingen lovlige trekk, men ikke i sjakk) er remis, ikke seier.",
  "«En passant» er det eneste slaget der brikken som slår ikke lander på ruten til brikken den slår.",
] as const;

/** UTC day arithmetic on the local calendar key avoids DST-related repeats. */
export function dayNumber(day: string): number {
  const [y = 2026, m = 1, d = 1] = day.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function dailyFact(day: string): string {
  return CHESS_FACTS[((dayNumber(day) % CHESS_FACTS.length) + CHESS_FACTS.length) % CHESS_FACTS.length] ?? CHESS_FACTS[0];
}

export type Peptalk = { kind: "daily" | "puzzles" | "win" | "milestone" | "badge" | "streak7" | "streak3" | "return"; text: string; goal: string };

/** Presentation-only notification; never changes saved game progress. */
export function rememberLadderWin(id: string, day: string): void {
  try { sessionStorage.setItem("goblin-chess.coach-win", JSON.stringify({ id, day })); } catch { /* Optional notification. */ }
}

export function recentLadderWin(day: string): string | undefined {
  try {
    const raw = sessionStorage.getItem("goblin-chess.coach-win");
    if (!raw) return undefined;
    const win = JSON.parse(raw);
    return win.day === day && typeof win.id === "string" ? win.id : undefined;
  } catch { return undefined; }
}

const VOICE: Record<CoachVoice, { win: (w: string, n?: string) => string; puzzles: string; milestone: (d: number, m: number) => string; badge: (d: number, n: string) => string; streak7: (s: number) => string; streak3: (s: number) => string; back: string; first: string }> = {
  mike: {
    win: (w, n) => n ? `Du slo ${w}. Godt spilt! Neste er ${n}: spill rolig og forbedre brikkene dine.` : `Du slo ${w}, og hele stigen er slått. Tålmodig og sterkt!`,
    puzzles: "Alle fem puslene er ferdige. Rolig og grundig arbeid – nyt pausen.",
    milestone: (d, m) => `${d} poeng til ${m} i appen. Ingen hast – gode trekk kommer av seg selv.`,
    badge: (d, n) => `${d} løste pusler til merket «${n}». Én om gangen.`,
    streak7: (s) => `${s} dager på rad. Jevn trening er akkurat sånn man blir bedre.`,
    streak3: (s) => `${s} dager på rad. Fin vane – vi legger én rolig økt til.`,
    back: "Velkommen tilbake. Start med fem pusler og se etter brikken som gjør minst.",
    first: "Godt å se deg. Fem pusler i dag, så tar vi det rolig derfra.",
  },
  neutral: {
    win: (w, n) => n ? `Du slo ${w}! ${n} står for tur.` : `Du slo ${w}, og hele stigen er slått. Sterkt!`,
    puzzles: "Alle fem puslene er ferdige! Vær stolt av innsatsen.",
    milestone: (d, m) => `Bare ${d} poeng til ${m} i appen. Tren rolig videre.`,
    badge: (d, n) => `Bare ${d} løste pusler til merket «${n}»!`,
    streak7: (s) => `${s} dager på rad! Du møter opp igjen og igjen.`,
    streak3: (s) => `${s} dager på rad! Treningsvanen vokser.`,
    back: "Velkommen tilbake! Fem pusler i dag, så er du i gang igjen.",
    first: "Godt å se deg! Fem pusler i dag, så er du i gang.",
  },
};

export function dailyPeptalk(p: Progress, day: string, recentWinId?: string, voice: CoachVoice = "neutral"): Peptalk {
  const v = VOICE[voice]; const lines = PEPTALKS[voice];
  const next = OPPONENTS.find((o) => !p.beaten.includes(o.id));
  const goal = next ? `${next.name} · ${ratingLabel(next)} i rating` : p.rating < 2000 ? "2000 i klubb/FIDE" : "Hold formen med dagens pusler";
  const result = (kind: Peptalk["kind"], text: string): Peptalk => ({ kind, text, goal });
  const won = OPPONENTS.find((o) => o.id === recentWinId && p.beaten.includes(o.id));
  if (won) return result("win", v.win(won.name, next?.name));
  if (p.daily?.day === day && p.daily.ids.length === 5 && p.daily.ids.every((id) => p.daily?.results[id])) return result("puzzles", v.puzzles);
  const milestone = [1600, 1700, 1800, 1850, 1900, 2000].find((n) => n > p.rating && n - p.rating <= 25);
  if (milestone) return result("milestone", v.milestone(milestone - p.rating, milestone));
  const puzzleBadge = [{ n: 10, id: "pusler-10", name: "Puslemester 10" }, { n: 50, id: "pusler-50", name: "Puslemester 50" }, { n: 100, id: "pusler-100", name: "Puslelegende" }].find((b) => !p.badges.includes(b.id) && b.n > p.puzzlesSolved && b.n - p.puzzlesSolved <= 3);
  if (puzzleBadge) return result("badge", v.badge(puzzleBadge.n - p.puzzlesSolved, puzzleBadge.name));
  const streak = liveStreak(p.lastDay, day, p.streak);
  if (streak >= 7) return result("streak7", v.streak7(streak));
  if (streak >= 3) return result("streak3", v.streak3(streak));
  if (streak === 0) return result("return", p.lastDay ? v.back : v.first);
  return result("daily", lines[((dayNumber(day) % lines.length) + lines.length) % lines.length] ?? lines[0]!);
}

/** Short greeting per voice for the overview speech bubble. */
export function dailyGreeting(day: string, voice: CoachVoice): string {
  const l = PEPTALKS[voice];
  return l[(((dayNumber(day) + 3) % l.length) + l.length) % l.length]!;
}
