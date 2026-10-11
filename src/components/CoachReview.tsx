import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, RotateCcw, Flag, Search, Lightbulb, Swords, House, Award, TrendingUp, Puzzle, LockKeyholeOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "./Board";
import { CoachBubble } from "./CoachAvatar";
import type { Mistake } from "@/lib/coach";
import { COACH_NAME } from "@/lib/coach-config";
import { cn } from "@/lib/utils";

const SEVERITY: Record<string, string> = { tabbe: "?? Tabbe", feil: "? Feil", "unøyaktighet": "?! Unøyaktighet" };

export function CoachReview({ mistakes, orientation }: { mistakes: Mistake[]; orientation: "white" | "black" }) {
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState(0); // 0 = before, 1 = your move, 2..n = best line
  const m = mistakes[idx];

  const frames = useMemo(() => {
    if (!m) return [];
    const out: { fen: string; label: string; last: [string, string] | null; arrow?: { startSquare: string; endSquare: string; color: string } }[] = [];
    out.push({ fen: m.fenBefore, label: "Stillingen før trekket", last: null, arrow: { startSquare: m.playedUci.slice(0, 2), endSquare: m.playedUci.slice(2, 4), color: "var(--arrow-bad)" } });
    const played = new Chess(m.fenBefore);
    played.move({ from: m.playedUci.slice(0, 2), to: m.playedUci.slice(2, 4), promotion: m.playedUci[4] || "q" });
    out.push({ fen: played.fen(), label: `Ditt trekk: ${m.facts.playedSan}`, last: [m.playedUci.slice(0, 2), m.playedUci.slice(2, 4)] });
    out.push({ fen: m.fenBefore, label: `Bedre: ${m.facts.bestSan}`, last: null, arrow: { startSquare: m.bestUci.slice(0, 2), endSquare: m.bestUci.slice(2, 4), color: "var(--arrow-good)" } });
    const line = new Chess(m.fenBefore);
    for (const u of m.pvUci.slice(0, 6)) {
      try {
        const mv = line.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || "q" });
        out.push({ fen: line.fen(), label: `Beste linje: ${mv.san}`, last: [mv.from, mv.to] });
      } catch {
        break;
      }
    }
    return out;
  }, [m]);

  if (!mistakes.length) {
    return <CoachBubble>Wow! Jeg fant ingen store feil i dette partiet. Det var skikkelig solid spilt! 💪</CoachBubble>;
  }
  const f = frames[Math.min(step, frames.length - 1)];
  if (!m || !f) return null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {mistakes.map((mm, i) => (
          <Button variant="outline" key={mm.ply} onClick={() => { setIdx(i); setStep(0); }} className={cn("flex-1 min-h-11 ", i === idx && "border-primary bg-primary/10")}>
            Feil {i + 1}
          </Button>
        ))}
      </div>
      <CoachBubble>
        <span className="block text-sm font-semibold text-muted-foreground">{COACH_NAME} · Trekk {m.moveNumber} · {SEVERITY[m.facts.severity]}</span>
        {m.text}
      </CoachBubble>
      <div className="mx-auto w-full max-w-[min(92vw,60vh)]">
        <Board fen={f.fen} orientation={orientation} canMove={false} lastMove={f.last} arrows={f.arrow ? [f.arrow] : []} />
      </div>
      <p className="text-center text-base font-medium">{f.label}</p>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ArrowLeft /> Tilbake</Button>
        <Button className="" disabled={step >= frames.length - 1} onClick={() => setStep((s) => s + 1)}>Neste <ArrowRight /></Button>
      </div>
    </div>
  );
}
