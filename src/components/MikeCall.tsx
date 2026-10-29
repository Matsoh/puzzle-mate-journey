import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mike } from "@/components/Mike";
import { askMike, type BrainSettings, type ChatMsg } from "@/lib/mike-brain";
import { moodFor, type MikeMood } from "@/lib/mike";
import { Player, Segmenter, browserRecognitionAvailable, browserSpeechAvailable, listenBrowser, openMic, resample, speakBrowser, speakLocal, stopBrowserSpeech, transcribeLocal, voiceReady, withTimeout, type Mic as MicHandle } from "@/lib/voice";

export type CallPhase = "connecting" | "listening" | "thinking" | "speaking" | "ended" | "failed";

/** Rules appended to Mike's prompt during a call: short, spoken, English. */
export const CALL_RULES = `VOICE CALL MODE: Tobias is talking to you on the phone and your reply is read aloud. Answer in one to three short spoken sentences. Plain text only: no markdown, no lists, no emoji, no stage directions. Ask at most one question. If you didn't understand, say so briefly and ask him to say it again.`;

const GREETINGS = ["Mike here. One eye, two ears, all yours. What's up?", "Yo. You rang the felt monster. Talk to me.", "Mike speaking. Board's ready, I'm ready. What are we doing?"];

const STATUS: Record<CallPhase, string> = { connecting: "Ringer …", listening: "Lytter – snakk engelsk", thinking: "Mike tenker …", speaking: "Mike snakker", ended: "Samtalen er over", failed: "Fikk ikke til samtalen" };

/**
 * A phone call with Mike: hands-free. Listens until Tobias goes quiet, sends what he
 * said to Mike's brain, reads the answer aloud, listens again – until "Legg på".
 * Local Whisper + Kokoro when downloaded, otherwise the browser's own speech tools.
 */
export function MikeCall({ ctx, brain, context, history, onExchange, onEnd }: { ctx: AudioContext; brain: BrainSettings; context: string; history: ChatMsg[]; onExchange: (user: string, mike: string) => void; onEnd: () => void }) {
  const [phase, setPhase] = useState<CallPhase>("connecting");
  const [muted, setMuted] = useState(false);
  /** Browser fallback on iOS may only start listening from a tap: then the mic button is "push to talk". */
  const [ptt, setPtt] = useState(false);
  const pttRef = useRef(false);
  const pttResolve = useRef<((t: string) => void) | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [local] = useState(() => voiceReady());
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
    const abort = new AbortController();
    let utterance: ((pcm: Float32Array) => void) | null = null;

    const mouth = () => {
      const lvl = phaseRef.current === "speaking" ? player?.level() ?? 0 : phaseRef.current === "listening" ? (seg?.level ?? 0) * 0.5 : 0;
      wrap.current?.style.setProperty("--talk", lvl.toFixed(3));
      raf = requestAnimationFrame(mouth);
    };

    const speak = async (text: string) => {
      go("speaking"); setSaid(text);
      mic?.setMuted(true); // don't listen to ourselves
      let spoken = false;
      if (local && player) {
        try {
          if (ctx.state !== "running") await ctx.resume();
          await withTimeout(speakLocal(text, (pcm, rate) => player?.enqueue(pcm, rate)), 45_000, "Stemmen");
          await withTimeout(player.drain(), 60_000, "Avspillingen");
          spoken = true;
        } catch (e) { setNote(`Lokal stemme feilet (${(e as Error).message}) – bruker nettleserens.`); player.stop(); }
      }
      if (!spoken && browserSpeechAvailable()) {
        try { await speakBrowser(text, () => wrap.current?.style.setProperty("--talk", String(0.4 + Math.random() * 0.6))); } catch { /* a silent Mike is still Mike */ }
      }
      mic?.setMuted(mutedRef.current);
    };

    const listenOnce = (): Promise<string> => {
      go("listening");
      if (local) {
        return new Promise((resolve) => {
          seg?.reset();
          utterance = (pcm: Float32Array) => {
            utterance = null;
            go("thinking");
            withTimeout(transcribeLocal(resample(pcm, ctx.sampleRate, 16_000)), 30_000, "Lyttingen").then(resolve, (e) => { setNote(`Hørte ikke (${(e as Error).message}).`); resolve(""); });
          };
        });
      }
      if (pttRef.current) return new Promise<string>((resolve) => { pttResolve.current = resolve; });
      return listenBrowser(abort.signal).catch((e: Error) => {
        // Safari: "not-allowed" outside a tap → switch to push-to-talk for the rest of the call.
        pttRef.current = true; setPtt(true); setNote(`Automatisk lytting virket ikke (${e.message}). Trykk mikrofonen og snakk.`);
        return "";
      });
    };

    const loop = async () => {
      while (alive.current) {
        if (mutedRef.current) { await new Promise((r) => setTimeout(r, 300)); continue; }
        const text = await listenOnce();
        if (!alive.current) return;
        if (!text) { await new Promise((r) => setTimeout(r, 350)); continue; }
        setHeard(text); go("thinking");
        const hist: ChatMsg[] = [...histRef.current, { role: "user", content: text }];
        const r = await askMike(brain, context, hist, false, CALL_RULES).catch(() => ({ text: "Sorry, I lost you for a second. Say that again?", source: "offline" as const }));
        if (!alive.current) return;
        histRef.current = [...hist, { role: "assistant", content: r.text }];
        onExchange(text, r.text);
        await speak(r.text);
      }
    };

    void (async () => {
      try {
        if (local) {
          mic = await openMic(ctx, (block) => { if (!seg || mutedRef.current) return; const u = seg.push(block); if (u && utterance) utterance(u); });
          seg = new Segmenter(ctx.sampleRate);
          player = new Player(ctx);
        } else if (!browserRecognitionAvailable()) {
          throw new Error("Nettleseren har ikke talegjenkjenning. Last ned Mikes stemme, eller bruk Safari/Chrome.");
        }
        raf = requestAnimationFrame(mouth);
        await speak(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]!);
        await loop();
      } catch (e) {
        setError((e as Error).message); go("failed");
      }
    })();

    return () => {
      alive.current = false;
      abort.abort();
      cancelAnimationFrame(raf);
      stopBrowserSpeech();
      player?.close();
      mic?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => { mutedRef.current = !mutedRef.current; setMuted(mutedRef.current); };
  /** Push to talk (browser fallback): one utterance started inside the tap. */
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
    <div ref={wrap} role="dialog" aria-modal="true" aria-label="Samtale med Mike" className={`call ${phase === "speaking" ? "mike--talk" : ""}`}>
      <div className="call__top">
        <p className="eyebrow">{local ? "Mikes egen stemme" : "Nettleserens stemme"}</p>
        <p className="call__timer tabular-nums">{mm}</p>
      </div>
      <div className={`call__stage is-${phase}`}>
        <Mike mood={mood} className="call__mike" />
        <h2 className="mt-4 text-3xl font-black">Mike</h2>
        <p className="call__status">{phase === "listening" && ptt ? "Trykk «Snakk» og si noe på engelsk" : STATUS[phase]}{muted && phase === "listening" ? " (dempet)" : ""}</p>
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
          : <Button variant="outline" size="lg" className="call__btn" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "Slå på mikrofonen" : "Demp mikrofonen"}>{muted ? <MicOff /> : <Mic />}</Button>}
        <Button size="lg" className="call__btn call__hangup" onClick={onEnd} aria-label="Legg på"><PhoneOff /> Legg på</Button>
      </div>
    </div>
  );
}
