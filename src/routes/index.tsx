import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChampAvatarScene } from "@/components/ChampAvatarScene";
import { CoachBubble } from "@/components/CoachAvatar";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Puzzle, Flame, Target, Swords, Crown, CheckCircle2, ArrowRight, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { today, useProgress } from "@/lib/progress";
import { levelFromXp, liveStreak } from "@/lib/rules";
import { COACH_GREETINGS } from "@/lib/coach-config";
import { OPPONENTS } from "@/lib/opponents";
import { unlockAudio } from "@/lib/sound";
import { DailyCoach } from "@/components/DailyCoach";
import { TrainingSession } from "@/components/TrainingSession";
import { recentLadderWin } from "@/lib/daily-coach";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Oversikt – Goblin Chess" },
      { name: "description", content: "Ditt sjakkhovedkvarter: rating, streak, XP og dagens trening på vei mot 2000." },
      { property: "og:title", content: "Oversikt – Goblin Chess" },
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
  const completed = dailyDone >= 5;
  return (
    <main className="page-layout" onPointerDown={unlockAudio}>
      <header className="mb-6">
        <p className="eyebrow mb-2">Din vei mot 2000</p>
        <h1 className="page-title">Klar for neste trekk?</h1>
        <p className="mt-2 text-sm text-muted-foreground">Litt trening i dag. Et sterkere spill i morgen.</p>
      </header>
      <section aria-label="Din fremgang" className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
        <Stat label="Rating" value={p.rating} icon={Target} detail="Partirating" />
        <Stat label="Treningsrekke" value={streak} icon={Flame} detail={streak === 1 ? "dag på rad" : "dager på rad"} />
        <Stat label="Pusler" value={p.puzzleRating} icon={Puzzle} detail="Puslerating" />
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-center">
        <section className="chess-avatar-slot mx-auto w-full max-w-[420px] h-[280px] sm:h-[360px] lg:h-[420px]" aria-label="Tobias Future Champ"><ChampAvatarScene /></section>
        <section className="min-w-0 space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3"><p className="eyebrow">Dagens trening</p><span className={`chip ${completed ? "text-primary" : "text-muted-foreground"}`}>{completed && <CheckCircle2 className="size-3" />}{dailyDone}/5 fullført</span></div>
            <h2 className="text-2xl font-semibold">{completed ? "Dagens pusler er fullført" : "Fem pusler. Ett skarpere blikk."}</h2>
            <p className="mt-2 mb-4 text-sm text-muted-foreground">{completed ? "Godt jobbet. Ta neste utfordring når du er klar." : "Tren taktikk med dagens pusler, tilpasset ditt nivå."}</p>
            <Button asChild size="lg"><Link to={completed ? "/stigen" : "/pusler"}>{completed ? <Swords /> : <Puzzle />}{completed ? "Utfordre en motstander" : dailyDone > 0 ? "Fortsett dagens pusler" : "Start dagens pusler"}<ArrowRight /></Link></Button>
          </div>
          <div className="border-y border-border py-4">
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs"><span className="font-medium">Nivå {lvl.level}</span><span className="text-muted-foreground">{lvl.into} / {lvl.needed} XP</span></div>
            <div className="xp-track"><div className="xp-fill" style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} /></div>
            <p className="mt-3 text-xs font-medium">Målet ditt: 2000 i klubb/FIDE</p>
            <p className="mt-1 text-xs text-muted-foreground">Ratingen her i appen måler treningen din. Den viser framgang i partier og pusler, men er ikke en klubb- eller FIDE-rating.</p>
          </div>
          <CoachBubble>{greeting}</CoachBubble>
        </section>
      </div>
      {t && <TrainingSession progress={p} day={t} />}
      <section className="mt-6 grid gap-3 md:grid-cols-3" aria-label="Fortsett treningen">
        <Link to="/stigen" className="activity-link"><Crown className="size-5 text-muted-foreground" /><div className="min-w-0"><h2 className="text-sm font-semibold">Motstanderstigen</h2><p className="mt-1 text-xs text-muted-foreground">{p.beaten.length}/{OPPONENTS.length} slått{nextOpp ? ` · Neste: ${nextOpp.elo}` : " · Fullført"}</p></div><ArrowUpRight className="size-4 text-muted-foreground" /></Link>
        <Link to="/fritt" className="activity-link"><Swords className="size-5 text-muted-foreground" /><div className="min-w-0"><h2 className="text-sm font-semibold">Fritt parti</h2><p className="mt-1 text-xs text-muted-foreground">Velg styrke, farge og tempo</p></div><ArrowUpRight className="size-4 text-muted-foreground" /></Link>
        <Link to="/fremgang" className="activity-link"><TrendingUp className="size-5 text-muted-foreground" /><div className="min-w-0"><h2 className="text-sm font-semibold">Din fremgang</h2><p className="mt-1 text-xs text-muted-foreground">{p.games} partier · {p.badges.length} merker</p></div><ArrowUpRight className="size-4 text-muted-foreground" /></Link>
      </section>
      {t && <DailyCoach progress={p} day={t} recentWinId={recentWin} />}
    </main>
  );
}

function Stat({ label, value, icon: Icon, detail }: { label: string; value: number; icon: LucideIcon; detail: string }) {
  return <div className="card-game min-w-0 p-3 sm:p-5">
    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="hidden size-4 shrink-0 sm:block" /><span>{label}</span></div>
    <p className="mt-2 text-2xl font-semibold sm:text-3xl">{value}</p>
    <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{detail}</p>
  </div>;
}
