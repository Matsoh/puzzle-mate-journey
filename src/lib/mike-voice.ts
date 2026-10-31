// Mike's voice outside the phone call: reads his lines at the board, in the
// school and after games with ElevenLabs. Only key lines, cached per text, with
// a throttle so he never nags. Silent (not broken) when the voice can't play.
import { useSyncExternalStore } from "react";
import { Player, speakEleven, speakable } from "./voice";

const KEY = "goblin-chess.mike-say";
type Clip = { pcm: Float32Array; rate: number };
const cache = new Map<string, Clip>();
const fetching = new Map<string, Promise<Clip>>();
let ctx: AudioContext | null = null;
let player: Player | null = null;
let lastSpokenAt = 0;
let lastText = "";
let seq = 0;
let state = { on: true, speaking: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; emit(); };
try { if (typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "0") state = { ...state, on: false }; } catch { /* ignore */ }

export function useMikeVoice() { return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state, () => state); }
export const mikeVoiceOn = () => state.on;
export function setMikeVoiceOn(on: boolean) { try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* ignore */ } set({ on }); if (!on) stopMike(); }

/** Call from a tap (Start, speaker button): iOS only lets audio start after a gesture. */
export function primeMikeVoice() {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) { ctx = new AudioContext(); player = new Player(ctx); }
    if (ctx.state !== "running") void ctx.resume();
  } catch { /* no audio here */ }
}
export function stopMike() { player?.stop(); set({ speaking: false }); }
/** 0..1 loudness for the mouth while Mike talks. */
export const mikeLevel = () => (state.speaking ? player?.level() ?? 0 : 0);

/** Read a line aloud. `important` lines (intro, result) always play; others wait at least 8 s after the previous one. */
export async function sayMike(text: string, important = false): Promise<void> {
  const clean = speakable(text);
  if (!state.on || !clean || typeof window === "undefined") return;
  if (!important && Date.now() - lastSpokenAt < 8_000) return;
  if (clean === lastText && Date.now() - lastSpokenAt < 20_000) return; // same line asked twice (effect + tap)
  if (!ctx || !player) primeMikeVoice();
  if (!ctx || !player) return;
  const my = ++seq;
  try {
    let clip = cache.get(clean);
    if (!clip) {
      let p = fetching.get(clean);
      if (!p) { p = speakEleven(clean, ctx).finally(() => fetching.delete(clean)); fetching.set(clean, p); }
      clip = await p;
      cache.set(clean, clip);
    }
    if (my !== seq) return; // a newer line took over while we were fetching
    player.stop();
    if (ctx.state !== "running") { try { await ctx.resume(); } catch { /* ignore */ } }
    if (ctx.state !== "running") return; // iOS: not unlocked yet – the next tap will say it
    lastSpokenAt = Date.now();
    lastText = clean;
    set({ speaking: true });
    player.enqueue(clip.pcm.slice(), clip.rate);
    await player.drain();
  } catch {
    // ElevenLabs unavailable: Mike stays in text.
  } finally {
    if (my === seq) set({ speaking: false });
  }
}
