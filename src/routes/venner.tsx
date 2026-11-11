import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, Swords, UserPlus, X, Clock, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { AvatarImage } from "@/components/PlayerAvatar";
import { Mike } from "@/components/Mike";
import { useProgress } from "@/lib/progress";
import { myUserId, onlineAvailable, sendFriendRequest, respondFriendRequest, removeFriend, answerChallenge, tcLabel } from "@/lib/online";
import { ChallengeSheet } from "@/components/ChallengeSheet";
import { friendViews, incomingChallenges, outgoingChallenges, refreshOnline, useOnline, type FriendView } from "@/lib/online-store";
import type { PartKey } from "@/lib/avatar";
import { play } from "@/lib/sound";
import { flairEmoji } from "@/lib/flair";

export const Route = createFileRoute("/venner")({
  head: () => ({ meta: [{ title: "Venner – Goblin Chess" }, { name: "description", content: "Legg til familie og klubbvenner med vennekode, og utfordre dem til parti." }] }),
  component: FriendsPage,
});

function FriendsPage() {
  const s = useOnline();
  const p = useProgress();
  const me = myUserId() ?? "";
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [challengeTo, setChallengeTo] = useState<FriendView | null>(null);

  if (!onlineAvailable()) return <main className="page-layout page-narrow"><AppHeader title="Venner" /><p className="text-sm text-muted-foreground">Venner og nettspill er bare tilgjengelig i den publiserte appen.</p></main>;

  const views = friendViews(s, me);
  const friends = views.filter((v) => v.friendship.status === "accepted").sort((a, b) => Number(b.online) - Number(a.online) || (a.profile?.name ?? "").localeCompare(b.profile?.name ?? ""));
  const requests = views.filter((v) => v.pendingFromThem);
  const waiting = views.filter((v) => v.pendingFromMe);
  const incoming = incomingChallenges(s, me);
  const outgoing = outgoingChallenges(s, me);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const f = await sendFriendRequest(code);
      setCode("");
      await refreshOnline();
      setMsg(f.status === "accepted" ? "Dere er venner nå!" : "Forespørsel sendt. Vennen må godta.");
      play("correct");
    } catch (err) { setMsg((err as Error).message); play("wrong"); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(s.me?.friend_code ?? ""); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } };

  return (
    <main className="page-layout page-narrow">
      <AppHeader title="Venner" />
      {s.error && <p role="alert" className="mb-3 text-sm text-destructive">{s.error}</p>}

      <Link to="/rivaler" className="quest mb-4" data-testid="rivals-link">
        <span className="quest__check text-xl">👾</span>
        <span className="min-w-0"><span className="block font-semibold">Rivalboken</span><span className="block text-xs text-muted-foreground">Spillerne fra Goblin-verdenen som har utfordret deg – stillingen mellom dere og omkamper</span></span>
        <span />
      </Link>

      <section className="card-game mb-4 p-4" aria-label="Din vennekode">
        <p className="eyebrow mb-1">Din vennekode</p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xl font-black tracking-widest tabular-nums" data-testid="friend-code">{s.me?.friend_code ?? "…"}</p>
          <Button variant="outline" size="sm" onClick={() => void copy()}>{copied ? <Check /> : <Copy />} {copied ? "Kopiert" : "Kopier"}</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{s.me?.username ? <>Brukernavnet ditt er <strong>@{s.me.username}</strong> – venner kan legge deg til med det eller med koden.</> : <>Gi koden til familie og klubbvenner, eller <Link to="/avatar" className="underline">velg et brukernavn</Link> som er lettere å huske.</>} Bare de du har lagt til kan utfordre deg.</p>
        <form onSubmit={(e) => void add(e)} className="mt-3 flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Brukernavn eller vennekode" aria-label="Brukernavn eller vennekode" autoCapitalize="none" autoCorrect="off" className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-base font-semibold" maxLength={20} />
          <Button type="submit" disabled={code.trim().length < 3}><UserPlus /> Legg til</Button>
        </form>
        {msg && <p role="status" className="mt-2 text-sm font-semibold text-primary">{msg}</p>}
      </section>

      {(incoming.length > 0 || requests.length > 0) && (
        <section className="mb-4 space-y-2" aria-label="Til deg">
          <p className="eyebrow">Til deg</p>
          {incoming.map((c) => (
            <div key={c.id} className="friend border-primary">
              <Swords className="size-6 text-primary" />
              <span className="min-w-0"><span className="block font-semibold">{s.profiles[c.from_user]?.name ?? "Venn"} utfordrer deg</span><span className="block text-xs text-muted-foreground">{tcLabel(c.initial_ms, c.inc_ms)} · {c.color === "random" ? "tilfeldig farge" : c.color === "w" ? "de har hvit" : "du har hvit"}</span></span>
              <span className="flex gap-1"><Button size="sm" variant="outline" aria-label="Avslå" onClick={() => void answerChallenge(c.id, "decline").then(refreshOnline)}><X /></Button><Button size="sm" onClick={() => void answerChallenge(c.id, "accept").then((g) => { void refreshOnline(); if (g) window.location.assign(`/live/${g}`); })}>Spill</Button></span>
            </div>
          ))}
          {requests.map((v) => (
            <div key={v.friendship.id} className="friend">
              <Avatar v={v} />
              <span className="min-w-0"><span className="block font-semibold">{v.profile?.name ?? "Noen"} vil bli venn</span><span className="block text-xs text-muted-foreground">Rating {v.profile?.rating ?? "–"}</span></span>
              <span className="flex gap-1"><Button size="sm" variant="outline" aria-label="Avslå" onClick={() => void respondFriendRequest(v.friendship.id, false).then(refreshOnline)}><X /></Button><Button size="sm" onClick={() => void respondFriendRequest(v.friendship.id, true).then(refreshOnline)}>Godta</Button></span>
            </div>
          ))}
        </section>
      )}

      <section className="mb-4 space-y-2" aria-label="Venner">
        <div className="flex items-center justify-between"><p className="eyebrow">Venner · {friends.length}</p><span className="text-xs text-muted-foreground">{friends.filter((f) => f.online).length} pålogget</span></div>
        {friends.length === 0 && <p className="text-sm text-muted-foreground">Ingen venner ennå. Bytt koder med noen i familien eller klubben.</p>}
        {friends.map((v) => {
          const out = outgoing.find((c) => c.to_user === v.userId);
          const game = s.activeGames.find((g) => g.white === v.userId || g.black === v.userId);
          return (
            <div key={v.friendship.id} className="friend">
              <Link to="/spiller/$id" params={{ id: v.userId }} aria-label={`Profilen til ${v.profile?.name ?? "venn"}`}><Avatar v={v} /></Link>
              <span className="min-w-0">
                <Link to="/spiller/$id" params={{ id: v.userId }} className="block font-semibold underline-offset-4 hover:underline"><span className={`friend__dot ${v.online ? "is-on" : ""}`} aria-hidden />{v.profile?.name ?? "Venn"} {flairEmoji(v.profile?.flair)}{v.profile?.username && <span className="ml-1 text-xs font-normal text-muted-foreground">@{v.profile.username}</span>}</Link>
                <span className="block text-xs text-muted-foreground">Rating {v.profile?.rating ?? "–"} · nivå {v.profile?.level ?? 1} · {v.profile?.streak ?? 0} 🔥 · {v.profile?.games ?? 0} partier</span>
              </span>
              {game ? <Link to="/live/$gameId" params={{ gameId: game.id }} className="btn-game text-sm">Til brettet</Link>
                : out ? <Button size="sm" variant="outline" onClick={() => void answerChallenge(out.id, "cancel").then(refreshOnline)}><Clock /> Venter…</Button>
                : <Button size="sm" onClick={() => setChallengeTo(v)}><Swords /> Utfordre</Button>}
            </div>
          );
        })}
        {waiting.map((v) => (
          <div key={v.friendship.id} className="friend opacity-70">
            <Avatar v={v} />
            <span className="min-w-0"><span className="block font-semibold">{v.profile?.name ?? "Venn"}</span><span className="block text-xs text-muted-foreground">Venter på at de godtar</span></span>
            <Button size="sm" variant="ghost" aria-label="Trekk tilbake" onClick={() => void removeFriend(v.friendship.id).then(refreshOnline)}><X /></Button>
          </div>
        ))}
      </section>

      <Link to="/partier" className="quest mt-2"><span className="quest__check"><ChevronRight className="size-5" /></span><span className="min-w-0"><span className="block font-semibold">Mine partier</span><span className="block text-xs text-muted-foreground">Alle partier – venner, bots og importerte – med full analyse</span></span></Link>

      <div className="mt-6 flex items-end gap-3">
        <Mike mood="chill" className="w-14" animate={false} />
        <p className="mike-bubble text-sm">{friends.length === 0 ? "Get a friend code from someone at the club. Beating a bot is nice. Beating a human is a story." : "Playing real people is the best training there is. Pick someone slightly better than you and go."}</p>
      </div>

      {challengeTo && <ChallengeSheet v={challengeTo} myRating={p.rating} onClose={() => setChallengeTo(null)} />}
    </main>
  );
}

function Avatar({ v }: { v: FriendView }) {
  const parts = v.profile?.avatar as unknown as Record<PartKey, string> | null | undefined;
  return parts ? <AvatarImage parts={parts} className="size-11" /> : <span className="grid size-11 place-items-center rounded-full bg-muted text-lg">👤</span>;
}
