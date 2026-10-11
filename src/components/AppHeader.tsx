import { Link } from "@tanstack/react-router";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { updateProgress, useProgress } from "@/lib/progress";
import { levelFromXp } from "@/lib/rules";

export function MuteToggle() {
  const p = useProgress();
  return (
    <button
      aria-label={p.muted ? "Slå på lyd" : "Slå av lyd"}
      onClick={() => updateProgress((s) => ({ ...s, muted: !s.muted }))}
      className="grid size-12 place-items-center rounded-full bg-muted border border-border active:scale-95 transition"
    >
      {p.muted ? <VolumeX className="size-6" /> : <Volume2 className="size-6 text-primary" />}
    </button>
  );
}

export function AppHeader({ title, back = true }: { title: string; back?: boolean }) {
  const p = useProgress();
  const lvl = levelFromXp(p.xp);
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 bg-background/80 backdrop-blur-md">
      {back && (
        <Link to="/" aria-label="Tilbake til Hovedkvarter" className="grid size-12 place-items-center rounded-full bg-muted border border-border active:scale-95 transition">
          <ArrowLeft className="size-6" />
        </Link>
      )}
      <h1 className="flex-1 truncate text-2xl sm:text-3xl">{title}</h1>
      <span className="chip">⚡ Nivå {lvl.level}</span>
      <MuteToggle />
    </header>
  );
}
