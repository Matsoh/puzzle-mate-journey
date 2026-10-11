import { Lightbulb, Flag } from "lucide-react";
import { CoachAvatar, CoachLabel } from "./CoachAvatar";
import { useTrainer } from "@/lib/trainer-store";
import { dailyFact, dailyPeptalk } from "@/lib/daily-coach";
import type { Progress } from "@/lib/progress";

export function DailyCoach({ progress, day, recentWinId }: { progress: Progress; day: string; recentWinId: string | undefined }) {
  const coach = useTrainer().coach;
  const pep = dailyPeptalk(progress, day, recentWinId, coach ?? "neutral");
  return (
    <section className="mt-6" aria-labelledby="peptalk-heading">
      <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <div className="card-game min-w-0 p-5 sm:p-6">
          <div className="flex items-center gap-4 mb-4">
            <CoachAvatar className="size-14" />
            <div className="min-w-0">
              <CoachLabel />
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