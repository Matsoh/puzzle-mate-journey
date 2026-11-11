import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BookOpen, Crown } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { RegionScene } from "@/components/world/RegionScene";
import { RivalBell, useWorld, useWorldUi } from "@/components/world/WorldUi";
import { today, useProgress } from "@/lib/progress";
import { rivalbook } from "@/lib/rivals";
import { useRivals } from "@/lib/rivals-store";
import { unlockAudio } from "@/lib/sound";

export const Route = createFileRoute("/kart")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Verdenskartet – Goblin Chess" },
      { name: "description", content: "Veien til 2000: sju regioner fra Bondelandsbyen til Mesterborgen." },
      { property: "og:title", content: "Verdenskartet – Goblin Chess" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const [day, setDay] = useState("");
  useEffect(() => setDay(today()), []);
  const p = useProgress();
  const world = useWorld(day);
  const rivals = useRivals();
  const ctl = useWorldUi();
  const stack = useRef<HTMLDivElement>(null);
  const ready = !!world;
  // Open the map where he stands, not at the summit.
  useLayoutEffect(() => {
    if (!ready) return;
    const me = stack.current?.querySelector(".world__me") ?? stack.current?.querySelector('[data-state="current"]');
    me?.scrollIntoView({ block: "center" });
  }, [ready]);
  const book = rivalbook(rivals);
  return (
    <main className="page-layout page-narrow" onPointerDown={unlockAudio}>
      <AppHeader title="Veien til 2000" />
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link to="/rivaler" className="chip py-1.5"><BookOpen className="size-4" /> Rivalboken {book.met}/{book.total}</Link>
        <RivalBell onOpen={ctl.openInbox} />
      </div>
      {world && (
        <>
          <div className="world__summit"><Crown className="size-5" /><span><b>Tronen · 2000</b><small>Du har {p.rating} – {Math.max(0, 2000 - p.rating)} igjen til toppen</small></span></div>
          <div className="world__stack" ref={stack}>
            {[...world.view].reverse().map((v) => (
              <RegionScene key={v.region.n} view={v} hereId={v.state === "current" ? world.here?.id : undefined} encounters={v.state === "current" ? rivals.encounters : []} rivals={rivals} onNode={ctl.onNode} onEncounter={ctl.onEncounter} />
            ))}
          </div>
          <p className="world__start">Starten · 1500</p>
        </>
      )}
      {ctl.ui}
    </main>
  );
}
