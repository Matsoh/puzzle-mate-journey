// Classic games for "Gjett mesterens trekk": Tobias guesses the winner's moves.
// All games are 19th/early-20th century – moves are facts, not copyrighted.
// `notes` are Mike's short comments (English) at the ply AFTER the move (0-based index into `moves`).
export type MasterGame = {
  id: string;
  title: string;
  white: string;
  black: string;
  year: number;
  /** Side Tobias guesses for. */
  hero: "w" | "b";
  /** First ply the player must guess (earlier moves are played automatically as the opening). */
  from: number;
  moves: string[];
  notes: Record<number, string>;
  lesson: string;
};

const s = (pgn: string) => pgn.split(/\s+/).filter((t) => t && !/^\d+\.$/.test(t));

export const MASTER_GAMES: MasterGame[] = [
  {
    id: "reti-tartakower",
    title: "Lynet i Wien",
    white: "Richard Réti",
    black: "Savielly Tartakower",
    year: 1910,
    hero: "w",
    from: 10,
    moves: s("1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nf6 5. Qd3 e5 6. dxe5 Qa5+ 7. Bd2 Qxe5 8. O-O-O Nxe4 9. Qd8+ Kxd8 10. Bg5+ Kc7 11. Bd8#"),
    notes: { 14: "Castling long with check threats in the air. The king is safe, the rook is on d1. Now watch.", 15: "Black grabbed a knight. Looks fine. It isn't.", 16: "QUEEN SACRIFICE. Kxd8 is forced. Count what comes next.", 18: "Double check from bishop and rook. Only the king can move.", 20: "Mate. Eleven moves. The lesson: a king stuck on an open file is a target, not a piece." },
    lesson: "When the king can't castle and a file opens, every check is a weapon. Réti gave the queen because the double check was unstoppable.",
  },
  {
    id: "opera",
    title: "Operapartiet",
    white: "Paul Morphy",
    black: "Hertugen av Brunswick og grev Isouard",
    year: 1858,
    hero: "w",
    from: 10,
    moves: s("1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#"),
    notes: { 12: "Morphy attacks f7 and b7 at once. Two threats, one queen.", 18: "Knight sacrifice to rip open the b-file. Development over material – every Morphy game says this.", 20: "Bishop check. Black must block with the knight, which pins itself. Morphy's pieces are all out; Black's are still in bed.", 22: "Castles long with tempo: now the rook is on d1 staring at the pinned knight.", 24: "Rook takes knight! Material doesn't matter when the king is naked.", 28: "Another bishop takes. Everything trades into the final blow.", 30: "QUEEN SACRIFICE on b8. The knight is forced to take.", 32: "Mate with the last piece. Morphy used every piece he had and lost none for nothing." },
    lesson: "Develop every piece, open lines toward the king, then sacrifice. Morphy won at the opera with pieces, not with pawns.",
  },
  {
    id: "evergreen",
    title: "Det eviggrønne partiet",
    white: "Adolf Anderssen",
    black: "Jean Dufresne",
    year: 1852,
    hero: "w",
    from: 16,
    moves: s("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7#"),
    notes: { 30: "Bishop takes the d3 pawn with tempo on the queen. Clean up, keep attacking.", 32: "Knight check on f6! It drags the g-pawn away so the e-file and the long diagonal open.", 36: "Rad1 – the quiet move of the century. Black can take on f3 with mate threats, and White doesn't care. Count White's threats first.", 38: "Rook check on e7. Forced capture.", 40: "QUEEN takes d7 with check. The king must take. Then the bishops finish.", 42: "Bishop check from f5 – the king has exactly one square.", 44: "Bishop back with check. One more.", 46: "Mate. Two bishops, one rook, perfect timing. Anderssen had a queen hanging and didn't blink." },
    lesson: "Calculate forcing moves – checks and captures – all the way to the end. If your line mates, their threats never happen.",
  },
  {
    id: "immortal",
    title: "Det udødelige partiet",
    white: "Adolf Anderssen",
    black: "Lionel Kieseritzky",
    year: 1851,
    hero: "w",
    from: 20,
    moves: s("1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7#"),
    notes: { 20: "Rook sacrificed – Anderssen lets it go. Development and the attack on f7/g7 matter more.", 26: "Queen to f3: the heavy piece joins. Black's queen is far away chasing pawns.", 30: "Knight to c3 and d5 next – every white piece comes to the party.", 34: "Bd6! A bishop that blocks the queen's defence and eyes e7. Black now takes TWO rooks and it still loses.", 36: "Pawn to e5 cuts the queen off from the kingside. The queen on a1 is a spectator.", 40: "Knight check on g7, king must go to d8.", 42: "QUEEN SACRIFICE on f6. Knight takes. One move left.", 44: "Be7 mate. Anderssen gave both rooks, a bishop and the queen. This is why it's called immortal." },
    lesson: "Material only matters if it is playing. A queen on a1 and two extra rooks did nothing against three active pieces near the king.",
  },
];

export const getMasterGame = (id: string) => MASTER_GAMES.find((g) => g.id === id);
