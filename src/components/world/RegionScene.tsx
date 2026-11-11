import { useMemo, useState, type CSSProperties } from "react";
import { Check, Clapperboard, Crown, DoorClosed, DoorOpen, GraduationCap, Lock, Puzzle, Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Scenery } from "./Scenery";
import { rivalDef, type Encounter, type RivalState } from "@/lib/rivals";
import { SCENE_W, nodePos, sceneHeight, type MapNode, type RegionView } from "@/lib/world";

const ICON: Record<MapNode["kind"], typeof Check> = { school: GraduationCap, puzzles: Puzzle, gym: Trophy, kino: Clapperboard, arena: Trophy, shadow: Lock, gate: DoorClosed, throne: Crown };

/**
 * One region of the world: the painted scene, its places along the road, the
 * player standing at the next thing to do, and the rivals who have spotted him.
 */
export function RegionScene({ view, hereId, encounters = [], rivals, onNode, onEncounter, window: win }: {
  view: RegionView;
  /** Show only these places (indices into the region's list) – the home screen's window around the player. */
  window?: { from: number; to: number } | undefined;
  hereId?: string | undefined;
  encounters?: Encounter[];
  rivals?: RivalState | undefined;
  onNode: (node: MapNode) => void;
  onEncounter?: ((e: Encounter) => void) | undefined;
}) {
  const { region, state } = view;
  const from = win?.from ?? 0;
  const nodes = win ? view.nodes.slice(win.from, win.to) : view.nodes;
  const h = sceneHeight(nodes.length);
  const pts = useMemo(() => nodes.map((_, i) => nodePos(region.n, i, nodes.length, i + from)), [region.n, nodes.length, from]); // eslint-disable-line react-hooks/exhaustive-deps
  const [hint, setHint] = useState<string | null>(null);
  const at = (p: { x: number; y: number }): CSSProperties => ({ left: `${(p.x / SCENE_W) * 100}%`, top: `${(p.y / h) * 100}%` });
  const hereIdx = nodes.findIndex((x) => x.id === hereId);
  const here = hereIdx >= 0 ? pts[hereIdx]! : null;
  const fog = state === "fog";
  const tap = (node: MapNode) => {
    if (node.state === "locked") { setHint(`${node.title}: ${node.why ?? "Låst"}`); window.setTimeout(() => setHint(null), 3800); return; }
    onNode(node);
  };
  return (
    <section className={`world__region is-${state} is-${region.biome}`} style={{ aspectRatio: `${SCENE_W} / ${h}` }} aria-label={fog ? "Ukjent land" : `${region.name}, region ${region.n}`} data-testid={`region-${region.n}`} data-state={state}>
      <Scenery region={region} height={h} points={pts} />
      <div className="world__banner">
        <p className="world__banner-eyebrow">Region {region.n}{state === "current" ? " · du er her" : state === "past" ? " · fullført" : ""}</p>
        <p className="world__banner-name">{fog ? "???" : region.name}</p>
        <p className="world__banner-sub">{fog ? "Ingen vet hva som venter her oppe" : `${region.from}–${region.to} · «${region.motto}»`}</p>
      </div>
      {!fog && nodes.map((node, i) => {
        const Icon = node.kind === "gate" && node.state !== "locked" ? DoorOpen : ICON[node.kind];
        return (
          <button key={node.id} type="button" className={`world__node is-${node.kind} is-${node.state} ${node.id === hereId ? "is-here" : ""}`} style={at(pts[i]!)} onClick={() => tap(node)} aria-label={`${node.title} – ${node.sub}`} data-testid={`node-${node.kind}${node.ref ? `-${node.ref}` : ""}`} data-state={node.state}>
            <span className="world__pin">
              {node.img ? <img src={node.img} alt="" draggable={false} /> : <Icon />}
              {node.state === "done" && <span className="world__badge is-done"><Check /></span>}
              {node.state === "locked" && <span className="world__badge is-locked"><Lock /></span>}
            </span>
            <span className="world__label"><b>{node.title}</b><small>{node.sub}</small></span>
          </button>
        );
      })}
      {here && state === "current" && (
        <span className="world__me" style={{ ...at(here), ["--dx" as string]: here.x > SCENE_W / 2 ? "-64px" : "64px" }} aria-label="Du er her"><PlayerAvatar className="size-11" /></span>
      )}
      {here && state === "current" && encounters.map((e, i) => {
        const def = rivalDef(e.rival);
        if (!def) return null;
        const known = !!rivals?.recs[e.rival];
        // Around the player, away from the road: first on the free side of the place, the next ones behind the player.
        const free = here.x > SCENE_W / 2 ? 1 : -1;
        const spot = [{ dx: free * 96, dy: -30 }, { dx: -free * 122, dy: -64 }, { dx: free * 100, dy: -108 }][i % 3]!;
        const x = Math.max(40, Math.min(SCENE_W - 40, here.x + spot.dx));
        const y = Math.max(100, here.y + spot.dy);
        return (
          <button key={e.id} type="button" className="world__rival" style={at({ x, y })} onClick={() => onEncounter?.(e)} aria-label={known ? `${def.alias} utfordrer deg` : "En mystisk spiller utfordrer deg"} data-testid="rival-marker">
            <span className="world__bang" aria-hidden>!</span>
            <span className={`world__face ${known ? "" : "is-unknown"}`}><img src={`/figures/${def.figure}.png`} alt="" draggable={false} /></span>
            <span className="world__label"><b>{known ? def.alias : "???"}</b></span>
          </button>
        );
      })}
      {state === "next" && <p className="world__ribbon"><Lock className="size-3.5" /> Åpner når du består eksamen</p>}
      {fog && <div className="world__fog" aria-hidden><i /><i /><i /></div>}
      {hint && <p className="world__hint" role="status">{hint}</p>}
    </section>
  );
}
