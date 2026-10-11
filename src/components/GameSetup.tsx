import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type TimeControl = "10+0" | "15+10" | "none";
export type ColorChoice = "w" | "b" | "r";

const TCS: { id: TimeControl; label: string; sub: string }[] = [
  { id: "10+0", label: "10 min", sub: "Rask" },
  { id: "15+10", label: "15+10", sub: "Rolig" },
  { id: "none", label: "∞", sub: "Uten klokke" },
];
const COLORS: { id: ColorChoice; label: string }[] = [
  { id: "w", label: "♔ Hvit" },
  { id: "r", label: "🎲 Tilfeldig" },
  { id: "b", label: "♚ Svart" },
];

export function GameSetup({ opp, elo, cta = "Start parti!" }: { opp?: string; elo?: number; cta?: string }) {
  const [tc, setTc] = useState<TimeControl>("15+10");
  const [color, setColor] = useState<ColorChoice>("w");
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div>
        <p className="font-extrabold mb-2">Tidskontroll</p>
        <div className="grid grid-cols-3 gap-2">
          {TCS.map((t) => (
            <button key={t.id} onClick={() => setTc(t.id)} className={cn("btn-game btn-ghost flex-col gap-0 !text-lg", tc === t.id && "ring-2 ring-primary bg-primary/20")}>
              {t.label}
              <span className="font-sans text-xs font-bold text-muted-foreground">{t.sub}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="font-extrabold mb-2">Din farge</p>
        <div className="grid grid-cols-3 gap-2">
          {COLORS.map((c) => (
            <button key={c.id} onClick={() => setColor(c.id)} className={cn("btn-game btn-ghost !text-base", color === c.id && "ring-2 ring-primary bg-primary/20")}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <button className="btn-game btn-gold w-full !text-2xl" onClick={() => navigate({ to: "/parti", search: { opp, elo, tc, color } })}>
        {cta}
      </button>
    </div>
  );
}
