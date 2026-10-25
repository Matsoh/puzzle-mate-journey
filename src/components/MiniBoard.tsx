import { Chess } from "chess.js";
import { useMemo } from "react";

const GLYPH: Record<string, string> = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };

/** Tiny static board (CSS grid, unicode pieces) for lists and cards. */
export function MiniBoard({ fen, orientation = "white", className = "" }: { fen: string; orientation?: "white" | "black"; className?: string }) {
  const cells = useMemo(() => {
    let board: ({ type: string; color: "w" | "b" } | null)[][];
    try { board = new Chess(fen).board(); } catch { board = new Chess().board(); }
    const rows = orientation === "white" ? board : [...board].reverse().map((r) => [...r].reverse());
    return rows.flatMap((row, r) => row.map((sq, c) => ({ key: `${r}${c}`, dark: (r + c) % 2 === 1, glyph: sq ? GLYPH[sq.color === "w" ? sq.type.toUpperCase() : sq.type] ?? "" : "", white: sq?.color === "w" })));
  }, [fen, orientation]);
  return (
    <div className={`miniboard ${className}`} aria-hidden>
      {cells.map((c) => <span key={c.key} className={`miniboard__sq ${c.dark ? "is-dark" : ""} ${c.white ? "is-white" : "is-black"}`}>{c.glyph}</span>)}
    </div>
  );
}
