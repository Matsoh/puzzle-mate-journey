import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { AppHeader } from "@/components/AppHeader";
import { Board } from "@/components/Board";
import { CoachBubble } from "@/components/CoachAvatar";
import { getPuzzle, pickDaily, PUZZLES, themeLabels, type Puzzle } from "@/lib/puzzles";
import { getProgress, markActive, today, updateProgress, useProgress, withHistoryPoint } from "@/lib/progress";
import { K_PUZZLE, newRating, XP } from "@/lib/rules";
import { applyBadges } from "@/lib/badges";
import { play, unlockAudio } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pusler")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dagens pusler – Goblin Chess" },
      { name: "description", content: "5 nye taktikkpusler hver dag tilpasset din puslerating." },
      { property: "og:title", content: "Dagens pusler – Goblin Chess" },
      { property: "og:description", content: "Gafler, bindinger, spyd og matt – 5 pusler hver dag." },
    ],
  }),
  component: Puzzles,
});

type Status = "intro" | "yourTurn" | "solved" | "failed" | "retry";

function Puzzles() {
  const p = useProgress();
  const [ids, setIds] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = today();
    const s = getProgress();
    if (s.daily?.day === t && s.daily.ids.length) {
      setIds(s.daily.ids);
      const firstOpen = s.daily.ids.findIndex((id) => !s.daily!.results[id]);
      setCurrent(firstOpen < 0 ? s.daily.ids.length : firstOpen);
    } else {
      const picked = pickDaily(PUZZLES, s.puzzleRating, s.seenPuzzles, t);
      updateProgress((x) => ({ ...x, daily: { day: t, ids: picked, results: {} } }));
      setIds(picked);
      setCurrent(0);
    }
  }, []);

  const results = p.daily?.results ?? {};
  const puzzle = ids[current] ? getPuzzle(ids[current]) : undefined;
  const allDone = ids.length > 0 && current >= ids.length;

  return (
    <main className="mx-auto max-w-5xl pb-8 safe-bottom" onPointerDown={unlockAudio}>
      <AppHeader title="Dagens pusler" />
      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {ids.map((id, i) => (
              <span
                key={id}
                className={cn(
                  "grid size-10 place-items-center rounded-full border-2 font-display text-lg",
                  results[id] === "solved" && "bg-success/30 border-success",
                  results[id] === "failed" && "bg-destructive/30 border-destructive",
                  !results[id] && i === current && "border-primary animate-pulse",
                  !results[id] && i !== current && "border-border",
                )}
              >
                {results[id] === "solved" ? "✓" : results[id] === "failed" ? "✗" : i + 1}
              </span>
            ))}
          </div>
          <span className="chip">🧩 {p.puzzleRating}</span>
        </div>

        {allDone ? (
          <DailySummary ids={ids} results={results} />
        ) : puzzle ? (
          <PuzzlePlayer key={puzzle.id} puzzle={puzzle} alreadyRated={!!results[puzzle.id]} onNext={() => setCurrent((c) => c + 1)} />
        ) : null}
      </div>
    </main>
  );
}

function PuzzlePlayer({ puzzle, alreadyRated, onNext }: { puzzle: Puzzle; alreadyRated: boolean; onNext: () => void }) {
  const solution = puzzle.moves.split(" ");
  const chess = useRef(new Chess(puzzle.fen));
  const [fen, setFen] = useState(puzzle.fen);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<Status>("intro");
  const [lastMove, setLastMove] = useState<[string, string] | null>(null);
  const [shake, setShake] = useState(false);
  const [delta, setDelta] = useState<number | null>(null);
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const rated = useRef(alreadyRated);
  const playerColor = puzzle.fen.split(" ")[1] === "w" ? "b" : "w";

  const playUci = useCallback((uci: string) => {
    const mv = chess.current.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || "q" });
    setFen(chess.current.fen());
    setLastMove([mv.from, mv.to]);
    play(chess.current.inCheck() ? "check" : mv.captured ? "capture" : "move");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      playUci(solution[0]!);
      setIdx(1);
      setStatus("yourTurn");
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rate = (solved: boolean) => {
    if (rated.current) return;
    rated.current = true;
    updateProgress((p0) => {
      const r = newRating(p0.puzzleRating, puzzle.rating, solved ? 1 : 0, K_PUZZLE);
      setDelta(r - p0.puzzleRating);
      let p = {
        ...p0,
        puzzleRating: r,
        xp: p0.xp + (solved ? XP.puzzleSolved : XP.puzzleFailed),
        puzzlesSolved: p0.puzzlesSolved + (solved ? 1 : 0),
        puzzlesTried: p0.puzzlesTried + 1,
        seenPuzzles: [...new Set([...p0.seenPuzzles, puzzle.id])],
        daily: p0.daily ? { ...p0.daily, results: { ...p0.daily.results, [puzzle.id]: solved ? "solved" : "failed" } } : p0.daily,
      } as typeof p0;
      const done = p.daily && p.daily.ids.every((id) => p.daily!.results[id]);
      if (done) p.xp += XP.dailyAllDone;
      p = withHistoryPoint(markActive(p));
      return applyBadges(p).progress;
    });
  };

  const onMove = (from: string, to: string) => {
    if (status !== "yourTurn" && status !== "retry") return false;
    const expected = solution[idx] ?? "";
    let mv;
    try {
      mv = chess.current.move({ from, to, promotion: expected?.[4] || "q" });
    } catch {
      return false;
    }
    const uci = mv.from + mv.to;
    const correct = uci === expected.slice(0, 4) || chess.current.isCheckmate();
    setFen(chess.current.fen());
    setLastMove([mv.from, mv.to]);
    setHintSquare(null);
    if (!correct) {
      play("wrong");
      setShake(true);
      setTimeout(() => {
        chess.current.undo();
        setFen(chess.current.fen());
        setShake(false);
      }, 600);
      if (status === "yourTurn") rate(false);
      setStatus("failed");
      return true;
    }
    const next = idx + 1;
    if (next >= solution.length || chess.current.isCheckmate()) {
      play("correct");
      if (status === "yourTurn") rate(true);
      setStatus("solved");
      return true;
    }
    play("correct");
    setTimeout(() => {
      playUci(solution[next]!);
      setIdx(next + 1);
    }, 450);
    return true;
  };

  const showSolution = () => {
    const expected = solution[idx] ?? "";
    setHintSquare(expected.slice(0, 2));
  };

  const labels = themeLabels(puzzle);
  const arrows = hintSquare && status !== "solved" ? [{ startSquare: solution[idx]!.slice(0, 2), endSquare: solution[idx]!.slice(2, 4), color: "var(--arrow-good)" }] : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="mx-auto w-full max-w-[min(94vw,66vh)]">
        <Board fen={fen} orientation={playerColor === "w" ? "white" : "black"} onMove={onMove} canMove={status === "yourTurn" || status === "retry"} lastMove={lastMove} arrows={arrows} shake={shake} />
      </div>
      <div className="space-y-4">
        <div className="card-game p-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            {labels.map((l) => (
              <span key={l} className="chip text-accent">{l}</span>
            ))}
            <span className="chip">⭐ {puzzle.rating}</span>
          </div>
          <p className="font-display text-2xl">{playerColor === "w" ? "♔ Hvit" : "♚ Svart"} i trekket</p>
        </div>

        {status === "intro" && <CoachBubble>Se nøye på stillingen… motstanderen flytter først!</CoachBubble>}
        {status === "yourTurn" && <CoachBubble>Finn det beste trekket! Tips: {labels[0] ? `se etter ${labels[0].toLowerCase()}` : "sjekk sjakker og slag først"}.</CoachBubble>}
        {status === "retry" && <CoachBubble>Prøv igjen – du klarer det! 💪</CoachBubble>}
        {status === "failed" && (
          <div className="space-y-3 animate-pop">
            <CoachBubble>Nesten! Det var ikke helt riktig. {delta !== null && <b>({delta} poeng)</b>}</CoachBubble>
            <div className="grid grid-cols-2 gap-3">
              <button className="btn-game btn-ghost" onClick={() => setStatus("retry")}>🔁 Prøv igjen</button>
              <button className="btn-game btn-ghost" onClick={() => { setStatus("retry"); showSolution(); }}>💡 Vis trekk</button>
            </div>
            <button className="btn-game btn-primary w-full" onClick={onNext}>Neste pusle ▶</button>
          </div>
        )}
        {status === "solved" && (
          <div className="space-y-3 animate-pop">
            <div className="card-game p-5 text-center">
              <p className="font-display text-4xl text-gradient-gold">RIKTIG! 🎉</p>
              {delta !== null && <p className="chip mt-2 text-success">+{delta} puslerating · +{XP.puzzleSolved} XP</p>}
            </div>
            <button className="btn-game btn-accent w-full" onClick={onNext}>Neste pusle ▶</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DailySummary({ ids, results }: { ids: string[]; results: Record<string, string> }) {
  const solved = ids.filter((id) => results[id] === "solved").length;
  useEffect(() => {
    play("win");
  }, []);
  return (
    <div className="mx-auto max-w-lg space-y-4 animate-pop">
      <div className="card-game p-6 text-center space-y-2">
        <p className="font-display text-5xl text-gradient-gold">Ferdig for i dag!</p>
        <p className="font-display text-3xl">{solved} / {ids.length} løst</p>
        <span className="chip text-accent">+{XP.dailyAllDone} XP bonus</span>
      </div>
      <CoachBubble>
        {solved >= 4 ? "Fantastisk! Hjernen din er en tornado av taktikk! 🌪️" : solved >= 2 ? "Godt jobbet! Hver dag blir du litt skarpere." : "Tøffe pusler i dag! Det er sånn man blir sterk. Nye pusler i morgen!"}
      </CoachBubble>
      <div className="grid gap-3">
        <Link to="/stigen" className="btn-game btn-secondary">🪜 Utfordre en motstander</Link>
        <Link to="/" className="btn-game btn-ghost">🏠 Hovedkvarter</Link>
      </div>
    </div>
  );
}
