import { Chess, type Move } from "chess.js";
import type { AnalysisResult, StockfishEngine } from "./engine";
import { getRephraser } from "./coach-hooks";

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
  replySan?: string; // opponent's best reply after the played move
  replyCaptures?: string; // piece name captured by that reply
  replyCapturesMovedPiece?: boolean;
  bestCaptures?: string;
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
    const c = new Chess(fens[i]);
    if (c.isGameOver()) {
      results.push(null);
      evals.push(c.isCheckmate() ? (c.turn() === "w" ? -MATE : MATE) : 0);
    } else {
      const r = await engine.analyse(fens[i], depth);
      results.push(r);
      evals.push(toWhiteCp(r, fens[i]));
    }
    onProgress?.(i + 1, fens.length);
  }

  const sign = player === "w" ? 1 : -1;
  const candidates: Mistake[] = [];
  moves.forEach((m, i) => {
    if (m.color !== player) return;
    const before = results[i];
    if (!before || before.bestMove === m.uci) return;
    const pBefore = sign * evals[i];
    const pAfter = sign * evals[i + 1];
    const lossPct = winPct(pBefore) - winPct(pAfter);
    if (lossPct < 7) return;
    const best = uciToMove(m.fenBefore, before.bestMove);
    if (!best) return;
    const after = results[i + 1];
    const reply = after ? uciToMove(fens[i + 1], after.bestMove) : null;
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
