import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Archive, CheckCircle2, ChevronDown, Clock, Flag, Pencil, Plus, Swords, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { CoachAvatar, CoachLabel } from "@/components/CoachAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dayKey } from "@/lib/rules";
import { useTrainer } from "@/lib/trainer-store";
import { addTournament, archiveCurrent, updateTournament, useTournaments } from "@/lib/tournament-store";
import {
  activeRound, applySetup, daysBetween, defaultSetup, formatPoints, newTournament, prepPlan, PROCESS_GOALS, roundsLostBy, score, tcString,
  type Feeling, type Prep, type Result, type Round, type Setup, type Tournament,
} from "@/lib/tournament";

export const Route = createFileRoute("/turnering")({
  head: () => ({
    meta: [
      { title: "Turneringsdagen – Goblin Chess" },
      { name: "description", content: "Planlegg turneringsdagen, før runde for runde og se faktiske poeng." },
      { property: "og:title", content: "Turneringsdagen – Goblin Chess" },
      { property: "og:description", content: "Forberedelse, rundekort og oppsummering for en ekte sjakkturnering." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TournamentPage,
});

const field = "w-full rounded-[var(--control-radius)] border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground";
const RESULT_LABEL: Record<Result, string> = { win: "Seier", draw: "Remis", loss: "Tap" };
const FEELINGS: { id: Feeling; label: string }[] = [{ id: "klar", label: "Klar" }, { id: "nervos", label: "Nervøs" }, { id: "sliten", label: "Sliten" }];
const TC_PRESETS = [[10, 0], [10, 5], [15, 10]] as const;

const COACH_TIPS = {
  magnus: ["Pust rolig ut før første trekk. Du har god tid.", "Hvilken brikke din gjør minst? Gi den en jobb.", "Før hvert trekk: hva truer motstanderen?"],
  hikaru: ["Finn to–tre kandidattrekk før du velger.", "Sjekk alltid: sjakker, slag og trusler – for begge.", "Hva er motstanderens beste svar på trekket ditt?"],
  neutral: ["Pust rolig og ta deg tid i starten.", "Se etter motstanderens trusler før hvert trekk.", "Gjør alle brikkene aktive."],
};

function TournamentPage() {
  const ts = useTournaments();
  const current = ts.list.find((t) => t.id === ts.current) ?? null;
  const history = ts.list.filter((t) => t.id !== ts.current).sort((a, b) => b.createdAt - a.createdAt);
  return (
    <main className="page-layout page-narrow">
      <AppHeader title="Turneringsdagen" />
      {current ? <Current t={current} /> : <NewTournament />}
      {history.length > 0 && !current?.rounds.some((r) => r.status === "playing") && <History list={history} />}
    </main>
  );
}

function NewTournament() {
  const [setup, setSetup] = useState<Setup>(() => defaultSetup(dayKey(new Date())));
  return (
    <section className="card-game space-y-5 p-5" aria-labelledby="new-t">
      <div>
        <h2 id="new-t" className="section-title">Ny turnering</h2>
        <p className="mt-1 text-sm text-muted-foreground">Legg inn turneringen din, så hjelper appen deg å forberede deg og holde oversikt over rundene.</p>
      </div>
      <SetupForm value={setup} onChange={setSetup} />
      <Button size="lg" className="w-full" onClick={() => addTournament(newTournament(setup, crypto.randomUUID(), Date.now()))}><Plus /> Lag turneringen</Button>
    </section>
  );
}

function SetupForm({ value: s, onChange }: { value: Setup; onChange: (s: Setup) => void }) {
  const custom = !TC_PRESETS.some(([m, i]) => m === s.minutes && i === s.increment);
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">Navn<input className={cn(field, "mt-1.5")} value={s.name} onChange={(e) => onChange({ ...s, name: e.target.value })} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">Dato<input type="date" className={cn(field, "mt-1.5")} value={s.date} onChange={(e) => onChange({ ...s, date: e.target.value })} /></label>
        <label className="block text-sm font-medium">Runder<select className={cn(field, "mt-1.5")} value={s.rounds} onChange={(e) => onChange({ ...s, rounds: Number(e.target.value) })}>{Array.from({ length: 9 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Tidskontroll</legend>
        <div className="grid grid-cols-4 gap-2">
          {TC_PRESETS.map(([m, i]) => (
            <Button key={`${m}+${i}`} type="button" variant="outline" aria-pressed={s.minutes === m && s.increment === i} onClick={() => onChange({ ...s, minutes: m, increment: i })} className={cn("h-12", s.minutes === m && s.increment === i && "border-primary bg-primary/10")}>{m}+{i}</Button>
          ))}
          <Button type="button" variant="outline" aria-pressed={custom} onClick={() => onChange({ ...s, minutes: 12, increment: 3 })} className={cn("h-12", custom && "border-primary bg-primary/10")}>Eget</Button>
        </div>
        {custom && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm">Minutter<input type="number" min={1} max={180} className={cn(field, "mt-1.5")} value={s.minutes} onChange={(e) => onChange({ ...s, minutes: Number(e.target.value) })} /></label>
            <label className="block text-sm">Tilleggsekunder<input type="number" min={0} max={60} className={cn(field, "mt-1.5")} value={s.increment} onChange={(e) => onChange({ ...s, increment: Number(e.target.value) })} /></label>
          </div>
        )}
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Clock className="size-3.5" />Sjekk faktisk tidskontroll med arrangøren.</p>
      </fieldset>
    </div>
  );
}

function Current({ t }: { t: Tournament }) {
  const playingIdx = t.rounds.findIndex((r) => r.status === "playing");
  const { points, played } = score(t);
  const [editing, setEditing] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  if (playingIdx >= 0) return <Playing t={t} i={playingIdx} />;

  const allDone = activeRound(t) === null;
  return (
    <div className="space-y-6">
      <section className="card-game p-5" aria-label="Turneringen">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="section-title break-words">{t.setup.name}</h2>
            <p className="text-sm text-muted-foreground">{formatDate(t.setup.date)} · {t.setup.rounds} runder · {t.setup.minutes}+{t.setup.increment}</p>
          </div>
          <div className="text-right"><p className="text-2xl font-semibold text-primary">{formatPoints(points)} <span className="text-base font-normal text-muted-foreground">av {played}</span></p><p className="text-xs text-muted-foreground">poeng hittil</p></div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Resultater herfra gir ikke app-rating eller XP.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditing((v) => !v)} aria-expanded={editing}><Pencil /> Rediger oppsett</Button>
          <Button variant="outline" onClick={() => setConfirmNew((v) => !v)} aria-expanded={confirmNew}><Archive /> Arkiver / ny turnering</Button>
        </div>
        {confirmNew && (
          <div className="mt-4 rounded-lg border border-border bg-muted p-4 text-sm">
            <p>Turneringen lagres i historikken, og du kan lage en ny.</p>
            <div className="mt-3 flex gap-2"><Button onClick={archiveCurrent}>Ja, arkiver</Button><Button variant="ghost" onClick={() => setConfirmNew(false)}>Avbryt</Button></div>
          </div>
        )}
        {editing && <EditSetup t={t} onDone={() => setEditing(false)} />}
      </section>

      {!allDone && <Preparation t={t} />}
      <Rounds t={t} />
      <AfterDay t={t} />
    </div>
  );
}

function EditSetup({ t, onDone }: { t: Tournament; onDone: () => void }) {
  const [s, setS] = useState(t.setup);
  const lost = roundsLostBy(t, s.rounds);
  const [confirm, setConfirm] = useState(false);
  const save = () => { updateTournament(t.id, (x) => applySetup(x, s)); onDone(); };
  return (
    <div className="mt-5 space-y-4 border-t border-border pt-5">
      <SetupForm value={s} onChange={(v) => { setS(v); setConfirm(false); }} />
      {confirm ? (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <p>{lost === 1 ? "1 runde" : `${lost} runder`} med lagrede data blir fjernet. Vil du fortsette?</p>
          <div className="mt-3 flex gap-2"><Button variant="destructive" onClick={save}>Ja, fjern og lagre</Button><Button variant="ghost" onClick={() => setConfirm(false)}>Avbryt</Button></div>
        </div>
      ) : (
        <div className="flex gap-2"><Button onClick={() => (lost > 0 ? setConfirm(true) : save())}>Lagre oppsett</Button><Button variant="ghost" onClick={onDone}>Avbryt</Button></div>
      )}
    </div>
  );
}

function Preparation({ t }: { t: Tournament }) {
  const today = dayKey(new Date());
  const days = daysBetween(today, t.setup.date);
  const [prep, setPrep] = useState<Prep>(t.prep);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<null | "white" | "e4" | "d4">(null);
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(true);
  const dirty = JSON.stringify(prep) !== JSON.stringify(t.prep);
  const tc = tcString(t.setup);
  return (
    <section className="card-game p-5" aria-labelledby="prep-h">
      <button type="button" className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span><span id="prep-h" className="section-title block">Forberedelse</span><span className="text-sm text-muted-foreground">{days > 0 ? `${days} ${days === 1 ? "dag" : "dager"} igjen` : days === 0 ? "Det er i dag!" : "Turneringen er passert"}</span></span>
        <ChevronDown className={cn("size-5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-5 space-y-6">
          <ul className="space-y-2 text-sm">{prepPlan(days, t.prep).map((p) => <li key={p} className="flex gap-2"><Flag className="mt-0.5 size-4 shrink-0 text-primary" />{p}</li>)}</ul>

          <div className="space-y-3">
            <h3 className="font-semibold">Åpningsrepetisjon</h3>
            <p className="text-xs text-muted-foreground">Skriv dine egne åpninger. Appen kjenner ikke repertoaret ditt og legger ikke til linjer.</p>
            <label className="block text-sm font-medium">Min åpning med hvit<input className={cn(field, "mt-1.5")} placeholder="F.eks. 1.e4 og italiensk" value={prep.whiteOpening} onChange={(e) => { setPrep({ ...prep, whiteOpening: e.target.value }); setSaved(false); }} /></label>
            <label className="block text-sm font-medium">Mitt svar mot 1.e4<input className={cn(field, "mt-1.5")} value={prep.vsE4} onChange={(e) => { setPrep({ ...prep, vsE4: e.target.value }); setSaved(false); }} /></label>
            <label className="block text-sm font-medium">Mitt svar mot 1.d4<input className={cn(field, "mt-1.5")} value={prep.vsD4} onChange={(e) => { setPrep({ ...prep, vsD4: e.target.value }); setSaved(false); }} /></label>
            <label className="block text-sm font-medium">Plan og huskeregel<textarea rows={3} className={cn(field, "mt-1.5")} placeholder="F.eks. Rokér tidlig, ta midten, se etter trusler." value={prep.plan} onChange={(e) => { setPrep({ ...prep, plan: e.target.value }); setSaved(false); }} /></label>
            <div className="flex items-center gap-3"><Button onClick={() => { updateTournament(t.id, (x) => ({ ...x, prep })); setSaved(true); }} disabled={!dirty}>Lagre notater</Button>{saved && !dirty && <span className="text-sm text-primary" role="status">Lagret</span>}</div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Selvtest: Hva er planen?</h3>
            {!t.prep.whiteOpening && !t.prep.vsE4 && !t.prep.vsD4 ? <p className="text-sm text-muted-foreground">Lagre noen notater over først, så kan du teste deg selv.</p> : (
              <>
                <div className="flex flex-wrap gap-2">
                  {([["white", "Med hvit"], ["e4", "Mot 1.e4"], ["d4", "Mot 1.d4"]] as const).map(([id, l]) => <Button key={id} variant="outline" aria-pressed={test === id} className={cn(test === id && "border-primary bg-primary/10")} onClick={() => { setTest(id); setRevealed(false); }}>{l}</Button>)}
                </div>
                {test && (
                  <div className="rounded-lg border border-border bg-muted p-4 text-sm">
                    <p className="font-medium">Hva spiller du {test === "white" ? "med hvit" : test === "e4" ? "mot 1.e4" : "mot 1.d4"}, og hva er planen? Si det høyt først.</p>
                    {revealed ? (
                      <div className="mt-3 space-y-1"><p><span className="text-muted-foreground">Dine notater: </span>{(test === "white" ? t.prep.whiteOpening : test === "e4" ? t.prep.vsE4 : t.prep.vsD4) || "Ikke skrevet ennå."}</p>{t.prep.plan && <p><span className="text-muted-foreground">Plan: </span>{t.prep.plan}</p>}</div>
                    ) : <Button variant="secondary" className="mt-3" onClick={() => setRevealed(true)}>Vis mine notater</Button>}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Trening</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <Link to="/pusler" className="activity-link !p-4 text-sm font-medium">Taktikk: dagens pusler</Link>
              <Link to="/trener" className="activity-link !p-4 text-sm font-medium">Sluttspill og øvelser</Link>
              <Link to="/fritt" search={{ tc }} className="activity-link !p-4 text-sm font-medium">Treningsparti {tc}</Link>
            </div>
            <p className="text-xs text-muted-foreground">Treningspartiet teller som et vanlig parti i appen.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function Rounds({ t }: { t: Tournament }) {
  const active = activeRound(t);
  const [open, setOpen] = useState<number | null>(active);
  return (
    <section aria-labelledby="rounds-h" className="space-y-3">
      <h2 id="rounds-h" className="section-title">Runder</h2>
      {t.rounds.map((r, i) => <RoundCard key={i} t={t} r={r} i={i} isActive={i === active} open={open === i} setOpen={(v) => setOpen(v ? i : null)} onNext={() => setOpen(i + 1 < t.rounds.length ? i + 1 : null)} />)}
    </section>
  );
}

function RoundCard({ t, r, i, isActive, open, setOpen, onNext }: { t: Tournament; r: Round; i: number; isActive: boolean; open: boolean; setOpen: (v: boolean) => void; onNext: () => void }) {
  const status = r.status === "done" ? (r.result ? RESULT_LABEL[r.result] : "Ferdig") : isActive ? "Neste" : "Senere";
  return (
    <div className={cn("card-game overflow-hidden", isActive && "border-primary/60")}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left">
        {r.status === "done" ? <CheckCircle2 className="size-5 shrink-0 text-primary" /> : <Swords className="size-5 shrink-0 text-muted-foreground" />}
        <span className="flex-1 font-medium">Runde {i + 1}{r.opponent && <span className="font-normal text-muted-foreground"> · {r.opponent}</span>}</span>
        <span className={cn("chip", isActive && "text-primary")}>{status}</span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-border p-4">{r.status === "done" ? <ResultForm t={t} i={i} onNext={onNext} /> : <BeforeRound t={t} r={r} i={i} />}</div>}
    </div>
  );
}

function BeforeRound({ t, r, i }: { t: Tournament; r: Round; i: number }) {
  const coach = useTrainer().coach;
  const tips = COACH_TIPS[coach ?? "neutral"];
  const set = (patch: Partial<Round>) => updateTournament(t.id, (x) => ({ ...x, rounds: x.rounds.map((y, j) => (j === i ? { ...y, ...patch } : y)) }));
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <CoachAvatar className="size-12" />
        <div className="speech min-w-0 flex-1 text-sm">
          <CoachLabel className="mb-1 block" />
          <p className="font-medium">To minutter før runden:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">{tips.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </div>
      <fieldset><legend className="mb-2 text-sm font-medium">Hvordan føler du deg? <span className="font-normal text-muted-foreground">(valgfritt)</span></legend>
        <div className="grid grid-cols-3 gap-2">{FEELINGS.map((f) => <Button key={f.id} variant="outline" aria-pressed={r.feeling === f.id} className={cn("h-11", r.feeling === f.id && "border-primary bg-primary/10")} onClick={() => set({ feeling: r.feeling === f.id ? null : f.id })}>{f.label}</Button>)}</div>
        {r.feeling === "nervos" && <p className="mt-2 text-sm text-muted-foreground">Helt vanlig! Pust sakte inn og ut tre ganger. Nerver betyr at du bryr deg.</p>}
        {r.feeling === "sliten" && <p className="mt-2 text-sm text-muted-foreground">Ta en slurk vann og en matbit. Bruk litt ekstra tid på de første trekkene.</p>}
      </fieldset>
      <fieldset><legend className="mb-2 text-sm font-medium">Ett mål for partiet <span className="font-normal text-muted-foreground">(valgfritt)</span></legend>
        <div className="grid gap-2 sm:grid-cols-2">{PROCESS_GOALS.map((g) => <Button key={g} variant="outline" aria-pressed={r.goal === g} className={cn("h-auto min-h-11 whitespace-normal", r.goal === g && "border-primary bg-primary/10")} onClick={() => set({ goal: r.goal === g ? "" : g })}>{g}</Button>)}</div>
      </fieldset>
      <Button size="lg" className="w-full" onClick={() => set({ status: "playing" })}>Start runde {i + 1}</Button>
    </div>
  );
}

function Playing({ t, i }: { t: Tournament; i: number }) {
  const r = t.rounds[i]!;
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <section className="card-game space-y-4 p-6 text-center" aria-live="polite">
      <p className="eyebrow">{t.setup.name}</p>
      <h2 ref={ref} tabIndex={-1} className="text-2xl font-semibold">Partiet pågår</h2>
      <p className="text-muted-foreground">Runde {i + 1} av {t.setup.rounds}</p>
      {r.goal && <p className="text-sm">Målet ditt: <span className="font-medium">{r.goal}</span></p>}
      <p className="text-sm text-muted-foreground">Lykke til! Kom tilbake hit når partiet er over.</p>
      <div className="flex flex-col gap-2 pt-2">
        <Button size="lg" onClick={() => updateTournament(t.id, (x) => ({ ...x, rounds: x.rounds.map((y, j) => (j === i ? { ...y, status: "done" } : y)) }))}>Partiet er ferdig</Button>
        <Button variant="ghost" onClick={() => updateTournament(t.id, (x) => ({ ...x, rounds: x.rounds.map((y, j) => (j === i ? { ...y, status: "before" } : y)) }))}>Startet ved en feil? Gå tilbake</Button>
      </div>
    </section>
  );
}

function ResultForm({ t, i, onNext }: { t: Tournament; i: number; onNext: () => void }) {
  const r = t.rounds[i]!;
  const [d, setD] = useState({ opponent: r.opponent, color: r.color, good: r.good, learn: r.learn });
  const setResult = (result: Result) => updateTournament(t.id, (x) => ({ ...x, rounds: x.rounds.map((y, j) => (j === i ? { ...y, result } : y)) }));
  const dirty = d.opponent !== r.opponent || d.color !== r.color || d.good !== r.good || d.learn !== r.learn;
  const saveDetails = () => updateTournament(t.id, (x) => ({ ...x, rounds: x.rounds.map((y, j) => (j === i ? { ...y, ...d } : y)) }));
  const last = i === t.rounds.length - 1;
  const msg = r.result === "win" ? "Sterkt! Nyt det et øyeblikk – og nullstill hodet til neste." : r.result === "draw" ? "Et halvt poeng er et ekte poeng. Bra kjempet!" : r.result === "loss" ? "Tøft, men det er over nå. Neste runde er et helt nytt parti." : null;
  return (
    <div className="space-y-5">
      <fieldset><legend className="mb-2 text-sm font-medium">Resultat</legend>
        <div className="grid grid-cols-3 gap-2">{(["win", "draw", "loss"] as Result[]).map((x) => <Button key={x} variant="outline" aria-pressed={r.result === x} className={cn("h-12", r.result === x && "border-primary bg-primary/10")} onClick={() => setResult(x)}>{RESULT_LABEL[x]}</Button>)}</div>
      </fieldset>
      {msg && <p className="rounded-lg bg-muted p-3 text-sm" role="status">{msg} {!last && "Ta en pause, drikk vann og strekk på deg. Grundig gjennomgang venter til etter dagen."}</p>}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-primary">Legg til detaljer (valgfritt)</summary>
        <div className="mt-3 space-y-3">
          <label className="block text-sm">Motstander<input className={cn(field, "mt-1.5")} value={d.opponent} onChange={(e) => setD({ ...d, opponent: e.target.value })} /></label>
          <fieldset><legend className="mb-1.5 text-sm">Din farge</legend><div className="grid grid-cols-2 gap-2">{(["w", "b"] as const).map((c) => <Button key={c} variant="outline" aria-pressed={d.color === c} className={cn(d.color === c && "border-primary bg-primary/10")} onClick={() => setD({ ...d, color: d.color === c ? null : c })}>{c === "w" ? "Hvit" : "Svart"}</Button>)}</div></fieldset>
          <label className="block text-sm">Én ting som var bra<input className={cn(field, "mt-1.5")} value={d.good} onChange={(e) => setD({ ...d, good: e.target.value })} /></label>
          <label className="block text-sm">Ett læringspunkt<input className={cn(field, "mt-1.5")} value={d.learn} onChange={(e) => setD({ ...d, learn: e.target.value })} /></label>
          <Button variant="secondary" disabled={!dirty} onClick={saveDetails}>Lagre detaljer</Button>
        </div>
      </details>
      {r.result && <Button className="w-full" size="lg" onClick={() => { if (dirty) saveDetails(); onNext(); }}>{last ? "Til oppsummeringen" : `Neste: runde ${i + 2}`}</Button>}
    </div>
  );
}

function AfterDay({ t }: { t: Tournament }) {
  const { points, played } = score(t);
  const allDone = activeRound(t) === null;
  const [good, setGood] = useState(t.afterGood);
  const [focus, setFocus] = useState(t.focus);
  if (!allDone) return null;
  const wins = t.rounds.filter((r) => r.result === "win").length, draws = t.rounds.filter((r) => r.result === "draw").length, losses = t.rounds.filter((r) => r.result === "loss").length;
  const goods = t.rounds.map((r, i) => r.good && `Runde ${i + 1}: ${r.good}`).filter(Boolean) as string[];
  const learns = t.rounds.map((r, i) => r.learn && `Runde ${i + 1}: ${r.learn}`).filter(Boolean) as string[];
  return (
    <section className="card-game space-y-5 p-5" aria-labelledby="after-h">
      <div className="flex items-center gap-3"><Trophy className="size-6 text-gold" /><h2 id="after-h" className="section-title">Etter turneringsdagen</h2></div>
      <p className="text-lg">Du fikk <span className="font-semibold text-primary">{formatPoints(points)} poeng</span> av {played} partier. <span className="text-muted-foreground">({wins} seier, {draws} remis, {losses} tap)</span></p>
      <p className="text-sm">Du spilte en hel turneringsdag. Det krever mye – godt jobbet!</p>
      {goods.length > 0 && <div><h3 className="mb-1 text-sm font-semibold">Det du selv skrev var bra</h3><ul className="list-disc space-y-0.5 pl-5 text-sm">{goods.map((g) => <li key={g}>{g}</li>)}</ul></div>}
      {learns.length > 0 && <div><h3 className="mb-1 text-sm font-semibold">Læringspunktene dine</h3><ul className="list-disc space-y-0.5 pl-5 text-sm">{learns.map((g) => <li key={g}>{g}</li>)}</ul></div>}
      <label className="block text-sm font-medium">Noe positivt fra dagen <span className="font-normal text-muted-foreground">(valgfritt)</span><textarea rows={2} className={cn(field, "mt-1.5")} value={good} onChange={(e) => setGood(e.target.value)} /></label>
      <fieldset><legend className="mb-2 text-sm font-medium">Ett fokus for neste uke</legend>
        <div className="grid gap-2 sm:grid-cols-2">{["Taktikk hver dag", "Sluttspill", "Åpningene mine", "Klokkebruk"].map((f) => <Button key={f} variant="outline" aria-pressed={focus === f} className={cn(focus === f && "border-primary bg-primary/10")} onClick={() => setFocus(focus === f ? "" : f)}>{f}</Button>)}</div>
      </fieldset>
      <Button variant="secondary" disabled={good === t.afterGood && focus === t.focus} onClick={() => updateTournament(t.id, (x) => ({ ...x, afterGood: good, focus }))}>Lagre</Button>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link to="/pusler" className="activity-link !p-4 text-sm font-medium">Til puslene</Link>
        <Link to="/trener" className="activity-link !p-4 text-sm font-medium">Til treneren</Link>
      </div>
    </section>
  );
}

function History({ list }: { list: Tournament[] }) {
  return (
    <section className="mt-8 space-y-3" aria-labelledby="hist-h">
      <h2 id="hist-h" className="section-title">Tidligere turneringer</h2>
      <ul className="space-y-2">{list.map((t) => { const s = score(t); return (
        <li key={t.id} className="card-game flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="min-w-0"><span className="block truncate font-medium">{t.setup.name}</span><span className="text-muted-foreground">{formatDate(t.setup.date)}{t.focus && ` · Fokus: ${t.focus}`}</span></span>
          <span className="shrink-0 font-semibold">{formatPoints(s.points)} / {s.played}</span>
        </li>); })}</ul>
    </section>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
}
