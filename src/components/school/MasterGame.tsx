import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { CheckCircle2, Eye, Lightbulb, Trophy } from "lucide-react";
import { Board } from "@/components/Board";
import { Button } from "@/components/ui/button";
import { getMasterGame } from "@/data/master-games";
import { play } from "@/lib/sound";

/**
 * "Gjett mesterens trekk": the opening is played for you, then you guess every
 * move the hero made. A hit gives a point, the opponent's reply plays itself,
 * and Mike comments at the key moments. Pure chess.js, no engine.
 */
export function MasterGame({ gameId, onDone, onMike }: { gameId: string; onDone: (hits: number, total: number) => void; onMike?: (text: string) => void }) {
  const g = getMasterGame(gameId);
  if (!g) return <p className="text-sm text-muted-foreground">Fant ikke partiet.</p>;
  return <Guess key={g.id} g={g} onDone={onDone} onMike={onMike} />;
}

function Guess({ g, onDone, onMike }: { g: NonNullable<ReturnType<typeof getMasterGame>>; onDone: (hits: number, total: number) => void; onMike?: ((text: string) => void) | undefined }) {
  const total = useMemo(() => { let n = 0; for (let i = g.from; i < g.moves.length; i++) if ((i % 2 === 0) === (g.hero === "w")) n++; return n; }, [g]);
  const [ply, setPly] = useState(g.from);
  const [hits, setHits] = useState(0);
  const [tries, setTries] = useState(0);
  const [shown, setShown] = useState(false);
  const [note, setNote] = useState<string | null>(g.notes[g.from - 1] ?? null);
  const [status, setStatus] = useState<"guess" | "hit" | "miss" | "done">("guess");
  const [shake, setShake] = useState(false);
  const chess = useMemo(() => { const c = new Chess(); for (const m of g.moves.slice(0, ply)) c.move(m); return c; }, [g, ply]);
  const fen = chess.fen();
  const last = useMemo(() => { if (ply === 0) return null; const c = new Chess(); for (const m of g.moves.slice(0, ply - 1)) c.move(m); const m = c.move(g.moves[ply - 1]!); return [m.from, m.to] as [string, string]; }, [g, ply]);
  const expected = useMemo(() => { if (ply >= g.moves.length) return null; const c = new Chess(fen); return c.move(g.moves[ply]!); }, [fen, g, ply]);
  const heroToMove = (ply % 2 === 0) === (g.hero === "w");

  const say = (t: string | undefined) => { if (t) { setNote(t); onMike?.(t); } };
  const advance = (from: number) => {
    // Play the hero's move and the opponent's reply; stop at the next hero move or the end.
    let n = from + 1;
    say(g.notes[from]);
    if (n < g.moves.length && (n % 2 === 0) !== (g.hero === "w")) { if (g.notes[n]) say(g.notes[n]); n++; }
    setPly(n);
    setShown(false);
    if (n >= g.moves.length) { setStatus("done"); }
    else setStatus("guess");
  };
  const onMove = (from: string, to: string) => {
    if (!expected || status !== "guess" || !heroToMove) return false;
    const c = new Chess(fen);
    let m; try { m = c.move({ from, to, promotion: "q" }); } catch { return false; }
    setTries((t) => t + 1);
    if (m.from === expected.from && m.to === expected.to) {
      setHits((h) => h + 1); play("correct"); setStatus("hit");
      setTimeout(() => advance(ply), 450);
      return true;
    }
    play("wrong"); setShake(true); setTimeout(() => setShake(false), 400); setStatus("miss");
    setTimeout(() => setStatus("guess"), 700);
    return false;
  };
  const reveal = () => { setShown(true); play("move"); setTimeout(() => advance(ply), 900); };
  const finished = status === "done";
  const [reported, setReported] = useState(false);
  useEffect(() => { if (finished && !reported) { setReported(true); onDone(hits, total); } }, [finished, reported, hits, total, onDone]);

  return (
    <div>
      <p className="mb-1 text-sm"><strong>{g.title}</strong> · {g.white} – {g.black}, {g.year}</p>
      <p className="mb-3 text-xs text-muted-foreground">Du spiller {g.hero === "w" ? "hvit" : "svart"}. Gjett trekket mesteren spilte – {hits}/{total} treff{tries > hits ? ` · ${tries - hits} bom` : ""}.</p>
      <div className="mx-auto w-full max-w-[min(94vw,56vh)]">
        <Board fen={fen} orientation={g.hero === "w" ? "white" : "black"} onMove={onMove} canMove={status === "guess" && !finished} lastMove={last} arrows={shown && expected ? [{ startSquare: expected.from, endSquare: expected.to, color: "var(--primary)" }] : []} shake={shake} />
      </div>
      <p className="mt-3 text-center text-sm font-medium" aria-live="polite">
        {finished ? <span className="text-primary"><Trophy className="mr-1 inline size-4" />Ferdig! {hits} av {total} mestertrekk – {hits === total ? "perfekt!" : hits >= total * 0.7 ? "sterkt." : "les kommentarene og prøv igjen en annen dag."}</span>
          : status === "hit" ? <span className="text-primary"><CheckCircle2 className="mr-1 inline size-4" />Riktig – akkurat det {g.white.split(" ").pop()} spilte!</span>
          : status === "miss" ? <span className="text-destructive">Ikke det. Tenk sjakker, slag og trusler.</span>
          : <span className="text-muted-foreground">Trekk {Math.floor(ply / 2) + 1}: hva spilte mesteren?</span>}
      </p>
      {note && <p className="mike-bubble mx-auto mt-2 max-w-md text-sm"><span className="mike-bubble__name">Mike</span>{note}</p>}
      {!finished && status === "guess" && !shown && <div className="mt-2 flex justify-center gap-2"><Button variant="outline" size="sm" onClick={reveal}><Eye /> Vis trekket</Button><Button variant="ghost" size="sm" onClick={() => say(expected ? `Look at ${expected.piece === "q" ? "the queen" : expected.piece === "r" ? "the rook" : expected.piece === "b" ? "the bishop" : expected.piece === "n" ? "the knight" : expected.piece === "k" ? "the king" : "a pawn"}. Where does it hurt most?` : undefined)}><Lightbulb /> Hint</Button></div>}
      {finished && <p className="mt-3 rounded-xl border border-border bg-card/60 p-3 text-sm"><strong>Lærdommen:</strong> {g.lesson}</p>}
    </div>
  );
}
