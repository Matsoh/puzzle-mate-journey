import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Download, ExternalLink, Search, CheckCircle2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { GameReview } from "@/components/GameReview";
import { avatarName } from "@/lib/avatar";
import { MikeCompanion } from "@/components/MikeCompanion";
import { Mike } from "@/components/Mike";
import { today, updateProgress, useProgress, withCredit } from "@/lib/progress";
import { fetchChesscom, fetchLichess, mergeGames, playedMovesFromSan, TIME_LABEL, type ImportedGame } from "@/lib/games-import";
import { reviewGame, type GameReview as Review, type Mistake } from "@/lib/coach";
import { getEngine } from "@/lib/engine";
import { reviewContext, reviewLine } from "@/lib/mike-game";
import { lessonsFrom, LESSONS, notebookLine, topPatterns, withNotebookEntry } from "@/lib/notebook";
import { withDayGame } from "@/lib/quests";
import { celebrateDiff } from "@/lib/celebrate";
import { play } from "@/lib/sound";

export const Route = createFileRoute("/partier")({
  ssr: false,
  head: () => ({ meta: [{ title: "Mine partier – Goblin Chess" }, { name: "description", content: "Hent partiene dine fra chess.com og Lichess, og la Mike se på dem." }] }),
  component: GamesPage,
});

const REVIEW_XP = 25;

function GamesPage() {
  const p = useProgress();
  const [cc, setCc] = useState(p.accounts?.chesscom ?? "");
  const [li, setLi] = useState(p.accounts?.lichess ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState<ImportedGame | null>(null);
  const hasAccount = !!(p.accounts?.chesscom || p.accounts?.lichess);
  const [editing, setEditing] = useState(!hasAccount);

  async function fetchAll() {
    setBusy(true); setMsg(null);
    const chesscom = cc.trim(), lichess = li.trim();
    updateProgress((s) => ({ ...s, accounts: { ...(chesscom ? { chesscom } : {}), ...(lichess ? { lichess } : {}) } }));
    let got: ImportedGame[] = [];
    const errs: string[] = [];
    if (chesscom) { try { got.push(...(await fetchChesscom(chesscom))); } catch { errs.push("chess.com"); } }
    if (lichess) { try { got.push(...(await fetchLichess(lichess))); } catch { errs.push("Lichess"); } }
    let added = 0;
    updateProgress((s) => { const merged = mergeGames(s.importedGames ?? [], got); added = merged.length - (s.importedGames?.length ?? 0); return { ...s, importedGames: merged }; });
    setMsg(errs.length ? `Fikk ikke kontakt med ${errs.join(" og ")}. Sjekk brukernavnet.` : added > 0 ? `${added} nye partier hentet.` : "Ingen nye partier siden sist.");
    setBusy(false); setEditing(false);
    if (got.length) play("correct");
  }

  if (open) return <ReviewScreen game={open} onBack={() => setOpen(null)} />;

  const games = p.importedGames ?? [];
  const nbLine = notebookLine(p);
  const pats = topPatterns(p);
  return (
    <main className="page-layout page-narrow">
      <AppHeader title="Mine partier" />
      <div className="space-y-5">
        <MikeCompanion mode="review" context={`Imported games: ${games.length}, reviewed: ${(p.reviewedGames ?? []).length}.`}
          line={{ text: nbLine ?? (games.length ? "Pick a game. I've got one eye and it's free." : "Give me your chess.com or Lichess name and I'll watch your real games. The ones that count."), mood: nbLine ? "think" : "chill" }} />

        {pats.length > 0 && (
          <section className="card-game p-4" aria-label="Mikes notatbok">
            <p className="eyebrow mb-2">Mikes notatbok · mønstre</p>
            <div className="space-y-2">
              {pats.map((x) => <div key={x.id} className="flex items-start justify-between gap-3 text-sm"><span><span className="font-semibold">{LESSONS[x.id].label}</span> <span className="text-muted-foreground">· {LESSONS[x.id].tip}</span></span><span className="chip shrink-0">{x.count}×</span></div>)}
            </div>
          </section>
        )}

        {editing ? (
          <section className="card-game p-4" aria-label="Kontoer">
            <p className="font-semibold">Brukernavn</p>
            <label className="mt-2 block text-sm">chess.com<input value={cc} onChange={(e) => setCc(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" autoCapitalize="none" autoCorrect="off" placeholder="f.eks. tobias2015" /></label>
            <label className="mt-2 block text-sm">Lichess<input value={li} onChange={(e) => setLi(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" autoCapitalize="none" autoCorrect="off" placeholder="valgfritt" /></label>
            <div className="mt-3 flex gap-2"><Button disabled={busy || (!cc.trim() && !li.trim())} onClick={() => void fetchAll()}><Download />{busy ? "Henter…" : "Hent partier"}</Button>{hasAccount && <Button variant="ghost" onClick={() => setEditing(false)}>Avbryt</Button>}</div>
            <p className="mt-2 text-xs text-muted-foreground">Bare offentlige partier hentes. Ingen innlogging, ingen passord.</p>
          </section>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={busy} onClick={() => void fetchAll()}><Download />{busy ? "Henter…" : "Hent nye partier"}</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Endre brukernavn</Button>
          </div>
        )}
        {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}

        <section className="space-y-2" aria-label="Partier">
          {games.map((g) => {
            const reviewed = (p.reviewedGames ?? []).includes(g.id);
            return (
              <button key={g.id} type="button" onClick={() => setOpen(g)} className={`quest w-full text-left ${reviewed ? "is-done" : ""}`}>
                <span className="quest__check">{reviewed ? <CheckCircle2 className="size-5" /> : g.result === "win" ? "W" : g.result === "draw" ? "½" : "L"}</span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-tight">{g.result === "win" ? "Seier" : g.result === "draw" ? "Remis" : "Tap"} mot {g.opponent}{g.opponentRating ? ` (${g.opponentRating})` : ""}</span>
                  <span className="block text-xs text-muted-foreground">{g.day} · {TIME_LABEL[g.timeClass] ?? g.timeClass} · {g.source === "chesscom" ? "chess.com" : "Lichess"} · {Math.ceil(g.moves.length / 2)} trekk</span>
                </span>
                <span className="quest__xp">{reviewed ? "Sett" : `+${REVIEW_XP} XP`}</span>
              </button>
            );
          })}
          {games.length === 0 && !editing && <p className="text-sm text-muted-foreground">Ingen partier ennå. Trykk «Hent nye partier».</p>}
        </section>
      </div>
    </main>
  );
}

function ReviewScreen({ game, onBack }: { game: ImportedGame; onBack: () => void }) {
  const p = useProgress();
  const parsed = useMemo(() => playedMovesFromSan(game.moves), [game]);
  const [phase, setPhase] = useState<"idle" | "analysing" | "done" | "error">("idle");
  const [pct, setPct] = useState(0);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const orientation = game.player === "w" ? "white" : "black";
  const label = `${game.result === "win" ? "Seier" : game.result === "draw" ? "Remis" : "Tap"} mot ${game.opponent}`;

  async function analyse() {
    if (!parsed) { setPhase("error"); return; }
    setPhase("analysing"); setPct(0);
    try {
      const full = await reviewGame(getEngine(), parsed.moves, parsed.finalFen, game.player, (d, t) => setPct(Math.round((d / t) * 100)));
      const res = full.mistakes;
      setMistakes(res);
      setReview(full);
      setPhase("done");
      const lessons = lessonsFrom(res, parsed.moves);
      updateProgress((s) => {
        let n = withNotebookEntry(s, { id: game.id, day: game.day, label, result: game.result, lessons });
        if (!(n.reviewedGames ?? []).includes(game.id)) {
          n = { ...n, reviewedGames: [...(n.reviewedGames ?? []), game.id] };
          n = withDayGame(n, game.day, game.result === "win");
          n = withCredit(n, `review:${game.id}`, REVIEW_XP);
        }
        celebrateDiff(s, n);
        return n;
      });
      play("correct");
    } catch { setPhase("error"); }
  }

  return (
    <main className="page-layout page-narrow">
      <header className="mb-4 flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Tilbake" className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground"><ArrowLeft className="size-4" /></button>
        <div className="min-w-0"><h1 className="truncate text-xl font-bold">{label}</h1><p className="text-xs text-muted-foreground">{game.day} · {TIME_LABEL[game.timeClass] ?? game.timeClass} · <a href={game.url} target="_blank" rel="noopener noreferrer" className="underline">Åpne på {game.source === "chesscom" ? "chess.com" : "Lichess"} <ExternalLink className="inline size-3" /></a></p></div>
      </header>

      {phase === "idle" && (
        <div className="space-y-3">
          <div className="flex items-end gap-3"><Mike mood="think" className="w-14" animate={false} /><p className="mike-bubble text-sm"><span className="mike-bubble__name">Mike</span>{game.result === "win" ? "A win. Let's find the moment it nearly wasn't." : game.result === "draw" ? "A draw. Somewhere in here is the half point you left behind." : "A loss. Perfect. Those are the ones that teach. Run it."}</p></div>
          <Button size="lg" className="w-full" disabled={!parsed} onClick={() => void analyse()}><Search />Analyser med Stockfish</Button>
          {!parsed && <p className="text-sm text-destructive">Klarte ikke lese trekkene i dette partiet.</p>}
          <div className="card-game p-3 text-sm leading-7">{game.moves.map((s, i) => <span key={i} className="mr-2">{i % 2 === 0 && <span className="text-muted-foreground">{i / 2 + 1}.</span>} {s}</span>)}</div>
        </div>
      )}
      {phase === "analysing" && (
        <div className="card-game p-6 text-center space-y-4">
          <div className="flex items-end justify-center gap-3"><Mike mood="think" className="w-14" /><p className="mike-bubble text-sm">Reading every move. Don't rush me, I've got one eye.</p></div>
          <div className="xp-track"><div className="xp-fill" style={{ width: `${pct}%` }} /></div>
          <p className="text-xl font-semibold">{pct}%</p>
        </div>
      )}
      {phase === "error" && <p className="text-sm text-destructive">Analysen stoppet. Prøv igjen.</p>}
      {phase === "done" && (
        <div className="space-y-4">
          <MikeCompanion mode="review" line={reviewLine(mistakes, game.result)} context={`Real ${TIME_LABEL[game.timeClass] ?? game.timeClass} game on ${game.source} vs ${game.opponent}${game.opponentRating ? ` (${game.opponentRating})` : ""}, Tobias played ${game.player === "w" ? "White" : "Black"}.\n${reviewContext(mistakes, game.result)}\nLessons noted: ${lessonsFrom(mistakes).map((l) => LESSONS[l].label).join(", ") || "none"}.`} />
          {lessonsFrom(mistakes).length > 0 && (
            <section className="card-game p-4" aria-label="Lærdom">
              <p className="eyebrow mb-2">Skrevet i Mikes notatbok</p>
              <ul className="space-y-1 text-sm">{lessonsFrom(mistakes).map((l) => <li key={l}><span className="font-semibold">{LESSONS[l].label}</span> <span className="text-muted-foreground">· {LESSONS[l].tip}</span></li>)}</ul>
            </section>
          )}
          {review && <GameReview review={review} orientation={orientation} names={game.player === "w" ? { w: avatarName(p), b: game.opponent } : { w: game.opponent, b: avatarName(p) }} />}
          <Button variant="outline" className="w-full" onClick={onBack}>Tilbake til partiene</Button>
        </div>
      )}
      {p.reviewedGames?.includes(game.id) && phase === "idle" && <p className="mt-3 text-xs text-muted-foreground">Du har sett på dette partiet før – analysen kan kjøres igjen, men gir ikke ny XP.</p>}
    </main>
  );
}
