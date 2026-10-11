import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChessKing, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimeControl = "10+0" | "15+10" | "none";
export type ColorChoice = "w" | "b" | "r";

const TCS: { id: TimeControl; label: string; sub: string }[] = [
  { id: "10+0", label: "10 min", sub: "Rask" },
  { id: "15+10", label: "15+10", sub: "Rolig" },
  { id: "none", label: "∞", sub: "Uten klokke" },
];
const COLORS: { id: ColorChoice; label: string }[] = [
  { id: "w", label: "Hvit" },
  { id: "r", label: "Tilfeldig" },
  { id: "b", label: "Svart" },
];

export function GameSetup({ opp, elo, cta = "Start parti" }: { opp?: string; elo?: number; cta?: string }) {
  const [tc, setTc] = useState<TimeControl>("15+10");
  const [color, setColor] = useState<ColorChoice>("w");
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-2">Tidskontroll</p>
        <div className="grid grid-cols-3 gap-2">
          {TCS.map((t) => (
            <Button variant="outline" aria-pressed={tc === t.id} key={t.id} onClick={() => setTc(t.id)} className={cn("h-16 flex-col gap-0", tc === t.id && "border-primary bg-primary/10")}>
              {t.label}
              <span className="font-sans text-xs font-normal text-muted-foreground">{t.sub}</span>
            </Button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Din farge</p>
        <div className="grid grid-cols-3 gap-2">
          {COLORS.map((c) => (
            <Button variant="outline" aria-pressed={color === c.id} key={c.id} onClick={() => setColor(c.id)} className={cn("h-12 px-2 text-xs sm:text-sm", color === c.id && "border-primary bg-primary/10")}>
              {c.id === "r" ? <Shuffle /> : <ChessKing />} {c.label}
            </Button>
          ))}
        </div>
      </div>
      <Button size="lg" className="w-full" onClick={() => navigate({ to: "/parti", search: { opp, elo, tc, color } })}>
        {cta} <ArrowRight />
      </Button>
    </div>
  );
}
