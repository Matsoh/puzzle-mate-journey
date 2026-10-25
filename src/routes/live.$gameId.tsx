import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Flag, Handshake, Search, Send, Swords, House, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Board } from "@/components/Board";
import { usePremoves } from "@/components/usePremoves";
import { GameReview } from "@/components/GameReview";
import { MikeCompanion } from "@/components/MikeCompanion";
import { AvatarImage } from "@/components/PlayerAvatar";
import { getEngine } from "@/lib/engine";
import { reviewGame, type GameReview as Review, type PlayedMove } from "@/lib/coach";
import { gameContext, gameReaction, reviewContext, reviewLine } from "@/lib/mike-game";
import { markActive, today, updateProgress, withCredit, withHistoryPoint, useProgress } from "@/lib/progress";
import { withDayGame } from "@/lib/quests";
import { celebrateBadges, celebrateDiff } from "@/lib/celebrate";
import { applyBadges } from "@/lib/badges";
import { XP } from "@/lib/rules";
import { play, unlockAudio } from "@/lib/sound";
import { avatarName, type PartKey } from "@/lib/avatar";
import {
  applyUci, createChallenge, fetchChat, fetchGame, fetchProfiles, fmtClock, gameAction, liveClocks, liveRatingChange, myColor, myUserId, onlineAvailable, outcomeFor, playMove, sendChat, sideToMove, subscribeGame, tcLabel, unsubscribe, TIME_CONTROLS,
  type ChatMessage, type LiveGame, type Profile,
} from "@/lib/online";
import { refreshOnline } from "@/lib/online-store";

export const Route = createFileRoute("/live/$gameId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Parti mot venn – Goblin Chess" }] }),
  component: LivePage,
});

type Phase = "loading" | "missing" | "playing" | "over" | "analysing" | "review";

function LivePage() {
  const { gameId } = Route.useParams();
  const me = myUserId();
  const p = useProgress();
  const [g, setG] = useState<LiveGame | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [now, setNow] = useState(Date.now());
  const skew = useRef(0);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [pct, setPct] = useState(0);
  const [reward, setReward] = useState<{ delta: number; xp: number } | null>(null);
  const claimed = useRef(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  // ---- load + subscribe ----
  useEffect(() => {
    if (!onlineAvailable()) return;
    let alive = true;
    void (async () => {
      try {
        const row = await fetchGame(gameId);
        if (!alive) return;
        if (!row) { setPhase("missing"); return; }
        setG(row);
        setPhase(row.status === "playing" ? "playing" : "over");
        const [pr, msgs] = await Promise.all([fetchProfiles([row.white, row.black]), fetchChat(gameId)]);
        if (!alive) return;
        setProfiles(pr); setChat(msgs);
      } catch { if (alive) setPhase("missing"); }
    })();
    const ch = subscribeGame(gameId, (row) => { setG(row); if (row.status === "finished") setPhase((ph) => (ph === "playing" || ph === "loading" ? "over" : ph)); }, (m) => { setChat((c) => (c.some((x) => x.id === m.id) ? c : [...c, m])); if (m.user_id !== me) play("move"); });
    // Safety net: realtime can drop; re-fetch while the game runs.
    const poll = setInterval(() => { void fetchGame(gameId).then((row) => { if (row && alive) setG((cur) => (!cur || row.moves.length > cur.moves.length || row.status !== cur.status || row.draw_offer !== cur.draw_offer ? row : cur)); }); }, 4000);
    return () => { alive = false; unsubscribe(ch); clearInterval(poll); };
  }, [gameId, me]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ block: "end" }); }, [chat.length]);

  // ---- clocks ----
  const playing = g?.status === "playing";
  useEffect(() => { if (!playing) return; const id = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(id); }, [playing]);
  const clocks = g ? liveClocks(g, now, skew.current) : { w: 0, b: 0 };
  const color = g ? myColor(g, me) : null;
  const toMove = g ? sideToMove(g) : "w";
  useEffect(() => {
    if (!g || !playing || !color || claimed.current) return;
    const mine = clocks[color], theirs = clocks[color === "w" ? "b" : "w"];
    if ((toMove === color && mine <= 0) || (toMove !== color && theirs <= -1500)) {
      claimed.current = true;
      void gameAction(g.id, "claim_timeout").then(setG).finally(() => { claimed.current = false; });
    }
  }, [clocks, g, playing, color, toMove]);

  // ---- derived chess state ----
  const played = useMemo<PlayedMove[]>(() => {
    if (!g) return [];
    const c = new Chess();
    const out: PlayedMove[] = [];
    for (const u of g.moves) {
      const fenBefore = c.fen();
      try { const m = c.move(u.length > 4 ? { from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4]! } : { from: u.slice(0, 2), to: u.slice(2, 4) }); out.push({ fenBefore, uci: u, san: m.san, color: m.color }); } catch { break; }
    }
    return out;
  }, [g]);
  const lastMove = g && g.moves.length ? ([g.moves[g.moves.length - 1]!.slice(0, 2), g.moves[g.moves.length - 1]!.slice(2, 4)] as [string, string]) : null;
  const orientation = color === "b" ? "black" : "white";
  const oppId = g ? (color === "b" ? g.white : g.black) : null;
  const oppName = oppId ? profiles[oppId]?.name ?? "Venn" : "";
  const myName = avatarName(p);
  const names = g ? { w: profiles[g.white]?.name ?? "Hvit", b: profiles[g.black]?.name ?? "Svart" } : { w: "Hvit", b: "Svart" };

  // ---- moves ----
  const submit = useCallback(async (from: string, to: string, promotion?: string) => {
    if (!g || !color || toMove !== color) return false;
    const uci = from + to + (promotion ?? "");
    const r = applyUci(g.fen, uci);
    if (!r) return false;
    const plies = g.moves.length;
    // optimistic
    setG({ ...g, moves: [...g.moves, uci], sans: [...g.sans, r.san], fen: r.fen, last_move_at: new Date().toISOString(), draw_offer: null });
    play(r.san.includes("x") ? "capture" : "move");
    try {
      const row = await playMove(g.id, plies, uci, r.san, r.fen, r.end);
      skew.current = Date.now() - new Date(row.last_move_at).getTime();
      setG(row);
      if (row.status === "finished") setPhase("over");
    } catch {
      const row = await fetchGame(g.id).catch(() => null);
      if (row) setG(row);
    }
    return true;
  }, [g, color, toMove]);

  const premoves = usePremoves({ fen: g?.fen ?? "", myTurn: !!g && !!color && toMove === color && !promo, active: playing && !!color, play: (f, t, pr) => submit(f, t, pr) });

  const onMove = (from: string, to: string) => {
    if (!g || !color || toMove !== color || promo) return false;
    const c = new Chess(g.fen);
    const legal = c.moves({ verbose: true }).find((m) => m.from === from && m.to === to);
    if (!legal) return false;
    if (legal.promotion) { setPromo({ from, to }); return false; }
    void submit(from, to);
    return true;
  };

  // ---- result: pay out once ----
  const outcome = g && color ? outcomeFor(g, color) : null;
  useEffect(() => {
    if (!g || g.status !== "finished" || !color || !oppId) return;
    const theirs = profiles[oppId]?.rating;
    if (theirs === undefined) return;
    const o = outcome;
    if (!o) return; // aborted
    const id = `live:${g.id}`;
    updateProgress((p0) => {
      if (p0.credits[id] !== undefined) return p0;
      const score = o === "win" ? 1 : o === "draw" ? 0.5 : 0;
      const delta = liveRatingChange(p0.rating, theirs, score);
      const xp = o === "win" ? XP.gameWin + 20 : o === "draw" ? XP.gameDraw + 10 : XP.gameLoss + 10;
      let n = { ...p0, rating: p0.rating + delta, games: p0.games + 1, wins: p0.wins + (o === "win" ? 1 : 0), draws: p0.draws + (o === "draw" ? 1 : 0) };
      n = withCredit(withDayGame(withHistoryPoint(markActive(n)), today(), o === "win"), id, xp);
      const b = applyBadges(n);
      celebrateDiff(p0, b.progress); celebrateBadges(b.earned);
      setReward({ delta, xp });
      play(o === "win" ? "win" : o === "loss" ? "lose" : "correct");
      return b.progress;
    });
    void refreshOnline();
  }, [g, color, oppId, profiles, outcome]);

  const analyse = async () => {
    if (!g || !color) return;
    setPhase("analysing"); setPct(0);
    try {
      const res = await reviewGame(getEngine(), played, g.fen, color, (d, t) => setPct(Math.round((d / t) * 100)));
      setReview(res); setPhase("review");
    } catch { setPhase("over"); }
  };
  const rematch = async () => {
    if (!g || !oppId) return;
    const tc = TIME_CONTROLS.find((t) => t.initial === g.initial_ms && t.inc === g.inc_ms)?.id ?? "10+0";
    await createChallenge(oppId, tc, color === "w" ? "b" : "w").catch(() => null);
    await refreshOnline();
  };

  const snapshot = g ? { fen: g.fen, moves: played, player: color ?? "w", myClockMs: color ? clocks[color] : null } : null;
  const line = snapshot && playing ? gameReaction(snapshot) : null;

  if (!onlineAvailable()) return <main className="page-layout page-narrow"><p className="text-sm text-muted-foreground">Nettspill finnes bare i den publiserte appen.</p></main>;
  if (phase === "loading") return <main className="page-layout page-narrow"><p role="status" className="text-sm text-muted-foreground">Henter partiet …</p></main>;
  if (phase === "missing" || !g) return <main className="page-layout page-narrow"><p className="text-sm">Fant ikke partiet.</p><Link to="/venner" className="btn-game mt-4 inline-flex">Til venner</Link></main>;

  const spectating = !color;
  const clockCls = (side: "w" | "b") => `live-clock ${playing && toMove === side ? "is-active" : ""} ${playing && clocks[side] < 20_000 ? "is-low" : ""}`;
  const bar = (side: "w" | "b") => {
    const uid = side === "w" ? g.white : g.black;
    const pr = profiles[uid];
    return (
      <div className={`mx-auto flex w-full max-w-[min(94vw,68vh)] items-center justify-between gap-3 rounded-xl border px-3 py-2 ${playing && toMove === side ? "border-primary bg-primary/10" : "border-border bg-card/60"}`}>
        <span className="flex min-w-0 items-center gap-2">
          {pr?.avatar ? <AvatarImage parts={pr.avatar as unknown as Record<PartKey, string>} className="size-9" /> : null}
          <span className="min-w-0"><span className="block truncate font-semibold">{uid === me ? myName : pr?.name ?? "Venn"}</span><span className="block text-xs text-muted-foreground">{pr?.rating ?? "–"}</span></span>
        </span>
        <span className={clockCls(side)}>{fmtClock(clocks[side])}</span>
      </div>
    );
  };
  const top = color === "b" ? "w" : "b";
  const bottom = color === "b" ? "b" : "w";

  return (
    <main className="page-layout" onPointerDown={unlockAudio}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-2" aria-label="Brett">
          {bar(top)}
          <div className="relative mx-auto w-full max-w-[min(94vw,68vh)]">
            <Board fen={g.fen} orientation={orientation} onMove={onMove} canMove={playing && !spectating && toMove === color && !promo} lastMove={lastMove} premove={playing && !spectating ? premoves : undefined} />
            {promo && (
              <div role="dialog" aria-label="Velg brikke" className="absolute inset-0 flex items-center justify-center bg-background/70">
                <div className="card-game flex gap-2 p-3">
                  {(["q", "r", "b", "n"] as const).map((pc) => (
                    <Button key={pc} size="lg" variant="outline" aria-label={{ q: "Dronning", r: "Tårn", b: "Løper", n: "Springer" }[pc]} className="text-2xl" onClick={() => { void submit(promo.from, promo.to, pc); setPromo(null); }}>
                      {color === "w" ? { q: "♕", r: "♖", b: "♗", n: "♘" }[pc] : { q: "♛", r: "♜", b: "♝", n: "♞" }[pc]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {bar(bottom)}
          <p className="text-center text-xs text-muted-foreground">{tcLabel(g.initial_ms, g.inc_ms)} · {spectating ? "Du ser på" : playing ? (toMove === color ? "Ditt trekk" : `${oppName} tenker …`) : g.reason ?? "Ferdig"}</p>

          {playing && !spectating && (
            <div className="mx-auto flex w-full max-w-[min(94vw,68vh)] flex-wrap justify-center gap-2">
              {g.draw_offer && g.draw_offer !== me ? <Button onClick={() => void gameAction(g.id, "accept_draw").then(setG)}><Handshake /> Godta remis</Button>
                : <Button variant="outline" disabled={g.draw_offer === me} onClick={() => void gameAction(g.id, "offer_draw").then(setG)}><Handshake /> {g.draw_offer === me ? "Remis tilbudt" : "Tilby remis"}</Button>}
              {g.moves.length < 2 ? <Button variant="outline" onClick={() => void gameAction(g.id, "abort").then(setG)}>Avbryt</Button>
                : confirmResign ? <><Button variant="destructive" onClick={() => void gameAction(g.id, "resign").then((r) => { setG(r); setConfirmResign(false); })}>Ja, gi opp</Button><Button variant="outline" onClick={() => setConfirmResign(false)}>Nei</Button></>
                : <Button variant="outline" onClick={() => setConfirmResign(true)}><Flag /> Gi opp</Button>}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {playing && !spectating && <MikeCompanion mode="game" compact line={line} context={`${gameContext({ ...snapshot!, tc: tcLabel(g.initial_ms, g.inc_ms) })}\nThis is a LIVE game against a real friend (${oppName}, rating ${profiles[oppId ?? ""]?.rating ?? "?"}). Never suggest moves.`} />}

          {(phase === "over" || phase === "analysing" || phase === "review") && (
            <section className="card-game p-4 text-center" aria-label="Resultat">
              <p className="eyebrow">{g.reason ?? "Ferdig"}</p>
              <h2 className="text-2xl font-black">{spectating ? (g.result === "d" ? "Remis" : g.result === "w" ? `${names.w} vant` : g.result === "b" ? `${names.b} vant` : "Avbrutt") : outcome === "win" ? "Du vant! 🎉" : outcome === "draw" ? "Remis" : outcome === "loss" ? "Tap" : "Avbrutt"}</h2>
              {reward && <p className="mt-1 text-sm text-muted-foreground">Rating {reward.delta >= 0 ? "+" : ""}{reward.delta} · +{reward.xp} XP</p>}
              {!spectating && outcome && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {phase === "over" && g.moves.length >= 2 && <Button onClick={() => void analyse()}><Search /> Analyser</Button>}
                  <Button variant="outline" onClick={() => void rematch()}><RotateCcw /> Revansj</Button>
                </div>
              )}
              {phase === "analysing" && <div className="mt-3"><div className="xp-track"><div className="xp-fill" style={{ width: `${pct}%` }} /></div><p className="mt-1 text-sm">{pct}%</p></div>}
              <Link to="/venner" className="mt-3 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"><House className="mr-1 size-4" /> Til venner</Link>
            </section>
          )}

          {phase === "review" && review && color && (
            <>
              <MikeCompanion mode="review" compact line={reviewLine(review.mistakes, outcome ?? "draw")} context={`Live game vs friend ${oppName}. ${reviewContext(review.mistakes, outcome ?? "draw")}`} />
              <GameReview review={review} orientation={orientation} names={names} />
            </>
          )}

          {!spectating && (
            <section aria-label="Chat" className="space-y-2">
              <p className="eyebrow">Chat med {oppName}</p>
              <div className="live-chat" role="log" aria-live="polite">
                {chat.length === 0 && <p className="text-xs text-muted-foreground">Si hei!</p>}
                {chat.map((m) => <div key={m.id} className={`live-chat__msg ${m.user_id === me ? "is-me" : ""}`}>{m.text}<small>{m.user_id === me ? myName : oppName}</small></div>)}
                <div ref={chatEnd} />
              </div>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = text; setText(""); void sendChat(g.id, t).catch(() => setText(t)); }}>
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Skriv en melding …" aria-label="Melding" className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-base" />
                <Button type="submit" size="icon" aria-label="Send" disabled={!text.trim()}><Send /></Button>
              </form>
              <div className="flex flex-wrap gap-1">{["Hei!", "Bra parti!", "GG", "Revansj?", "Heldig!"].map((q) => <button key={q} type="button" className="chip text-xs" onClick={() => void sendChat(g.id, q)}>{q}</button>)}</div>
            </section>
          )}
          {spectating && <p className="text-xs text-muted-foreground"><Swords className="mr-1 inline size-3" /> Du ser på et parti mellom venner.</p>}
        </aside>
      </div>
    </main>
  );
}
