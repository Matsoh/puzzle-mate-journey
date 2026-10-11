import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { GameSetup } from "@/components/GameSetup";
import { CoachBubble } from "@/components/CoachAvatar";

export const Route = createFileRoute("/fritt")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Fritt parti – Goblin Chess" },
      { name: "description", content: "Spill et fritt parti mot Stockfish på valgfri styrke." },
      { property: "og:title", content: "Fritt parti – Goblin Chess" },
      { property: "og:description", content: "Velg styrke, farge og tid – og spill!" },
    ],
  }),
  component: Free,
});

function Free() {
  const [elo, setElo] = useState(1600);
  return (
    <main className="page-layout page-narrow">
      <AppHeader title="Fritt parti" />
      <div className="space-y-6">
        <CoachBubble>Velg hvor sterk datamaskinen skal være. Litt over ditt nivå er best for å bli bedre!</CoachBubble>
        <div className="border-t border-border pt-6 space-y-6">
          <div>
            <div className="flex justify-between text-sm font-medium">
              <span>Motstanderstyrke</span>
              <span className="text-xl font-semibold text-primary">{elo}</span>
            </div>
            <input type="range" min={1350} max={2400} step={50} value={elo} onChange={(e) => setElo(Number(e.target.value))} className="mt-3 w-full h-10 accent-primary" aria-label="Motstanderstyrke" />
          </div>
          <GameSetup elo={elo} />
        </div>
      </div>
    </main>
  );
}
