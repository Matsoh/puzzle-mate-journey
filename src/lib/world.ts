// Veien til 2000 as a world: seven regions (one per school class) from
// Bondelandsbyen up to Mesterborgen, each with its places – the school, the
// gyms (ladder bosses), the arena, Skyggen and the gate (the exam). Pure view
// model for the map; tested in world.test.ts.
import { CLASSES } from "./curriculum";
import { OPPONENTS, isUnlocked, ratingLabel } from "./opponents";
import type { Tier } from "./tour-bots";

export type Biome = "meadow" | "forest" | "river" | "plains" | "cliffs" | "mist" | "castle";
export type Region = { n: number; name: string; biome: Biome; from: number; to: number; motto: string; tale: string };

const R = (n: number, name: string, biome: Biome, tale: string): Region => ({ n, name, biome, from: n === 1 ? 1500 : CLASSES[n - 2]!.ratingTo, to: CLASSES[n - 1]!.ratingTo, motto: CLASSES[n - 1]!.motto, tale });
export const REGIONS: Region[] = [
  R(1, "Bondelandsbyen", "meadow", "Her begynner alle. Grønne enger, glade bønder og den første gymmen."),
  R(2, "Gaffelskogen", "forest", "Mellom trærne lurer gafler og dobbeltangrep. Se deg for."),
  R(3, "Bindingselva", "river", "Elva binder alt sammen. Brua åpner seg for den som ser bindingene."),
  R(4, "Kongeveien", "plains", "Veien kongene selv går til kamp. Her vinnes sluttspillene."),
  R(5, "Tårnklippene", "cliffs", "Høye klipper og enda høyere tårn. Fribøndene klatrer her."),
  R(6, "Tåkefjellet", "mist", "I tåka vinner den som har en plan før trekket."),
  R(7, "Mesterborgen", "castle", "Borgen på toppen. Bare 2000-spillere slipper inn til tronen."),
];
export const regionOf = (n: number): Region => REGIONS[Math.min(REGIONS.length, Math.max(1, n)) - 1]!;

/** Which region a ladder boss guards (by rating; the strongest live at the top). */
export function gymRegion(elo: number): number {
  const r = REGIONS.find((x) => elo <= x.to);
  return r ? r.n : REGIONS.length;
}
/** The arenas along the way. */
export const ARENAS: Record<number, { tier: Tier; name: string }> = { 1: { tier: "begynner", name: "Begynner-arenaen" }, 3: { tier: "amator", name: "Amatør-arenaen" }, 6: { tier: "proff", name: "Proff-arenaen" } };

export type NodeKind = "school" | "puzzles" | "gym" | "kino" | "arena" | "shadow" | "gate" | "throne";
export type NodeState = "done" | "open" | "locked";
export type MapNode = {
  id: string;
  kind: NodeKind;
  region: number;
  title: string;
  sub: string;
  state: NodeState;
  /** Boss id, arena tier … */
  ref?: string;
  /** Portrait for gyms and Skyggen. */
  img?: string;
  /** Why it is locked (shown when tapped). */
  why?: string;
};
export type RegionState = "past" | "current" | "next" | "fog";
export type RegionView = { region: Region; state: RegionState; nodes: MapNode[] };

export type WorldCtx = {
  /** Current class 1–7; 8 = graduated. */
  cls: number;
  rating: number;
  beaten: string[];
  /** School periods done today (0–4) and whether the day is closed. */
  periods: number;
  schoolDone: boolean;
  examOpen: boolean;
  /** Daily puzzles: solved or tried today / total. */
  puzzlesDone: number;
  puzzlesTotal: number;
  kinoTitle: string;
  kinoSeen: boolean;
  shadow: number[];
  tourOpen: Record<Tier, boolean>;
};

/** A region's places, in walking order from the bottom of the region to its gate. */
export function regionNodes(region: Region, c: WorldCtx): MapNode[] {
  const n = region.n;
  const cur = Math.min(c.cls, REGIONS.length);
  const here = n === cur && c.cls <= REGIONS.length;
  const reached = n <= c.cls;
  const out: MapNode[] = [];
  const cls = CLASSES[n - 1]!;
  if (here) {
    out.push({ id: `r${n}:school`, kind: "school", region: n, title: "Mike Skolen", sub: c.schoolDone ? "Skoledagen er fullført" : `${cls.name} · ${c.periods}/4 timer i dag`, state: c.schoolDone ? "done" : "open" });
    const left = Math.max(0, c.puzzlesTotal - c.puzzlesDone);
    out.push({ id: `r${n}:puzzles`, kind: "puzzles", region: n, title: "Oppgavelunden", sub: left ? `${c.puzzlesDone}/${c.puzzlesTotal} av dagens oppgaver` : "Dagens oppgaver er løst", state: left ? "open" : "done" });
  } else {
    out.push({ id: `r${n}:school`, kind: "school", region: n, title: `Skolen · ${cls.name}`, sub: n < c.cls ? "Bestått" : "Åpner når du kommer hit", state: n < c.cls ? "done" : "locked", why: `Bestå eksamen i ${CLASSES[Math.max(0, n - 2)]!.name} for å komme til ${region.name}.` });
  }
  for (const o of OPPONENTS) {
    if (gymRegion(o.elo) !== n) continue;
    const idx = OPPONENTS.indexOf(o);
    const beaten = c.beaten.includes(o.id);
    const unlocked = isUnlocked(idx, c.beaten);
    // Mike himself stays hidden until ET has fallen.
    if (o.secret && !unlocked) continue;
    const prev = OPPONENTS[idx - 1];
    out.push({ id: `r${n}:gym:${o.id}`, kind: "gym", region: n, title: o.name, sub: beaten ? "Slått" : `Gymleder · ${ratingLabel(o)}`, state: beaten ? "done" : unlocked ? "open" : "locked", ref: o.id, img: o.portrait, ...(prev ? { why: `Slå ${prev.name} først.` } : {}) });
  }
  if (here) out.push({ id: `r${n}:kino`, kind: "kino", region: n, title: "Kinosalen", sub: c.kinoSeen ? "Dagens video er sett" : c.kinoTitle, state: c.kinoSeen ? "done" : "open" });
  const arena = ARENAS[n];
  if (arena) out.push({ id: `r${n}:arena`, kind: "arena", region: n, title: arena.name, sub: "Turnering · 10 spillere, 5 runder", state: c.tourOpen[arena.tier] ? "open" : "locked", ref: arena.tier, why: "Pallplass i nivået under – eller høy nok rating – åpner arenaen." });
  if (reached) {
    const down = c.shadow.includes(n);
    out.push({ id: `r${n}:shadow`, kind: "shadow", region: n, title: "Skyggen", sub: down ? "Beseiret her" : "Venter på deg …", state: down ? "done" : "open", img: "/rivals/shadow.svg" });
  }
  if (n < REGIONS.length) {
    const next = REGIONS[n]!;
    const passed = c.cls > n;
    out.push({ id: `r${n}:gate`, kind: "gate", region: n, title: `Porten til ${next.name}`, sub: passed ? "Åpen" : here ? (c.examOpen ? "Eksamen er åpen i dag!" : "Eksamen på fredag") : "Stengt", state: passed ? "done" : here && c.examOpen ? "open" : "locked", why: here ? `Porten åpner når du består eksamen i ${cls.name}. Den holdes på fredager etter fire skoledager.` : `Du må først gjennom ${region.name}.` });
  } else {
    const crowned = c.rating >= 2000;
    out.push({ id: `r${n}:throne`, kind: "throne", region: n, title: "Tronen", sub: crowned ? "Du er en 2000-spiller!" : `2000 i rating · du har ${c.rating}`, state: crowned ? "done" : "locked", why: `Tronen er for den som når 2000 i rating. Du har ${c.rating} – ${Math.max(0, 2000 - c.rating)} igjen.` });
  }
  return out;
}

export function regionState(n: number, cls: number): RegionState {
  const cur = Math.min(cls, REGIONS.length);
  return n < cur ? "past" : n === cur ? "current" : n === cur + 1 ? "next" : "fog";
}

/** The whole world, bottom region first. */
export function worldView(c: WorldCtx): RegionView[] {
  return REGIONS.map((region) => ({ region, state: regionState(region.n, c.cls), nodes: regionNodes(region, c) }));
}

/** Where the player stands: the first thing still to do in the current region. */
export function hereNode(view: RegionView[]): MapNode | undefined {
  const cur = view.find((v) => v.state === "current");
  if (!cur) return undefined;
  return cur.nodes.find((x) => x.state === "open" && x.kind !== "arena" && x.kind !== "shadow") ?? cur.nodes.find((x) => x.state === "open") ?? cur.nodes[cur.nodes.length - 1];
}

/** Where a tap on a place leads. */
export function nodeTarget(node: MapNode): { to: "/trener" | "/pusler" | "/stigen" | "/kino" | "/turnering" | "/fremgang"; boss?: string } | null {
  switch (node.kind) {
    case "school": case "gate": return { to: "/trener" };
    case "puzzles": return { to: "/pusler" };
    case "gym": return node.ref ? { to: "/stigen", boss: node.ref } : { to: "/stigen" };
    case "kino": return { to: "/kino" };
    case "arena": return { to: "/turnering" };
    case "throne": return { to: "/fremgang" };
    case "shadow": return null;
  }
}

/** Geometry shared by the scenery and the place markers: a 400-wide scene, places on a winding road. */
export const SCENE_W = 400;
export const NODE_DY = 124;
export const PAD_TOP = 118;
export const PAD_BOTTOM = 98;
export const sceneHeight = (nodes: number): number => PAD_TOP + PAD_BOTTOM + Math.max(0, nodes - 1) * NODE_DY;
/**
 * Position of place `i` (0 = lowest) in a scene of `count` places. `phase` is the place's index in the whole
 * region, so a window on the region keeps the same bends in the road.
 */
export function nodePos(regionN: number, i: number, count: number, phase = i): { x: number; y: number } {
  const h = sceneHeight(count);
  const y = h - PAD_BOTTOM - i * NODE_DY;
  const x = SCENE_W / 2 + 96 * Math.sin(phase * 1.35 + regionN * 0.9);
  return { x: Math.round(x), y };
}

/** The home screen shows a window of the region around the player: the place behind him and what is next. */
export function heroWindow(nodes: MapNode[], hereId: string | undefined, size = 4): { from: number; to: number } {
  const i = Math.max(0, nodes.findIndex((x) => x.id === hereId));
  const to = Math.min(nodes.length, Math.max(0, i - 1) + size);
  return { from: Math.max(0, to - size), to };
}
