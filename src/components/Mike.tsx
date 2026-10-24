import { cn } from "@/lib/utils";
import type { MikeMood } from "@/lib/mike";
import type { ReactNode } from "react";

/**
 * Mike — drawn from the hand-sewn felt monster: dark green body, two red
 * horns, one blue eye, a big lopsided white grin with stitches, brown feet.
 * Pure SVG so it scales from a 40px bubble icon to a full hero.
 */
export function Mike({ mood = "chill", className, animate = true }: { mood?: MikeMood | undefined; className?: string | undefined; animate?: boolean }) {
  const eyeR = mood === "shock" ? 30 : mood === "happy" ? 27 : 24;
  const pupil = mood === "think" ? { dx: 7, dy: -7 } : mood === "shock" ? { dx: 0, dy: 0 } : { dx: 2, dy: 1 };
  return (
    <svg viewBox="0 0 200 250" role="img" aria-label={`Mike, ${mood}`} className={cn("mike", animate && "mike--float", className)} data-mood={mood}>
      <defs>
        <linearGradient id="mike-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b6a3b" />
          <stop offset="1" stopColor="#1c4a2a" />
        </linearGradient>
        <filter id="mike-felt" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0" result="g" />
          <feComposite in="g" in2="SourceGraphic" operator="in" result="t" />
          <feBlend in="SourceGraphic" in2="t" mode="multiply" />
        </filter>
      </defs>
      {/* horns */}
      <path d="M38 60 L50 12 L80 50 Z" fill="#c8302e" />
      <path d="M162 60 L150 12 L120 50 Z" fill="#d4504f" />
      <path d="M48 30 L58 44 M54 24 L66 40" stroke="#f0a1a0" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 4" />
      <path d="M152 30 L142 44 M146 24 L134 40" stroke="#f0a1a0" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 4" />
      {/* body */}
      <path d="M40 52 Q100 34 160 52 Q172 130 162 206 Q130 224 100 218 Q70 224 38 206 Q28 130 40 52 Z" fill="url(#mike-body)" filter="url(#mike-felt)" />
      {/* blanket stitch along the edge */}
      <path d="M40 52 Q100 34 160 52 Q172 130 162 206 Q130 224 100 218 Q70 224 38 206 Q28 130 40 52 Z" fill="none" stroke="#0e2a17" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" />
      {/* feet */}
      <path d="M48 206 Q60 198 76 206 L74 234 Q60 240 46 232 Z" fill="#4a2a1d" />
      <path d="M124 206 Q140 198 152 206 L154 232 Q140 240 126 234 Z" fill="#4a2a1d" />
      {/* eye */}
      <g transform="translate(86 104)"><g className="mike__eye">
        {mood === "sleep" ? (
          <path d={`M${-eyeR} 4 Q0 ${eyeR * 0.7} ${eyeR} 4`} fill="none" stroke="#f3f1e3" strokeWidth="6" strokeLinecap="round" />
        ) : (
          <>
            <circle r={eyeR + 8} fill="#f3f1e3" />
            <circle r={eyeR} fill="#7fb3e6" />
            <circle r={eyeR * 0.78} fill="none" stroke="#dfeeff" strokeWidth="2.5" strokeDasharray="6 7" />
            <circle className="mike__pupil" cx={pupil.dx} cy={pupil.dy} r={eyeR * 0.48} fill="#10120f" />
            <circle cx={pupil.dx - eyeR * 0.18} cy={pupil.dy - eyeR * 0.2} r={eyeR * 0.14} fill="#fff" opacity="0.9" />
          </>
        )}
        {mood === "think" && <path d={`M${-eyeR - 6} ${-eyeR - 14} L${eyeR + 2} ${-eyeR - 22}`} stroke="#0e2a17" strokeWidth="6" strokeLinecap="round" />}
      </g></g>
      {/* mouth */}
      {mood === "shock" ? (
        <ellipse cx="104" cy="168" rx="16" ry="20" fill="#f3f1e3" stroke="#10120f" strokeWidth="3" strokeDasharray="5 5" />
      ) : (
        <g>
          <path d={mood === "happy" ? "M48 142 L160 150 L150 190 L70 182 Z" : "M52 146 L156 152 L140 186 L74 180 Z"} fill="#f3f1e3" />
          <path d={mood === "happy" ? "M56 148 L152 155 L144 183 L74 177 Z" : "M60 152 L148 158 L134 180 L78 175 Z"} fill="none" stroke="#10120f" strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" />
        </g>
      )}
      {mood === "sleep" && <text x="150" y="80" fontSize="26" fontWeight="700" fill="#f3f1e3" className="mike__zzz">z</text>}
    </svg>
  );
}

/** Mike talking: avatar + speech bubble. */
export function MikeSays({ mood = "chill", children, className, big = false }: { mood?: MikeMood | undefined; children: ReactNode; className?: string | undefined; big?: boolean }) {
  return (
    <div className={cn("flex items-end gap-3", big ? "sm:gap-5" : "", className)}>
      <Mike mood={mood} className={cn("shrink-0", big ? "w-28 sm:w-40" : "w-12")} />
      <div className={cn("mike-bubble min-w-0 flex-1", big ? "text-base sm:text-lg" : "text-sm")}>
        <span className="mike-bubble__name">Mike</span>
        {children}
      </div>
    </div>
  );
}
