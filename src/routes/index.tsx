import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameRow } from "@/components/GameRow";
import { useEffect, useState } from "react";
import { Flame, Puzzle, Swords, Check, ChevronRight, Sparkles, MessageCircle } from "lucide-react";
import { today, updateProgress, useProgress, withCredit } from "@/lib/progress";
import { levelFromXp, liveStreak } from "@/lib/rules";
import { unlockAudio } from "@/lib/sound";
import { allQuestsDone, dailyQuests, levelTitle, questCreditId, questDone, QUEST_BONUS_XP, type Quest } from "@/lib/quests";
import { mikeHomeLine, mikeLevelLine } from "@/lib/mike";
import { MikeSays } from "@/components/Mike";
import { PlayerAvatar } from "@/components/CoachAvatar";
import { chestOpened, rollChest, withChest } from "@/lib/chest";
import { celebrate, celebrateDiff } from "@/lib/celebrate";
import { collectionSummary } from "@/lib/collection";
import { play } from "@/lib/sound";
import { notebookLine } from "@/lib/notebook";
import { Globe, Trophy } from "lucide-react";
import { RivalBell, WorldHero, useWorldUi } from "@/components/world/WorldUi";
import { ROUNDS, phase } from "@/lib/tour";
import { useTour } from "@/lib/tour-store";

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
  const tour = useTour().current;
  const navigate = useNavigate();
  const worldUi = useWorldUi();
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
  const base = t ? mikeHomeLine(p, quests, t, streak) : null;
  const nb = notebookLine(p);
  const mike = base && nb && !complete && t.endsWith("1") === false && (Number(t.slice(-2)) % 2 === 0) ? { text: nb, mood: "think" as const } : base;

  // Bonus for clearing all three quests — paid once per day, also across devices.
  useEffect(() => {
    if (t && complete) updateProgress((s) => { const n = withCredit(s, questCreditId(t), QUEST_BONUS_XP); celebrateDiff(s, n); return n; });
  }, [t, complete]);
  const opened = t ? chestOpened(p, t) : false;
  const openChest = () => {
    if (!t || opened) return;
    const roll = rollChest(`${t}:${p.games}:${p.puzzlesTried}`, streak);
    updateProgress((s) => withChest(s, t, roll));
    play("boss");
    celebrate({ kind: "chest", coins: roll.coins, tier: roll.tier });
  };
  const col = collectionSummary(p);

  return (
    <main className="page-layout page-narrow" onPointerDown={unlockAudio}>
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/avatar" aria-label="Åpne avataren din" className="rounded-full ring-2 ring-transparent transition hover:ring-primary"><PlayerAvatar className="size-11" /></Link>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Nivå {lvl.level}</p>
            <p className="truncate text-base font-bold">{levelTitle(lvl.level)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RivalBell onOpen={worldUi.openInbox} />
          <Link to="/avatar" className="coin-chip" title="Mynter">🪙 {p.coins ?? 0}</Link>
          <span className={`streak-chip ${streak >= 3 ? "is-hot" : ""}`} title="Dager på rad"><Flame className="size-4" />{streak}</span>
        </div>
      </header>

      {mike && <Link to="/mike" className="block mb-6" aria-label="Snakk med Mike"><MikeSays mood={mike.mood} big>{mike.text}<span className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary"><MessageCircle className="size-3" />Svar Mike</span></MikeSays></Link>}

      <section className="xp-big mb-6" aria-label="XP">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-bold">{lvl.into} <span className="text-muted-foreground font-medium">/ {lvl.needed} XP</span></p>
          <p className="text-xs text-muted-foreground">{mikeLevelLine(p.xp)}</p>
        </div>
        <div className="xp-big__track"><div className="xp-big__fill" style={{ width: `${Math.max(3, (lvl.into / lvl.needed) * 100)}%` }} /></div>
      </section>

      {/* The world: the region he is in, with the school, the gym and whoever has spotted him. */}
      <WorldHero day={t} controller={worldUi} />

      {tour && (
        <Link to="/turnering" className="quest mb-4 border-gold/60" aria-label="Turnering">
          <span className="quest__check"><Trophy className="size-5" /></span>
          <span className="min-w-0"><span className="block font-semibold">Turnering · runde {tour.rounds.length} av {ROUNDS}</span><span className="block text-xs text-muted-foreground">{phase(tour, Date.now()) === "play" ? "Partiet ditt venter ved brettet" : phase(tour, Date.now()) === "done" ? "Ferdig – hent premien!" : "Se de andre bordene og tabellen"}</span></span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      )}
      <section aria-labelledby="quests-h" className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="quests-h" className="text-lg font-bold">Dagens oppdrag</h2>
          <span className={`chip ${complete ? "text-primary" : ""}`}>{complete && <Sparkles className="size-3" />}{done}/3</span>
        </div>
        <div className="space-y-3">
          {quests.map((q) => <QuestCard key={q.id} q={q} />)}
        </div>
        {complete && (
          <button type="button" onClick={openChest} disabled={opened} className={`chest-card mt-3 w-full text-left ${opened ? "is-open" : ""}`}>
            <span className="chest-card__icon" aria-hidden>{opened ? "📭" : "🎁"}</span>
            <span className="min-w-0">
              <span className="block font-bold">{opened ? `Kisten er åpnet: +${p.chests?.[t] ?? 0} 🪙` : "Dagens kiste er klar!"}</span>
              <span className="block text-xs text-muted-foreground">{opened ? `+${QUEST_BONUS_XP} XP bonus er også på plass. Ny kiste i morgen.` : "Alle tre oppdrag gjort. Trykk for å åpne."}</span>
            </span>
          </button>
        )}
      </section>

      {(p.importedGames ?? []).length > 0 && (
        <section className="mb-6" aria-labelledby="games-h">
          <div className="mb-3 flex items-end justify-between">
            <h2 id="games-h" className="text-lg font-bold">Siste partier</h2>
            <Link to="/partier" className="text-sm font-semibold text-primary">Alle partier →</Link>
          </div>
          <div className="space-y-2">
            {(p.importedGames ?? []).slice(0, 3).map((g) => <GameRow key={g.id} g={g} reviewed={(p.reviewedGames ?? []).includes(g.id)} onOpen={() => void navigate({ to: "/partier", search: { open: g.id } })} />)}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3" aria-label="Mer">
        <Link to="/fritt" className="quest !grid-cols-[auto_minmax(0,1fr)]"><span className="quest__check"><Swords className="size-5" /></span><span className="font-semibold">Fritt parti</span></Link>
        <Link to="/avatar" className="quest !grid-cols-[auto_minmax(0,1fr)]"><span className="quest__check"><PlayerAvatar className="size-9" /></span><span className="min-w-0"><span className="block font-semibold">Avatar</span><span className="block text-xs text-muted-foreground">{col.found}/{col.total} motiver i boken</span></span></Link>
        <Link to="/partier" className="quest !grid-cols-[auto_minmax(0,1fr)] col-span-2"><span className="quest__check"><Globe className="size-5" /></span><span className="min-w-0"><span className="block font-semibold">Mine partier</span><span className="block text-xs text-muted-foreground">{(p.importedGames ?? []).length ? `${(p.importedGames ?? []).length} partier · ${(p.reviewedGames ?? []).length} analysert av Mike` : "Alle partier du spiller samles her – Mike ser på dem"}</span></span></Link>
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
