import { useEffect, useRef } from "react";
import { lookKey, type AvatarLook } from "@/lib/avatar-params";
import { mountLook, type LiveLook } from "@/lib/avatar-render";
import { flatLook } from "@/lib/avatar-render";
import { figureSrc } from "@/lib/avatar";

/** The workshop's big preview: a living 3D head (blinks, sways, drag to turn). Falls back to the flat drawing if WebGL is unavailable. */
export function LiveAvatar({ look, className = "" }: { look: AvatarLook; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef<LiveLook | null>(null);
  const key = lookKey(look);
  const fig = figureSrc(look);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || fig) return;
    try { live.current = mountLook(canvas, look); } catch { live.current = null; }
    return () => { live.current?.dispose(); live.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fig]);
  useEffect(() => { live.current?.update(look); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);
  if (fig) return <div className={`relative grid place-items-center ${className}`} style={{ background: look.background }}><img src={fig} alt="Figuren din" draggable={false} className="size-[88%] object-contain" /></div>;
  return (
    <div className={`relative ${className}`} style={{ background: look.background }}>
      <img src={flatLook(look, 64)} alt="" aria-hidden className="absolute inset-0 size-full opacity-30 blur-sm" />
      <canvas ref={ref} className="relative size-full touch-none" aria-label="Avataren din i 3D – dra for å snu" />
    </div>
  );
}
