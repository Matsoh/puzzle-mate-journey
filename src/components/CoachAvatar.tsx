import { useState } from "react";
import { cn } from "@/lib/utils";
import { COACH_NAME } from "@/lib/coach-config";

export function CoachAvatar({ className }: { className?: string }) {
  const [unavailable, setUnavailable] = useState(false);
  return (
    <div className={cn("coach-portrait relative shrink-0 overflow-hidden rounded-full", className)}>
      <GoblinAvatar className="size-full" />
      {!unavailable && <img src="/coach-champ.png" alt={COACH_NAME} onError={() => setUnavailable(true)} className="absolute inset-0 size-full rounded-full object-cover" />}
    </div>
  );
}

/** Stone-knight fallback while the fictional coach portrait is unavailable. */
function GoblinAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("shrink-0", className)} aria-hidden>
      <circle cx="50" cy="50" r="48" fill="var(--background)" stroke="var(--border)" strokeWidth="2" />
      <g stroke="var(--stone-ink)" strokeWidth="3" strokeLinejoin="round">
        <path d="M67 18 L77 23 L82 37 L87 46 L87 62 L83 77 L63 81 L53 65 L56 40 Z" fill="var(--stone-dark)" />
        <path d="M31 83 Q56 63 43 53 L28 59 L17 55 L18 44 L32 34 L40 21 L44 10 L56 24 L68 12 L68 30 Q80 53 71 83 Z" fill="var(--stone)" />
        <path d="M19 49 L33 46 L39 51 L29 55 Z" fill="var(--stone-ink)" strokeWidth="1" />
        <path d="M30 49 L33 54 L36 48" fill="var(--stone-highlight)" strokeWidth="1" />
        <path d="M37 35 L52 30 L48 40 L39 41 Z" fill="var(--toxic-glow)" strokeWidth="2" />
        <path d="M35 34 L54 28 L56 34 L37 39 Z" fill="var(--stone-light)" />
        <ellipse cx="24" cy="44" rx="3" ry="4" fill="var(--stone-ink)" strokeWidth="1" />
        <path d="M29 56 L29 65 L33 57 M42 55 L41 68 L45 56" fill="var(--moss)" strokeWidth="1" />
        <path d="M57 42 L61 51 L55 59 M67 64 L61 69 L64 79 M44 18 L48 26" fill="none" strokeWidth="1.5" />
        <path d="M25 82 L76 82 L80 88 L20 88 Z M20 88 L80 88 L84 94 L16 94 Z" fill="var(--stone-dark)" />
      </g>
      <path d="M73 87 Q51 74 33 91 M71 81 L75 73 M22 90 L19 82" fill="none" stroke="var(--moss)" strokeWidth="3" />
      <g fill="var(--stone-ink)"><circle cx="64" cy="56" r="2" /><circle cx="57" cy="70" r="1.5" /><circle cx="49" cy="45" r="1" /></g>
    </svg>
  );
}

export function CoachBubble({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <CoachAvatar className="size-16 animate-float" />
      <div className="speech flex-1 text-base leading-snug">{children}</div>
    </div>
  );
}
