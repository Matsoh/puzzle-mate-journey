export type Opponent = {
  id: string;
  name: string;
  elo: number;
  emoji: string;
  hue: number; // used for avatar gradients and 3D boss intro
  style: string;
  line: string;
  winLine: string;
};

export const OPPONENTS: Opponent[] = [
  { id: "pelle", name: "Pelle Pionér", elo: 1500, emoji: "🐣", hue: 140, style: "Bondestormer", line: "Bønder fremover! Alltid! Hele tiden!", winLine: "Oi! Bøndene mine fikk seg en overraskelse!" },
  { id: "kaos", name: "Kaptein Kaos", elo: 1560, emoji: "🏴‍☠️", hue: 20, style: "Vill angriper", line: "Arrr! Jeg ofrer alt for å angripe kongen din!", winLine: "Arrr… du forsvarte deg som en ekte sjørøver." },
  { id: "mia", name: "Muren Mia", elo: 1620, emoji: "🧱", hue: 30, style: "Solid forsvarer", line: "Du kommer aldri gjennom muren min.", winLine: "Hm. Det var visst et hull i muren likevel." },
  { id: "leo", name: "Lynet Leo", elo: 1680, emoji: "⚡", hue: 60, style: "Lynrask taktiker", line: "Gafler, bindinger, spyd – jeg ser alt på et blunk!", winLine: "Du var raskere enn lynet i dag!" },
  { id: "pling", name: "Professor Pling", elo: 1740, emoji: "🦉", hue: 200, style: "Posisjonsspiller", line: "Gode felter vinner partier, unge mann.", winLine: "Utmerket! Du forstod stillingen bedre enn meg." },
  { id: "dina", name: "Dronning Dina", elo: 1800, emoji: "👑", hue: 320, style: "Dronningangriper", line: "Dronningen min er sjefen på brettet.", winLine: "Du tok kronen min… denne gangen." },
  { id: "sigurd", name: "Sluttspill-Sigurd", elo: 1860, emoji: "🐢", hue: 170, style: "Sluttspillsliper", line: "Jeg bytter av alt og vinner sluttspillet. Sakte men sikkert.", winLine: "Du slo meg i sluttspillet?! Imponerende!" },
  { id: "nora", name: "Ninja Nora", elo: 1920, emoji: "🥷", hue: 280, style: "Fellelegger", line: "Du ser ikke fella før det er for sent…", winLine: "Du så gjennom alle fellene mine. Respekt." },
  { id: "ivar", name: "Isdragen Ivar", elo: 1980, emoji: "🐉", hue: 220, style: "Iskald regner", line: "Jeg regner ti trekk frem. Kaldt og presist.", winLine: "Isen smeltet… du er virkelig sterk." },
  { id: "storm", name: "Stormkongen", elo: 2050, emoji: "🌩️", hue: 260, style: "Sluttboss – kan alt", line: "Så du har nådd toppen. Vis meg at du fortjener 2000!", winLine: "DU ER EN 2000-SPILLER! Stormen bøyer seg for deg!" },
];

export function getOpponent(id: string | undefined): Opponent | undefined {
  return OPPONENTS.find((o) => o.id === id);
}

export function isUnlocked(index: number, beaten: string[]): boolean {
  return index === 0 || beaten.includes(OPPONENTS[index - 1]?.id ?? "");
}

/** Stockfish's UCI_Elo scale differs from human ratings; tune here if opponents feel too strong/weak. */
export const ENGINE_ELO_OFFSET = 0;
