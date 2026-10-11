import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useProgress, type RatingPoint } from "@/lib/progress";
import { BADGES } from "@/lib/badges";
import { levelFromXp } from "@/lib/rules";
import { Award, ChartNoAxesCombined } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fremgang")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Fremgang – Goblin Chess" },
      { name: "description", content: "Se ratinggrafen, statistikk og merkene du har samlet." },
      { property: "og:title", content: "Fremgang – Goblin Chess" },
      { property: "og:description", content: "Ratinggraf, streak og merker på vei mot 2000." },
    ],
  }),
  component: ProgressPage,
});

function Graph({ points, start }: { points: RatingPoint[]; start: { game: number; puzzle: number } }) {
  const data = [{ t: 0, ...start }, ...points];
  const all = data.flatMap((d) => [d.game, d.puzzle]).concat(2000);
  const min = Math.min(...all) - 30;
  const max = Math.max(...all) + 30;
  const W = 600;
  const H = 220;
  const x = (i: number) => (data.length === 1 ? W / 2 : (i / (data.length - 1)) * W);
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const line = (k: "game" | "puzzle") => data.map((d, i) => `${x(i)},${y(d[k])}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56" preserveAspectRatio="none">
      <line x1={0} x2={W} y1={y(2000)} y2={y(2000)} stroke="var(--border)" strokeDasharray="8 6" strokeWidth={2} />
      <text x={6} y={y(2000) - 6} fill="var(--muted-foreground)" fontSize="16" fontWeight="500">MÅL 2000</text>
      <polyline points={line("puzzle")} fill="none" stroke="var(--accent)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      <polyline points={line("game")} fill="none" stroke="var(--primary)" strokeWidth={4} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ProgressPage() {
  const p = useProgress();
  const lvl = levelFromXp(p.xp);
  const stats = [
    { l: "Nivå", v: lvl.level },
    { l: "Total XP", v: p.xp },
    { l: "Beste treningsrekke", v: p.bestStreak },
    { l: "Partier", v: p.games },
    { l: "Seire", v: p.wins },
    { l: "Pusler løst", v: `${p.puzzlesSolved}/${p.puzzlesTried}` },
  ];
  return (
    <main className="page-layout">
      <AppHeader title="Fremgang" />
      <div className="space-y-6">
        <section className="card-game p-5 sm:p-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <span className="chip"><span className="size-3 rounded-full bg-primary" /> Parti {p.rating}</span>
            <span className="chip"><span className="size-3 rounded-full bg-accent" /> Pusler {p.puzzleRating}</span>
          </div>
          {p.history.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground"><ChartNoAxesCombined className="mx-auto mb-3 size-8" /><h2 className="text-base font-medium text-foreground">Din utvikling starter her</h2><p className="mt-2 text-sm">Spill et parti eller løs en pusle for å se ratingen over tid.</p></div>
          ) : (
            <Graph points={p.history} start={{ game: 1550, puzzle: 1550 }} />
          )}
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.l} className="card-game p-4">
              <div className="text-xs text-muted-foreground">{s.l}</div>
              <div className="mt-2 text-2xl font-semibold">{s.v}</div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="section-title mb-4">Merker ({p.badges.length}/{BADGES.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BADGES.map((b) => {
              const got = p.badges.includes(b.id);
              return (
                <div key={b.id} className={cn("card-game p-4 text-center", got ? "border-gold/50" : "")}>
                  <Award className={cn("mx-auto size-7", got ? "text-gold" : "text-muted-foreground")} />
                  <div className="text-sm font-medium mt-3">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.desc}</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
