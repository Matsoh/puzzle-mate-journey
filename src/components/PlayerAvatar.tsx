import { useMemo } from "react";
import { createAvatar } from "@/vendor/dicebear/core/index.js";
import * as avataaars from "@/vendor/dicebear/avataaars/index.js";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progress";
import { avatarName, avatarOf, type PartKey } from "@/lib/avatar";
import { isSkinId, skinSrc } from "@/lib/skins";

/** Parts map, optionally with a chosen 3D skin that replaces the built avatar. */
export type AvatarLook = Record<PartKey, string> & { skin3d?: string | null | undefined };

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

export function AvatarImage({ parts, className, circle = true }: { parts: AvatarLook; className?: string | undefined; circle?: boolean }) {
  const skin = isSkinId(parts.skin3d) ? parts.skin3d : null;
  const src = useMemo(() => (skin ? skinSrc(skin) : `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg(parts, circle))}`), [parts, circle, skin]);
  return <img src={src} alt="" draggable={false} className={cn("block select-none", skin && circle ? "skin-circle" : "", className)} />;
}

/** The player's own avatar, as built in Avatarverkstedet. */
export function PlayerAvatar({ className }: { className?: string }) {
  const p = useProgress();
  const parts = useMemo<AvatarLook>(() => ({ ...avatarOf(p), skin3d: p.skin }), [p]);
  return (
    <span className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted", className)} role="img" aria-label={avatarName(p)}>
      <AvatarImage parts={parts} className="absolute inset-0 size-full" />
    </span>
  );
}
