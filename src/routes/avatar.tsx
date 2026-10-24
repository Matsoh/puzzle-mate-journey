import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { updateProgress, useProgress } from "@/lib/progress";
import { PARTS, PART_KEYS, avatarOf, owns, withPart, type PartKey } from "@/lib/avatar";
import { MonsterAvatar } from "@/components/MonsterAvatar";
import { play } from "@/lib/sound";

export const Route = createFileRoute("/avatar")({
  head: () => ({ meta: [{ title: "Monsterverkstedet – Goblin Chess" }] }),
  component: Workshop,
});

function Workshop() {
  const p = useProgress();
  const parts = avatarOf(p);
  const [tab, setTab] = useState<PartKey>("body");
  const [msg, setMsg] = useState<string | null>(null);

  const choose = (k: PartKey, id: string) => {
    const opt = PARTS[k].options.find((o) => o.id === id)!;
    const owned = owns(p, k, id);
    const next = withPart(p, k, id);
    if (!next) { setMsg(`Trenger ${opt.cost - (p.coins ?? 0)} mynter til. Fullfør dagens oppdrag for en kiste.`); play("wrong"); return; }
    updateProgress(() => next);
    setMsg(owned ? null : `Kjøpt: ${opt.name}!`);
    play(owned ? "move" : "correct");
  };

  return (
    <main className="page-layout page-narrow">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/samling" aria-label="Tilbake" className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground"><ArrowLeft className="size-4" /></Link>
          <h1 className="page-title">Monsterverkstedet</h1>
        </div>
        <span className="coin-chip">🪙 {p.coins ?? 0}</span>
      </header>

      <div className="card-game mb-4 grid place-items-center p-4">
        <MonsterAvatar parts={parts} className="w-44" animate />
      </div>
      {msg && <p role="status" className="mb-3 text-center text-sm font-semibold text-primary">{msg}</p>}

      <div className="chat__chips mb-3" role="tablist">
        {PART_KEYS.map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`chip min-h-10 px-4 text-sm ${tab === k ? "border-primary text-primary" : ""}`}>{PARTS[k].label}</button>
        ))}
      </div>

      <div className="part-grid">
        {PARTS[tab].options.map((o) => {
          const on = parts[tab] === o.id;
          const have = owns(p, tab, o.id);
          const preview = { ...parts, [tab]: o.id };
          return (
            <button key={o.id} onClick={() => choose(tab, o.id)} className={`part ${on ? "is-on" : ""} ${have ? "" : "is-locked"}`} aria-pressed={on}>
              <MonsterAvatar parts={preview} className="w-12" />
              <span>{o.name}</span>
              {on ? <Check className="size-4 text-primary" /> : have ? <span className="part__cost">Eid</span> : <span className="part__cost"><Lock className="inline size-3" /> {o.cost}</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Mynter får du fra dagens kiste – den åpner seg når alle tre oppdrag er gjort.</p>
    </main>
  );
}
