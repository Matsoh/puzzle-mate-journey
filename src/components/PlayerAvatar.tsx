import { useMemo } from "react";
import { createAvatar } from "@/vendor/dicebear/core/index.js";
import * as adventurer from "@/vendor/dicebear/adventurer/index.js";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progress";
import { avatarName, avatarOf, type PartKey } from "@/lib/avatar";

/** SVG for a parts map (Adventurer via DiceBear, all local). Pure, memoised by callers. */
export function avatarSvg(parts: Record<PartKey, string>, circle = true): string {
  return createAvatar(adventurer, {
    seed: "tobias",
    radius: circle ? 50 : 0,
    skinColor: [parts.skin],
    hair: [parts.hair as never],
    hairProbability: 100,
    hairColor: [parts.hairColor],
    eyes: [parts.eyes as never],
    eyebrows: [parts.eyebrows as never],
    mouth: [parts.mouth as never],
    glasses: parts.glasses === "none" ? [] : [parts.glasses as never],
    glassesProbability: parts.glasses === "none" ? 0 : 100,
    earrings: parts.earrings === "none" ? [] : [parts.earrings as never],
    earringsProbability: parts.earrings === "none" ? 0 : 100,
    features: parts.features === "none" ? [] : [parts.features as never],
    featuresProbability: parts.features === "none" ? 0 : 100,
    backgroundColor: [parts.background],
  }).toString();
}

export function AvatarImage({ parts, className, circle = true }: { parts: Record<PartKey, string>; className?: string | undefined; circle?: boolean }) {
  const src = useMemo(() => `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg(parts, circle))}`, [parts, circle]);
  return <img src={src} alt="" draggable={false} className={cn("block select-none", className)} />;
}

/** The player's own avatar, as built in Avatarverkstedet. */
export function PlayerAvatar({ className }: { className?: string }) {
  const p = useProgress();
  const parts = useMemo(() => avatarOf(p), [p]);
  return (
    <span className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted", className)} role="img" aria-label={avatarName(p)}>
      <AvatarImage parts={parts} className="absolute inset-0 size-full" />
    </span>
  );
}
