// Voice for Mike: local Whisper + Kokoro in a worker (downloaded once), with the
// browser's own speech recognition / synthesis as the fallback when the models
// aren't on the device. Pure helpers (resampling, the silence detector, sentence
// splitting) live at the top and are tested.
import { useSyncExternalStore } from "react";

// ---------- pure helpers ----------

/** Linear resampling of mono PCM. */
export function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const n = Math.max(0, Math.floor(input.length / ratio));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const pos = i * ratio;
    const j = Math.floor(pos);
    const t = pos - j;
    const a = input[j] ?? 0;
    const b = input[j + 1] ?? a;
    out[i] = a + (b - a) * t;
  }
  return out;
}

export function rms(block: Float32Array): number {
  let s = 0;
  for (let i = 0; i < block.length; i++) s += block[i]! * block[i]!;
  return Math.sqrt(s / Math.max(1, block.length));
}

export type VadConfig = { threshold: number; silenceMs: number; minSpeechMs: number; maxMs: number; preRollMs: number };
export const VAD: VadConfig = { threshold: 0.009, silenceMs: 1000, minSpeechMs: 350, maxMs: 15_000, preRollMs: 300 };

/**
 * A tiny energy-based voice activity detector. Feed it blocks; it returns a
 * finished utterance (PCM at the input rate) once the speaker has gone quiet,
 * or null. Keeps a little pre-roll so the first syllable isn't clipped.
 */
export class Segmenter {
  private pre: Float32Array[] = [];
  private preLen = 0;
  private speech: Float32Array[] = [];
  private speechLen = 0;
  private speaking = false;
  private quietMs = 0;
  private voicedMs = 0;
  /** Adaptive noise floor: the threshold rises on a noisy iPad table. */
  private floor = 0;
  constructor(private rate: number, private cfg: VadConfig = VAD) {}
  get isSpeaking() { return this.speaking; }
  /** Current loudness 0..1 for the UI. */
  level = 0;

  push(block: Float32Array): Float32Array | null {
    const ms = (block.length / this.rate) * 1000;
    const e = rms(block);
    this.level = Math.min(1, e * 12);
    const thr = Math.max(this.cfg.threshold, this.floor * 2.5);
    const voiced = e > thr;
    if (!voiced && !this.speaking) this.floor = this.floor * 0.95 + e * 0.05; // learn the room's noise while nobody talks
    if (!this.speaking) {
      this.pre.push(block); this.preLen += block.length;
      while (this.preLen - (this.pre[0]?.length ?? 0) > (this.cfg.preRollMs / 1000) * this.rate) this.preLen -= this.pre.shift()!.length;
      if (voiced) {
        this.speaking = true; this.quietMs = 0; this.voicedMs = ms;
        this.speech = [...this.pre]; this.speechLen = this.preLen; this.pre = []; this.preLen = 0;
      }
      return null;
    }
    this.speech.push(block); this.speechLen += block.length;
    if (voiced) { this.quietMs = 0; this.voicedMs += ms; } else this.quietMs += ms;
    const total = (this.speechLen / this.rate) * 1000;
    if (this.quietMs >= this.cfg.silenceMs || total >= this.cfg.maxMs) {
      const voicedMs = this.voicedMs;
      const parts = this.speech;
      this.speech = []; this.speechLen = 0; this.speaking = false; this.quietMs = 0; this.voicedMs = 0;
      if (voicedMs < this.cfg.minSpeechMs) return null; // a cough, a chair
      const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0));
      let o = 0;
      for (const p of parts) { out.set(p, o); o += p.length; }
      return out;
    }
    return null;
  }
  reset() { this.pre = []; this.preLen = 0; this.speech = []; this.speechLen = 0; this.speaking = false; this.quietMs = 0; this.voicedMs = 0; }
}

/** Strip markdown and split into short sentences for speaking. */
export function speakable(text: string): string {
  return text.replace(/[*_`#>]+/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1").replace(/\s+/g, " ").trim();
}

/** Whisper's "silence" hallucinations and empty results. */
export function cleanTranscript(t: string): string {
  const s = t.replace(/\[.*?\]|\(.*?\)/g, "").replace(/\s+/g, " ").trim();
  if (/^(thank you\.?|thanks for watching\.?|you\.?|\.+)$/i.test(s)) return "";
  return s;
}

// ---------- voices ----------
export const MIKE_VOICES = [
  { id: "am_puck", name: "Puck", hint: "Leken, litt rampete (standard)" },
  { id: "am_fenrir", name: "Fenrir", hint: "Litt mørkere, mer kraft" },
  { id: "am_michael", name: "Michael", hint: "Vanlig, vennlig" },
  { id: "bm_fable", name: "Fable", hint: "Britisk, fortellerstemme" },
  { id: "bm_george", name: "George", hint: "Britisk, rolig" },
] as const;
export type MikeVoiceId = (typeof MIKE_VOICES)[number]["id"];
const VOICE_KEY = "goblin-chess.mike-voice";
export function mikeVoice(): MikeVoiceId { try { const v = localStorage.getItem(VOICE_KEY); return (MIKE_VOICES.some((x) => x.id === v) ? v : "am_puck") as MikeVoiceId; } catch { return "am_puck"; } }
export function setMikeVoice(v: MikeVoiceId) { try { localStorage.setItem(VOICE_KEY, v); } catch { /* ignore */ } emit(); }

/** Listening: "auto" = the browser's recognizer when it has one (fast), else Whisper; "whisper" = always the local model. */
export type ListenMode = "auto" | "whisper";
const LISTEN_KEY = "goblin-chess.mike-listen";
export function listenMode(): ListenMode { try { return localStorage.getItem(LISTEN_KEY) === "whisper" ? "whisper" : "auto"; } catch { return "auto"; } }
export function setListenMode(m: ListenMode) { try { localStorage.setItem(LISTEN_KEY, m); } catch { /* ignore */ } emit(); }

/** The browser's own English voices (Safari/Chrome ship several) – used when Mike's voice isn't downloaded. */
const BVOICE_KEY = "goblin-chess.mike-browser-voice";
export function browserVoices(): { name: string; lang: string }[] {
  if (!browserSpeechAvailable()) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en")).map((v) => ({ name: v.name, lang: v.lang })).sort((a, b) => a.name.localeCompare(b.name));
}
export function browserVoiceName(): string { try { return localStorage.getItem(BVOICE_KEY) ?? ""; } catch { return ""; } }
export function setBrowserVoice(name: string) { try { localStorage.setItem(BVOICE_KEY, name); } catch { /* ignore */ } emit(); }

// ---------- store ----------
export type VoiceStatus = "idle" | "downloading" | "ready" | "error";
type State = { status: VoiceStatus; progress: number; loaded: number; total: number; error: string | null; voice: MikeVoiceId; listen: ListenMode; browserVoice: string };
let state: State = { status: "idle", progress: 0, loaded: 0, total: 0, error: null, voice: "am_puck", listen: "auto", browserVoice: "" };
const listeners = new Set<() => void>();
const emit = () => { state = { ...state, voice: mikeVoice(), listen: listenMode(), browserVoice: browserVoiceName() }; listeners.forEach((l) => l()); };
if (typeof window !== "undefined" && "speechSynthesis" in window) { try { speechSynthesis.addEventListener("voiceschanged", () => emit()); } catch { /* ignore */ } }
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; emit(); };
export function useVoice(): State { return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state, () => state); }
export const voiceReady = () => state.status === "ready";
export const VOICE_DOWNLOAD_MB = 170;

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; onChunk?: (a: Float32Array, rate: number) => void }>();

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./voice-worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data as { type: string; id?: number; progress?: number; loaded?: number; total?: number; text?: string; audio?: Float32Array; rate?: number; done?: boolean; message?: string };
    if (m.type === "progress") set({ status: "downloading", progress: m.progress ?? 0, loaded: m.loaded ?? 0, total: m.total ?? 0 });
    else if (m.type === "ready") { set({ status: "ready", progress: 1 }); try { localStorage.setItem("goblin-chess.voice-ready", "1"); } catch { /* ignore */ } }
    else if (m.type === "error") {
      const p = m.id !== undefined ? pending.get(m.id) : undefined;
      if (p) { pending.delete(m.id!); p.reject(new Error(m.message)); } else set({ status: "error", error: m.message ?? "Ukjent feil" });
    } else if (m.type === "text") { const p = pending.get(m.id!); if (p) { pending.delete(m.id!); p.resolve(m.text ?? ""); } }
    else if (m.type === "audio") {
      const p = pending.get(m.id!);
      if (!p) return;
      if (m.done) { pending.delete(m.id!); p.resolve(undefined); } else p.onChunk?.(m.audio!, m.rate ?? 24_000);
    }
  };
  worker.onerror = (e) => set({ status: "error", error: e.message });
  return worker;
}

/** True when the models were downloaded on this device before (so a call can warm them up silently). */
export const voiceDownloadedBefore = () => { try { return localStorage.getItem("goblin-chess.voice-ready") === "1"; } catch { return false; } };

/** Download (or warm up) Whisper + Kokoro. Safe to call repeatedly. */
export function voiceDownload() {
  if (state.status === "ready" || state.status === "downloading") return;
  set({ status: "downloading", progress: 0, error: null });
  ensureWorker().postMessage({ type: "load" });
}

export function transcribeLocal(audio16k: Float32Array): Promise<string> {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: (v) => resolve(cleanTranscript(String(v))), reject });
    ensureWorker().postMessage({ type: "transcribe", id, audio: audio16k }, [audio16k.buffer as ArrayBuffer]);
  });
}

/** Generate speech sentence by sentence; `onChunk` receives PCM to play as it arrives. */
export function speakLocal(text: string, onChunk: (pcm: Float32Array, rate: number) => void): Promise<void> {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: () => resolve(), reject, onChunk });
    ensureWorker().postMessage({ type: "speak", id, text: speakable(text), voice: mikeVoice(), speed: 1.05 });
  });
}

// ---------- browser fallbacks ----------
type SR = { lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean; start: () => void; stop: () => void; abort: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
const SRCtor = () => (globalThis as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition ?? (globalThis as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
export const browserRecognitionAvailable = () => typeof window !== "undefined" && !!SRCtor();
export const browserSpeechAvailable = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** One utterance via the browser's recognizer (Safari/Chrome). Resolves "" on silence. */
export function listenBrowser(signal?: AbortSignal): Promise<string> {
  const C = SRCtor();
  if (!C) return Promise.reject(new Error("no recognition"));
  return new Promise((resolve, reject) => {
    const r = new C();
    r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 1; r.continuous = false;
    let done = false;
    const finish = (t: string) => { if (!done) { done = true; resolve(t); } };
    r.onresult = (e) => finish(Array.from({ length: e.results.length }, (_, i) => e.results[i]![0]!.transcript).join(" ").trim());
    r.onerror = (e) => { if (e.error === "no-speech" || e.error === "aborted") finish(""); else if (!done) { done = true; reject(new Error(e.error)); } };
    r.onend = () => finish("");
    signal?.addEventListener("abort", () => { try { r.abort(); } catch { /* ignore */ } finish(""); });
    r.start();
  });
}

function pickBrowserVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const chosen = browserVoiceName();
  if (chosen) { const v = voices.find((x) => x.name === chosen); if (v) return v; }
  const prefs = ["Daniel", "Aaron", "Fred", "Google UK English Male", "Alex", "Microsoft Guy", "Rishi"];
  for (const p of prefs) { const v = voices.find((x) => x.name.includes(p)); if (v) return v; }
  return voices.find((v) => v.lang === "en-US") ?? voices[0] ?? null;
}
/** Call inside a tap: iOS only lets speech start after a user gesture, and this unlocks it for the rest of the call. */
export function unlockBrowserSpeech() {
  try { if (!browserSpeechAvailable()) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); speechSynthesis.getVoices(); } catch { /* ignore */ }
}
/**
 * Speak with the browser's voice. iOS sometimes never fires onend (or never starts
 * at all), so this also polls `speaking` and gives up after the text should be done.
 */
export function speakBrowser(text: string, onBoundary?: () => void): Promise<void> {
  return new Promise((resolve) => {
    const clean = speakable(text);
    if (!clean) { resolve(); return; }
    let done = false;
    const finish = () => { if (!done) { done = true; clearInterval(poll); clearTimeout(cap); resolve(); } };
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "en-US"; u.rate = 1.05; u.pitch = 0.9;
    const v = pickBrowserVoice();
    if (v) u.voice = v;
    u.onboundary = () => onBoundary?.();
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    let started = false;
    const poll = setInterval(() => {
      if (speechSynthesis.speaking) started = true;
      else if (started) finish();
    }, 150);
    const cap = setTimeout(finish, Math.min(30_000, 2_500 + clean.length * 90));
  });
}
export function stopBrowserSpeech() { try { speechSynthesis.cancel(); } catch { /* ignore */ } }

/** Reject after `ms` so a stuck worker never freezes the call. */
export function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what} tok for lang tid`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// ---------- microphone + playback (main thread) ----------
export type Mic = { ctx: AudioContext; stream: MediaStream; stop: () => void; setMuted: (m: boolean) => void };

/** Open the microphone and stream blocks (at ctx.sampleRate) to `onBlock`. Call from a user gesture. */
export async function openMic(ctx: AudioContext, onBlock: (block: Float32Array) => void): Promise<Mic> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
  // One context for everything (created in the user's tap – iOS keeps a context made later suspended).
  if (ctx.state !== "running") await ctx.resume();
  await ctx.audioWorklet.addModule("/voice-capture.js");
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "voice-capture");
  let muted = false;
  node.port.onmessage = (e: MessageEvent<Float32Array>) => { if (!muted) onBlock(e.data); };
  src.connect(node);
  // Keep the graph alive without hearing yourself: route through a silent gain.
  const sink = ctx.createGain(); sink.gain.value = 0; node.connect(sink); sink.connect(ctx.destination);
  return { ctx, stream, stop: () => { try { node.disconnect(); src.disconnect(); sink.disconnect(); } catch { /* ignore */ } stream.getTracks().forEach((t) => t.stop()); }, setMuted: (m) => { muted = m; } };
}

/** Plays PCM chunks back to back on one AudioContext; `level()` gives the current loudness for the mouth. */
export class Player {
  private queue: { pcm: Float32Array; rate: number }[] = [];
  private playing = false;
  private analyser: AnalyserNode;
  private data: Uint8Array<ArrayBuffer>;
  private current: AudioBufferSourceNode | null = null;
  private waiters: (() => void)[] = [];
  private closed = false;
  constructor(private ctx: AudioContext) {
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 256; this.analyser.connect(ctx.destination);
    this.data = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
  }
  level(): number {
    this.analyser.getByteTimeDomainData(this.data);
    let s = 0;
    for (let i = 0; i < this.data.length; i++) { const v = (this.data[i]! - 128) / 128; s += v * v; }
    return Math.min(1, Math.sqrt(s / this.data.length) * 4);
  }
  enqueue(pcm: Float32Array, rate: number) { this.queue.push({ pcm, rate }); void this.pump(); }
  get busy() { return this.playing || this.queue.length > 0; }
  /** Resolves once everything queued so far has finished playing. */
  drain(): Promise<void> { return this.busy ? new Promise((r) => this.waiters.push(r)) : Promise.resolve(); }
  stop() { this.queue = []; try { this.current?.stop(); } catch { /* ignore */ } this.current = null; this.playing = false; this.waiters.splice(0).forEach((w) => w()); }
  close() { this.closed = true; this.stop(); try { this.analyser.disconnect(); } catch { /* ignore */ } }
  private async pump() {
    if (this.playing || this.closed) return;
    const next = this.queue.shift();
    if (!next) { this.waiters.splice(0).forEach((w) => w()); return; }
    this.playing = true;
    const buf = this.ctx.createBuffer(1, next.pcm.length, next.rate);
    buf.copyToChannel(next.pcm as Float32Array<ArrayBuffer>, 0);
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.connect(this.analyser);
    this.current = src;
    if (this.ctx.state !== "running") { try { await this.ctx.resume(); } catch { /* ignore */ } }
    await new Promise<void>((r) => { src.onended = () => r(); src.start(); setTimeout(r, buf.duration * 1000 + 1500); });
    this.current = null; this.playing = false;
    void this.pump();
  }
}
