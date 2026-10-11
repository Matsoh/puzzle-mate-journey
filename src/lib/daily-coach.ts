import type { Progress } from "./progress";
import { OPPONENTS } from "./opponents";
import { liveStreak } from "./rules";

export const PEPTALKS = [
  "Grrr… ti minutter med skarpe trekk slår en hel time med tankeløs flytting, champ!",
  "Steinspringeren min har sprekker. Det betyr ikke at den gir opp. Det gjør ikke du heller!",
  "Snøft… et tap er ikke slutten. Det er et spor som viser hva vi kan trene på.",
  "Små steg, sterke trekk. Vi bygger sjakkstyrke én dag om gangen.",
  "Du trenger ikke vinne alt i dag. Bare møt opp og bruk hodet, champ.",
  "Grrr… vær nysgjerrig! Hva pønsker motstanderen på nå?",
  "En modig champ tør å se på egne feil. Det er der neste gode idé gjemmer seg.",
  "Pust ut. Senk skuldrene. Brettet venter på din beste tanke.",
  "Mosen vokser sakte, men gir seg aldri. Sånn trener vi også!",
  "Ikke la et dårlig trekk bestemme resten av dagen. Neste trekk er en ny sjanse.",
  "Grrr… se etter sjakker, slag og trusler før du setter planen i gang.",
  "Du er mer enn ratingtallet ditt. Innsatsen din teller også, champ.",
  "En vanskelig pusle er en liten boss. Ta deg tid og finn svakheten.",
  "Det er lov å tenke lenge. Gode planer trenger litt plass i hodet.",
  "Snøft… sjekk kongens sikkerhet. Selv en goblin trenger et trygt hjem!",
  "Vi jakter ikke perfekte partier. Vi jakter én ting å lære av hvert parti.",
  "Ta med deg én god idé fra treningen i dag. Det er verdifullt bytte!",
  "Steinhard vilje betyr ikke å være hard mot seg selv. Heia deg, champ.",
  "Grrr… før du flytter: Hva ville du gjort om du satt på den andre siden?",
  "Når du står fast, ta en liten pause og se på brettet med friske øyne.",
  "En liten plan er bedre enn et stort håp. Finn noe konkret å jobbe med.",
  "Du trenger ikke være raskest. Gi tankene dine tid til å bli skarpe.",
  "Champ, motstanderen får også gode ideer. Respekter dem og let etter ditt svar.",
  "Grrr… feil er treningsspor, ikke merkelapper. Vi følger sporene og blir klokere.",
  "Fem pusler og litt tålmodighet. Det høres ut som fint goblinarbeid!",
  "Et rolig hode ser mer enn et sint hode. Pust før neste trekk, champ.",
  "Hver gang du prøver igjen, viser du ekte mesterstyrke.",
  "Snøft… ikke flytt bare fordi en brikke kan. Finn ut hvorfor den skal.",
  "Du og jeg tar stigen ett trinn av gangen. Ingen trenger å hoppe helt til toppen.",
  "Vær stolt av et godt forsøk, også når resultatet ikke ble som du håpet.",
  "Grrr… en skarp hjerne trenger pauser også. En kort økt holder i dag.",
  "Se etter brikker som trenger hjelp. Kanskje planen din begynner akkurat der.",
  "Dagens mål: litt mer nysgjerrighet, litt mindre hastverk.",
  "Du har lov til å ombestemme deg før du flytter. Sjekk ideen én gang til.",
  "Når en pusle virker vrien, let etter motstanderens sterkeste svar.",
  "Grrr… jeg heier på innsatsen din, ikke bare seirene. Kom, vi prøver!",
  "Ta vare på gleden ved sjakk, champ. Den er verdt mer enn en blank pokal.",
  "Et godt spørsmål kan være starten på et godt trekk. Spør hva stillingen trenger.",
  "Du bygger din egen vei mot 2000. I dag legger vi en stein til.",
  "Snøft… springeren er klar, brettet er klart, og jeg tror på deg. Vi kjører!",
] as const;

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

export function dailyPeptalk(p: Progress, day: string, recentWinId?: string): Peptalk {
  const next = OPPONENTS.find((o) => !p.beaten.includes(o.id));
  const goal = next ? `${next.name} · ${next.elo} i rating` : p.rating < 2000 ? "2000 i klubb/FIDE" : "Hold formen med dagens pusler";
  const result = (kind: Peptalk["kind"], text: string): Peptalk => ({ kind, text, goal });
  const won = OPPONENTS.find((o) => o.id === recentWinId && p.beaten.includes(o.id));
  if (won) return result("win", next ? `Grrr, du slo ${won.name}! ${next.name} står for tur. Nyt seieren, champ – så tar vi neste trinn!` : `Grrr, du slo ${won.name}! Hele stigen er erobret. Steinhard innsats, champ!`);
  if (p.daily?.day === day && p.daily.ids.length === 5 && p.daily.ids.every((id) => p.daily?.results[id])) {
    return result("puzzles", "Alle fem puslene er ferdige! Grrr, det er godt goblinarbeid, champ. Vær stolt av innsatsen – og ta en velfortjent pust i bakken.");
  }
  const milestone = [1600, 1700, 1800, 1850, 1900, 2000].find((n) => n > p.rating && n - p.rating <= 25);
  if (milestone) return result("milestone", `Bare ${milestone - p.rating} poeng til ${milestone}! Snøft… ingen hast, champ. Tren rolig og la de gode trekkene vise vei.`);
  const puzzleBadge = [{ n: 10, id: "pusler-10", name: "Puslemester 10" }, { n: 50, id: "pusler-50", name: "Puslemester 50" }, { n: 100, id: "pusler-100", name: "Puslelegende" }].find((b) => !p.badges.includes(b.id) && b.n > p.puzzlesSolved && b.n - p.puzzlesSolved <= 3);
  if (puzzleBadge) return result("badge", `Grrr, bare ${puzzleBadge.n - p.puzzlesSolved} løste pusler til merket «${puzzleBadge.name}»! Én om gangen, champ. Du nærmer deg!`);
  const streak = liveStreak(p.lastDay, day, p.streak);
  if (streak >= 7) return result("streak7", `${streak} dager på rad! Grrr, steinhard innsats, champ. Du møter opp igjen og igjen – det er verdt å være stolt av!`);
  if (streak >= 3) return result("streak3", `${streak} dager på rad, champ! Mosen gror, og treningsvanen din vokser. La oss legge en god økt til rekka!`);
  if (streak === 0) return result("return", p.lastDay ? "Grrr, jeg savnet deg i går! Fem pusler i dag, så er vi i gang igjen. Godt å ha deg tilbake, champ." : "Grrr… godt å se deg, champ! Fem pusler i dag, så er vi i gang. Vi tar ett lite steg om gangen.");
  return result("daily", PEPTALKS[((dayNumber(day) % PEPTALKS.length) + PEPTALKS.length) % PEPTALKS.length] ?? PEPTALKS[0]);
}