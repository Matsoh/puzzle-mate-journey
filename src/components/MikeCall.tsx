import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mike } from "@/components/Mike";
import { askMike, type BrainSettings, type ChatMsg } from "@/lib/mike-brain";
import { moodFor, type MikeMood } from "@/lib/mike";
import { Player, Segmenter, browserRecognitionAvailable, browserSpeechAvailable, elevenError, elevenVoiceId, listenBrowser, listenMode, openMic, resample, speakBrowser, speakEleven, speakLocal, stopBrowserSpeech, transcribeLocal, voiceEngine, voiceReady, withTimeout, type Mic as MicHandle } from "@/lib/voice";

export type CallPhase = "connecting" | "listening" | "thinking" | "speaking" | "ended" | "failed";

/** Rules appended to Mike's prompt during a call: short, spoken, English. */
export const CALL_RULES = `VOICE CALL MODE: Tobias is talking to you on the phone and your reply is read aloud. Answer in one to three short spoken sentences. Plain text only: no markdown, no lists, no emoji, no stage directions. Ask at most one question. If you didn't understand, say so briefly and ask him to say it again.`;

const GREETINGS = ["Mike here. One eye, two ears, all yours. What's up?", "Yo. You rang the felt monster. Talk to me.", "Mike speaking. Board's ready, I'm ready. What are we doing?"];
/** Short clips Mike plays while the brain is working, so the line never goes dead. */
const FILLERS = ["Hmm.", "Let me think.", "Good question.", "Okay, hold on."];

const STATUS: Record<CallPhase, string> = { connecting: "Ringer …", listening: "Lytter – snakk engelsk", thinking: "Mike tenker …", speaking: "Mike snakker", ended: "Samtalen er over", failed: "Fikk ikke til samtalen" };

type Clip = { pcm: Float32Array; rate: number };
/** Filler clips survive across calls so ElevenLabs isn't asked for "Hmm." every time. */
const fillerCache = new Map<string, Clip[]>();

/**
 * A phone call with Mike: hands-free. Listens until Tobias goes quiet, sends what he
 * said to Mike's brain, reads the answer aloud, listens again – until "Legg på".
 * Voice: Kokoro when downloaded, else the browser's. Listening: the browser's own
 * recognizer when it has one (fast, works on iPad), else local Whisper.
 */
export function MikeCall({ ctx, brain, context, history, onExchange, onEnd }: { ctx: AudioContext; brain: BrainSettings; context: string; history: ChatMsg[]; onExchange: (user: string, mike: string) => void; onEnd: () => void }) {
  const [phase, setPhase] = useState<CallPhase>("connecting");
  const [muted, setMuted] = useState(false);
  /** The browser's recognizer may only start from a tap on iOS: then the mic button is "push to talk". */
  const [ptt, setPtt] = useState(false);
  const pttRef = useRef(false);
  const pttResolve = useRef<((t: string) => void) | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [engine] = useState(() => (voiceEngine() === "local" && !voiceReady() ? "browser" : voiceEngine()));
  const [localVoice] = useState(() => voiceReady());
  const [whisper] = useState(() => voiceReady() && (listenMode() === "whisper" || !browserRecognitionAvailable()));
  const wrap = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const mutedRef = useRef(false);
  const histRef = useRef<ChatMsg[]>(history);
  const phaseRef = useRef<CallPhase>("connecting");
  const go = (p: CallPhase) => { phaseRef.current = p; if (alive.current) setPhase(p); };

  useEffect(() => { const t = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    alive.current = true;
    let mic: MicHandle | null = null;
    let player: Player | null = null;
    let seg: Segmenter | null = null;
    let raf = 0;
    let useWhisper = whisper;
    let eleven = engine === "eleven";
    const hasPlayer = eleven || localVoice;
    const fillerKey = eleven ? `eleven:${elevenVoiceId()}` : "local";
    let whisperFails = 0;
    let instantEnds = 0;
    const abort = new AbortController();
    let utterance: ((pcm: Float32Array) => void) | null = null;
    let lastBlock = Date.now();
    let watchdog: ReturnType<typeof setInterval> | undefined;
    const fillers: Clip[] = [];

    const mouth = () => {
      const lvl = phaseRef.current === "speaking" || phaseRef.current === "thinking" ? player?.level() ?? 0 : phaseRef.current === "listening" ? (seg?.level ?? 0) * 0.5 : 0;
      wrap.current?.style.setProperty("--talk", lvl.toFixed(3));
      raf = requestAnimationFrame(mouth);
    };

    const resume = async () => { if (ctx.state !== "running") { try { await ctx.resume(); } catch { /* ignore */ } } };

    const speak = async (text: string) => {
      go("speaking"); setSaid(text);
      mic?.setMuted(true); // don't listen to ourselves
      let spoken = false;
      if (eleven && player) {
        try {
          await resume();
          const clip = await withTimeout(speakEleven(text, ctx), 20_000, "ElevenLabs");
          player.enqueue(clip.pcm, clip.rate);
          await withTimeout(player.drain(), 60_000, "Avspillingen");
          spoken = true;
        } catch (e) { eleven = false; setNote(`${elevenError((e as Error).message)} Bruker ${localVoice ? "nedlastet" : "nettleserens"} stemme.`); player.stop(); }
      }
      if (!spoken && localVoice && player) {
        try {
          await resume();
          await withTimeout(speakLocal(text, (pcm, rate) => player?.enqueue(pcm, rate)), 45_000, "Stemmen");
          await withTimeout(player.drain(), 60_000, "Avspillingen");
          spoken = true;
        } catch (e) { setNote(`Mikes stemme feilet (${(e as Error).message}) – bruker nettleserens.`); player.stop(); }
      }
      if (!spoken && browserSpeechAvailable()) {
        try { await speakBrowser(text, () => wrap.current?.style.setProperty("--talk", String(0.4 + Math.random() * 0.6))); } catch { /* a silent Mike is still Mike */ }
      }
      mic?.setMuted(mutedRef.current);
    };

    /** Pre-render the fillers once Mike has greeted, in the background. */
    const prepareFillers = async () => {
      if (!hasPlayer) return;
      const cached = fillerCache.get(fillerKey);
      if (cached?.length) { fillers.push(...cached); return; }
      for (const f of (eleven ? FILLERS.slice(0, 2) : FILLERS)) {
        if (!alive.current) return;
        try {
          if (eleven) fillers.push(await speakEleven(f, ctx));
          else if (localVoice) { const parts: Clip[] = []; await speakLocal(f, (pcm, rate) => parts.push({ pcm, rate })); if (parts[0]) fillers.push(parts[0]); }
        } catch { /* skip */ }
      }
      if (fillers.length) fillerCache.set(fillerKey, [...fillers]);
    };
    const playFiller = async () => {
      const clip = fillers[Math.floor(Math.random() * fillers.length)];
      if (!clip || !player) return;
      await resume();
      player.enqueue(clip.pcm.slice(), clip.rate);
    };

    const listenWhisper = (): Promise<string> => new Promise((resolve) => {
      seg?.reset();
      mic?.setMuted(mutedRef.current);
      utterance = (pcm: Float32Array) => {
        utterance = null;
        go("thinking");
        withTimeout(transcribeLocal(resample(pcm, ctx.sampleRate, 16_000)), 30_000, "Lyttingen").then((t) => { whisperFails = 0; setNote(null); resolve(t); }, (e) => {
          if (++whisperFails >= 2 && browserRecognitionAvailable()) { useWhisper = false; mic?.setMuted(true); setNote("Bruker nettleserens lytting i stedet."); }
          else setNote(`Hørte ikke (${(e as Error).message}).`);
          resolve("");
        });
      };
    });

    const listenBrowserOnce = async (): Promise<string> => {
      if (hasPlayer) { try { await ctx.suspend(); } catch { /* ignore */ } } // iOS has one audio session: free it for the recognizer
      if (pttRef.current) return new Promise<string>((resolve) => { pttResolve.current = resolve; });
      const t0 = Date.now();
      const toPtt = (why: string) => { pttRef.current = true; setPtt(true); setNote(`Automatisk lytting virket ikke (${why}). Trykk «Snakk» og si noe.`); };
      return listenBrowser(abort.signal).then((t) => {
        // iOS quietly ends recognition at once when it won't start outside a tap: two instant empties → push to talk.
        if (!t && Date.now() - t0 < 1500) { if (++instantEnds >= 2) toPtt("stoppet med en gang"); } else instantEnds = 0;
        return t;
      }, (e: Error) => { toPtt(e.message); return ""; });
    };

    const listenOnce = (): Promise<string> => { go("listening"); return useWhisper ? listenWhisper() : listenBrowserOnce(); };

    const loop = async () => {
      while (alive.current) {
        if (mutedRef.current && useWhisper) { await new Promise((r) => setTimeout(r, 300)); continue; }
        const text = await listenOnce();
        if (!alive.current) return;
        if (!text) { await new Promise((r) => setTimeout(r, 350)); continue; }
        setHeard(text); go("thinking");
        void playFiller();
        const hist: ChatMsg[] = [...histRef.current, { role: "user", content: text }];
        const r = await askMike(brain, context, hist, false, CALL_RULES).catch(() => ({ text: "Sorry, I lost you for a second. Say that again?", source: "offline" as const }));
        if (!alive.current) return;
        histRef.current = [...hist, { role: "assistant", content: r.text }];
        onExchange(text, r.text);
        await player?.drain();
        await speak(r.text);
      }
    };

    void (async () => {
      try {
        if (hasPlayer) player = new Player(ctx);
        if (useWhisper) {
          mic = await openMic(ctx, (block) => { lastBlock = Date.now(); if (!seg || mutedRef.current) return; const u = seg.push(block); if (u && utterance) utterance(u); });
          seg = new Segmenter(ctx.sampleRate);
          // Watchdog: a microphone that delivers nothing while we listen means iOS parked the audio context.
          watchdog = setInterval(() => {
            if (!useWhisper || phaseRef.current !== "listening" || mutedRef.current) { lastBlock = Date.now(); return; }
            if (Date.now() - lastBlock > 3000) { setNote("Mikrofonen gir ingen lyd – prøver å vekke den …"); void ctx.resume(); lastBlock = Date.now(); }
          }, 1000);
        } else if (!browserRecognitionAvailable()) {
          throw new Error("Nettleseren har ikke talegjenkjenning. Last ned Mikes stemme (Whisper), eller bruk Safari/Chrome.");
        }
        raf = requestAnimationFrame(mouth);
        await speak(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]!);
        void prepareFillers();
        await loop();
      } catch (e) {
        setError((e as Error).message); go("failed");
      }
    })();

    return () => {
      alive.current = false;
      abort.abort();
      cancelAnimationFrame(raf);
      if (watchdog) clearInterval(watchdog);
      stopBrowserSpeech();
      player?.close();
      mic?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => { mutedRef.current = !mutedRef.current; setMuted(mutedRef.current); };
  /** Push to talk (browser recognizer): one utterance started inside the tap. */
  const talk = () => {
    const done = pttResolve.current;
    if (!done || phase !== "listening") return;
    pttResolve.current = null;
    setNote("Snakk nå …");
    listenBrowser().then((t) => { setNote(null); done(t); }, (e: Error) => { setNote(`Hørte ikke (${e.message}).`); done(""); });
  };
  const mood: MikeMood = phase === "thinking" ? "think" : phase === "speaking" && said ? moodFor(said) : phase === "failed" ? "shock" : "happy";
  const mm = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div ref={wrap} role="dialog" aria-modal="true" aria-label="Samtale med Mike" className={`call ${phase === "speaking" || phase === "thinking" ? "mike--talk" : ""}`}>
      <div className="call__top">
        <p className="eyebrow">{engine === "eleven" ? "ElevenLabs" : localVoice ? "Nedlastet stemme" : "Nettleserens stemme"} · {whisper ? "Whisper lytter" : "nettleseren lytter"}</p>
        <p className="call__timer tabular-nums">{mm}</p>
      </div>
      <div className={`call__stage is-${phase}`}>
        <Mike mood={mood} className="call__mike" />
        <h2 className="mt-4 text-3xl font-black">Mike</h2>
        <p className="call__status">{phase === "listening" && ptt ? "Trykk «Snakk» og si noe på engelsk" : STATUS[phase]}{muted && phase === "listening" ? " (dempet)" : ""}</p>
        {whisper && (phase === "listening" || phase === "speaking") && <div className="call__meter" aria-hidden><i /></div>}
        {error && <p className="mt-2 max-w-xs text-sm text-destructive">{error}</p>}
        {note && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{note}</p>}
      </div>
      <div className="call__captions" aria-live="polite">
        {heard && <p className="call__cap is-me">{heard}</p>}
        {said && <p className="call__cap is-mike">{said}</p>}
      </div>
      <div className="call__buttons safe-bottom">
        {ptt
          ? <Button size="lg" className="call__btn px-6" onClick={talk} disabled={phase !== "listening"} aria-label="Trykk og snakk"><Mic /> Snakk</Button>
          : whisper
            ? <Button variant="outline" size="lg" className="call__btn" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "Slå på mikrofonen" : "Demp mikrofonen"}>{muted ? <MicOff /> : <Mic />}</Button>
            : null}
        <Button size="lg" className="call__btn call__hangup" onClick={onEnd} aria-label="Legg på"><PhoneOff /> Legg på</Button>
      </div>
    </div>
  );
}
