import { Lightbulb, Flag } from "lucide-react";
import { CoachAvatar } from "./CoachAvatar";
import { COACH_NAME } from "@/lib/coach-config";
import { dailyFact, dailyPeptalk } from "@/lib/daily-coach";
import type { Progress } from "@/lib/progress";

export function DailyCoach({ progress, day, recentWinId }: { progress: Progress; day: string; recentWinId: string | undefined }) {
  const pep = dailyPeptalk(progress, day, recentWinId);
  return (
    <section className="mt-6" aria-labelledby="peptalk-heading">
      <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <div className="card-game min-w-0 p-5 sm:p-6">
          <div className="flex items-center gap-4 mb-4">
            <CoachAvatar className="size-12" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{COACH_NAME}</p>
              <h2 id="peptalk-heading" className="section-title mt-1">Dagens peptalk</h2>
            </div>
          </div>
          <p className="text-sm leading-relaxed">{pep.text}</p>
          <div className="flex items-start gap-2 mt-4 text-sm text-muted-foreground">
            <Flag className="size-4 shrink-0 mt-0.5 text-primary" aria-hidden />
            <p><span className="font-medium text-primary">Neste mål:</span> {pep.goal}</p>
          </div>
        </div>
        <aside className="card-game p-5 sm:p-6" aria-labelledby="fact-heading">
          <div className="flex items-center gap-2 mb-3 text-primary">
            <Lightbulb className="size-5 shrink-0" aria-hidden />
            <h2 id="fact-heading" className="section-title">Visste du?</h2>
          </div>
          <p className="text-sm leading-relaxed">{dailyFact(day)}</p>
        </aside>
      </div>
    </section>
  );
}