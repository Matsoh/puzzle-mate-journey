// Premoves, chess.com-style but with an unlimited queue: while the opponent
// thinks, Tobias stacks up moves; each turn the first one fires if it is legal.
import { Chess, type Square } from "chess.js";

export type Premove = { from: string; to: string };

/** Pieces of `color` that may be premoved from `from` given earlier queued moves (a piece can move twice). */
export function canPremoveFrom(fen: string, color: "w" | "b", queue: Premove[], from: string): boolean {
  if (queue.some((q) => q.to === from)) return true;
  if (queue.some((q) => q.from === from) && !queue.some((q) => q.to === from)) return false; // already left
  const p = new Chess(fen).get(from as Square);
  return !!p && p.color === color;
}

/** First queued move if it is legal now; null means the queue must be cleared. */
export function nextPremove(fen: string, queue: Premove[]): { move: Premove; promotion: string | undefined; rest: Premove[] } | null {
  const first = queue[0];
  if (!first) return null;
  const c = new Chess(fen);
  const legal = c.moves({ verbose: true }).find((m) => m.from === first.from && m.to === first.to);
  if (!legal) return null;
  return { move: first, promotion: legal.promotion ? "q" : undefined, rest: queue.slice(1) };
}

/** Squares to highlight for the queue (both ends of every queued move). */
export function premoveSquares(queue: Premove[]): string[] {
  return [...new Set(queue.flatMap((q) => [q.from, q.to]))];
}
