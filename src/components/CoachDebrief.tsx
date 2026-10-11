import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Eye, RotateCcw } from "lucide-react";
import { Board } from "./Board";
import { CoachAvatar, CoachLabel } from "./CoachAvatar";
import { Button } from "@/components/ui/button";
import type { Mistake } from "@/lib/coach";
import { useTrainer } from "@/lib/trainer-store";
import { compareDrillMove, profileFocus, type Outcome } from "@/lib/debrief";

const OPENER: Record<Outcome, string> = {
  win: "Fin seier! Selv i gode partier finnes det ett øyeblikk å lære av.",
  draw: "Remis – godt kjempet. La oss se på ett øyeblikk der det var mer å hente.",
  loss: "Tap er der vi lærer mest. Vi ser på ett konkret øyeblikk sammen.",
};

/** «Trenerens gjennomgang»: one learning moment from real Stockfish data, try-first drill. */
export function CoachDebrief({ mistakes, outcome, orientation }: { mistakes: Mistake[]; outcome: Outcome; orientation: "white" | "black" }) {
  const coach = useTrainer().coach;
  const m = useMemo(() => [...mistakes].sort((a, b) => b.facts.lossPct - a.facts.lossPct)[0], [mistakes]);
  const [tried, setTried] = useState<{ uci: string; fen: string; verdict: ReturnType<typeof compareDrillMove> } | null>(null);
  const [shown, setShown] = useState(false);
  if (!m) {
    return <section className="card-game space-y-3 p-5" aria-label="Trenerens gjennomgang">
      <Header />
      <p className="text-sm">{OPENER[outcome]} Motoranalysen fant ingen store feil i dette partiet, så vi har ikke noe konkret læringsøyeblikk å vise.</p>
    </section>;
  }
  const side = m.fenBefore.split(" ")[1] === "w" ? "Hvit" : "Svart";
  const focus = profileFocus(coach, m);
  const fen = shown ? m.fenBefore : tried?.fen ?? m.fenBefore;
  const onMove = (from: string, to: string) => {
    if (tried || shown) return false;
    const c = new Chess(m.fenBefore);
    try {
      const mv = c.move({ from, to, promotion: "q" });
      setTried({ uci: mv.from + mv.to + (mv.promotion ?? ""), fen: c.fen(), verdict: compareDrillMove(m, mv.from + mv.to + (mv.promotion ?? "")) });
      return true;
    } catch { return false; }
  };
  return (
    <section className="card-game space-y-4 p-5" aria-label="Trenerens gjennomgang">
      <Header />
      <p className="text-sm">{OPENER[outcome]}</p>
      <p className="text-sm"><span className="font-medium">Trekk {m.moveNumber}, {side.toLowerCase()} i trekket.</span> {focus}</p>
      <p className="text-sm font-semibold">Hva ville du spilt?</p>
      <div className="mx-auto w-full max-w-[min(92vw,52vh)]" data-testid="debrief-board">
        <Board fen={fen} orientation={orientation} canMove={!tried && !shown} onMove={onMove}
          arrows={shown ? [{ startSquare: m.bestUci.slice(0, 2), endSquare: m.bestUci.slice(2, 4), color: "var(--arrow-good)" }] : []} />
      </div>
      <div role="status" aria-live="polite" className="text-sm" data-testid="debrief-status">
        {tried && !shown && (tried.verdict === "best" ? <p className="font-medium text-primary">Motorens forslag er {m.facts.bestSan} – det fant du!</p>
          : tried.verdict === "played" ? <p>Det var trekket fra partiet ({m.facts.playedSan}). Motoren mente det kostet omtrent {Math.round(m.facts.lossPct)} prosentpoeng vinnersjanse.</p>
          : <p>Et annet lovlig trekk. Motoren har ikke vurdert akkurat dette – sammenlign med motorens forslag.</p>)}
        {shown && <p>Motorens forslag er <b>{m.facts.bestSan}</b>{m.facts.pvSan.length > 1 && <> med linjen {m.facts.pvSan.slice(0, 4).join(" ")}</>}. I partiet ble det spilt {m.facts.playedSan}.</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="min-h-11" onClick={() => { setTried(null); setShown(false); }}><RotateCcw />Prøv igjen</Button>
        <Button className="min-h-11" disabled={shown} onClick={() => setShown(true)}><Eye />Vis motorens forslag</Button>
      </div>
    </section>
  );
}

function Header() {
  return <div className="flex items-center gap-3"><CoachAvatar className="size-14" /><div><h2 className="section-title">Trenerens gjennomgang</h2><CoachLabel /></div></div>;
}
