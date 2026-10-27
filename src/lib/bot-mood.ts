// The bot's face at the board: a deterministic mood from the position and the
// last move, plus a quip per mood and personality. Pure and tested; the
// BotAvatar component only animates what this says.
import { Chess } from "chess.js";
import { materialBalance } from "./mike-game";
import type { PlayedMove } from "./coach";
import type { Opponent } from "./opponents";

export type BotMood = "idle" | "think" | "happy" | "smug" | "angry" | "worried" | "sad" | "win" | "lose" | "draw";

export type BotMoodInput = {
  fen: string;
  moves: PlayedMove[];
  /** The human's colour; the bot has the other one. */
  player: "w" | "b";
  /** Set once the game is over, from the human's view. */
  outcome?: "win" | "draw" | "loss" | null | undefined;
  thinking?: boolean | undefined;
};

export const MOOD_EMOJI: Record<BotMood, string> = { idle: "", think: "🤔", happy: "😄", smug: "😎", angry: "😠", worried: "😰", sad: "😢", win: "🏆", lose: "😭", draw: "🤝" };

/** Pure mood from the bot's point of view. */
export function botMood(s: BotMoodInput): BotMood {
  if (s.outcome === "win") return "lose";
  if (s.outcome === "loss") return "win";
  if (s.outcome === "draw") return "draw";
  const bot = s.player === "w" ? "b" : "w";
  const mat = materialBalance(s.fen, bot); // + = bot ahead
  const last = s.moves[s.moves.length - 1];
  const c = new Chess(s.fen);
  const botToMove = c.turn() === bot;
  if (c.inCheck() && botToMove) return mat <= -3 ? "worried" : "angry";
  if (last && last.color === s.player && last.san.includes("x")) return mat <= -3 ? "sad" : "angry";
  if (last && last.color === bot && last.san.includes("x")) return mat >= 3 ? "smug" : "happy";
  if (mat >= 3) return "smug";
  if (mat <= -5) return "sad";
  if (mat <= -2) return "worried";
  if (s.thinking || botToMove) return "think";
  return "idle";
}

const QUIPS: Record<BotMood, string[]> = {
  idle: ["Ditt trekk.", "Jeg venter.", "Ta den tiden du trenger. Eller ikke."],
  think: ["Hmm …", "La meg tenke …", "Interessant …", "Vent litt …"],
  happy: ["Takk for den!", "Den tar jeg!", "Nam."],
  smug: ["Dette går min vei.", "Slapp av, det går fort.", "Jeg har kontroll nå."],
  angry: ["HEI! Den var min!", "Det der angrer du på.", "Grr … vent bare."],
  worried: ["Oi. Oi oi oi.", "Dette liker jeg ikke.", "Hva skjer her?!"],
  sad: ["Jeg trenger et mirakel.", "Nei, nei, nei …", "Dette går ikke bra."],
  win: ["Bedre lykke neste gang!", "Revansj når du vil.", "Det var gøy – for meg."],
  lose: ["Nei! Hvordan …?", "Du slo meg. Ærlig talt: bra spilt.", "Jeg krever revansj!"],
  draw: ["Remis. Ingen av oss ville gi seg.", "Delt. Neste gang tar jeg deg."],
};

/** Mike talks English – always. */
const MIKE_QUIPS: Record<BotMood, string[]> = {
  idle: ["Your move, champ.", "I'm waiting. One eye, all patience.", "Take your time. I've got all day."],
  think: ["Hmm …", "Let me see …", "Interesting. Very interesting.", "Hold on …"],
  happy: ["Thanks for that.", "Mine now.", "Taught you better than that."],
  smug: ["This is going my way.", "Told you I'd be watching.", "Relax. It's a lesson, not a game."],
  angry: ["HEY! That was mine!", "Okay. Now I'm awake.", "You'll regret that one."],
  worried: ["Wait. Wait wait wait.", "Did you just … huh.", "I don't like this."],
  sad: ["I need a miracle here.", "No no no …", "Who taught you that? Oh. Right."],
  win: ["Good game. Now go fix that mistake on move 12.", "Still the teacher. Rematch whenever.", "Close! Closer than you think."],
  lose: ["You beat ME?!", "I've got nothing left to teach you.", "Okay. That was brilliant."],
  draw: ["A draw. Fair. Next time one of us goes down.", "Split. You're getting dangerous."],
};

/** Personality-flavoured quip, deterministic per (mood, seed). */
export function botQuip(o: Opponent | undefined, mood: BotMood, seed: number): string {
  const list = (o?.id === "mike" ? MIKE_QUIPS : QUIPS)[mood];
  const base = list[Math.abs(seed) % list.length]!;
  if (!o) return base;
  if (mood === "lose") return o.winLine;
  if (mood === "win" && o.id === "storm") return "Jorda er ikke klar for meg ennå. Prøv igjen!";
  if (mood === "angry" && o.id === "pelle") return "Bøndene mine! Det var MINE bønder!";
  if (mood === "smug" && o.id === "dina") return "Jackpot. Som alltid.";
  if (mood === "think" && o.id === "ivar") return "… regner … ti trekk … vent …";
  return base;
}
