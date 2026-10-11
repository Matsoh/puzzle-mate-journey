import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Sparkles, ChessKnight } from "lucide-react";
import { ClientOnly } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { COACH_NAME } from "@/lib/coach-config";
import { play, unlockAudio } from "@/lib/sound";

// The WebGL module is fetched only when an image is unavailable.
const GoblinFallback = lazy(() => import("./three/Hero3D"));
const particles = Array.from({ length: 24 }, (_, i) => ({
  "--x": `${8 + (i * 29 % 74)}%`, "--y": `${15 + (i * 17 % 59)}%`,
  "--s": `${2 + (i % 3)}px`, "--d": `${3 + (i % 5)}s`, "--delay": `${-(i * 0.61)}s`,
} as CSSProperties));

export function ChampAvatarScene({ celebrate = false }: { celebrate?: boolean | undefined }) {
  const scene = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [loaded, setLoaded] = useState({ stage: false, hero: false });
  const [failed, setFailed] = useState(false);
  const ready = loaded.stage && loaded.hero && !failed;

  useEffect(() => {
    // SSR images may finish before hydration attaches their event handlers.
    const images = (["stage", "hero"] as const).map(key => {
      const image = new Image();
      image.onload = () => setLoaded(s => ({ ...s, [key]: true }));
      image.onerror = () => setFailed(true);
      image.src = key === "stage" ? "/coach-stage.png" : "/coach-hero.png";
      return image;
    });
    return () => images.forEach(image => { image.onload = null; image.onerror = null; });
  }, []);

  const replay = useCallback(() => {
    const node = scene.current;
    if (!node) return;
    clearTimeout(timer.current);
    node.classList.remove("is-celebrating");
    void node.offsetWidth;
    node.classList.add("is-celebrating");
    timer.current = setTimeout(() => node.classList.remove("is-celebrating"), 1400);
  }, []);

  useEffect(() => {
    if (celebrate) replay();
  }, [celebrate, ready, replay]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const tilt = useCallback((rx: number, ry: number) => {
    scene.current?.style.setProperty("--chess-rx", `${Math.max(-3, Math.min(3, rx))}deg`);
    scene.current?.style.setProperty("--chess-ry", `${Math.max(-4.5, Math.min(4.5, ry))}deg`);
  }, []);
  useEffect(() => {
    // Listen only when the browser already permits motion; never request permission.
    if (!window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let baseline: number | undefined;
    const orient = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      baseline ??= event.beta;
      tilt(-(event.beta - baseline) / 15, event.gamma / 15);
    };
    window.addEventListener("deviceorientation", orient);
    return () => window.removeEventListener("deviceorientation", orient);
  }, [tilt]);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    tilt(-((event.clientY - rect.top - rect.height / 2) / rect.height) * 6,
      ((event.clientX - rect.left - rect.width / 2) / rect.width) * 9);
  };

  return (
    <div ref={scene} className={`chess-avatar${ready ? " is-ready" : ""}`} role="group"
      aria-label={`Animert sjakkavatar: ${COACH_NAME}`} onPointerMove={move} onPointerLeave={() => tilt(0, 0)}>
      {!failed && <>
        <img className="chess-avatar__stage" src="/coach-stage.png" alt="" onLoad={() => setLoaded(s => ({ ...s, stage: true }))} onError={() => setFailed(true)} />
        <div className="chess-avatar__aura" />
        <div className="chess-avatar__portal" />
        <div className="chess-avatar__tilt">
          <img className="chess-avatar__hero" src="/coach-hero.png" alt="Tobias Future Champ med en grønn hestebrikke"
            onLoad={() => setLoaded(s => ({ ...s, hero: true }))} onError={() => setFailed(true)} />
        </div>
      </>}
      {failed && <div className="chess-avatar__fallback"><ClientOnly><Suspense fallback={null}><GoblinFallback /></Suspense></ClientOnly></div>}
      <div className="chess-avatar__particles" aria-hidden="true">
        {particles.map((style, i) => <i key={i} className="chess-avatar__particle" style={style} />)}
      </div>
      <div className="chess-avatar__flash" aria-hidden="true" />
      <div className="chess-avatar__badge"><ChessKnight className="size-4 text-primary" />{COACH_NAME}</div>
      <Button variant="ghost" size="icon" className="chess-avatar__trigger" aria-label="Spill seiersanimasjon" title="Spill seiersanimasjon"
        onClick={() => { unlockAudio(); play("win"); replay(); }}><Sparkles /></Button>
    </div>
  );
}