// Voice for Mike: ElevenLabs reads his replies (mike-voice edge function) and
// ElevenLabs Scribe listens when the browser's own recognizer can't (iPad).
// The browser's recognizer and voice are the free fast path / last resort.
// Pure helpers (resampling, the silence detector, WAV encoding) are tested.

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

// ---------- ElevenLabs (via the mike-voice edge function) ----------
/** Friendly text for an error from the mike-voice function. */
export function elevenError(message: string): string {
  if (/no key|501/.test(message)) return "Stemmenøkkelen mangler i Lovable.";
  if (/no stt permission/.test(message)) return "Nøkkelen mangler tilgang til Speech to Text i ElevenLabs.";
  if (/no tts permission/.test(message)) return "Nøkkelen mangler tilgang til Text to Speech i ElevenLabs.";
  if (/bad key/.test(message)) return `ElevenLabs avviste nøkkelen (${message.replace(/^bad key:\s*/, "") || "ukjent grunn"}).`;
  if (/quota|429/.test(message)) return "Stemmekvoten er brukt opp denne måneden.";
  if (/forbidden|unauthorized/.test(message)) return "Du må være logget inn som godkjent spiller.";
  if (/Failed to fetch|Load failed/.test(message)) return "Fikk ikke kontakt med stemmetjenesten.";
  return `Stemmetjenesten svarte ikke (${message}).`;
}

async function callVoice(body: Record<string, unknown>): Promise<Response> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("unauthorized");
  const url = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1/mike-voice`;
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "" }, body: JSON.stringify(body) });
  if (!res.ok) {
    let msg = `${res.status}`;
    try { msg = ((await res.json()) as { error?: string }).error ?? msg; } catch { /* keep status */ }
    throw new Error(msg);
  }
  return res;
}
/** Ask ElevenLabs to read `text`; returns decoded PCM ready for the Player. */
export async function speakEleven(text: string, ctx: AudioContext): Promise<{ pcm: Float32Array; rate: number }> {
  const res = await callVoice({ text: speakable(text) });
  const buf = await res.arrayBuffer();
  const audio = await ctx.decodeAudioData(buf.slice(0));
  return { pcm: audio.getChannelData(0), rate: audio.sampleRate };
}
/** ElevenLabs Scribe: 16 kHz mono PCM → English text. */
export async function transcribeEleven(pcm16k: Float32Array): Promise<string> {
  const res = await callVoice({ audio: wavBase64(pcm16k, 16_000) });
  return cleanTranscript(((await res.json()) as { text?: string }).text ?? "");
}

/** Mono float PCM → 16-bit WAV, base64 (what the edge function forwards to Scribe). */
export function wavBase64(pcm: Float32Array, rate: number): string {
  const bytes = wavBytes(pcm, rate);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function wavBytes(pcm: Float32Array, rate: number): Uint8Array {
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const str = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) { const x = Math.max(-1, Math.min(1, pcm[i]!)); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
  return new Uint8Array(buf);
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
