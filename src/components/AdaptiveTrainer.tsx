import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Gauge, Repeat, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdaptivePuzzle } from "./AdaptivePuzzle";
import { useTrainer, advance, recordAttempt, setCoachState, setCurrent } from "@/lib/trainer-store";
import { BANK, LEVELS, THEMES, getItem, levelFromTest, levelTestIds, overallLevel, pickReview, setAllLevels, type Level } from "@/lib/adaptive";
import type { CoachId } from "@/lib/trainer";

export function AdaptiveTrainer({ coach, day }: { coach: CoachId; day: string }) {
  const tr = useTrainer();
  const cs = tr.coaches[coach];
  const [back, setBack] = useState(0); // 0 = current task; n = n steps back in the trail (look-back only)
  const [exhausted, setExhausted] = useState(false);
  useEffect(() => { if (!cs.current) setExhausted(advance(coach, day, false).exhausted); }, [coach, day, cs.current]);
  useEffect(() => { setBack(0); setExhausted(false); }, [coach]);

  const lookId = back > 0 ? cs.trail[cs.trail.length - back] : cs.current;
  const item = getItem(lookId);
  const lvl = overallLevel(cs, coach);
  const test = cs.test;
  const testIdx = test && cs.current ? test.ids.indexOf(cs.current) : -1;
  const rec = item ? cs.items[item.id] : undefined;
  const solvedNow = !!item && !!rec && rec.lastSeq === cs.seq && rec.last !== null && back === 0;

  const finishTest = () => {
    if (!test) return;
    const l = levelFromTest(test.results);
    setCoachState(coach, (s) => ({ ...setAllLevels(s, coach, l, `Nivåtest: ${test.results.filter((r) => r === "good").length} av ${test.ids.length} uten hjelp.`), test: null }));
    setExhausted(advance(coach, day, false).exhausted);
  };
  const next = () => {
    if (back > 0) { setBack(back - 1); return; }
    if (test && testIdx >= 0) {
      if (testIdx < test.ids.length - 1) { setCurrent(coach, test.ids[testIdx + 1]!, false); return; }
      finishTest(); return;
    }
    setExhausted(advance(coach, day, !solvedNow).exhausted);
  };
  const changeLevel = (l: Level) => { setCoachState(coach, (s) => setAllLevels(s, coach, l, "Valgt av deg.")); setExhausted(false); setBack(0); setTimeout(() => setExhausted(advance(coach, day, false).exhausted)); };
  const startTest = () => { const ids = levelTestIds(cs, coach); setCoachState(coach, (s) => ({ ...s, test: { ids, results: [] } })); setCurrent(coach, ids[0]!, false); setBack(0); };
  const count = BANK.filter((b) => b.coach === coach).length;

  return (
    <section className="mt-6" aria-label="Adaptiv trening">
      <h2 className="section-title mb-3">Adaptiv trening</h2>
      <div className="card-game mb-3 space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Gauge className="size-5 text-primary" aria-hidden />
          <p className="text-sm font-medium" data-testid="train-level">Treningsnivå: {LEVELS[lvl]}</p>
          <span className="text-xs text-muted-foreground">(treningsnivå i appen – ikke en FIDE-rating)</span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Velg nivå">
          {([0, 1, 2] as Level[]).map((l) => <Button key={l} size="sm" className="min-h-11" variant={l === lvl ? "default" : "outline"} aria-pressed={l === lvl} onClick={() => changeLevel(l)}>{LEVELS[l]}</Button>)}
          {!test && <Button size="sm" variant="ghost" className="min-h-11" onClick={startTest}>Kort nivåtest (4 oppgaver)</Button>}
        </div>
        <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          {THEMES[coach].map((t) => <li key={t.id}><span className="font-medium text-foreground">{t.label}:</span> {LEVELS[cs.levels[t.id] ?? 1]} – {cs.reason[t.id]}</li>)}
        </ul>
      </div>

      <nav aria-label="Oppgavenavigasjon" className="card-game mb-3 flex flex-wrap items-center justify-between gap-2 p-4">
        <Button variant="outline" className="min-h-11" disabled={back >= cs.trail.length} onClick={() => setBack(back + 1)}><ChevronLeft />Forrige</Button>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm" aria-live="polite" data-testid="task-meta">
          {item && <><span className="chip">{item.themeLabel}</span><span className="chip">{LEVELS[item.level]}</span></>}
          {back > 0 && <span className="chip">Gjennomgang – teller ikke</span>}
          {back === 0 && cs.currentReview && <span className="chip"><Repeat className="size-3" />Repetisjon</span>}
          {test && testIdx >= 0 && <span className="chip">Nivåtest {testIdx + 1}/{test.ids.length}</span>}
        </div>
        <Button className="min-h-11" onClick={next}>{back > 0 ? "Tilbake fram" : test && testIdx === test.ids.length - 1 ? "Fullfør nivåtest" : "Neste oppgave"}<ChevronRight /></Button>
      </nav>

      {exhausted && back === 0 ? (
        <div role="status" className="card-game space-y-3 p-5">
          <p className="text-sm font-medium">Du har prøvd alle oppgavene på dette nivået.</p>
          <p className="text-sm text-muted-foreground">Det kommer ikke nye oppgaver av seg selv. Velg et annet nivå eller repeter oppgaver du har sett.</p>
          <div className="flex flex-wrap gap-2">
            {([0, 1, 2] as Level[]).filter((l) => l !== lvl).map((l) => <Button key={l} variant="outline" className="min-h-11" onClick={() => changeLevel(l)}>Prøv {LEVELS[l]}</Button>)}
            <Button className="min-h-11" onClick={() => { const id = pickReview(cs, coach); if (id) { setCurrent(coach, id, true); setExhausted(false); } }}><Repeat />Repeter</Button>
          </div>
        </div>
      ) : item && (
        <div className="card-game p-5">
          <AdaptivePuzzle key={`${item.id}:${back}`} item={item} onResult={back > 0 ? undefined : (o, h) => recordAttempt(coach, item.id, o, h, day)} />
          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><Database className="mt-0.5 size-3 shrink-0" />Kilde: Lichess puzzle {item.id} (CC0), fra et ekte parti – <a className="underline" href={item.gameUrl} target="_blank" rel="noopener noreferrer">se partiet</a>. Fasit er Lichess' motorverifiserte løsning, kontrollert med regelmotor her.</p>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{count} oppgaver for denne treneren · 4 temaer · 3 nivåer. Oppgavene gir ikke XP eller rating.</p>
    </section>
  );
}
