// Every game Tobias plays in the app (bots, training, friends) lands in the
// same archive as imported chess.com/Lichess games, so one list and one
// review screen cover everything — like the chess.com game archive.
import { Chess } from "chess.js";
import { mergeGames, type ImportedGame, type Source } from "./games-import";
import type { Progress } from "./progress";
import { dayKey } from "./rules";

export type AppGameInput = {
  id: string;
  source: Extract<Source, "app" | "venn">;
  opponent: string;
  opponentRating: number | null;
  player: "w" | "b";
  result: "win" | "draw" | "loss";
  /** SAN moves. */
  moves: string[];
  timeClass: string;
  playedAt?: number;
};

export function withAppGame(p: Progress, g: AppGameInput): Progress {
  if (g.moves.length < 2) return p;
  const playedAt = g.playedAt ?? Date.now();
  const rec: ImportedGame = { id: g.id, source: g.source, playedAt, day: dayKey(new Date(playedAt)), player: g.player, opponent: g.opponent, opponentRating: g.opponentRating, result: g.result, timeClass: g.timeClass, moves: g.moves, url: "" };
  return { ...p, importedGames: mergeGames(p.importedGames ?? [], [rec]) };
}

/** Final position of a stored game (null when the SAN list does not replay). */
export function finalFen(moves: string[]): string | null {
  const c = new Chess();
  try { for (const m of moves) c.move(m); } catch { return null; }
  return c.fen();
}

export const RESULT_LABEL = { win: "Seier", draw: "Remis", loss: "Tap" } as const;

/** Time-control label from milliseconds, e.g. 600000/0 → "10+0". */
export function tcClass(initialMs: number, incMs: number): string {
  const min = initialMs / 60_000;
  if (min < 3) return "bullet";
  if (min < 10) return "blitz";
  if (min < 30) return "rapid";
  return incMs > 0 || min >= 30 ? "classical" : "rapid";
}
