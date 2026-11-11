// Rivals: the players of the Goblin world. They spot Tobias on the map and
// challenge him, ask to be added after a good game, come back for rematches
// with the score in mind, and train so they stay close to his rating. And
// Skyggen – the shadow that waits in every region. Pure rules (tested in
// rivals.test.ts); the games themselves are ordinary rated bot games in /parti.
import type { TimeControl } from "@/components/GameSetup";
import type { Opponent } from "./opponents";
import type { Tempo } from "./think-time";
import { rng } from "./tour";

export type Outcome = "win" | "draw" | "loss";
export type PersonaId = "lyn" | "mur" | "gambit" | "felle" | "slutt" | "stille" | "sprell";
export type Persona = {
  style: string;
  tempo: Tempo;
  tc: TimeControl;
  /** First meeting. */
  challenge: string[];
  /** Rematch lines by who leads; {h2h} is the score from the rival's side. */
  ahead: string[];
  behind: string[];
  even: string[];
  /** After the game, from the rival. */
  won: string[];
  lost: string[];
  request: string[];
  accepted: string[];
};

export const PERSONAS: Record<PersonaId, Persona> = {
  lyn: {
    style: "Spiller fort – veldig fort", tempo: "impulsive", tc: "10+0",
    challenge: ["Fort parti? Jeg har ikke hele dagen.", "Du ser treg ut. Bevis at jeg tar feil."],
    ahead: ["{h2h} til meg. Vil du ha mer?", "Jeg leder {h2h}. Kom igjen, da!"],
    behind: ["Ok, {h2h} til deg. Omkamp. NÅ.", "Du leder. Ikke lenge."],
    even: ["{h2h}. Det må avgjøres!", "Likt mellom oss. Én til?"],
    won: ["For fort for deg?", "gg! Du blunket."],
    lost: ["Hæ?! Jeg trykket feil. Omkamp!", "Ok, den var bra. gg."],
    request: ["gg! Legg meg til – jeg vil ha omkamp."],
    accepted: ["Fett! Jeg utfordrer deg når du minst venter det."],
  },
  mur: {
    style: "Solid som en vegg", tempo: "slow", tc: "15+10",
    challenge: ["Ingen kommer gjennom forsvaret mitt. Prøv.", "Jeg gjør ingen feil. Gjør du?"],
    ahead: ["{h2h} i min favør. Muren står.", "Fortsatt ingen vei gjennom. {h2h}."],
    behind: ["Du fant en sprekk. {h2h}. Jeg har murt den igjen.", "Én gang til. Denne gangen holder muren."],
    even: ["{h2h}. Vi er jevne. Det liker jeg ikke.", "Uavgjort mellom oss. Rolig parti?"],
    won: ["Tålmodighet vinner. Bra kjempet.", "Muren holdt."],
    lost: ["Du fant hullet. Respekt.", "Sterkt spilt. Jeg må mure bedre."],
    request: ["Godt parti. Legg meg til, så spiller vi flere."],
    accepted: ["Takk. Vi høres."],
  },
  gambit: {
    style: "Ofrer alt som ikke er spikret fast", tempo: "impulsive", tc: "10+0",
    challenge: ["Jeg ofrer en bonde. Eller tre. Tør du ta dem?", "Kongen din ser ensom ut …"],
    ahead: ["{h2h}! Ofrene mine virker på deg.", "Jeg leder {h2h}. Mer kaos?"],
    behind: ["{h2h} til deg. Neste gang ofrer jeg MER.", "Du tok alt og overlevde. Igjen?"],
    even: ["{h2h}. Kaos-finale?", "Likt! La oss ofre noe."],
    won: ["Matt! Hvem trenger brikker?", "Det var vakkert. For meg."],
    lost: ["Ok, jeg ofret kanskje litt for mye.", "Du forsvarte deg som en mester. gg!"],
    request: ["Du er gøy å angripe! Legg meg til."],
    accepted: ["Ja! Vent på et offer snart."],
  },
  felle: {
    style: "Legger feller i åpningen", tempo: "steady", tc: "10+0",
    challenge: ["Bare et vanlig, helt ufarlig parti. Lover.", "Den bonden der er gratis. Ta den."],
    ahead: ["{h2h}. Du går i dem hver gang.", "Jeg har en ny felle til deg. {h2h}."],
    behind: ["{h2h}?! Du ser gjennom meg. Ny felle på vei.", "Ok, den så du. Hva med denne?"],
    even: ["{h2h}. Én felle til avgjør.", "Jevnt. Jeg har øvd på noe nytt."],
    won: ["Den gikk du rett i!", "Felle-mester 1, du 0."],
    lost: ["Du så fella. Imponerende.", "Hm. Jeg trenger bedre feller."],
    request: ["Du er vanskelig å lure. Legg meg til!"],
    accepted: ["Hehe. Følg med i åpningen neste gang."],
  },
  slutt: {
    style: "Bytter av og vinner sluttspillet", tempo: "slow", tc: "15+10",
    challenge: ["Vi bytter av alt, og så ser vi hvem som kan sluttspill.", "Dronningbytte? Ja takk."],
    ahead: ["{h2h}. Sluttspillene er mine.", "Jeg leder {h2h}. Kongen min er raskere enn din."],
    behind: ["{h2h} til deg. Du har øvd på sluttspill, du.", "Du slo meg i mitt eget spill. Én gang til."],
    even: ["{h2h}. Det avgjøres i et bondesluttspill.", "Likt. Tårnsluttspill denne gangen?"],
    won: ["Aktiv konge. Husk det.", "Sakte, men sikkert."],
    lost: ["Du spilte sluttspillet bedre enn meg!", "Kongen din kom først. Bra."],
    request: ["Fint sluttspill. Legg meg til, så tar vi flere."],
    accepted: ["Bra. Ta med kongen din."],
  },
  stille: {
    style: "Sier nesten ingenting", tempo: "steady", tc: "10+0",
    challenge: ["…", "… parti?"],
    ahead: ["{h2h}.", "… igjen?"],
    behind: ["{h2h}. Omkamp.", "…!"],
    even: ["{h2h}.", "…"],
    won: ["gg.", "…"],
    lost: ["… bra.", "gg."],
    request: ["… venn?"],
    accepted: ["…!"],
  },
  sprell: {
    style: "Rare åpninger, null respekt", tempo: "impulsive", tc: "10+0",
    challenge: ["1. h4! Hva gjør du nå, a?", "Jeg har funnet opp en åpning. Den er dårlig. Jeg vinner likevel."],
    ahead: ["{h2h} til meg! Og jeg spiller bare tull!", "Tullet mitt virker. {h2h}."],
    behind: ["{h2h} … ok, kanskje h4 ikke er så bra.", "Du straffer tullet mitt. Ny tulleåpning på vei!"],
    even: ["{h2h}. Neste parti åpner jeg med kanten.", "Likt! Tør du møte springer til h3?"],
    won: ["HAHA! Med DEN åpningen!", "Tull slår teori."],
    lost: ["Ok, den åpningen var faktisk dårlig.", "Du spilte ordentlig. Juks."],
    request: ["Du er morsom å tulle med. Legg meg til!"],
    accepted: ["Jippi! Neste åpning blir enda verre."],
  },
};

export type RivalDef = { id: string; alias: string; figure: number; persona: PersonaId; /** Usual rating relative to the player's when they first meet. */ offset: number };
const C = (id: string, alias: string, figure: number, persona: PersonaId, offset: number): RivalDef => ({ id, alias, figure, persona, offset });

/** The cast – also Rivalboken, the collection of players met. */
export const CAST: RivalDef[] = [
  C("nattugla", "NattUgla", 33, "stille", 40),
  C("skyggeloper", "SkyggeLøper", 10, "felle", -30),
  C("romfarer", "Romfarer_e4", 18, "sprell", -90),
  C("trollmann", "TrollmannTårn", 31, "gambit", 20),
  C("gresskar", "GresskarGambit", 60, "gambit", -60),
  C("maur", "MaurMakt", 63, "mur", -110),
  C("monster", "RosaMonster", 64, "sprell", -130),
  C("stink", "StinkBonde", 66, "sprell", -70),
  C("sirhatt", "SirHatt", 67, "slutt", 60),
  C("tunga", "TungaRettIMunn", 68, "lyn", -100),
  C("dommer", "DommerMatt", 62, "mur", 80),
  C("doktor", "Dr_Dronningoffer", 8, "gambit", 30),
  C("kaptein", "KapteinRokade", 23, "mur", 10),
  C("swat", "SpesialSpringer", 37, "felle", 50),
  C("blaalyn", "BlåLyn", 46, "lyn", -20),
  C("lilla", "LillaLøper", 44, "lyn", -50),
  C("rosa", "RosaRokade", 40, "felle", -80),
  C("storore", "Storøre", 41, "sprell", -40),
  C("emo", "EmoElo", 22, "stille", 70),
  C("nummer10", "Nummer10", 25, "lyn", 0),
  C("tommer", "TømmerTårn", 24, "slutt", -10),
  C("byggmester", "ByggmesterBonde", 16, "mur", -120),
  C("sykkel", "SykkelSjakk", 32, "lyn", 20),
  C("tennis", "TennisTaktiker", 35, "felle", -20),
  C("basket", "BasketBinder", 57, "gambit", 40),
  C("panneband", "Pannebåndet", 58, "slutt", -60),
  C("zombie", "ZombieZugzwang", 61, "stille", -100),
  C("bolle", "DobbelBolle", 65, "felle", 10),
  C("politi", "PolitiPatt", 20, "mur", -40),
  C("feltlege", "FeltLegen", 12, "slutt", 30),
  C("soldat", "Soldat_e5", 13, "mur", 60),
  C("hette", "HetteGenser", 42, "stille", -10),
  C("mullet", "Mulletmesteren", 43, "sprell", -30),
  C("kaps", "KapsKongen", 49, "lyn", 50),
  C("lua", "LuaPåSnei", 48, "sprell", -90),
  C("skjegg", "SkjeggSpringer", 38, "slutt", 90),
  C("hipster", "HipsterHest", 21, "gambit", -50),
  C("slips", "SlipsSjakk", 19, "mur", 70),
  C("brille", "BrilleBonde", 5, "felle", 0),
  C("bestefar", "BestefarBlitz", 71, "lyn", -70),
];
export const rivalDef = (id: string): RivalDef | undefined => CAST.find((c) => c.id === id);

export type RivalRec = {
  elo: number;
  /** Day first met. */
  met: string;
  /** Score from the player's side. */
  w: number;
  d: number;
  l: number;
  friend: "no" | "asked" | "yes" | "declined";
  last: { day: string; outcome: Outcome } | null;
};
export type Encounter = { id: string; rival: string; kind: "wild" | "rematch"; day: string; tc: TimeControl; color: "w" | "b"; text: string };
export type Note = { id: string; t: number; rival: string; kind: "spotted" | "request" | "accepted" | "challenge"; text: string; read: boolean; enc?: string };
export type RivalState = {
  version: 1;
  recs: Record<string, RivalRec>;
  encounters: Encounter[];
  notes: Note[];
  /** Today's tallies, so the world is lively but never nags. */
  today: { day: string; wild: number; rematch: number; requests: number; lastAt: number };
  /** Regions (1–7) where Skyggen has been beaten. */
  shadow: number[];
};
export const emptyRivals = (): RivalState => ({ version: 1, recs: {}, encounters: [], notes: [], today: { day: "", wild: 0, rematch: 0, requests: 0, lastAt: 0 }, shadow: [] });
export function migrateRivals(raw: unknown): RivalState {
  const base = emptyRivals();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<RivalState>;
  return {
    version: 1,
    recs: r.recs && typeof r.recs === "object" ? r.recs : {},
    encounters: Array.isArray(r.encounters) ? r.encounters.filter((e) => e && typeof e.id === "string" && !!rivalDef(e.rival)) : [],
    notes: Array.isArray(r.notes) ? r.notes.filter((n) => n && typeof n.id === "string") : [],
    today: { ...base.today, ...(r.today && typeof r.today === "object" ? r.today : {}) },
    shadow: Array.isArray(r.shadow) ? r.shadow.filter((n) => Number.isInteger(n)) : [],
  };
}

export const WILD_PER_DAY = 3;
export const REMATCH_PER_DAY = 2;
export const REQUESTS_PER_DAY = 1;
export const WILD_GAP_MS = 10 * 60_000;
export const REMATCH_GAP_MS = 20 * 60_000;
export const NOTES_MAX = 30;
export const FIRST_WIN_XP = 20;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
const pick = <T,>(xs: readonly T[], r: () => number): T => xs[Math.floor(r() * xs.length) % xs.length]!;
const clampElo = (n: number) => Math.max(900, Math.min(2400, Math.round(n / 10) * 10));

/** Score as text from the given side, e.g. "2–1" (draws count half). */
export function h2h(rec: RivalRec | undefined, side: "me" | "rival" = "me"): string {
  const mine = (rec?.w ?? 0) + (rec?.d ?? 0) / 2, theirs = (rec?.l ?? 0) + (rec?.d ?? 0) / 2;
  const f = (x: number) => (Number.isInteger(x) ? String(x) : `${Math.floor(x) || ""}½`);
  return side === "me" ? `${f(mine)}–${f(theirs)}` : `${f(theirs)}–${f(mine)}`;
}
export const gamesOf = (rec: RivalRec | undefined): number => (rec ? rec.w + rec.d + rec.l : 0);

function line(list: string[], rec: RivalRec | undefined, r: () => number): string {
  return pick(list, r).replace("{h2h}", h2h(rec, "rival"));
}
/** What a rival says when asking for a rematch – depends on the score between them. */
export function rematchText(def: RivalDef, rec: RivalRec | undefined, r: () => number): string {
  const p = PERSONAS[def.persona];
  if (!rec || gamesOf(rec) === 0) return line(p.challenge, rec, r);
  const diff = rec.l - rec.w;
  return line(diff > 0 ? p.ahead : diff < 0 ? p.behind : p.even, rec, r);
}

/** Start of a new day: yesterday's encounters are gone, and friends have trained towards the player's level. */
export function withDay(s: RivalState, day: string, rating: number): RivalState {
  if (s.today.day === day) return s;
  const recs: Record<string, RivalRec> = {};
  for (const [id, rec] of Object.entries(s.recs)) {
    const def = rivalDef(id);
    const target = rating + (def?.offset ?? 0);
    recs[id] = s.today.day && def ? { ...rec, elo: clampElo(rec.elo + (target - rec.elo) * 0.25) } : rec;
  }
  return { ...s, recs, encounters: s.encounters.filter((e) => e.day === day), today: { day, wild: 0, rematch: 0, requests: 0, lastAt: 0 } };
}

const note = (s: RivalState, n: Omit<Note, "id" | "read">): Note[] => [...s.notes, { ...n, id: `n${n.t.toString(36)}${s.notes.length}`, read: false }].slice(-NOTES_MAX);

/** May a new mysterious player appear now? */
export function wildDue(s: RivalState, day: string, now: number): boolean {
  if (s.today.day !== day) return true;
  if (s.encounters.some((e) => e.kind === "wild")) return false;
  if (s.today.wild >= WILD_PER_DAY) return false;
  return s.today.wild === 0 || now - s.today.lastAt >= WILD_GAP_MS;
}

/** A player spots him on the map: mostly someone new, sometimes a face he has met. */
export function spawnWild(s0: RivalState, rating: number, day: string, now: number): RivalState {
  const s = withDay(s0, day, rating);
  if (!wildDue(s, day, now)) return s;
  const r = rng(hash(`${day}:wild:${s.today.wild}:${Object.keys(s.recs).length}`));
  const busy = new Set(s.encounters.map((e) => e.rival));
  const unmet = CAST.filter((c) => !s.recs[c.id] && !busy.has(c.id));
  const met = CAST.filter((c) => s.recs[c.id] && !busy.has(c.id) && s.recs[c.id]!.last?.day !== day);
  const pool = unmet.length && (met.length === 0 || r() < 0.7) ? unmet : met.length ? met : unmet;
  if (!pool.length) return s;
  const def = pick(pool, r);
  const rec = s.recs[def.id];
  const p = PERSONAS[def.persona];
  const enc: Encounter = { id: `e${now.toString(36)}${s.today.wild}`, rival: def.id, kind: "wild", day, tc: p.tc, color: r() < 0.5 ? "w" : "b", text: rematchText(def, rec, r) };
  const text = rec ? `${def.alias} har fått øye på deg igjen!` : "En mystisk spiller har fått øye på deg!";
  return { ...s, encounters: [...s.encounters, enc], notes: note(s, { t: now, rival: def.id, kind: "spotted", text, enc: enc.id }), today: { ...s.today, wild: s.today.wild + 1, lastAt: now } };
}

/** May a friend send a rematch challenge now? */
export function rematchDue(s: RivalState, day: string, now: number): boolean {
  if (s.today.day !== day) return false;
  if (s.today.rematch >= REMATCH_PER_DAY || s.encounters.some((e) => e.kind === "rematch")) return false;
  if (now - s.today.lastAt < REMATCH_GAP_MS) return false;
  return Object.entries(s.recs).some(([id, rec]) => rec.friend === "yes" && rec.last?.day !== day && !!rivalDef(id));
}
export function spawnRematch(s0: RivalState, rating: number, day: string, now: number): RivalState {
  const s = withDay(s0, day, rating);
  if (!rematchDue(s, day, now)) return s;
  const r = rng(hash(`${day}:rematch:${s.today.rematch}`));
  const friends = CAST.filter((c) => s.recs[c.id]?.friend === "yes" && s.recs[c.id]!.last?.day !== day);
  if (!friends.length) return s;
  const def = pick(friends, r);
  const p = PERSONAS[def.persona];
  const text = rematchText(def, s.recs[def.id], r);
  const enc: Encounter = { id: `e${now.toString(36)}r${s.today.rematch}`, rival: def.id, kind: "rematch", day, tc: p.tc, color: r() < 0.5 ? "w" : "b", text };
  return { ...s, encounters: [...s.encounters, enc], notes: note(s, { t: now, rival: def.id, kind: "challenge", text: `${def.alias} utfordrer deg: «${text}»`, enc: enc.id }), today: { ...s.today, rematch: s.today.rematch + 1, lastAt: now } };
}

/** Someone he played on an earlier day and never added: on some days one of them asks. */
export function requestDue(s: RivalState, day: string): string | null {
  if (s.today.day !== day || s.today.requests >= REQUESTS_PER_DAY) return null;
  if (Object.values(s.recs).some((r) => r.friend === "asked")) return null;
  const r = rng(hash(`${day}:hello`));
  if (r() >= 0.6) return null;
  const old = CAST.filter((c) => s.recs[c.id]?.friend === "no" && !!s.recs[c.id]!.last && s.recs[c.id]!.last!.day < day);
  return old.length ? pick(old, r).id : null;
}
export function spawnRequest(s: RivalState, day: string, now: number): RivalState {
  const id = requestDue(s, day);
  const def = id ? rivalDef(id) : undefined;
  if (!id || !def) return s;
  const r = rng(hash(`${day}:hello:${id}`));
  return {
    ...s,
    recs: { ...s.recs, [id]: { ...s.recs[id]!, friend: "asked" } },
    notes: note(s, { t: now, rival: id, kind: "request", text: `${def.alias} vil legge deg til: «${pick(PERSONAS[def.persona].request, r)}»` }),
    today: { ...s.today, requests: s.today.requests + 1 },
  };
}

/** The world ticks – one thing at a time: an old acquaintance asks to be added, a friend wants a rematch, or a new face appears. */
export function tick(s: RivalState, rating: number, day: string, now: number): RivalState {
  let next = withDay(s, day, rating);
  if (requestDue(next, day)) next = spawnRequest(next, day, now);
  else if (rematchDue(next, day, now)) next = spawnRematch(next, rating, day, now);
  else if (wildDue(next, day, now)) next = spawnWild(next, rating, day, now);
  return next;
}

/** The player challenges a rival he knows (from Rivalboken): always allowed. */
export function withChallenge(s0: RivalState, rivalId: string, rating: number, day: string, now: number): { s: RivalState; enc: Encounter | null } {
  const def = rivalDef(rivalId);
  const s = withDay(s0, day, rating);
  if (!def || !s.recs[rivalId]) return { s, enc: null };
  const open = s.encounters.find((e) => e.rival === rivalId);
  if (open) return { s, enc: open };
  const r = rng(hash(`${day}:mine:${rivalId}:${gamesOf(s.recs[rivalId])}`));
  const enc: Encounter = { id: `e${now.toString(36)}m`, rival: rivalId, kind: "rematch", day, tc: PERSONAS[def.persona].tc, color: r() < 0.5 ? "w" : "b", text: rematchText(def, s.recs[rivalId], r) };
  return { s: { ...s, encounters: [...s.encounters, enc] }, enc };
}

export function withDecline(s: RivalState, encId: string): RivalState {
  return { ...s, encounters: s.encounters.filter((e) => e.id !== encId), notes: s.notes.map((n) => (n.enc === encId ? { ...n, read: true } : n)) };
}

/** Rating a rival shows up with the first time. */
export function firstElo(def: RivalDef, rating: number, day: string): number {
  const r = rng(hash(`${def.id}:${day}`));
  return clampElo(rating + def.offset + (r() - 0.5) * 60);
}

/**
 * A game against a rival ended. Records the score, lets the rival train a bit
 * after a loss, clears the encounter, and – after a good game – the rival may
 * ask to be added.
 */
export function withGame(s0: RivalState, rivalId: string, outcome: Outcome, elo: number, day: string, now: number, encId?: string | undefined): RivalState {
  const def = rivalDef(rivalId);
  if (!def) return s0;
  const s = s0.today.day === day ? s0 : { ...s0, today: { day, wild: 0, rematch: 0, requests: 0, lastAt: 0 } };
  const prev: RivalRec = s.recs[rivalId] ?? { elo, met: day, w: 0, d: 0, l: 0, friend: "no", last: null };
  let rec: RivalRec = {
    ...prev,
    elo: clampElo(prev.elo + (outcome === "win" ? 12 : outcome === "loss" ? -4 : 0)),
    w: prev.w + (outcome === "win" ? 1 : 0),
    d: prev.d + (outcome === "draw" ? 1 : 0),
    l: prev.l + (outcome === "loss" ? 1 : 0),
    last: { day, outcome },
  };
  let notes = s.notes.map((n) => (encId && n.enc === encId ? { ...n, read: true } : n));
  let today = s.today;
  const r = rng(hash(`${rivalId}:req:${gamesOf(rec)}`));
  // A win or a draw usually earns a request; a loss sometimes ("du var nær").
  if (rec.friend === "no" && today.requests < REQUESTS_PER_DAY && r() < (outcome === "loss" ? 0.35 : 0.8)) {
    rec = { ...rec, friend: "asked" };
    notes = [...notes, { id: `n${now.toString(36)}q`, t: now, rival: rivalId, kind: "request" as const, text: `${def.alias} vil legge deg til: «${pick(PERSONAS[def.persona].request, r)}»`, read: false }].slice(-NOTES_MAX);
    today = { ...today, requests: today.requests + 1 };
  }
  return { ...s, recs: { ...s.recs, [rivalId]: rec }, encounters: s.encounters.filter((e) => e.id !== encId && e.rival !== rivalId), notes, today };
}

export function withRequestAnswer(s: RivalState, rivalId: string, accept: boolean, now: number): RivalState {
  const def = rivalDef(rivalId);
  const rec = s.recs[rivalId];
  if (!def || !rec || rec.friend !== "asked") return s;
  const r = rng(hash(`${rivalId}:acc`));
  let notes = s.notes.map((n) => (n.rival === rivalId && n.kind === "request" ? { ...n, read: true } : n));
  if (accept) notes = [...notes, { id: `n${now.toString(36)}a`, t: now, rival: rivalId, kind: "accepted" as const, text: `${def.alias}: «${pick(PERSONAS[def.persona].accepted, r)}»`, read: false }].slice(-NOTES_MAX);
  return { ...s, recs: { ...s.recs, [rivalId]: { ...rec, friend: accept ? "yes" : "declined" } }, notes };
}

export const withNotesRead = (s: RivalState): RivalState => (s.notes.some((n) => !n.read && n.kind !== "request") ? { ...s, notes: s.notes.map((n) => (n.kind === "request" ? n : { ...n, read: true })) } : s);
export const unread = (s: RivalState): number => s.notes.filter((n) => !n.read).length;
export const pendingRequests = (s: RivalState): string[] => Object.entries(s.recs).filter(([, r]) => r.friend === "asked").map(([id]) => id);
export const rivalbook = (s: RivalState): { met: number; beaten: number; friends: number; total: number } => {
  const recs = Object.values(s.recs);
  return { met: recs.length, beaten: recs.filter((r) => r.w > 0).length, friends: recs.filter((r) => r.friend === "yes").length, total: CAST.length };
};

/** A rival shaped like a ladder opponent for /parti. Cached: the game screen keys effects on identity. */
const cache = new Map<string, Opponent>();
export function rivalOpponent(id: string, rec: RivalRec | undefined, rating: number, day: string): Opponent | undefined {
  const def = rivalDef(id.startsWith("rival:") ? id.slice(6) : id);
  if (!def) return undefined;
  const elo = rec?.elo ?? firstElo(def, rating, day);
  const secret = gamesOf(rec) === 0;
  const key = `${def.id}:${elo}:${secret}`;
  let o = cache.get(key);
  if (!o) {
    const p = PERSONAS[def.persona];
    o = { id: `rival:${def.id}`, name: def.alias, elo, emoji: "👾", hue: (def.figure * 53) % 360, portrait: `/figures/${def.figure}.png`, style: p.style, line: p.challenge[0]!, winLine: p.lost[0]!, tempo: p.tempo, ...(secret ? { secret: true } : {}) };
    cache.set(key, o);
  }
  return o;
}
export const isRivalOpponent = (id: string | undefined): boolean => !!id && id.startsWith("rival:");

/** Mike before a game against a rival (English). */
export function rivalIntro(def: RivalDef, rec: RivalRec | undefined): string {
  if (gamesOf(rec) === 0) return `Never seen ${def.alias} before. Unknown rating, unknown style. Play ten solid moves and find out who they are.`;
  const diff = (rec?.w ?? 0) - (rec?.l ?? 0);
  if (diff > 0) return `${def.alias} again. You lead ${h2h(rec)} – they'll come at you differently this time. Stay sharp.`;
  if (diff < 0) return `${def.alias}. ${h2h(rec, "rival")} to them. You know what went wrong last time – don't give them the same gift.`;
  return `${def.alias}, ${h2h(rec)}. Dead even. This one decides who brags.`;
}

// ---- Skyggen: the shadow that waits in every region ----

export const SHADOW_ELO = [1510, 1580, 1660, 1740, 1820, 1910, 2010];
export const SHADOW_XP = 40;
export const SHADOW_COINS = 20;
/** What Skyggen says in each region – the class motto turned inside out – and when it falls. */
export const SHADOW_LINES: { taunt: string; fall: string }[] = [
  { taunt: "Du lar brikker stå i slag. Jeg lever av sånt.", fall: "Du hang ingenting. Én feil mindre … vi ses høyere oppe." },
  { taunt: "Du slår uten å se hva som kommer tilbake. Slå i vei.", fall: "Du sjekket alle slag. Jeg blir svakere. Videre opp." },
  { taunt: "Du flytter uten grunn. Hvert trekk uten plan er mitt.", fall: "Hvert trekk hadde en grunn. Jeg finner deg i neste dal." },
  { taunt: "Kongen din gjemmer seg i sluttspillet. Min gjør ikke det.", fall: "Kongen din gikk først. Jeg trekker meg tilbake – denne gangen." },
  { taunt: "Tårnene dine står feil. Fribonden min takker.", fall: "Tårnet bak fribonden. Du har lært. Tåka venter." },
  { taunt: "Du spiller trekk. Jeg spiller planer.", fall: "Du hadde planen før trekket. Det er nesten ikke noe igjen av meg." },
  { taunt: "Siste gang. Alt du noen gang har gjort feil – det er meg.", fall: "Jeg var aldri en motstander. Jeg var feilene dine. Du trenger meg ikke lenger." },
];
export const shadowOpponentId = (region: number) => `shadow:${region}`;
export const isShadowOpponent = (id: string | undefined): boolean => !!id && id.startsWith("shadow:");
export const shadowRegion = (id: string | undefined): number => (isShadowOpponent(id) ? Number(id!.slice(7)) : 0);
const shadowCache = new Map<number, Opponent>();
export function shadowOpponent(id: string): Opponent | undefined {
  const n = shadowRegion(id);
  if (!Number.isInteger(n) || n < 1 || n > SHADOW_ELO.length) return undefined;
  let o = shadowCache.get(n);
  if (!o) {
    o = { id: shadowOpponentId(n), name: "Skyggen", elo: SHADOW_ELO[n - 1]!, emoji: "🌑", hue: 275, portrait: "/rivals/shadow.svg", style: "Følger deg oppover fjellet", line: SHADOW_LINES[n - 1]!.taunt, winLine: SHADOW_LINES[n - 1]!.fall, secret: true, tempo: "steady" };
    shadowCache.set(n, o);
  }
  return o;
}
/**
 * One-time bonus for a win off the ladder: the first win over a rival, or Skyggen falling in a region.
 * `credits` are the progress credits already paid; returns null when there is nothing (more) to pay.
 */
export function winBonus(credits: Record<string, number>, opp: string | undefined, outcome: Outcome): { id: string; xp: number; coins: number } | null {
  if (outcome !== "win" || !opp) return null;
  const b = isRivalOpponent(opp) && rivalDef(opp.slice(6)) ? { id: `rival:${opp.slice(6)}:first`, xp: FIRST_WIN_XP, coins: 0 }
    : isShadowOpponent(opp) && shadowOpponent(opp) ? { id: `shadow:${shadowRegion(opp)}`, xp: SHADOW_XP, coins: SHADOW_COINS }
    : null;
  return b && credits[b.id] === undefined ? b : null;
}
export const shadowBeaten = (s: RivalState, region: number): boolean => s.shadow.includes(region);
export const withShadowWin = (s: RivalState, region: number): RivalState => (s.shadow.includes(region) ? s : { ...s, shadow: [...s.shadow, region].sort((a, b) => a - b) });
export function shadowIntro(region: number): string {
  return region >= SHADOW_LINES.length
    ? "The Shadow, one last time. Everything it knows, it learned from your old games. You're not that player any more."
    : `The Shadow. It plays like your worst habits – that's the whole trick. Region ${region}: don't give it the mistake it's waiting for.`;
}
