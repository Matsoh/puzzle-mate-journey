import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, ChessKnight, CheckCircle2, ChevronDown, Trophy, ChevronRight } from "lucide-react";
import { ROUNDS, phase } from "@/lib/tour";
import { useTour } from "@/lib/tour-store";
import { AppHeader } from "@/components/AppHeader";
import { GameSetup } from "@/components/GameSetup";
import { isUnlocked, OPPONENTS, ratingLabel } from "@/lib/opponents";
import { useProgress } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MaiaBrain } from "@/components/MaiaBrain";

export const Route = createFileRoute("/stigen")({
  validateSearch: (s: Record<string, unknown>): { boss?: string | undefined } => ({ boss: typeof s["boss"] === "string" ? s["boss"] : undefined }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Motstanderstigen – Goblin Chess" },
      { name: "description", content: "Slå 11 motstandere fra 1500 til 2000+ – helt opp til ET og Mike selv." },
      { property: "og:title", content: "Motstanderstigen – Goblin Chess" },
      { property: "og:description", content: "11 bosser fra 1500 til 2000+. Klarer du toppen?" },
    ],
  }),
  component: Ladder,
});

function Ladder() {
  const p = useProgress();
  // From the map: the gym leader's card opens straight away.
  const { boss } = Route.useSearch();
  const [open, setOpen] = useState<string | null>(boss ?? null);
  const beatenCount = OPPONENTS.filter((o) => p.beaten.includes(o.id)).length;
  const tour = useTour().current;

  return (
    <main className="page-layout page-narrow">
      <AppHeader title="Motstanderstigen" />
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {beatenCount}/{OPPONENTS.length} slått. Slå en motstander for å låse opp den neste.
        </p>
        <MaiaBrain />
        <Link to="/turnering" className="quest border-gold/60" data-testid="tour-link">
          <span className="quest__check text-xl">🏆</span>
          <span className="min-w-0">
            <span className="block font-semibold">Turnering{tour ? ` · runde ${tour.rounds.length} av ${ROUNDS}` : ""}</span>
            <span className="block text-xs text-muted-foreground">{tour ? (phase(tour, Date.now()) === "play" ? "Partiet ditt venter – spill det nå" : "Se resultatene og tabellen") : "10 spillere, 5 runder, tabell med Buchholz – pallplass gir premie"}</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        {OPPONENTS.map((o) => {
          const idx = OPPONENTS.indexOf(o);
          const unlocked = isUnlocked(idx, p.beaten);
          const beaten = p.beaten.includes(o.id);
          const isOpen = open === o.id;
          return (
            <div key={o.id} className={cn("card-game overflow-hidden transition", isOpen && "border-primary")}>
              <Button variant="ghost" disabled={!unlocked} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : o.id)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none p-4 text-left disabled:opacity-100 sm:gap-4 sm:p-5">
                <div className="relative size-16 shrink-0">
                  <img src={o.portrait} alt="" className={`opp-card ${unlocked ? "" : "grayscale opacity-40"}`} draggable={false} />
                  <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border border-border bg-card">{beaten ? <CheckCircle2 className="size-4 text-primary" /> : unlocked ? <ChessKnight className="size-3.5" /> : <Lock className="size-3.5" />}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{o.name}</h2>
                    {beaten && <span className="chip text-success">Fullført</span>}
                    {!unlocked && <span className="text-xs text-muted-foreground">Låst</span>}
                    {unlocked && !beaten && <span className="text-xs text-primary">Tilgjengelig</span>}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{ratingLabel(o)} · {o.style}</p>
                  <p className="text-sm text-muted-foreground italic truncate">«{o.line}»</p>
                </div>
                <span className="text-xs text-muted-foreground">#{idx + 1}<ChevronDown className="mt-2 size-4" /></span>
              </Button>
              {isOpen && unlocked && (
                <div className="border-t border-border p-4 animate-pop">
                  <GameSetup opp={o.id} cta={`Utfordre ${o.name.split(" ")[0]}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
