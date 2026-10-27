export type Opponent = {
  id: string;
  name: string;
  elo: number;
  emoji: string;
  hue: number; // used for avatar gradients and 3D boss intro
  /** Portrait image under public/ (200×200 PNG with transparent background). */
  portrait: string;
  style: string;
  line: string;
  winLine: string;
  /** Rating is shown as "??" – the player must find out the hard way. */
  secret?: boolean;
  /** "stockfish": never use Maia (human-like) – pure engine at the given rating. */
  brain?: "stockfish";
};

/** What the UI prints as the opponent's rating. */
export const ratingLabel = (o: Opponent): string => (o.secret ? "??" : String(o.elo));

export const OPPONENTS: Opponent[] = [
  { id: "pelle", name: "Neil Down", elo: 1500, emoji: "🧢", hue: 140, portrait: "/bots/1.png", style: "Bondestormer", line: "Bønder fremover! Alltid! Hele tiden!", winLine: "Neil Down? Mer som knocked down. Bra spilt!" },
  { id: "kaos", name: "Bill Board", elo: 1560, emoji: "📢", hue: 20, portrait: "/bots/2.png", style: "Vill angriper", line: "Jeg ofrer alt for å komme til kongen din!", winLine: "Du forsvarte deg som en mur. Respekt." },
  { id: "mia", name: "Chris P. Bacon", elo: 1620, emoji: "🥓", hue: 30, portrait: "/bots/3.png", style: "Solid forsvarer", line: "Du kommer aldri gjennom forsvaret mitt.", winLine: "Hm. Det var visst et hull likevel." },
  { id: "leo", name: "Ida Know", elo: 1680, emoji: "⚡", hue: 60, portrait: "/bots/4.png", style: "Lynrask taktiker", line: "Gafler, bindinger, spyd – jeg ser alt på et blunk!", winLine: "Du var raskere enn meg i dag!" },
  { id: "pling", name: "Hugh Jass", elo: 1740, emoji: "🧠", hue: 200, portrait: "/bots/5.png", style: "Posisjonsspiller", line: "Gode felter vinner partier, unge mann.", winLine: "Utmerket! Du forstod stillingen bedre enn meg." },
  { id: "dina", name: "Jack Pott", elo: 1800, emoji: "🎰", hue: 320, portrait: "/bots/6.png", style: "Dronningangriper", line: "Dronningen min er sjefen på brettet.", winLine: "Du tok jackpotten denne gangen…" },
  { id: "sigurd", name: "Phil Landers", elo: 1860, emoji: "🐢", hue: 170, portrait: "/bots/7.png", style: "Sluttspillsliper", line: "Jeg bytter av alt og vinner sluttspillet. Sakte men sikkert.", winLine: "Du slo meg i sluttspillet?! Imponerende!" },
  { id: "nora", name: "Heidi Claire", elo: 1920, emoji: "🥷", hue: 280, portrait: "/bots/8.png", style: "Fellelegger", line: "Du ser ikke fella før det er for sent…", winLine: "Du så gjennom alle fellene mine. Respekt." },
  { id: "ivar", name: "Robin Banks", elo: 1980, emoji: "🧊", hue: 220, portrait: "/bots/9.png", style: "Iskald regner", line: "Jeg regner ti trekk frem. Kaldt og presist.", winLine: "Isen smeltet… du er virkelig sterk." },
  { id: "storm", name: "ET", elo: 2050, emoji: "👽", hue: 260, portrait: "/bots/10.png", style: "Sluttboss – ikke fra denne planeten", line: "Så du har nådd toppen. Vis meg at du fortjener 2000, jordboer!", winLine: "DU ER EN 2000-SPILLER! ET ringer hjem og forteller om deg." },
  { id: "mike", name: "Mike", elo: 2250, emoji: "🧌", hue: 145, portrait: "/bots/mike.png", secret: true, brain: "stockfish", style: "Treneren selv – den hemmelige sluttbossen", line: "You beat ET? Cute. Now show me what I actually taught you.", winLine: "You beat ME?! I've got nothing left to teach you. Go get that 2000 – I'll be watching." },
];

export function getOpponent(id: string | undefined): Opponent | undefined {
  return OPPONENTS.find((o) => o.id === id);
}

export function isUnlocked(index: number, beaten: string[]): boolean {
  return index === 0 || beaten.includes(OPPONENTS[index - 1]?.id ?? "");
}

/** Stockfish's UCI_Elo scale differs from human ratings; tune here if opponents feel too strong/weak. */
export const ENGINE_ELO_OFFSET = 0;
