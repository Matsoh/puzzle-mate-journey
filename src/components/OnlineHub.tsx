import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/lib/progress";
import { avatarName } from "@/lib/avatar";
import { answerChallenge, ensureProfile, onlineAvailable, setOnlineUser, subscribeInbox, subscribePresence, syncProfile, tcLabel, unsubscribe } from "@/lib/online";
import { displayName, incomingChallenges, markSeen, outgoingChallenges, patchOnline, refreshOnline, resetOnline, useOnline } from "@/lib/online-store";
import { AvatarImage } from "./PlayerAvatar";
import { play } from "@/lib/sound";
import type { PartKey } from "@/lib/avatar";

/**
 * Keeps the social layer alive while the app is open: profile mirror, inbox
 * subscriptions, presence, the incoming-challenge popup, and the "game in
 * progress" banner. Renders nothing in the local dev mode.
 */
export function OnlineHub({ uid }: { uid: string }) {
  const p = useProgress();
  const s = useOnline();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [busy, setBusy] = useState<string | null>(null);
  const nameRef = useRef(avatarName(p));
  nameRef.current = avatarName(p);

  useEffect(() => {
    if (!onlineAvailable()) return;
    setOnlineUser(uid);
    let alive = true;
    void (async () => {
      try {
        const me = await ensureProfile(nameRef.current);
        if (!alive) return;
        patchOnline(() => ({ me, ready: true }));
        await refreshOnline();
      } catch { if (alive) patchOnline(() => ({ error: "Fikk ikke kontakt med vennetjenesten." })); }
    })();
    const inbox = subscribeInbox(() => void refreshOnline());
    const presence = subscribePresence((ids) => patchOnline(() => ({ online: ids })));
    const tick = setInterval(() => void refreshOnline(), 60_000);
    return () => { alive = false; clearInterval(tick); unsubscribe(inbox); unsubscribe(presence); setOnlineUser(null); resetOnline(); };
  }, [uid]);

  // Mirror name/avatar/rating to the public profile (debounced).
  useEffect(() => {
    if (!s.ready) return;
    const t = setTimeout(() => void syncProfile(p), 1500);
    return () => clearTimeout(t);
  }, [p, s.ready]);

  // My challenge got accepted → straight to the board.
  useEffect(() => {
    for (const c of s.challenges) {
      if (c.from_user === uid && c.status === "accepted" && c.game_id && !s.seen.has(c.id)) {
        markSeen(c.id);
        play("correct");
        void navigate({ to: "/live/$gameId", params: { gameId: c.game_id } });
        return;
      }
    }
  }, [s.challenges, s.seen, uid, navigate]);

  if (!onlineAvailable()) return null;
  const incoming = incomingChallenges(s, uid).filter((c) => !s.seen.has(c.id));
  const popup = incoming[0];
  const outgoing = outgoingChallenges(s, uid);
  const active = s.activeGames[0];
  const onBoard = path.startsWith("/live/");

  const answer = async (id: string, action: "accept" | "decline") => {
    setBusy(id);
    try {
      const gameId = await answerChallenge(id, action);
      markSeen(id);
      await refreshOnline();
      if (gameId) void navigate({ to: "/live/$gameId", params: { gameId } });
    } catch { markSeen(id); }
    finally { setBusy(null); }
  };

  return (
    <>
      {popup && (
        <div role="dialog" aria-modal="true" aria-label="Utfordring" className="celebrate">
          <div className="celebrate__card animate-pop">
            <div className="mx-auto w-24">{s.profiles[popup.from_user]?.avatar ? <AvatarImage parts={s.profiles[popup.from_user]!.avatar as unknown as Record<PartKey, string>} /> : <Swords className="mx-auto size-16 text-primary" />}</div>
            <p className="celebrate__eyebrow">Utfordring!</p>
            <h2 className="celebrate__title">{displayName(s, popup.from_user)}</h2>
            <p className="celebrate__sub">vil spille {tcLabel(popup.initial_ms, popup.inc_ms)} · {popup.color === "random" ? "tilfeldig farge" : popup.color === "w" ? "de har hvit" : "du har hvit"}{s.profiles[popup.from_user]?.rating ? ` · rating ${s.profiles[popup.from_user]!.rating}` : ""}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="outline" size="lg" disabled={busy === popup.id} onClick={() => void answer(popup.id, "decline")}>Nei takk</Button>
              <Button size="lg" className="font-bold" disabled={busy === popup.id} onClick={() => void answer(popup.id, "accept")}>Spill!</Button>
            </div>
          </div>
        </div>
      )}
      {!popup && !onBoard && active && (
        <Link to="/live/$gameId" params={{ gameId: active.id }} className="online-banner">
          <Swords className="size-4" /> Parti mot {displayName(s, active.white === uid ? active.black : active.white)} pågår – til brettet
        </Link>
      )}
      {!popup && !onBoard && !active && outgoing[0] && (
        <div className="online-banner is-muted">Venter på svar fra {displayName(s, outgoing[0].to_user)} … <button type="button" className="underline" onClick={() => void answerChallenge(outgoing[0]!.id, "cancel").then(() => refreshOnline())}>Avbryt</button></div>
      )}
    </>
  );
}
