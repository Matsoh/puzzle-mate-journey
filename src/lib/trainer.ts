import { Chess } from "chess.js";
import { dayNumber } from "./daily-coach";

export type CoachId = "magnus" | "hikaru";

export type Exercise = {
  id: string;
  coach: CoachId;
  title: string;
  task: string;
  fen: string;
  /** Every SAN move that is pedagogically correct for the exact task. */
  accept: string[];
  hint: string;
  explanation: string;
};

export type CoachProfile = {
  id: CoachId;
  label: string;
  player: string;
  focus: string;
  themes: string[];
  advice: string[];
  tasks: string[];
  motivation: string[];
};

export const DISCLAIMER = "Virtuell trener inspirert av spillestilen. Ikke tilknyttet spillerne.";

export const PROFILES: Record<CoachId, CoachProfile> = {
  magnus: {
    id: "magnus",
    label: "Magnus-inspirert",
    player: "Magnus Carlsen",
    focus: "Posisjon og sluttspill",
    themes: ["Dårligst plasserte brikke", "Små fordeler", "Aktiv konge", "Fribønder", "Tålmodighet"],
    advice: [
      "Finn brikken din som gjør minst, og gi den en bedre rute før du starter et angrep.",
      "En liten fordel er nok. Gjør stillingen litt bedre trekk for trekk i stedet for å forhaste deg.",
      "Når dronningene er byttet, er kongen en sterk brikke. Gå fram med den mot midten.",
      "En fribonde vil fram. Skyv den når det er trygt, og støtt den med konge eller tårn.",
      "Tårn hører hjemme på åpne linjer og på 7. rad. Der lager de mest trøbbel.",
    ],
    tasks: [
      "I neste parti: velg ett trekk der du bare forbedrer din dårligste brikke.",
      "I sluttspillet: flytt kongen mot midten før du skyver bønder.",
      "Se etter en åpen linje til tårnet ditt før trekk 20.",
      "Når du har en fribonde, si høyt (inni deg) hvem som skal støtte den.",
      "Ikke tilby remis i en stilling der du fortsatt kan presse litt.",
    ],
    motivation: [
      "Tålmodighet er også en styrke. Du kan vinne partier ved å være litt bedre lenge.",
      "Rolig spill er ikke kjedelig – det er der små fordeler vokser.",
      "Hvert sluttspill du øver på, gjør deg tryggere i neste parti.",
    ],
  },
  hikaru: {
    id: "hikaru",
    label: "Hikaru-inspirert",
    player: "Hikaru Nakamura",
    focus: "Initiativ og taktikk",
    themes: ["Kandidattrekk", "Sjakk, slag og trusler", "Initiativ", "Forsvar mot trusler", "Beregning før offer"],
    advice: [
      "Før hvert trekk: sjekk alle sjakker, slag og trusler – for begge sider.",
      "Skriv opp (i hodet) to–tre kandidattrekk før du velger. Det første er ikke alltid best.",
      "Initiativ betyr å stille spørsmål motstanderen må svare på. Lag trusler med tempo.",
      "Se alltid på hva motstanderens siste trekk truer før du legger din egen plan.",
      "Et offer må beregnes. Spør: hva er motstanderens beste svar, og hva gjør jeg da?",
    ],
    tasks: [
      "I neste parti: finn tre kandidattrekk i minst fem stillinger.",
      "Før du slår: sjekk om motstanderen har et mellomtrekk med sjakk.",
      "Etter hvert motstandertrekk: spør «hva truer det?» før du tenker på din plan.",
      "Prøv ett trekk som skaper en trussel og samtidig utvikler en brikke.",
      "Før et offer: beregn minst tre trekk fram for begge sider.",
    ],
    motivation: [
      "Skarpe øyne vinner partier. Hver gang du sjekker trusler, blir du vanskeligere å lure.",
      "Beregning er en muskel. Litt trening hver dag gjør den sterk.",
      "Du trenger ikke være raskest – du trenger å se litt mer enn motstanderen.",
    ],
  },
};

/** Original training positions; every FEN and answer is verified with chess.js in trainer.test.ts. */
export const EXERCISES: Exercise[] = [
  { id: "m-kongen", coach: "magnus", title: "Kongen foran bonden", task: "Hvit i trekket. Før kongen fram ved siden av bonden.", fen: "8/4k3/8/8/8/8/4P3/4K3 w - - 0 1", accept: ["Kd2", "Kf2"], hint: "Bonden trenger en livvakt. Hvilken brikke kan gå foran og rydde vei?", explanation: "Kongen skal foran bonden. Med Kd2 eller Kf2 kommer kongen fram og kan senere hjelpe bonden helt til siste rad. Å skyve bonden først gir svart kongen tid til å blokkere." },
  { id: "m-fribonde", coach: "magnus", title: "Fribonden løper", task: "Hvit i trekket. Hvilket trekk får bonden raskest til dronning?", fen: "8/8/P7/8/8/5k2/8/6K1 w - - 0 1", accept: ["a7"], hint: "Tell trekkene: hvor langt har bonden igjen, og hvor langt har svart konge?", explanation: "a7! Bonden trenger bare ett trekk til for å bli dronning, og svart konge er altfor langt unna. En fribonde som ingen kan stoppe, skal skyves." },
  { id: "m-taarn", coach: "magnus", title: "Tårnet til 7. rad", task: "Hvit i trekket. Sett tårnet på 7. rad.", fen: "r5k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", accept: ["Rd7"], hint: "d-linjen er åpen. Hvor langt kan tårnet gå uten å bli slått?", explanation: "Rd7 bruker den åpne linjen og angriper bøndene på 7. rad. Rd8+ ville bare blitt slått av tårnet på a8. Et aktivt tårn gjør motstanderens liv vanskelig." },
  { id: "h-baklinje", coach: "hikaru", title: "Baklinjematt", task: "Hvit i trekket. Sett matt i ett trekk.", fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", accept: ["Ra8#"], hint: "Svart konge er sperret inne av sine egne bønder. Sjekk alle sjakker.", explanation: "Ra8# er matt. Kongen kan ikke flykte fordi bøndene på f7, g7 og h7 står i veien. Sjekk alltid sjakker først!" },
  { id: "h-gaffel", coach: "hikaru", title: "Springergaffel", task: "Hvit i trekket. Vinn dronningen med en gaffel.", fen: "3q3k/6pp/8/4N3/8/8/6PP/6K1 w - - 0 1", accept: ["Nf7+"], hint: "Finn en springersjakk som også angriper noe annet verdifullt.", explanation: "Nf7+ gir sjakk til kongen på h8 og angriper samtidig dronningen på d8. Svart må flytte kongen, og hvit slår dronningen neste trekk." },
  { id: "h-forsvar", coach: "hikaru", title: "Stopp trusselen", task: "Hvit i trekket. Svart truer Ra1 matt. Gi kongen et fluktfelt eller dekk 1. rad.", fen: "r5k1/3R1ppp/8/8/8/8/5PPP/6K1 w - - 0 1", accept: ["h3", "h4", "g3", "g4", "f3", "f4", "Rd1", "Kf1"], hint: "Se på hva svart tårn kan gjøre neste trekk. Hvor kan kongen din gå hvis det kommer sjakk?", explanation: "Svart truer Ra1 matt på baklinjen. Et bondetrekk som h3 gir kongen luft, Rd1 dekker raden, og Kf1 lar kongen gå til e2. Spør alltid: hva truer motstanderen?" },
];

export const exercisesFor = (coach: CoachId) => EXERCISES.filter((e) => e.coach === coach);

const pick = <T,>(list: readonly T[], day: string, offset = 0): T => {
  const n = list.length;
  return list[(((dayNumber(day) + offset) % n) + n) % n]!;
};

export function dailyPlan(coach: CoachId, day: string) {
  const p = PROFILES[coach];
  return { advice: pick(p.advice, day), task: pick(p.tasks, day, 2), motivation: pick(p.motivation, day, 1), focus: pick(p.themes, day), exercise: pick(exercisesFor(coach), day) };
}

/** Returns SAN when the move is legal, plus whether it solves the exercise. */
export function checkMove(ex: Exercise, from: string, to: string): { legal: false } | { legal: true; san: string; correct: boolean; fen: string } {
  const c = new Chess(ex.fen);
  try {
    const m = c.move({ from, to, promotion: "q" });
    return { legal: true, san: m.san, correct: ex.accept.includes(m.san), fen: c.fen() };
  } catch {
    return { legal: false };
  }
}

export const SESSION_XP = 15;

export type SessionRecord = { exercise: boolean; reflection: string; done: boolean; xpGiven: boolean };

/** XP is awarded once per date + profile session; never touches rating. */
export function shouldAwardXp(rec: SessionRecord | undefined): boolean {
  return !!rec && rec.done && !rec.xpGiven;
}
