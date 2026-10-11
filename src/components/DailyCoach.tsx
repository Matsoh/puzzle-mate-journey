import { Lightbulb, Flag } from "lucide-react";
import { CoachAvatar } from "./CoachAvatar";
import { COACH_NAME } from "@/lib/coach-config";
import { dailyFact, dailyPeptalk } from "@/lib/daily-coach";
import type { Progress } from "@/lib/progress";

export function DailyCoach({ progress, day, recentWinId }: { progress: Progress; day: string; recentWinId: string | undefined }) {
  const pep = dailyPeptalk(progress, day, recentWinId);
  return (
    <section className="mt-8 border-t border-border pt-6" aria-labelledby="peptalk-heading">
      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0">
          <div className="flex items-center gap-4 mb-4">
            <CoachAvatar className="size-28 sm:size-32" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-secondary">{COACH_NAME}</p>
              <h2 id="peptalk-heading" className="text-3xl mt-1">Dagens peptalk</h2>
            </div>
          </div>
          <p className="text-lg leading-relaxed font-bold">{pep.text}</p>
          <div className="flex items-start gap-2 mt-4 text-sm text-muted-foreground">
            <Flag className="size-4 shrink-0 mt-0.5 text-secondary" aria-hidden />
            <p><span className="font-extrabold text-secondary">Neste mål:</span> {pep.goal}</p>
          </div>
        </div>
        <aside className="card-game p-5 self-start" aria-labelledby="fact-heading">
          <div className="flex items-center gap-2 mb-3 text-secondary">
            <Lightbulb className="size-6 shrink-0" aria-hidden />
            <h2 id="fact-heading" className="text-2xl">Visste du?</h2>
          </div>
          <p className="font-bold leading-relaxed">{dailyFact(day)}</p>
        </aside>
      </div>
    </section>
  );
}