import { useEffect, useRef } from "react";

// The official YouTube IFrame player (privacy-enhanced host, no related-video
// feed from other channels). Reports seconds actually played, so Kinosalen can
// pay for watching rather than for opening.

type YT = {
  Player: new (el: HTMLElement, opts: {
    host?: string;
    videoId: string;
    playerVars?: Record<string, string | number>;
    events?: { onReady?: (e: { target: Player }) => void; onStateChange?: (e: { data: number; target: Player }) => void; onError?: (e: { data: number }) => void };
  }) => Player;
  PlayerState: { PLAYING: number; ENDED: number; PAUSED: number };
};
type Player = { getCurrentTime: () => number; getPlayerState: () => number; destroy: () => void; pauseVideo: () => void };
declare global { interface Window { YT?: YT; onYouTubeIframeAPIReady?: () => void } }

let apiPromise: Promise<YT> | null = null;
function loadApi(): Promise<YT> {
  if (typeof window === "undefined") return new Promise(() => { /* never on the server */ });
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise<YT>((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      const late = setTimeout(() => { apiPromise = null; reject(new Error("YouTube svarte ikke.")); }, 20_000);
      window.onYouTubeIframeAPIReady = () => { prev?.(); clearTimeout(late); resolve(window.YT!); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => { clearTimeout(late); apiPromise = null; reject(new Error("Fikk ikke kontakt med YouTube.")); };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

export function YouTube({ videoId, start, end, onProgress, onEnded, onError, className }: {
  videoId: string;
  start?: number | undefined;
  end?: number | undefined;
  /** Seconds played in this session, every few seconds while playing and on pause/end. */
  onProgress?: ((secs: number) => void) | undefined;
  onEnded?: (() => void) | undefined;
  onError?: ((msg: string) => void) | undefined;
  className?: string | undefined;
}) {
  const host = useRef<HTMLDivElement>(null);
  const cb = useRef({ onProgress, onEnded, onError });
  cb.current = { onProgress, onEnded, onError };
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let player: Player | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let played = 0;
    let lastTick = 0;
    let dead = false;
    const mount = document.createElement("div");
    el.replaceChildren(mount);
    const report = () => cb.current.onProgress?.(played);
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } report(); };
    loadApi().then((YT) => {
      if (dead) return;
      player = new YT.Player(mount, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, controls: 1, iv_load_policy: 3, ...(start ? { start } : {}), ...(end ? { end } : {}) },
        events: {
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) {
              if (timer) return;
              lastTick = performance.now();
              timer = setInterval(() => {
                const now = performance.now();
                played += (now - lastTick) / 1000;
                lastTick = now;
                if (Math.floor(played) % 5 === 0) report();
              }, 1000);
            } else {
              stop();
              if (e.data === YT.PlayerState.ENDED) cb.current.onEnded?.();
            }
          },
          onError: (e) => cb.current.onError?.(e.data === 101 || e.data === 150 ? "Denne videoen kan ikke spilles inne i appen." : "Videoen kunne ikke lastes."),
        },
      });
    }).catch((err: Error) => { if (!dead) cb.current.onError?.(err.message); });
    return () => {
      dead = true;
      stop();
      try { player?.destroy(); } catch { /* ignore */ }
      el.replaceChildren();
    };
  }, [videoId, start, end]);
  return <div ref={host} className={className} />;
}
