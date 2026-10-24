import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mike } from "@/components/Mike";
import { PlayerAvatar } from "@/components/CoachAvatar";
import { today, useProgress } from "@/lib/progress";
import { askOllama, loadBrain, saveBrain, mikeContext, offlineMike, ollamaReachable, MIKE_OPENERS, type BrainSettings, type ChatMsg } from "@/lib/mike-brain";
import type { MikeMood } from "@/lib/mike";

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
  const [brain, setBrain] = useState<BrainSettings>(loadBrain);
  const [showSettings, setShowSettings] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const mood: MikeMood = busy ? "think" : msgs.length === 0 ? "chill" : "happy";

  useEffect(() => { void ollamaReachable(brain).then(setOnline); }, [brain]);
  useEffect(() => { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs.slice(-40))); } catch { /* ignore */ } bottom.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  async function send(raw: string) {
    const content = raw.trim();
    if (!content || busy) return;
    const history: ChatMsg[] = [...msgs, { role: "user", content }];
    setMsgs(history);
    setText("");
    setBusy(true);
    let reply: string;
    try {
      reply = online ? await askOllama(brain, mikeContext(p, today()), history) : offlineMike(content);
    } catch {
      setOnline(false);
      reply = offlineMike(content);
    }
    setMsgs([...history, { role: "assistant", content: reply }]);
    setBusy(false);
  }

  return (
    <main className="page-layout page-narrow flex min-h-[calc(100dvh-140px)] flex-col">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Mike mood={mood} className="w-14" />
          <div><h1 className="text-xl font-bold leading-tight">Mike</h1><p className="text-xs text-muted-foreground">{online === null ? "…" : online ? "Hjerne: Ollama" : "Hjerne: innebygd"}</p></div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Innstillinger for Mike" onClick={() => setShowSettings((s) => !s)}><Settings2 /></Button>
      </header>

      {showSettings && (
        <section className="card-game mb-3 p-4 text-sm" aria-label="Mikes hjerne">
          <p className="mb-2 font-semibold">Mikes hjerne (Ollama på Macen)</p>
          <label className="block text-xs text-muted-foreground">Adresse<input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" value={brain.url} onChange={(e) => setBrain({ ...brain, url: e.target.value })} /></label>
          <label className="mt-2 block text-xs text-muted-foreground">Modell<input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" value={brain.model} onChange={(e) => setBrain({ ...brain, model: e.target.value })} /></label>
          <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => { saveBrain(brain); void ollamaReachable(brain).then(setOnline); }}>Lagre og test</Button><Button size="sm" variant="outline" onClick={() => setMsgs([])}>Tøm samtalen</Button></div>
          <p className="mt-3 text-xs text-muted-foreground">Uten Ollama svarer Mike med innebygde replikker. Oppsett: se README.</p>
        </section>
      )}

      <section className="chat flex-1" aria-live="polite">
        {msgs.length === 0 && (
          <div className="chat__row is-mike"><Mike mood="chill" className="w-9" animate={false} /><p className="chat__msg">Mike here. One eye, two horns, infinite chess. What's up?</p></div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`chat__row ${m.role === "user" ? "is-me" : "is-mike"}`}>
            {m.role === "user" ? <PlayerAvatar className="size-9" /> : <Mike mood="chill" className="w-9" animate={false} />}
            <p className="chat__msg">{m.content}</p>
          </div>
        ))}
        {busy && <div className="chat__row is-mike"><Mike mood="think" className="w-9" animate={false} /><p className="chat__msg chat__typing"><i /><i /><i /></p></div>}
        <div ref={bottom} />
      </section>

      <div className="chat__chips mt-3">
        {MIKE_OPENERS.map((o) => <button key={o} className="chip min-h-9 px-3" onClick={() => void send(o)} disabled={busy}>{o}</button>)}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write to Mike…" aria-label="Melding til Mike" maxLength={300}
          className="min-h-12 flex-1 rounded-xl border border-border bg-card px-4 text-base" autoComplete="off" />
        <Button type="submit" size="lg" disabled={busy || !text.trim()} aria-label="Send"><Send /></Button>
      </form>
    </main>
  );
}
