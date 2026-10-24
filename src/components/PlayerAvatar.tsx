import { useMemo } from "react";
import { createAvatar } from "@/vendor/dicebear/core/index.js";
import * as avataaars from "@/vendor/dicebear/avataaars/index.js";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progress";
import { avatarName, avatarOf, type PartKey } from "@/lib/avatar";

/** SVG for a parts map (Avataaars via DiceBear, all local). Pure, memoised by callers. */
export function avatarSvg(parts: Record<PartKey, string>, circle = true): string {
  return createAvatar(avataaars, {
    seed: "tobias",
    style: [circle ? "circle" : "default"],
    skinColor: [parts.skin],
    top: [parts.hair as never],
    topProbability: 100,
    hairColor: [parts.hairColor],
    hatColor: [parts.clothesColor],
    eyes: [parts.eyes as never],
    eyebrows: [parts.eyebrows as never],
    mouth: [parts.mouth as never],
    clothing: [parts.clothing as never],
    clothesColor: [parts.clothesColor],
    clothingGraphic: [parts.graphic as never],
    accessories: parts.accessories === "none" ? [] : [parts.accessories as never],
    accessoriesProbability: parts.accessories === "none" ? 0 : 100,
    accessoriesColor: ["262e33"],
    facialHairProbability: 0,
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
