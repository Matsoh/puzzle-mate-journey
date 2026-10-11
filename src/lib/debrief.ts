import type { Mistake } from "./coach";
import type { CoachId } from "./trainer";

export type Outcome = "win" | "draw" | "loss";

/** Only the engine's PV best move and the game move are judged; anything else is just "another legal move". */
export function compareDrillMove(m: Pick<Mistake, "bestUci" | "playedUci">, uci: string): "best" | "played" | "other" {
  const norm = (u: string) => u.slice(0, 4) + (u[4] && u[4] !== "q" ? u[4] : "");
  if (norm(uci) === norm(m.bestUci)) return "best";
  if (norm(uci) === norm(m.playedUci)) return "played";
  return "other";
}

const pieces = (fen: string) => (fen.split(" ")[0] ?? "").replace(/[^a-zA-Z]/g, "").length;

/** Profile-flavoured question chosen only from facts the analysis actually contains. */
export function profileFocus(coach: CoachId | null, m: Mistake): string {
  const f = m.facts;
  if (coach === "hikaru") {
    if (f.allowedMateIn) return `Motoren så at trekket i partiet åpnet for matt i ${f.allowedMateIn}. Sjekk kongesikkerheten: hvilke sjakker har motstanderen?`;
    if (f.missedMateIn) return `Her fantes det matt i ${f.missedMateIn} ifølge motoren. Start med de tvingende trekkene: sjakk, slag og trusler.`;
    if (f.replyCaptures) return `Etter trekket i partiet kunne motstanderen slå ${f.replyCaptures}. Hva er motstanderens beste svar på kandidattrekkene dine?`;
    return "Finn to–tre kandidattrekk og spør hva motstanderens beste svar er på hvert av dem.";
  }
  if (coach === "magnus") {
    if (pieces(m.fenBefore) <= 12) return "Det er få brikker igjen. Kan kongen bli mer aktiv, eller finnes det en fribonde å spille på?";
    if (f.replyCaptures) return `Etter trekket i partiet kunne motstanderen slå ${f.replyCaptures}. Hvilken brikke din står dårligst, og hva er motspillet?`;
    return "Hvilken brikke gjør minst, og hva er motstanderens motspill?";
  }
  return "Sjekk sjakker, slag og trusler for begge sider før du velger.";
}
