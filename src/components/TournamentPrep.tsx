import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  Lightbulb,
  Pencil,
  Play,
  RotateCcw,
  Swords,
} from "lucide-react";
import { Board } from "@/components/Board";
import { AdaptivePuzzle } from "@/components/AdaptivePuzzle";
import { CoachBubble } from "@/components/CoachAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dayKey } from "@/lib/rules";
import { GROUP_LABEL, OPENINGS, getOpening, type Branch, type Opening } from "@/data/openings";
import {
  BOT_LEVELS,
  buildSession,
  branchFor,
  cleanPlan,
  drillHint,
  ENDGAME_TOPICS,
  fenAt,
  gradeDrillMove,
  isDue,
  MAX_OPENINGS,
  pickTopicItem,
  playerMovesAt,
  recordDrill,
  recordTopic,
  sessionSummary,
  TACTIC_TOPICS,
  topicById,
  topicSide,
  topicStartFen,
  trainedCount,
  type OpeningRec,
  type Plan,
  type PlanMode,
  type PrepState,
  type SessionEvent,
  type StepKind,
} from "@/lib/prep";
import { updatePrep, usePrep } from "@/lib/prep-store";
import type { Tournament } from "@/lib/tournament";
import { play } from "@/lib/sound";

const field =
  "w-full rounded-[var(--control-radius)] border border-input bg-card px-3 py-2.5 text-sm text-foreground";
const fmtDay = (d: string) =>
  d
    ? new Date(d + "T12:00:00").toLocaleDateString("nb-NO", { day: "numeric", month: "short" })
    : "";

/* ---------- Plan picker ---------- */

function PlanPicker({
  initial,
  onSave,
  onCancel,
}: {
  initial: Plan | null;
  onSave: (p: Plan) => void;
  onCancel?: (() => void) | undefined;
}) {
  const [ids, setIds] = useState<string[]>(initial?.openings ?? []);
  const toggle = (id: string) =>
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_OPENINGS ? cur : [...cur, id]));
  const has = (g: "white" | "e4" | "d4") => OPENINGS.some((o) => o.group === g && ids.includes(o.id));
  const ready = has("white") && (has("e4") || has("d4"));
  return (
    <div className="space-y-5">
      {(["white", "e4", "d4"] as const).map((g) => (
        <fieldset key={g}>
          <legend className="mb-2 text-sm font-bold">{GROUP_LABEL[g]}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {OPENINGS.filter((o) => o.group === g).map((o) => {
              const on = ids.includes(o.id);
              return (
                <button key={o.id} type="button" aria-pressed={on} onClick={() => toggle(o.id)}
                  className={cn("quest !grid-cols-[auto_minmax(0,1fr)] text-left", on && "is-done")}>
                  <span className="quest__check">{on ? <CheckCircle2 className="size-5" /> : <span className="text-base">♟</span>}</span>
                  <span className="min-w-0"><span className="block font-semibold leading-tight">{o.name}</span><span className="block text-xs text-muted-foreground">{o.summary}</span></span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <p className="text-xs text-muted-foreground">Velg én med hvit og minst én med svart. Maks {MAX_OPENINGS} totalt – færre er bedre, du skal kunne dem utenat.</p>
      <div className="flex gap-2">
        <Button size="lg" disabled={!ready} onClick={() => onSave(cleanPlan({ mode: ids.length === 1 ? "one" : "many", openings: ids }))}>
          Lagre åpningene mine
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Avbryt
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------- Practice launcher ---------- */

export function PracticeLauncher({
  fen,
  side,
  source,
  tournamentTc,
  label = "Spill stillingen mot bot",
}: {
  fen: string;
  side: "w" | "b";
  source: string;
  tournamentTc: string | null;
  label?: string;
}) {
  const navigate = useNavigate();
  const [elo, setElo] = useState(1550);
  const [clock, setClock] = useState(false);
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium">
          Botstyrke
          <select
            className={cn(field, "mt-1")}
            value={elo}
            onChange={(e) => setElo(Number(e.target.value))}
          >
            {BOT_LEVELS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Klokke
          <select
            className={cn(field, "mt-1")}
            value={clock ? "t" : "n"}
            onChange={(e) => setClock(e.target.value === "t")}
          >
            <option value="n">Uten klokke</option>
            {tournamentTc && <option value="t">Turneringsklokke {tournamentTc}</option>}
          </select>
        </label>
      </div>
      <Button
        className="mt-2 w-full"
        onClick={() =>
          navigate({
            to: "/treningsparti",
            search: {
              fen,
              side,
              elo,
              tc: clock && tournamentTc ? tournamentTc : "none",
              src: source,
            },
          })
        }
      >
        <Swords /> {label}
      </Button>
      <p className="mt-1 text-xs text-muted-foreground">Appens botstyrke er ikke en FIDE-rating.</p>
    </div>
  );
}

/* ---------- Opening drill ---------- */

type DrillResult = { independent: boolean; branch: Branch };
export function OpeningDrill({
  opening: o,
  rec,
  tournamentTc,
  onDone,
}: {
  opening: Opening;
  rec: OpeningRec | undefined;
  tournamentTc: string | null;
  onDone: (r: DrillResult) => void;
}) {
  const [branch] = useState(() => branchFor(o, rec));
  const [phase, setPhase] = useState<"demo" | "try" | "why" | "done">(
    rec?.practiced ? "try" : "demo",
  );
  const [ply, setPly] = useState(0);
  const [hint, setHint] = useState<0 | 1 | 2 | 3>(0);
  const [helped, setHelped] = useState(false);
  const [offline, setOffline] = useState<{ san: string; fen: string } | null>(null);
  const [shake, setShake] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const reported = useRef(false);
  const orientation = o.side;
  const end = branch.moves.length;

  // Opponent replies automatically in "try".
  useEffect(() => {
    if (phase !== "try" || offline || ply >= end || playerMovesAt(o, ply)) return;
    const t = setTimeout(() => {
      setPly((p) => p + 1);
      play("move");
    }, 450);
    return () => clearTimeout(t);
  }, [phase, ply, offline, end, o]);
  useEffect(() => {
    if (phase === "try" && ply >= end) setPhase("why");
  }, [phase, ply, end]);

  const onMove = (from: string, to: string) => {
    if (phase !== "try" || offline || !playerMovesAt(o, ply)) return false;
    const g = gradeDrillMove(branch, ply, from, to);
    if (g.kind === "illegal") return false;
    if (g.kind === "line") {
      setPly(ply + 1);
      setHint(0);
      play("move");
      return true;
    }
    setOffline({ san: g.san, fen: g.fen });
    setHelped(true);
    play("wrong");
    setShake(true);
    setTimeout(() => setShake(false), 400);
    return true;
  };
  const restartTry = () => {
    setPly(0);
    setHint(0);
    setOffline(null);
    setPhase("try");
  };
  const finish = () => {
    setPhase("done");
    if (!reported.current) {
      reported.current = true;
      onDone({ independent: !helped, branch });
    }
  };
  const h =
    phase === "try" && hint > 0 && ply < end && playerMovesAt(o, ply)
      ? drillHint(o, branch, ply, hint as 1 | 2 | 3)
      : null;
  const sideTxt = o.side === "white" ? "hvit" : "svart";
  const boardFen = offline
    ? offline.fen
    : fenAt(branch, phase === "try" ? ply : phase === "demo" ? ply : end);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          {o.name}: {branch.name}
        </h3>
        <span className="text-xs text-muted-foreground">
          Du spiller {sideTxt} · {branch.eco} {branch.lichessName}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[360px]">
          <Board
            fen={boardFen}
            orientation={orientation}
            onMove={onMove}
            canMove={phase === "try" && !offline && playerMovesAt(o, ply) && ply < end}
            shake={shake}
            arrows={
              h?.arrow
                ? [
                    {
                      startSquare: h.arrow[0],
                      endSquare: h.arrow[1],
                      color: "rgba(120,200,80,0.8)",
                    },
                  ]
                : []
            }
          />
        </div>
        <div className="space-y-3 text-sm">
          {phase === "demo" && (
            <>
              <p className="font-medium">Se linjen først.</p>
              <p>{branch.reply}</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {o.plans.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="text-muted-foreground">
                Trekk {ply} av {end}
                {ply > 0 ? `: ${branch.moves[ply - 1]}` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={ply === 0} onClick={() => setPly(ply - 1)}>
                  <ArrowLeft /> Tilbake
                </Button>
                <Button variant="outline" disabled={ply >= end} onClick={() => setPly(ply + 1)}>
                  Neste <ArrowRight />
                </Button>
                <Button onClick={restartTry}>
                  <Play /> Prøv selv
                </Button>
              </div>
            </>
          )}
          {phase === "try" && (
            <>
              {offline ? (
                <div role="status" className="rounded-lg border border-border bg-muted p-3">
                  <p className="font-medium">{offline.san} er et lovlig trekk.</p>
                  <p className="mt-1">
                    Vi øver på denne planen nå. Du kan prøve linjen igjen, eller spille videre mot
                    boten.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => setOffline(null)}>
                      <RotateCcw /> Prøv linjen
                    </Button>
                  </div>
                  <div className="mt-3">
                    <PracticeLauncher
                      fen={offline.fen}
                      side={o.side === "white" ? "w" : "b"}
                      source={`${o.name} – egen vei`}
                      tournamentTc={tournamentTc}
                      label="Spill videre mot bot"
                    />
                  </div>
                </div>
              ) : (
                <p className="font-medium">
                  {ply >= end
                    ? "Bra!"
                    : playerMovesAt(o, ply)
                      ? "Ditt trekk. Spill linjen fra hukommelsen."
                      : "Motstanderen svarer …"}
                </p>
              )}
              <p className="text-muted-foreground">
                Trekk {Math.min(ply + 1, end)} av {end}
              </p>
              {h && <p className="rounded-lg bg-primary/10 p-3">{h.text}</p>}
              {!offline && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={hint >= 3 || !playerMovesAt(o, ply)}
                    onClick={() => {
                      setHint((x) => Math.min(3, x + 1) as 1 | 2 | 3);
                      setHelped(true);
                    }}
                  >
                    {hint >= 2 ? (
                      <>
                        <Eye /> Vis trekket
                      </>
                    ) : (
                      <>
                        <Lightbulb /> Hint {hint + 1} av 3
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => setPhase("demo")}>
                    Se demo
                  </Button>
                  <Button variant="ghost" onClick={restartTry}>
                    <RotateCcw /> Start på nytt
                  </Button>
                </div>
              )}
              {helped && (
                <p className="text-xs text-muted-foreground">
                  Hjelp er fint. Denne runden teller som øving, ikke som mestret.
                </p>
              )}
            </>
          )}
          {phase === "why" && (
            <div className="space-y-2">
              <p className="font-medium">Hvorfor? {o.why.q}</p>
              {o.why.options.map((opt, i) => (
                <Button
                  key={opt}
                  variant="outline"
                  className={cn(
                    "h-auto w-full justify-start whitespace-normal py-3 text-left",
                    answer !== null && i === o.why.correct && "border-primary bg-primary/10",
                    answer === i && i !== o.why.correct && "border-destructive",
                  )}
                  onClick={() => setAnswer(i)}
                  disabled={answer !== null}
                >
                  {opt}
                </Button>
              ))}
              {answer !== null && (
                <p>
                  {answer === o.why.correct ? "Riktig. " : "Ikke helt. "}
                  {o.why.explain}
                </p>
              )}
              {answer !== null && <Button onClick={finish}>Ferdig med åpningen</Button>}
            </div>
          )}
          {phase === "done" && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-5 text-primary" />
                {helped
                  ? "Du kom gjennom linjen med hjelp. Vi tar den igjen i morgen."
                  : "Du spilte hele linjen uten hjelp!"}
              </p>
              <PracticeLauncher
                fen={fenAt(branch, end)}
                side={o.side === "white" ? "w" : "b"}
                source={`${o.name}: ${branch.name}`}
                tournamentTc={tournamentTc}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Topic trainer (tactics / endgames) ---------- */

export function TopicTrainer({
  kind,
  prep,
  tournamentTc,
  onEvent,
}: {
  kind: "tactic" | "endgame";
  prep: PrepState;
  tournamentTc: string | null;
  onEvent?: (e: SessionEvent) => void;
}) {
  const day = dayKey(new Date());
  const topics = kind === "tactic" ? TACTIC_TOPICS : ENDGAME_TOPICS;
  const topicId = kind === "tactic" ? prep.tacticTopic : prep.endgameTopic;
  const topic = topicById(kind, topicId) ?? topics[0]!;
  const cur = prep.current[kind];
  const item = useMemo(() => {
    const saved =
      cur && cur.topic === topic.id ? topic.items.find((i) => i.id === cur.itemId) : undefined;
    return saved ?? pickTopicItem(topic, prep.topics, day);
  }, [cur, topic, prep.topics, day]);
  useEffect(() => {
    if (item && (!cur || cur.itemId !== item.id || cur.topic !== topic.id))
      updatePrep((s) => ({
        ...s,
        current: { ...s.current, [kind]: { kind, topic: topic.id, itemId: item.id } },
      }));
  }, [item, cur, kind, topic.id]);
  const [result, setResult] = useState<null | boolean>(null);
  if (!item) return <p className="text-sm">Ingen oppgaver i dette temaet.</p>;
  const next = () => {
    const n = pickTopicItem(topic, prep.topics, day, item.id);
    if (n)
      updatePrep((s) => ({
        ...s,
        current: { ...s.current, [kind]: { kind, topic: topic.id, itemId: n.id } },
      }));
    setResult(null);
  };
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        {kind === "tactic" ? "Tema" : "Sluttspill"}
        <select
          className={cn(field, "mt-1.5")}
          value={topic.id}
          onChange={(e) => {
            const v = e.target.value;
            setResult(null);
            updatePrep((s) => ({ ...s, [kind === "tactic" ? "tacticTopic" : "endgameTopic"]: v }));
          }}
        >
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} ({t.items.length})
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        {topic.note}{" "}
        {kind === "tactic" && "Generell taktikk. Oppgavene er ikke koblet til åpningene dine."}{" "}
        Kilde: Lichess (CC0),{" "}
        <a className="underline" href={item.gameUrl} target="_blank" rel="noreferrer">
          se partiet
        </a>
        .
      </p>
      <AdaptivePuzzle
        key={item.id}
        item={item}
        onResult={(o) => {
          const independent = o === "good";
          setResult(independent);
          updatePrep((s) => ({
            ...s,
            topics: { ...s.topics, [item.id]: recordTopic(s.topics[item.id], day, independent) },
          }));
          onEvent?.({
            kind,
            ref: topic.id,
            independent,
            note: independent
              ? `Du løste en ${topic.label.toLowerCase()}-oppgave uten hjelp.`
              : `Du jobbet med en ${topic.label.toLowerCase()}-oppgave. Den kommer igjen i morgen.`,
          });
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={next}>
          Neste oppgave <ArrowRight />
        </Button>
        {result !== null && (
          <span className="self-center text-sm text-muted-foreground">
            {result ? "Løst uten hjelp." : "Den tar vi igjen senere."}
          </span>
        )}
      </div>
      {kind === "endgame" && (
        <PracticeLauncher
          fen={topicStartFen(item)}
          side={topicSide(item) === "white" ? "w" : "b"}
          source={`Sluttspill: ${topic.label}`}
          tournamentTc={tournamentTc}
        />
      )}
    </div>
  );
}

/* ---------- Main prep panel ---------- */

function recordOpening(o: Opening, r: DrillResult) {
  const day = dayKey(new Date());
  updatePrep((s) => ({
    ...s,
    openings: {
      ...s.openings,
      [o.id]: recordDrill(s.openings[o.id], o, r.branch.id, day, r.independent),
    },
  }));
}

export function PrepPanel({
  tournament,
  allTournaments,
}: {
  tournament: Tournament | null;
  allTournaments: Tournament[];
}) {
  const prep = usePrep();
  const day = dayKey(new Date());
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [extra, setExtra] = useState<"tactic" | "endgame" | null>(null);
  const tc = tournament ? `${tournament.setup.minutes}+${tournament.setup.increment}` : null;
  const plan = prep.plan;
  const session = prep.session && prep.session.day === day ? prep.session : null;
  const { trained, total } = trainedCount(plan, prep.openings);

  if (!plan || editing) {
    return (
      <section className="card-game p-5" aria-labelledby="plan-h">
        <h2 id="plan-h" className="section-title">
          Mine åpninger
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Trykk på de du vil kunne. Hver åpning blir et treningskort.
        </p>
        <PlanPicker
          initial={plan}
          onSave={(p) => {
            updatePrep((s) => ({ ...s, plan: p, session: null }));
            setEditing(false);
          }}
          onCancel={plan ? () => setEditing(false) : undefined}
        />
      </section>
    );
  }

  const startSession = (minutes: 5 | 10 | 15) =>
    updatePrep((s) => ({
      ...s,
      session: buildSession(plan, s.openings, day, minutes, s.tacticTopic, s.endgameTopic),
    }));
  const addEvent = (e: SessionEvent) =>
    updatePrep((s) =>
      s.session && s.session.day === day
        ? { ...s, session: { ...s.session, events: [...s.session.events, e] } }
        : s,
    );
  const stepDone = () =>
    updatePrep((s) => {
      if (!s.session) return s;
      const idx = s.session.idx + 1;
      return { ...s, session: { ...s.session, idx, done: idx >= s.session.steps.length } };
    });

  return (
    <div className="space-y-6">
      <section className="card-game p-5" aria-label="Dagens økt">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-title">Kjapp økt</h2>
            <p className="text-sm text-muted-foreground">
              Åpning + taktikk + sluttspill på 5–15 min. Trent på {trained} av {total} {total === 1 ? "åpning" : "åpninger"}.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil /> Endre åpninger
          </Button>
        </div>
        {!session && <StartSession onStart={startSession} />}
        {session && !session.done && (
          <SessionRunner
            key={`${session.day}-${session.idx}`}
            session={session}
            prep={prep}
            tc={tc}
            onEvent={addEvent}
            onNext={stepDone}
          />
        )}
        {session?.done && (
          <div className="mt-4 space-y-3">
            <p className="font-semibold">Dette fikk du til</p>
            <ul className="space-y-1 text-sm">
              {sessionSummary(session.events).map((l, i) => (
                <li key={i} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  {l}
                </li>
              ))}
            </ul>
            <CoachBubble>
              <p>Godt jobbet i dag. Litt hver dag hjelper mest.</p>
            </CoachBubble>
            <Button variant="outline" onClick={() => updatePrep((s) => ({ ...s, session: null }))}>
              Ny økt
            </Button>
          </div>
        )}
      </section>

      <section aria-labelledby="cards-h" className="space-y-3">
        <h2 id="cards-h" className="section-title">
          Åpningene dine
        </h2>
        {plan.openings.map((id) => {
          const o = getOpening(id);
          if (!o) return null;
          const r = prep.openings[id];
          const due = isDue(r, day);
          return (
            <div key={id} className="card-game p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {o.name}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      · {GROUP_LABEL[o.group]}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{o.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r
                      ? `Øvd ${r.practiced} ${r.practiced === 1 ? "gang" : "ganger"} · ${r.independent} uten hjelp · grener ${r.seen.length} av ${o.branches.length}`
                      : `Ikke øvd ennå · ${o.branches.length} grener`}
                    {r?.dueDay &&
                      ` · ${due ? "klar for repetisjon" : `neste repetisjon ${fmtDay(r.dueDay)}`}`}
                  </p>
                </div>
                <Button
                  variant={open === id ? "secondary" : "outline"}
                  aria-expanded={open === id}
                  onClick={() => setOpen(open === id ? null : id)}
                >
                  {open === id ? "Lukk" : r && !due ? "Repeter nå" : "Øv nå"}
                </Button>
              </div>
              {open === id && (
                <div className="mt-4 border-t border-border pt-4">
                  <OpeningDrill
                    key={id}
                    opening={o}
                    rec={r}
                    tournamentTc={tc}
                    onDone={(res) => recordOpening(o, res)}
                  />
                </div>
              )}
            </div>
          );
        })}
        {plan.openings.some((id) => getOpening(id)?.side === "black") && (
          <p className="text-xs text-muted-foreground">
            Tips: Med svart møter du ofte et annet første trekk enn du har øvd på. Da gjelder
            vanlige prinsipper: midten, utvikling og rokade.
          </p>
        )}
      </section>

      <section className="card-game p-5" aria-label="Taktikk og sluttspill">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            aria-pressed={extra === "tactic"}
            className={cn(extra === "tactic" && "border-primary bg-primary/10")}
            onClick={() => setExtra(extra === "tactic" ? null : "tactic")}
          >
            Taktikk og planer
          </Button>
          <Button
            variant="outline"
            aria-pressed={extra === "endgame"}
            className={cn(extra === "endgame" && "border-primary bg-primary/10")}
            onClick={() => setExtra(extra === "endgame" ? null : "endgame")}
          >
            Sluttspill
          </Button>
        </div>
        {extra && (
          <div className="mt-4">
            <TopicTrainer kind={extra} prep={prep} tournamentTc={tc} />
          </div>
        )}
      </section>

      {prep.games.length > 0 && (
        <section className="card-game p-5">
          <h2 className="section-title">Treningspartier</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {[...prep.games]
              .reverse()
              .slice(0, 5)
              .map((g) => (
                <li key={g.id}>
                  {fmtDay(g.day)} · {g.source} · bot {g.elo} ·{" "}
                  {{ win: "seier", draw: "remis", loss: "tap", stopped: "avsluttet" }[g.result]}
                </li>
              ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Treningspartier påvirker ikke rating eller XP.
          </p>
        </section>
      )}
    </div>
  );
}

function StartSession({ onStart }: { onStart: (m: 5 | 10 | 15) => void }) {
  const [m, setM] = useState<5 | 10 | 15>(10);
  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Lengde">
        {([5, 10, 15] as const).map((x) => (
          <Button
            key={x}
            variant="outline"
            aria-pressed={m === x}
            className={cn("h-11", m === x && "border-primary bg-primary/10")}
            onClick={() => setM(x)}
          >
            {x} min
          </Button>
        ))}
      </div>
      <Button size="lg" className="w-full" onClick={() => onStart(m)}>
        <Play /> Start dagens økt
      </Button>
    </div>
  );
}

const KIND_LABEL: Record<StepKind, string> = {
  opening: "Åpning",
  tactic: "Taktikk",
  endgame: "Sluttspill",
};
function SessionRunner({
  session,
  prep,
  tc,
  onEvent,
  onNext,
}: {
  session: NonNullable<PrepState["session"]>;
  prep: PrepState;
  tc: string | null;
  onEvent: (e: SessionEvent) => void;
  onNext: () => void;
}) {
  const step = session.steps[session.idx]!;
  const [done, setDone] = useState(false);
  const o = step.kind === "opening" ? getOpening(step.ref) : undefined;
  return (
    <div className="mt-4 space-y-4">
      <ol className="flex flex-wrap gap-2 text-xs" aria-label="Steg i økta">
        {session.steps.map((s, i) => (
          <li
            key={i}
            className={cn(
              "rounded-full border px-3 py-1",
              i === session.idx
                ? "border-primary bg-primary/10 font-semibold"
                : i < session.idx
                  ? "border-border text-muted-foreground line-through"
                  : "border-border",
            )}
            aria-current={i === session.idx ? "step" : undefined}
          >
            {KIND_LABEL[s.kind]}
            {s.kind === "opening" ? `: ${getOpening(s.ref)?.name}` : ""}
          </li>
        ))}
      </ol>
      {o && (
        <OpeningDrill
          opening={o}
          rec={prep.openings[o.id]}
          tournamentTc={tc}
          onDone={(r) => {
            recordOpening(o, r);
            onEvent({ kind: "opening", ref: o.id, independent: r.independent, note: "" });
            setDone(true);
          }}
        />
      )}
      {step.kind !== "opening" && (
        <TopicTrainer
          kind={step.kind}
          prep={prep}
          tournamentTc={tc}
          onEvent={(e) => {
            if (!done) onEvent(e);
            setDone(true);
          }}
        />
      )}
      <div className="flex justify-end">
        <Button variant={done ? "default" : "ghost"} onClick={onNext}>
          {done
            ? session.idx + 1 < session.steps.length
              ? "Neste steg"
              : "Se oppsummering"
            : "Hopp over"}{" "}
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

