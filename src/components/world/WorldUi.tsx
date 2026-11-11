import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, BookOpen, Map as MapIcon, Swords, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BotAvatar } from "@/components/BotAvatar";
import { RegionScene } from "./RegionScene";
import { examOpen, periodsDone, timetable, daysUntil } from "@/lib/curriculum";
import { schoolDone } from "@/lib/school";
import { dailyClip, seenOf } from "@/lib/cinema";
import { usePrep } from "@/lib/prep-store";
import { useProgress } from "@/lib/progress";
import { PERSONAS, SHADOW_LINES, gamesOf, h2h, pendingRequests, rivalDef, rivalOpponent, rivalbook, shadowOpponent, shadowOpponentId, unread, type Encounter, type Note } from "@/lib/rivals";
import { answerRequest, declineEncounter, markNotesRead, rivalsTick, useRivals } from "@/lib/rivals-store";
import { ratingLabel } from "@/lib/opponents";
import { play } from "@/lib/sound";
import { podiums, tierOpen } from "@/lib/tour";
import { useTour } from "@/lib/tour-store";
import { useTournaments } from "@/lib/tournament-store";
import { REGIONS, heroWindow, hereNode, nodeTarget, regionOf, worldView, type MapNode, type RegionView, type WorldCtx } from "@/lib/world";

/** Everything the map needs to know about today, from the same sources as the school and the cinema. */
export function useWorld(day: string): { view: RegionView[]; here: MapNode | undefined; ctx: WorldCtx } | null {
  const p = useProgress();
  const rivals = useRivals();
  const tour = useTour();
  const t = useTournaments();
  const prep = usePrep();
  return useMemo(() => {
    if (!day) return null;
    const current = t.list.find((x) => x.id === t.current && !x.archived) ?? null;
    const periods = timetable(p, day, daysUntil(day, current?.setup.date), prep.plan?.openings ?? []);
    const clip = dailyClip(p, day, periods);
    const pod = podiums(tour.history);
    const ctx: WorldCtx = {
      cls: p.schoolClass ?? 1,
      rating: p.rating,
      beaten: p.beaten,
      periods: periodsDone(p, day),
      schoolDone: schoolDone(p, day),
      examOpen: examOpen(p, day),
      puzzlesDone: p.daily && p.daily.day === day ? Math.min(5, Object.keys(p.daily.results).length) : 0,
      puzzlesTotal: 5,
      kinoTitle: clip.title,
      kinoSeen: !!seenOf(p, clip.id)?.done,
      shadow: rivals.shadow,
      tourOpen: { begynner: true, amator: tierOpen("amator", p.rating, pod), proff: tierOpen("proff", p.rating, pod) },
    };
    const view = worldView(ctx);
    return { view, here: hereNode(view), ctx };
  }, [p, rivals.shadow, tour.history, t, prep.plan, day]);
}

/**
 * The map's behaviour, shared by the home screen and the full map: where a
 * place leads, the sheets for a challenger and for Skyggen, and the world's
 * heartbeat that lets new faces appear while the map is open.
 */
export function useWorldUi(): { onNode: (n: MapNode) => void; onEncounter: (e: Encounter) => void; openInbox: () => void; ui: ReactNode } {
  const navigate = useNavigate();
  const p = useProgress();
  const rivals = useRivals();
  const [enc, setEnc] = useState<string | null>(null);
  const [shadow, setShadow] = useState<number | null>(null);
  const [inbox, setInbox] = useState(false);
  const [toast, setToast] = useState<Note | null>(null);
  const rating = useRef(p.rating);
  rating.current = p.rating;

  // The world's heartbeat: a moment after the map opens, then now and again.
  useEffect(() => {
    const first = window.setTimeout(() => rivalsTick(rating.current), 3500);
    const beat = window.setInterval(() => rivalsTick(rating.current), 45_000);
    return () => { window.clearTimeout(first); window.clearInterval(beat); };
  }, []);
  // Something new happened while he was looking: say so.
  const seen = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  useEffect(() => {
    const n = rivals.notes.length;
    const latest = rivals.notes[n - 1];
    if (seen.current !== null && n > seen.current && latest && !latest.read) {
      setToast(latest);
      play("check");
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 6000);
    }
    seen.current = n;
  }, [rivals.notes]);
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  const onNode = (node: MapNode) => {
    if (node.kind === "shadow") { setShadow(node.region); return; }
    const target = nodeTarget(node);
    if (!target) return;
    if (target.to === "/stigen") void navigate({ to: "/stigen", search: { boss: target.boss } });
    else if (target.to === "/kino") void navigate({ to: "/kino", search: { klipp: undefined } });
    else void navigate({ to: target.to });
  };
  const onEncounter = (e: Encounter) => setEnc(e.id);
  const active = rivals.encounters.find((e) => e.id === enc);
  const start = (e: Encounter) => { setEnc(null); void navigate({ to: "/parti", search: { opp: `rival:${e.rival}`, elo: undefined, tc: e.tc, color: e.color, tour: undefined, round: undefined, enc: e.id } }); };

  const ui = (
    <>
      {toast && (
        <button type="button" className="world__toast" onClick={() => { setToast(null); if (toast.enc && rivals.encounters.some((e) => e.id === toast.enc)) setEnc(toast.enc); else setInbox(true); }} data-testid="world-toast">
          <span className="world__bang" aria-hidden>!</span><span className="min-w-0 truncate">{toast.text}</span>
        </button>
      )}
      {active && <EncounterSheet e={active} onClose={() => setEnc(null)} onPlay={() => start(active)} onDecline={() => { declineEncounter(active.id); setEnc(null); }} />}
      {shadow !== null && <ShadowSheet region={shadow} beaten={rivals.shadow.includes(shadow)} onClose={() => setShadow(null)} onPlay={() => { const n = shadow; setShadow(null); void navigate({ to: "/parti", search: { opp: shadowOpponentId(n), elo: undefined, tc: "15+10", color: "r", tour: undefined, round: undefined, enc: undefined } }); }} />}
      {inbox && <InboxSheet onClose={() => setInbox(false)} onOpen={(id) => { setInbox(false); setEnc(id); }} />}
    </>
  );
  return { onNode, onEncounter, openInbox: () => { setInbox(true); markNotesRead(); }, ui };
}

function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="celebrate" onClick={onClose}>
      <div className="celebrate__card animate-pop" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="world__close" onClick={onClose} aria-label="Lukk"><X className="size-4" /></button>
        {children}
      </div>
    </div>
  );
}

function EncounterSheet({ e, onClose, onPlay, onDecline }: { e: Encounter; onClose: () => void; onPlay: () => void; onDecline: () => void }) {
  const p = useProgress();
  const rivals = useRivals();
  const def = rivalDef(e.rival);
  if (!def) return null;
  const rec = rivals.recs[e.rival];
  const opp = rivalOpponent(e.rival, rec, p.rating, e.day);
  const known = gamesOf(rec) > 0;
  return (
    <Sheet label="Utfordring" onClose={onClose}>
      <div className="mx-auto grid place-items-center" style={{ height: 150 }}>{opp && <BotAvatar opponent={opp} mood="smug" size={130} quips={false} />}</div>
      <p className="celebrate__eyebrow">{known ? (e.kind === "rematch" ? "Omkamp" : "Dere møtes igjen") : "En mystisk spiller har fått øye på deg!"}</p>
      <h2 className="celebrate__title">{known ? def.alias : "???"}</h2>
      <p className="celebrate__sub">{opp ? ratingLabel(opp) : "??"} · {known ? PERSONAS[def.persona].style : "Ukjent stil"}{known ? ` · dere står ${h2h(rec)}` : ""}</p>
      <p className="mt-3 text-lg italic">«{e.text}»</p>
      <p className="mt-3 text-xs text-muted-foreground">👾 Spiller fra Goblin-verdenen · {e.tc === "15+10" ? "15 min + 10 s" : "10 min"} · du har {e.color === "w" ? "hvit" : "svart"} · teller på ratingen</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" onClick={onDecline}>Ikke nå</Button>
        <Button size="lg" className="font-bold" onClick={onPlay} data-testid="accept-rival"><Swords /> Ta utfordringen</Button>
      </div>
    </Sheet>
  );
}

function ShadowSheet({ region, beaten, onClose, onPlay }: { region: number; beaten: boolean; onClose: () => void; onPlay: () => void }) {
  const opp = shadowOpponent(shadowOpponentId(region));
  const lines = SHADOW_LINES[region - 1];
  if (!opp || !lines) return null;
  return (
    <Sheet label="Skyggen" onClose={onClose}>
      <div className="mx-auto grid place-items-center" style={{ height: 150 }}><BotAvatar opponent={opp} mood={beaten ? "lose" : "smug"} size={130} quips={false} /></div>
      <p className="celebrate__eyebrow">Skyggen · {regionOf(region).name}</p>
      <h2 className="celebrate__title">{beaten ? "Skyggen er beseiret her" : "Skyggen venter"}</h2>
      <p className="mt-3 text-lg italic">«{beaten ? lines.fall : lines.taunt}»</p>
      <p className="mt-3 text-xs text-muted-foreground">{beaten ? `Skyggens segl ${region}/7 er ditt. Du kan møte den igjen når du vil.` : "Ingen vet hvor sterk den er. 15 min + 10 s · teller på ratingen · første seier her gir +40 XP og +20 🪙."}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" onClick={onClose}>Ikke ennå</Button>
        <Button size="lg" className="font-bold" onClick={onPlay} data-testid="meet-shadow"><Swords /> {beaten ? "Møt den igjen" : "Møt Skyggen"}</Button>
      </div>
    </Sheet>
  );
}

function InboxSheet({ onClose, onOpen }: { onClose: () => void; onOpen: (encId: string) => void }) {
  const rivals = useRivals();
  const notes = [...rivals.notes].reverse();
  const book = rivalbook(rivals);
  return (
    <Sheet label="Varsler" onClose={onClose}>
      <p className="celebrate__eyebrow">Varsler</p>
      <h2 className="celebrate__title">Hva skjer i verden</h2>
      <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto text-left">
        {notes.length === 0 && <p className="text-center text-sm text-muted-foreground">Ingenting ennå. Noen får nok øye på deg snart …</p>}
        {notes.map((n) => {
          const def = rivalDef(n.rival);
          const rec = rivals.recs[n.rival];
          const open = n.enc ? rivals.encounters.find((e) => e.id === n.enc) : undefined;
          const hidden = n.kind === "spotted" && !rec;
          return (
            <div key={n.id} className="quest !min-h-0 !grid-cols-[auto_minmax(0,1fr)] !items-start !py-2.5" data-testid="note">
              <span className={`world__face world__face--sm ${hidden ? "is-unknown" : ""}`}><img src={`/figures/${def?.figure ?? 1}.png`} alt="" draggable={false} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-snug">{n.text}</span>
                <span className="block text-xs text-muted-foreground">{new Date(n.t).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}</span>
                {n.kind === "request" && rec?.friend === "asked" && (
                  <span className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => answerRequest(n.rival, false)}>Nei takk</Button><Button size="sm" onClick={() => { answerRequest(n.rival, true); play("correct"); }} data-testid="accept-request"><UserPlus /> Godta</Button></span>
                )}
                {n.kind !== "request" && open && <Button size="sm" className="mt-2" onClick={() => onOpen(open.id)}><Swords /> Se utfordringen</Button>}
              </span>
            </div>
          );
        })}
      </div>
      <Link to="/rivaler" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline" onClick={onClose}><BookOpen className="size-4" /> Rivalboken · {book.met}/{book.total} møtt</Link>
    </Sheet>
  );
}

/** The bell in the home header: unread events and waiting requests. */
export function RivalBell({ onOpen }: { onOpen: () => void }) {
  const rivals = useRivals();
  const n = Math.max(unread(rivals), pendingRequests(rivals).length);
  return (
    <button type="button" onClick={onOpen} className="world__bell" aria-label={n ? `${n} nye varsler` : "Varsler"} data-testid="rival-bell">
      <Bell className="size-5" />{n > 0 && <span className="world__bell-dot">{n}</span>}
    </button>
  );
}

/** The home screen's window on the world: the region he is in, alive. The controller comes from the page so the header bell opens the same inbox. */
export function WorldHero({ day, controller }: { day: string; controller: ReturnType<typeof useWorldUi> }) {
  const world = useWorld(day);
  const rivals = useRivals();
  const { onNode, onEncounter, ui } = controller;
  if (!world) return <section className="world__hero world__hero--empty" aria-hidden />;
  const cur = world.view.find((v) => v.state === "current") ?? world.view[0]!;
  const win = heroWindow(cur.nodes, world.here?.id);
  const ahead = cur.nodes.slice(win.to).map((x) => x.title);
  return (
    <section className="world__hero" aria-label="Veien til 2000">
      <div className="world__hero-top">
        <div className="min-w-0"><p className="eyebrow">Veien til 2000 · region {cur.region.n} av {REGIONS.length}</p><p className="truncate text-lg font-bold">{cur.region.name}</p></div>
        <Link to="/kart" className="chip shrink-0 border-primary/50 py-1.5 text-primary" data-testid="open-map"><MapIcon className="size-4" /> Hele kartet</Link>
      </div>
      <div className="world__frame">
        <RegionScene view={cur} window={win} hereId={world.here?.id} encounters={rivals.encounters} rivals={rivals} onNode={onNode} onEncounter={onEncounter} />
        {ui}
      </div>
      {ahead.length > 0 && <p className="mt-2 text-center text-xs text-muted-foreground">Lenger opp i {cur.region.name}: {ahead.join(" · ")}</p>}
      <div className="world__pips" aria-hidden>{world.view.map((v) => <i key={v.region.n} className={`is-${v.state}`} />)}</div>
    </section>
  );
}
