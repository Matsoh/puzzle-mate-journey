import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, RotateCcw, Flag, Search, Lightbulb, Swords, House, Award, TrendingUp, Puzzle, LockKeyholeOpen } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { AppHeader } from "@/components/AppHeader";
import { Board } from "@/components/Board";
import { usePremoves } from "@/components/usePremoves";
import { CoachBubble, PlayerAvatar } from "@/components/CoachAvatar";
import { GameReview } from "@/components/GameReview";
import { avatarName } from "@/lib/avatar";
import { flairEmoji } from "@/lib/flair";
import { CoachDebrief } from "@/components/CoachDebrief";
import { ChampAvatarScene } from "@/components/ChampAvatarScene";
import type { ColorChoice, TimeControl } from "@/components/GameSetup";
import { parseTimeControl, tcToMs } from "@/lib/tournament";
import { getEngine } from "@/lib/engine";
import { botMove } from "@/lib/bot";
import { maiaInit } from "@/lib/maia";
import { MaiaBrain } from "@/components/MaiaBrain";
import { OPPONENT_TEMPO, remainingDelay, searchTimeMs, thinkTimeMs } from "@/lib/think-time";
import { reviewGame, type GameReview as Review, type Mistake, type PlayedMove } from "@/lib/coach";
import { ENGINE_ELO_OFFSET, getOpponent, OPPONENTS } from "@/lib/opponents";
import { getProgress, markActive, updateProgress, withHistoryPoint } from "@/lib/progress";
import { withDayGame } from "@/lib/quests";
import { withAppGame, tcClass } from "@/lib/game-log";
import { celebrateBadges, celebrateDiff } from "@/lib/celebrate";
import { K_GAME, levelFromXp, newRating, XP } from "@/lib/rules";
import { applyBadges, type Badge } from "@/lib/badges";
import { play, unlockAudio } from "@/lib/sound";
import { rememberLadderWin } from "@/lib/daily-coach";
import { today } from "@/lib/progress";
import { MikeCompanion } from "@/components/MikeCompanion";
import { BotAvatar } from "@/components/BotAvatar";
import { botMood } from "@/lib/bot-mood";
import { gameContext, gameReaction, introLine, reviewContext, reviewLine } from "@/lib/mike-game";

type Search = { opp?: string | undefined; elo?: number | undefined; tc: TimeControl; color: ColorChoice };

export const Route = createFileRoute("/parti")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    opp: typeof s["opp"] === "string" ? s["opp"] : undefined,
    elo: s["elo"] !== undefined && Number.isFinite(Number(s["elo"])) ? Number(s["elo"]) : undefined,
    tc: parseTimeControl(s["tc"]),
    color: s["color"] === "b" || s["color"] === "r" ? s["color"] : "w",
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Parti – Goblin Chess" },
      { name: "description", content: "Spill sjakk mot en motstander og få analyse fra treneren." },
      { property: "og:title", content: "Parti – Goblin Chess" },
      { property: "og:description", content: "Spill, vinn og lær av feilene dine." },
    ],
  }),
  component: Game,
});

type Outcome = "win" | "loss" | "draw";
type Reward = { xp: number; ratingBefore: number; ratingAfter: number; badges: Badge[]; levelUp: boolean };


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
  const turnSession = useRef(0);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [analysisPct, setAnalysisPct] = useState(0);
  const [engineError, setEngineError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  // Must be referentially stable: a fresh array each render restarted the bot turn on every clock tick.
  const tcCfg = useMemo(() => tcToMs(tc), [tc]);
  const [clock, setClock] = useState<[number, number]>(tcCfg ? [tcCfg[0], tcCfg[0]] : [0, 0]);
  const clockRef = useRef(clock);
  clockRef.current = clock;

  const lastMove = moves.length ? ([moves[moves.length - 1]!.uci.slice(0, 2), moves[moves.length - 1]!.uci.slice(2, 4)] as [string, string]) : null;

  useEffect(() => { maiaInit(); }, []);
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
        p = withDayGame(withHistoryPoint(markActive(p)), today(), outcome === "win");
        p = withAppGame(p, { id: `app:${Date.now()}`, source: "app", opponent: opponent ? opponent.name : `Stockfish ${engineElo}`, opponentRating: engineElo, player, result: outcome, moves: game.current.history(), timeClass: tcCfg ? tcClass(tcCfg[0], tcCfg[1]) : "none" });
        const b = applyBadges(p);
        rw = { xp: gained, ratingBefore: p0.rating, ratingAfter: p.rating, badges: b.earned, levelUp: levelFromXp(p.xp).level > before };
        celebrateDiff(p0, b.progress);
        celebrateBadges(b.earned);
        return b.progress;
      });
      setReward(rw);
      if (outcome === "win" && opponent) rememberLadderWin(opponent.id, today());
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
        const inc = tcCfg[1];
        setClock((c) => (mv.color === "w" ? [c[0] + inc, c[1]] : [c[0], c[1] + inc]));
      }
      play(g.inCheck() ? "check" : mv.captured ? "capture" : "move");
      checkEnd();
      return true;
    },
    [checkEnd, tcCfg],
  );

  // Engine's turn: one cancellable job; total turn length follows the think-time model.
  useEffect(() => {
    if (phase !== "playing" || game.current.turn() === player || game.current.isGameOver()) return;
    const session = ++turnSession.current;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const alive = () => !cancelled && turnSession.current === session;
    setThinking(true);
    const started = performance.now();
    const g = game.current;
    const fenNow = g.fen();
    const legal = g.moves({ verbose: true });
    const remaining = tcCfg ? clockRef.current[player === "w" ? 1 : 0] : null;
    const target = thinkTimeMs({
      elo: engineElo,
      tempo: opponent ? OPPONENT_TEMPO[opponent.id] : undefined,
      ply: g.history().length,
      legalMoves: legal.length,
      inCheck: g.inCheck(),
      captures: legal.filter((m) => m.captured).length,
      promotions: legal.filter((m) => m.promotion).length,
      pieces: fenNow.split(" ")[0]!.replace(/[^a-zA-Z]/g, "").length,
      remainingMs: remaining,
      initialMs: tcCfg ? tcCfg[0] : null,
      incrementMs: tcCfg ? tcCfg[1] : 0,
    });
    botMove(fenNow, engineElo, getProgress().rating, searchTimeMs(remaining, target))
      .then(({ uci }) => {
        if (!alive() || game.current.fen() !== fenNow || !uci || uci === "(none)") return;
        timer = setTimeout(() => {
          if (!alive() || game.current.fen() !== fenNow || game.current.turn() === player) return;
          applyMove(uci.slice(0, 2), uci.slice(2, 4), uci[4] || "q");
          setThinking(false);
        }, remainingDelay(target, performance.now() - started));
      })
      .catch(() => {
        if (!alive()) return;
        setEngineError(true);
        setThinking(false);
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      setThinking(false);
    };
  }, [fen, phase, player, applyMove, tcCfg, engineElo, opponent, retryTick]);

  // Clock
  useEffect(() => {
    // Engine failure is not a game result: freeze both clocks until «Prøv igjen».
    if (!tcCfg || phase !== "playing" || moves.length < 1 || engineError) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      const side = game.current.turn() === "w" ? 0 : 1;
      setClock((c) => {
        const n: [number, number] = [...c] as [number, number];
        n[side] = Math.max(0, n[side]! - dt);
        return n;
      });
    }, 200);
    return () => clearInterval(id);
  }, [tcCfg, phase, moves.length, engineError]);

  useEffect(() => {
    if (!tcCfg || phase !== "playing") return;
    const pi = player === "w" ? 0 : 1;
    if (clock[pi] <= 0) finish("loss", "Tiden gikk ut");
    else if (clock[pi === 0 ? 1 : 0] <= 0) finish("win", "Motstanderen gikk tom for tid");
  }, [clock, tcCfg, phase, player, finish]);

  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const onPlayerMove = (from: string, to: string) => {
    if (phase !== "playing" || game.current.turn() !== player || promo) return false;
    // Promotion: let him choose the piece, like on chess.com – never auto-queen.
    const isPromo = game.current.moves({ verbose: true }).some((m) => m.from === from && m.to === to && m.promotion);
    if (isPromo) { setPromo({ from, to }); return false; }
    return applyMove(from, to);
  };

  const premoves = usePremoves({ fen, myTurn: game.current.turn() === player && !promo && !thinking, active: phase === "playing", play: (f, t, pr) => applyMove(f, t, pr ?? "q") });

  const startAnalysis = async () => {
    setPhase("analysing");
    setAnalysisPct(0);
    try {
      const res = await reviewGame(getEngine(), moves, game.current.fen(), player, (d, t) => setAnalysisPct(Math.round((d / t) * 100)));
      setMistakes(res.mistakes);
      setReview(res);
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
  const myClockMs = tcCfg ? clock[player === "w" ? 0 : 1] : null;
  const snapshot = useMemo(() => ({ fen, moves, player, opponent, myClockMs: tcCfg ? Math.round(myClockMs! / 5000) * 5000 : null, tc }), [fen, moves, player, opponent, tcCfg, myClockMs, tc]);
  const reaction = useMemo(() => gameReaction(snapshot), [snapshot]);
  const mood = useMemo(() => botMood({ fen, moves, player, outcome: phase === "playing" || phase === "intro" ? null : result?.outcome, thinking }), [fen, moves, player, phase, result, thinking]);
  const [lastLine, setLastLine] = useState<ReturnType<typeof gameReaction>>(null);
  useEffect(() => { if (reaction) setLastLine(reaction); }, [reaction]);

  return (
    <main className="page-layout" onPointerDown={unlockAudio}>
      <AppHeader title={title} />

      {phase === "intro" && opponent && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background/95">
          <div className="relative flex flex-1 items-center justify-center" style={{ background: `radial-gradient(circle at 50% 60%, oklch(0.45 0.12 ${opponent.hue} / 0.55), transparent 60%)` }}>
            <BotAvatar opponent={opponent} mood="smug" size={200} quips={false} />
          </div>
          <div className="p-6 text-center space-y-3 safe-bottom animate-pop">
            <p className="text-3xl font-semibold text-primary">Neste utfordring</p>
            <h2 className="text-3xl">{opponent.name}</h2>
            <p className="font-medium text-primary">{opponent.elo} · {opponent.style}</p>
            <p className="text-lg italic">«{opponent.line}»</p>
            <p className="mike-bubble mx-auto max-w-sm text-left text-sm"><span className="mike-bubble__name">Mike</span>{introLine(opponent)}</p>
            <Button
              className=" w-full max-w-sm "
              onClick={() => {
                unlockAudio();
                play("boss");
                setPhase("playing");
              }}
            >
              <Swords /> Start kampen
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {phase !== "review" && phase !== "analysing" && (
          <section className="space-y-3">
            <div className={`bot-bar ${phase === "playing" && game.current.turn() !== player ? "is-active" : ""}`}>
              <BotAvatar opponent={opponent} name={opponent ? opponent.name : "Stockfish"} mood={mood} size={opponent ? 84 : 56} />
              <span className="min-w-0">
                <span className="bot-bar__name truncate">{opponent ? opponent.name : "Stockfish"}</span>
                <span className="bot-bar__sub">{engineElo}{opponent ? ` · ${opponent.style}` : ""}{thinking && phase === "playing" ? " · tenker…" : ""}</span>
              </span>
              {tcCfg && <span className="bot-bar__clock">{fmtClock(clock[oppClockIdx])}</span>}
            </div>
            <div className="relative mx-auto w-full max-w-[min(94vw,68vh)]">
              <Board fen={fen} orientation={orientation} onMove={onPlayerMove} canMove={phase === "playing" && game.current.turn() === player && !promo} lastMove={lastMove} premove={phase === "playing" ? premoves : undefined} />
              {promo && (
                <div role="dialog" aria-label="Velg brikke" className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <div className="card-game flex gap-2 p-3">
                    {(["q", "r", "b", "n"] as const).map((pc) => (
                      <Button key={pc} size="lg" variant="outline" aria-label={{ q: "Dronning", r: "Tårn", b: "Løper", n: "Springer" }[pc]} className="text-2xl"
                        onClick={() => { applyMove(promo.from, promo.to, pc); setPromo(null); }}>
                        {player === "w" ? { q: "♕", r: "♖", b: "♗", n: "♘" }[pc] : { q: "♛", r: "♜", b: "♝", n: "♞" }[pc]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className={`bot-bar ${phase === "playing" && game.current.turn() === player ? "is-active" : ""}`}>
              <PlayerAvatar className="size-14" />
              <span className="min-w-0"><span className="bot-bar__name truncate">{avatarName(getProgress())} {flairEmoji(getProgress().flair)}</span><span className="bot-bar__sub">{getProgress().rating}{phase === "playing" && game.current.turn() === player ? " · ditt trekk" : ""}</span></span>
              {tcCfg && <span className="bot-bar__clock">{fmtClock(clock[oppClockIdx === 0 ? 1 : 0])}</span>}
            </div>
          </section>
        )}

        <aside className={phase === "review" || phase === "analysing" ? "lg:col-span-2 mx-auto w-full max-w-2xl space-y-4" : "space-y-4"}>
          {engineError && (
            <div className="space-y-2" role="alert">
              <CoachBubble>Oi, sjakkmotoren fikk hikke. Trykk «Prøv igjen».</CoachBubble>
              <Button variant="outline" onClick={() => { setEngineError(false); setRetryTick((n) => n + 1); }}>Prøv igjen</Button>
            </div>
          )}

          {phase === "playing" && (
            <>
              <MaiaBrain compact />
              <MikeCompanion mode="game" line={lastLine} context={gameContext(snapshot)} compact />
              <div className="card-game p-3 max-h-64 overflow-y-auto text-sm font-medium leading-7">
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
              <Button variant="outline" className=" w-full" onClick={() => finish("loss", "Du ga opp")}><Flag /> Gi opp</Button>
            </>
          )}

          {phase === "over" && result && (
            <div className="space-y-4 animate-pop">
              {result.outcome === "win" && (
                <div className="relative aspect-square">
                  <ChampAvatarScene celebrate />
                </div>
              )}
              <div className="card-game p-5 text-center space-y-2">
                <p className={`text-3xl font-semibold ${result.outcome === "win" ? "text-primary" : result.outcome === "draw" ? "neon-text" : "text-muted-foreground"}`}>
                  {result.outcome === "win" ? "Seier!" : result.outcome === "draw" ? "Remis" : "Tap"}
                </p>
                <p className="font-medium text-muted-foreground">{result.reason}</p>
                {opponent && <p className="italic">«{result.outcome === "win" ? opponent.winLine : opponent.line}»</p>}
                {reward && (
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <span className="chip text-accent">+{reward.xp} XP</span>
                    <span className="chip">
                      <TrendingUp className="size-3" /> {reward.ratingBefore} → {reward.ratingAfter} ({reward.ratingAfter >= reward.ratingBefore ? "+" : ""}
                      {reward.ratingAfter - reward.ratingBefore})
                    </span>
                    {reward.levelUp && <span className="chip text-gold">Nytt nivå!</span>}
                    {reward.badges.map((b) => (
                      <span key={b.id} className="chip text-gold animate-pop"><Award className="size-3" /> {b.name}</span>
                    ))}
                  </div>
                )}
                {result.outcome === "win" && nextOpp && <p className="font-medium text-accent pt-1"><LockKeyholeOpen className="inline size-4" /> {nextOpp.name} er låst opp!</p>}
              </div>
              <MikeCompanion mode="review" compact context={`${gameContext(snapshot)}\nResult: Tobias ${result.outcome === "win" ? "won" : result.outcome === "draw" ? "drew" : "lost"} (${result.reason}). The engine analysis has not been run yet.`}
                line={{ text: result.outcome === "win" ? "That's a win. Say it out loud. Then let's see where it nearly wasn't." : result.outcome === "draw" ? "Draw. Half a point and a full lesson, if we look." : "Lost. Good. Losses are where the XP is. Run the analysis.", mood: result.outcome === "win" ? "happy" : "think" }} />
              <Button className=" w-full" disabled={moves.length < 2} onClick={startAnalysis}><Search /> Analyser partiet</Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="" onClick={() => window.location.reload()}><RotateCcw /> Omkamp</Button>
                <Link to={opponent ? "/stigen" : "/"} className="btn-game btn-ghost">{opponent ? "<Swords /> Stigen" : "<House /> Oversikt"}</Link>
              </div>
            </div>
          )}

          {phase === "analysing" && (
            <div className="card-game p-6 text-center space-y-4">
              <CoachBubble>Jeg går gjennom partiet med Stockfish… et øyeblikk! 🔎</CoachBubble>
              <div className="xp-track"><div className="xp-fill" style={{ width: `${analysisPct}%` }} /></div>
              <p className="text-xl font-semibold">{analysisPct}%</p>
            </div>
          )}

          {phase === "review" && (
            <>
              {result && <MikeCompanion mode="review" line={reviewLine(mistakes, result.outcome)} context={reviewContext(mistakes, result.outcome, opponent)} />}
              {result && <CoachDebrief mistakes={mistakes} outcome={result.outcome} orientation={orientation} />}
              {review && <GameReview review={review} orientation={orientation} names={player === "w" ? { w: avatarName(getProgress()), b: title } : { w: title, b: avatarName(getProgress()) }} />}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="" onClick={() => window.location.reload()}><RotateCcw /> Ny kamp</Button>
                <Link to="/" className="btn-game btn-ghost"><House /> Oversikt</Link>
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

