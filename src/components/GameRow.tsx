import { CheckCircle2 } from "lucide-react";
import { MiniBoard } from "./MiniBoard";
import { finalFen, RESULT_LABEL } from "@/lib/game-log";
import { SOURCE_LABEL, TIME_LABEL, type ImportedGame } from "@/lib/games-import";

export function timeAgo(ms: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - ms) / 60_000));
  if (m < 2) return "nå nettopp";
  if (m < 60) return `${m} min siden`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} t siden`;
  const d = Math.round(h / 24);
  if (d < 7) return d === 1 ? "i går" : `${d} dager siden`;
  return new Date(ms).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

/** One archive row, chess.com-style: result badge, mini board, who/what, time. */
export function GameRow({ g, reviewed, onOpen }: { g: ImportedGame; reviewed: boolean; onOpen: () => void }) {
  const fen = finalFen(g.moves);
  return (
    <button type="button" onClick={onOpen} className="game-row" aria-label={`${RESULT_LABEL[g.result]} mot ${g.opponent}`}>
      <span className={`game-row__res is-${g.result}`}>{g.result === "win" ? "W" : g.result === "draw" ? "½" : "L"}</span>
      {fen ? <MiniBoard fen={fen} orientation={g.player === "w" ? "white" : "black"} /> : <span className="miniboard" />}
      <span className="min-w-0">
        <span className="block truncate font-semibold leading-tight"><span className={`game-row__dot is-${g.player}`} aria-hidden />{g.opponent}{g.opponentRating ? <span className="font-normal text-muted-foreground"> ({g.opponentRating})</span> : null}</span>
        <span className="block text-xs text-muted-foreground">{SOURCE_LABEL[g.source]} · {TIME_LABEL[g.timeClass] ?? g.timeClass} · {Math.ceil(g.moves.length / 2)} trekk · {timeAgo(g.playedAt)}</span>
      </span>
      <span className="text-xs text-muted-foreground">{reviewed ? <CheckCircle2 className="size-5 text-primary" /> : "Analyser"}</span>
    </button>
  );
}
