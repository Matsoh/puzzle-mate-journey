import { useEffect } from "react";
import { Brain, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { maiaDownload, maiaInit, useMaiaStatus } from "@/lib/maia";

/**
 * Status + one-time download of the human-like opponent brain (Maia 3, 44 MB,
 * cached on the device). Until it's there, bots run on Stockfish.
 */
export function MaiaBrain({ compact = false }: { compact?: boolean }) {
  const { status, progress } = useMaiaStatus();
  useEffect(() => { maiaInit(); }, []);
  if (status === "ready") {
    return compact ? null : <p className="flex items-center gap-2 text-xs text-muted-foreground"><Brain className="size-4 text-primary" />Motstanderne spiller som ekte mennesker (Maia).</p>;
  }
  if (status === "downloading") {
    return (
      <div className={compact ? "text-xs" : "card-game p-4 text-sm"} role="status">
        <p className="flex items-center gap-2 font-semibold"><Brain className="size-4 text-primary" />Laster motstanderhjernen… {progress}%</p>
        <div className="xp-track mt-2"><div className="xp-fill" style={{ width: `${progress}%` }} /></div>
      </div>
    );
  }
  if (status === "missing" || status === "error") {
    return (
      <div className={compact ? "flex items-center justify-between gap-3 text-xs" : "card-game p-4"}>
        <div className="min-w-0">
          <p className={compact ? "font-semibold" : "font-semibold"}><Brain className="mr-1 inline size-4 text-primary" />Ekte motstandere</p>
          {!compact && <p className="mt-1 text-sm text-muted-foreground">Last ned Maia (44 MB, én gang) så spiller botene som ekte 1500–2000-spillere – med menneskelige feil og menneskelig tidsbruk. Uten den spiller de på Stockfish.</p>}
          {status === "error" && <p className="text-xs text-destructive">Nedlastingen feilet. Prøv igjen.</p>}
        </div>
        <Button size={compact ? "sm" : "default"} className={compact ? "shrink-0" : "mt-3"} onClick={maiaDownload}><Download />Last ned</Button>
      </div>
    );
  }
  return null;
}
