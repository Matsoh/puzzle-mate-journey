import { Chess, type Move, type Square } from "chess.js";
import type { AnalysisResult, StockfishEngine } from "./engine";
import { getRephraser } from "./coach-hooks";
import { OPENINGS } from "@/data/openings";

export type PlayedMove = { fenBefore: string; uci: string; san: string; color: "w" | "b" };

export type MistakeFacts = {
  playedSan: string;
  bestSan: string;
  evalBefore: number; // pawns, player's perspective
  evalAfter: number;
  lossPct: number; // drop in win chance (percentage points)
  severity: "tabbe" | "feil" | "unøyaktighet";
  missedMateIn?: number;
  allowedMateIn?: number;
  replySan?: string | undefined; // opponent's best reply after the played move
  replyCaptures?: string | undefined; // piece name captured by that reply
  replyCapturesMovedPiece?: boolean;
  bestCaptures?: string | undefined;
  pvSan: string[];
};

export type Mistake = {
  ply: number;
  moveNumber: number;
  fenBefore: string;
  playedUci: string;
  bestUci: string;
  pvUci: string[];
  facts: MistakeFacts;
  text: string;
};

const PIECE: Record<string, string> = { p: "bonden", n: "springeren", b: "løperen", r: "tårnet", q: "dronningen", k: "kongen" };
const MATE = 10000;

function toWhiteCp(r: AnalysisResult, fen: string): number {
  const stm = fen.split(" ")[1];
  let v: number;
  if (r.mate !== undefined) v = r.mate > 0 ? MATE - r.mate * 10 : -MATE - r.mate * 10;
  else v = r.cp ?? 0;
  return stm === "w" ? v : -v;
}

export function winPct(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

function uciToMove(fen: string, uci: string): Move | null {
  try {
    const c = new Chess(fen);
    return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || "q" });
  } catch {
    return null;
  }
}

function pvToSan(fen: string, pv: string[], max = 5): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of pv.slice(0, max)) {
    try {
      out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || "q" }).san);
    } catch {
      break;
    }
  }
  return out;
}

const fmt = (p: number) => (Math.abs(p) >= 50 ? (p > 0 ? "vinnende (matt)" : "tapende (matt)") : `${p > 0 ? "+" : ""}${p.toFixed(1)}`);

export function explain(f: MistakeFacts): string {
  let main: string;
  if (f.missedMateIn) {
    main = `Du hadde matt i ${f.missedMateIn}! Med ${f.bestSan} kunne du avsluttet partiet. Se alltid etter sjakker først!`;
  } else if (f.allowedMateIn) {
    main = `Au! Etter ${f.playedSan} har motstanderen matt i ${f.allowedMateIn}${f.replySan ? `, som starter med ${f.replySan}` : ""}. Bedre var ${f.bestSan}.`;
  } else if (f.replyCapturesMovedPiece && f.replyCaptures) {
    main = `Etter ${f.playedSan} kan ${f.replyCaptures} bare tas med ${f.replySan}. Spør deg selv: «Er brikken trygg der jeg setter den?» Bedre var ${f.bestSan}.`;
  } else if (f.replyCaptures && f.replySan) {
    main = `Etter ${f.playedSan} kan motstanderen slå ${f.replyCaptures} med ${f.replySan}. ${f.bestSan} var sterkere.`;
  } else if (f.bestCaptures) {
    main = `Her gikk du glipp av en sjanse! ${f.bestSan} slår ${f.bestCaptures}. Se etter brikker som står ubeskyttet!`;
  } else {
    main = `${f.playedSan} var ikke det beste. Stockfish mener ${f.bestSan} var mye bedre.`;
  }
  const evalLine = `Stillingen gikk fra ${fmt(f.evalBefore)} til ${fmt(f.evalAfter)} (sett fra deg).`;
  const plan = f.pvSan.length > 1 ? ` Beste fortsettelse: ${f.pvSan.join(" ")}.` : "";
  return `${main} ${evalLine}${plan}`;
}

export async function analyseGame(
  engine: StockfishEngine,
  moves: PlayedMove[],
  finalFen: string,
  player: "w" | "b",
  onProgress?: (done: number, total: number) => void,
  depth = 11,
): Promise<Mistake[]> {
  await engine.setStrength(null);
  const fens = [...moves.map((m) => m.fenBefore), finalFen];
  const results: (AnalysisResult | null)[] = [];
  const evals: number[] = [];
  for (let i = 0; i < fens.length; i++) {
    const fi = fens[i]!;
    const c = new Chess(fi);
    if (c.isGameOver()) {
      results.push(null);
      evals.push(c.isCheckmate() ? (c.turn() === "w" ? -MATE : MATE) : 0);
    } else {
      const r = await engine.analyse(fi, depth);
      results.push(r);
      evals.push(toWhiteCp(r, fi));
    }
    onProgress?.(i + 1, fens.length);
  }

  const sign = player === "w" ? 1 : -1;
  const candidates: Mistake[] = [];
  moves.forEach((m, i) => {
    if (m.color !== player) return;
    const before = results[i];
    if (!before || before.bestMove === m.uci) return;
    const pBefore = sign * evals[i]!;
    const pAfter = sign * evals[i + 1]!;
    const lossPct = winPct(pBefore) - winPct(pAfter);
    if (lossPct < 7) return;
    const best = uciToMove(m.fenBefore, before.bestMove);
    if (!best) return;
    const after = results[i + 1];
    const reply = after ? uciToMove(fens[i + 1]!, after.bestMove) : null;
    const facts: MistakeFacts = {
      playedSan: m.san,
      bestSan: best.san,
      evalBefore: pBefore / 100,
      evalAfter: pAfter / 100,
      lossPct,
      severity: lossPct >= 20 ? "tabbe" : lossPct >= 12 ? "feil" : "unøyaktighet",
      pvSan: pvToSan(m.fenBefore, before.pv),
    };
    if (before.mate !== undefined && before.mate > 0) facts.missedMateIn = before.mate;
    if (after?.mate !== undefined && after.mate > 0) facts.allowedMateIn = after.mate;
    if (reply) {
      facts.replySan = reply.san;
      if (reply.captured) {
        facts.replyCaptures = PIECE[reply.captured];
        facts.replyCapturesMovedPiece = reply.to === m.uci.slice(2, 4);
      }
    }
    if (best.captured) facts.bestCaptures = PIECE[best.captured];
    candidates.push({
      ply: i,
      moveNumber: Math.floor(i / 2) + 1,
      fenBefore: m.fenBefore,
      playedUci: m.uci,
      bestUci: before.bestMove,
      pvUci: before.pv,
      facts,
      text: explain(facts),
    });
  });

  const top = candidates.sort((a, b) => b.facts.lossPct - a.facts.lossPct).slice(0, 3).sort((a, b) => a.ply - b.ply);
  const rephraser = getRephraser();
  for (const t of top) t.text = await rephraser.rephrase(t.facts, t.text);
  return top;
}

// ---- Full game review (chess.com-style classification of every move) ----------

export type Classification = "brilliant" | "great" | "best" | "excellent" | "good" | "book" | "inaccuracy" | "mistake" | "miss" | "blunder";

export type ReviewMove = {
  ply: number;
  moveNumber: number;
  color: "w" | "b";
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  /** White-perspective centipawns (mate = ±10000-ish). */
  evalBefore: number;
  evalAfter: number;
  mateAfter?: number | undefined;
  bestUci: string;
  bestSan: string;
  pvSan: string[];
  /** Win-chance lost by the mover, percentage points (≥0). */
  lossPct: number;
  cls: Classification;
};

export type GameReview = {
  moves: ReviewMove[];
  mistakes: Mistake[];
  accuracy: { w: number; b: number };
  counts: { w: Record<Classification, number>; b: Record<Classification, number> };
};

export const CLASS_LABEL: Record<Classification, string> = {
  brilliant: "Briljant", great: "Flott", best: "Best", excellent: "Utmerket", good: "Bra", book: "Teori",
  inaccuracy: "Unøyaktig", mistake: "Feil", miss: "Bom", blunder: "Tabbe",
};
export const CLASS_SYMBOL: Record<Classification, string> = {
  brilliant: "!!", great: "!", best: "★", excellent: "✓", good: "✓", book: "📖", inaccuracy: "?!", mistake: "?", miss: "✕", blunder: "??",
};

/** Lichess-style accuracy from a single move's win-chance loss. */
export function moveAccuracy(lossPct: number): number {
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, lossPct)) - 3.1669));
}

const emptyCounts = (): Record<Classification, number> => ({ brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 });

const PIECE_VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const material = (fen: string, color: "w" | "b") => {
  let s = 0;
  for (const ch of fen.split(" ")[0] ?? "") { const v = PIECE_VAL[ch.toLowerCase()]; if (v === undefined) continue; if ((ch === ch.toUpperCase()) === (color === "w")) s += v; }
  return s;
};

/** Opening-book check: is this SAN sequence a prefix of a known line? */
function makeBook(): Set<string> {
  const set = new Set<string>();
  for (const o of OPENINGS) for (const b of o.branches) for (let i = 1; i <= b.moves.length; i++) set.add(b.moves.slice(0, i).join(" "));
  return set;
}
let BOOK: Set<string> | null = null;

/**
 * Analyse every position once and classify every move for both sides.
 * Classification is from the mover's perspective, based on win-chance loss vs the engine's best move.
 */
export async function reviewGame(
  engine: StockfishEngine,
  moves: PlayedMove[],
  finalFen: string,
  player: "w" | "b",
  onProgress?: (done: number, total: number) => void,
  depth = 11,
): Promise<GameReview> {
  await engine.setStrength(null);
  BOOK ??= makeBook();
  const fens = [...moves.map((m) => m.fenBefore), finalFen];
  const results: (AnalysisResult | null)[] = [];
  const evals: number[] = [];
  for (let i = 0; i < fens.length; i++) {
    const fi = fens[i]!;
    const c = new Chess(fi);
    if (c.isGameOver()) { results.push(null); evals.push(c.isCheckmate() ? (c.turn() === "w" ? -MATE : MATE) : 0); }
    else { const r = await engine.analyse(fi, depth); results.push(r); evals.push(toWhiteCp(r, fi)); }
    onProgress?.(i + 1, fens.length);
  }

  const out: ReviewMove[] = [];
  const counts = { w: emptyCounts(), b: emptyCounts() };
  const acc = { w: [] as number[], b: [] as number[] };
  const sans: string[] = [];
  moves.forEach((m, i) => {
    sans.push(m.san);
    const sign = m.color === "w" ? 1 : -1;
    const before = results[i];
    const after = results[i + 1];
    const pBefore = sign * evals[i]!;
    const pAfter = sign * evals[i + 1]!;
    const lossPct = Math.max(0, winPct(pBefore) - winPct(pAfter));
    const best = before ? uciToMove(m.fenBefore, before.bestMove) : null;
    const isBest = !!before && (before.bestMove === m.uci || lossPct < 0.5);
    const fenAfter = fens[i + 1]!;
    let cls: Classification;
    if (i < 16 && BOOK!.has(sans.join(" "))) cls = "book";
    else if (isBest) {
      // Brilliant: a sacrifice that is still the best move. Great: punishing the opponent's previous mistake.
      const reply = after ? uciToMove(fenAfter, after.bestMove) : null;
      // A real sacrifice: the piece we just moved can be taken by the best reply, we got less back than it is worth, and the position still holds.
      const dest = m.uci.slice(2, 4);
      const movedVal = PIECE_VAL[new Chess(fenAfter).get(dest as Square)?.type ?? "k"] ?? 0;
      const takenVal = material(m.fenBefore, m.color === "w" ? "b" : "w") - material(fenAfter, m.color === "w" ? "b" : "w");
      const gaveMaterial = !!reply?.captured && reply.to === dest && movedVal >= 3 && takenVal < movedVal && winPct(pAfter) >= winPct(pBefore) - 3 && winPct(pBefore) < 95;
      const prev = out[i - 1];
      cls = gaveMaterial ? "brilliant" : prev && (prev.cls === "mistake" || prev.cls === "blunder" || prev.cls === "miss") ? "great" : "best";
    } else if (lossPct < 2) cls = "excellent";
    else if (lossPct < 5) cls = "good";
    else if (lossPct < 10) cls = "inaccuracy";
    else {
      const missed = (before?.mate !== undefined && before.mate > 0 && !(after?.mate !== undefined && after.mate < 0)) || (!!best?.captured && PIECE_VAL[best.captured]! >= 3);
      cls = missed && winPct(pAfter) >= 50 ? "miss" : lossPct < 20 ? "mistake" : "blunder";
    }
    counts[m.color][cls]++;
    if (cls !== "book") acc[m.color].push(moveAccuracy(lossPct));
    out.push({
      ply: i, moveNumber: Math.floor(i / 2) + 1, color: m.color, san: m.san, uci: m.uci, fenBefore: m.fenBefore, fenAfter,
      evalBefore: evals[i]!, evalAfter: evals[i + 1]!, mateAfter: after?.mate, bestUci: before?.bestMove ?? "", bestSan: best?.san ?? "", pvSan: before ? pvToSan(m.fenBefore, before.pv) : [], lossPct, cls,
    });
  });

  // Top learning moments for the player, same shape as before (drill + notebook use these).
  const candidates: Mistake[] = [];
  out.forEach((r, i) => {
    const m = moves[i]!;
    if (m.color !== player || r.lossPct < 7 || !results[i]) return;
    const before = results[i]!;
    const after = results[i + 1];
    const best = uciToMove(m.fenBefore, before.bestMove);
    if (!best) return;
    const reply = after ? uciToMove(fens[i + 1]!, after.bestMove) : null;
    const sign = player === "w" ? 1 : -1;
    const facts: MistakeFacts = {
      playedSan: m.san, bestSan: best.san, evalBefore: (sign * evals[i]!) / 100, evalAfter: (sign * evals[i + 1]!) / 100, lossPct: r.lossPct,
      severity: r.lossPct >= 20 ? "tabbe" : r.lossPct >= 12 ? "feil" : "unøyaktighet", pvSan: r.pvSan,
    };
    if (before.mate !== undefined && before.mate > 0) facts.missedMateIn = before.mate;
    if (after?.mate !== undefined && after.mate > 0) facts.allowedMateIn = after.mate;
    if (reply) { facts.replySan = reply.san; if (reply.captured) { facts.replyCaptures = PIECE[reply.captured]; facts.replyCapturesMovedPiece = reply.to === m.uci.slice(2, 4); } }
    if (best.captured) facts.bestCaptures = PIECE[best.captured];
    candidates.push({ ply: i, moveNumber: r.moveNumber, fenBefore: m.fenBefore, playedUci: m.uci, bestUci: before.bestMove, pvUci: before.pv, facts, text: explain(facts) });
  });
  const mistakes = candidates.sort((a, b) => b.facts.lossPct - a.facts.lossPct).slice(0, 3).sort((a, b) => a.ply - b.ply);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 100);
  return { moves: out, mistakes, accuracy: { w: avg(acc.w), b: avg(acc.b) }, counts };
}
