import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useProgress, type RatingPoint } from "@/lib/progress";
import { BADGES } from "@/lib/badges";
import { levelFromXp } from "@/lib/rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fremgang")({
  head: () => ({
    meta: [
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
      <line x1={0} x2={W} y1={y(2000)} y2={y(2000)} stroke="var(--gold)" strokeDasharray="8 6" strokeWidth={2} />
      <text x={6} y={y(2000) - 6} fill="var(--gold)" fontSize="16" fontWeight="800">MÅL 2000</text>
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
    { l: "Beste streak", v: `${p.bestStreak} 🔥` },
    { l: "Partier", v: p.games },
    { l: "Seire", v: p.wins },
    { l: "Pusler løst", v: `${p.puzzlesSolved}/${p.puzzlesTried}` },
  ];
  return (
    <main className="mx-auto max-w-3xl pb-10 safe-bottom">
      <AppHeader title="Fremgang" />
      <div className="px-4 space-y-5">
        <section className="card-game p-4">
          <div className="flex flex-wrap gap-3 mb-2 font-extrabold">
            <span className="chip"><span className="size-3 rounded-full bg-primary" /> Parti {p.rating}</span>
            <span className="chip"><span className="size-3 rounded-full bg-accent" /> Pusler {p.puzzleRating}</span>
          </div>
          {p.history.length === 0 ? (
            <p className="py-10 text-center font-bold text-muted-foreground">Spill et parti eller løs en pusle for å starte grafen! 📈</p>
          ) : (
            <Graph points={p.history} start={{ game: 1550, puzzle: 1550 }} />
          )}
        </section>

        <section className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.l} className="card-game p-3 text-center">
              <div className="text-xs font-extrabold uppercase text-muted-foreground">{s.l}</div>
              <div className="font-display text-2xl">{s.v}</div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-2xl mb-3">Merker ({p.badges.length}/{BADGES.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BADGES.map((b) => {
              const got = p.badges.includes(b.id);
              return (
                <div key={b.id} className={cn("card-game p-4 text-center", got ? "ring-2 ring-gold" : "opacity-45 grayscale")}>
                  <div className="text-4xl">{b.icon}</div>
                  <div className="font-display text-lg mt-1">{b.name}</div>
                  <div className="text-xs font-bold text-muted-foreground">{b.desc}</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
