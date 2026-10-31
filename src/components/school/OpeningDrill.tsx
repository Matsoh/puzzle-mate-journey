import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Chess } from "chess.js";
import { CheckCircle2, Lightbulb, Swords } from "lucide-react";
import { Board } from "@/components/Board";
import { Button } from "@/components/ui/button";
import { getOpening, type Branch, type Opening } from "@/data/openings";
import { drillHint, fenAt, gradeDrillMove, playerMovesAt } from "@/lib/prep";
import { play } from "@/lib/sound";

/**
 * Opening class: Tobias plays his side of the repertoire line, Mike plays the
 * other side instantly and stops him when he drifts. Each wrong move costs a
 * point; when the line is out he can play the position on against a bot.
 */
export function OpeningDrill({ openingId, branchIdx = 0, botElo, onDone }: { openingId: string; branchIdx?: number; botElo: number; onDone: (mistakes: number, o: Opening, b: Branch) => void }) {
  const o = getOpening(openingId);
  const b = o?.branches[branchIdx % Math.max(1, o.branches.length)];
  if (!o || !b) return <p className="text-sm text-muted-foreground">Fant ikke åpningen.</p>;
  return <Drill key={`${o.id}:${b.id}`} o={o} b={b} botElo={botElo} onDone={onDone} />;
}

function Drill({ o, b, botElo, onDone }: { o: Opening; b: Branch; botElo: number; onDone: (mistakes: number, o: Opening, b: Branch) => void }) {
  const orientation = o.side;
  // Mike plays the opening's other side up to the player's first move.
  const start = useMemo(() => { let n = 0; while (n < b.moves.length && !playerMovesAt(o, n)) n++; return n; }, [o, b]);
  const [ply, setPly] = useState(start);
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [hint, setHint] = useState<0 | 1 | 2 | 3>(0);
  const [shake, setShake] = useState(false);
  const [finished, setFinished] = useState(false);
  const fen = fenAt(b, ply);
  const last = ply > 0 ? (() => { const c = new Chess(fenAt(b, ply - 1)); const m = c.move(b.moves[ply - 1]!); return [m.from, m.to] as [string, string]; })() : null;
  const h = hint > 0 ? drillHint(o, b, ply, hint as 1 | 2 | 3) : null;

  const onMove = (from: string, to: string) => {
    if (finished) return false;
    const g = gradeDrillMove(b, ply, from, to);
    if (g.kind === "illegal") return false;
    if (g.kind === "offline") {
      setMistakes((m) => m + 1); setShake(true); setTimeout(() => setShake(false), 400); play("wrong");
      setMsg(`${g.san} er ikke linjen vår. ${hint < 3 ? "Prøv igjen – eller ta et hint." : ""}`);
      if (hint < 3) setHint((x) => (x + 1) as 1 | 2 | 3);
      return false;
    }
    play("move");
    setMsg(null); setHint(0);
    let next = ply + 1;
    // Mike answers at once with the opponent's move.
    while (next < b.moves.length && !playerMovesAt(o, next)) next++;
    setPly(next);
    if (next >= b.moves.length) { setFinished(true); onDone(mistakes, o, b); play("correct"); }
    return true;
  };

  const endFen = fenAt(b, b.moves.length);
  return (
    <div>
      <p className="mb-1 text-sm"><strong>{o.name}</strong> · {b.name} <span className="text-muted-foreground">({b.eco})</span></p>
      <p className="mb-3 text-xs text-muted-foreground">{o.idea}</p>
      <div className="mx-auto w-full max-w-[min(94vw,56vh)]">
        <Board fen={fen} orientation={orientation} onMove={onMove} canMove={!finished} lastMove={last} arrows={h?.arrow ? [{ startSquare: h.arrow[0], endSquare: h.arrow[1], color: "var(--primary)" }] : []} shake={shake} />
      </div>
      <p className="mt-3 text-center text-sm">{finished ? <span className="font-semibold text-primary"><CheckCircle2 className="mr-1 inline size-4" />Hele linjen! {mistakes === 0 ? "Uten en eneste feil." : `${mistakes} feil underveis – gjenta i morgen.`}</span> : <span className="text-muted-foreground">Trekk {Math.floor(ply / 2) + 1} · {b.moves.slice(0, ply).join(" ") || "Du begynner."}</span>}</p>
      {msg && <p role="status" className="mt-1 text-center text-sm font-medium text-destructive">{msg}</p>}
      {h && <p className="mt-1 text-center text-sm"><Lightbulb className="mr-1 inline size-4 text-primary" />{h.text}</p>}
      {!finished && hint === 0 && <div className="mt-2 text-center"><Button variant="outline" size="sm" onClick={() => setHint(1)}><Lightbulb /> Hint</Button></div>}
      {finished && (
        <div className="mt-3 grid gap-2">
          <p className="text-xs text-muted-foreground">{b.reply}</p>
          <Link to="/treningsparti" search={{ fen: endFen, side: o.side === "white" ? "w" : "b", elo: botElo, tc: "none", src: `Mike Skolen · ${o.name}` }} className="btn-game justify-center"><Swords /> Spill ferdig mot bot {botElo}</Link>
        </div>
      )}
    </div>
  );
}
