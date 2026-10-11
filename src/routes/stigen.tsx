import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { GameSetup } from "@/components/GameSetup";
import { isUnlocked, OPPONENTS } from "@/lib/opponents";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stigen")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Opponentstigen – Goblin Chess" },
      { name: "description", content: "Slå 10 motstandere fra 1500 til 2000+ og bli Stormkongen." },
      { property: "og:title", content: "Opponentstigen – Goblin Chess" },
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
    <main className="mx-auto max-w-2xl pb-10 safe-bottom">
      <AppHeader title="Opponentstigen" />
      <div className="px-4 space-y-3">
        <p className="font-bold text-muted-foreground">
          {beatenCount}/10 slått. Slå en motstander for å låse opp den neste! 🔓
        </p>
        {[...OPPONENTS].reverse().map((o) => {
          const idx = OPPONENTS.indexOf(o);
          const unlocked = isUnlocked(idx, p.beaten);
          const beaten = p.beaten.includes(o.id);
          const isOpen = open === o.id;
          return (
            <div key={o.id} className={cn("card-game overflow-hidden transition", !unlocked && "opacity-55", isOpen && "ring-2 ring-primary")}>
              <button disabled={!unlocked} onClick={() => setOpen(isOpen ? null : o.id)} className="flex w-full items-center gap-4 p-4 text-left">
                <div className="opp-avatar grid size-16 shrink-0 place-items-center rounded-2xl text-3xl" style={{ "--opp-hue": o.hue } as React.CSSProperties}>
                  {unlocked ? o.emoji : <Lock className="size-7" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-xl">{o.name}</h2>
                    {beaten && <span className="chip !py-0.5 text-success">✓ Slått</span>}
                  </div>
                  <p className="text-sm font-extrabold text-primary">{o.elo} · {o.style}</p>
                  <p className="text-sm text-muted-foreground italic truncate">«{o.line}»</p>
                </div>
                <span className="font-display text-2xl text-muted-foreground">#{idx + 1}</span>
              </button>
              {isOpen && unlocked && (
                <div className="border-t border-border p-4 animate-pop">
                  <GameSetup opp={o.id} cta={`⚔️ Utfordre ${o.name.split(" ")[0]}!`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
