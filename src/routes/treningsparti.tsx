import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { ArrowLeft, Eye, Lightbulb, Pause, Play, RotateCcw, ShieldAlert, Square as Stop, Undo2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Board } from "@/components/Board";
import { CoachAvatar, CoachLabel } from "@/components/CoachAvatar";
import { CoachReview } from "@/components/CoachReview";
import { Button } from "@/components/ui/button";
import { getEngine } from "@/lib/engine";
import { analyseGame, type Mistake, type PlayedMove } from "@/lib/coach";
import { remainingDelay, searchTimeMs, thinkTimeMs } from "@/lib/think-time";
import { parseTimeControl, tcToMs } from "@/lib/tournament";
import { BOT_LEVELS, forkAfter, threats, type TrainingGame } from "@/lib/prep";
import { updatePrep } from "@/lib/prep-store";
import { useTrainer } from "@/lib/trainer-store";
import { dayKey } from "@/lib/rules";
import { play, unlockAudio } from "@/lib/sound";

type Search = { fen?: string | undefined; side: "w" | "b"; elo: number; tc: string; src: string };
const START = new Chess().fen();

export const Route = createFileRoute("/treningsparti")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    fen: typeof s["fen"] === "string" ? s["fen"] : undefined,
    side: s["side"] === "b" ? "b" : "w",
    elo: Number.isFinite(Number(s["elo"])) ? Number(s["elo"]) : 1550,
    tc: typeof s["tc"] === "string" ? s["tc"] : "none",
    src: typeof s["src"] === "string" ? s["src"].slice(0, 80) : "Treningsparti",
  }),
  head: () => ({
    meta: [
      { title: "Treningsparti med hjelp – Goblin Chess" },
      { name: "description", content: "Spill en stilling fra forberedelsen mot boten, med hjelp fra treneren." },
      { property: "og:title", content: "Treningsparti med hjelp – Goblin Chess" },
      { property: "og:description", content: "Øv på åpninger og sluttspill mot boten. Påvirker ikke ratingen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PracticeGame,
});

const safeFen = (f?: string) => { if (!f) return START; try { return new Chess(f).fen(); } catch { return START; } };
const clampElo = (e: number) => (BOT_LEVELS as readonly number[]).reduce((a, b) => (Math.abs(b - e) < Math.abs(a - e) ? b : a), 1550);
const fmt = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const uciSan = (fen: string, uci: string) => { try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" }).san; } catch { return null; } };

type Help = { title: string; lines: string[]; general?: boolean; arrow?: [string, string] };
type Over = { result: TrainingGame["result"]; reason: string };

function PracticeGame() {
  const search = Route.useSearch();
  const router = useRouter();
  const startFen = useMemo(() => safeFen(search.fen), [search.fen]);
  const player = search.side;
  const elo = clampElo(search.elo);
  const tc = parseTimeControl(search.tc === "none" ? "none" : search.tc);
  const tcCfg = search.tc === "none" ? null : tcToMs(tc);
  const coach = useTrainer().coach;

  const game = useRef(new Chess(startFen));
  const [fen, setFen] = useState(startFen);
  const [moves, setMoves] = useState<PlayedMove[]>([]);
  const [over, setOver] = useState<Over | null>(null);
  const [paused, setPaused] = useState(false);
  const [helpPause, setHelpPause] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [engineError, setEngineError] = useState(false);
  const [help, setHelp] = useState<Help | null>(null);
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpUsed, setHelpUsed] = useState(0);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [restart, setRestart] = useState(0);
  const [phase, setPhase] = useState<"play" | "analysing" | "review">("play");
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [pct, setPct] = useState(0);
  const [clock, setClock] = useState<[number, number]>(tcCfg ? [tcCfg[0], tcCfg[0]] : [0, 0]);
  const clockRef = useRef(clock); clockRef.current = clock;
  const turnSession = useRef(0);
  const helpReq = useRef(0);
  const saved = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; const h = helpReq, t = turnSession; return () => { mounted.current = false; t.current++; h.current++; }; }, []);

  useEffect(() => {
    const e = getEngine();
    e.setStrength(elo).then(() => e.newGame()).catch(() => setEngineError(true));
  }, [elo, restart]);

  const finish = useCallback((o: Over) => {
    setOver(o);
    play(o.result === "win" ? "win" : o.result === "loss" ? "lose" : "correct");
    if (saved.current) return;
    saved.current = true;
    const rec: TrainingGame = { id: crypto.randomUUID(), day: dayKey(new Date()), source: search.src, elo, result: o.result, plies: game.current.history().length, helpUsed };
    updatePrep((s) => ({ ...s, games: [...s.games, rec].slice(-30) }));
  }, [search.src, elo, helpUsed]);

  const checkEnd = useCallback(() => {
    const g = game.current;
    if (g.isCheckmate()) return finish({ result: g.turn() === player ? "loss" : "win", reason: "Sjakk matt." });
    if (g.isStalemate()) return finish({ result: "draw", reason: "Patt." });
    if (g.isThreefoldRepetition()) return finish({ result: "draw", reason: "Trekkgjentakelse." });
    if (g.isInsufficientMaterial()) return finish({ result: "draw", reason: "For lite materiell." });
    if (g.isDraw()) return finish({ result: "draw", reason: "Remis." });
  }, [finish, player]);

  const applyMove = useCallback((from: string, to: string, promotion = "q") => {
    const g = game.current;
    const fenBefore = g.fen();
    let mv;
    try { mv = g.move({ from, to, promotion }); } catch { return false; }
    setMoves((m) => [...m, { fenBefore, uci: mv.from + mv.to + (mv.promotion ?? ""), san: mv.san, color: mv.color }]);
    setFen(g.fen());
    setHelp(null); helpReq.current++; setHelpBusy(false); setHelpPause(false);
    if (tcCfg?.[1]) { const inc = tcCfg[1]; setClock((c) => (mv.color === "w" ? [c[0] + inc, c[1]] : [c[0], c[1] + inc])); }
    play(g.inCheck() ? "check" : mv.captured ? "capture" : "move");
    checkEnd();
    return true;
  }, [checkEnd, tcCfg]);

  // Bot turn: one cancellable job; stale FEN results are dropped.
  useEffect(() => {
    if (over || paused || game.current.turn() === player || game.current.isGameOver()) return;
    const session = ++turnSession.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const alive = () => mounted.current && turnSession.current === session;
    setThinking(true);
    const t0 = performance.now();
    const g = game.current, fenNow = g.fen(), legal = g.moves({ verbose: true });
    const remaining = tcCfg ? clockRef.current[player === "w" ? 1 : 0] : null;
    const target = thinkTimeMs({
      elo, tempo: undefined, ply: g.history().length, legalMoves: legal.length, inCheck: g.inCheck(),
      captures: legal.filter((m) => m.captured).length, promotions: legal.filter((m) => m.promotion).length,
      pieces: fenNow.split(" ")[0]!.replace(/[^a-zA-Z]/g, "").length, remainingMs: remaining, initialMs: tcCfg ? tcCfg[0] : null, incrementMs: tcCfg ? tcCfg[1] : 0,
    });
    getEngine().bestMove(fenNow, searchTimeMs(remaining, target)).then((uci) => {
      if (!alive() || game.current.fen() !== fenNow || !uci || uci === "(none)") return;
      timer = setTimeout(() => {
        if (!alive() || game.current.fen() !== fenNow) return;
        applyMove(uci.slice(0, 2), uci.slice(2, 4), uci[4] || "q");
        setThinking(false);
      }, remainingDelay(target, performance.now() - t0));
    }).catch(() => { if (alive()) { setEngineError(true); setThinking(false); } });
    return () => { turnSession.current++; if (timer) clearTimeout(timer); setThinking(false); };
  }, [fen, over, paused, player, applyMove, tcCfg, elo, restart]);

  // Clock (stops on pause and explicit help pause)
  useEffect(() => {
    if (!tcCfg || over || paused || helpPause || moves.length < 1) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now(), dt = now - last; last = now;
      const side = game.current.turn() === "w" ? 0 : 1;
      setClock((c) => { const n = [...c] as [number, number]; n[side] = Math.max(0, n[side] - dt); return n; });
    }, 200);
    return () => clearInterval(id);
  }, [tcCfg, over, paused, helpPause, moves.length]);
  useEffect(() => {
    if (!tcCfg || over) return;
    const pi = player === "w" ? 0 : 1;
    if (clock[pi] <= 0) finish({ result: "loss", reason: "Tiden gikk ut." });
    else if (clock[1 - pi]! <= 0) finish({ result: "win", reason: "Boten gikk tom for tid." });
  }, [clock, tcCfg, over, player, finish]);

  const myTurn = !over && !paused && game.current.turn() === player;
  const onMove = (from: string, to: string) => {
    if (!myTurn) return false;
    const isPromo = game.current.moves({ verbose: true }).some((m) => m.from === from && m.to === to && m.promotion);
    if (isPromo) { setPromo({ from, to }); return false; }
    return applyMove(from, to);
  };

  const voice = (calm: string, active: string) => (coach === "hikaru" ? active : calm);
  const askHelp = async (kind: "threat" | "hint" | "show") => {
    if (!myTurn) return;
    const id = ++helpReq.current;
    const fenNow = game.current.fen();
    setHelpUsed((n) => n + 1);
    if (tcCfg) setHelpPause(true);
    setHelpBusy(true);
    const fresh = () => { const ok = mounted.current && helpReq.current === id && game.current.fen() === fenNow; if (!ok) console.warn("stale", mounted.current, helpReq.current, id); return ok; };
    try {
      if (kind === "threat") {
        const t = threats(fenNow);
        const lines = [...t.list];
        if (t.flipped) {
          const r = await getEngine().analyseFull(t.flipped, 10, elo);
          if (!fresh()) return;
          const san = r.bestMove ? uciSan(t.flipped, r.bestMove) : null;
          if (san) lines.push(`Motoren: Hvis boten fikk trekke nå, ville den spilt ${san}.`);
        }
        if (!lines.length) lines.push("Jeg finner ingen sjakk eller billig slag for boten akkurat nå.");
        setHelp({ title: voice("Hva truer boten? La oss se rolig på det.", "Hva truer boten? Sjekk dette!"), lines });
      } else {
        const r = await getEngine().analyseFull(fenNow, 12, elo);
        if (!fresh()) return;
        const best = r.bestMove;
        const c = new Chess(fenNow);
        let mv;
        try { mv = c.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] ?? "q" }); } catch { mv = null; }
        if (!mv) { setHelp({ title: "Generelt råd", general: true, lines: ["Sjekk sjakker, slag og trusler for begge sider."] }); return; }
        const fork = forkAfter(fenNow, best);
        const evalTxt = r.mate != null ? (r.mate > 0 ? `Motoren ser matt i ${r.mate}.` : `Motoren ser matt mot deg i ${-r.mate}. Forsvar deg.`) : r.cp != null ? `Motoren vurderer stillingen til ${(r.cp / 100 > 0 ? "+" : "") + (r.cp / 100).toFixed(1)} for deg.` : "";
        const NAME: Record<string, string> = { p: "bonden", n: "springeren", b: "løperen", r: "tårnet", q: "dronningen", k: "kongen" };
        if (kind === "hint") {
          const lines = [fork ? `Det finnes en gaffel: én brikke kan angripe ${fork.targets.join(" og ")}.` : voice(`Se på ${NAME[mv.piece]} på ${mv.from}. Hvor står den best?`, `Se på ${NAME[mv.piece]} på ${mv.from}. Hvilket trekk lager mest trøbbel?`)];
          if (r.mate != null && r.mate > 0) lines.push(evalTxt);
          setHelp({ title: voice("Et lite hint", "Hint!"), lines });
        } else {
          const lines = [`Motorens forslag: ${mv.san}.`, evalTxt];
          if (fork) lines.push(`Etter ${mv.san} angriper ${NAME[mv.piece]} på ${fork.square} ${fork.targets.join(" og ")}.`);
          if (r.pv.length > 1) { const cc = new Chess(fenNow); const sans: string[] = []; for (const u of r.pv.slice(0, 4)) { try { sans.push(cc.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] ?? "q" }).san); } catch { break; } } lines.push(`Linjen motoren venter: ${sans.join(" ")}.`); }
          setHelp({ title: "Vis forslag", lines: lines.filter(Boolean), arrow: [mv.from, mv.to] });
        }
      }
    } catch { if (fresh()) setHelp({ title: "Motoren svarer ikke", general: true, lines: ["Generelt råd: Sjekk sjakker, slag og trusler."] }); }
    finally { if (helpReq.current === id) setHelpBusy(false); }
  };

  const takeBack = () => {
    const g = game.current;
    if (over || moves.length === 0) return;
    turnSession.current++; helpReq.current++;
    let n = 0;
    const hist = [...moves];
    while (hist.length) { const l = hist.pop()!; n++; if (l.color === player) break; }
    for (let i = 0; i < n; i++) g.undo();
    setMoves(hist); setFen(g.fen()); setHelp(null); setHelpBusy(false); setThinking(false);
  };
  const doRestart = () => {
    turnSession.current++; helpReq.current++; saved.current = false;
    game.current = new Chess(startFen);
    setFen(startFen); setMoves([]); setOver(null); setPaused(false); setHelpPause(false); setHelp(null); setHelpUsed(0); setPhase("play"); setMistakes([]);
    setClock(tcCfg ? [tcCfg[0], tcCfg[0]] : [0, 0]); setRestart((r) => r + 1);
  };
  const analyse = async () => {
    setPhase("analysing"); setPct(0);
    try { const res = await analyseGame(getEngine(), moves, game.current.fen(), player, (d, t) => setPct(Math.round((d / t) * 100))); if (mounted.current) { setMistakes(res); setPhase("review"); } }
    catch { if (mounted.current) { setEngineError(true); setPhase("play"); } }
    finally { void getEngine().setStrength(elo); }
  };

  const orientation = player === "w" ? "white" : "black";
  const last = moves.length ? ([moves[moves.length - 1]!.uci.slice(0, 2), moves[moves.length - 1]!.uci.slice(2, 4)] as [string, string]) : null;
  const pi = player === "w" ? 0 : 1;
  const resultText = over ? { win: "Du vant!", draw: "Remis.", loss: "Boten vant denne gangen.", stopped: "Partiet er avsluttet." }[over.result] : "";

  return (
    <main className="page-layout" onPointerDown={unlockAudio}>
      <AppHeader title="Treningsparti" />
      <p className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm"><strong>Treningsparti med hjelp.</strong> Påvirker ikke ratingen. {search.src} · Bot {elo}{elo === 1200 ? " (motorens svakeste nivå)" : ""}. Botstyrken er appens egen og ikke en FIDE-rating.</p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="space-y-3">
          {tcCfg && <ClockRow label={`Bot ${elo}`} ms={clock[1 - pi]!} active={!over && game.current.turn() !== player} />}
          <div className="relative">
            <Board fen={fen} orientation={orientation} onMove={onMove} canMove={myTurn && !promo} lastMove={last} arrows={help?.arrow ? [{ startSquare: help.arrow[0], endSquare: help.arrow[1], color: "rgba(120,200,80,0.8)" }] : []} />
            {promo && (
              <div role="dialog" aria-label="Velg brikke" className="absolute inset-0 flex items-center justify-center bg-background/70">
                <div className="card-game flex gap-2 p-3">
                  {(["q", "r", "b", "n"] as const).map((p) => (
                    <Button key={p} size="lg" variant="outline" aria-label={{ q: "Dronning", r: "Tårn", b: "Løper", n: "Springer" }[p]} onClick={() => { applyMove(promo.from, promo.to, p); setPromo(null); }} className="text-2xl">
                      {{ q: "♛", r: "♜", b: "♝", n: "♞" }[p]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {tcCfg && <ClockRow label="Du" ms={clock[pi]!} active={!over && game.current.turn() === player} />}
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {over ? `${resultText} ${over.reason}` : paused ? "Pause." : thinking ? "Boten tenker …" : myTurn ? "Ditt trekk." : ""}
            {engineError && " Sjakkmotoren svarte ikke. Prøv omstart."}
          </p>
          <div className="flex flex-wrap gap-2">
            {!over && <Button variant="outline" onClick={() => setPaused((p) => !p)}>{paused ? <><Play /> Fortsett</> : <><Pause /> Pause</>}</Button>}
            <Button variant="outline" onClick={doRestart}><RotateCcw /> Omstart</Button>
            {!over && <Button variant="outline" onClick={() => finish({ result: "stopped", reason: "Du avsluttet." })}><Stop /> Avslutt</Button>}
            <Button variant="ghost" onClick={() => router.history.back()}><ArrowLeft /> Tilbake</Button>
          </div>
        </div>

        <div className="space-y-4">
          {!over && (
            <section className="card-game p-4" aria-label="Trenerhjelp">
              <div className="flex items-center gap-3"><CoachAvatar className="size-12" /><div><p className="font-semibold">Trenerhjelp</p><CoachLabel /></div></div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" disabled={!myTurn || helpBusy} onClick={() => askHelp("threat")}><ShieldAlert /> Hva truer boten?</Button>
                <Button variant="outline" disabled={!myTurn || helpBusy} onClick={() => askHelp("hint")}><Lightbulb /> Gi et hint</Button>
                <Button variant="outline" disabled={!myTurn || helpBusy} onClick={() => askHelp("show")}><Eye /> Vis forslag</Button>
                <Button variant="outline" disabled={moves.every((m) => m.color !== player) || helpBusy} onClick={takeBack}><Undo2 /> Prøv trekket igjen</Button>
              </div>
              {helpPause && tcCfg && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-muted p-3 text-sm">
                  <span>Klokka står på pause mens du får hjelp.</span>
                  <Button size="sm" onClick={() => setHelpPause(false)}>Start klokka</Button>
                </div>
              )}
              {helpBusy && <p className="mt-3 text-sm text-muted-foreground">Treneren ser på stillingen …</p>}
              {help && (
                <div className="speech mt-3 text-sm leading-relaxed" aria-live="polite">
                  <p className="font-semibold">{help.title}</p>
                  {help.general && <p className="text-xs text-muted-foreground">Generelt prinsipp, ikke regnet ut for denne stillingen.</p>}
                  <ul className="mt-1 space-y-1">{help.lines.map((l) => <li key={l}>{l}</li>)}</ul>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Hjelpen finnes bare i treningspartier. Vanlige partier og stigen er uten hjelp.</p>
            </section>
          )}
          {over && phase === "play" && (
            <section className="card-game space-y-3 p-4">
              <p className="section-title">{resultText}</p>
              <p className="text-sm text-muted-foreground">{over.reason} {moves.length} halvtrekk. Hjelp brukt {helpUsed} {helpUsed === 1 ? "gang" : "ganger"}.</p>
              {moves.some((m) => m.color === player) && <Button onClick={analyse}>Kort gjennomgang med motoren</Button>}
              <Button variant="outline" asChild><Link to="/turnering">Tilbake til forberedelsen</Link></Button>
            </section>
          )}
          {phase === "analysing" && <p className="text-sm">Motoren ser gjennom partiet … {pct} %</p>}
          {phase === "review" && <CoachReview mistakes={mistakes} orientation={orientation} />}
          {moves.length > 0 && <p className="text-xs text-muted-foreground break-words">Trekk: {moves.map((m) => m.san).join(" ")}</p>}
        </div>
      </div>
    </main>
  );
}

function ClockRow({ label, ms, active }: { label: string; ms: number; active: boolean }) {
  return <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${active ? "border-primary bg-primary/10" : "border-border"}`}><span>{label}</span><span className="font-mono text-lg tabular-nums">{fmt(ms)}</span></div>;
}
