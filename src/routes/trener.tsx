import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Compass, Zap, ExternalLink, CheckCircle2, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { TrainerExercise } from "@/components/TrainerExercise";
import { CoachAvatar } from "@/components/CoachAvatar";
import { COACH_IDENTITY } from "@/lib/coach-identity";
import { AdaptiveTrainer } from "@/components/AdaptiveTrainer";
import { chooseCoach, useTrainer } from "@/lib/trainer-store";
import { DISCLAIMER, PROFILES, dailyPlan, exercisesFor, type CoachId } from "@/lib/trainer";
import { today, useProgress } from "@/lib/progress";

export const Route = createFileRoute("/trener")({
  head: () => ({
    meta: [
      { title: "Trener – Goblin Chess" },
      { name: "description", content: "Velg en Magnus- eller Hikaru-inspirert virtuell trener med egne øvelser og daglige råd." },
      { property: "og:title", content: "Trener – Goblin Chess" },
      { property: "og:description", content: "Personlig treningsprofil med øvelser, råd og studiekilder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrainerPage,
});

const ICONS = { magnus: Compass, hikaru: Zap } as const;

const SOURCES: Record<CoachId, { title: string; text: string; question: string; links: { label: string; url: string }[] }> = {
  magnus: {
    title: "Anand–Carlsen, VM 2013, parti 6",
    text: "Tema: tålmodig press, tårnaktivitet og fribonde. Ifølge FIDEs offisielle rapport vant Magnus etter 67 trekk, og 60.Ra4 i stedet for 60.b4 ga ham den avgjørende sjansen.",
    question: "Hva gjør et aktivt tårn og en fribonde vanskelig å stoppe?",
    links: [{ label: "FIDE-rapporten", url: "https://old.fide.com/component/content/article/1-fide-news/7539-fide-world-championship-2013.html" }],
  },
  hikaru: {
    title: "Hikaru forklarer egne partier",
    text: "Chess.com-leksjonen «Hikaru Plays to Win» og videoen om partiet mot Anand i London Chess Classic (publisert 6. februar 2017) handler om beregning, feil og bondestruktur.",
    question: "Hvilke kandidattrekk vurderer du, og hva er motstanderens beste svar?",
    links: [
      { label: "Leksjonen", url: "https://www.chess.com/lessons/hikaru-plays-to-win" },
      { label: "Mot Anand – London Chess Classic", url: "https://www.chess.com/video/player/hikaru-explains-how-to-beat-a-world-champion" },
    ],
  },
};

function TrainerPage() {
  const tr = useTrainer();
  const p = useProgress();
  const [day, setDay] = useState("");
  const [idx, setIdx] = useState(0);
  useEffect(() => setDay(today()), []);
  const active = tr.coach;
  const list = active ? exercisesFor(active) : [];
  const ex = list[idx % Math.max(1, list.length)];
  return (
    <main className="page-layout">
      <AppHeader title={active ? "Din trener" : "Velg trener"} />
      <p className="mb-4 text-xs text-muted-foreground">{DISCLAIMER}</p>
      <section aria-label="Trenervalg" className="grid gap-4 md:grid-cols-2">
        {(Object.keys(PROFILES) as CoachId[]).map((id) => {
          const prof = PROFILES[id]; const Icon = ICONS[id]; const on = active === id;
          return <div key={id} className={`card-game p-5 ${on ? "ring-2 ring-primary" : ""}`}>
            <div className="flex items-center gap-4"><CoachAvatar coach={id} size="portrait" className="size-24 sm:size-28" /><div className="min-w-0"><h2 className="section-title flex items-center gap-2"><Icon className="size-5 text-primary" aria-hidden />{prof.label}</h2><p className="text-xs text-muted-foreground">{COACH_IDENTITY[id].label} · {prof.focus}</p></div></div>
            <ul className="mt-3 flex flex-wrap gap-2">{prof.themes.map((t) => <li key={t} className="chip">{t}</li>)}</ul>
            <Button className="mt-4 w-full" variant={on ? "outline" : "default"} aria-pressed={on} disabled={on} onClick={() => { chooseCoach(id); setIdx(0); }}>
              {on ? <><CheckCircle2 />Aktiv trener</> : active ? "Bytt trener" : "Velg trener"}
            </Button>
          </div>;
        })}
      </section>
      {active && day && (() => { const plan = dailyPlan(active, day); return (
        <section className="card-game mt-6 p-5 sm:p-6" aria-label="Dagens råd">
          <div className="mb-2 flex items-center gap-3"><CoachAvatar className="size-10" /><p className="eyebrow">Dagens råd · {COACH_IDENTITY[active].label}</p></div>
          <p className="text-sm" data-testid="daily-advice">{plan.advice}</p>
          <p className="mt-3 flex gap-2 text-sm"><Target className="size-4 shrink-0 text-primary" /><span><span className="font-medium">Oppgave:</span> {plan.task}</span></p>
          <p className="mt-3 text-sm text-muted-foreground">{plan.motivation}</p>
        </section>); })()}
      {active && day && <AdaptiveTrainer coach={active} day={day} />}
      {active && ex && (() => { const cur = idx % list.length; const last = cur === list.length - 1; return <section className="mt-6" aria-label="Øvelser">
        <h2 className="section-title mb-1">Grunnoppgaver – gjensyn ({cur + 1}/{list.length})</h2>
        <p className="mb-3 text-xs text-muted-foreground">Egenkomponerte introduksjonsoppgaver, kontrollert med regelmotor.</p>
        <nav aria-label="Øvelsesnavigasjon" className="card-game mb-3 space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" className="min-h-11" disabled={cur === 0} onClick={() => setIdx(cur - 1)}><ChevronLeft />Forrige</Button>
            <p className="text-sm font-medium" aria-live="polite" data-testid="exercise-position">Øvelse {cur + 1} av {list.length}{last && <span className="chip ml-2">Siste øvelse</span>}</p>
            <Button className="min-h-11" disabled={last} onClick={() => setIdx(cur + 1)}>Neste øvelse<ChevronRight /></Button>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Velg øvelse">
            {list.map((e, i) => <Button key={e.id} size="sm" variant={i === cur ? "default" : "outline"} className="min-h-11" aria-current={i === cur ? "step" : undefined} aria-label={`Øvelse ${i + 1}: ${e.title}`} onClick={() => setIdx(i)}>{i + 1}. {e.title}</Button>)}
          </div>
        </nav>
        <div className="card-game p-5"><TrainerExercise key={ex.id} exercise={ex} /></div>
      </section>; })()}
      {active && <section className="card-game mt-6 p-5 sm:p-6" aria-label="Studiekilde">
        <p className="eyebrow mb-1">Studiekilde</p>
        <h2 className="section-title">{SOURCES[active].title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{SOURCES[active].text}</p>
        <p className="mt-3 text-sm"><span className="font-medium">Spørsmål:</span> {SOURCES[active].question}</p>
        <div className="mt-4 flex flex-wrap gap-2">{SOURCES[active].links.map((l) => <Button key={l.url} asChild variant="outline" size="sm"><a href={l.url} target="_blank" rel="noopener noreferrer">Åpne kilden: {l.label}<ExternalLink /></a></Button>)}</div>
        <p className="mt-2 text-xs text-muted-foreground">Ekstern side – innlogging kan kreves.</p>
      </section>}
      <section className="card-game mt-6 p-5 sm:p-6" aria-label="Mål">
        <h2 className="section-title">Ambisjon: klubb/FIDE 2000</h2>
        <p className="mt-2 text-sm text-muted-foreground">Spillratingen ({p.rating}) og puslerating ({p.puzzleRating}) i appen er treningsmålinger, ikke offisiell FIDE-rating. De viser om treningen går framover.</p>
      </section>
    </main>
  );
}
