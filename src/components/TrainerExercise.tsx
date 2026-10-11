import { useState } from "react";
import { Lightbulb, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { Board } from "./Board";
import { Button } from "@/components/ui/button";
import { checkMove, type Exercise } from "@/lib/trainer";
import { play } from "@/lib/sound";

export function TrainerExercise({ exercise, onSolved, onNext }: { exercise: Exercise; onSolved?: () => void; onNext?: () => void }) {
  const [fen, setFen] = useState(exercise.fen);
  const [status, setStatus] = useState<"idle" | "wrong" | "right">("idle");
  const [hint, setHint] = useState(false);
  const [tried, setTried] = useState("");
  const [lastId, setLastId] = useState(exercise.id);
  if (lastId !== exercise.id) { setLastId(exercise.id); setFen(exercise.fen); setStatus("idle"); setHint(false); setTried(""); }
  const orientation = exercise.fen.split(" ")[1] === "b" ? "black" : "white";
  const reset = () => { setFen(exercise.fen); setStatus("idle"); };
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <div className="mx-auto w-full max-w-[360px]">
        <Board fen={fen} orientation={orientation} canMove={status === "idle"} onMove={(from, to) => {
          const r = checkMove(exercise, from, to);
          if (!r.legal) return false;
          setFen(r.fen); setTried(r.san);
          setStatus(r.correct ? "right" : "wrong");
          try { play(r.correct ? "correct" : "wrong"); } catch { /* optional */ }
          if (r.correct) onSolved?.();
          return true;
        }} />
      </div>
      <div className="min-w-0 space-y-3">
        <span className="chip">Treningsstilling</span>
        <h3 className="text-lg font-semibold">{exercise.title}</h3>
        <p className="text-sm" data-testid="exercise-task">{exercise.task}</p>
        {status === "idle" && hint && <p className="flex gap-2 text-sm text-muted-foreground"><Lightbulb className="size-4 shrink-0 text-primary" />{exercise.hint}</p>}
        {status === "wrong" && <p role="status" className="flex gap-2 text-sm"><XCircle className="size-4 shrink-0 text-destructive" />{tried} løser ikke oppgaven. Ta et nytt blikk – du klarer det!</p>}
        {status === "right" && <div role="status" className="space-y-2"><p className="flex gap-2 text-sm font-medium text-primary"><CheckCircle2 className="size-4 shrink-0" />Riktig: {tried}</p><p className="text-sm text-muted-foreground">{exercise.explanation}</p></div>}
        <div className="flex flex-wrap gap-2">
          {status === "idle" && !hint && <Button variant="outline" onClick={() => setHint(true)}><Lightbulb />Hint</Button>}
          {status !== "idle" && <Button variant="outline" onClick={reset}><RotateCcw />Prøv igjen</Button>}
          {status === "right" && onNext && <Button onClick={onNext}>Neste</Button>}
        </div>
      </div>
    </div>
  );
}
