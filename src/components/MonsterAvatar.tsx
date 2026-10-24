import { useId } from "react";
import { cn } from "@/lib/utils";
import type { PartKey } from "@/lib/avatar";

const COLORS: Record<string, [string, string]> = {
  green: ["#2b6a3b", "#1c4a2a"], blue: ["#2f5f9e", "#1d3f6e"], purple: ["#6a3f9e", "#452868"], orange: ["#d2702a", "#9a4c17"],
  pink: ["#d9579a", "#a23a70"], black: ["#2b2b33", "#141418"], gold: ["#d9a93a", "#9c7418"],
};

const BODIES: Record<string, string> = {
  box: "M40 52 Q100 34 160 52 Q172 130 162 206 Q130 224 100 218 Q70 224 38 206 Q28 130 40 52 Z",
  round: "M100 40 C150 40 172 90 170 140 C168 190 140 222 100 222 C60 222 32 190 30 140 C28 90 50 40 100 40 Z",
  tall: "M55 30 Q100 18 145 30 Q160 120 150 212 Q100 226 50 212 Q40 120 55 30 Z",
  blob: "M60 60 Q100 20 150 60 Q190 120 160 180 Q130 230 90 215 Q30 200 40 140 Q30 90 60 60 Z",
};

function Eye({ x, y, r, angry, laser }: { x: number; y: number; r: number; angry?: boolean; laser?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="mike__eye">
        <circle r={r + 7} fill="#f3f1e3" />
        <circle r={r} fill={laser ? "#ff3b3b" : "#7fb3e6"} />
        <circle cx={2} cy={1} r={r * 0.48} fill="#10120f" />
        <circle cx={-r * 0.2} cy={-r * 0.25} r={r * 0.14} fill="#fff" opacity="0.9" />
      </g>
      {angry && <path d={`M${-r - 8} ${-r - 10} L${r + 4} ${-r - 2}`} stroke="#0e2a17" strokeWidth="6" strokeLinecap="round" />}
      {laser && <path d={`M${r} 0 L${r + 70} -12 M${r} 0 L${r + 70} 12`} stroke="#ff3b3b" strokeWidth="3" opacity="0.8" strokeLinecap="round" />}
    </g>
  );
}

export function MonsterAvatar({ parts, className, animate = false }: { parts: Record<PartKey, string>; className?: string | undefined; animate?: boolean }) {
  const [c1, c2] = COLORS[parts.color] ?? COLORS["green"]!;
  const body = BODIES[parts.body] ?? BODIES["box"]!;
  const gid = `mb${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const eyeR = 22;
  return (
    <svg viewBox="0 0 200 250" role="img" aria-label="Din avatar" className={cn("mike", animate && "mike--float", className)}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs>
      {parts.extra === "cape" && <path d="M30 70 Q100 50 170 70 L185 230 Q100 205 15 230 Z" fill="#b3202a" />}
      {/* horns */}
      {parts.horns === "red" && <><path d="M38 60 L50 12 L80 50 Z" fill="#c8302e" /><path d="M162 60 L150 12 L120 50 Z" fill="#d4504f" /></>}
      {parts.horns === "blue" && <><path d="M38 60 L50 12 L80 50 Z" fill="#3a8fd9" /><path d="M162 60 L150 12 L120 50 Z" fill="#5aa6e8" /></>}
      {parts.horns === "curly" && <><path d="M48 58 C20 40 30 5 60 12 C75 16 70 36 58 32 C50 29 52 20 60 20" fill="none" stroke="#e0c050" strokeWidth="10" strokeLinecap="round" /><path d="M152 58 C180 40 170 5 140 12 C125 16 130 36 142 32 C150 29 148 20 140 20" fill="none" stroke="#e0c050" strokeWidth="10" strokeLinecap="round" /></>}
      {parts.horns === "crown" && <path d="M50 52 L58 14 L80 40 L100 8 L120 40 L142 14 L150 52 Z" fill="#f3c640" stroke="#b58a12" strokeWidth="3" />}
      {/* body */}
      <path d={body} fill={`url(#${gid})`} />
      <path d={body} fill="none" stroke="#0a0a0a" strokeOpacity="0.55" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" />
      {/* feet */}
      <path d="M48 206 Q60 198 76 206 L74 234 Q60 240 46 232 Z" fill="#4a2a1d" />
      <path d="M124 206 Q140 198 152 206 L154 232 Q140 240 126 234 Z" fill="#4a2a1d" />
      {/* eyes */}
      {parts.eyes === "one" && <Eye x={100} y={104} r={eyeR + 4} />}
      {parts.eyes === "two" && <><Eye x={72} y={104} r={eyeR - 4} /><Eye x={128} y={104} r={eyeR - 4} /></>}
      {parts.eyes === "three" && <><Eye x={64} y={110} r={14} /><Eye x={100} y={92} r={16} /><Eye x={136} y={110} r={14} /></>}
      {parts.eyes === "angry" && <><Eye x={72} y={106} r={16} angry /><Eye x={128} y={106} r={16} angry /></>}
      {parts.eyes === "laser" && <><Eye x={72} y={104} r={16} laser /><Eye x={128} y={104} r={16} laser /></>}
      {parts.extra === "shades" && <g><rect x="46" y="90" width="50" height="30" rx="8" fill="#111" /><rect x="104" y="90" width="50" height="30" rx="8" fill="#111" /><path d="M96 100 L104 100" stroke="#111" strokeWidth="4" /></g>}
      {/* mouth */}
      {parts.mouth === "grin" && <g><path d="M52 146 L156 152 L140 186 L74 180 Z" fill="#f3f1e3" /><path d="M60 152 L148 158 L134 180 L78 175 Z" fill="none" stroke="#10120f" strokeWidth="3" strokeDasharray="7 6" /></g>}
      {parts.mouth === "smile" && <path d="M62 150 Q100 190 138 150" fill="none" stroke="#10120f" strokeWidth="6" strokeLinecap="round" />}
      {parts.mouth === "fangs" && <g><path d="M58 148 Q100 184 142 148 Z" fill="#10120f" /><path d="M72 150 L78 170 L84 150 Z M116 150 L122 170 L128 150 Z" fill="#f3f1e3" /></g>}
      {parts.mouth === "tongue" && <g><path d="M60 150 Q100 188 140 150 Z" fill="#10120f" /><ellipse cx="108" cy="172" rx="14" ry="18" fill="#e85d8a" /></g>}
      {parts.mouth === "zip" && <g><path d="M56 160 L144 160" stroke="#c9c9c9" strokeWidth="8" strokeLinecap="round" /><path d="M64 160 L136 160" stroke="#444" strokeWidth="2" strokeDasharray="4 5" /><rect x="130" y="150" width="12" height="20" rx="3" fill="#c9c9c9" /></g>}
      {/* extras */}
      {parts.extra === "scarf" && <path d="M44 196 Q100 212 156 196 L158 214 Q100 230 42 214 Z M130 206 L150 240" fill="#c8302e" stroke="#c8302e" strokeWidth="12" strokeLinecap="round" />}
      {parts.extra === "bow" && <path d="M100 200 L70 186 L70 214 Z M100 200 L130 186 L130 214 Z" fill="#f3c640" />}
      {parts.extra === "knight" && <text x="158" y="206" fontSize="44" textAnchor="middle">♞</text>}
    </svg>
  );
}
