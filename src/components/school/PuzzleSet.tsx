import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { AdaptivePuzzle } from "@/components/AdaptivePuzzle";
import { Button } from "@/components/ui/button";
import type { TrainingItem } from "@/lib/adaptive";
import type { Outcome } from "@/lib/adaptive";

/** A short run of puzzles with a progress row; reports each result and the final tally. */
export function PuzzleSet({ items, title, onItem, onDone }: { items: TrainingItem[]; title: string; onItem?: (item: TrainingItem, ok: boolean) => void; onDone: (ok: number, total: number) => void }) {
  const [i, setI] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const item = items[i];
  if (!item) return <p className="text-sm text-muted-foreground">Fant ingen oppgaver for denne timen.</p>;
  const ok = results.filter(Boolean).length;
  const result = (o: Outcome) => {
    const good = o !== "fail";
    onItem?.(item, good);
    setResults((r) => [...r, good]);
  };
  const next = () => {
    if (i + 1 < items.length) setI(i + 1);
    else { setFinished(true); onDone(ok, items.length); }
  };
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="eyebrow">{title} · {Math.min(i + 1, items.length)}/{items.length}</p>
        <div className="flex gap-1" aria-label="Resultater">{items.map((_, k) => <span key={k} className={`size-3 rounded-full ${results[k] === undefined ? "bg-muted" : results[k] ? "bg-primary" : "bg-destructive"}`} />)}</div>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{item.themeLabel}: {item.lichessThemes.includes("mateIn1") ? "matt i ett" : item.lichessThemes.includes("mateIn2") ? "matt i to" : "finn det beste trekket"}</p>
      {!finished && <AdaptivePuzzle key={item.id} item={item} onResult={result} />}
      {results.length === i + 1 && !finished && (
        <Button className="mt-3 w-full font-bold" onClick={next}>{results[i] ? <CheckCircle2 /> : <XCircle />} {i + 1 < items.length ? "Neste oppgave" : "Ferdig"}</Button>
      )}
    </div>
  );
}
