// Monsterboken — the collection. Pure rules, tested in collection.test.ts.
import type { Progress } from "./progress";
import { OPPONENTS } from "./opponents";

export type Rarity = "vanlig" | "sjelden" | "episk" | "legendarisk";
export type Motif = { id: string; name: string; emoji: string; rarity: Rarity; hint: string };

/** Tactical motifs worth collecting (Lichess theme ids). Rarer = fewer puzzles carry it. */
export const MOTIFS: Motif[] = [
  { id: "fork", name: "Gaffel", emoji: "🍴", rarity: "vanlig", hint: "Én brikke angriper to." },
  { id: "pin", name: "Binding", emoji: "📌", rarity: "vanlig", hint: "Brikken kan ikke flytte uten å avsløre noe verre." },
  { id: "skewer", name: "Spyd", emoji: "🗡️", rarity: "vanlig", hint: "Den store må flytte, den lille bak faller." },
  { id: "mateIn1", name: "Matt i 1", emoji: "⚡", rarity: "vanlig", hint: "Ett trekk. Ferdig." },
  { id: "mateIn2", name: "Matt i 2", emoji: "🎯", rarity: "vanlig", hint: "Se to trekk fram." },
  { id: "mateIn3", name: "Matt i 3", emoji: "🧠", rarity: "sjelden", hint: "Tre trekk. Regn det ut." },
  { id: "hangingPiece", name: "Hengende brikke", emoji: "🎁", rarity: "vanlig", hint: "Gratis. Bare ta den." },
  { id: "sacrifice", name: "Offer", emoji: "💥", rarity: "sjelden", hint: "Gi bort noe for å få mer." },
  { id: "discoveredAttack", name: "Avdekket angrep", emoji: "🎭", rarity: "sjelden", hint: "Flytt én, angrip med en annen." },
  { id: "discoveredCheck", name: "Avdekket sjakk", emoji: "👁️", rarity: "episk", hint: "Flytt én – og kongen står i sjakk fra en annen." },
  { id: "doubleCheck", name: "Dobbeltsjakk", emoji: "⚔️", rarity: "episk", hint: "To sjakker samtidig. Kongen må flytte." },
  { id: "deflection", name: "Avledning", emoji: "🧲", rarity: "sjelden", hint: "Lokk forsvareren vekk." },
  { id: "attraction", name: "Tiltrekning", emoji: "🪤", rarity: "sjelden", hint: "Dra kongen dit du vil ha ham." },
  { id: "clearance", name: "Rydding", emoji: "🧹", rarity: "episk", hint: "Flytt det som står i veien." },
  { id: "interference", name: "Avskjæring", emoji: "🚧", rarity: "episk", hint: "Sett noe mellom." },
  { id: "intermezzo", name: "Mellomtrekk", emoji: "⏸️", rarity: "episk", hint: "Et overraskende trekk før det ventede." },
  { id: "xRayAttack", name: "Røntgen", emoji: "🩻", rarity: "episk", hint: "Angrep gjennom en brikke." },
  { id: "trappedPiece", name: "Fanget brikke", emoji: "🪢", rarity: "sjelden", hint: "Ingen vei ut." },
  { id: "promotion", name: "Forvandling", emoji: "👑", rarity: "sjelden", hint: "Bonden blir dronning." },
  { id: "advancedPawn", name: "Fribonde", emoji: "🏃", rarity: "vanlig", hint: "Ingen kan stoppe den." },
  { id: "backRankMate", name: "Baklinjematt", emoji: "🧱", rarity: "sjelden", hint: "Kongen sitter fast bak egne bønder." },
  { id: "smotheredMate", name: "Kvelningsmatt", emoji: "🐴", rarity: "legendarisk", hint: "Springeren alene. Kongen har ingen felter." },
  { id: "arabianMate", name: "Arabisk matt", emoji: "🏜️", rarity: "legendarisk", hint: "Tårn og springer i hjørnet." },
  { id: "anastasiaMate", name: "Anastasia-matt", emoji: "🎻", rarity: "legendarisk", hint: "Springer og tårn langs kanten." },
  { id: "bodenMate", name: "Boden-matt", emoji: "✝️", rarity: "legendarisk", hint: "To løpere i kryss." },
  { id: "operaMate", name: "Opera-matt", emoji: "🎭", rarity: "legendarisk", hint: "Tårn på baklinja, løper holder." },
  { id: "hookMate", name: "Krok-matt", emoji: "🪝", rarity: "legendarisk", hint: "Tårn, springer og bonde i samarbeid." },
  { id: "killBoxMate", name: "Drapsboks-matt", emoji: "📦", rarity: "legendarisk", hint: "Tårn og dronning låser kongen inne." },
  { id: "blindSwineMate", name: "Blindsvin-matt", emoji: "🐗", rarity: "legendarisk", hint: "To tårn på sjuende rad." },
  { id: "pillsburysMate", name: "Pillsbury-matt", emoji: "🎩", rarity: "legendarisk", hint: "Tårn og løper etter avdekket sjakk." },
  { id: "zugzwang", name: "Trekktvang", emoji: "🥶", rarity: "episk", hint: "Alle trekk er dårlige – for motstanderen." },
  { id: "exposedKing", name: "Utsatt konge", emoji: "🥵", rarity: "vanlig", hint: "Kongen mangler beskyttelse." },
  { id: "kingsideAttack", name: "Kongeangrep", emoji: "🏰", rarity: "vanlig", hint: "Alt mot kongens fløy." },
  { id: "capturingDefender", name: "Slå forsvareren", emoji: "🛡️", rarity: "sjelden", hint: "Fjern den som passer på." },
  { id: "quietMove", name: "Stille trekk", emoji: "🤫", rarity: "episk", hint: "Ingen slag, ingen sjakk. Likevel knusende." },
  { id: "endgame", name: "Sluttspill", emoji: "🏁", rarity: "vanlig", hint: "Få brikker, stor presisjon." },
];

export const MOTIF_IDS = new Set(MOTIFS.map((m) => m.id));

export const RARITY_ORDER: Rarity[] = ["vanlig", "sjelden", "episk", "legendarisk"];
export const RARITY_LABEL: Record<Rarity, string> = { vanlig: "Vanlig", sjelden: "Sjelden", episk: "Episk", legendarisk: "Legendarisk" };

/** Pure: count a solved puzzle's collectible themes. Returns the newly discovered motif ids. */
export function withMotifs(p: Progress, themes: string[]): { progress: Progress; discovered: Motif[] } {
  const motifs = { ...(p.motifs ?? {}) };
  const discovered: Motif[] = [];
  for (const t of themes) {
    if (!MOTIF_IDS.has(t)) continue;
    if (!motifs[t]) discovered.push(MOTIFS.find((m) => m.id === t)!);
    motifs[t] = (motifs[t] ?? 0) + 1;
  }
  return { progress: { ...p, motifs }, discovered };
}

export function motifCount(p: Progress, id: string): number {
  return p.motifs?.[id] ?? 0;
}

export function collectionSummary(p: Progress) {
  const found = MOTIFS.filter((m) => motifCount(p, m.id) > 0).length;
  const beaten = OPPONENTS.filter((o) => p.beaten.includes(o.id)).length;
  return { found, total: MOTIFS.length, beaten, opponents: OPPONENTS.length };
}
