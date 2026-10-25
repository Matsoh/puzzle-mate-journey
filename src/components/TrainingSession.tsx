import { CoachAvatar } from "./CoachAvatar";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { X, ChevronRight, ChevronDown, CheckCircle2, Circle, Clock, Puzzle, Target, MessageSquare, GraduationCap, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdaptivePuzzle } from "./AdaptivePuzzle";
import { useTrainer, updateSession, sessionKey, ensureDaily, recordAttempt, saveDraft } from "@/lib/trainer-store";
import { getItem, LEVELS } from "@/lib/adaptive";
import { dailyPlan, PROFILES } from "@/lib/trainer";
import type { Progress } from "@/lib/progress";

type Panel = "task" | "refl" | null;
const rowCls = "flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring";

function StatusIcon({ done, label }: { done: boolean; label: string }) {
  return done ? <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden /> : <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden data-label={label} />;
}

export function TrainingSession({ progress, day }: { progress: Progress; day: string }) {
  const tr = useTrainer();
  const [short, setShort] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [closed, setClosed] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (tr.coach && day) ensureDaily(tr.coach, day); }, [tr.coach, day]);
  useEffect(() => { if (panel === "refl") textRef.current?.focus(); }, [panel]);
  if (!tr.coach) {
    return <section className="card-game mt-6 p-5 sm:p-6" aria-labelledby="session-h">
      <p className="eyebrow mb-1">Dagens økt</p>
      <h2 id="session-h" className="section-title">Velg din virtuelle trener</h2>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">Velg mellom en Magnus-inspirert eller Hikaru-inspirert treningsprofil og få en personlig økt hver dag.</p>
      <Button asChild><Link to="/trener"><GraduationCap />Til Mike Skolen</Link></Button>
    </section>;
  }
  const coach = tr.coach;
  const key = sessionKey(day, coach);
  const prof = PROFILES[coach];
  const plan = dailyPlan(coach, day);
  const rec = tr.sessions[key];
  const dItem = getItem(tr.daily[key]);
  const draft = tr.drafts[key] ?? rec?.reflection ?? "";
  const puzzlesDone = !!progress.daily && progress.daily.day === day && progress.daily.ids.length === 5 && progress.daily.ids.every((id) => progress.daily?.results[id]);
  const exDone = !!rec?.exercise;
  const sessionDone = !!rec?.done;
  const needPuzzles = !short && !puzzlesDone;
  const canFinish = exDone && !needPuzzles;
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const openReflection = () => { setPanel("refl"); textRef.current?.focus(); };

  if (closed) {
    return <section className="card-game mt-6 flex items-center justify-between gap-3 p-4" aria-label="Dagens økt">
      <div className="min-w-0"><p className="text-sm font-semibold">Dagens økt</p><p className="truncate text-xs text-muted-foreground">Fokus: {plan.focus}</p></div>
      <Button onClick={() => setClosed(false)} className="min-h-11 shrink-0">Åpne økten<ChevronRight /></Button>
    </section>;
  }

  const activeCls = (on: boolean) => (on ? "border-primary bg-muted/60" : "border-border");
  return (
    <section className="card-game relative mt-6 p-5 sm:p-6" aria-labelledby="session-h">
      <button type="button" aria-label="Lukk økten" onClick={() => setClosed(true)} className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-5" /></button>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 pr-12">
        <div className="eyebrow flex items-center gap-2"><CoachAvatar className="size-9" />Dagens økt · {prof.label}</div>
        <span className="chip"><Clock className="size-3" />{short ? "ca. 5 min" : "ca. 10–15 min"}</span>
      </div>
      <h2 id="session-h" className="section-title">Fokus: {plan.focus}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{plan.advice}</p>
      <label className="mt-3 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-[var(--primary)]" checked={short} onChange={(e) => setShort(e.target.checked)} />Kort økt – bare dagens oppgave</label>
      {sessionDone && <p role="status" className="mt-3 flex items-center gap-2 text-sm font-medium text-primary"><CheckCircle2 className="size-5" />Økta er fullført i dag. {plan.motivation}</p>}

      <ol className="mt-4 space-y-3">
        {!short && <li>
          <Link to="/pusler" className={`${rowCls} ${activeCls(false)}`} data-testid="step-puzzles">
            <StatusIcon done={puzzlesDone} label="Steg 1" />
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium">1. Dagens pusler</span><span className="block text-xs text-muted-foreground">{puzzlesDone ? "Fullført – alle fem er prøvd" : "Ikke ferdig – alle fem må prøves"}</span></span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary"><Puzzle className="size-4" />{puzzlesDone ? "Se puslene igjen" : "Til puslene"}</span>
          </Link>
        </li>}

        <li>
          <button type="button" className={`${rowCls} ${activeCls(panel === "task")}`} aria-expanded={panel === "task"} aria-controls="step-task-panel" onClick={() => toggle("task")} data-testid="step-task" disabled={!dItem}>
            <StatusIcon done={exDone} label="Steg 2" />
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{short ? "1" : "2"}. Dagens oppgave{dItem ? `: ${dItem.themeLabel} · ${LEVELS[dItem.level]}` : ""}</span><span className="block text-xs text-muted-foreground">{exDone ? "Løst" : "Ikke løst ennå"}</span></span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary"><Target className="size-4" />{panel === "task" ? "Skjul" : exDone ? "Se oppgaven igjen" : "Åpne oppgaven"}{panel === "task" ? <ChevronDown className="size-4 rotate-180" /> : <ChevronDown className="size-4" />}</span>
          </button>
          {panel === "task" && dItem && <div id="step-task-panel" className="mt-3 rounded-xl border border-border p-3">
            {exDone && <p className="mb-2 text-xs text-muted-foreground">Gjensyn – du har allerede løst denne. Det gir ingen ny belønning.</p>}
            <AdaptivePuzzle key={`${dItem.id}:${exDone ? "review" : "live"}`} item={dItem}
              onResult={exDone ? undefined : (o, h) => { const r = tr.coaches[coach].items[dItem.id]; if (!(r?.last && r.lastDay === day)) recordAttempt(coach, dItem.id, o, h, day); }}
              onSolve={() => { if (!exDone) updateSession(day, coach, { exercise: true }); }} />
            <Button size="sm" variant="ghost" className="mt-2 min-h-11" onClick={() => setPanel(null)}><X />Lukk øvelsen</Button>
          </div>}
        </li>

        <li>
          <button type="button" className={`${rowCls} ${activeCls(panel === "refl")}`} aria-expanded={panel === "refl"} aria-controls="step-refl-panel" onClick={() => (panel === "refl" ? setPanel(null) : openReflection())} data-testid="step-refl">
            <StatusIcon done={!!draft.trim()} label="Steg 3" />
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{short ? "2" : "3"}. Refleksjon</span><span className="block text-xs text-muted-foreground">{draft.trim() ? "Utkast lagret" : "Skriv noen ord når du vil"}</span></span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary"><MessageSquare className="size-4" />{panel === "refl" ? "Skjul" : "Skriv"}</span>
          </button>
          {panel === "refl" && <div id="step-refl-panel" className="mt-3 rounded-xl border border-border p-3">
            <label className="block text-sm font-medium" htmlFor="refl">Hva så du? Hva vil du prøve neste parti?</label>
            <textarea ref={textRef} id="refl" value={draft} onChange={(e) => { saveDraft(day, coach, e.target.value); setSavedMsg(false); }} rows={3} maxLength={300} className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm" placeholder={plan.task} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button variant="outline" className="min-h-11" onClick={() => { saveDraft(day, coach, draft); setSavedMsg(true); }}><Save />Lagre utkast</Button>
              <span className="text-xs text-muted-foreground" role="status">{savedMsg ? "Lagret på denne enheten." : "Lagres automatisk mens du skriver."}</span>
            </div>
          </div>}
        </li>
      </ol>

      {!sessionDone && <div className="mt-4 rounded-xl border border-border p-3">
        {canFinish ? <Button className="min-h-11" onClick={() => updateSession(day, coach, { reflection: draft.trim(), done: true })}><CheckCircle2 />Fullfør økt</Button> : <>
          <p className="text-sm font-medium">Før du kan fullføre økta:</p>
          <ul className="mt-1 space-y-2 text-sm">
            {!exDone && <li className="flex flex-wrap items-center gap-2"><span>Løs dagens oppgave.</span><Button size="sm" variant="outline" className="min-h-11" onClick={() => setPanel("task")}><Target />Åpne oppgaven</Button></li>}
            {needPuzzles && <li className="flex flex-wrap items-center gap-2"><span>Prøv alle fem pusler – eller velg kort økt.</span><Button asChild size="sm" variant="outline" className="min-h-11"><Link to="/pusler"><Puzzle />Til puslene</Link></Button></li>}
          </ul>
        </>}
      </div>}
      <p className="mt-4 text-xs text-muted-foreground">Trener: {prof.label} · <Link to="/trener" className="underline">Mike Skolen</Link></p>
    </section>
  );
}
