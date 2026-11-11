import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Map as MapIcon, Swords, UserPlus } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/lib/progress";
import { CAST, PERSONAS, SHADOW_ELO, gamesOf, h2h, pendingRequests, rivalbook, type RivalDef, type RivalRec } from "@/lib/rivals";
import { answerRequest, challengeRival, useRivals } from "@/lib/rivals-store";
import { play } from "@/lib/sound";
import { REGIONS } from "@/lib/world";

export const Route = createFileRoute("/rivaler")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rivalboken – Goblin Chess" },
      { name: "description", content: "Spillerne du har møtt i Goblin-verdenen, stillingen mellom dere og nye utfordringer." },
      { property: "og:title", content: "Rivalboken – Goblin Chess" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RivalsPage,
});

const LAST = { win: "du vant sist", draw: "remis sist", loss: "du tapte sist" } as const;

function RivalsPage() {
  const p = useProgress();
  const s = useRivals();
  const navigate = useNavigate();
  const book = rivalbook(s);
  const asked = pendingRequests(s);
  const met = CAST.filter((c) => s.recs[c.id]).sort((a, b) => Number(s.recs[b.id]!.friend === "yes") - Number(s.recs[a.id]!.friend === "yes") || gamesOf(s.recs[b.id]) - gamesOf(s.recs[a.id]));
  const friends = met.filter((c) => s.recs[c.id]!.friend === "yes");
  const others = met.filter((c) => s.recs[c.id]!.friend !== "yes");
  const unmet = CAST.filter((c) => !s.recs[c.id]);
  const challenge = (id: string) => {
    const e = challengeRival(id, p.rating);
    if (e) void navigate({ to: "/parti", search: { opp: `rival:${id}`, elo: undefined, tc: e.tc, color: e.color, tour: undefined, round: undefined, enc: e.id } });
  };
  const Row = ({ c, rec }: { c: RivalDef; rec: RivalRec }) => (
    <div className="quest" data-testid={`rival-${c.id}`}>
      <img src={`/figures/${c.figure}.png`} alt="" className="size-12 rounded-full bg-muted object-cover object-top" draggable={false} />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 font-semibold">{c.alias} <span className="text-xs font-medium text-muted-foreground">{rec.elo}</span>{rec.friend === "yes" && <span className="chip text-primary">Rival</span>}</span>
        <span className="block text-xs text-muted-foreground">{PERSONAS[c.persona].style}</span>
        <span className="block text-xs"><b className="tabular-nums">{h2h(rec)}</b>{rec.last ? ` · ${LAST[rec.last.outcome]}` : ""}</span>
      </span>
      <Button size="sm" onClick={() => challenge(c.id)} data-testid={`challenge-${c.id}`}><Swords /> Utfordre</Button>
    </div>
  );
  return (
    <main className="page-layout page-narrow">
      <AppHeader title="Rivalboken" />
      <p className="mb-4 text-sm text-muted-foreground">👾 Spillerne i Goblin-verdenen. De får øye på deg på kartet, utfordrer deg, og noen vil ha omkamp igjen og igjen. Partiene teller på ratingen.</p>
      <section className="card-game mb-4 grid grid-cols-4 gap-2 p-4 text-center" aria-label="Oversikt">
        {([[`${book.met}/${book.total}`, "møtt"], [String(book.beaten), "slått"], [String(book.friends), "rivaler"], [`${s.shadow.length}/${SHADOW_ELO.length}`, "segl"]] as const).map(([v, l]) => <div key={l}><p className="text-xl font-black tabular-nums">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>)}
      </section>

      {asked.length > 0 && (
        <section className="mb-4 space-y-2" aria-label="Forespørsler">
          <p className="font-bold">Vil legge deg til</p>
          {asked.map((id) => { const c = CAST.find((x) => x.id === id)!; return (
            <div key={id} className="quest !grid-cols-[auto_minmax(0,1fr)] !items-start border-primary" data-testid="request">
              <img src={`/figures/${c.figure}.png`} alt="" className="size-12 rounded-full bg-muted object-cover object-top" draggable={false} />
              <span className="min-w-0">
                <span className="block font-semibold">{c.alias}</span>
                <span className="block text-xs italic text-muted-foreground">«{PERSONAS[c.persona].request[0]}»</span>
                <span className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => answerRequest(id, false)}>Nei takk</Button><Button size="sm" onClick={() => { answerRequest(id, true); play("correct"); }}><UserPlus /> Godta</Button></span>
              </span>
            </div>
          ); })}
        </section>
      )}

      {friends.length > 0 && <section className="mb-4 space-y-2" aria-label="Dine rivaler"><p className="font-bold">Dine rivaler</p>{friends.map((c) => <Row key={c.id} c={c} rec={s.recs[c.id]!} />)}</section>}
      {others.length > 0 && <section className="mb-4 space-y-2" aria-label="Møtt"><p className="font-bold">Spillere du har møtt</p>{others.map((c) => <Row key={c.id} c={c} rec={s.recs[c.id]!} />)}</section>}
      {met.length === 0 && <p className="card-game mb-4 p-4 text-sm text-muted-foreground">Du har ikke møtt noen ennå. Åpne kartet – noen får nok øye på deg.</p>}

      <section className="mb-4" aria-label="Skyggens segl">
        <p className="mb-2 font-bold">Skyggens segl</p>
        <div className="grid grid-cols-7 gap-1.5">
          {REGIONS.map((r) => { const got = s.shadow.includes(r.n); return (
            <div key={r.n} className={`grid place-items-center rounded-xl border p-1.5 text-center ${got ? "border-gold bg-gold/10" : "border-border opacity-50"}`} title={r.name}>
              <img src="/rivals/shadow.svg" alt="" className={`w-9 ${got ? "" : "grayscale"}`} draggable={false} />
              <span className="text-[10px] font-semibold">{r.n}</span>
            </div>
          ); })}
        </div>
      </section>

      {unmet.length > 0 && (
        <section className="mb-4" aria-label="Ikke møtt ennå">
          <p className="mb-2 font-bold">Ikke møtt ennå · {unmet.length}</p>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {unmet.map((c) => <span key={c.id} className="world__face world__face--fluid is-unknown" title="???"><img src={`/figures/${c.figure}.png`} alt="" draggable={false} /></span>)}
          </div>
        </section>
      )}
      <Link to="/kart" className="btn-game btn-secondary w-full"><MapIcon /> Til kartet</Link>
    </main>
  );
}
