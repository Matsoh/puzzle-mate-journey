// Human-like thinking-time model for the bots. Pure + testable (inject rng).
// Only decides how long a bot's turn lasts; search strength is unchanged.

export type Tempo = "impulsive" | "steady" | "slow";

export const OPPONENT_TEMPO: Record<string, Tempo> = {
  pelle: "impulsive",
  kaos: "impulsive",
  leo: "impulsive",
  mia: "steady",
  dina: "steady",
  nora: "steady",
  storm: "steady",
  mike: "steady",
  pling: "slow",
  sigurd: "slow",
  ivar: "slow",
};

export type ThinkInput = {
  elo: number;
  tempo?: Tempo | undefined;
  ply: number; // half-moves already played
  legalMoves: number;
  inCheck: boolean;
  captures: number; // legal capturing moves
  promotions: number;
  pieces: number; // total pieces on board
  remainingMs: number | null; // bot clock, null = no clock
  initialMs: number | null;
  incrementMs: number;
};

export type Rng = () => number;

const TEMPO_MULT: Record<Tempo, number> = { impulsive: 0.75, steady: 1, slow: 1.3 };
export const NO_CLOCK_MAX_MS = 12_000;
export const MIN_MS = 300;

/** Skewed sample in [lo, hi]: most values near the low end, occasional long ones. */
function skew(rng: Rng, lo: number, hi: number) {
  return lo + (hi - lo) * Math.pow(rng(), 1.7);
}

export type Category = "forced" | "normal" | "complex";

export function categorize(i: Pick<ThinkInput, "ply" | "legalMoves" | "inCheck" | "captures" | "promotions" | "pieces">): Category {
  if (i.legalMoves <= 2 || (i.inCheck && i.legalMoves <= 4)) return "forced";
  if (i.ply < 8) return "forced"; // known opening moves
  if (i.promotions > 0 || i.captures >= 4 || (i.legalMoves >= 38 && i.pieces > 14) || (i.inCheck && i.legalMoves > 4)) return "complex";
  return "normal";
}

/** Safe time budget the bot may spend this move given its clock. */
export function clockCap(remainingMs: number, initialMs: number, incrementMs: number, ply: number): number {
  const reserve = Math.max(2_000, initialMs * 0.05);
  const usable = Math.max(0, remainingMs - reserve);
  const movesLeft = Math.max(20, 40 - ply / 4);
  const perMove = usable / movesLeft + incrementMs * 0.8;
  // allow spending up to ~3x the average on a hard move, never more than 20% of usable time
  let cap = Math.min(perMove * 3, usable * 0.2 + incrementMs * 0.8);
  if (remainingMs < 30_000) cap = Math.min(cap, remainingMs / 25 + incrementMs * 0.5); // time trouble
  return Math.max(0, cap);
}

/** Target total turn duration (ms), measured from turn start. */
export function thinkTimeMs(i: ThinkInput, rng: Rng = Math.random): number {
  const skill = Math.max(0, Math.min(1, (i.elo - 1500) / 550)); // 0 = 1500, 1 = 2050+
  const cat = categorize(i);
  let t =
    cat === "forced" ? skew(rng, 1_000, 3_000) : cat === "normal" ? skew(rng, 3_000, 8_000) : skew(rng, 8_000, 18_000);

  const roll = rng();
  if (cat === "complex") {
    // weaker bots sometimes rush hard decisions; stronger ones sometimes dig deeper
    if (roll < 0.25 * (1 - skill) + 0.03) t *= 0.3 + 0.2 * rng();
    else if (roll > 1 - 0.15 * skill) t *= 1.3 + 0.4 * rng();
  } else {
    const impulse = 0.16 * (1 - skill) + 0.04;
    const overthink = 0.12 * (1 - skill) + 0.02;
    if (roll < impulse) t = 600 + 1_400 * rng();
    else if (roll < impulse + overthink) t *= 2.2 + 1.3 * rng();
  }

  // Weaker players use time badly: a long stare at an obvious recapture, blitzing out
  // the hard decision, and a time-trouble spiral late in the game.
  if (skill < 0.45) {
    const waste = rng();
    if (cat === "forced" && waste < 0.18) t = 3_500 + 4_000 * rng();
    else if (cat === "complex" && waste < 0.35) t = 900 + 1_200 * rng();
  }
  if (i.remainingMs != null && i.initialMs != null && i.remainingMs < i.initialMs * 0.15 && skill < 0.6) t = 400 + 700 * rng();

  t *= TEMPO_MULT[i.tempo ?? "steady"];

  if (i.remainingMs != null && i.initialMs != null) {
    t *= Math.max(0.4, Math.min(1.3, i.initialMs / 600_000));
    t = Math.min(t, clockCap(i.remainingMs, i.initialMs, i.incrementMs, i.ply));
  } else {
    t = Math.min(t * 0.8, NO_CLOCK_MAX_MS);
  }
  return Math.round(Math.max(MIN_MS, t));
}

/** Engine search time: unchanged strength formula, but never longer than the turn target. */
export function searchTimeMs(remainingMs: number | null, targetMs: number): number {
  const base = remainingMs != null ? Math.max(250, Math.min(1500, remainingMs / 40)) : 1000;
  return Math.max(100, Math.min(base, targetMs));
}

/** Remaining presentation delay after the engine answered. */
export function remainingDelay(targetMs: number, elapsedMs: number): number {
  return Math.max(0, targetMs - elapsedMs);
}
