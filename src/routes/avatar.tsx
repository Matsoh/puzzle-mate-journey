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
import { FLAIRS, USERNAME_RE, flairEmoji, normalizeUsername, ownsFlair, withFlair } from "@/lib/flair";
import { onlineAvailable, setUsername } from "@/lib/online";
import { patchOnline, useOnline } from "@/lib/online-store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/avatar")({
  head: () => ({ meta: [{ title: "Avatar – Goblin Chess" }, { name: "description", content: "Bygg din egen avatar. Lås opp hår, klær og tilbehør ved å spille." }] }),
  component: AvatarPage,
});

function AvatarPage() {
  const p = useProgress();
  const parts = useMemo(() => avatarOf(p), [p]);
  const [tab, setTab] = useState<PartKey>(() => (avatarOf(p).figure === "none" ? "hair" : "figure"));
  const [msg, setMsg] = useState<string | null>(null);
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(avatarName(p));
  const online = useOnline();
  const [editUser, setEditUser] = useState(false);
  const [user, setUser] = useState("");
  const [userMsg, setUserMsg] = useState<string | null>(null);
  const [userBusy, setUserBusy] = useState(false);
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
  const saveUser = async () => {
    const n = normalizeUsername(user);
    if (!USERNAME_RE.test(n)) { setUserMsg("3–16 tegn: små bokstaver a–z, tall og _."); play("wrong"); return; }
    setUserBusy(true); setUserMsg(null);
    try { const me = await setUsername(n); patchOnline(() => ({ me })); setEditUser(false); setUserMsg(`Brukernavnet ditt er @${me.username}.`); play("correct"); }
    catch (e) { setUserMsg((e as Error).message); play("wrong"); }
    finally { setUserBusy(false); }
  };
  const chooseFlair = (id: string) => {
    const f = FLAIRS.find((x) => x.id === id)!;
    const had = ownsFlair(p, id);
    const next = withFlair(p, id);
    if (!next) { setMsg(f.unlock.kind === "coins" ? `Trenger ${f.unlock.cost - (p.coins ?? 0)} mynter til.` : `Låses opp: ${unlockLabel(f.unlock)}.`); play("wrong"); return; }
    updateProgress(() => next);
    setMsg(had ? null : `Ny flair: ${f.emoji} ${f.name}!`);
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
            <button type="button" onClick={() => { setName(avatarName(p)); setEditName(true); }} className="mt-0.5 flex items-center gap-2 text-2xl font-bold" aria-label="Endre navn">{avatarName(p)} {flairEmoji(p.flair) && <span aria-label="Flair">{flairEmoji(p.flair)}</span>}<Pencil className="size-4 text-muted-foreground" /></button>
          )}
          {onlineAvailable() && (editUser ? (
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void saveUser(); }}>
              <span className="grid place-items-center text-muted-foreground">@</span>
              <input autoFocus value={user} onChange={(e) => setUser(e.target.value.toLowerCase())} maxLength={16} aria-label="Brukernavn" autoCapitalize="none" autoCorrect="off" placeholder="brukernavn" className="min-h-10 w-40 rounded-lg border border-border bg-background px-3 text-sm font-semibold" />
              <Button type="submit" size="sm" disabled={userBusy}>{userBusy ? "…" : "Lagre"}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditUser(false)}>Avbryt</Button>
            </form>
          ) : (
            <button type="button" onClick={() => { setUser(online.me?.username ?? ""); setEditUser(true); }} className="mt-1 text-sm text-muted-foreground underline-offset-4 hover:underline" aria-label="Endre brukernavn">{online.me?.username ? `@${online.me.username}` : "Velg brukernavn"}</button>
          ))}
          {userMsg && <p role="status" className="mt-1 text-xs font-semibold text-primary">{userMsg}</p>}
        </div>
        <Link to="/avatar" className="coin-chip" title="Mynter">🪙 {p.coins ?? 0}</Link>
      </header>

      <div className="card-game mb-3 grid place-items-center p-4">
        <LiveAvatar look={parts} className="aspect-square w-60 overflow-hidden rounded-2xl" />
        <p className="mt-1 text-[11px] text-muted-foreground">{parts.figure === "none" ? "Dra i hodet for å snu det" : "Ferdig figur – velg «Egen 3D» under Figur for å bygge selv"}</p>
        <p className="mt-2 text-xs text-muted-foreground">{ward.unlocked} av {ward.total} deler låst opp</p>
      </div>
      {msg && <p role="status" className="mb-3 text-center text-sm font-semibold text-primary">{msg}</p>}

      <section className="card-game mb-4 p-4" aria-label="Flair">
        <p className="eyebrow mb-2">Flair – emoji ved navnet</p>
        <div className="flex flex-wrap gap-2">
          {FLAIRS.map((f) => { const have = ownsFlair(p, f.id); const on = (p.flair ?? "none") === f.id; return (
            <button key={f.id} type="button" onClick={() => chooseFlair(f.id)} aria-pressed={on} title={have ? f.name : `${f.name} – ${unlockLabel(f.unlock)}`} className={`chip min-h-10 px-3 ${on ? "border-primary text-primary" : ""} ${have ? "" : "opacity-50"}`}>
              <span className="text-lg leading-none">{f.emoji || "–"}</span>{!have && <Lock className="size-3" />}
            </button>); })}
        </div>
      </section>

      <div className="chat__chips mb-3" role="tablist">
        {PART_KEYS.map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`chip min-h-10 px-4 text-sm ${tab === k ? "border-primary text-primary" : ""}`}>{PARTS[k].label}</button>
        ))}
      </div>

      <div className="part-grid">
        {PARTS[tab].options.map((o) => {
          const on = parts[tab] === o.id;
          const have = owns(p, tab, o.id);
          const preview = tab === "figure" ? { ...parts, figure: o.id } : { ...parts, figure: "none", [tab]: o.id };
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
      <p className="mt-4 text-[11px] text-muted-foreground">Egen 3D-avatar: Zuri av Bright Kumedzro (MIT) – generert av kode. Ferdige figurer: 3D-pakke fra Canva.</p>
    </main>
  );
}
