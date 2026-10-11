import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, ChessKnight, CheckCircle2, ChevronDown } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { GameSetup } from "@/components/GameSetup";
import { isUnlocked, OPPONENTS } from "@/lib/opponents";
import { useProgress } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stigen")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Motstanderstigen – Goblin Chess" },
      { name: "description", content: "Slå 10 motstandere fra 1500 til 2000+ og bli Stormkongen." },
      { property: "og:title", content: "Motstanderstigen – Goblin Chess" },
      { property: "og:description", content: "10 bosser fra 1500 til 2000+. Klarer du toppen?" },
    ],
  }),
  component: Ladder,
});

function Ladder() {
  const p = useProgress();
  const [open, setOpen] = useState<string | null>(null);
  const beatenCount = OPPONENTS.filter((o) => p.beaten.includes(o.id)).length;

  return (
    <main className="page-layout page-narrow">
      <AppHeader title="Motstanderstigen" />
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {beatenCount}/10 slått. Slå en motstander for å låse opp den neste.
        </p>
        {OPPONENTS.map((o) => {
          const idx = OPPONENTS.indexOf(o);
          const unlocked = isUnlocked(idx, p.beaten);
          const beaten = p.beaten.includes(o.id);
          const isOpen = open === o.id;
          return (
            <div key={o.id} className={cn("card-game overflow-hidden transition", isOpen && "border-primary")}>
              <Button variant="ghost" disabled={!unlocked} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : o.id)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none p-4 text-left disabled:opacity-100 sm:gap-4 sm:p-5">
                <div className="opp-avatar grid size-12 shrink-0 place-items-center rounded-xl" >
                  {beaten ? <CheckCircle2 className="size-5 text-primary" /> : unlocked ? <ChessKnight className="size-5" /> : <Lock className="size-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{o.name}</h2>
                    {beaten && <span className="chip text-success">Fullført</span>}
                    {!unlocked && <span className="text-xs text-muted-foreground">Låst</span>}
                    {unlocked && !beaten && <span className="text-xs text-primary">Tilgjengelig</span>}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{o.elo} · {o.style}</p>
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
