import { useId, useMemo, type ReactNode } from "react";
import { rng } from "@/lib/tour";
import { SCENE_W, type Biome, type Region } from "@/lib/world";

// The painted backdrop of a region: ground, a few landmarks of its biome and
// the winding road through the places. All procedural SVG (seeded per region),
// so the map costs no image downloads and looks the same on every device.

type P = { x: number; y: number };

const PALETTE: Record<Biome, { a: string; b: string; blob: string; road: string; edge: string; dash: string }> = {
  meadow: { a: "#6fbf5f", b: "#4a9c50", blob: "#86d06d", road: "#ecd49a", edge: "#8a6a3c", dash: "#fff3cf" },
  forest: { a: "#3f8452", b: "#255c3d", blob: "#4e9a60", road: "#d9bf88", edge: "#5d4526", dash: "#f3e3b8" },
  river: { a: "#63b07a", b: "#3f8a66", blob: "#7cc48c", road: "#e9d29b", edge: "#7a5a33", dash: "#fff1c9" },
  plains: { a: "#dcbb5a", b: "#b9923f", blob: "#ecd07a", road: "#f1dfb0", edge: "#8c6a35", dash: "#fff6dc" },
  cliffs: { a: "#a2978b", b: "#776c62", blob: "#b8aea2", road: "#e6d3ae", edge: "#5c5045", dash: "#fbf0d6" },
  mist: { a: "#6f8ca8", b: "#48627e", blob: "#86a2bc", road: "#dfe6ee", edge: "#3b5169", dash: "#ffffff" },
  castle: { a: "#eaf2fb", b: "#bcd0e6", blob: "#ffffff", road: "#f6e9c8", edge: "#8795ab", dash: "#ffffff" },
};

/** Smooth road through the places (Catmull–Rom as cubic Béziers), entering from below and leaving at the top. */
export function roadPath(pts: P[], h: number): string {
  const all: P[] = [{ x: SCENE_W / 2, y: h + 30 }, ...pts, { x: SCENE_W / 2, y: -30 }];
  let d = `M${all[0]!.x} ${all[0]!.y}`;
  for (let i = 0; i < all.length - 1; i++) {
    const p0 = all[Math.max(0, i - 1)]!, p1 = all[i]!, p2 = all[i + 1]!, p3 = all[Math.min(all.length - 1, i + 2)]!;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x} ${p2.y}`;
  }
  return d;
}
function roadSamples(pts: P[], h: number): P[] {
  const all: P[] = [{ x: SCENE_W / 2, y: h + 30 }, ...pts, { x: SCENE_W / 2, y: -30 }];
  const out: P[] = [];
  for (let i = 0; i < all.length - 1; i++) for (let t = 0; t < 1; t += 0.1) out.push({ x: all[i]!.x + (all[i + 1]!.x - all[i]!.x) * t, y: all[i]!.y + (all[i + 1]!.y - all[i]!.y) * t });
  return out;
}
const clear = (x: number, y: number, road: P[], min: number) => road.every((s) => (s.x - x) ** 2 + (s.y - y) ** 2 > min * min);
function scatter(r: () => number, n: number, h: number, road: P[], min: number, top = 0): P[] {
  const out: P[] = [];
  for (let tries = 0; out.length < n && tries < n * 12; tries++) {
    const x = 14 + r() * (SCENE_W - 28), y = top + 16 + r() * (h - top - 32);
    if (clear(x, y, road, min) && out.every((o) => (o.x - x) ** 2 + (o.y - y) ** 2 > 22 * 22)) out.push({ x, y });
  }
  return out.sort((a, b) => a.y - b.y);
}

const Tree = ({ x, y, s = 1, c = "#2f8a43", c2 = "#3fa554" }: P & { s?: number; c?: string; c2?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="13" rx="12" ry="4" fill="#000" opacity=".16" />
    <rect x="-2.5" y="2" width="5" height="11" rx="2" fill="#6b4a2b" />
    <circle cx="0" cy="-5" r="12" fill={c} /><circle cx="-5" cy="-9" r="7" fill={c2} /><circle cx="5" cy="-2" r="6" fill={c2} opacity=".7" />
  </g>
);
const Pine = ({ x, y, s = 1, c = "#1f6a44", snow = false }: P & { s?: number; c?: string; snow?: boolean }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="14" rx="10" ry="3.5" fill="#000" opacity=".18" />
    <rect x="-2" y="8" width="4" height="7" fill="#5b3f24" />
    <path d="M0 -24 L11 -6 H-11Z M0 -15 L13 4 H-13Z M0 -6 L15 12 H-15Z" fill={c} />
    {snow && <path d="M0 -24 L5 -16 H-5Z M-8 -2 L0 -13 8 -2 4 -4 0 -1 -4 -4Z" fill="#fff" opacity=".9" />}
  </g>
);
const House = ({ x, y, roof = "#c8553d" }: P & { roof?: string }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx="0" cy="13" rx="17" ry="4" fill="#000" opacity=".16" />
    <rect x="-12" y="-4" width="24" height="17" rx="2" fill="#f4e6c8" /><path d="M-16 -3 L0 -17 16 -3Z" fill={roof} />
    <rect x="-3" y="3" width="6" height="10" rx="1" fill="#8a5a35" /><rect x="5" y="1" width="5" height="5" fill="#9ad0f0" />
  </g>
);
const Rock = ({ x, y, s = 1, c = "#6a6058", c2 = "#b4aa9e" }: P & { s?: number; c?: string; c2?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="9" rx="15" ry="4" fill="#000" opacity=".2" />
    <path d="M-14 9 L-9 -8 2 -14 12 -4 15 9Z" fill={c} /><path d="M-9 -8 L2 -14 4 -3 -5 2Z" fill={c2} opacity=".8" />
  </g>
);
const Tower = ({ x, y, s = 1, flag = "#d94c4c" }: P & { s?: number; flag?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="18" rx="13" ry="4" fill="#000" opacity=".2" />
    <rect x="-9" y="-16" width="18" height="34" fill="#c7beb1" /><rect x="-9" y="-16" width="6" height="34" fill="#aaa093" />
    <path d="M-12 -16 V-24 H-7 V-20 H-2.5 V-24 H2.5 V-20 H7 V-24 H12 V-16Z" fill="#d6cdc0" />
    <rect x="-2.5" y="2" width="5" height="8" rx="2.5" fill="#4a4038" />
    <path d="M0 -24 V-38" stroke="#4a4038" strokeWidth="1.5" /><path className="world__flag" d="M0 -38 L11 -34 0 -30Z" fill={flag} />
  </g>
);
const Mountain = ({ x, y, s = 1, c = "#8196ad" }: P & { s?: number; c?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-34 20 L0 -34 34 20Z" fill={c} /><path d="M0 -34 L34 20 H6Z" fill="#000" opacity=".12" />
    <path d="M0 -34 L11 -16 5 -19 0 -13 -5 -19 -11 -16Z" fill="#f4f8fc" />
  </g>
);
const Flowers = ({ x, y, c }: P & { c: string }) => (
  <g transform={`translate(${x} ${y})`}><circle cx="-4" cy="0" r="2.2" fill={c} /><circle cx="3" cy="-3" r="2.2" fill={c} /><circle cx="4" cy="4" r="2.2" fill={c} /><circle cx="-4" cy="0" r=".9" fill="#fff8" /><circle cx="3" cy="-3" r=".9" fill="#fff8" /></g>
);
const Banner = ({ x, y, c }: P & { c: string }) => (
  <g transform={`translate(${x} ${y})`}><path d="M0 12 V-18" stroke="#6b4a2b" strokeWidth="2.2" strokeLinecap="round" /><path className="world__flag" d="M1 -18 H15 L11 -12 15 -6 H1Z" fill={c} /></g>
);
const Stone = ({ x, y }: P) => (
  <g transform={`translate(${x} ${y})`}><ellipse cx="0" cy="9" rx="8" ry="3" fill="#000" opacity=".18" /><rect x="-5" y="-14" width="10" height="24" rx="4" fill="#9b958a" /><rect x="-5" y="-14" width="4" height="24" rx="2" fill="#7f796f" /></g>
);
const Castle = ({ x, y }: P) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx="0" cy="34" rx="78" ry="10" fill="#7f93ad" opacity=".35" />
    <rect x="-52" y="-8" width="104" height="42" fill="#d5deeb" /><rect x="-52" y="-8" width="104" height="8" fill="#bcc8d9" />
    <path d="M-52 -8 V-16 H-44 V-11 H-36 V-16 H-28 V-11 H-20 V-16 H-12 V-11 H12 V-16 H20 V-11 H28 V-16 H36 V-11 H44 V-16 H52 V-8Z" fill="#e3eaf4" />
    {[-58, 58].map((tx) => <g key={tx} transform={`translate(${tx} 0)`}><rect x="-12" y="-34" width="24" height="68" fill="#c9d3e2" /><path d="M-15 -34 L0 -62 15 -34Z" fill="#6a4fc4" /><rect x="-3" y="-20" width="6" height="10" rx="3" fill="#4a5670" /></g>)}
    <rect x="-16" y="-52" width="32" height="86" fill="#dfe6f1" /><path d="M-20 -52 L0 -88 20 -52Z" fill="#7a5ad6" />
    <path d="M0 -88 V-104" stroke="#4a5670" strokeWidth="2" /><path className="world__flag" d="M0 -104 L16 -98 0 -92Z" fill="#f2c94c" />
    <path d="M-9 34 V12 A9 9 0 0 1 9 12 V34Z" fill="#4a5670" /><rect x="-4" y="-36" width="8" height="12" rx="4" fill="#4a5670" />
  </g>
);

function props(biome: Biome, n: number, h: number, pts: P[]): ReactNode[] {
  const r = rng(n * 7919 + 13);
  const road = roadSamples(pts, h);
  const out: ReactNode[] = [];
  const k = (p: string, i: number) => `${p}${i}`;
  const density = Math.max(1, h / 520);
  switch (biome) {
    case "meadow": {
      scatter(r, Math.round(16 * density), h, road, 30).forEach((p, i) => out.push(<Flowers key={k("f", i)} {...p} c={["#ffd84d", "#ff8fb3", "#ffffff", "#ffa94d"][i % 4]!} />));
      const spots = scatter(r, Math.round(12 * density), h, road, 52);
      spots.forEach((p, i) => out.push(i % 5 === 2 ? <House key={k("h", i)} {...p} roof={i % 2 ? "#c8553d" : "#d98a3d"} /> : <Tree key={k("t", i)} {...p} s={0.8 + r() * 0.5} />));
      break;
    }
    case "forest": {
      scatter(r, Math.round(44 * density), h, road, 40).forEach((p, i) => out.push(<Pine key={k("p", i)} {...p} s={0.75 + r() * 0.6} c={["#1f6a44", "#18573a", "#27774d"][i % 3]!} />));
      scatter(r, Math.round(8 * density), h, road, 28).forEach((p, i) => out.push(<g key={k("m", i)} transform={`translate(${p.x} ${p.y})`}><rect x="-1.5" y="0" width="3" height="5" fill="#f1e6d0" /><path d="M-6 1 A6 5 0 0 1 6 1Z" fill="#d9483b" /><circle cx="-2" cy="-1" r="1" fill="#fff" /><circle cx="2.5" cy="-.5" r=".8" fill="#fff" /></g>));
      scatter(r, Math.round(10 * density), h, road, 20).forEach((p, i) => out.push(<circle key={k("ff", i)} className="world__firefly" style={{ animationDelay: `${(i * 0.7) % 4}s` }} cx={p.x} cy={p.y} r="1.8" fill="#f8f29a" />));
      break;
    }
    case "river": {
      scatter(r, Math.round(14 * density), h, road, 50).forEach((p, i) => out.push(<Tree key={k("t", i)} {...p} s={0.8 + r() * 0.4} c="#2e8f58" c2="#46ab6d" />));
      scatter(r, Math.round(10 * density), h, road, 30).forEach((p, i) => out.push(<Flowers key={k("f", i)} {...p} c={i % 2 ? "#8fd3ff" : "#ffffff"} />));
      break;
    }
    case "plains": {
      scatter(r, Math.round(8 * density), h, road, 40).forEach((p, i) => out.push(<Stone key={k("s", i)} {...p} />));
      scatter(r, Math.round(8 * density), h, road, 50).forEach((p, i) => out.push(<Tree key={k("t", i)} {...p} s={0.8 + r() * 0.4} c={i % 2 ? "#d9822b" : "#c9662b"} c2={i % 2 ? "#efa24a" : "#e08a3a"} />));
      road.filter((_, i) => i % 9 === 4).forEach((p, i) => out.push(<Banner key={k("b", i)} x={p.x + (i % 2 ? 30 : -30)} y={p.y} c={i % 2 ? "#d94c4c" : "#3a78d4"} />));
      break;
    }
    case "cliffs": {
      scatter(r, Math.round(18 * density), h, road, 44).forEach((p, i) => out.push(i % 4 === 1 ? <Tower key={k("w", i)} {...p} s={0.8 + r() * 0.5} flag={i % 8 === 1 ? "#d94c4c" : "#f2c94c"} /> : <Rock key={k("r", i)} {...p} s={0.8 + r() * 0.9} />));
      break;
    }
    case "mist": {
      scatter(r, Math.round(9 * density), h, road, 62).forEach((p, i) => out.push(<Mountain key={k("mo", i)} {...p} s={0.8 + r() * 0.7} c={i % 2 ? "#8196ad" : "#6f86a0"} />));
      scatter(r, Math.round(16 * density), h, road, 38).forEach((p, i) => out.push(<Pine key={k("p", i)} {...p} s={0.7 + r() * 0.4} c="#2b5a63" />));
      break;
    }
    case "castle": {
      scatter(r, Math.round(22 * density), h, road, 42, 150).forEach((p, i) => out.push(i % 5 === 3 ? <Rock key={k("r", i)} {...p} s={0.8 + r() * 0.6} c="#8fa3bd" c2="#ffffff" /> : <Pine key={k("p", i)} {...p} s={0.75 + r() * 0.5} c="#2f6a63" snow />));
      break;
    }
  }
  return out;
}

export function Scenery({ region, height, points }: { region: Region; height: number; points: P[] }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const pal = PALETTE[region.biome];
  const d = useMemo(() => roadPath(points, height), [points, height]);
  const decor = useMemo(() => props(region.biome, region.n, height, points), [region, height, points]);
  const blobs = useMemo(() => { const r = rng(region.n * 101); return Array.from({ length: Math.round(height / 70) }, () => ({ x: r() * SCENE_W, y: r() * height, rx: 30 + r() * 60, ry: 14 + r() * 26 })); }, [region.n, height]);
  // The river crosses where the road is: a wooden deck along the road makes the bridge.
  const riverY = height * 0.52;
  const deck = useMemo(() => {
    const road = roadSamples(points, height);
    let best = 0;
    road.forEach((s, i) => { if (Math.abs(s.y - riverY) < Math.abs(road[best]!.y - riverY)) best = i; });
    const a = road[Math.max(0, best - 3)]!, b = road[Math.min(road.length - 1, best + 3)]!;
    return { a, b };
  }, [points, height, riverY]);
  return (
    <svg className="world__svg" viewBox={`0 0 ${SCENE_W} ${height}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={pal.a} /><stop offset="1" stopColor={pal.b} /></linearGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#141c3a" /><stop offset=".7" stopColor="#3a4f86" stopOpacity=".9" /><stop offset="1" stopColor="#3a4f86" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width={SCENE_W} height={height} fill={`url(#g${id})`} />
      {blobs.map((b, i) => <ellipse key={i} cx={b.x} cy={b.y} rx={b.rx} ry={b.ry} fill={pal.blob} opacity=".28" />)}
      {region.biome === "plains" && Array.from({ length: Math.round(height / 46) }, (_, i) => <path key={i} d={`M-10 ${i * 46 + 20} Q100 ${i * 46 + 8} 200 ${i * 46 + 22} T410 ${i * 46 + 16}`} stroke="#a37f33" strokeWidth="1.5" fill="none" opacity=".35" />)}
      {region.biome === "castle" && <><rect width={SCENE_W} height="170" fill={`url(#s${id})`} />{Array.from({ length: 26 }, (_, i) => <circle key={i} className="world__star" style={{ animationDelay: `${(i * 0.37) % 3}s` }} cx={(i * 67) % SCENE_W} cy={8 + ((i * 41) % 110)} r={i % 4 === 0 ? 1.6 : 1} fill="#fff" />)}</>}
      {region.biome === "river" && (
        <g>
          <path d={`M-20 ${riverY - 14} C80 ${riverY - 44} 150 ${riverY + 26} 220 ${riverY + 2} S340 ${riverY - 34} 420 ${riverY + 6}`} stroke="#2f8fc9" strokeWidth="54" fill="none" strokeLinecap="round" />
          <path d={`M-20 ${riverY - 14} C80 ${riverY - 44} 150 ${riverY + 26} 220 ${riverY + 2} S340 ${riverY - 34} 420 ${riverY + 6}`} stroke="#4fb3ea" strokeWidth="40" fill="none" strokeLinecap="round" />
          <path className="world__water" d={`M-20 ${riverY - 18} C80 ${riverY - 48} 150 ${riverY + 22} 220 ${riverY - 2} S340 ${riverY - 38} 420 ${riverY + 2}`} stroke="#bfe6fb" strokeWidth="2.5" fill="none" strokeDasharray="14 22" strokeLinecap="round" />
          <path className="world__water" d={`M-20 ${riverY - 4} C80 ${riverY - 34} 150 ${riverY + 36} 220 ${riverY + 12} S340 ${riverY - 24} 420 ${riverY + 16}`} stroke="#bfe6fb" strokeWidth="2" fill="none" strokeDasharray="10 26" strokeLinecap="round" opacity=".8" />
          <path d={`M${deck.a.x} ${deck.a.y} L${deck.b.x} ${deck.b.y}`} stroke="#5a3a1e" strokeWidth="46" />
          <path d={`M${deck.a.x} ${deck.a.y} L${deck.b.x} ${deck.b.y}`} stroke="#8a5f38" strokeWidth="38" strokeDasharray="5 3" />
        </g>
      )}
      <path d={d} stroke={pal.edge} strokeWidth="31" fill="none" strokeLinecap="round" opacity=".55" />
      <path d={d} stroke={pal.road} strokeWidth="25" fill="none" strokeLinecap="round" />
      <path d={d} stroke={pal.dash} strokeWidth="2.5" fill="none" strokeDasharray="7 11" strokeLinecap="round" opacity=".8" />
      {decor}
      {region.biome === "castle" && <Castle x={SCENE_W / 2} y={104} />}
      {region.biome === "mist" && [0.18, 0.44, 0.7, 0.9].map((f, i) => <rect key={i} className="world__mist" style={{ animationDelay: `${-i * 5}s` }} x={-80 + i * 40} y={height * f} width="330" height="26" rx="13" fill="#fff" opacity=".22" />)}
    </svg>
  );
}
