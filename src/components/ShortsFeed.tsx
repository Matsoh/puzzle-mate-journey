import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mike } from "@/components/Mike";
import { PuzzleSet } from "@/components/school/PuzzleSet";
import { loadApi, type YTPlayer } from "@/components/YouTube";
import { SHORT_IDS } from "@/data/gotham-shorts";
import { FEED_CAP, FEED_PAUSE_EVERY, feedOf, feedOrder, feedToday, pauseDue, shortWatched, withFeedPause, withFeedShort } from "@/lib/cinema";
import { classOf, pickItems } from "@/lib/curriculum";
import type { TrainingItem } from "@/lib/adaptive";
import { getProgress, updateProgress, useProgress } from "@/lib/progress";
import { play } from "@/lib/sound";

/**
 * Gotham Shorts: a full-screen scroll feed of the channel's shorts. Swipe up
 * for the next one; a short that has actually played pays one coin the first
 * time (daily cap), and every eighth short Mike calls a one-puzzle break.
 * One YouTube player is reused for the whole feed, so after the first tap on
 * the video the next shorts start by themselves (also on iPad/iPhone).
 */
export function ShortsFeed({ day, onClose }: { day: string; onClose: () => void }) {
  const p = useProgress();
  const today = feedToday(p, day);
  // Fixed for the session: unseen shorts first, newest first.
  const order = useMemo(() => feedOrder(SHORT_IDS, feedOf(getProgress()).seen, day), [day]);
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  /** The gesture layer over the video; off whenever the player needs a real tap. */
  const [armed, setArmed] = useState(false);
  const [pop, setPop] = useState<{ n: number; text: string } | null>(null);
  const [slide, setSlide] = useState<"up" | "down" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pause, setPause] = useState<{ item: TrainingItem | undefined; result: { ok: boolean; paid: number } | null } | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const played = useRef(0);
  const counted = useRef(false);
  const lastTick = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errors = useRef(0);
  const playingRef = useRef(false);
  const pauseRef = useRef(false);
  pauseRef.current = pause !== null;

  const count = () => {
    if (counted.current) return;
    counted.current = true;
    const id = order[idxRef.current];
    if (!id) return;
    let paid = 0;
    updateProgress((s) => { const r = withFeedShort(s, id, day); paid = r.paid; return r.p; });
    if (paid) { play("correct"); setPop((x) => ({ n: (x?.n ?? 0) + 1, text: "+1 🪙" })); }
  };
  const stopTimer = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };
  const guard = (ms: number) => {
    if (watchdog.current) clearTimeout(watchdog.current);
    // Not playing in time (autoplay refused, typically iOS): hand the video back so a real tap can start it.
    watchdog.current = setTimeout(() => { if (!playingRef.current) setArmed(false); }, ms);
  };
  const show = (i: number, dir: "up" | "down") => {
    const n = order.length;
    if (!n) return;
    const next = ((i % n) + n) % n;
    idxRef.current = next;
    setIdx(next);
    played.current = 0;
    counted.current = false;
    setSlide(dir);
    setTimeout(() => setSlide(null), 280);
    try { player.current?.loadVideoById(order[next]!); } catch { /* player not ready */ }
    guard(4000);
  };
  const go = (delta: number) => {
    if (pauseRef.current || !player.current) return;
    if (delta > 0 && pauseDue(getProgress(), day)) {
      try { player.current.pauseVideo(); } catch { /* ignore */ }
      const prog = getProgress();
      const tactics = classOf(prog).tactics;
      const n = feedToday(prog, day).pauses;
      setPause({ item: pickItems(tactics[n % tactics.length] ?? "fork", 1, day, `feed${n}`)[0], result: null });
      return;
    }
    show(idxRef.current + delta, delta > 0 ? "up" : "down");
  };
  const toggle = () => {
    const pl = player.current;
    if (!pl) return;
    try { if (playingRef.current) pl.pauseVideo(); else { pl.playVideo(); guard(1500); } } catch { /* ignore */ }
  };
  // Latest handlers for the long-lived player and key listeners.
  const fn = useRef({ go, toggle, show, count });
  fn.current = { go, toggle, show, count };

  useEffect(() => {
    const el = mountRef.current;
    if (!el || !order.length) return;
    let dead = false;
    const mount = document.createElement("div");
    el.replaceChildren(mount);
    loadApi().then((YT) => {
      if (dead) return;
      new YT.Player(mount, {
        host: "https://www.youtube-nocookie.com",
        videoId: order[0]!,
        playerVars: { playsinline: 1, controls: 0, rel: 0, fs: 0, disablekb: 1, iv_load_policy: 3, modestbranding: 1 },
        events: {
          onReady: (e) => { player.current = e.target; },
          onStateChange: (e) => {
            player.current = e.target;
            if (e.data === YT.PlayerState.PLAYING) {
              errors.current = 0;
              playingRef.current = true;
              setPlaying(true);
              setStarted(true);
              setArmed(true);
              if (watchdog.current) clearTimeout(watchdog.current);
              if (!timer.current) {
                lastTick.current = performance.now();
                timer.current = setInterval(() => {
                  const now = performance.now();
                  played.current += (now - lastTick.current) / 1000;
                  lastTick.current = now;
                  let dur = 0;
                  try { dur = e.target.getDuration(); } catch { /* ignore */ }
                  if (!counted.current && shortWatched(played.current, dur)) fn.current.count();
                }, 250);
              }
            } else {
              playingRef.current = false;
              setPlaying(false);
              stopTimer();
              // Shorts loop until he scrolls on.
              if (e.data === YT.PlayerState.ENDED) { try { e.target.seekTo(0, true); e.target.playVideo(); } catch { /* ignore */ } }
            }
          },
          onError: () => {
            errors.current += 1;
            if (errors.current >= 6) setErr("Fikk ikke spilt av shorts akkurat nå. Prøv igjen senere.");
            else setTimeout(() => { if (!dead) fn.current.show(idxRef.current + 1, "up"); }, 300);
          },
        },
      });
    }).catch((e: Error) => { if (!dead) setErr(e.message); });
    return () => {
      dead = true;
      stopTimer();
      if (watchdog.current) clearTimeout(watchdog.current);
      try { player.current?.destroy(); } catch { /* ignore */ }
      player.current = null;
      el.replaceChildren();
    };
  }, [order]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (pauseRef.current) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "j") { e.preventDefault(); fn.current.go(1); }
      else if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "k") { e.preventDefault(); fn.current.go(-1); }
      else if (e.key === " ") { e.preventDefault(); fn.current.toggle(); }
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [onClose]);

  // Swipe / tap on the gesture layer; wheel on desktop.
  const down = useRef<{ y: number; t: number } | null>(null);
  const lastWheel = useRef(0);
  const onUp = (y: number) => {
    const d = down.current;
    down.current = null;
    if (!d) return;
    const dy = y - d.y;
    if (dy <= -45) go(1);
    else if (dy >= 45) go(-1);
    else if (Math.abs(dy) < 12 && performance.now() - d.t < 500) toggle();
  };
  const onWheel = (dy: number) => {
    const now = performance.now();
    if (Math.abs(dy) < 30 || now - lastWheel.current < 700) return;
    lastWheel.current = now;
    go(dy > 0 ? 1 : -1);
  };

  const finishPause = (ok: boolean) => {
    let paid = 0;
    updateProgress((s) => { const r = withFeedPause(s, day, ok); paid = r.paid; return r.p; });
    if (ok) play("win");
    setPause((x) => (x ? { ...x, result: { ok, paid } } : x));
  };
  const resume = () => { setPause(null); pauseRef.current = false; show(idxRef.current + 1, "up"); };

  const capped = today.coins >= FEED_CAP;
  const toPause = Math.max(0, (today.pauses + 1) * FEED_PAUSE_EVERY - today.watched);
  return (
    <div className="feed" role="dialog" aria-modal="true" aria-label="Gotham Shorts" data-testid="feed" onWheel={(e) => onWheel(e.deltaY)}>
      <div className="feed__top">
        <button type="button" className="feed__btn" onClick={onClose} aria-label="Lukk shorts"><X className="size-5" /></button>
        <p className="min-w-0 truncate text-sm font-bold">Gotham Shorts <span className="font-normal opacity-70">· {idx + 1}/{order.length}</span></p>
        <p className="shrink-0 text-sm font-bold tabular-nums" data-testid="feed-coins">🪙 {today.coins}/{FEED_CAP}</p>
      </div>
      <div className="feed__stage">
        <div className={`feed__video ${slide ? `is-${slide}` : ""}`}>
          <div ref={mountRef} className="feed__player" />
          {armed && !pause && (
            <div className="feed__touch" data-testid="feed-touch" aria-label="Sveip opp for neste short, trykk for pause"
              onPointerDown={(e) => { down.current = { y: e.clientY, t: performance.now() }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } }}
              onPointerUp={(e) => onUp(e.clientY)}
              onPointerCancel={() => { down.current = null; }}>
              {!playing && started && <span className="feed__paused"><Play className="size-10" /></span>}
            </div>
          )}
          {!armed && !pause && !err && <p className="feed__hint">{started ? "Trykk på videoen for å spille" : "Trykk ▶ på videoen for å starte"}</p>}
          {pop && <span key={pop.n} className="feed__pop" aria-live="polite">{pop.text}</span>}
          {err && <p className="feed__err">{err}</p>}
        </div>
        {pause && (
          <div className="feed__break" data-testid="feed-break">
            <Mike mood={pause.result?.ok ? "happy" : "think"} className="mx-auto w-20" />
            <p className="mike-bubble mx-auto mb-3 max-w-md text-sm"><span className="mike-bubble__name">Mike</span>{pause.result ? (pause.result.ok ? "Sharp. That's what the scrolling is for, right? Back to Levy." : "Not this time. Happens. Back to Levy – I'll get you at the next break.") : `Scroll break. ${FEED_PAUSE_EVERY} shorts, one puzzle. Solve it and I'll throw in some coins.`}</p>
            <div className="mx-auto max-w-md">
              {!pause.result && pause.item && <PuzzleSet title="Mike-pause" items={[pause.item]} onDone={(ok) => finishPause(ok > 0)} />}
              {!pause.result && !pause.item && <Button className="w-full" onClick={() => finishPause(false)}>Fortsett</Button>}
              {pause.result && (
                <>
                  <p className="mb-3 text-center text-sm font-semibold">{pause.result.ok ? `Riktig!${pause.result.paid ? ` +${pause.result.paid} 🪙` : ""}` : "Ikke riktig denne gangen."}</p>
                  <Button size="lg" className="w-full" data-testid="feed-resume" onClick={resume}><Play /> Tilbake til shorts</Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="feed__bar">
        <button type="button" className="feed__btn" onClick={() => go(-1)} aria-label="Forrige short" disabled={!!pause}><ChevronUp className="size-5" /></button>
        <p className="min-w-0 flex-1 text-center text-xs opacity-80" data-testid="feed-status">
          {capped ? "Dagens mynter er tjent – resten er bare gøy." : "1 🪙 for hver ny short du ser."} {toPause > 0 ? `Mike-pause om ${toPause}.` : "Mike-pause nå."}
        </p>
        <button type="button" className="feed__btn feed__btn--next" onClick={() => go(1)} aria-label="Neste short" data-testid="feed-next" disabled={!!pause}><ChevronDown className="size-5" /></button>
      </div>
    </div>
  );
}
