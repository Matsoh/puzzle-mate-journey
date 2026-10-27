import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Swords, ChevronLeft, Clock } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { AvatarImage } from "@/components/PlayerAvatar";
import { GameRow } from "@/components/GameRow";
import { ChallengeSheet } from "@/components/ChallengeSheet";
import { Mike } from "@/components/Mike";
import { useProgress } from "@/lib/progress";
import { fetchProfiles, liveAsArchive, myUserId, onlineAvailable, recentGamesFor, answerChallenge, type LiveGame, type Profile } from "@/lib/online";
import { friendViews, outgoingChallenges, refreshOnline, useOnline } from "@/lib/online-store";
import { OPPONENTS } from "@/lib/opponents";
import { flairEmoji } from "@/lib/flair";
import { levelTitle } from "@/lib/quests";
import type { PartKey } from "@/lib/avatar";

export const Route = createFileRoute("/spiller/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Spillerprofil – Goblin Chess" }] }),
  component: PlayerPage,
});

/** A friend's profile, chess.com-style: who they are, how good they are, and every game they've played against friends. */
function PlayerPage() {
  const { id } = Route.useParams();
  const me = myUserId() ?? "";
  const p = useProgress();
  const s = useOnline();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null | undefined>(s.profiles[id]);
  const [games, setGames] = useState<LiveGame[] | null>(null);
  const [others, setOthers] = useState<Record<string, Profile>>({});
  const [challenge, setChallenge] = useState(false);

  useEffect(() => {
    if (!onlineAvailable()) return;
    let alive = true;
    void (async () => {
      try {
        const [profs, gs] = await Promise.all([fetchProfiles([id]), recentGamesFor(id, 40)]);
        if (!alive) return;
        setProfile(profs[id] ?? null);
        setGames(gs);
        const ids = [...new Set(gs.flatMap((g) => [g.white, g.black]))].filter((x) => x !== id && !s.profiles[x]);
        if (ids.length) setOthers(await fetchProfiles(ids));
      } catch { if (alive) { setProfile((pr) => pr ?? null); setGames([]); } }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const friend = useMemo(() => friendViews(s, me).find((v) => v.userId === id), [s, me, id]);
  const isMe = id === me;
  const isFriend = !!friend && friend.friendship.status === "accepted";
  const online = s.online.has(id);
  const out = outgoingChallenges(s, me).find((c) => c.to_user === id);
  const activeGame = s.activeGames.find((g) => g.white === id || g.black === id);
  const nameOf = (uid: string) => (uid === me ? "deg" : (s.profiles[uid] ?? others[uid])?.name ?? "Venn");
  const ratingOf = (uid: string) => (s.profiles[uid] ?? others[uid])?.rating ?? null;

  if (!onlineAvailable()) return <main className="page-layout page-narrow"><AppHeader title="Spiller" /><p className="text-sm text-muted-foreground">Spillerprofiler finnes bare i den publiserte appen.</p></main>;
  if (profile === undefined) return <main className="page-layout page-narrow"><AppHeader title="Spiller" /><p role="status" className="text-sm text-muted-foreground">Henter profilen …</p></main>;
  if (profile === null) return <main className="page-layout page-narrow"><AppHeader title="Spiller" /><p className="text-sm">Fant ikke spilleren.</p><Link to="/venner" className="btn-game mt-4 inline-flex">Til venner</Link></main>;

  const losses = Math.max(0, profile.games - profile.wins - profile.draws);
  const since = new Date(profile.created_at).toLocaleDateString("nb-NO", { month: "long", year: "numeric" });
  const rows = (games ?? []).filter((g) => g.result).map((g) => { const opp = g.white === id ? g.black : g.white; return liveAsArchive(g, id, nameOf(opp), ratingOf(opp)); });
  const vsMe = (games ?? []).filter((g) => g.result && (g.white === me || g.black === me));
  const myScore = vsMe.reduce((a, g) => a + (g.result === "d" ? 0.5 : (g.result === "w" ? g.white : g.black) === me ? 1 : 0), 0);

  return (
    <main className="page-layout page-narrow">
      <AppHeader title={profile.name} />
      <section className="card-game mb-4 p-4" aria-label="Profil">
        <div className="flex items-center gap-4">
          <span className="relative">
            <AvatarImage parts={(profile.avatar ?? {}) as Record<PartKey, string>} className="size-24 rounded-2xl" size={192} />
            <span className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-card ${online ? "bg-[#4ade80]" : "bg-muted-foreground"}`} title={online ? "Pålogget" : "Ikke pålogget"} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-black">{profile.name} {flairEmoji(profile.flair)}</h2>
            <p className="text-sm text-muted-foreground">{profile.username ? `@${profile.username} · ` : ""}{levelTitle(profile.level)} · nivå {profile.level}</p>
            <p className="text-xs text-muted-foreground">Medlem siden {since}{online ? " · pålogget nå" : ""}</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
          {([["Rating", profile.rating], ["Partier", profile.games], ["Seire", profile.wins], ["Remis", profile.draws], ["Tap", losses], ["Streak", `${profile.streak} 🔥`]] as const).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border bg-background/60 px-2 py-2"><dt className="text-[11px] text-muted-foreground">{k}</dt><dd className="text-lg font-black tabular-nums">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">Motstanderstigen: {profile.beaten}/{OPPONENTS.length} bots slått{profile.beaten >= OPPONENTS.length ? " – hele stigen! 🏆" : ""}{!isMe && vsMe.length > 0 ? ` · Mot deg: ${myScore}–${vsMe.length - myScore} av ${vsMe.length}` : ""}</p>
        {!isMe && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeGame ? <Link to="/live/$gameId" params={{ gameId: activeGame.id }} className="btn-game"><Swords /> Til brettet</Link>
              : out ? <Button variant="outline" onClick={() => void answerChallenge(out.id, "cancel").then(refreshOnline)}><Clock /> Venter på svar …</Button>
              : isFriend ? <Button onClick={() => setChallenge(true)}><Swords /> Utfordre</Button>
              : <p className="text-sm text-muted-foreground">Dere er ikke venner ennå – legg til med @{profile.username ?? "brukernavn"} på Venner-siden.</p>}
          </div>
        )}
        {isMe && <Link to="/avatar" className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline">Dette er deg – endre avatar og navn</Link>}
      </section>

      <section className="space-y-2" aria-label="Partier mot venner">
        <div className="flex items-center justify-between"><p className="eyebrow">Partier mot venner · {rows.length}</p></div>
        {games === null && <p className="text-sm text-muted-foreground">Henter partier …</p>}
        {games !== null && rows.length === 0 && <p className="text-sm text-muted-foreground">{isFriend || isMe ? "Ingen ferdige partier mot venner ennå." : "Bare venner kan se partiene."}</p>}
        {rows.map((g) => <GameRow key={g.id} g={g} reviewed={false} onOpen={() => void nav({ to: "/live/$gameId", params: { gameId: g.id.slice(5) }, search: { for: id } })} />)}
      </section>

      <Link to="/venner" className="mt-5 inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"><ChevronLeft className="size-4" /> Til venner</Link>

      <div className="mt-6 flex items-end gap-3">
        <Mike mood="chill" className="w-14" animate={false} />
        <p className="mike-bubble text-sm">{isMe ? "That's you. Looking good. Now go make those numbers bigger." : profile.rating > p.rating + 50 ? "Stronger than you on paper. Perfect. That's who you learn from." : "Open one of their games and find the moment it turned. That's how you read an opponent."}</p>
      </div>

      {challenge && friend && <ChallengeSheet v={friend} myRating={p.rating} onClose={() => setChallenge(false)} />}
    </main>
  );
}
