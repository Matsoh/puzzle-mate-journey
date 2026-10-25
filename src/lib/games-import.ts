// Import Tobias's real games from chess.com and Lichess (public APIs, no login),
// so Mike can review what he actually plays. Parsing is pure and tested; the
// two fetchers are thin and only run in the browser.
import { Chess } from "chess.js";
import type { PlayedMove } from "./coach";
import { dayKey } from "./rules";

export type Source = "chesscom" | "lichess" | "app" | "venn";
export type ImportedGame = {
  id: string; // `${source}:${gameId}`
  source: Source;
  playedAt: number; // ms
  day: string; // yyyy-mm-dd (local)
  player: "w" | "b";
  opponent: string;
  opponentRating: number | null;
  result: "win" | "draw" | "loss";
  timeClass: string; // bullet / blitz / rapid / classical / daily
  moves: string[]; // SAN
  url: string;
};

export const MAX_STORED_GAMES = 80;

/** SAN list → PlayedMove[] with FENs (what the analyser needs). Returns null when the moves don't parse. */
export function playedMovesFromSan(sans: string[]): { moves: PlayedMove[]; finalFen: string } | null {
  const c = new Chess();
  const moves: PlayedMove[] = [];
  for (const san of sans) {
    const fenBefore = c.fen();
    let mv;
    try { mv = c.move(san); } catch { return null; }
    moves.push({ fenBefore, uci: mv.from + mv.to + (mv.promotion ?? ""), san: mv.san, color: mv.color });
  }
  return { moves, finalFen: c.fen() };
}

/** Moves (SAN) out of a PGN string; tolerant of clock comments and result tokens. */
export function sansFromPgn(pgn: string): string[] {
  const c = new Chess();
  try {
    c.loadPgn(pgn);
    return c.history();
  } catch {
    // Fallback: strip headers/comments/variations and parse tokens by hand.
    const body = pgn.replace(/\[[^\]]*\]/g, " ").replace(/\{[^}]*\}/g, " ").replace(/\([^)]*\)/g, " ").replace(/\$\d+/g, " ");
    const tokens = body.split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)).map((t) => t.replace(/^\d+\.+/, ""));
    const d = new Chess();
    const out: string[] = [];
    for (const t of tokens) { try { out.push(d.move(t).san); } catch { break; } }
    return out;
  }
}

const norm = (s: string) => s.trim().toLowerCase();

// ---- chess.com ---------------------------------------------------------------

type ChesscomGame = {
  url: string; pgn?: string; end_time: number; time_class: string; rated?: boolean;
  white: { username: string; rating: number; result: string }; black: { username: string; rating: number; result: string };
};

const CC_WIN = new Set(["win"]);
const CC_DRAW = new Set(["agreed", "repetition", "stalemate", "insufficient", "50move", "timevsinsufficient"]);

export function parseChesscomGames(json: { games?: ChesscomGame[] }, username: string): ImportedGame[] {
  const me = norm(username);
  const out: ImportedGame[] = [];
  for (const g of json.games ?? []) {
    if (!g.pgn) continue;
    const isWhite = norm(g.white.username) === me;
    const isBlack = norm(g.black.username) === me;
    if (!isWhite && !isBlack) continue;
    const mine = isWhite ? g.white : g.black;
    const opp = isWhite ? g.black : g.white;
    const result: ImportedGame["result"] = CC_WIN.has(mine.result) ? "win" : CC_DRAW.has(mine.result) ? "draw" : "loss";
    const moves = sansFromPgn(g.pgn);
    if (moves.length < 4) continue;
    const id = g.url.split("/").pop() ?? String(g.end_time);
    out.push({ id: `chesscom:${id}`, source: "chesscom", playedAt: g.end_time * 1000, day: dayKey(new Date(g.end_time * 1000)), player: isWhite ? "w" : "b", opponent: opp.username, opponentRating: opp.rating ?? null, result, timeClass: g.time_class, moves, url: g.url });
  }
  return out;
}

export async function fetchChesscom(username: string, maxGames = 20): Promise<ImportedGame[]> {
  const u = encodeURIComponent(norm(username));
  const arch = (await (await fetch(`https://api.chess.com/pub/player/${u}/games/archives`)).json()) as { archives?: string[] };
  const months = (arch.archives ?? []).slice(-2).reverse();
  const games: ImportedGame[] = [];
  for (const m of months) {
    const json = (await (await fetch(m)).json()) as { games?: ChesscomGame[] };
    games.push(...parseChesscomGames(json, username));
    if (games.length >= maxGames) break;
  }
  return games.sort((a, b) => b.playedAt - a.playedAt).slice(0, maxGames);
}

// ---- Lichess -------------------------------------------------------------------

type LichessGame = {
  id: string; createdAt: number; lastMoveAt?: number; speed: string; winner?: "white" | "black"; moves?: string;
  players: { white: { user?: { name: string }; rating?: number; aiLevel?: number }; black: { user?: { name: string }; rating?: number; aiLevel?: number } };
};

export function parseLichessNdjson(text: string, username: string): ImportedGame[] {
  const me = norm(username);
  const out: ImportedGame[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let g: LichessGame;
    try { g = JSON.parse(line) as LichessGame; } catch { continue; }
    const w = norm(g.players.white.user?.name ?? ""), b = norm(g.players.black.user?.name ?? "");
    const isWhite = w === me, isBlack = b === me;
    if (!isWhite && !isBlack) continue;
    const moves = (g.moves ?? "").split(" ").filter(Boolean);
    if (moves.length < 4) continue;
    const opp = isWhite ? g.players.black : g.players.white;
    const result: ImportedGame["result"] = !g.winner ? "draw" : (g.winner === "white") === isWhite ? "win" : "loss";
    const at = g.lastMoveAt ?? g.createdAt;
    out.push({ id: `lichess:${g.id}`, source: "lichess", playedAt: at, day: dayKey(new Date(at)), player: isWhite ? "w" : "b", opponent: opp.user?.name ?? (opp.aiLevel ? `Stockfish nivå ${opp.aiLevel}` : "Anonym"), opponentRating: opp.rating ?? null, result, timeClass: g.speed, moves, url: `https://lichess.org/${g.id}` });
  }
  return out;
}

export async function fetchLichess(username: string, maxGames = 20): Promise<ImportedGame[]> {
  const u = encodeURIComponent(norm(username));
  const res = await fetch(`https://lichess.org/api/games/user/${u}?max=${maxGames}&moves=true&tags=false&clocks=false&evals=false&opening=false`, { headers: { Accept: "application/x-ndjson" } });
  if (!res.ok) throw new Error(`lichess ${res.status}`);
  return parseLichessNdjson(await res.text(), username);
}

/** Merge new games into the stored list: newest first, no duplicates, capped. */
export function mergeGames(stored: ImportedGame[], incoming: ImportedGame[]): ImportedGame[] {
  const seen = new Set(stored.map((g) => g.id));
  const fresh = incoming.filter((g) => !seen.has(g.id));
  return [...fresh, ...stored].sort((a, b) => b.playedAt - a.playedAt).slice(0, MAX_STORED_GAMES);
}

export const TIME_LABEL: Record<string, string> = { bullet: "Bullet", blitz: "Blitz", rapid: "Hurtig", classical: "Langsjakk", daily: "Daglig", correspondence: "Daglig", ultraBullet: "Bullet", none: "Uten klokke", trening: "Treningsparti" };
export const SOURCE_LABEL: Record<Source, string> = { chesscom: "chess.com", lichess: "Lichess", app: "Bot", venn: "Venn" };
