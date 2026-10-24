import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Target, ChevronLeft, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { TrainerExercise } from "@/components/TrainerExercise";
import { AdaptiveTrainer } from "@/components/AdaptiveTrainer";
import { MikeCompanion } from "@/components/MikeCompanion";
import { dailyPlan, exercisesFor } from "@/lib/trainer";
import { today } from "@/lib/progress";

export const Route = createFileRoute("/trener")({
  head: () => ({
    meta: [
      { title: "Trening med Mike – Goblin Chess" },
      { name: "description", content: "Dagens råd, tilpassede oppgaver og grunnøvelser – med Mike som trener." },
      { property: "og:title", content: "Trening med Mike – Goblin Chess" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrainerPage,
});

function TrainerPage() {
  const [day, setDay] = useState("");
  const [idx, setIdx] = useState(0);
  useEffect(() => setDay(today()), []);
  const list = exercisesFor("mike");
  const ex = list[idx % Math.max(1, list.length)];
  const plan = day ? dailyPlan("mike", day) : null;
  return (
    <main className="page-layout page-narrow">
      <AppHeader title="Trening med Mike" />
      {plan && (
        <>
          <MikeCompanion mode="trainer" className="mb-4"
            line={{ text: `Today's focus: ${plan.focus.toLowerCase()}. One idea, a few puzzles, then go play. That's the whole plan.`, mood: "chill" }}
            context={`Today's advice: ${plan.advice} Task for the next game: ${plan.task} Focus theme: ${plan.focus}.`} />
          <section className="card-game p-5 sm:p-6" aria-label="Dagens råd">
            <p className="eyebrow mb-2">Dagens råd fra Mike</p>
            <p className="text-sm" data-testid="daily-advice">{plan.advice}</p>
            <p className="mt-3 flex gap-2 text-sm"><Target className="size-4 shrink-0 text-primary" /><span><span className="font-medium">Oppgave i neste parti:</span> {plan.task}</span></p>
            <p className="mt-3 text-sm text-muted-foreground">{plan.motivation}</p>
          </section>
        </>
      )}
      {day && <AdaptiveTrainer coach="mike" day={day} />}
      {ex && (() => { const cur = idx % list.length; const last = cur === list.length - 1; return <section className="mt-6" aria-label="Øvelser">
        <h2 className="section-title mb-1">Grunnoppgaver ({cur + 1}/{list.length})</h2>
        <p className="mb-3 text-xs text-muted-foreground">Mikes egne introduksjonsoppgaver – sjekket med regelmotor.</p>
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
    </main>
  );
}
