import { Link } from "@tanstack/react-router";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { updateProgress, useProgress } from "@/lib/progress";
import { levelFromXp } from "@/lib/rules";
import { Button } from "@/components/ui/button";

export function MuteToggle() {
  const p = useProgress();
  return (
    <Button variant="ghost" size="icon" title={p.muted ? "Slå på lyd" : "Slå av lyd"}
      aria-label={p.muted ? "Slå på lyd" : "Slå av lyd"}
      onClick={() => updateProgress((s) => ({ ...s, muted: !s.muted }))}
      className="size-10 shrink-0 rounded-lg border border-border text-muted-foreground"
    >
      {p.muted ? <VolumeX /> : <Volume2 className="text-primary" />}
    </Button>
  );
}

export function AppHeader({ title, back = true }: { title: string; back?: boolean }) {
  const p = useProgress();
  const lvl = levelFromXp(p.xp);
  return (
    <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="min-w-0"><p className="eyebrow mb-2">Goblin Chess</p><div className="flex min-w-0 items-center gap-3">
      {back && (
        <Link to="/" aria-label="Tilbake til oversikten" className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
      )}
      <h1 className="page-title truncate">{title}</h1></div></div>
      <span className="chip shrink-0">Nivå {lvl.level}</span>
    </header>
  );
}
