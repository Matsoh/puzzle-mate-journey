import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { AppHeader } from "@/components/AppHeader";
import { Board } from "@/components/Board";
import { CoachBubble } from "@/components/CoachAvatar";
import { CoachReview } from "@/components/CoachReview";
import { BossScene, CelebrationScene } from "@/components/three/Lazy3D";
import type { ColorChoice, TimeControl } from "@/components/GameSetup";
import { getEngine } from "@/lib/engine";
import { analyseGame, type Mistake, type PlayedMove } from "@/lib/coach";
import { ENGINE_ELO_OFFSET, getOpponent, OPPONENTS } from "@/lib/opponents";
import { markActive, updateProgress, withHistoryPoint } from "@/lib/progress";
import { K_GAME, levelFromXp, newRating, XP } from "@/lib/rules";
import { applyBadges, type Badge } from "@/lib/badges";
import { play, unlockAudio } from "@/lib/sound";

type Search = { opp?: string | undefined; elo?: number | undefined; tc: TimeControl; color: ColorChoice };

export const Route = createFileRoute("/parti")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    opp: typeof s["opp"] === "string" ? s["opp"] : undefined,
    elo: s["elo"] !== undefined && Number.isFinite(Number(s["elo"])) ? Number(s["elo"]) : undefined,
    tc: s["tc"] === "10+0" || s["tc"] === "none" ? s["tc"] : "15+10",
    color: s["color"] === "b" || s["color"] === "r" ? s["color"] : "w",
  }),
  head: () => ({
    meta: [
      { title: "Parti – SjakkStorm" },
      { name: "description", content: "Spill sjakk mot en motstander og få analyse fra treneren." },
      { property: "og:title", content: "Parti – SjakkStorm" },
      { property: "og:description", content: "Spill, vinn og lær av feilene dine." },
    ],
  }),
  component: Game,
});

type Outcome = "win" | "loss" | "draw";
type Reward = { xp: number; ratingBefore: number; ratingAfter: number; badges: Badge[]; levelUp: boolean };

const TC_MS: Record<TimeControl, [number, number] | null> = { "10+0": [600_000, 0], "15+10": [900_000, 10_000], none: null };

function fmtClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Game() {
  const { opp: oppId, elo: freeElo, tc, color } = Route.useSearch();
  const opponent = getOpponent(oppId);
  const engineElo = opponent?.elo ?? freeElo ?? 1600;
  const [player] = useState<"w" | "b">(() => (color === "r" ? (Math.random() < 0.5 ? "w" : "b") : color));
  const orientation = player === "w" ? "white" : "black";

  const game = useRef(new Chess());
  const [fen, setFen] = useState(game.current.fen());
  const [moves, setMoves] = useState<PlayedMove[]>([]);
  const [phase, setPhase] = useState<"intro" | "playing" | "over" | "analysing" | "review">(opponent ? "intro" : "playing");
  const [result, setResult] = useState<{ outcome: Outcome; reason: string } | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [thinking, setThinking] = useState(false);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [analysisPct, setAnalysisPct] = useState(0);
  const [engineError, setEngineError] = useState(false);

  const tcCfg = TC_MS[tc];
  const [clock, setClock] = useState<[number, number]>(tcCfg ? [tcCfg[0], tcCfg[0]] : [0, 0]);
  const clockRef = useRef(clock);
  clockRef.current = clock;

  const lastMove = moves.length ? ([moves[moves.length - 1].uci.slice(0, 2), moves[moves.length - 1].uci.slice(2, 4)] as [string, string]) : null;

  // Engine setup
  useEffect(() => {
    const e = getEngine();
    e.setStrength(engineElo + ENGINE_ELO_OFFSET).then(() => e.newGame()).catch(() => setEngineError(true));
  }, [engineElo]);

  const finish = useCallback(
    (outcome: Outcome, reason: string) => {
      setResult({ outcome, reason });
      setPhase("over");
      play(outcome === "win" ? "win" : outcome === "loss" ? "lose" : "correct");
      let rw: Reward | null = null;
      updateProgress((p0) => {
        const score = outcome === "win" ? 1 : outcome === "draw" ? 0.5 : 0;
        const before = levelFromXp(p0.xp).level;
        let gained = outcome === "win" ? XP.gameWin : outcome === "draw" ? XP.gameDraw : XP.gameLoss;
        const firstBeat = outcome === "win" && opponent && !p0.beaten.includes(opponent.id);
        if (firstBeat) gained += XP.bossWinBonus;
        let p = {
          ...p0,
          xp: p0.xp + gained,
          games: p0.games + 1,
          wins: p0.wins + (outcome === "win" ? 1 : 0),
          draws: p0.draws + (outcome === "draw" ? 1 : 0),
          rating: newRating(p0.rating, engineElo, score, K_GAME),
          beaten: firstBeat && opponent ? [...p0.beaten, opponent.id] : p0.beaten,
          maxBeatenElo: outcome === "win" ? Math.max(p0.maxBeatenElo, engineElo) : p0.maxBeatenElo,
        };
        p = withHistoryPoint(markActive(p));
        const b = applyBadges(p);
        rw = { xp: gained, ratingBefore: p0.rating, ratingAfter: p.rating, badges: b.earned, levelUp: levelFromXp(p.xp).level > before };
        return b.progress;
      });
      setReward(rw);
    },
    [opponent, engineElo],
  );

  const checkEnd = useCallback(() => {
    const g = game.current;
    if (g.isCheckmate()) {
      finish(g.turn() === player ? "loss" : "win", "Sjakk matt!");
      return true;
    }
    if (g.isStalemate()) return finish("draw", "Patt"), true;
    if (g.isThreefoldRepetition()) return finish("draw", "Trekkgjentakelse"), true;
    if (g.isInsufficientMaterial()) return finish("draw", "For lite materiell"), true;
    if (g.isDraw()) return finish("draw", "Remis"), true;
    return false;
  }, [finish, player]);

  const applyMove = useCallback(
    (from: string, to: string, promotion = "q") => {
      const g = game.current;
      const fenBefore = g.fen();
      let mv;
      try {
        mv = g.move({ from, to, promotion });
      } catch {
        return false;
      }
      const uci = mv.from + mv.to + (mv.promotion ?? "");
      setMoves((m) => [...m, { fenBefore, uci, san: mv.san, color: mv.color }]);
      setFen(g.fen());
      if (tcCfg && tcCfg[1]) {
        setClock((c) => (mv.color === "w" ? [c[0] + tcCfg[1], c[1]] : [c[0], c[1] + tcCfg[1]]));
      }
      play(g.inCheck() ? "check" : mv.captured ? "capture" : "move");
      checkEnd();
      return true;
    },
    [checkEnd, tcCfg],
  );

  // Engine's turn
  useEffect(() => {
    if (phase !== "playing" || game.current.turn() === player || game.current.isGameOver()) return;
    let cancelled = false;
    setThinking(true);
    const remaining = tcCfg ? clockRef.current[player === "w" ? 1 : 0] : 0;
    const movetime = tcCfg ? Math.max(250, Math.min(1500, remaining / 40)) : 1000;
    const fenNow = game.current.fen();
    getEngine()
      .bestMove(fenNow, movetime)
      .then((uci) => {
        if (cancelled || game.current.fen() !== fenNow || !uci || uci === "(none)") return;
        setTimeout(() => {
          if (!cancelled) applyMove(uci.slice(0, 2), uci.slice(2, 4), uci[4] || "q");
          setThinking(false);
        }, 250);
      })
      .catch(() => {
        setEngineError(true);
        setThinking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fen, phase, player, applyMove, tcCfg]);

  // Clock
  useEffect(() => {
    if (!tcCfg || phase !== "playing" || moves.length < 1) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      const side = game.current.turn() === "w" ? 0 : 1;
      setClock((c) => {
        const n: [number, number] = [...c] as [number, number];
        n[side] = Math.max(0, n[side] - dt);
        return n;
      });
    }, 200);
    return () => clearInterval(id);
  }, [tcCfg, phase, moves.length]);

  useEffect(() => {
    if (!tcCfg || phase !== "playing") return;
    const pi = player === "w" ? 0 : 1;
    if (clock[pi] <= 0) finish("loss", "Tiden gikk ut");
    else if (clock[1 - pi] <= 0) finish("win", "Motstanderen gikk tom for tid");
  }, [clock, tcCfg, phase, player, finish]);

  const onPlayerMove = (from: string, to: string) => {
    if (phase !== "playing" || game.current.turn() !== player) return false;
    return applyMove(from, to);
  };

  const startAnalysis = async () => {
    setPhase("analysing");
    setAnalysisPct(0);
    try {
      const res = await analyseGame(getEngine(), moves, game.current.fen(), player, (d, t) => setAnalysisPct(Math.round((d / t) * 100)));
      setMistakes(res);
      setPhase("review");
    } catch {
      setEngineError(true);
      setPhase("over");
    } finally {
      // restore opponent strength for a rematch
      void getEngine().setStrength(engineElo + ENGINE_ELO_OFFSET);
    }
  };

  const title = opponent ? opponent.name : `Fritt parti · ${engineElo}`;
  const oppClockIdx = player === "w" ? 1 : 0;
  const nextOpp = opponent ? OPPONENTS[OPPONENTS.indexOf(opponent) + 1] : undefined;
  const moveListSan = useMemo(() => moves.map((m) => m.san), [moves]);

  return (
    <main className="mx-auto max-w-5xl pb-8 safe-bottom" onPointerDown={unlockAudio}>
      <AppHeader title={title} />

      {phase === "intro" && opponent && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background/95">
          <div className="relative flex-1">
            <BossScene hue={opponent.hue} />
          </div>
          <div className="p-6 text-center space-y-3 safe-bottom animate-pop">
            <p className="font-display text-5xl text-gradient-gold">BOSSKAMP!</p>
            <h2 className="text-3xl">{opponent.emoji} {opponent.name}</h2>
            <p className="font-extrabold text-primary">{opponent.elo} · {opponent.style}</p>
            <p className="text-lg italic">«{opponent.line}»</p>
            <button
              className="btn-game btn-gold w-full max-w-sm !text-2xl"
              onClick={() => {
                unlockAudio();
                play("boss");
                setPhase("playing");
              }}
            >
              ⚔️ Kjør!
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {phase !== "review" && phase !== "analysing" && (
          <section className="space-y-3">
            <PlayerBar name={opponent ? `${opponent.emoji} ${opponent.name}` : "🤖 Stockfish"} rating={engineElo} clock={tcCfg ? fmtClock(clock[oppClockIdx]) : null} active={phase === "playing" && game.current.turn() !== player} note={thinking ? "tenker…" : undefined} />
            <div className="mx-auto w-full max-w-[min(94vw,68vh)]">
              <Board fen={fen} orientation={orientation} onMove={onPlayerMove} canMove={phase === "playing" && game.current.turn() === player} lastMove={lastMove} />
            </div>
            <PlayerBar name="⭐ Deg" clock={tcCfg ? fmtClock(clock[1 - oppClockIdx]) : null} active={phase === "playing" && game.current.turn() === player} />
          </section>
        )}

        <aside className={phase === "review" || phase === "analysing" ? "lg:col-span-2 mx-auto w-full max-w-2xl space-y-4" : "space-y-4"}>
          {engineError && <CoachBubble>Oi, sjakkmotoren fikk hikke. Prøv å laste siden på nytt! 🔄</CoachBubble>}

          {phase === "playing" && (
            <>
              <div className="card-game p-3 max-h-40 overflow-y-auto text-sm font-bold leading-7">
                {moveListSan.length === 0 ? (
                  <span className="text-muted-foreground">{player === "w" ? "Du starter – lykke til! 🍀" : "Motstanderen starter…"}</span>
                ) : (
                  moveListSan.map((s, i) => (
                    <span key={i} className="mr-2">
                      {i % 2 === 0 && <span className="text-muted-foreground">{i / 2 + 1}.</span>} {s}
                    </span>
                  ))
                )}
              </div>
              <button className="btn-game btn-ghost w-full" onClick={() => finish("loss", "Du ga opp")}>🏳️ Gi opp</button>
            </>
          )}

          {phase === "over" && result && (
            <div className="space-y-4 animate-pop">
              {result.outcome === "win" && (
                <div className="relative h-64 rounded-3xl overflow-hidden card-game">
                  <CelebrationScene />
                </div>
              )}
              <div className="card-game p-5 text-center space-y-2">
                <p className={`font-display text-5xl ${result.outcome === "win" ? "text-gradient-gold" : result.outcome === "draw" ? "neon-text" : "text-secondary"}`}>
                  {result.outcome === "win" ? "SEIER!" : result.outcome === "draw" ? "REMIS" : "TAP"}
                </p>
                <p className="font-bold text-muted-foreground">{result.reason}</p>
                {opponent && <p className="italic">«{result.outcome === "win" ? opponent.winLine : opponent.line}»</p>}
                {reward && (
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <span className="chip text-accent">+{reward.xp} XP</span>
                    <span className="chip">
                      ♟️ {reward.ratingBefore} → {reward.ratingAfter} ({reward.ratingAfter >= reward.ratingBefore ? "+" : ""}
                      {reward.ratingAfter - reward.ratingBefore})
                    </span>
                    {reward.levelUp && <span className="chip text-gold">⬆️ Nytt nivå!</span>}
                    {reward.badges.map((b) => (
                      <span key={b.id} className="chip text-gold animate-pop">{b.icon} {b.name}</span>
                    ))}
                  </div>
                )}
                {result.outcome === "win" && nextOpp && <p className="font-extrabold text-accent pt-1">🔓 {nextOpp.name} er låst opp!</p>}
              </div>
              <CoachBubble>
                {result.outcome === "win" ? "Rått spilt! " : result.outcome === "draw" ? "Godt kjempet! " : "Ikke gi opp – tap er der vi lærer mest! "}
                Skal vi se på de viktigste øyeblikkene sammen?
              </CoachBubble>
              <button className="btn-game btn-primary w-full" disabled={moves.length < 2} onClick={startAnalysis}>🔍 Analyser med treneren</button>
              <div className="grid grid-cols-2 gap-3">
                <button className="btn-game btn-ghost" onClick={() => window.location.reload()}>🔁 Omkamp</button>
                <Link to={opponent ? "/stigen" : "/"} className="btn-game btn-ghost">{opponent ? "🪜 Stigen" : "🏠 Hjem"}</Link>
              </div>
            </div>
          )}

          {phase === "analysing" && (
            <div className="card-game p-6 text-center space-y-4">
              <CoachBubble>Jeg går gjennom partiet med Stockfish… et øyeblikk! 🔎</CoachBubble>
              <div className="xp-track"><div className="xp-fill" style={{ width: `${analysisPct}%` }} /></div>
              <p className="font-display text-2xl">{analysisPct}%</p>
            </div>
          )}

          {phase === "review" && (
            <>
              <CoachReview mistakes={mistakes} orientation={orientation} />
              <div className="grid grid-cols-2 gap-3">
                <button className="btn-game btn-secondary" onClick={() => window.location.reload()}>🔁 Ny kamp</button>
                <Link to="/" className="btn-game btn-ghost">🏠 Hjem</Link>
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

function PlayerBar({ name, rating, clock, active, note }: { name: string; rating?: number; clock: string | null; active: boolean; note?: string }) {
  return (
    <div className={`mx-auto flex w-full max-w-[min(94vw,68vh)] items-center justify-between rounded-2xl px-4 py-2 border transition ${active ? "border-primary bg-primary/15" : "border-border bg-card/60"}`}>
      <span className="font-extrabold truncate">
        {name} {rating && <span className="text-muted-foreground">({rating})</span>} {note && <span className="text-primary animate-pulse">{note}</span>}
      </span>
      {clock && <span className={`font-display text-2xl tabular-nums ${active ? "neon-text" : ""}`}>{clock}</span>}
    </div>
  );
}
