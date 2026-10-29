import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mike } from "@/components/Mike";
import { askMike, type BrainSettings, type ChatMsg } from "@/lib/mike-brain";
import { moodFor, type MikeMood } from "@/lib/mike";
import { Player, Segmenter, browserRecognitionAvailable, browserSpeechAvailable, elevenError, listenBrowser, openMic, resample, speakBrowser, speakEleven, stopBrowserSpeech, transcribeEleven, withTimeout, type Mic as MicHandle } from "@/lib/voice";

export type CallPhase = "connecting" | "listening" | "thinking" | "speaking" | "ended" | "failed";

/** Rules appended to Mike's prompt during a call: short, spoken, English. */
export const CALL_RULES = `VOICE CALL MODE: Tobias is talking to you on the phone and your reply is read aloud. Answer in one to three short spoken sentences. Plain text only: no markdown, no lists, no emoji, no stage directions. Ask at most one question. If you didn't understand, say so briefly and ask him to say it again.`;

const GREETINGS = ["Mike here. One eye, two ears, all yours. What's up?", "Yo. You rang the felt monster. Talk to me.", "Mike speaking. Board's ready, I'm ready. What are we doing?"];
/** Short clips Mike plays while the brain is working, so the line never goes dead. */
const FILLERS = ["Hmm.", "Let me think."];

const STATUS: Record<CallPhase, string> = { connecting: "Ringer …", listening: "Lytter – snakk engelsk", thinking: "Mike tenker …", speaking: "Mike snakker", ended: "Samtalen er over", failed: "Fikk ikke til samtalen" };

type Clip = { pcm: Float32Array; rate: number };
/** Filler clips survive across calls so ElevenLabs isn't asked for "Hmm." every time. */
let fillerCache: Clip[] = [];

/** How Mike listens: our own microphone + ElevenLabs Scribe (one audio path, works on iPad), the browser's recognizer, or push-to-talk. */
type Ears = "scribe" | "browser" | "ptt";

/**
 * A phone call with Mike: hands-free. Listens until Tobias goes quiet, sends what he
 * said to Mike's brain, reads the answer aloud with ElevenLabs, listens again – until "Legg på".
 */
export function MikeCall({ ctx, brain, context, history, onExchange, onEnd }: { ctx: AudioContext; brain: BrainSettings; context: string; history: ChatMsg[]; onExchange: (user: string, mike: string) => void; onEnd: () => void }) {
  const [phase, setPhase] = useState<CallPhase>("connecting");
  const [muted, setMuted] = useState(false);
  const [ears, setEars] = useState<Ears>("scribe");
  const earsRef = useRef<Ears>("scribe");
  const pttResolve = useRef<((t: string) => void) | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const mutedRef = useRef(false);
  const histRef = useRef<ChatMsg[]>(history);
  const phaseRef = useRef<CallPhase>("connecting");
  const go = (p: CallPhase) => { phaseRef.current = p; if (alive.current) setPhase(p); };
  const setEarsBoth = (e: Ears) => { earsRef.current = e; if (alive.current) setEars(e); };

  useEffect(() => { const t = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    alive.current = true;
    let mic: MicHandle | null = null;
    let player: Player | null = null;
    let seg: Segmenter | null = null;
    let raf = 0;
    let eleven = true;
    let scribeFails = 0;
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
          const clip = await withTimeout(speakEleven(text, ctx), 20_000, "Stemmen");
          player.enqueue(clip.pcm, clip.rate);
          await withTimeout(player.drain(), 60_000, "Avspillingen");
          spoken = true;
        } catch (e) { eleven = false; setNote(`${elevenError((e as Error).message)} Bruker nettleserens stemme.`); player.stop(); }
      }
      if (!spoken && browserSpeechAvailable()) {
        try { await speakBrowser(text, () => wrap.current?.style.setProperty("--talk", String(0.4 + Math.random() * 0.6))); } catch { /* a silent Mike is still Mike */ }
      }
      mic?.setMuted(mutedRef.current);
    };

    const prepareFillers = async () => {
      if (fillerCache.length) { fillers.push(...fillerCache); return; }
      for (const f of FILLERS) {
        if (!alive.current || !eleven) return;
        try { fillers.push(await speakEleven(f, ctx)); } catch { /* skip */ }
      }
      fillerCache = [...fillers];
    };
    const playFiller = async () => {
      const clip = fillers[Math.floor(Math.random() * fillers.length)];
      if (!clip || !player) return;
      await resume();
      player.enqueue(clip.pcm.slice(), clip.rate);
    };

    /** Our own microphone: wait for one utterance (the silence detector decides), then Scribe. */
    const listenScribe = (): Promise<string> => new Promise((resolve) => {
      seg?.reset();
      mic?.setMuted(mutedRef.current);
      utterance = (pcm: Float32Array) => {
        utterance = null;
        go("thinking");
        withTimeout(transcribeEleven(resample(pcm, ctx.sampleRate, 16_000)), 20_000, "Lyttingen").then((t) => { scribeFails = 0; setNote(null); resolve(t); }, (e) => {
          const msg = (e as Error).message;
          if (/no stt|bad key|no key/.test(msg) || ++scribeFails >= 2) {
            mic?.setMuted(true);
            setEarsBoth(browserRecognitionAvailable() ? "browser" : "ptt");
            setNote(`${elevenError(msg)} ${browserRecognitionAvailable() ? "Nettleseren lytter i stedet." : "Trykk «Snakk» og si noe."}`);
          } else setNote(`Hørte ikke (${elevenError(msg)}).`);
          resolve("");
        });
      };
    });

    /** The browser's recognizer; iOS sometimes ends it at once outside a tap → push to talk. */
    const listenBrowserOnce = async (): Promise<string> => {
      if (player) { try { await ctx.suspend(); } catch { /* ignore */ } } // iOS has one audio session: free it for the recognizer
      await new Promise((r) => setTimeout(r, 250));
      const t0 = Date.now();
      const toPtt = (why: string) => { setEarsBoth("ptt"); setNote(`Automatisk lytting virket ikke (${why}). Trykk «Snakk» og si noe.`); };
      return listenBrowser(abort.signal).then((t) => {
        if (!t && Date.now() - t0 < 1500) { if (++instantEnds >= 2) toPtt("stoppet med en gang"); } else instantEnds = 0;
        return t;
      }, (e: Error) => { toPtt(e.message); return ""; });
    };

    const listenPtt = (): Promise<string> => new Promise((resolve) => { pttResolve.current = resolve; });

    const listenOnce = (): Promise<string> => {
      go("listening");
      const e = earsRef.current;
      return e === "scribe" ? listenScribe() : e === "browser" ? listenBrowserOnce() : listenPtt();
    };

    const loop = async () => {
      while (alive.current) {
        if (mutedRef.current && earsRef.current === "scribe") { await new Promise((r) => setTimeout(r, 300)); continue; }
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
        player = new Player(ctx);
        try {
          mic = await openMic(ctx, (block) => { lastBlock = Date.now(); if (!seg || mutedRef.current) return; const u = seg.push(block); if (u && utterance) utterance(u); });
          seg = new Segmenter(ctx.sampleRate);
          watchdog = setInterval(() => {
            if (earsRef.current !== "scribe" || phaseRef.current !== "listening" || mutedRef.current) { lastBlock = Date.now(); return; }
            if (Date.now() - lastBlock > 3000) { setNote("Mikrofonen gir ingen lyd – prøver å vekke den …"); void ctx.resume(); lastBlock = Date.now(); }
          }, 1000);
        } catch (e) {
          // No microphone access: the browser's recognizer asks for it on its own.
          if (!browserRecognitionAvailable()) throw new Error(`Fikk ikke tilgang til mikrofonen (${(e as Error).message}).`);
          setEarsBoth("browser");
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
  /** Push to talk: one utterance started inside the tap. */
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
        <p className="eyebrow">Samtale</p>
        <p className="call__timer tabular-nums">{mm}</p>
      </div>
      <div className={`call__stage is-${phase}`}>
        <Mike mood={mood} className="call__mike" />
        <h2 className="mt-4 text-3xl font-black">Mike</h2>
        <p className="call__status">{phase === "listening" && ears === "ptt" ? "Trykk «Snakk» og si noe på engelsk" : STATUS[phase]}{muted && phase === "listening" ? " (dempet)" : ""}</p>
        {ears === "scribe" && (phase === "listening" || phase === "speaking") && <div className="call__meter" aria-hidden><i /></div>}
        {error && <p className="mt-2 max-w-xs text-sm text-destructive">{error}</p>}
        {note && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{note}</p>}
      </div>
      <div className="call__captions" aria-live="polite">
        {heard && <p className="call__cap is-me">{heard}</p>}
        {said && <p className="call__cap is-mike">{said}</p>}
      </div>
      <div className="call__buttons safe-bottom">
        {ears === "ptt"
          ? <Button size="lg" className="call__btn px-6" onClick={talk} disabled={phase !== "listening"} aria-label="Trykk og snakk"><Mic /> Snakk</Button>
          : ears === "scribe"
            ? <Button variant="outline" size="lg" className="call__btn" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "Slå på mikrofonen" : "Demp mikrofonen"}>{muted ? <MicOff /> : <Mic />}</Button>
            : null}
        <Button size="lg" className="call__btn call__hangup" onClick={onEnd} aria-label="Legg på"><PhoneOff /> Legg på</Button>
      </div>
    </div>
  );
}
