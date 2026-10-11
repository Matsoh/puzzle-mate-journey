import { useRef, useState } from "react";
import { Lightbulb, RotateCcw, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Board } from "./Board";
import { Button } from "@/components/ui/button";
import { explain, fenAfter, gradeStep, hintsFor, playerColor, type Outcome, type TrainingItem } from "@/lib/adaptive";
import { play } from "@/lib/sound";

type Props = {
  item: TrainingItem;
  /** Called once per presentation when the task ends (solved or solution shown). */
  onResult?: (o: Outcome, hints: number) => void;
};

/** Multi-move puzzle: opponent's first move is already played, opponent replies automatically. Remount with key per task. */
export function AdaptivePuzzle({ item, onResult }: Props) {
  const [ply, setPly] = useState(1);
  const [fen, setFen] = useState(() => fenAfter(item, 1));
  const [last, setLast] = useState<[string, string]>([item.line[0]!.slice(0, 2), item.line[0]!.slice(2, 4)]);
  const [status, setStatus] = useState<"idle" | "wrong" | "right" | "shown">("idle");
  const [hints, setHints] = useState(0);
  const [wrongs, setWrongs] = useState(0);
  const [tried, setTried] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const reported = useRef(false);
  const totalHints = useRef(0);
  const report = (o: Outcome) => { if (!reported.current) { reported.current = true; onResult?.(o, totalHints.current); } };
  const hintList = hintsFor(item, ply);
  const busy = status === "right" || status === "shown";

  const reset = () => { setPly(1); setFen(fenAfter(item, 1)); setLast([item.line[0]!.slice(0, 2), item.line[0]!.slice(2, 4)]); setStatus("idle"); setHints(0); setDone([]); setWrongs(0); };
  const show = () => {
    setFen(fenAfter(item, item.line.length)); const u = item.line[item.line.length - 1]!; setLast([u.slice(0, 2), u.slice(2, 4)]);
    setStatus("shown"); report("fail");
  };

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <div className="mx-auto w-full max-w-[360px]">
        <Board fen={fen} orientation={playerColor(item)} lastMove={last} canMove={!busy} onMove={(from, to) => {
          const r = gradeStep(item, ply, from, to);
          if (!r.legal) return false;
          if (!r.correct) {
            setTried(r.san); setWrongs((w) => w + 1); setStatus("wrong");
            try { play("wrong"); } catch { /* optional */ }
            return false;
          }
          setDone((d) => [...d, r.san, ...(r.reply ? [`(${r.reply.san})`] : [])]);
          setStatus("idle");
          if (r.done && !r.reply) { setFen(r.fen); setLast([from, to]); }
          else if (r.reply) {
            setFen(r.fen); setLast([from, to]);
            const rep = r.reply;
            setTimeout(() => { setFen(rep.fen); setLast([rep.uci.slice(0, 2), rep.uci.slice(2, 4)]); }, 450);
          }
          if (r.done) {
            setStatus("right"); try { play("correct"); } catch { /* optional */ }
            report(wrongs === 0 && totalHints.current === 0 ? "good" : "helped");
          } else { setPly(ply + 2); setHints(0); }
          return true;
        }} />
      </div>
      <div className="min-w-0 space-y-3">
        <p className="text-sm" data-testid="puzzle-task">{playerColor(item) === "white" ? "Hvit" : "Svart"} i trekket. {item.line.length > 2 ? `Løsningen er ${Math.floor(item.line.length / 2)} trekk.` : "Finn det beste trekket."}</p>
        {done.length > 0 && !busy && <p className="text-sm text-muted-foreground">Så langt: {done.join(" ")} – fortsett!</p>}
        {status === "idle" && hints > 0 && <ul className="space-y-1 text-sm text-muted-foreground">{hintList.slice(0, hints).map((h) => <li key={h} className="flex gap-2"><Lightbulb className="size-4 shrink-0 text-primary" />{h}</li>)}</ul>}
        {status === "wrong" && <p role="status" className="flex gap-2 text-sm"><XCircle className="size-4 shrink-0 text-destructive" />{tried} er ikke løsningen. Brikken står der den stod – prøv igjen.</p>}
        {busy && <div role="status" className="space-y-2">
          {status === "right" ? <p className="flex gap-2 text-sm font-medium text-primary"><CheckCircle2 className="size-4 shrink-0" />Riktig{wrongs === 0 && totalHints.current === 0 ? " – uten hjelp!" : "!"}</p> : <p className="text-sm font-medium">Her er løsningen.</p>}
          <p className="text-sm text-muted-foreground" data-testid="puzzle-explanation">{explain(item)}</p>
        </div>}
        <div className="flex flex-wrap gap-2">
          {status !== "right" && status !== "shown" && hints < hintList.length && <Button variant="outline" className="min-h-11" onClick={() => { setHints(hints + 1); totalHints.current += 1; if (status === "wrong") setStatus("idle"); }}><Lightbulb />{hints === 0 ? "Hint" : "Mer hint"}</Button>}
          {status === "wrong" && <Button variant="outline" className="min-h-11" onClick={() => setStatus("idle")}><RotateCcw />Prøv igjen</Button>}
          {!busy && <Button variant="ghost" className="min-h-11" onClick={show}><Eye />Vis løsning</Button>}
          {busy && <Button variant="outline" className="min-h-11" onClick={reset}><RotateCcw />Øv på den igjen</Button>}
        </div>
      </div>
    </div>
  );
}
