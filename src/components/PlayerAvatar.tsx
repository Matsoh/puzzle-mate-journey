import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progress";
import { avatarName, avatarOf, normalizeLook } from "@/lib/avatar";
import { lookKey, type AvatarLook } from "@/lib/avatar-params";
import { flatLook, recallOwn, rememberOwn, renderLook } from "@/lib/avatar-render";

/** Image URL for a look: cached 3D render when ready, flat drawing meanwhile. */
export function useAvatarImage(look: AvatarLook, size = 256, own = false): { src: string; ready: boolean } {
  const key = lookKey(look);
  const [state, setState] = useState<{ key: string; src: string; ready: boolean }>(() => {
    const cached = own ? recallOwn(look) : null;
    return { key, src: cached ?? flatLook(look, size), ready: !!cached };
  });
  useEffect(() => {
    let alive = true;
    const cached = own ? recallOwn(look) : null;
    if (cached) { setState({ key, src: cached, ready: true }); return; }
    setState((s) => (s.key === key ? s : { key, src: flatLook(look, size), ready: false }));
    renderLook(look, size).then((url) => { if (!alive) return; setState({ key, src: url, ready: true }); if (own) rememberOwn(look, url); }).catch(() => { /* keep the flat drawing */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, size, own]);
  return state.key === key ? { src: state.src, ready: state.ready } : { src: flatLook(look, size), ready: false };
}

export function AvatarImage({ parts, className, size = 256, own = false }: { parts: Record<string, unknown>; className?: string | undefined; size?: number; own?: boolean }) {
  const look = useMemo(() => normalizeLook(parts), [parts]);
  const { src, ready } = useAvatarImage(look, size, own);
  return <img src={src} alt="" draggable={false} className={cn("block select-none", ready ? "" : "opacity-80", className)} />;
}

/** The player's own avatar, as built in Avatarverkstedet. */
export function PlayerAvatar({ className }: { className?: string }) {
  const p = useProgress();
  const parts = useMemo(() => avatarOf(p), [p]);
  return (
    <span className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted", className)} role="img" aria-label={avatarName(p)}>
      <AvatarImage parts={parts} own className="absolute inset-0 size-full object-cover" />
    </span>
  );
}
