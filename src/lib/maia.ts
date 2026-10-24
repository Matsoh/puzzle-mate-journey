// Maia 3 — a neural network trained on millions of human games that predicts
// what a player of a given rating would play. We use it as the bots' brain so
// a "1600" opponent makes 1600-style decisions and mistakes, instead of a
// handicapped Stockfish. Pure encoding here (tested); inference in a worker.
import { Chess } from "chess.js";
import { useSyncExternalStore } from "react";

export const MAIA_MODEL_URL = "/maia3/maia3_simplified.onnx";
export const MAIA_VERSION = "maia3-simplified-1";
export const MAIA_MIN_ELO = 1100;
export const MAIA_MAX_ELO = 2000;

// ---- Move vocabulary (4352): all from→to pairs, then white promotions a7–h7 → a8–h8 × q,r,b,n.
const FILES = "abcdefgh";
const SQUARES: string[] = [];
for (let r = 1; r <= 8; r++) for (const f of FILES) SQUARES.push(f + r);
export const MOVE_INDEX: Record<string, number> = {};
export const INDEX_MOVE: string[] = [];
for (const a of SQUARES) for (const b of SQUARES) { MOVE_INDEX[a + b] = INDEX_MOVE.length; INDEX_MOVE.push(a + b); }
for (const f of FILES) for (const t of FILES) for (const p of "qrbn") { const m = `${f}7${t}8${p}`; MOVE_INDEX[m] = INDEX_MOVE.length; INDEX_MOVE.push(m); }
export const VOCAB_SIZE = INDEX_MOVE.length; // 4352

// ---- Mirroring: the net always sees the side to move as White.
const mirrorSquare = (s: string) => s[0]! + (9 - Number(s[1]));
export const mirrorMove = (u: string) => mirrorSquare(u.slice(0, 2)) + mirrorSquare(u.slice(2, 4)) + u.slice(4);
export function mirrorFen(fen: string): string {
  const [pos, color, castling, ep, half, full] = fen.split(" ");
  const swap = (c: string) => (c >= "a" && c <= "z" ? c.toUpperCase() : c >= "A" && c <= "Z" ? c.toLowerCase() : c);
  const ranks = pos!.split("/").reverse().map((r) => [...r].map(swap).join(""));
  const cs = castling === "-" ? "-" : ["K", "Q", "k", "q"].filter((c) => castling!.includes(swap(c))).join("") || "-";
  return `${ranks.join("/")} ${color === "w" ? "b" : "w"} ${cs} ${ep === "-" ? "-" : mirrorSquare(ep!)} ${half} ${full}`;
}

const PIECES = "PNBRQKpnbrqk";
/** (64, 12) one-hot tokens, square index = rank*8+file from White's view. */
export function boardTokens(fen: string): Float32Array {
  const t = new Float32Array(64 * 12);
  const rows = fen.split(" ")[0]!.split("/");
  for (let i = 0; i < 8; i++) {
    const rank = 7 - i;
    let file = 0;
    for (const ch of rows[i]!) {
      const n = Number(ch);
      if (Number.isNaN(n)) { t[(rank * 8 + file) * 12 + PIECES.indexOf(ch)] = 1; file++; } else file += n;
    }
  }
  return t;
}

export type Encoded = { tokens: Float32Array; legal: { uci: string; index: number }[]; mirrored: boolean };
/** Encode a position for the net and list legal moves in the net's (White) frame. */
export function encode(fen: string): Encoded {
  const mirrored = fen.split(" ")[1] === "b";
  const f = mirrored ? mirrorFen(fen) : fen;
  const c = new Chess(f);
  const legal = c.moves({ verbose: true }).map((m) => { const uci = m.from + m.to + (m.promotion ?? ""); return { uci, index: MOVE_INDEX[uci]! }; }).filter((m) => m.index !== undefined);
  return { tokens: boardTokens(f), legal, mirrored };
}

/** Softmax over legal moves → probabilities in the real board frame, sorted desc. */
export function policyFromLogits(enc: Encoded, logits: Float32Array): { uci: string; p: number }[] {
  const max = Math.max(...enc.legal.map((m) => logits[m.index]!));
  const exps = enc.legal.map((m) => Math.exp(logits[m.index]! - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return enc.legal.map((m, i) => ({ uci: enc.mirrored ? mirrorMove(m.uci) : m.uci, p: exps[i]! / sum })).sort((a, b) => b.p - a.p);
}

/**
 * Pick a move like a human: sample from the top candidates. Weaker ratings get
 * a flatter distribution (more "random" human errors), stronger ones stick closer
 * to the most likely move. Pure, rng injectable.
 */
export function sampleHumanMove(policy: { uci: string; p: number }[], elo: number, rng: () => number = Math.random): string {
  if (!policy.length) throw new Error("no moves");
  const skill = Math.max(0, Math.min(1, (elo - 1200) / 800));
  const temp = 1.15 - 0.45 * skill; // 1.15 at 1200 → 0.7 at 2000
  const top = policy.slice(0, 6).filter((m) => m.p >= policy[0]!.p * 0.02);
  const w = top.map((m) => Math.pow(m.p, 1 / temp));
  if (top[0]!.p >= 0.6) w[0] = w[0]! * 2.5; // an obvious move stays obvious at every rating
  const sum = w.reduce((a, b) => a + b, 0);
  let r = rng() * sum;
  for (let i = 0; i < top.length; i++) { r -= w[i]!; if (r <= 0) return top[i]!.uci; }
  return top[top.length - 1]!.uci;
}

export const clampElo = (e: number) => Math.max(MAIA_MIN_ELO, Math.min(MAIA_MAX_ELO, Math.round(e)));

// ---- Runtime client (browser only) ---------------------------------------------

export type MaiaStatus = "idle" | "loading" | "missing" | "downloading" | "ready" | "error";
let status: MaiaStatus = "idle";
let progress = 0;
let worker: Worker | null = null;
const pending = new Map<number, { resolve: (v: { logits: Float32Array; wdl: Float32Array }) => void; reject: (e: Error) => void }>();
let nextId = 1;
const listeners = new Set<() => void>();
const IDLE = { status: "idle" as MaiaStatus, progress: 0 };
let snap = IDLE;
const set = (s: MaiaStatus, p = progress) => { status = s; progress = p; snap = { status, progress }; listeners.forEach((l) => l()); };

export function maiaInit() {
  if (worker || typeof Worker === "undefined") return;
  try {
    worker = new Worker("/maia-worker.js");
  } catch { set("error"); return; }
  set("loading");
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data as { type: string; status?: MaiaStatus; progress?: number; id?: number; logits?: ArrayBuffer; wdl?: ArrayBuffer; message?: string };
    if (m.type === "status") set(m.status!, m.progress ?? (m.status === "ready" ? 100 : progress));
    else if (m.type === "result") { const p = pending.get(m.id!); if (p) { pending.delete(m.id!); p.resolve({ logits: new Float32Array(m.logits!), wdl: new Float32Array(m.wdl!) }); } }
    else if (m.type === "error") { if (m.id !== undefined) { const p = pending.get(m.id); if (p) { pending.delete(m.id); p.reject(new Error(m.message)); } } else set("error"); }
  };
  worker.onerror = () => set("error");
  worker.postMessage({ type: "init", modelUrl: MAIA_MODEL_URL, version: MAIA_VERSION });
}

export function maiaDownload() {
  if (!worker) maiaInit();
  if (worker && (status === "missing" || status === "error")) worker.postMessage({ type: "download" });
}

export const maiaReady = () => status === "ready";
export function useMaiaStatus(): { status: MaiaStatus; progress: number } {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => snap, () => IDLE);
}

/** Human-like move for the side to move. Throws when the model isn't ready. */
export async function maiaMove(fen: string, botElo: number, oppElo: number, rng: () => number = Math.random): Promise<{ uci: string; policy: { uci: string; p: number }[] }> {
  if (!worker || status !== "ready") throw new Error("maia not ready");
  const enc = encode(fen);
  if (!enc.legal.length) throw new Error("no legal moves");
  const id = nextId++;
  const res = await new Promise<{ logits: Float32Array; wdl: Float32Array }>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const tokens = enc.tokens;
    worker!.postMessage({ type: "infer", id, tokens: tokens.buffer, eloSelf: clampElo(botElo), eloOppo: clampElo(oppElo) }, [tokens.buffer]);
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error("maia timeout")); } }, 20_000);
  });
  const policy = policyFromLogits(enc, res.logits);
  return { uci: sampleHumanMove(policy, botElo, rng), policy };
}
