import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Settings2, Phone, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mike } from "@/components/Mike";
import { PlayerAvatar } from "@/components/CoachAvatar";
import { today, useProgress } from "@/lib/progress";
import { askMike, loadBrain, saveBrain, mikeContext, ollamaReachable, MIKE_OPENERS, type BrainSettings, type BrainSource, type ChatMsg } from "@/lib/mike-brain";
import { moodFor, type MikeMood } from "@/lib/mike";
import { MikeCall } from "@/components/MikeCall";
import { ELEVEN_STOCK, MIKE_VOICES, VOICE_DOWNLOAD_MB, browserVoices, elevenError, listElevenVoices, setBrowserVoice, setElevenVoice, setListenMode, setMikeVoice, setVoiceEngine, speakBrowser, speakEleven, unlockBrowserSpeech, useVoice, voiceDownload, voiceDownloadedBefore, type ElevenVoice, type MikeVoiceId, type VoiceEngine } from "@/lib/voice";
import { onlineAvailable } from "@/lib/online";

export const Route = createFileRoute("/mike")({
  head: () => ({ meta: [{ title: "Mike – Goblin Chess" }, { name: "description", content: "Snakk med Mike." }] }),
  component: MikeChat,
});

const SESSION_KEY = "goblin-chess.mike-chat";

function MikeChat() {
  const p = useProgress();
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]"); } catch { return []; } });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [source, setSource] = useState<BrainSource | null>(null);
  const [brain, setBrain] = useState<BrainSettings>(loadBrain);
  const [showSettings, setShowSettings] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const voice = useVoice();
  const [call, setCall] = useState<AudioContext | null>(null);
  const [saved, setSaved] = useState(false);
  const [elevenVoices, setElevenVoices] = useState<ElevenVoice[] | null>(null);
  const [elevenMsg, setElevenMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  useEffect(() => {
    if (!showSettings || elevenVoices || !onlineAvailable()) return;
    listElevenVoices().then((v) => setElevenVoices(v.length ? v : ELEVEN_STOCK), (e: Error) => { setElevenVoices(ELEVEN_STOCK); setElevenMsg(elevenError(e.message)); });
  }, [showSettings, elevenVoices]);
  const testEleven = async () => {
    setTesting(true); setElevenMsg(null);
    const ctx = new AudioContext();
    try {
      await ctx.resume();
      const clip = await speakEleven("Mike here. One eye, two red ears, hand-sewn by you. Let's play some chess.", ctx);
      const buf = ctx.createBuffer(1, clip.pcm.length, clip.rate); buf.copyToChannel(clip.pcm as Float32Array<ArrayBuffer>, 0);
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.onended = () => void ctx.close(); src.start();
      setElevenMsg("ElevenLabs virker ✓");
    } catch (e) { setElevenMsg(elevenError((e as Error).message)); void ctx.close(); }
    finally { setTesting(false); }
  };
  const lastMike = [...msgs].reverse().find((m) => m.role === "assistant")?.content;
  const mood: MikeMood = busy ? "think" : lastMike ? moodFor(lastMike) : "chill";

  useEffect(() => { void ollamaReachable(brain).then(setOnline); }, [brain]);
  // Warm up the voice models from the browser cache if they were downloaded before, so a call starts instantly.
  useEffect(() => { if (voiceDownloadedBefore()) voiceDownload(); }, []);
  useEffect(() => { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs.slice(-40))); } catch { /* ignore */ } bottom.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  async function send(raw: string) {
    const content = raw.trim();
    if (!content || busy) return;
    const history: ChatMsg[] = [...msgs, { role: "user", content }];
    setMsgs(history);
    setText("");
    setBusy(true);
    const r = await askMike(brain, mikeContext(p, today()), history, online === true);
    setSource(r.source);
    setMsgs([...history, { role: "assistant", content: r.text }]);
    setBusy(false);
  }

  return (
    <main className="page-layout page-narrow flex min-h-[calc(100dvh-140px)] flex-col">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Mike mood={mood} className="w-14" />
          <div><h1 className="text-xl font-bold leading-tight">Mike</h1><p className="text-xs text-muted-foreground">{source === null ? "Hjerne: skyen" : source === "cloud" ? "Hjerne: skyen" : source === "ollama" ? "Hjerne: Ollama" : "Hjerne: innebygd (skyen svarte ikke)"}</p></div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" className="font-bold" aria-label="Ring Mike" disabled={busy} onClick={() => { const ctx = new AudioContext(); void ctx.resume(); unlockBrowserSpeech(); setCall(ctx); }}><Phone /> Ring Mike</Button>
          <Button variant="ghost" size="icon" aria-label="Innstillinger for Mike" onClick={() => setShowSettings((s) => !s)}><Settings2 /></Button>
        </div>
      </header>

      {voice.engine === "local" && voice.status !== "ready" && (
        <section className="card-game mb-3 flex flex-wrap items-center justify-between gap-3 p-3 text-sm" aria-label="Mikes stemme">
          <div className="min-w-0">
            <p className="font-semibold">{voice.status === "downloading" ? `Laster ned Mikes stemme … ${Math.round(voice.progress * 100)} %` : voice.status === "error" ? "Nedlastingen feilet" : "Mikes egen stemme"}</p>
            <p className="text-xs text-muted-foreground">{voice.status === "error" ? voice.error : `Ca. ${VOICE_DOWNLOAD_MB} MB, én gang. Uten den bruker samtalen nettleserens stemme.`}</p>
            {voice.status === "downloading" && <div className="xp-track mt-2 w-56"><div className="xp-fill" style={{ width: `${Math.round(voice.progress * 100)}%` }} /></div>}
          </div>
          {voice.status !== "downloading" && <Button size="sm" variant="outline" onClick={voiceDownload}><Download /> Last ned</Button>}
        </section>
      )}

      {showSettings && (
        <section className="card-game mb-3 p-4 text-sm" aria-label="Mikes hjerne">
          <p className="mb-2 font-semibold">Reserve: Ollama på Macen {online ? "(funnet)" : "(ikke funnet)"}</p>
          <label className="block text-xs text-muted-foreground">Adresse<input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" value={brain.url} onChange={(e) => setBrain({ ...brain, url: e.target.value })} /></label>
          <label className="mt-2 block text-xs text-muted-foreground">Modell<input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" value={brain.model} onChange={(e) => setBrain({ ...brain, model: e.target.value })} /></label>
          <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => { saveBrain(brain); setSaved(true); setTimeout(() => setSaved(false), 1500); void ollamaReachable(brain).then(setOnline); }}>{saved ? "Lagret ✓" : "Lagre og test"}</Button><Button size="sm" variant="outline" onClick={() => setMsgs([])}>Tøm samtalen</Button></div>
          <p className="mt-3 text-xs text-muted-foreground">Mike bruker skyen først. Ollama brukes bare hvis skyen ikke svarer; innebygde replikker er siste utvei.</p>

          <p className="mb-1 mt-5 font-semibold">Stemmemotor</p>
          <div className="flex flex-wrap gap-2">
            {([["eleven", "ElevenLabs (best)"], ["local", "Nedlastet (Kokoro)"], ["browser", "Nettleseren"]] as const).map(([id, label]) => (
              <button key={id} type="button" className={`chip min-h-9 px-3 ${voice.engine === id ? "border-primary text-primary" : ""}`} aria-pressed={voice.engine === id} onClick={() => setVoiceEngine(id as VoiceEngine)}>{label}</button>
            ))}
          </div>
          {voice.engine === "eleven" && (
            <div className="mt-2">
              <div className="flex gap-2">
                <select value={voice.elevenVoice} onChange={(e) => setElevenVoice(e.target.value)} aria-label="ElevenLabs-stemme" className="min-h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm">
                  {(elevenVoices ?? ELEVEN_STOCK).map((v) => <option key={v.id} value={v.id}>{v.name}{v.labels["accent"] ? ` · ${v.labels["accent"]}` : ""}{v.labels["description"] ? ` · ${v.labels["description"]}` : ""}</option>)}
                  {!(elevenVoices ?? ELEVEN_STOCK).some((v) => v.id === voice.elevenVoice) && <option value={voice.elevenVoice}>Egen stemme-ID</option>}
                </select>
                <Button size="sm" variant="outline" disabled={testing} onClick={() => void testEleven()}>{testing ? "…" : "Prøv"}</Button>
              </div>
              <input value={voice.elevenVoice} onChange={(e) => setElevenVoice(e.target.value.trim())} aria-label="Stemme-ID fra ElevenLabs" placeholder="…eller lim inn en Voice ID fra ElevenLabs-biblioteket" className="mt-2 min-h-9 w-full rounded-lg border border-border bg-background px-3 text-xs" />
              {elevenMsg && <p role="status" className="mt-1 text-xs font-semibold text-primary">{elevenMsg}</p>}
              <p className="mt-1 text-xs text-muted-foreground">Stemmene hentes fra ElevenLabs-kontoen din (legg til flere under «Voices» der). Hvis ElevenLabs feiler i en samtale, brukes neste stemme automatisk.</p>
            </div>
          )}

          <p className="mb-1 mt-5 font-semibold">Mikes egen stemme (nedlastet) {voice.status === "ready" ? <Check className="inline size-4 text-primary" /> : <span className="text-xs font-normal text-muted-foreground">– ikke lastet ned ennå</span>}</p>
          <div className="flex flex-wrap gap-2">
            {MIKE_VOICES.map((v) => <button key={v.id} type="button" className={`chip min-h-9 px-3 ${voice.voice === v.id ? "border-primary text-primary" : ""}`} aria-pressed={voice.voice === v.id} title={v.hint} onClick={() => setMikeVoice(v.id as MikeVoiceId)}>{v.name}</button>)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{MIKE_VOICES.find((v) => v.id === voice.voice)?.hint}. Valget lagres med en gang og brukes i neste samtale{voice.status === "ready" ? "" : " – når stemmen er lastet ned"}.</p>

          <p className="mb-1 mt-4 font-semibold">Nettleserens stemme (uten nedlasting)</p>
          <div className="flex gap-2">
            <select value={voice.browserVoice} onChange={(e) => setBrowserVoice(e.target.value)} aria-label="Nettleserens stemme" className="min-h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">Automatisk</option>
              {browserVoices().map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={() => { unlockBrowserSpeech(); void speakBrowser("Mike here. One eye, two red ears. Let's play."); }}>Prøv</Button>
          </div>

          <p className="mb-1 mt-4 font-semibold">Lytting</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`chip min-h-9 px-3 ${voice.listen === "auto" ? "border-primary text-primary" : ""}`} aria-pressed={voice.listen === "auto"} onClick={() => setListenMode("auto")}>Nettleseren (rask)</button>
            <button type="button" className={`chip min-h-9 px-3 ${voice.listen === "whisper" ? "border-primary text-primary" : ""}`} aria-pressed={voice.listen === "whisper"} onClick={() => setListenMode("whisper")}>Whisper (lokal, tregere)</button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Safari og Chrome hører raskt selv. Whisper kjører helt lokalt, men bruker 10–30 sekunder per setning på en iPad.</p>
        </section>
      )}

      <section className="chat flex-1" aria-live="polite">
        {msgs.length === 0 && (
          <div className="chat__row is-mike"><Mike mood="chill" className="w-9" animate={false} /><p className="chat__msg">Mike here. One eye, two red ears, hand-sewn by you. What are we working on?</p></div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`chat__row ${m.role === "user" ? "is-me" : "is-mike"}`}>
            {m.role === "user" ? <PlayerAvatar className="size-9" /> : <Mike mood={moodFor(m.content)} className="w-9" animate={false} />}
            <p className="chat__msg">{m.content}</p>
          </div>
        ))}
        {busy && <div className="chat__row is-mike"><Mike mood="think" className="w-9" animate={false} /><p className="chat__msg chat__typing"><i /><i /><i /></p></div>}
        <div ref={bottom} />
      </section>

      <div className="chat__chips mt-3">
        {MIKE_OPENERS.map((o) => <button key={o} className="chip min-h-9 px-3" onClick={() => void send(o)} disabled={busy}>{o}</button>)}
      </div>
      {call && <MikeCall ctx={call} brain={brain} context={mikeContext(p, today())} history={msgs} onExchange={(u, m) => setMsgs((h) => [...h, { role: "user", content: u }, { role: "assistant", content: m }])} onEnd={() => { void call.close(); setCall(null); }} />}

      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write to Mike…" aria-label="Melding til Mike" maxLength={300}
          className="min-h-12 flex-1 rounded-xl border border-border bg-card px-4 text-base" autoComplete="off" />
        <Button type="submit" size="lg" disabled={busy || !text.trim()} aria-label="Send"><Send /></Button>
      </form>
    </main>
  );
}
