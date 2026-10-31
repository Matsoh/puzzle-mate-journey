import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mike } from "./Mike";
import { PlayerAvatar } from "./CoachAvatar";
import { today, useProgress } from "@/lib/progress";
import { askMike, loadBrain, mikeContext, type ChatMsg } from "@/lib/mike-brain";
import { MODE_RULES, type MikeMode } from "@/lib/mike-game";
import { moodFor, type MikeLine } from "@/lib/mike";
import { mikeLevel, primeMikeVoice, sayMike, setMikeVoiceOn, useMikeVoice } from "@/lib/mike-voice";

type Props = {
  mode: MikeMode;
  /** What Mike says right now (deterministic, no network). */
  line: MikeLine | null;
  /** Page-specific facts for the cloud brain (position, results, rounds…). */
  context: string;
  quick?: string[] | undefined;
  compact?: boolean | undefined;
  className?: string | undefined;
  /** Read `line` aloud when it changes (key moments only – the caller decides what counts). */
  speak?: boolean | undefined;
  /** Treat every new line as important (no throttling) – e.g. lessons in the school. */
  important?: boolean | undefined;
};

const QUICK: Record<MikeMode, string[]> = {
  game: ["What should I focus on?", "I'm nervous", "Is this position ok?"],
  training: ["Give me a hint", "What's the plan here?", "What is my worst piece?"],
  review: ["What was my biggest mistake?", "What did I do well?", "What should I practise?"],
  tournament: ["I lost, help", "I'm nervous", "What's my goal this round?"],
  trainer: ["Why this exercise?", "Make it fun", "How does this help in games?"],
};

/** Mike beside the board / the round / the session: a live line plus an optional mini-chat. */
export function MikeCompanion({ mode, line, context, quick, compact = false, className, speak = false, important = false }: Props) {
  const p = useProgress();
  const [open, setOpen] = useState(false);
  const voice = useMikeVoice();
  const wrap = useRef<HTMLElement>(null);
  const lastSaid = useRef<string | null>(null);
  useEffect(() => {
    if (!speak || !line?.text || line.text === lastSaid.current) return;
    lastSaid.current = line.text;
    void sayMike(line.text, important);
  }, [line?.text, speak, important]);
  useEffect(() => {
    if (!voice.speaking) { wrap.current?.style.setProperty("--talk", "0"); return; }
    let raf = 0;
    const tick = () => { wrap.current?.style.setProperty("--talk", mikeLevel().toFixed(3)); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [voice.speaking]);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) bottom.current?.scrollIntoView({ block: "nearest" }); }, [msgs, open]);

  async function send(raw: string) {
    const content = raw.trim();
    if (!content || busy) return;
    const history: ChatMsg[] = [...msgs, { role: "user", content }];
    setMsgs(history); setText(""); setBusy(true);
    const full = `${mikeContext(p, today())}\n\n${context}`;
    const r = await askMike(loadBrain(), full, history, false, MODE_RULES[mode]);
    setMsgs([...history, { role: "assistant", content: r.text }]);
    setBusy(false);
  }

  return (
    <section ref={wrap} className={`card-game p-3 ${voice.speaking ? "mike--talk" : ""} ${className ?? ""}`} aria-label="Mike">
      <div className="flex items-end gap-3">
        <Mike mood={busy ? "think" : msgs.length ? moodFor([...msgs].reverse().find((m) => m.role === "assistant")?.content ?? "") : line?.mood ?? "chill"} className={compact ? "w-11 shrink-0" : "w-14 shrink-0"} animate={false} />
        <div className="mike-bubble min-w-0 flex-1 text-sm">
          <span className="mike-bubble__name">Mike</span>
          {line?.text ?? "Right here. Ask me anything about the position."}
        </div>
        {speak && <button type="button" onClick={() => { primeMikeVoice(); setMikeVoiceOn(!voice.on); if (!voice.on && line?.text) { lastSaid.current = line.text; void sayMike(line.text, true); } }} aria-pressed={voice.on} aria-label={voice.on ? "Slå av Mikes stemme" : "Slå på Mikes stemme"} className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:bg-muted">{voice.on ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}</button>}
      </div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold text-primary hover:bg-muted"><MessageCircle className="size-4" />Spør Mike</button>
      ) : (
        <div className="mt-3">
          <div className="chat max-h-64 overflow-y-auto pr-1" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`chat__row ${m.role === "user" ? "is-me" : "is-mike"}`}>
                {m.role === "user" ? <PlayerAvatar className="size-7" /> : <Mike mood={moodFor(m.content)} className="w-7" animate={false} />}
                <p className="chat__msg text-sm">{m.content}</p>
              </div>
            ))}
            {busy && <div className="chat__row is-mike"><Mike mood="think" className="w-7" animate={false} /><p className="chat__msg chat__typing"><i /><i /><i /></p></div>}
            <div ref={bottom} />
          </div>
          <div className="chat__chips mt-2">{(quick ?? QUICK[mode]).map((q) => <button key={q} className="chip min-h-9 px-3" disabled={busy} onClick={() => void send(q)}>{q}</button>)}</div>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask Mike…" aria-label="Spør Mike" maxLength={300} autoComplete="off" className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm" />
            <Button type="submit" size="icon" className="size-11" disabled={busy || !text.trim()} aria-label="Send"><Send /></Button>
            <Button type="button" size="icon" variant="ghost" className="size-11" onClick={() => setOpen(false)} aria-label="Lukk"><X /></Button>
          </form>
        </div>
      )}
    </section>
  );
}
