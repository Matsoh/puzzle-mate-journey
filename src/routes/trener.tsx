import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, GraduationCap, Lock, Play, Swords, Trophy, Calendar, Target } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { MikeCompanion } from "@/components/MikeCompanion";
import { PuzzleSet } from "@/components/school/PuzzleSet";
import { OpeningDrill } from "@/components/school/OpeningDrill";
import { MasterGame } from "@/components/school/MasterGame";
import { today, updateProgress, useProgress, type Progress } from "@/lib/progress";
import { WEEK_COINS, schoolDays, schoolDone, schoolWeeks, weekStatus } from "@/lib/school";
import { CLASSES, PERIOD_XP, SUBJECT_LABEL, classOf, daysInClass, daysUntil, examItems, getBoss, grade, graduated, periodDone, pickItems, startExam, timetable, withExamPuzzle, withPeriod, withScore, type Period, type Subject } from "@/lib/curriculum";
import { celebrateDiff } from "@/lib/celebrate";
import { primeMikeVoice, sayMike } from "@/lib/mike-voice";
import { addTournament, archiveCurrent, useTournaments } from "@/lib/tournament-store";
import { clampSetup, defaultSetup, newTournament, type Tournament } from "@/lib/tournament";
import { getMasterGame } from "@/data/master-games";
import { getOpening } from "@/data/openings";
import { play } from "@/lib/sound";

export const Route = createFileRoute("/trener")({
  head: () => ({
    meta: [
      { title: "Mike Skolen – Goblin Chess" },
      { name: "description", content: "Mike Skolen: en ekte sjakkskole med timeplan, klassetrinn og eksamen – Mike bestemmer, du spiller." },
      { property: "og:title", content: "Mike Skolen – Goblin Chess" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchoolPage,
});

const KIND_ICON: Record<Period["kind"], string> = { warmup: "⚡", opening: "📖", tactic: "🧩", endgame: "👑", strategy: "🎓", game: "⚔️", homework: "📝", exam: "🏆" };

function SchoolPage() {
  const [day, setDay] = useState("");
  useEffect(() => setDay(today()), []);
  const p = useProgress();
  const t = useTournaments();
  const current = t.list.find((x) => x.id === t.current && !x.archived) ?? null;
  const inDays = day ? daysUntil(day, current?.setup.date) : null;
  const periods = useMemo(() => (day ? timetable(p, day, inDays) : []), [p, day, inDays]);
  const nextIdx = periods.findIndex((x) => !periodDone(p, day, x.idx));
  const [open, setOpen] = useState<number | null>(null);
  const active = open ?? (nextIdx >= 0 ? nextIdx : null);
  const cls = classOf(p);
  const done = graduated(p);
  const week = day ? weekStatus(p, day) : [];
  const inClass = daysInClass(p);

  if (!day) return <main className="page-layout page-narrow"><AppHeader title="Mike Skolen" /></main>;
  const period = active !== null ? periods[active] : undefined;
  const allDone = schoolDone(p, day);

  return (
    <main className="page-layout page-narrow" onPointerDown={primeMikeVoice}>
      <AppHeader title="Mike Skolen" />

      <section className="card-game mb-4 p-4" aria-label="Klasse">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-2xl" aria-hidden>{done ? "🎓" : cls.n}</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-tight">{done ? "Uteksaminert" : cls.name} <span className="text-xs font-normal text-muted-foreground">· mål {done ? 2000 : cls.ratingTo}</span></p>
            <p className="text-xs text-muted-foreground">{done ? "Hele skolen fullført. Mike holder deg i form med timeplanen." : `«${cls.motto}» · ${inClass >= 4 ? "Eksamen åpner fredag" : `${4 - inClass} skoledag${4 - inClass === 1 ? "" : "er"} igjen før eksamen`}`}</p>
          </div>
          <Link to="/trener" className="chip" title="Vitnemål">{(p.schoolPassed ?? []).length}/{CLASSES.length} <Trophy className="size-3" /></Link>
        </div>
        <dl className="mt-3 grid grid-cols-5 gap-1 text-center">
          {(Object.keys(SUBJECT_LABEL) as Subject[]).map((s) => { const g = grade(p, s); return (
            <div key={s} className="rounded-lg border border-border bg-background/60 px-1 py-1.5"><dt className="text-[10px] text-muted-foreground">{SUBJECT_LABEL[s]}</dt><dd className="text-base font-black" title={g.pct === null ? "Ikke nok data ennå" : `${g.pct} %`}>{g.letter}</dd></div>
          ); })}
        </dl>
      </section>

      <section className="card-game mb-4 p-4" aria-label="Skoleuka">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="eyebrow">Skoleuka</p>
          <span className="chip">{week.filter((d) => d.done).length}/7 · premie: {WEEK_COINS} 🪙 + avatar-deler</span>
        </div>
        <ol className="week" aria-label="Ukedager">
          {week.map((d) => (
            <li key={d.day} className={`week__day ${d.done ? "is-done" : ""} ${d.isToday ? "is-today" : ""} ${d.isFuture ? "is-future" : ""}`} aria-label={`${d.label}: ${d.done ? "fullført" : d.isFuture ? "kommer" : d.isToday ? "i dag" : "ikke fullført"}`}>
              <span className="week__label">{d.label}</span>
              <span className="week__mark" aria-hidden>{d.done ? "✓" : d.isToday ? "•" : ""}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">Skoledager: <strong>{schoolDays(p)}</strong> · fulle uker: <strong>{schoolWeeks(p)}</strong>.</p>
      </section>

      <section className="card-game mb-4 p-4" aria-label="Dagens timeplan">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="eyebrow">Dagens timeplan{inDays !== null && inDays >= 0 && inDays <= 7 ? " · turneringsuke" : ""}</p>
          <span className="chip">{allDone ? "Fullført! 🎓" : `${periods.filter((x) => periodDone(p, day, x.idx)).length}/4 · +${PERIOD_XP} XP hver`}</span>
        </div>
        <ol className="space-y-2">
          {periods.map((x) => { const isDone = periodDone(p, day, x.idx); const isActive = active === x.idx; const locked = !isDone && x.idx > Math.max(0, nextIdx); return (
            <li key={x.idx}>
              <button type="button" disabled={locked} onClick={() => setOpen(x.idx)} aria-current={isActive ? "step" : undefined} className={`quest w-full text-left ${isDone ? "is-done" : ""} ${isActive ? "border-primary" : ""} disabled:opacity-60`} data-testid={`period-${x.idx}`}>
                <span className="quest__check">{isDone ? <Check className="size-5" /> : locked ? <Lock className="size-4" /> : <span aria-hidden>{KIND_ICON[x.kind]}</span>}</span>
                <span className="min-w-0"><span className="block font-semibold">{x.idx + 1}. {x.title}</span><span className="block text-xs text-muted-foreground">{x.hint}</span></span>
                <span className="quest__xp">{isDone ? "✓" : isActive ? <Play className="size-4" /> : <ChevronRight className="size-4" />}</span>
              </button>
            </li>
          ); })}
        </ol>
      </section>

      {period && <PeriodView key={`${day}:${period.idx}:${period.kind}`} p={p} day={day} period={period} cls={cls} done={periodDone(p, day, period.idx)} onStart={() => setOpen(period.idx)} onNext={() => setOpen(null)} />}
      {allDone && (
        <section className="card-game mb-4 p-4 text-center" aria-label="Ferdig for i dag">
          <p className="text-lg font-black">Skoledagen er ferdig 🎓</p>
          <p className="text-sm text-muted-foreground">Mike har lagt timeplanen for i morgen. Vil du spille mer: <Link to="/stigen" className="font-semibold text-primary underline-offset-4 hover:underline">Motstanderstigen</Link> eller <Link to="/venner" className="font-semibold text-primary underline-offset-4 hover:underline">en venn</Link>.</p>
        </section>
      )}

      <TournamentCard current={current} inDays={inDays} day={day} />

      <section className="mb-2" aria-label="Pensum">
        <p className="eyebrow mb-2">Pensum i {done ? "7. klasse" : cls.name}</p>
        <p className="text-xs text-muted-foreground"><strong>Åpninger:</strong> {cls.openings.map((o) => getOpening(o)?.name ?? o).join(", ")} · <strong>Taktikk:</strong> {cls.tactics.length} motiver · <strong>Sluttspill:</strong> {cls.endgames.map((b) => getBoss(b)?.name ?? b).join(", ")} · <strong>Mesterparti:</strong> {cls.games.map((g) => getMasterGame(g)?.title ?? g).join(", ")} · <strong>Eksamen:</strong> {cls.exam.puzzles} oppgaver (minst {cls.exam.pass} rett) + parti mot bot {cls.exam.elo}.</p>
      </section>
    </main>
  );
}

/** The open period: Mike introduces it (aloud), then the exercise. */
function PeriodView({ p, day, period, cls, done, onStart, onNext }: { p: Progress; day: string; period: Period; cls: ReturnType<typeof classOf>; done: boolean; onStart: () => void; onNext: () => void }) {
  const [started, setStarted] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const finish = (subject: Subject | undefined, ok: boolean) => {
    updateProgress((s) => { const n = withPeriod(s, day, period.idx, subject, ok); celebrateDiff(s, n); return n; });
    play("correct");
    setJustDone(true);
  };
  const nextButton = <Button className="mt-3 w-full font-bold" onClick={onNext}><ChevronRight /> {period.idx < 3 ? "Neste time" : "Ferdig for i dag"}</Button>;
  if (done && !started) return (
    <section className="card-game mb-4 p-4" aria-label={period.title}>
      <p className="text-sm font-semibold text-primary"><Check className="mr-1 inline size-4" />{period.title} er fullført.</p>
      {nextButton}
    </section>
  );
  const scoreItem = (subject: Subject, ok: boolean) => updateProgress((s) => withScore(s, subject, ok));
  const [botElo, side] = period.kind === "game" ? period.ref.split(":") : [String(cls.botElo), "w"];

  return (
    <section className="card-game mb-4 p-4" aria-label={period.title}>
      <MikeCompanion mode="trainer" compact speak important line={{ text: period.mike, mood: period.kind === "exam" ? "think" : "chill" }} context={`Mike Skolen, ${cls.name}. Period: ${period.title} (${period.kind}). ${period.hint}`} className="mb-3" />
      {!started ? (
        <Button className="w-full font-bold" size="lg" onClick={() => { primeMikeVoice(); void sayMike(period.mike, true); setStarted(true); onStart(); }}><Play /> Start timen: {period.title}</Button>
      ) : period.kind === "warmup" || period.kind === "tactic" || period.kind === "homework" ? (
        <PuzzleSet title={period.title} items={pickItems(period.ref, period.count ?? 3, day, period.kind)} onItem={(_, ok) => scoreItem("tactic", ok)} onDone={(ok, total) => finish(undefined, ok * 2 >= total)} />
      ) : period.kind === "opening" ? (
        <OpeningDrill openingId={period.ref} branchIdx={Math.floor(Number(day.slice(8, 10)) / 7)} botElo={cls.botElo} onDone={(mistakes) => finish("opening", mistakes <= 1)} />
      ) : period.kind === "strategy" ? (
        <MasterGame gameId={period.ref} onMike={(t) => void sayMike(t, true)} onDone={(hits, total) => finish("strategy", hits * 10 >= total * 6)} />
      ) : period.kind === "endgame" ? (
        <BossCard id={period.ref} day={day} idx={period.idx} elo={cls.botElo} />
      ) : period.kind === "game" ? (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">Et vanlig treningsparti med hint fra Mike. Minst fem trekk for at timen skal telle – men spill det ferdig, det er der du lærer.</p>
          <Link to="/treningsparti" search={{ fen: undefined, side: side === "b" ? "b" : "w", elo: Number(botElo), tc: "none", src: `Mike Skolen · ${cls.name}`, period: period.idx, day }} className="btn-game justify-center"><Swords /> Spill mot bot {botElo} som {side === "b" ? "svart" : "hvit"}</Link>
        </div>
      ) : (
        <Exam p={p} day={day} cls={cls} />
      )}
      {(justDone || (done && started)) && <p className="mt-3 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary">Timen er godkjent · +{PERIOD_XP} XP</p>}
      {(justDone || (done && started)) && nextButton}
    </section>
  );
}

function BossCard({ id, day, idx, elo }: { id: string; day: string; idx: number; elo: number }) {
  const b = getBoss(id);
  if (!b) return null;
  return (
    <div className="grid gap-2">
      <p className="text-sm"><strong>{b.name}</strong> – {b.goal === "win" ? "du må vinne." : "du må holde remis."}</p>
      <p className="text-sm text-muted-foreground"><Target className="mr-1 inline size-4 text-primary" />{b.tip}</p>
      <Link to="/treningsparti" search={{ fen: b.fen, side: b.side, elo, tc: "none", src: `Sluttspill-boss · ${b.name}`, period: idx, day, goal: b.goal }} className="btn-game justify-center"><Swords /> Spill bossen</Link>
    </div>
  );
}

/** Friday exam: the puzzle half here, the game half in the training room. */
function Exam({ p, day, cls }: { p: Progress; day: string; cls: ReturnType<typeof classOf> }) {
  useEffect(() => { updateProgress((s) => startExam(s, day)); }, [day]);
  const e = p.schoolExam;
  const items = useMemo(() => examItems(cls, day), [cls, day]);
  if (!e || e.day !== day) return <p className="text-sm text-muted-foreground">Gjør klar eksamen …</p>;
  if (e.stage === "puzzles") {
    const remaining = items.slice(e.puzzlesDone);
    return (
      <div>
        <p className="mb-2 text-sm text-muted-foreground">Del 1: {cls.exam.puzzles} oppgaver, minst {cls.exam.pass} rett. Ingen hint teller – men du kan bruke dem.</p>
        <PuzzleSet key={e.puzzlesDone} title={`Eksamen · ${e.puzzlesOk} rett`} items={remaining} onItem={(_, ok) => updateProgress((s) => withExamPuzzle(withScore(s, "tactic", ok), ok))} onDone={() => undefined} />
      </div>
    );
  }
  if (e.stage === "game") return (
    <div className="grid gap-2">
      <p className="text-sm"><strong>Del 1 bestått</strong> ({e.puzzlesOk}/{e.puzzlesDone}). Del 2: ett parti mot bot {cls.exam.elo}. Vinn eller remis – så er du i neste klasse.</p>
      <Link to="/treningsparti" search={{ fen: undefined, side: "w", elo: cls.exam.elo, tc: "none", src: `Eksamen · ${cls.name}`, day, exam: true }} className="btn-game justify-center"><GraduationCap /> Spill eksamenspartiet</Link>
    </div>
  );
  if (e.stage === "failed") return <p className="text-sm"><strong>Ikke bestått denne gangen.</strong> Det er helt greit – timeplanen fortsetter som vanlig, og eksamen åpner igjen neste fredag.</p>;
  return <p className="text-sm font-semibold text-primary">Bestått! Velkommen til {CLASSES[e.cls]?.name ?? "toppen"} 🎓</p>;
}

/** Next tournament: date + name. The timetable turns into "turneringsuke" for the last seven days. */
function TournamentCard({ current, inDays, day }: { current: Tournament | null; inDays: number | null; day: string }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState("Klubbturnering");
  const [date, setDate] = useState(day);
  const save = () => {
    addTournament(newTournament(clampSetup({ ...defaultSetup(date), name: name.trim() || "Turnering" }), crypto.randomUUID(), Date.now()));
    setEdit(false);
  };
  return (
    <section className="card-game mb-4 p-4" aria-label="Turnering">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2"><Calendar className="size-5 shrink-0 text-primary" /><span className="min-w-0"><span className="block font-semibold">{current ? current.setup.name : "Neste turnering"}</span><span className="block text-xs text-muted-foreground">{current ? `${current.setup.date}${inDays !== null ? inDays === 0 ? " · i dag!" : inDays > 0 ? ` · om ${inDays} dag${inDays === 1 ? "" : "er"}` : " · spilt" : ""} · siste uka blir turneringsuke` : "Legg inn dato – siste uka før blir turneringsuke på timeplanen"}</span></span></span>
        {current ? <span className="flex shrink-0 gap-1"><Link to="/turnering" className="btn-game text-sm">Forbered</Link><Button size="sm" variant="ghost" onClick={() => archiveCurrent()} aria-label="Fjern turneringen">✕</Button></span> : <Button size="sm" onClick={() => setEdit((e) => !e)}>Legg inn</Button>}
      </div>
      {edit && !current && (
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Navn på turneringen" className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm" />
          <input type="date" value={date} min={day} onChange={(e) => setDate(e.target.value)} aria-label="Dato" className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <Button type="submit" size="sm">Lagre</Button>
        </form>
      )}
    </section>
  );
}
