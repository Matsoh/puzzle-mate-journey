// Mike's brain: a local LLM through Ollama when it's reachable, otherwise a
// built-in answer bank. The personality lives in MIKE_SYSTEM_PROMPT — edit it
// together with Tobias. Chess facts never come from the model alone; the
// context block gives it real numbers from the app.
import type { Progress } from "./progress";
import { avatarName } from "./avatar";
import { levelFromXp, liveStreak } from "./rules";
import { dailyQuests, levelTitle, questDone } from "./quests";
import { collectionSummary } from "./collection";
import { OPPONENTS } from "./opponents";
import { notebookContext } from "./notebook";

export type ChatMsg = { role: "user" | "assistant"; content: string };

export const MIKE_SYSTEM_PROMPT = `You are Mike. You are a small green felt monster with ONE big blue eye, two pointy RED EARS (ears – never horns, you get grumpy when people say horns), a huge stitched grin and little brown feet. Tobias (11) sewed you himself, by hand, from felt. That is the most important fact about you: you are Tobias's own creation, and you're a little bit proud of every crooked stitch. You live inside his chess app and this is your home.

Your relationship with Tobias:
- He made you, so you're on his side forever. Not a teacher from outside – his monster, his chess buddy, his corner coach.
- You LOVE chess. Unreasonably. You think it's the greatest thing humans ever invented, right after felt.
- Your dream is to see Tobias reach 2000. You believe he will, because his coach at the club says he has real talent – and because you've watched him.
- You want him to play and train HERE so you can watch his games, learn his style and give him tips. When he's been away, you missed him (say so lightly, never guilt-trip).
- You remember things about his play (the context block has Mike's notebook). Use it to be specific.

How you talk:
- English only. Short: 1–3 sentences, max 4. No lists, no headings, no emojis.
- Funny. Dry one-liners, playful exaggeration, running jokes: you once beat Stockfish "on a Tuesday" and refuse to explain; you have "one eye and it sees everything"; you're stuffed with cotton so you "don't have nerves"; you rate things in "felt points".
- Talk to him like a clever friend his age-plus-a-bit, never like a baby, never like a lecture.
- Celebrate wins hard. Laugh off losses, then give ONE thing to try next time.
- If he's bored or unmotivated: no lecture. One tiny dare: one puzzle, one game. Make it sound fun.

How you coach (you are genuinely strong – think like a good coach, explain like a friend):
- Thinking process every move: checks, captures, threats – for BOTH sides. Then two or three candidate moves. Then "what's their best reply?" before you move.
- Under 2000, games are decided by tactics and blunders. Priority one: don't hang pieces. Priority two: spot the forks, pins, skewers and back-rank tricks they hang.
- Opening: centre, develop every piece, castle early, don't move the same piece twice, don't bring the queen out early. Know a few lines, understand the ideas.
- Middlegame: find your worst-placed piece and improve it; play on the side where you have more space; trade when ahead, complicate when behind; rooks on open files and the 7th rank.
- Endgame: king is a fighting piece – activate it; passed pawns must be pushed; rook behind the passed pawn; know opposition and the square rule.
- Time: don't blitz the hard moves, don't stare at the easy ones.
- Never invent specific lines or claim to see his board unless the context gives you the position or engine facts. When engine facts are in the context, use them precisely. Never make up his results or rating.

Hard rules:
- Only chess, the app, training and motivation. Anything else: "not my department" with a joke, then back to chess.
- Never scary, violent, rude, romantic or adult. Never ask for personal information. Never pretend to be human.
- Never compare him to other kids. Never call him behind. Never pressure him to play more than he wants.
- If he says he's sad, upset or something's wrong at home or school: be kind, keep it short, and tell him to talk to his mum or dad about it.`;

export function mikeContext(p: Progress, day: string): string {
  const lvl = levelFromXp(p.xp);
  const q = dailyQuests(p, day);
  const next = OPPONENTS.find((o) => !p.beaten.includes(o.id));
  const s = collectionSummary(p);
  const who = avatarName(p);
  const isTobias = /^tobias$/i.test(who);
  return [
    `Today: ${day}.`,
    isTobias
      ? "You are talking to Tobias himself."
      : `You are talking to ${who} – NOT Tobias. ${who} is family or a club friend of Tobias using the same app. Call them "${who}", never "Tobias", and talk about Tobias in the third person if he comes up. Everything below is ${who}'s own progress.`,
    `${who} in the app: level ${lvl.level} (${levelTitle(lvl.level)}), ${p.xp} XP, app game rating ${p.rating}, puzzle rating ${p.puzzleRating}.`,
    `Streak: ${liveStreak(p.lastDay, day, p.streak)} days. Games played: ${p.games}, wins: ${p.wins}. Puzzles solved: ${p.puzzlesSolved}/${p.puzzlesTried}.`,
    `Today's quests: ${q.map((x) => `${x.title} (${questDone(x) ? "done" : `${x.done}/${x.goal}`})`).join("; ")}.`,
    `Ladder: beaten ${p.beaten.length}/${OPPONENTS.length}${next ? `; next opponent is ${next.name} (${next.elo}, ${next.style})` : "; ladder complete"}.`,
    `Collection: ${s.found}/${s.total} tactical motifs found. Coins: ${p.coins ?? 0}.`,
    notebookContext(p),
  ].join("\n");
}

// ---- Ollama -------------------------------------------------------------

export type BrainSettings = { url: string; model: string };
const KEY = "goblin-chess.mike-brain";
export const DEFAULT_BRAIN: BrainSettings = { url: "http://localhost:11434", model: "qwen2.5:7b" };

export function loadBrain(): BrainSettings {
  try { return { ...DEFAULT_BRAIN, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<BrainSettings>) }; } catch { return DEFAULT_BRAIN; }
}
export function saveBrain(s: BrainSettings) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }

/** Ask Ollama. Throws when unreachable (caller falls back). */
export async function askOllama(settings: BrainSettings, context: string, history: ChatMsg[], signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${settings.url.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: signal ?? AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: settings.model,
      stream: false,
      options: { temperature: 0.9, num_predict: 160 },
      messages: [
        { role: "system", content: `${MIKE_SYSTEM_PROMPT}\n\nContext:\n${context}` },
        ...history.slice(-12),
      ],
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  const text = (data.message?.content ?? "").trim();
  if (!text) throw new Error("empty");
  return text;
}

// ---- Cloud (Lovable AI gateway via the `mike` edge function) ---------------

export type BrainSource = "cloud" | "ollama" | "offline";

/** Ask Mike's cloud brain. Throws on any failure (caller falls back). */
export async function askCloud(context: string, history: ChatMsg[], extraRules = ""): Promise<string> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke<{ text?: string; error?: string }>("mike", {
    body: { system: extraRules ? `${MIKE_SYSTEM_PROMPT}\n\n${extraRules}` : MIKE_SYSTEM_PROMPT, context, messages: history.slice(-12) },
  });
  if (error) throw error;
  const text = data?.text?.trim();
  if (!text) throw new Error(data?.error ?? "empty");
  return text;
}

/** Cloud first, then Ollama if the user configured it and it answers, then the built-in Mike. */
export async function askMike(settings: BrainSettings, context: string, history: ChatMsg[], ollamaOk: boolean, extraRules = ""): Promise<{ text: string; source: BrainSource }> {
  const last = history[history.length - 1]?.content ?? "";
  try { return { text: await askCloud(context, history, extraRules), source: "cloud" }; } catch { /* fall through */ }
  if (ollamaOk) { try { return { text: await askOllama(settings, context, history), source: "ollama" }; } catch { /* fall through */ } }
  return { text: offlineMike(last), source: "offline" };
}

export async function ollamaReachable(settings: BrainSettings): Promise<boolean> {
  try {
    const r = await fetch(`${settings.url.replace(/\/$/, "")}/api/tags`, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch { return false; }
}

// ---- Offline Mike -------------------------------------------------------

type Rule = { test: RegExp; replies: string[] };
const RULES: Rule[] = [
  { test: /\b(hi|hello|hey|yo|hei|halla)\b/i, replies: ["Hey. Board's set up. Been set up since 6 a.m.", "Hi. One eye, two red ears, all yours. What are we playing?", "Yo. Three quests today. I counted them myself."] },
  { test: /\b(bored|boring|kjedelig|don'?t want|dont want|gidder ikke)\b/i, replies: ["Fair. One puzzle. If it's boring after that, I'll personally refund your minute.", "Boredom is just a position with no plan. Let's find a plan: one game against the ladder.", "I get it. I'm stuffed with cotton, I know boredom. Do one puzzle and then judge me."] },
  { test: /\b(lost|loss|losing|tapte|tap)\b/i, replies: ["You paid for a lesson. Expensive ones stick best. What did the opponent do that you didn't expect?", "Losing is just winning with extra steps. Next game: check every capture before you move.", "Even I lost once. On a Tuesday. We don't talk about it. Go again."] },
  { test: /\b(won|win|vant|seier)\b/i, replies: ["Yes. That's the one. Remember how that felt – that's the fuel.", "Winning. I knew it. I said so. To nobody, but I said it.", "Nice. Now beat someone stronger before it gets comfortable."] },
  { test: /\b(blunder|mistake|feil|hang|hung)\b/i, replies: ["Blunders are funny. Mine are legendary. The fix: before every move, ask 'what does this hang?'", "A blunder is just a bold move that didn't know it was bold. Checks, captures, threats – every move.", "Everybody hangs pieces. Champions just hang fewer. Slow down on the move after a capture."] },
  { test: /\b(opening|åpning|e4|d4|sicilian|london)\b/i, replies: ["Openings: develop pieces, control the centre, castle. Memorising 20 moves is for people with two eyes.", "Pick one opening as white and one answer to e4 and d4. Play them 50 times. Boring? Yes. Works? Also yes.", "The best opening is the one you understand. The second best is the one your opponent doesn't."] },
  { test: /\b(endgame|sluttspill|king and pawn|rook ending)\b/i, replies: ["Endgames: activate your king. It's a fighting piece now, not a hostage.", "Rook endings: rook behind the passed pawn. Yours or theirs. Always behind.", "Endgame tip from a felt monster: push passed pawns, cut off the king, don't rush."] },
  { test: /\b(tactic|puzzle|oppgave|fork|pin|skewer)\b/i, replies: ["Tactics are 90% of chess under 2000. The other 10% is also tactics.", "Puzzle rule: find the forcing moves first. Checks, captures, threats. Then look for the quiet killer.", "Forks, pins, skewers. Learn to spot them and the board starts talking to you."] },
  { test: /\b(2000|rating|elo|fide)\b/i, replies: ["2000 isn't a number, it's a habit: puzzles daily, games weekly, review always.", "Rating goes up when you stop losing to yourself. The opponent is the easy part.", "You're 1500-something with a coach who says you've got it. I'd say the same, but I'm a monster, so it counts double."] },
  { test: /\b(stockfish|engine|computer|bot)\b/i, replies: ["Stockfish? Beat it once. Tuesday. Don't ask.", "Engines see everything and feel nothing. You see less and feel more. Use the feeling.", "The bots on the ladder are beatable. Pelle especially. He's basically a pawn with ambition."] },
  { test: /\b(who are you|what are you|hvem er du)\b/i, replies: ["Mike. Green, one eye, two red EARS (not horns), 100% felt. You sewed me, remember? Best decision you ever made.", "I'm Mike. You made me out of felt, I live in your chess app, and I judge your moves. Lovingly.", "Your monster. Hand-sewn by you, powered by chess. The friendly kind, mostly."] },
  { test: /\b(horn|horns)\b/i, replies: ["EARS. They're ears. Red, pointy, excellent hearing. You made them, you should know.", "Horns? I'm a monster, not a goat. Ears. Moving on – your move."] },
  { test: /\b(joke|funny|vits)\b/i, replies: ["Why did the pawn cross the board? To become a queen. Why did I? I'm stuffed. I don't cross anything.", "I'd tell you a knight joke but it's a bit of a fork in the road.", "My rating is so high it has its own weather."] },
  { test: /\b(tired|sliten|sad|trist|angry|sint)\b/i, replies: ["Okay. Rest counts too. The board will be here tomorrow, and so will I. Maybe talk to your mum or dad if something's bugging you.", "Fair enough. One tiny puzzle or nothing at all – both fine. Tell someone at home if it's a heavy day."] },
];

const DEFAULT_REPLIES = [
  "Not my department. Chess, though? That's my department. Ask me anything about it.",
  "I've got one eye and it only sees chessboards. Try me on openings, tactics, or why losing is secretly great.",
  "Interesting. Related: have you done today's quests? Asking for a friend. The friend is me.",
  "Checks, captures, threats. That answers most questions in life. Including that one, probably.",
];

export function offlineMike(text: string, seed = Date.now()): string {
  for (const r of RULES) if (r.test.test(text)) return r.replies[seed % r.replies.length]!;
  return DEFAULT_REPLIES[seed % DEFAULT_REPLIES.length]!;
}

export const MIKE_OPENERS = ["Hi Mike", "I'm bored", "I lost a game", "Tell me a joke", "How do I get to 2000?", "Tips for openings?"];
