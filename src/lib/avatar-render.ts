// Renders a look to an image: instant flat SVG first, then the 3D head from the
// worker pool, cached in memory (and the player's own look in localStorage so the
// app starts with the right face). Browser only; nothing runs at import time.
import { sharedFactory } from "@/vendor/zuri/dom.ts";
import { disposeAvatar } from "@/vendor/zuri/build.ts";
import { AvatarStage, snapshotAvatar } from "@/vendor/zuri/stage.ts";
import { flatAvatarDataURL, flatAvatarSVG } from "@/vendor/zuri/flat.ts";
import { lookKey, paramsFor, type AvatarLook } from "./avatar-params";

const mem = new Map<string, Promise<string>>();
const LS = "goblin-chess.avatar-img";
let queue: Promise<unknown> = Promise.resolve();

/** Flat 2D version – synchronous, used as the placeholder while 3D renders. */
export function flatLook(look: AvatarLook, size = 128): string {
  try { return flatAvatarDataURL(flatAvatarSVG(paramsFor(look), { size, shape: "square" })); } catch { return ""; }
}

/** 3D render as a PNG data URL. Same look + size → same promise. */
export function renderLook(look: AvatarLook, size = 256, quality = size <= 128 ? 0.6 : 1): Promise<string> {
  const key = `${size}:${lookKey(look)}`;
  let hit = mem.get(key);
  if (hit) return hit;
  // One render at a time keeps the UI responsive when a tab with 20 thumbnails opens.
  hit = (queue = queue.then(async () => {
    const avatar = await sharedFactory().build(paramsFor(look), quality, "soft");
    try { return snapshotAvatar(avatar, { size, framing: "bust", type: "image/png" }); }
    finally { disposeAvatar(avatar); }
  }).catch((e) => { mem.delete(key); throw e; })) as Promise<string>;
  mem.set(key, hit);
  if (mem.size > 400) mem.delete(mem.keys().next().value!);
  return hit;
}

/** The player's own picture survives reloads so the header never shows a placeholder for long. */
export function rememberOwn(look: AvatarLook, url: string) {
  try { localStorage.setItem(LS, JSON.stringify({ key: lookKey(look), url })); } catch { /* storage blocked */ }
}
export function recallOwn(look: AvatarLook): string | null {
  try {
    const raw = localStorage.getItem(LS);
    if (!raw) return null;
    const { key, url } = JSON.parse(raw) as { key: string; url: string };
    return key === lookKey(look) ? url : null;
  } catch { return null; }
}

export type LiveLook = { update: (look: AvatarLook) => void; dispose: () => void };

/** Live 3D in a canvas: blinks and sways, drag to turn the head. Mirrors zuri's mountAvatar but takes a look instead of a seed. */
export function mountLook(canvas: HTMLCanvasElement, look: AvatarLook): LiveLook {
  const stage = new AvatarStage({ canvas });
  let request = 0, frame = 0, yaw = 0, disposed = false;
  let drag: { x: number; yaw: number } | null = null;
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const resize = () => { const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height; if (w && h) stage.setSize(w, h); };
  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  resize();
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const a = stage.avatar as { userData: { tick: (t: number) => void }; rotation: { y: number } } | null;
    if (!a) return;
    a.userData.tick(reduced ? 0 : now / 1000);
    if (!drag) yaw *= 0.9;
    a.rotation.y += yaw;
    stage.render();
  };
  frame = requestAnimationFrame(loop);
  const down = (e: PointerEvent) => { drag = { x: e.clientX, yaw }; canvas.setPointerCapture(e.pointerId); };
  const move = (e: PointerEvent) => { if (drag) yaw = drag.yaw + (e.clientX - drag.x) * 0.012; };
  const up = () => { drag = null; };
  canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  const show = (l: AvatarLook) => {
    const id = ++request;
    stage.frame("bust");
    sharedFactory().build(paramsFor(l), 1, "soft").then((avatar) => { if (disposed || id !== request) return disposeAvatar(avatar); stage.show(avatar); }).catch(() => { /* keep the previous head */ });
  };
  show(look);
  return {
    update: show,
    dispose: () => { disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); stage.dispose(); },
  };
}
