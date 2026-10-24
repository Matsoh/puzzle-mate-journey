// Mike at the board, in training and on tournament day. Pure helpers:
// deterministic reactions (no LLM needed), context blocks for the cloud brain,
// and the per-mode rules that keep him fair (no move hints mid-game).
import { Chess } from "chess.js";
import type { MikeLine } from "./mike";
import type { Mistake, PlayedMove } from "./coach";
import type { Opponent } from "./opponents";
import type { Round, Tournament } from "./tournament";
import { score, formatPoints } from "./tournament";

export type MikeMode = "game" | "training" | "review" | "tournament" | "trainer";

export const MODE_RULES: Record<MikeMode, string> = {
  game: "MODE: Tobias is playing a rated game against a bot RIGHT NOW. Never suggest or hint at a specific move, square or piece to play. You may remind him of general habits (checks, captures, threats; king safety; take your time), react to what just happened, and keep him calm and focused. Short.",
  training: "MODE: Training game with help allowed. You may give hints and explain ideas, but prefer questions and principles over spelling out the move. If the context contains an engine suggestion, you may explain it.",
  review: "MODE: The game is over and analysed. The context contains the engine's facts about the key moments; comment on them honestly and kindly, celebrate what went well, pick one thing to practise. Never invent moves that are not in the facts.",
  tournament: "MODE: Real tournament day at the chess club. You are his corner coach between rounds: calm, warm, funny. Focus on routine (water, walk, reset), one process goal, and letting the last game go. Never talk about rating or results as pressure.",
  trainer: "MODE: Daily training session with his virtual trainer profile (Magnus-inspired or Hikaru-inspired). You are the hype man next to the trainer: keep it light, relate the exercise to real games.",
};

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Material balance from `player`'s point of view, in pawns. */
export function materialBalance(fen: string, player: "w" | "b"): number {
  const board = fen.split(" ")[0] ?? "";
  let white = 0, black = 0;
  for (const ch of board) {
    const v = PIECE_VALUE[ch.toLowerCase()];
    if (v === undefined) continue;
    if (ch === ch.toUpperCase()) white += v; else black += v;
  }
  return player === "w" ? white - black : black - white;
}

function pick<T>(list: readonly T[], seed: number): T { return list[Math.abs(seed) % list.length]!; }

export type GameSnapshot = {
  fen: string;
  moves: PlayedMove[];
  player: "w" | "b";
  opponent?: Opponent | undefined;
  myClockMs?: number | null | undefined;
};

/** Deterministic in-game reaction to the latest move. Returns null when Mike has nothing to say. */
export function gameReaction(s: GameSnapshot): MikeLine | null {
  const n = s.moves.length;
  if (n === 0) return { text: s.player === "w" ? "Your move. Centre, develop, castle. The usual." : "They start. Watch what they're up to before you reply.", mood: "chill" };
  const last = s.moves[n - 1]!;
  const mine = last.color === s.player;
  const chess = new Chess(s.fen);
  const mat = materialBalance(s.fen, s.player);
  const seed = n * 7 + s.fen.length;

  if (chess.isCheckmate()) return null; // the result screen handles it
  if (chess.inCheck() && chess.turn() === s.player) return { text: pick(["Check. Don't panic, just find the calm way out.", "You're in check. Three options: move, block, capture. Pick the boring one."], seed), mood: "shock" };
  if (s.myClockMs != null && s.myClockMs < 30_000 && s.myClockMs > 0) return { text: "Clock. Simple moves now, no heroics.", mood: "shock" };
  if (mat >= 5 && mine) return { text: pick(["You're way up. Trade pieces, not pawns. Keep it boring.", "Big lead. The only way to lose now is to get creative. Don't."], seed), mood: "happy" };
  if (mat <= -5 && !mine) return { text: pick(["Down material. Fine. Complicate, make them think, no resigning.", "They're ahead. Your job: make the next ten moves annoying for them."], seed), mood: "think" };
  if (last.san.includes("x") && mine) return { text: pick(["Nice grab. Now check what it costs you.", "Took it. Before you relax: what's their best reply?", "Capture. I approve. Mostly."], seed), mood: "happy" };
  if (last.san.includes("x") && !mine) return { text: pick(["They took something. Can you take back? Can you do better than taking back?", "Ouch or fine? Count it before you decide."], seed), mood: "think" };
  if (last.san.includes("+") && mine) return { text: "Check. Good. Does it actually lead somewhere, or just feel nice?", mood: "chill" };
  if (last.san.startsWith("O-O") && mine) return { text: "Castled. King's safe. Now go do something with that.", mood: "chill" };
  if (n === 10) return { text: "Opening's done. Where are your worst-placed pieces? Fix one.", mood: "think" };
  if (n === 30) return { text: "Move 15. Middlegame. Find a plan, not just a move.", mood: "chill" };
  if (n === 60) return { text: "Long game. Still here. Still watching. Still one eye.", mood: "chill" };
  if (mat >= 2 && mine && n % 6 === 0) return { text: "You're ahead. Keep trading, keep calm.", mood: "chill" };
  if (mat <= -2 && mine && n % 6 === 0) return { text: "Slightly behind. Activity beats material when it's close. Find your most active move.", mood: "think" };
  return null;
}

export function introLine(o: Opponent): string {
  const lines: Record<string, string> = {
    pelle: "Pelle. Pushes pawns like it's his job. Let him over-extend, then punish.",
    kaos: "Kaptein Kaos sacrifices everything. Take the material, defend calmly, win the endgame.",
    mia: "Muren Mia. Solid as a brick. Be patient – walls have cracks.",
    leo: "Lynet Leo sees every fork. So should you. Check every capture twice.",
    pling: "Professor Pling plays positions, not tricks. Keep your pieces active and don't drift.",
    dina: "Dronning Dina loves her queen. Trade it off and watch her mood drop.",
    sigurd: "Sluttspill-Sigurd wants an endgame. Don't give him a quiet one.",
    nora: "Ninja Nora sets traps. If a move looks free, it isn't.",
    ivar: "Isdragen Ivar calculates. Make it messy – calculation hates mess.",
    storm: "Stormkongen. The final boss. You've beaten nine. He's just number ten.",
  };
  return lines[o.id] ?? `${o.name}. ${o.style}. You've got this.`;
}

export function gameContext(s: GameSnapshot & { tc?: string | undefined }): string {
  const chess = new Chess(s.fen);
  const san = s.moves.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m.san}` : m.san)).join(" ");
  return [
    `Live game. Tobias plays ${s.player === "w" ? "White" : "Black"}${s.opponent ? ` against ${s.opponent.name} (${s.opponent.elo}, ${s.opponent.style})` : ""}${s.tc ? `, time control ${s.tc}` : ""}.`,
    `Moves so far: ${san || "(none)"}.`,
    `Position (FEN): ${s.fen}. Side to move: ${chess.turn() === s.player ? "Tobias" : "opponent"}. ${chess.inCheck() ? "Tobias is in check. " : ""}`,
    `Material balance for Tobias: ${materialBalance(s.fen, s.player) >= 0 ? "+" : ""}${materialBalance(s.fen, s.player)} pawns.`,
    s.myClockMs != null ? `Tobias has ${Math.round(s.myClockMs / 1000)} seconds left.` : "",
  ].filter(Boolean).join("\n");
}

export function reviewContext(mistakes: Mistake[], outcome: "win" | "draw" | "loss", opponent?: Opponent | undefined): string {
  const top = [...mistakes].sort((a, b) => b.facts.lossPct - a.facts.lossPct).slice(0, 3);
  return [
    `Game over: Tobias ${outcome === "win" ? "won" : outcome === "draw" ? "drew" : "lost"}${opponent ? ` against ${opponent.name} (${opponent.elo})` : ""}.`,
    top.length ? "Engine facts about the key moments (Stockfish):" : "The engine found no big mistakes.",
    ...top.map((m) => `- Move ${m.moveNumber}: played ${m.facts.playedSan}, engine preferred ${m.facts.bestSan} (${m.facts.severity}, cost about ${Math.round(m.facts.lossPct)} percentage points of win chance${m.facts.missedMateIn ? `, missed mate in ${m.facts.missedMateIn}` : ""}${m.facts.allowedMateIn ? `, allowed mate in ${m.facts.allowedMateIn}` : ""}${m.facts.replyCaptures ? `, after which the opponent could capture the ${m.facts.replyCaptures}` : ""}).`),
  ].join("\n");
}

export function reviewLine(mistakes: Mistake[], outcome: "win" | "draw" | "loss"): MikeLine {
  const worst = [...mistakes].sort((a, b) => b.facts.lossPct - a.facts.lossPct)[0];
  if (outcome === "win") return { text: worst ? `Won. And move ${worst.moveNumber} nearly gave me a heart attack. Let's look at it.` : "Won, and the engine found nothing to complain about. Rare. Enjoy it.", mood: "happy" };
  if (outcome === "draw") return { text: worst ? `Draw. Move ${worst.moveNumber} is where the full point was hiding.` : "Clean draw. Nothing to fix, just more of the same.", mood: "chill" };
  return { text: worst ? `Lost. Not on move 1, not on move 40 – on move ${worst.moveNumber}. That's the only one we care about.` : "Lost without a real mistake. That happens. They were just stronger today.", mood: "think" };
}

// ---- Tournament day --------------------------------------------------------

export function tournamentContext(t: Tournament): string {
  const { points, played } = score(t);
  const rounds = t.rounds.map((r, i) => `R${i + 1}: ${r.status}${r.result ? ` ${r.result}` : ""}${r.feeling ? ` (felt ${r.feeling})` : ""}${r.goal ? ` goal "${r.goal}"` : ""}`).join("; ");
  return [
    `Tournament "${t.setup.name}", ${t.setup.rounds} rounds, ${t.setup.minutes}+${t.setup.increment}. Score ${formatPoints(points)} of ${played} played.`,
    `Rounds: ${rounds}.`,
    t.prep.whiteOpening || t.prep.vsE4 || t.prep.vsD4 ? `Prepared openings: white ${t.prep.whiteOpening || "–"}, vs e4 ${t.prep.vsE4 || "–"}, vs d4 ${t.prep.vsD4 || "–"}.` : "",
  ].filter(Boolean).join("\n");
}

export function tournamentLine(t: Tournament, r: Round | undefined, i: number): MikeLine {
  const { points, played } = score(t);
  const last = [...t.rounds].reverse().find((x) => x.status === "done" && x.result);
  if (r?.status === "playing") return { text: "You're at the board. I'm not. Breathe, sit on your hands, and enjoy it.", mood: "chill" };
  if (played === 0) return { text: `Round 1 of ${t.setup.rounds}. Nobody's won anything yet. Water, a walk, and one goal for the game.`, mood: "chill" };
  if (last?.result === "win") return { text: `Won the last one. Great. Now forget it – round ${i + 1} doesn't know.`, mood: "happy" };
  if (last?.result === "loss") return { text: `Lost the last one. Everybody at the club has. Walk, water, reset. Round ${i + 1} is a new game.`, mood: "think" };
  if (last?.result === "draw") return { text: `Draw. Solid. ${formatPoints(points)} points so far. Keep the routine.`, mood: "chill" };
  if (played >= t.setup.rounds) return { text: `${formatPoints(points)} of ${t.setup.rounds}. Day's done. Whatever the number, you showed up and played. That's the whole job.`, mood: "happy" };
  return { text: `${formatPoints(points)} points, round ${i + 1} next. One goal, one game.`, mood: "chill" };
}
