import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Lock, BookOpen, ChevronRight, Pencil } from "lucide-react";
import { updateProgress, useProgress } from "@/lib/progress";
import { PARTS, PART_KEYS, avatarName, avatarOf, nextUnlocks, owns, unlockLabel, wardrobeSummary, withPart, type PartKey } from "@/lib/avatar";
import { AvatarImage } from "@/components/PlayerAvatar";
import { LiveAvatar } from "@/components/LiveAvatar";
import { Mike } from "@/components/Mike";
import { collectionSummary } from "@/lib/collection";
import { play } from "@/lib/sound";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/avatar")({
  head: () => ({ meta: [{ title: "Avatar – Goblin Chess" }, { name: "description", content: "Bygg din egen avatar. Lås opp hår, klær og tilbehør ved å spille." }] }),
  component: AvatarPage,
});

function AvatarPage() {
  const p = useProgress();
  const parts = useMemo(() => avatarOf(p), [p]);
  const [tab, setTab] = useState<PartKey>("hair");
  const [msg, setMsg] = useState<string | null>(null);
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(avatarName(p));
  const ward = wardrobeSummary(p);
  const col = collectionSummary(p);
  const goals = nextUnlocks(p);

  const choose = (k: PartKey, id: string) => {
    const opt = PARTS[k].options.find((o) => o.id === id)!;
    const had = owns(p, k, id);
    const next = withPart(p, k, id);
    if (!next) {
      setMsg(opt.unlock.kind === "coins" ? `Trenger ${opt.unlock.cost - (p.coins ?? 0)} mynter til. Dagens kiste gir mynter.` : `Låses opp: ${unlockLabel(opt.unlock)}.`);
      play("wrong");
      return;
    }
    updateProgress(() => next);
    setMsg(had ? null : `Låst opp: ${opt.name}!`);
    play(had ? "move" : "correct");
  };
  const saveName = () => {
    const n = name.trim().slice(0, 24);
    updateProgress((s) => ({ ...s, avatarName: n }));
    setEditName(false);
  };

  return (
    <main className="page-layout page-narrow">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Din avatar</p>
          {editName ? (
            <form className="mt-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); saveName(); }}>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={24} aria-label="Avatarnavn" className="min-h-10 w-44 rounded-lg border border-border bg-background px-3 text-base font-bold" />
              <Button type="submit" size="sm">Lagre</Button>
            </form>
          ) : (
            <button type="button" onClick={() => { setName(avatarName(p)); setEditName(true); }} className="mt-0.5 flex items-center gap-2 text-2xl font-bold" aria-label="Endre navn">{avatarName(p)}<Pencil className="size-4 text-muted-foreground" /></button>
          )}
        </div>
        <Link to="/avatar" className="coin-chip" title="Mynter">🪙 {p.coins ?? 0}</Link>
      </header>

      <div className="card-game mb-3 grid place-items-center p-4">
        <LiveAvatar look={parts} className="aspect-square w-60 overflow-hidden rounded-2xl" />
        <p className="mt-1 text-[11px] text-muted-foreground">Dra i hodet for å snu det</p>
        <p className="mt-2 text-xs text-muted-foreground">{ward.unlocked} av {ward.total} deler låst opp</p>
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
            <button key={o.id} onClick={() => choose(tab, o.id)} className={`part ${on ? "is-on" : ""} ${have ? "" : "is-locked"}`} aria-pressed={on} title={have ? o.name : `${o.name} – ${unlockLabel(o.unlock)}`}>
              <AvatarImage parts={preview} size={96} className="w-16 rounded-xl" />
              <span className="leading-tight">{o.name}</span>
              {on ? <Check className="size-4 text-primary" /> : have ? <span className="part__cost text-muted-foreground">Klar</span> : <span className="part__cost"><Lock className="inline size-3" /> {unlockLabel(o.unlock)}</span>}
            </button>
          );
        })}
      </div>

      {goals.length > 0 && (
        <section className="card-game mt-5 p-4" aria-label="Neste opplåsing">
          <p className="eyebrow mb-2">Neste du kan låse opp</p>
          <ul className="space-y-1 text-sm">{goals.map((g) => <li key={`${g.key}:${g.option.id}`} className="flex items-center justify-between gap-3"><span><span className="font-semibold">{g.option.name}</span> <span className="text-muted-foreground">· {PARTS[g.key].label.toLowerCase()}</span></span><span className="chip shrink-0">{unlockLabel(g.option.unlock)}</span></li>)}</ul>
        </section>
      )}

      <Link to="/samling" className="quest mt-4">
        <span className="quest__check"><BookOpen className="size-5" /></span>
        <span className="min-w-0"><span className="block font-semibold">Monsterboken</span><span className="block text-xs text-muted-foreground">Samlingen din · {col.found}/{col.total} motiver funnet · {col.beaten}/{col.opponents} bots slått</span></span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>

      <div className="mt-6 flex items-end gap-3">
        <Mike mood="chill" className="w-14" animate={false} />
        <p className="mike-bubble text-sm">{ward.unlocked < 90 ? "Looking sharp. Most of the good stuff unlocks by playing – levels, streaks, beating the ladder. Go earn it." : "That wardrobe is getting serious. Almost as serious as your chess."}</p>
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">3D-avatarer: Zuri av Bright Kumedzro (MIT) – generert av kode, ingen bilder.</p>
    </main>
  );
}
