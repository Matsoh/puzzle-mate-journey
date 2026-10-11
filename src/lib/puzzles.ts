import seed from "@/data/puzzles.json";

/** Lichess puzzle-database format (CC0): FEN is the position BEFORE the opponent's first move;
 *  `moves` are UCI, the first one is the opponent's move, then player/opponent alternate. */
export type Puzzle = {
  id: string;
  fen: string;
  moves: string; // space-separated UCI
  rating: number;
  themes: string[];
  gameUrl?: string;
};

export const PUZZLES: Puzzle[] = seed as Puzzle[];

/**
 * Parse rows from the Lichess puzzle CSV (lichess_db_puzzle.csv):
 * PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
 * Use this to import a larger set later (e.g. a script that writes src/data/puzzles.json).
 */
export function parseLichessCsv(text: string): Puzzle[] {
  const out: Puzzle[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("PuzzleId")) continue;
    const c = line.split(",");
    if (c.length < 8) continue;
    const rating = Number(c[3]);
    if (!c[0] || !c[1] || !c[2] || !Number.isFinite(rating)) continue;
    out.push({ id: c[0], fen: c[1], moves: c[2], rating, themes: c[7].split(" ").filter(Boolean), gameUrl: c[8] || undefined });
  }
  return out;
}

export const THEME_LABELS: Record<string, string> = {
  fork: "Gaffel",
  pin: "Binding",
  skewer: "Spyd",
  mateIn1: "Matt i 1",
  mateIn2: "Matt i 2",
  mateIn3: "Matt i 3",
  mate: "Matt",
  backRankMate: "Baklinjematt",
  smotheredMate: "Kvelningsmatt",
  discoveredAttack: "Avdekket angrep",
  doubleCheck: "Dobbeltsjakk",
  deflection: "Avledning",
  attraction: "Tiltrekning",
  hangingPiece: "Hengende brikke",
  sacrifice: "Offer",
  trappedPiece: "Fanget brikke",
  promotion: "Forvandling",
  advancedPawn: "Fribonde",
  quietMove: "Stille trekk",
  intermezzo: "Mellomtrekk",
  xRayAttack: "Røntgenangrep",
  kingsideAttack: "Kongeangrep",
  queensideAttack: "Dronningfløyangrep",
  exposedKing: "Utsatt konge",
  defensiveMove: "Forsvarstrekk",
  clearance: "Rydding",
  interference: "Avskjæring",
  capturingDefender: "Slå forsvareren",
  endgame: "Sluttspill",
  middlegame: "Midtspill",
  opening: "Åpning",
  rookEndgame: "Tårnsluttspill",
  pawnEndgame: "Bondesluttspill",
  crushing: "Knusende",
  advantage: "Fordel",
};

const PRIORITY = ["mateIn1", "mateIn2", "mateIn3", "fork", "pin", "skewer", "discoveredAttack", "doubleCheck", "deflection", "attraction", "sacrifice", "hangingPiece", "trappedPiece", "promotion", "backRankMate", "endgame"];

export function themeLabels(p: Puzzle, max = 2): string[] {
  const sorted = [...p.themes].sort((a, b) => {
    const ia = PRIORITY.indexOf(a);
    const ib = PRIORITY.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return sorted.filter((t) => THEME_LABELS[t]).slice(0, max).map((t) => THEME_LABELS[t]);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Pick 5 puzzles near the player's rating, preferring unseen ones and varied themes. Deterministic per day. */
export function pickDaily(all: Puzzle[], rating: number, seen: string[], day: string, count = 5): string[] {
  const seenSet = new Set(seen);
  let pool = all.filter((p) => !seenSet.has(p.id));
  if (pool.length < count * 2) pool = all;
  const ranked = [...pool]
    .map((p) => ({ p, score: Math.abs(p.rating - rating) + (hash(day + p.id) % 120) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count * 4)
    .map((x) => x.p);
  const picked: Puzzle[] = [];
  const usedThemes = new Set<string>();
  for (const p of ranked) {
    if (picked.length >= count) break;
    const main = themeLabels(p, 1)[0] ?? "";
    if (usedThemes.has(main)) continue;
    usedThemes.add(main);
    picked.push(p);
  }
  for (const p of ranked) {
    if (picked.length >= count) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return picked.sort((a, b) => a.rating - b.rating).map((p) => p.id);
}

export function getPuzzle(id: string): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id);
}
