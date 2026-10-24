import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, Puzzle, Swords, Check, Crown, ChevronRight, Sparkles } from "lucide-react";
import { today, updateProgress, useProgress, withCredit } from "@/lib/progress";
import { levelFromXp, liveStreak } from "@/lib/rules";
import { OPPONENTS } from "@/lib/opponents";
import { unlockAudio } from "@/lib/sound";
import { allQuestsDone, dailyQuests, levelTitle, questCreditId, questDone, QUEST_BONUS_XP, type Quest } from "@/lib/quests";
import { mikeHomeLine, mikeLevelLine } from "@/lib/mike";
import { MikeSays } from "@/components/Mike";
import { PlayerAvatar } from "@/components/CoachAvatar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Hjem – Goblin Chess" },
      { name: "description", content: "Dagens oppdrag, XP og neste motstander på veien mot 2000." },
      { property: "og:title", content: "Hjem – Goblin Chess" },
      { property: "og:description", content: "Daglig sjakktrening med oppdrag, motstandere og Mike." },
    ],
  }),
  component: Home,
});

function Home() {
  const p = useProgress();
  const lvl = levelFromXp(p.xp);
  const [t, setT] = useState("");
  useEffect(() => {
    const refresh = () => setT(today());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const streak = t ? liveStreak(p.lastDay, t, p.streak) : 0;
  const quests = t ? dailyQuests(p, t) : [];
  const done = quests.filter(questDone).length;
  const complete = quests.length > 0 && allQuestsDone(quests);
  const nextOpp = OPPONENTS.find((o) => !p.beaten.includes(o.id));
  const mike = t ? mikeHomeLine(p, quests, t, streak) : null;

  // Bonus for clearing all three quests — paid once per day, also across devices.
  useEffect(() => {
    if (t && complete) updateProgress((s) => withCredit(s, questCreditId(t), QUEST_BONUS_XP));
  }, [t, complete]);

  return (
    <main className="page-layout page-narrow" onPointerDown={unlockAudio}>
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <PlayerAvatar className="size-11" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Nivå {lvl.level}</p>
            <p className="truncate text-base font-bold">{levelTitle(lvl.level)}</p>
          </div>
        </div>
        <span className={`streak-chip ${streak >= 3 ? "is-hot" : ""}`} title="Dager på rad"><Flame className="size-4" />{streak}</span>
      </header>

      {mike && <MikeSays mood={mike.mood} big className="mb-6">{mike.text}</MikeSays>}

      <section className="xp-big mb-6" aria-label="XP">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-bold">{lvl.into} <span className="text-muted-foreground font-medium">/ {lvl.needed} XP</span></p>
          <p className="text-xs text-muted-foreground">{mikeLevelLine(p.xp)}</p>
        </div>
        <div className="xp-big__track"><div className="xp-big__fill" style={{ width: `${Math.max(3, (lvl.into / lvl.needed) * 100)}%` }} /></div>
      </section>

      <Link to="/stigen" className="btn-play mb-7">
        <Swords />
        {nextOpp ? <span>Spill mot {nextOpp.name.split(" ")[0]}</span> : <span>Spill</span>}
      </Link>

      <section aria-labelledby="quests-h" className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="quests-h" className="text-lg font-bold">Dagens oppdrag</h2>
          <span className={`chip ${complete ? "text-primary" : ""}`}>{complete && <Sparkles className="size-3" />}{done}/3</span>
        </div>
        <div className="space-y-3">
          {quests.map((q) => <QuestCard key={q.id} q={q} />)}
        </div>
        {complete && <p className="mt-3 text-center text-sm font-semibold text-primary">+{QUEST_BONUS_XP} XP bonus for alle tre!</p>}
      </section>

      <section className="grid grid-cols-2 gap-3" aria-label="Mer">
        <Link to="/fritt" className="quest !grid-cols-[auto_minmax(0,1fr)]"><span className="quest__check"><Swords className="size-5" /></span><span className="font-semibold">Fritt parti</span></Link>
        <Link to="/fremgang" className="quest !grid-cols-[auto_minmax(0,1fr)]"><span className="quest__check"><Crown className="size-5" /></span><span className="font-semibold">{p.beaten.length}/{OPPONENTS.length} slått</span></Link>
      </section>
    </main>
  );
}

function QuestCard({ q }: { q: Quest }) {
  const done = questDone(q);
  const Icon = q.id === "puzzles" ? Puzzle : Swords;
  return (
    <Link to={q.to} className={`quest ${done ? "is-done" : ""}`} aria-label={`${q.title}${done ? " – fullført" : ""}`}>
      <span className="quest__check">{done ? <Check className="size-5" /> : <Icon className="size-5" />}</span>
      <span className="min-w-0">
        <span className="block font-semibold leading-tight">{q.title}</span>
        <span className="block text-xs text-muted-foreground">{done ? "Fullført" : q.hint}</span>
        {q.goal > 1 && !done && <span className="quest__bar block"><div style={{ width: `${(q.done / q.goal) * 100}%` }} /></span>}
      </span>
      <span className="flex items-center gap-2"><span className="quest__xp">{q.goal > 1 && !done ? `${q.done}/${q.goal}` : `+${q.xp} XP`}</span>{!done && <ChevronRight className="size-4 text-muted-foreground" />}</span>
    </Link>
  );
}
