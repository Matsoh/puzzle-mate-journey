import { cn } from "@/lib/utils";

/** Original coach character "Stormester Storm": a friendly storm cloud with a lightning bolt. */
export function CoachAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("shrink-0 drop-shadow-[0_0_12px_var(--primary)]", className)} aria-hidden>
      <circle cx="50" cy="50" r="48" fill="var(--muted)" stroke="var(--primary)" strokeWidth="3" />
      <g fill="var(--foreground)">
        <circle cx="34" cy="44" r="16" />
        <circle cx="52" cy="36" r="20" />
        <circle cx="68" cy="46" r="14" />
        <rect x="24" y="44" width="54" height="18" rx="9" />
      </g>
      <circle cx="42" cy="46" r="4.5" fill="var(--background)" />
      <circle cx="60" cy="46" r="4.5" fill="var(--background)" />
      <circle cx="43.5" cy="44.5" r="1.5" fill="var(--foreground)" />
      <circle cx="61.5" cy="44.5" r="1.5" fill="var(--foreground)" />
      <path d="M44 54 Q51 60 58 54" stroke="var(--background)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M52 64 L44 80 L51 80 L46 94 L62 74 L54 74 L60 64 Z" fill="var(--gold)" />
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
