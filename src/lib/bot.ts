// The bots' brain: Maia 3 (human-like) when it's loaded and the position isn't a
// simple endgame; Stockfish at UCI_Elo otherwise. One call site for every bot move.
import { getEngine } from "./engine";
import { maiaMove, maiaReady } from "./maia";

export type BotSource = "maia" | "stockfish";

const pieceCount = (fen: string) => (fen.split(" ")[0] ?? "").replace(/[^a-zA-Z]/g, "").length;

/** Maia is a poor technician with few pieces left; let the engine (at the same rating) convert or defend. */
export const ENDGAME_PIECES = 8;

export async function botMove(fen: string, botElo: number, playerElo: number, searchMs: number): Promise<{ uci: string; source: BotSource }> {
  if (maiaReady() && pieceCount(fen) > ENDGAME_PIECES) {
    try {
      const { uci } = await maiaMove(fen, botElo, playerElo);
      return { uci, source: "maia" };
    } catch { /* fall back to the engine */ }
  }
  const uci = await getEngine().bestMove(fen, searchMs);
  return { uci, source: "stockfish" };
}
