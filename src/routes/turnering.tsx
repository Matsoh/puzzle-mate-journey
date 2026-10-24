import { createFileRoute, Link } from "@tanstack/react-router";
import { Dumbbell, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { PrepPanel } from "@/components/TournamentPrep";
import { MikeCompanion } from "@/components/MikeCompanion";
import { usePrep } from "@/lib/prep-store";
import { trainedCount } from "@/lib/prep";
import { getOpening } from "@/data/openings";

export const Route = createFileRoute("/turnering")({
  head: () => ({
    meta: [
      { title: "Forberedelse – Goblin Chess" },
      { name: "description", content: "Åpningene dine, taktikk og sluttspill – alt du trenger før klubbkveld og turnering." },
      { property: "og:title", content: "Forberedelse – Goblin Chess" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrepPage,
});

function PrepPage() {
  const prep = usePrep();
  const plan = prep.plan;
  const names = plan ? plan.openings.map((id) => getOpening(id)?.name).filter(Boolean) : [];
  const { trained, total } = trainedCount(plan, prep.openings);
  const line = !plan
    ? { text: "Pick your openings. One for white, one answer to e4, one to d4. That's a repertoire. Sounds fancy, isn't.", mood: "chill" as const }
    : trained >= total && total > 0
      ? { text: `All ${total} openings drilled. Now the fun part: tactics and endgames, where games are actually won.`, mood: "happy" as const }
      : { text: `${names.join(", ")}. Drill them until your hands know them. Then your brain is free for the real fight.`, mood: "chill" as const };
  const context = [
    plan ? `Repertoire: ${names.join(", ")}. Drilled ${trained} of ${total}.` : "No openings chosen yet.",
    `Tactic topic: ${prep.tacticTopic ?? "none"}; endgame topic: ${prep.endgameTopic ?? "none"}. Training games played: ${prep.games.length}.`,
    "This page is preparation for club nights and tournaments: openings, tactics, endgames and training games.",
  ].join("\n");

  return (
    <main className="page-layout page-narrow">
      <AppHeader title="Forberedelse" />
      <div className="space-y-6">
        <MikeCompanion mode="training" line={line} context={context} />
        <PrepPanel tournament={null} allTournaments={[]} />
        <Link to="/treningsparti" search={{ fen: undefined, side: "w", elo: 1550, tc: "none", src: "Treningsparti" }} className="quest">
          <span className="quest__check"><Dumbbell className="size-5" /></span>
          <span className="min-w-0"><span className="block font-semibold">Treningsparti med hjelp</span><span className="block text-xs text-muted-foreground">Spill mot boten med hint fra treneren og Mike</span></span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </div>
    </main>
  );
}
