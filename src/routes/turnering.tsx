import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Lock, Play, Trophy, Flag, Timer, Users } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { MikeCompanion } from "@/components/MikeCompanion";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { MaiaBrain } from "@/components/MaiaBrain";
import type { TimeControl } from "@/components/GameSetup";
import { avatarName } from "@/lib/avatar";
import { flairEmoji } from "@/lib/flair";
import { celebrate } from "@/lib/celebrate";
import { play, unlockAudio } from "@/lib/sound";
import { updateProgress, useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { tierBots } from "@/lib/tour-bots";
import { FIELD, ME, ROUNDS, TIERS, fmtScore, medal, mikeTourLine, myBoard, myIndex, nextRevealAt, phase, placeOf, podiums, prizeFor, standings, tierFor, tierInfo, tierOpen, tourContext, withTourPrize, type Board, type Tier, type Tour, type TourPlayer, type TourSummary } from "@/lib/tour";
import { abandonTour, advanceTour, closeTour, startTour, useTour } from "@/lib/tour-store";

export const Route = createFileRoute("/turnering")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Turnering – Goblin Chess" },
      { name: "description", content: "Turnering mot ti spillere: fem runder, tabell med Buchholz, pallplass og premier." },
      { property: "og:title", content: "Turnering – Goblin Chess" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TourPage,
});

const TCS: { id: TimeControl; label: string; sub: string }[] = [
  { id: "10+0", label: "10 min", sub: "Hurtigsjakk" },
  { id: "15+10", label: "15+10", sub: "Rolig" },
];

/** Clock that ticks only while results are being revealed. */
function useNow(active: boolean, wake: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [active, wake]);
  return now;
}

function TourPage() {
  const state = useTour();
  const t = state.current;
  const p = useProgress();
  const pod = useMemo(() => podiums(state.history), [state.history]);
  return (
    <main className="page-layout page-narrow" onPointerDown={unlockAudio}>
      <AppHeader title="Turnering" />
      {t ? <Live t={t} /> : <Lobby rating={p.rating} name={avatarName(p)} pod={pod} history={state.history} />}
    </main>
  );
}

function Lobby({ rating, name, pod, history }: { rating: number; name: string; pod: Record<Tier, number>; history: TourSummary[] }) {
  const rec = tierFor(rating);
  const [tier, setTier] = useState<Tier>(rec);
  const [tc, setTc] = useState<TimeControl>("10+0");
  const open = tierOpen(tier, rating, pod);
  const bots = tierBots(tier);
  const line = useMemo(() => mikeTourLine(null, Date.now()), []);
  return (
    <div className="space-y-5">
      <MikeCompanion mode="tournament" line={line} context={tourContext(null, Date.now())} />
      <section className="space-y-2" aria-label="Nivå">
        <p className="text-sm text-muted-foreground"><Users className="inline size-4" /> {FIELD} spillere · {ROUNDS} runder sveitsersystem · tabell med Buchholz · partiene teller på ratingen som stigen.</p>
        {TIERS.map((ti, i) => {
          const ok = tierOpen(ti.id, rating, pod);
          const on = tier === ti.id;
          const below = TIERS[i - 1];
          return (
            <button key={ti.id} type="button" aria-pressed={on} onClick={() => setTier(ti.id)} className={cn("quest w-full text-left", on && "border-primary bg-primary/10")} data-testid={`tier-${ti.id}`}>
              <span className="quest__check text-xl">{ok ? ti.emoji : <Lock className="size-5" />}</span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 font-semibold">{ti.name} <span className="text-xs font-medium text-muted-foreground">{ti.lo}–{ti.hi}</span>{ti.id === rec && <span className="chip text-primary">Anbefalt</span>}{pod[ti.id] > 0 && <span className="chip text-gold">{pod[ti.id]}× pall</span>}</span>
                <span className="block text-xs text-muted-foreground">{ok ? ti.blurb : `Låst: pallplass i ${below?.name ?? ""} eller rating ${ti.minRating}.`}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          );
        })}
      </section>
      <section className="card-game space-y-4 p-4" aria-label="Meld på">
        <div>
          <p className="mb-2 text-sm font-medium">Spillere du kan møte i {tierInfo(tier).name}</p>
          <div className="flex flex-wrap gap-1.5">
            {bots.map((b) => <img key={b.id} src={b.portrait} alt={b.name} title={`${b.name} · ${b.elo} · ${b.club}`} width={40} height={40} className="size-10 rounded-full bg-muted object-contain" draggable={false} />)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium"><Timer className="inline size-4" /> Betenkningstid</p>
          <div className="grid grid-cols-2 gap-2">
            {TCS.map((x) => (
              <Button key={x.id} variant="outline" aria-pressed={tc === x.id} onClick={() => setTc(x.id)} className={cn("h-14 flex-col gap-0", tc === x.id && "border-primary bg-primary/10")}>{x.label}<span className="font-sans text-xs font-normal text-muted-foreground">{x.sub}</span></Button>
            ))}
          </div>
        </div>
        <MaiaBrain compact />
        <Button size="lg" className="w-full" disabled={!open} data-testid="start-tour" onClick={() => { play("boss"); startTour(tier, tc, { name, elo: rating }); }}>
          <Trophy /> Meld på {tierInfo(tier).name} · {FIELD - 1} motstandere
        </Button>
        <p className="text-xs text-muted-foreground">Premier: 🥇 +{prizeFor(1).xp} XP og {prizeFor(1).coins} 🪙 · 🥈 +{prizeFor(2).xp} / {prizeFor(2).coins} · 🥉 +{prizeFor(3).xp} / {prizeFor(3).coins} · alle som fullfører +{prizeFor(9).xp} / {prizeFor(9).coins}. Pallplass låser opp neste nivå.</p>
      </section>
      {history.length > 0 && (
        <section className="space-y-2" aria-label="Dine turneringer">
          <p className="font-bold">Dine turneringer</p>
          {[...history].reverse().slice(0, 12).map((h) => (
            <div key={h.id} className="quest">
              <span className="quest__check text-xl">{medal(h.place) || `${h.place}.`}</span>
              <span className="min-w-0"><span className="block font-semibold">{tierInfo(h.tier).name} · {h.place}. plass</span><span className="block text-xs text-muted-foreground">{fmtScore(h.score)} av {ROUNDS} poeng · {h.tc} · {new Date(h.finishedAt).toLocaleDateString("nb-NO")}</span></span>
              <span />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Face({ pl, size = 40 }: { pl: TourPlayer; size?: number }) {
  if (pl.id === ME) return <PlayerAvatar className="shrink-0" style={{ width: size, height: size }} />;
  return <img src={pl.portrait ?? "/bots/1.png"} alt="" width={size} height={size} className="rounded-full bg-muted object-contain" style={{ width: size, height: size }} draggable={false} />;
}

function Live({ t }: { t: Tour }) {
  const navigate = useNavigate();
  const p = useProgress();
  const me = myIndex(t);
  const seat = myBoard(t);
  const round = t.rounds.length;
  const [tick, setTick] = useState(0);
  const now0 = Date.now();
  const ph0 = phase(t, now0);
  const now = useNow(ph0 === "reveal", tick);
  const ph = phase(t, now);
  const wake = nextRevealAt(t, now);
  // Re-arm the ticker when the next reveal passes, so the last board never waits for a render.
  useEffect(() => { if (wake === null) return; const id = window.setTimeout(() => setTick((n) => n + 1), Math.max(0, wake - Date.now()) + 20); return () => window.clearTimeout(id); }, [wake]);
  const table = useMemo(() => standings(t, now), [t, now]);
  const myPlace = placeOf(t, me, now);
  const line = useMemo(() => mikeTourLine(t, now), [t, ph]); // eslint-disable-line react-hooks/exhaustive-deps
  const context = useMemo(() => tourContext(t, now), [t, ph]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirmQuit, setConfirmQuit] = useState(false);

  // A sound whenever another board's result lands.
  const shown = useRef<number>(0);
  const visibleCount = (t.rounds[round - 1]?.boards ?? []).filter((b) => b.result !== null && (b.revealAt === null || b.revealAt <= now)).length;
  useEffect(() => { if (visibleCount > shown.current && shown.current > 0) play("correct"); shown.current = visibleCount; }, [visibleCount]);

  const playMyGame = () => {
    if (!seat) return;
    navigate({ to: "/parti", search: { opp: `tour:${seat.opp.id}`, elo: undefined, tc: t.tc, color: seat.color, tour: t.id, round: round - 1 } });
  };
  const finish = () => {
    const place = placeOf(t, me);
    const prize = prizeFor(place);
    updateProgress((s) => withTourPrize(s, t));
    celebrate({ kind: "tour", place, tier: tierInfo(t.tier).name, xp: prize.xp, coins: prize.coins });
    closeTour();
  };

  const boards = t.rounds[round - 1]?.boards ?? [];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{tierInfo(t.tier).emoji} {tierInfo(t.tier).name} · {t.tc}</p>
        <p className="chip">{ph === "done" ? "Ferdig" : `Runde ${round} av ${ROUNDS}`}</p>
      </div>
      <MikeCompanion mode="tournament" line={line} context={context} compact />

      {ph === "done" ? (
        <Podium t={t} myPlace={placeOf(t, me)} onFinish={finish} />
      ) : (
        <section className="card-game space-y-3 p-4" aria-label={`Runde ${round}`}>
          {ph === "play" && seat && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Face pl={seat.opp} size={64} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">Bord {seat.no} · du har {seat.color === "w" ? "hvit" : "svart"}</p>
                  <p className="truncate text-lg font-bold">{seat.opp.name}</p>
                  <p className="text-xs text-muted-foreground">{seat.opp.elo} · {seat.opp.club}{seat.bot ? ` · ${seat.bot.style}` : ""}</p>
                </div>
              </div>
              {seat.bot && <p className="text-sm italic text-muted-foreground">«{seat.bot.line}»</p>}
              <Button size="lg" className="w-full" data-testid="play-round" onClick={playMyGame}><Play /> Spill partiet ditt</Button>
            </div>
          )}
          {ph === "reveal" && <p className="text-sm font-medium text-primary">Partiet ditt er ferdig – de andre bordene spiller fortsatt …</p>}
          {ph === "between" && <p className="text-sm font-medium text-primary">Alle partiene i runde {round} er ferdige. Du ligger på {myPlace}. plass.</p>}
          <ol className="space-y-1.5" aria-label="Bord">
            {boards.map((b, i) => <BoardRow key={i} t={t} b={b} no={i + 1} now={now} mine={b.w === me || b.b === me} />)}
          </ol>
          {ph === "between" && (
            <Button size="lg" className="w-full" data-testid="next-round" onClick={() => { play("boss"); advanceTour(); }}>
              {round >= ROUNDS ? <><Trophy /> Se sluttresultatet</> : <><ChevronRight /> Til runde {round + 1}</>}
            </Button>
          )}
        </section>
      )}

      <Table t={t} table={table} me={me} final={ph === "done"} />

      {ph !== "done" && (
        <div className="text-center">
          {confirmQuit ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Trekker du deg, blir turneringen borte – ingen premie og ingen tabell.</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { abandonTour(); setConfirmQuit(false); }}><Flag /> Ja, trekk meg</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmQuit(false)}>Nei, jeg spiller videre</Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setConfirmQuit(true)}>Trekk meg fra turneringen</Button>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Spiller: {avatarName(p)} {flairEmoji(p.flair)} · {t.players[me]?.elo} ved start · rating nå {p.rating}</p>
    </div>
  );
}

function BoardRow({ t, b, no, now, mine }: { t: Tour; b: Board; no: number; now: number; mine: boolean }) {
  const w = t.players[b.w]!, bl = t.players[b.b]!;
  const visible = b.result !== null && (b.revealAt === null || b.revealAt <= now);
  const pending = b.result !== null && !visible;
  return (
    <li className={cn("grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border px-2 py-1.5 text-sm", mine && "border-primary bg-primary/10", visible && "animate-pop")} data-testid={`board-${no}`} data-state={visible ? "done" : pending ? "pending" : "open"}>
      <span className="w-5 text-xs text-muted-foreground">{no}</span>
      <span className="flex min-w-0 items-center gap-1.5"><Face pl={w} size={28} /><span className="truncate font-medium">{w.name}</span></span>
      <span className={cn("min-w-14 text-center font-bold tabular-nums", visible ? "" : "text-muted-foreground")}>
        {visible ? b.result : pending ? <span className="tour-dots" aria-label="spiller fortsatt"><i /><i /><i /></span> : "–"}
      </span>
      <span className="flex min-w-0 items-center justify-end gap-1.5"><span className="truncate text-right font-medium">{bl.name}</span><Face pl={bl} size={28} /></span>
      <span className="w-4 text-xs text-muted-foreground">{mine ? "du" : ""}</span>
    </li>
  );
}

function Table({ t, table, me, final }: { t: Tour; table: ReturnType<typeof standings>; me: number; final: boolean }) {
  return (
    <section aria-label="Tabell" className="card-game overflow-x-auto p-2">
      <table className="tour-table w-full text-[11px] sm:text-xs">
        <thead>
          <tr>
            <th>Pl</th><th className="text-left">Navn</th><th>Rtg</th><th className="hidden text-left min-[520px]:table-cell">Klubb</th>
            {Array.from({ length: ROUNDS }, (_, i) => <th key={i}>{i + 1}</th>)}
            <th><span className="min-[520px]:hidden">P</span><span className="hidden min-[520px]:inline">Poeng</span></th><th>Bh</th>
          </tr>
        </thead>
        <tbody>
          {table.map((s) => {
            const pl = t.players[s.idx]!;
            return (
              <tr key={s.idx} className={cn(s.idx === me && "is-me")} data-testid={s.idx === me ? "me-row" : undefined}>
                <td className="text-center font-bold">{(final && medal(s.place)) || s.place}</td>
                <td className="tour-name"><span className="flex items-center gap-1.5"><Face pl={pl} size={22} /><span className="truncate font-medium">{pl.name}</span></span></td>
                <td className="text-center tabular-nums">{pl.elo}</td>
                <td className="tour-club hidden text-muted-foreground min-[520px]:table-cell">{pl.club}</td>
                {Array.from({ length: ROUNDS }, (_, i) => {
                  const c = s.cells[i];
                  return <td key={i} className="text-center">{c ? <span className={cn("tour-cell", c.result === "1" && "is-win", c.result === "0" && "is-loss", c.result === "½" && "is-draw", c.pending && "is-pending")}>{c.opp + 1}{c.color}{c.result ?? (c.pending ? "…" : "")}</span> : ""}</td>;
                })}
                <td className="text-center font-bold tabular-nums">{fmtScore(s.score)}</td>
                <td className="text-center tabular-nums text-muted-foreground">{fmtScore(s.buchholz)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 px-1 text-[10px] text-muted-foreground">Rundekolonnene: motstanderens startnummer, farge (w/b) og resultat. Bh = Buchholz, summen av motstandernes poeng.</p>
    </section>
  );
}

function Podium({ t, myPlace, onFinish }: { t: Tour; myPlace: number; onFinish: () => void }) {
  const top = standings(t).slice(0, 3);
  const prize = prizeFor(myPlace);
  return (
    <section className="card-game space-y-4 p-4 text-center animate-pop" aria-label="Pallen">
      <p className="text-sm font-medium text-muted-foreground">Sluttresultat · {tierInfo(t.tier).name}</p>
      <div className="grid grid-cols-3 items-end gap-2">
        {[top[1], top[0], top[2]].map((s, i) => s && (
          <div key={s.idx} className={cn("space-y-1", i === 1 && "pb-3")}>
            <div className="mx-auto" style={{ width: i === 1 ? 72 : 56 }}><Face pl={t.players[s.idx]!} size={i === 1 ? 72 : 56} /></div>
            <p className="text-2xl">{medal(s.place)}</p>
            <p className="truncate text-xs font-semibold">{t.players[s.idx]!.name}</p>
            <p className="text-xs text-muted-foreground">{fmtScore(s.score)} p</p>
          </div>
        ))}
      </div>
      <p className="text-2xl font-bold">{myPlace <= 3 ? `${medal(myPlace)} ${myPlace}. plass!` : `${myPlace}. plass av ${FIELD}`}</p>
      <p className="text-sm text-muted-foreground">Premie: +{prize.xp} XP og +{prize.coins} 🪙{myPlace <= 3 && t.tier !== "proff" ? " · neste nivå er låst opp" : ""}</p>
      <Button size="lg" className="w-full" data-testid="claim-prize" onClick={onFinish}><Trophy /> Hent premien</Button>
      <Link to="/fremgang" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">Se ratinggrafen</Link>
    </section>
  );
}
