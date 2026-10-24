import { useMemo, useState } from "react";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import { Board } from "./Board";
import { CLASS_LABEL, CLASS_SYMBOL, winPct, type Classification, type GameReview as Review } from "@/lib/coach";
import { Button } from "@/components/ui/button";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const ORDER: Classification[] = ["brilliant", "great", "best", "excellent", "good", "book", "inaccuracy", "mistake", "miss", "blunder"];

export function ClassBadge({ cls, className = "" }: { cls: Classification; className?: string }) {
  return <span className={`cls-badge is-${cls} ${className}`} title={CLASS_LABEL[cls]}>{CLASS_SYMBOL[cls]}</span>;
}

function evalText(cp: number, mate?: number) {
  if (mate !== undefined) return `M${Math.abs(mate)}`;
  if (Math.abs(cp) >= 9000) return cp > 0 ? "1-0" : "0-1";
  const v = cp / 100;
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
}

/** chess.com-style full game review: every move classified, badges on the board, eval bar and accuracy. */
export function GameReview({ review, orientation, startFen = START, names }: { review: Review; orientation: "white" | "black"; startFen?: string; names?: { w: string; b: string } }) {
  const [ply, setPly] = useState(review.moves.length); // position after this many plies
  const mv = ply > 0 ? review.moves[ply - 1] : undefined;
  const fen = mv ? mv.fenAfter : startFen;
  const evalCp = mv ? mv.evalAfter : (review.moves[0]?.evalBefore ?? 0);
  const whitePct = winPct(evalCp);
  const bad = mv && (mv.cls === "inaccuracy" || mv.cls === "mistake" || mv.cls === "miss" || mv.cls === "blunder");
  const arrows = bad && mv.bestUci ? [{ startSquare: mv.bestUci.slice(0, 2), endSquare: mv.bestUci.slice(2, 4), color: "var(--arrow-good)" }] : [];
  const badges = mv ? { [mv.uci.slice(2, 4)]: <ClassBadge cls={mv.cls} /> } : undefined;
  const w = names?.w ?? "Hvit"; const b = names?.b ?? "Svart";

  const rows = useMemo(() => {
    const out: { n: number; w?: Review["moves"][number]; b?: Review["moves"][number] }[] = [];
    for (const m of review.moves) {
      let row = out[out.length - 1];
      if (!row || row.n !== m.moveNumber) { row = { n: m.moveNumber }; out.push(row); }
      row[m.color] = m;
    }
    return out;
  }, [review]);

  const go = (n: number) => setPly(Math.max(0, Math.min(review.moves.length, n)));

  return (
    <section className="review" aria-label="Partianalyse">
      <div className="review__acc">
        <div className={`review__side ${orientation === "white" ? "is-me" : ""}`}><span className="review__name">{w}</span><span className="review__pct">{review.accuracy.w.toFixed(1)}</span></div>
        <span className="eyebrow">Nøyaktighet</span>
        <div className={`review__side ${orientation === "black" ? "is-me" : ""}`}><span className="review__name">{b}</span><span className="review__pct">{review.accuracy.b.toFixed(1)}</span></div>
      </div>

      <div className="review__board">
        <div className="eval-bar" role="img" aria-label={`Vurdering ${evalText(evalCp, mv?.mateAfter)}`} data-flip={orientation === "black" ? "1" : undefined}>
          <div className="eval-bar__white" style={{ height: `${whitePct}%` }} />
        </div>
        <Board fen={fen} orientation={orientation} canMove={false} lastMove={mv ? [mv.uci.slice(0, 2), mv.uci.slice(2, 4)] : null} arrows={arrows} badges={badges} />
      </div>

      <p className="review__now" aria-live="polite">
        {mv ? <><ClassBadge cls={mv.cls} /> <strong>{mv.moveNumber}.{mv.color === "b" ? ".." : ""} {mv.san}</strong> <span className="chip">{evalText(evalCp, mv.mateAfter)}</span> {CLASS_LABEL[mv.cls]}{bad && mv.bestSan ? <span className="text-muted-foreground">. Best var <strong>{mv.bestSan}</strong></span> : null}</> : "Startstillingen. Bla gjennom partiet."}
      </p>

      <div className="review__nav">
        <Button variant="outline" size="icon" aria-label="Start" onClick={() => go(0)} disabled={ply === 0}><ChevronFirst /></Button>
        <Button variant="outline" size="icon" aria-label="Forrige" onClick={() => go(ply - 1)} disabled={ply === 0}><ChevronLeft /></Button>
        <span className="min-w-16 text-center text-sm tabular-nums">{ply}/{review.moves.length}</span>
        <Button variant="outline" size="icon" aria-label="Neste" onClick={() => go(ply + 1)} disabled={ply >= review.moves.length}><ChevronRight /></Button>
        <Button variant="outline" size="icon" aria-label="Slutt" onClick={() => go(review.moves.length)} disabled={ply >= review.moves.length}><ChevronLast /></Button>
      </div>

      <ol className="review__list" aria-label="Trekkliste">
        {rows.map((r) => (
          <li key={r.n} className="review__row">
            <span className="review__num">{r.n}.</span>
            {(["w", "b"] as const).map((c) => { const m = r[c]; return m ? <button key={c} type="button" onClick={() => go(m.ply + 1)} aria-current={mv === m ? "step" : undefined} className={`review__move ${mv === m ? "is-on" : ""}`}><ClassBadge cls={m.cls} className="cls-badge--sm" />{m.san}</button> : <span key={c} />; })}
          </li>
        ))}
      </ol>

      <table className="review__counts">
        <thead><tr><th scope="col" className="sr-only">Type</th><th scope="col">{w}</th><th scope="col">{b}</th></tr></thead>
        <tbody>
          {ORDER.filter((c) => review.counts.w[c] + review.counts.b[c] > 0).map((c) => (
            <tr key={c}><th scope="row"><ClassBadge cls={c} className="cls-badge--sm" /> {CLASS_LABEL[c]}</th><td>{review.counts.w[c]}</td><td>{review.counts.b[c]}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
