import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChampAvatarScene } from "@/components/ChampAvatarScene";
import { CoachBubble } from "@/components/CoachAvatar";
import { MuteToggle } from "@/components/AppHeader";
import { today, useProgress } from "@/lib/progress";
import { levelFromXp, liveStreak } from "@/lib/rules";
import { COACH_GREETINGS } from "@/lib/coach-config";
import { OPPONENTS } from "@/lib/opponents";
import { unlockAudio } from "@/lib/sound";
import { DailyCoach } from "@/components/DailyCoach";
import { recentLadderWin } from "@/lib/daily-coach";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Hovedkvarter – Goblin Chess" },
      { name: "description", content: "Ditt sjakkhovedkvarter: rating, streak, XP og dagens trening på vei mot 2000." },
      { property: "og:title", content: "Hovedkvarter – Goblin Chess" },
      { property: "og:description", content: "Daglig sjakktrening med pusler, motstandere og trener." },
    ],
  }),
  component: Home,
});

function Home() {
  const p = useProgress();
  const lvl = levelFromXp(p.xp);
  const [t, setT] = useState("");
  const [recentWin, setRecentWin] = useState<string | undefined>();
  useEffect(() => {
    const refresh = () => {
      const day = today();
      setT(day);
      setRecentWin(recentLadderWin(day));
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const streak = t ? liveStreak(p.lastDay, t, p.streak) : 0;
  const dailyDone = p.daily && p.daily.day === t ? Object.keys(p.daily.results).length : 0;
  const nextOpp = OPPONENTS.find((o) => !p.beaten.includes(o.id));
  const greeting = COACH_GREETINGS[(t.length ? Number(t.slice(-2)) : 0) % COACH_GREETINGS.length];
  const toGoal = Math.max(0, 2000 - p.rating);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-10 safe-bottom" onPointerDown={unlockAudio}>
      <header className="flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">Hovedkvarter</p>
          <h1 className="text-4xl sm:text-5xl neon-text">Goblin Chess</h1>
        </div>
        <MuteToggle />
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-center mt-2">
        <section className="relative min-w-0 h-[40vh] min-h-64 md:h-[460px]">
          <ChampAvatarScene />
        </section>

        <section className="min-w-0 space-y-4">
          <CoachBubble>{greeting}</CoachBubble>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Rating" value={p.rating} icon="♟️" />
            <Stat label="Streak" value={`${streak} 🔥`} icon="" highlight={streak > 0} />
            <Stat label="Pusler" value={p.puzzleRating} icon="🧩" />
          </div>

          <div className="card-game p-4">
            <div className="flex justify-between font-extrabold mb-2">
              <span>⚡ Nivå {lvl.level}</span>
              <span className="text-muted-foreground">{lvl.into} / {lvl.needed} XP</span>
            </div>
            <div className="xp-track"><div className="xp-fill" style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} /></div>
            <p className="mt-2 text-sm text-muted-foreground font-bold">
              {toGoal > 0 ? `${toGoal} poeng igjen til 2000 – du klarer det! 🚀` : "Du har nådd 2000! Legende! 👑"}
            </p>
          </div>

          <div className="grid gap-3">
            <Link to="/pusler" className="btn-game btn-accent w-full justify-between">
              <span>🧩 Dagens pusler</span>
              <span className="chip bg-background/30 border-transparent">{dailyDone}/5</span>
            </Link>
            <Link to="/stigen" className="btn-game btn-secondary w-full justify-between">
              <span>🪜 Opponentstigen</span>
              {nextOpp && <span className="chip bg-background/30 border-transparent">{nextOpp.emoji} {nextOpp.elo}</span>}
            </Link>
            <Link to="/fritt" className="btn-game btn-primary w-full justify-between">
              <span>♞ Fritt parti</span>
              <span>→</span>
            </Link>
            <Link to="/fremgang" className="btn-game btn-ghost w-full justify-between">
              <span>📈 Fremgang & merker</span>
              <span className="chip">{p.badges.length} 🏅</span>
            </Link>
          </div>
        </section>
      </div>
      {t && <DailyCoach progress={p} day={t} recentWinId={recentWin} />}
    </main>
  );
}

function Stat({ label, value, icon, highlight }: { label: string; value: string | number; icon: string; highlight?: boolean }) {
  return (
    <div className={`card-game p-3 text-center ${highlight ? "ring-2 ring-gold" : ""}`}>
      <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-2xl sm:text-3xl mt-1">
        {icon} {value}
      </div>
    </div>
  );
}
