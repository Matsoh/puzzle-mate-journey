import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clapperboard, Lock, Play, Sparkles, Trophy, Youtube } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { MikeCompanion } from "@/components/MikeCompanion";
import { YouTube } from "@/components/YouTube";
import { PuzzleSet } from "@/components/school/PuzzleSet";
import { OpeningDrill } from "@/components/school/OpeningDrill";
import { MasterGame } from "@/components/school/MasterGame";
import { getClip, type Clip } from "@/data/gotham";
import { DAY_CAP, PROVE_COINS, SHORTS_PER_DAY, cinemaSummary, clipLabel, clipLocked, coinsToday, dailyClip, grouped, mikeCinemaLine, recommendation, seenOf, shortsToday, watchCoins, withProven, withWatched } from "@/lib/cinema";
import { classOf, daysUntil, pickItems, timetable } from "@/lib/curriculum";
import { recordDrill } from "@/lib/prep";
import { updatePrep, usePrep } from "@/lib/prep-store";
import { today, updateProgress, useProgress } from "@/lib/progress";
import { play } from "@/lib/sound";
import { useTournaments } from "@/lib/tournament-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/kino")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Kinosalen – Goblin Chess" },
      { name: "description", content: "GothamChess-videoer koblet til pensum: se, bevis og tjen mynter." },
      { property: "og:title", content: "Kinosalen – Goblin Chess" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { klipp?: string | undefined } => ({ klipp: typeof s["klipp"] === "string" ? s["klipp"] : undefined }),
  component: CinemaPage,
});

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function CinemaPage() {
  const { klipp } = Route.useSearch();
  const [day, setDay] = useState("");
  useEffect(() => setDay(today()), []);
  const p = useProgress();
  const t = useTournaments();
  const current = t.list.find((x) => x.id === t.current && !x.archived) ?? null;
  const inDays = day ? daysUntil(day, current?.setup.date) : null;
  const prep = usePrep();
  const repertoire = useMemo(() => prep.plan?.openings ?? [], [prep.plan]);
  const periods = useMemo(() => (day ? timetable(p, day, inDays, repertoire) : []), [p, day, inDays, repertoire]);
  const todays = useMemo(() => (day ? dailyClip(p, day, periods) : null), [p, day, periods]);
  const rec = useMemo(() => recommendation(p), [p]);
  const [chosen, setChosen] = useState<string | null>(klipp ?? null);
  const active = (chosen && getClip(chosen)) || todays;
  const line = useMemo(() => (todays && day ? mikeCinemaLine(p, active ?? todays, day) : { text: "Loading the projector…", mood: "chill" as const }), [p, todays, active, day]);
  const sum = cinemaSummary(p);
  const used = day ? coinsToday(p, day) : 0;

  if (!day || !todays || !active) return <main className="page-layout page-narrow"><AppHeader title="Kinosalen" /></main>;
  return (
    <main className="page-layout page-narrow">
      <AppHeader title="Kinosalen" />
      <MikeCompanion mode="trainer" line={line} context={`Kinosalen: GothamChess videos tied to the syllabus. Today's clip: ${active.orig} (${active.topics.join(", ")}). Watched ${sum.seen} of ${sum.total}, proven ${sum.proven}. Coins from the cinema today: ${used} of ${DAY_CAP}.`} compact className="mb-4" />

      <Player key={active.id} clip={active} day={day} isToday={active.id === todays.id} onBack={() => setChosen(null)} />

      {rec && rec.clip.id !== active.id && (
        <section className="card-game mb-4 p-4" aria-label="Mike anbefaler">
          <p className="eyebrow mb-1"><Sparkles className="inline size-4 text-primary" /> Mike anbefaler</p>
          <p className="text-sm">Fordi {rec.why}: <strong>{rec.clip.title}</strong> <span className="text-xs text-muted-foreground">· {clipLabel(rec.clip)}</span></p>
          <Button size="sm" className="mt-2" onClick={() => { setChosen(rec.clip.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Play /> Se den nå</Button>
        </section>
      )}

      <p className="mb-2 text-xs text-muted-foreground">Mynter fra kinoen i dag: <strong>{used}/{DAY_CAP}</strong> · Shorts i dag: {shortsToday(p, day)}/{SHORTS_PER_DAY} · Sett {sum.seen} av {sum.total}, bevist {sum.proven}.</p>

      {grouped().map(({ group, clips }) => (
        <section key={group.id} className="mb-4" aria-label={group.name}>
          <p className="mb-2 font-bold">{group.name}</p>
          <div className={cn("grid gap-2", group.id === "short" ? "grid-cols-2 sm:grid-cols-3" : "")}>
            {clips.map((c) => {
              const s = seenOf(p, c.id);
              const locked = clipLocked(p, c);
              const on = c.id === active.id;
              return (
                <button key={c.id} type="button" disabled={locked} aria-pressed={on} onClick={() => { setChosen(c.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={cn("quest w-full text-left disabled:opacity-60", on && "border-primary bg-primary/10", group.id === "short" && "!grid-cols-[auto_minmax(0,1fr)] !min-h-14 !px-3 !py-2")} data-testid={`clip-${c.id}`}>
                  <span className={cn("quest__check", s?.proven && "is-done")}>{locked ? <Lock className="size-4" /> : s?.proven ? <Trophy className="size-4 text-gold" /> : s?.done ? <CheckCircle2 className="size-4 text-primary" /> : <Youtube className="size-4" />}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{locked ? `Kommer i ${c.cls}. klasse` : `${clipLabel(c)} · +${watchCoins(c)} 🪙${c.prove.kind !== "none" ? ` · bevis +${PROVE_COINS}` : ""}${s?.done ? " · sett" : s?.secs ? ` · ${fmt(s.secs)}` : ""}`}</span>
                  </span>
                  {group.id !== "short" && <span className="text-xs text-muted-foreground">{c.id === todays.id ? "I dag" : ""}</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">Videoene er laget av Levy Rozman (GothamChess) og spilles fra YouTube inne i appen – uten anbefalingsfeed. Mynter betales når 80 % er sett, pluss bonus når du beviser det du lærte. Maks {DAY_CAP} 🪙 per dag.</p>
    </main>
  );
}

/** Today's (or the chosen) clip: the player, progress, pay-out and the proof afterwards. */
function Player({ clip, day, isToday, onBack }: { clip: Clip; day: string; isToday: boolean; onBack: () => void }) {
  const p = useProgress();
  const seen = seenOf(p, clip.id);
  const [paid, setPaid] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [proving, setProving] = useState(false);
  const [proofResult, setProofResult] = useState<{ ok: boolean; paid: number } | null>(null);
  const base = useRef(seen?.secs ?? 0);
  const pct = Math.min(100, Math.round(((seen?.secs ?? 0) / clip.secs) * 100));

  const progress = (secs: number) => {
    const total = base.current + secs;
    updateProgress((s) => {
      const r = withWatched(s, clip.id, total, day);
      if (r.justDone) { play(r.paid ? "levelup" : "correct"); setPaid(r.paid); }
      return r.p;
    });
  };
  const prove = (ok: boolean) => {
    if (!ok) { setProofResult({ ok: false, paid: 0 }); return; }
    updateProgress((s) => { const r = withProven(s, clip.id, day); setProofResult({ ok: true, paid: r.paid }); play("win"); return r.p; });
  };
  const cls = classOf(p);
  const prep = usePrep();

  return (
    <section className="card-game mb-4 overflow-hidden" aria-label={isToday ? "Dagens video" : "Valgt video"} data-testid="player">
      <div className="p-4 pb-2">
        <p className="eyebrow"><Clapperboard className="inline size-4 text-primary" /> {isToday ? "Dagens video" : clip.kind === "short" ? "Short" : "Video"} · {clipLabel(clip)}</p>
        <h2 className="text-lg font-bold">{clip.title}</h2>
        <p className="text-xs text-muted-foreground">GothamChess: «{clip.orig}»{clip.start ? ` · fra ${fmt(clip.start)}` : ""}</p>
        <p className="mt-1 text-sm">{clip.blurb}</p>
      </div>
      <div className="yt" data-testid="yt">
        {err ? <p className="p-4 text-sm text-muted-foreground">{err} <a className="font-semibold text-primary underline-offset-4 hover:underline" href={`https://www.youtube.com/watch?v=${clip.yt}${clip.start ? `&t=${clip.start}` : ""}`} target="_blank" rel="noreferrer">Åpne på YouTube</a></p> : <YouTube videoId={clip.yt} start={clip.start} end={clip.end} onProgress={progress} onError={setErr} />}
      </div>
      <div className="space-y-2 p-4 pt-3">
        <div className="xp-track"><div className="xp-fill" style={{ width: `${pct}%` }} /></div>
        <p className="text-xs text-muted-foreground">
          {seen?.done ? <span className="text-primary">Sett ✓ {paid ? `· +${paid} 🪙 +5 XP` : ""}</span> : <>Sett {fmt(seen?.secs ?? 0)} av {fmt(clip.secs)} · +{watchCoins(clip)} 🪙 og 5 XP når du har sett 80 %</>}
        </p>
        {seen?.done && clip.prove.kind !== "none" && !seen.proven && !proving && (
          <Button className="w-full" data-testid="prove" onClick={() => { setProving(true); setProofResult(null); }}><Trophy /> Bevis det du lærte · +{PROVE_COINS} 🪙 +15 XP</Button>
        )}
        {seen?.proven && <p className="text-sm font-semibold text-gold"><Trophy className="inline size-4" /> Bevist {proofResult?.paid ? `· +${proofResult.paid} 🪙 +15 XP` : ""}</p>}
        {proofResult && !proofResult.ok && <p className="text-sm text-muted-foreground">Ikke helt – se videoen en gang til, eller prøv igjen i morgen. <Button variant="ghost" size="sm" onClick={() => { setProofResult(null); setProving(true); }}>Prøv igjen</Button></p>}
        {proving && !seen?.proven && (
          <div className="border-t border-border pt-3" data-testid="proof">
            {clip.prove.kind === "puzzles" && <PuzzleSet title={`Bevis: ${clip.title}`} items={pickItems(clip.prove.theme, clip.prove.n, day, `kino:${clip.id}`)} onDone={(ok, total) => { setProving(false); prove(ok * 3 >= total * 2); }} />}
            {clip.prove.kind === "opening" && <OpeningDrill openingId={clip.prove.id} branchIdx={prep.openings[clip.prove.id]?.nextBranch ?? 0} botElo={cls.botElo} onDone={(mistakes, o, b) => { updatePrep((s) => ({ ...s, openings: { ...s.openings, [o.id]: recordDrill(s.openings[o.id], o, b.id, day, mistakes === 0) } })); setProving(false); prove(mistakes <= 1); }} />}
            {clip.prove.kind === "game" && <MasterGame gameId={clip.prove.id} onDone={(hits, total) => { setProving(false); prove(hits * 10 >= total * 5); }} />}
          </div>
        )}
        {!isToday && <button type="button" className="block text-xs font-semibold text-primary underline-offset-4 hover:underline" onClick={onBack}>Tilbake til dagens video</button>}
      </div>
    </section>
  );
}
