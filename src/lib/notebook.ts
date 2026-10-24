// Mikes notatbok — what Mike learns about Tobias over time, from engine facts
// only. Pure: categorise mistakes, keep a short log + pattern counters, and
// turn that into context for the cloud brain and one-liners for the UI.
import type { Mistake, PlayedMove } from "./coach";
import type { Progress } from "./progress";

export type LessonId = "hanging" | "missedMate" | "allowedMate" | "opening" | "endgame" | "capture-blunder" | "tactic-missed";

export const LESSONS: Record<LessonId, { label: string; tip: string; mike: string }> = {
  hanging: { label: "Hengende brikker", tip: "Før hvert trekk: hva kan motstanderen slå etterpå?", mike: "Hanging pieces again. Before you move: what can they take after this?" },
  "capture-blunder": { label: "Slag som koster", tip: "Et slag ser gratis ut – sjekk hva som kommer tilbake.", mike: "You keep grabbing stuff that bites back. Count the recapture first." },
  missedMate: { label: "Oversett matt", tip: "Når kongen deres er åpen: let etter matt før alt annet.", mike: "There was a mate and you walked past it. When their king's naked, look for mate first." },
  allowedMate: { label: "Tillot matt", tip: "Sjekk alle motstanderens sjakker før du flytter.", mike: "You gave them a mate. Every move: what checks do they have?" },
  opening: { label: "Åpningen", tip: "Utvikle, rokér, ikke flytt samme brikke to ganger.", mike: "Trouble before move 10. Develop, castle, stop touching the same piece twice." },
  endgame: { label: "Sluttspill", tip: "Kongen er en kampbrikke. Aktiver den.", mike: "Endgame slips. Your king is a fighter now – use it." },
  "tactic-missed": { label: "Oversett taktikk", tip: "Tvingende trekk først: sjakk, slag, trusler.", mike: "You're missing tactics that were right there. Forcing moves first: checks, captures, threats." },
};

export type NotebookEntry = { id: string; day: string; label: string; result: "win" | "draw" | "loss"; lessons: LessonId[] };
export type Notebook = { entries: NotebookEntry[]; patterns: Partial<Record<LessonId, number>> };

export const emptyNotebook = (): Notebook => ({ entries: [], patterns: {} });

const pieces = (fen: string) => (fen.split(" ")[0] ?? "").replace(/[^a-zA-Z]/g, "").length;

/** Which lessons a game's engine-found mistakes point at (deduped, worst first). */
export function lessonsFrom(mistakes: Mistake[], _moves: PlayedMove[] = []): LessonId[] {
  const out: LessonId[] = [];
  const add = (l: LessonId) => { if (!out.includes(l)) out.push(l); };
  for (const m of [...mistakes].sort((a, b) => b.facts.lossPct - a.facts.lossPct)) {
    const f = m.facts;
    if (f.allowedMateIn) add("allowedMate");
    else if (f.missedMateIn) add("missedMate");
    else if (f.replyCaptures && f.replyCapturesMovedPiece) add("capture-blunder");
    else if (f.replyCaptures) add("hanging");
    else if (f.severity === "tabbe") add("tactic-missed");
    if (m.ply <= 20) add("opening");
    else if (pieces(m.fenBefore) <= 12) add("endgame");
  }
  return out.slice(0, 4);
}

/** Pure: record a reviewed game once; patterns count how often each lesson shows up. */
export function withNotebookEntry(p: Progress, entry: NotebookEntry): Progress {
  const nb = p.notebook ?? emptyNotebook();
  if (nb.entries.some((e) => e.id === entry.id)) return p;
  const patterns = { ...nb.patterns };
  for (const l of entry.lessons) patterns[l] = (patterns[l] ?? 0) + 1;
  return { ...p, notebook: { entries: [entry, ...nb.entries].slice(0, 30), patterns } };
}

export function topPatterns(p: Progress, n = 3): { id: LessonId; count: number }[] {
  const pat = p.notebook?.patterns ?? {};
  return (Object.keys(pat) as LessonId[]).map((id) => ({ id, count: pat[id] ?? 0 })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count).slice(0, n);
}

/** Context block for the cloud brain. */
export function notebookContext(p: Progress): string {
  const nb = p.notebook;
  if (!nb || nb.entries.length === 0) return "Mike's notebook: no reviewed games yet.";
  const pats = topPatterns(p).map((x) => `${LESSONS[x.id].label} (${x.count}x)`).join(", ");
  const recent = nb.entries.slice(0, 5).map((e) => `${e.day} ${e.label}: ${e.result}${e.lessons.length ? ` – ${e.lessons.map((l) => LESSONS[l].label).join(", ")}` : " – clean"}`).join("; ");
  return `Mike's notebook (${nb.entries.length} reviewed games). Recurring patterns: ${pats || "none yet"}. Recent: ${recent}. Use these patterns when relevant, kindly and specifically; never shame.`;
}

/** One Mike line about the most common pattern, or null when the notebook is empty. */
export function notebookLine(p: Progress): string | null {
  const top = topPatterns(p, 1)[0];
  if (!top || top.count < 2) return null;
  return `${LESSONS[top.id].mike} (${top.count} games.)`;
}
