import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { GameSetup } from "@/components/GameSetup";
import { CoachBubble } from "@/components/CoachAvatar";

export const Route = createFileRoute("/fritt")({
  head: () => ({
    meta: [
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
    <main className="mx-auto max-w-xl pb-10 safe-bottom">
      <AppHeader title="Fritt parti" />
      <div className="px-4 space-y-5">
        <CoachBubble>Velg hvor sterk datamaskinen skal være. Litt over ditt nivå er best for å bli bedre!</CoachBubble>
        <div className="card-game p-5 space-y-5">
          <div>
            <div className="flex justify-between font-extrabold">
              <span>Motstanderstyrke</span>
              <span className="font-display text-2xl neon-text">{elo}</span>
            </div>
            <input type="range" min={1350} max={2400} step={50} value={elo} onChange={(e) => setElo(Number(e.target.value))} className="mt-3 w-full h-10 accent-primary" aria-label="Motstanderstyrke" />
          </div>
          <GameSetup elo={elo} />
        </div>
      </div>
    </main>
  );
}
