import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { X, ChevronRight, CheckCircle2, Circle, Clock, Puzzle, Target, MessageSquare, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrainerExercise } from "./TrainerExercise";
import { useTrainer, updateSession, sessionKey } from "@/lib/trainer-store";
import { dailyPlan, PROFILES } from "@/lib/trainer";
import type { Progress } from "@/lib/progress";

export function TrainingSession({ progress, day }: { progress: Progress; day: string }) {
  const tr = useTrainer();
  const [short, setShort] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [closed, setClosed] = useState(false);
  if (!tr.coach) {
    return <section className="card-game mt-6 p-5 sm:p-6" aria-labelledby="session-h">
      <p className="eyebrow mb-1">Dagens økt</p>
      <h2 id="session-h" className="section-title">Velg din virtuelle trener</h2>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">Velg mellom en Magnus-inspirert eller Hikaru-inspirert treningsprofil og få en personlig økt hver dag.</p>
      <Button asChild><Link to="/trener"><GraduationCap />Velg trener</Link></Button>
    </section>;
  }
  const coach = tr.coach;
  const prof = PROFILES[coach];
  const plan = dailyPlan(coach, day);
  const rec = tr.sessions[sessionKey(day, coach)];
  const puzzlesDone = !!progress.daily && progress.daily.day === day && progress.daily.ids.length === 5 && progress.daily.ids.every((id) => progress.daily?.results[id]);
  const exDone = !!rec?.exercise;
  const canFinish = exDone && (short || puzzlesDone);
  const Step = ({ done, n, children }: { done: boolean; n: number; children: React.ReactNode }) => <li className="flex items-start gap-3">{done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-label="Fullført" /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label={`Steg ${n}`} />}<div className="min-w-0 flex-1">{children}</div></li>;
  if (closed) {
    return <section className="card-game mt-6 flex items-center justify-between gap-3 p-4" aria-label="Dagens økt">
      <div className="min-w-0"><p className="text-sm font-semibold">Dagens økt</p><p className="truncate text-xs text-muted-foreground">Fokus: {plan.focus}</p></div>
      <Button onClick={() => setClosed(false)} className="min-h-11 shrink-0">Åpne økten<ChevronRight /></Button>
    </section>;
  }
  return (
    <section className="card-game relative mt-6 p-5 sm:p-6" aria-labelledby="session-h">
      <button type="button" aria-label="Lukk økten" onClick={() => setClosed(true)} className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-5" /></button>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 pr-12">
        <p className="eyebrow">Dagens økt · {prof.label}</p>
        <span className="chip"><Clock className="size-3" />{short ? "ca. 5 min" : "ca. 10–15 min"}</span>
      </div>
      <h2 id="session-h" className="section-title">Fokus: {plan.focus}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{plan.advice}</p>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--primary)]" checked={short} onChange={(e) => setShort(e.target.checked)} />Kort økt – bare dagens øvelse</label>
      {rec?.done ? <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-primary"><CheckCircle2 className="size-5" />Økta er fullført i dag. {plan.motivation}</p> : (
      <ol className="mt-4 space-y-4">
        {!short && <Step n={1} done={puzzlesDone}><p className="text-sm font-medium">Dagens pusler</p><p className="text-xs text-muted-foreground">Fullført når alle fem er prøvd.</p>{!puzzlesDone && <Button asChild size="sm" variant="outline" className="mt-2"><Link to="/pusler"><Puzzle />Til puslene</Link></Button>}</Step>}
        <Step n={2} done={exDone}><p className="text-sm font-medium">Øvelse: {plan.exercise.title}</p>
          {!exDone && (open ? <div className="mt-3"><TrainerExercise exercise={plan.exercise} onSolved={() => updateSession(day, coach, { exercise: true })} /><Button size="sm" variant="ghost" className="mt-2 min-h-11" onClick={() => setOpen(false)}><X />Lukk øvelsen</Button></div> : <Button size="sm" variant="outline" className="mt-2" onClick={() => setOpen(true)}><Target />Start øvelsen</Button>)}
        </Step>
        <Step n={3} done={false}><p className="text-sm font-medium">Refleksjon</p>
          <label className="mt-1 block text-xs text-muted-foreground" htmlFor="refl">Hva så du? Hva vil du prøve neste parti?</label>
          <textarea id="refl" value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={300} className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm" placeholder={plan.task} />
          <Button className="mt-2" disabled={!canFinish} onClick={() => updateSession(day, coach, { reflection: text.trim(), done: true })}><MessageSquare />Fullfør økt</Button>
          {!canFinish && <p className="mt-1 text-xs text-muted-foreground">{exDone ? "Fullfør dagens pusler først, eller velg kort økt." : "Løs dagens øvelse først."}</p>}
        </Step>
      </ol>)}
      <p className="mt-4 text-xs text-muted-foreground">Trener: {prof.label} · <Link to="/trener" className="underline">Bytt trener</Link></p>
    </section>
  );
}
