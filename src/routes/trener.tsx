import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Target, ChevronLeft, ChevronRight, Dumbbell, ChevronRightIcon } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { TrainerExercise } from "@/components/TrainerExercise";
import { AdaptiveTrainer } from "@/components/AdaptiveTrainer";
import { MikeCompanion } from "@/components/MikeCompanion";
import { dailyPlan, exercisesFor } from "@/lib/trainer";
import { today, updateProgress, useProgress } from "@/lib/progress";
import { LESSONS_PLAN, LESSON_XP, SCHOOL_BONUS_XP, WEEK_COINS, lessonDone, schoolDays, schoolDone, schoolWeeks, weekStatus, withLesson } from "@/lib/school";
import { celebrateDiff } from "@/lib/celebrate";
import { Check } from "lucide-react";

export const Route = createFileRoute("/trener")({
  head: () => ({
    meta: [
      { title: "Mike Skolen – Goblin Chess" },
      { name: "description", content: "Mike Skolen: dagens leksjon, treningsparti med hjelp og grunnøvelser – alt med Mike som trener." },
      { property: "og:title", content: "Mike Skolen – Goblin Chess" },
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
  const p = useProgress();
  const levels = [
    { key: "lett", label: "Lett", hint: "Prøv ideer uten press", elo: Math.max(800, p.rating - 150) },
    { key: "jevn", label: "Jevn", hint: "Som en ekte motstander", elo: p.rating },
    { key: "toff", label: "Tøff", hint: "Mike hjelper når det brenner", elo: p.rating + 150 },
  ] as const;
  return (
    <main className="page-layout page-narrow">
      <AppHeader title="Mike Skolen" />
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">Mikes egen sjakkskole: én leksjon om dagen, et treningsparti med hjelp underveis, og grunnoppgavene. Alt her er trening – ratingen er trygg.</p>
      {day && (
        <section className="card-game mb-4 p-4" aria-label="Skoleuka">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="eyebrow">Skoleuka</p>
            <span className="chip">{weekStatus(p, day).filter((d) => d.done).length}/7 · premie: {WEEK_COINS} 🪙 + avatar-deler</span>
          </div>
          <ol className="week" aria-label="Ukedager">
            {weekStatus(p, day).map((d) => (
              <li key={d.day} className={`week__day ${d.done ? "is-done" : ""} ${d.isToday ? "is-today" : ""} ${d.isFuture ? "is-future" : ""}`} aria-label={`${d.label}: ${d.done ? "fullført" : d.isFuture ? "kommer" : d.isToday ? "i dag" : "ikke fullført"}`}>
                <span className="week__label">{d.label}</span>
                <span className="week__mark" aria-hidden>{d.done ? "✓" : d.isToday ? "•" : ""}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">Fullfør alle tre leksjoner hver dag mandag–søndag. Fulle skoleuker: <strong>{schoolWeeks(p)}</strong>.</p>
        </section>
      )}
      {day && (
        <section className="card-game mb-4 p-4" aria-label="Dagens timeplan">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="eyebrow">Dagens timeplan</p>
            <span className="chip">{schoolDone(p, day) ? "Fullført! 🎓" : `${LESSONS_PLAN.filter((l) => lessonDone(p, day, l.id)).length}/${LESSONS_PLAN.length} · +${LESSON_XP} XP hver`}</span>
          </div>
          <ol className="space-y-2">
            {LESSONS_PLAN.map((l, i) => { const done = lessonDone(p, day, l.id); return (
              <li key={l.id} className={`quest ${done ? "is-done" : ""}`} data-testid={`lesson-${l.id}`}>
                <span className="quest__check">{done ? <Check className="size-5" /> : i + 1}</span>
                <span className="min-w-0"><span className="block font-semibold">{l.title}</span><span className="block text-xs text-muted-foreground">{l.hint}</span></span>
                <span className="quest__xp">{done ? "✓" : `+${LESSON_XP}`}</span>
              </li>); })}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">Alle tre samme dag gir <strong>+{SCHOOL_BONUS_XP} XP</strong> ekstra. Skoledager fullført: <strong>{schoolDays(p)}</strong>.</p>
        </section>
      )}
      {plan && (
        <>
          <MikeCompanion mode="trainer" className="mb-4"
            line={{ text: `Welcome to class. Today's focus: ${plan.focus.toLowerCase()}. One idea, a few puzzles, then a training game where I help. That's the whole lesson.`, mood: "chill" }}
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
      <section className="mt-6" aria-label="Treningsparti">
        <h2 className="section-title mb-1">Treningsparti med Mike</h2>
        <p className="mb-3 text-xs text-muted-foreground">Spill mot boten med hint, forslag og Mike ved brettet. Etterpå får du full analyse med merker som på chess.com. Påvirker ikke ratingen.</p>
        <div className="grid gap-2">
          {levels.map((l) => (
            <Link key={l.key} to="/treningsparti" search={{ fen: undefined, side: "w", elo: l.elo, tc: "none", src: `Mike Skolen · ${l.label}` }} className="quest" data-testid={`training-${l.key}`}>
              <span className="quest__check"><Dumbbell className="size-5" /></span>
              <span className="min-w-0"><span className="block font-semibold">{l.label} · bot {l.elo}</span><span className="block text-xs text-muted-foreground">{l.hint}</span></span>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>
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
        <div className="card-game p-5"><TrainerExercise key={ex.id} exercise={ex} onSolved={() => updateProgress((s) => { const n = withLesson(s, day, "drill"); celebrateDiff(s, n); return n; })} /></div>
      </section>; })()}
    </main>
  );
}
