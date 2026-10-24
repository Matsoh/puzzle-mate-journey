import { cn } from "@/lib/utils";
import type { CoachId } from "@/lib/trainer";
import { Mike } from "./Mike";

/** The trainer's face: Mike. */
export function CoachAvatar({ className, size: _size }: { className?: string; coach?: CoachId | null; size?: "head" | "portrait" }) {
  return (
    <span className={cn("coach-portrait relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted", className)} data-coach="mike" role="img" aria-label="Mike">
      <Mike mood="chill" animate={false} className="absolute inset-[8%] size-[84%]" />
    </span>
  );
}

export { PlayerAvatar } from "./PlayerAvatar";

export function CoachLabel({ className }: { className?: string }) {
  return <span className={cn("text-xs font-medium text-muted-foreground", className)}>Mike · treneren din</span>;
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
