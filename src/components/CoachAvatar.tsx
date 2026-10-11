import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { COACH_NAME } from "@/lib/coach-config";
import { COACH_IDENTITY } from "@/lib/coach-identity";
import { useTrainer } from "@/lib/trainer-store";
import type { CoachId } from "@/lib/trainer";

/** Selected virtual trainer portrait, head-cropped so the face reads in small circles. */
export function CoachAvatar({ className, coach: forced, size = "head" }: { className?: string; coach?: CoachId | null; size?: "head" | "portrait" }) {
  const tr = useTrainer();
  const coach = forced === undefined ? tr.coach : forced;
  const [failed, setFailed] = useState<string | null>(null);
  const id = coach ? COACH_IDENTITY[coach] : null;
  return (
    <div className={cn("coach-portrait relative shrink-0 overflow-hidden rounded-full bg-muted", className)} data-coach={coach ?? "none"}>
      {id && failed !== id.src ? (
        <img src={id.src} alt={id.label} onError={() => setFailed(id.src)} draggable={false}
          className={cn("absolute max-w-none select-none", size === "head" ? "left-[-45%] top-[-12%] w-[190%]" : "inset-0 size-full object-cover object-[50%_20%]")} />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-muted-foreground" aria-label={id?.label ?? "Ingen trener valgt"} role="img"><GraduationCap className="size-1/2" /></span>
      )}
    </div>
  );
}

/** The player's own avatar (straw-hat boy) – never used as the coach voice. */
export function PlayerAvatar({ className }: { className?: string }) {
  const [ok, setOk] = useState(true);
  return (
    <span className={cn("coach-portrait relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted", className)}>
      {ok ? <img src="/coach-hero.png" alt={COACH_NAME} onError={() => setOk(false)} className="absolute inset-0 size-full object-cover object-[50%_22%]" />
        : <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">T</span>}
    </span>
  );
}

export function CoachLabel({ className }: { className?: string }) {
  const tr = useTrainer();
  if (!tr.coach) return <Link to="/trener" className={cn("text-xs font-medium text-primary underline-offset-2 hover:underline", className)}>Velg trener</Link>;
  return <span className={cn("text-xs font-medium text-muted-foreground", className)}>{COACH_IDENTITY[tr.coach].label}</span>;
}

export function CoachBubble({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <CoachAvatar className="size-10" />
      <div className="speech min-w-0 flex-1 text-sm leading-relaxed">
        <CoachLabel className="mb-0.5 block" />
        {children}
      </div>
    </div>
  );
}
