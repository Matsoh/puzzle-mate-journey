import { describe, expect, it } from "vitest";
import { ARENAS, REGIONS, SCENE_W, gymRegion, heroWindow, hereNode, nodePos, nodeTarget, regionNodes, regionState, sceneHeight, worldView, type WorldCtx } from "./world";
import { OPPONENTS } from "./opponents";
import { CLASSES } from "./curriculum";

const C: WorldCtx = { cls: 1, rating: 1520, beaten: [], periods: 0, schoolDone: false, examOpen: false, puzzlesDone: 0, puzzlesTotal: 5, kinoTitle: "Caro-Kann på ti minutter", kinoSeen: false, shadow: [], tourOpen: { begynner: true, amator: true, proff: false } };
const kinds = (n: number, c: WorldCtx) => regionNodes(REGIONS[n - 1]!, c).map((x) => x.kind);

describe("the world", () => {
  it("has seven regions that climb from 1500 to 2000 without gaps, one per class", () => {
    expect(REGIONS).toHaveLength(CLASSES.length);
    expect(REGIONS[0]!.from).toBe(1500);
    expect(REGIONS.at(-1)!.to).toBe(2000);
    for (let i = 1; i < REGIONS.length; i++) expect(REGIONS[i]!.from).toBe(REGIONS[i - 1]!.to);
    expect(new Set(REGIONS.map((r) => r.name)).size).toBe(7);
    expect(new Set(REGIONS.map((r) => r.biome)).size).toBe(7);
    REGIONS.forEach((r, i) => expect(r.motto).toBe(CLASSES[i]!.motto));
  });
  it("puts every ladder boss in a region, the strongest at the top", () => {
    const by = (id: string) => gymRegion(OPPONENTS.find((o) => o.id === id)!.elo);
    expect(by("pelle")).toBe(1);
    expect([by("kaos"), by("mia")]).toEqual([2, 2]);
    expect(by("leo")).toBe(3);
    expect(by("storm")).toBe(7);
    expect(by("mike")).toBe(7);
    for (const o of OPPONENTS) expect(gymRegion(o.elo)).toBeGreaterThanOrEqual(1);
    expect(Object.keys(ARENAS).map(Number)).toEqual([1, 3, 6]);
  });
  it("lays out the current region: school, puzzles, gym, cinema, arena, Skyggen, gate", () => {
    expect(kinds(1, C)).toEqual(["school", "puzzles", "gym", "kino", "arena", "shadow", "gate"]);
    const nodes = regionNodes(REGIONS[0]!, C);
    expect(nodes.find((x) => x.kind === "gym")).toMatchObject({ ref: "pelle", state: "open", img: "/bots/1.png" });
    expect(nodes.find((x) => x.kind === "gate")).toMatchObject({ state: "locked", title: "Porten til Gaffelskogen", sub: "Eksamen på fredag" });
    expect(regionNodes(REGIONS[0]!, { ...C, examOpen: true }).find((x) => x.kind === "gate")!.state).toBe("open");
    expect(nodes.find((x) => x.kind === "shadow")!.state).toBe("open");
    expect(regionNodes(REGIONS[0]!, { ...C, shadow: [1] }).find((x) => x.kind === "shadow")!.state).toBe("done");
    expect(regionNodes(REGIONS[0]!, { ...C, tourOpen: { ...C.tourOpen, begynner: false } }).find((x) => x.kind === "arena")!.state).toBe("locked");
  });
  it("keeps the regions ahead mysterious: no Skyggen, locked school and gyms", () => {
    expect(kinds(2, C)).toEqual(["school", "gym", "gym", "gate"]);
    const ahead = regionNodes(REGIONS[1]!, C);
    expect(ahead.every((x) => x.state === "locked")).toBe(true);
    expect(ahead[1]!.why).toMatch(/Neil Down/);
    // ladder progress shows through even before he gets there
    expect(regionNodes(REGIONS[1]!, { ...C, beaten: ["pelle"] })[1]!.state).toBe("open");
    expect([1, 2, 3, 4].map((n) => regionState(n, 1))).toEqual(["current", "next", "fog", "fog"]);
    expect([1, 2, 3].map((n) => regionState(n, 3))).toEqual(["past", "past", "current"]);
    expect(regionState(7, 8)).toBe("current"); // graduated: still at the top
  });
  it("shows the road behind as done, with Skyggen still waiting if he was skipped", () => {
    const c = { ...C, cls: 3, beaten: ["pelle", "kaos"], shadow: [2] };
    const r1 = regionNodes(REGIONS[0]!, c);
    expect(r1.map((x) => `${x.kind}:${x.state}`)).toEqual(["school:done", "gym:done", "arena:open", "shadow:open", "gate:done"]);
    expect(regionNodes(REGIONS[1]!, c).find((x) => x.kind === "shadow")!.state).toBe("done");
  });
  it("hides Mike until ET has fallen and crowns the throne at 2000", () => {
    const top = { ...C, cls: 7, beaten: OPPONENTS.slice(0, 9).map((o) => o.id) };
    expect(regionNodes(REGIONS[6]!, top).filter((x) => x.kind === "gym").map((x) => x.ref)).toEqual(["ivar", "storm"]);
    const all = { ...top, beaten: OPPONENTS.slice(0, 10).map((o) => o.id) };
    expect(regionNodes(REGIONS[6]!, all).filter((x) => x.kind === "gym").map((x) => x.ref)).toEqual(["ivar", "storm", "mike"]);
    expect(regionNodes(REGIONS[6]!, all).at(-1)).toMatchObject({ kind: "throne", state: "locked" });
    expect(regionNodes(REGIONS[6]!, { ...all, rating: 2004 }).at(-1)).toMatchObject({ kind: "throne", state: "done" });
  });
  it("stands the player at the first thing still to do", () => {
    expect(hereNode(worldView(C))!.kind).toBe("school");
    expect(hereNode(worldView({ ...C, schoolDone: true }))!.kind).toBe("puzzles");
    expect(hereNode(worldView({ ...C, schoolDone: true, puzzlesDone: 5 }))!.kind).toBe("gym");
    expect(hereNode(worldView({ ...C, schoolDone: true, puzzlesDone: 5, beaten: ["pelle"] }))!.kind).toBe("kino");
    expect(hereNode(worldView({ ...C, schoolDone: true, puzzlesDone: 5, beaten: ["pelle"], kinoSeen: true }))!.kind).toBe("arena");
    expect(hereNode(worldView({ ...C, schoolDone: true, puzzlesDone: 5, beaten: ["pelle"], kinoSeen: true, examOpen: true }))!.kind).toBe("gate");
  });
  it("shows the home screen a window that walks up the region with the player", () => {
    const nodes = regionNodes(REGIONS[0]!, C);
    expect(heroWindow(nodes, nodes[0]!.id)).toEqual({ from: 0, to: 4 });
    expect(heroWindow(nodes, nodes[1]!.id)).toEqual({ from: 0, to: 4 });
    expect(heroWindow(nodes, nodes[2]!.id)).toEqual({ from: 1, to: 5 });
    expect(heroWindow(nodes, nodes[6]!.id)).toEqual({ from: 3, to: 7 });
    expect(heroWindow(nodes, undefined)).toEqual({ from: 0, to: 4 });
    expect(heroWindow(nodes.slice(0, 2), nodes[1]!.id)).toEqual({ from: 0, to: 2 });
    // the bends of the road are the same in the window as in the whole region
    expect(nodePos(1, 0, 4, 2).x).toBe(nodePos(1, 2, 7).x);
  });
  it("leads every place somewhere and keeps the places inside the scene", () => {
    for (const v of worldView({ ...C, cls: 7, beaten: OPPONENTS.map((o) => o.id) })) {
      const h = sceneHeight(v.nodes.length);
      v.nodes.forEach((node, i) => {
        const pos = nodePos(v.region.n, i, v.nodes.length);
        expect(pos.x).toBeGreaterThan(60);
        expect(pos.x).toBeLessThan(SCENE_W - 60);
        expect(pos.y).toBeGreaterThan(80);
        expect(pos.y).toBeLessThan(h - 40);
        if (node.kind !== "shadow") expect(nodeTarget(node)).not.toBeNull();
      });
    }
    expect(nodeTarget(regionNodes(REGIONS[0]!, C).find((x) => x.kind === "gym")!)).toEqual({ to: "/stigen", boss: "pelle" });
  });
});
