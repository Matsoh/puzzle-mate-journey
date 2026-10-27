import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { MOTIFS, RARITY_LABEL, RARITY_ORDER, collectionSummary, motifCount } from "@/lib/collection";
import { OPPONENTS, ratingLabel } from "@/lib/opponents";
import { Mike } from "@/components/Mike";
import { PlayerAvatar } from "@/components/CoachAvatar";

export const Route = createFileRoute("/samling")({
  head: () => ({ meta: [{ title: "Monsterboken – Goblin Chess" }, { name: "description", content: "Samlingen din: taktiske motiver og beseirede motstandere." }] }),
  component: Collection,
});

function Collection() {
  const p = useProgress();
  const s = collectionSummary(p);
  return (
    <main className="page-layout page-narrow">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div><p className="eyebrow">Samling</p><h1 className="page-title">Monsterboken</h1></div>
        <Link to="/avatar" className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold"><PlayerAvatar className="size-8" />Avatar <span className="coin-chip">🪙 {p.coins ?? 0}</span></Link>
      </header>

      <section className="card-game mb-6 p-4" aria-label="Hva er Monsterboken">
        <div className="flex items-start gap-3">
          <Mike mood="happy" className="w-14 shrink-0" animate={false} />
          <div className="text-sm">
            <p className="font-semibold">Dette er samlingen din – som en dex for sjakk.</p>
            <p className="mt-1 text-muted-foreground">Hver gang du løser en oppgave med et nytt taktisk motiv (gaffel, binding, kvelermatt …) havner det her. Sjeldne motiver dukker bare opp i vanskelige oppgaver. Nederst står alle botene på stigen – de du har slått får merke. Full bok låser opp avatar-deler.</p>
          </div>
        </div>
      </section>
      <section className="mb-7" aria-labelledby="motif-h">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="motif-h" className="text-lg font-bold">Taktiske motiver</h2>
          <span className="chip">{s.found}/{s.total} funnet</span>
        </div>
        {RARITY_ORDER.map((r) => {
          const list = MOTIFS.filter((m) => m.rarity === r);
          return (
            <div key={r} className="mb-4">
              <p className="eyebrow mb-2">{RARITY_LABEL[r]} · {list.filter((m) => motifCount(p, m.id) > 0).length}/{list.length}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {list.map((m) => {
                  const n = motifCount(p, m.id);
                  const got = n > 0;
                  return (
                    <div key={m.id} className={`motif ${got ? "" : "is-locked"}`} data-rarity={m.rarity} title={m.hint}>
                      <span className="motif__emoji" aria-hidden>{got ? m.emoji : "❔"}</span>
                      <span className="motif__name">{got ? m.name : "???"}</span>
                      <span className="motif__count">{got ? `×${n}` : <Lock className="inline size-3" />}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <p className="mt-1 text-xs text-muted-foreground">Løs oppgaver med et motiv for å låse det opp. Sjeldne motiver dukker sjelden opp – hold øynene åpne.</p>
      </section>

      <section aria-labelledby="opp-h">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="opp-h" className="text-lg font-bold">Beseirede</h2>
          <span className="chip">{s.beaten}/{s.opponents}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {OPPONENTS.map((o) => {
            const got = p.beaten.includes(o.id);
            return (
              <Link to="/stigen" key={o.id} className={`motif ${got ? "" : "is-locked"}`} data-rarity={o.elo >= 2000 ? "legendarisk" : o.elo >= 1850 ? "episk" : o.elo >= 1700 ? "sjelden" : "vanlig"}>
                <img src={o.portrait} alt="" className={`mx-auto size-10 object-contain ${got ? "" : "grayscale opacity-60"}`} draggable={false} />
                <span className="motif__name">{o.name.split(" ")[0]}</span>
                <span className="motif__count">{got ? "Slått" : ratingLabel(o)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-8 flex items-end gap-3">
        <Mike mood={s.found === 0 ? "think" : "chill"} className="w-16" animate={false} />
        <p className="mike-bubble text-sm">{s.found === 0 ? "Empty book. That's the best kind – everything's still out there." : s.found >= s.total ? "Full book. I genuinely did not think that was possible." : `${s.total - s.found} left. The legendary ones hide in the hard puzzles.`}</p>
      </div>
    </main>
  );
}
