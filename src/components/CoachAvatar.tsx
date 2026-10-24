import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { COACH_NAME } from "@/lib/coach-config";
import { COACH_IDENTITY } from "@/lib/coach-identity";
import { useTrainer } from "@/lib/trainer-store";
import type { CoachId } from "@/lib/trainer";
import { useProgress } from "@/lib/progress";
import { avatarOf } from "@/lib/avatar";
import { MonsterAvatar } from "./MonsterAvatar";

/** Selected virtual trainer portrait, head-cropped so the face reads in small circles. */
export function CoachAvatar({ className, coach: forced, size = "head" }: { className?: string; coach?: CoachId | null; size?: "head" | "portrait" }) {
  const tr = useTrainer();
  const coach = forced === undefined ? tr.coach : forced;
  const [failed, setFailed] = useState<string | null>(null);
  const id = coach ? COACH_IDENTITY[coach] : null;
  return (
    <span className={cn("coach-portrait relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted", className)} data-coach={coach ?? "none"}>
      {id && failed !== id.src ? (
        <img src={id.src} alt={id.label} onError={() => setFailed(id.src)} draggable={false}
          className={cn("absolute max-w-none select-none", size === "head" ? "left-[-45%] top-[-12%] w-[190%]" : "inset-0 size-full object-cover object-[50%_20%]")} />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-muted-foreground" aria-label={id?.label ?? "Ingen trener valgt"} role="img"><GraduationCap className="size-1/2" /></span>
      )}
    </span>
  );
}

/** The player's own avatar – the monster built in Monsterverkstedet. Never used as the coach voice. */
export function PlayerAvatar({ className }: { className?: string }) {
  const p = useProgress();
  return (
    <span className={cn("coach-portrait relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted", className)} aria-label={COACH_NAME}>
      <MonsterAvatar parts={avatarOf(p)} className="absolute inset-[6%] size-[88%]" />
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
