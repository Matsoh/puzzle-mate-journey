import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, type Square } from "chess.js";

type Props = {
  fen: string;
  orientation: "white" | "black";
  /** Return true if the move was accepted. */
  onMove?: (from: string, to: string) => boolean;
  canMove?: boolean;
  lastMove?: [string, string] | null;
  arrows?: { startSquare: string; endSquare: string; color: string }[];
  shake?: boolean;
};

/** Touch-first board: drag OR tap-tap to move, with legal-move dots. */
export function Board({ fen, orientation, onMove, canMove = true, lastMove, arrows = [], shake }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);
  const myColor = orientation === "white" ? "w" : "b";

  const targets = useMemo(() => {
    if (!selected) return [] as string[];
    return chess.moves({ square: selected as Square, verbose: true }).map((m) => m.to);
  }, [selected, chess]);

  const styles: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    styles[lastMove[0]] = { background: "var(--board-highlight)" };
    styles[lastMove[1]] = { background: "var(--board-highlight)" };
  }
  if (chess.inCheck()) {
    const board = chess.board();
    for (const row of board)
      for (const sq of row)
        if (sq && sq.type === "k" && sq.color === chess.turn())
          styles[sq.square] = { background: "radial-gradient(circle, var(--board-check) 40%, transparent 75%)" };
  }
  if (selected) styles[selected] = { background: "var(--board-select)" };
  for (const t of targets) {
    const occupied = chess.get(t as Square);
    styles[t] = occupied
      ? { background: "radial-gradient(circle, transparent 58%, var(--board-dot) 60%)" }
      : { background: "radial-gradient(circle, var(--board-dot) 22%, transparent 24%)" };
  }

  const tryMove = (from: string, to: string) => {
    setSelected(null);
    if (!canMove || !onMove) return false;
    return onMove(from, to);
  };

  return (
    <div className={shake ? "animate-shake" : undefined}>
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: canMove,
          animationDurationInMs: 200,
          squareStyles: styles,
          arrows,
          allowDrawingArrows: false,
          lightSquareStyle: { backgroundColor: "var(--board-light)" },
          darkSquareStyle: { backgroundColor: "var(--board-dark)" },
          boardStyle: { borderRadius: "14px", overflow: "hidden", boxShadow: "var(--glow-primary)" },
          canDragPiece: ({ piece }) => canMove && piece.pieceType[0] === myColor,
          onPieceDrop: ({ sourceSquare, targetSquare }) => (targetSquare ? tryMove(sourceSquare, targetSquare) : false),
          onSquareClick: ({ square, piece }) => {
            if (!canMove) return;
            if (selected && targets.includes(square)) {
              tryMove(selected, square);
              return;
            }
            if (piece && piece.pieceType[0] === myColor) setSelected(square === selected ? null : square);
            else setSelected(null);
          },
        }}
      />
    </div>
  );
}
