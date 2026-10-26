// Parts (what Tobias picked in the workshop) → Zuri AvatarParams (what the renderer needs). Pure.
import { EYE_COLORS, HAIR_COLORS, SKIN_TONES, generateAvatar, type AvatarParams, type Expression, type FaceShape, type FacialHair, type Glasses, type HairStyle, type Outfit, type Presentation, type Earrings, type Accessory } from "@/vendor/zuri/params.ts";
import type { PartKey } from "./avatar";

export type AvatarLook = Record<PartKey, string>;

/** Stable seed so face proportions never jump when a part changes; the parts carry everything visible. */
const SEED = "goblin-chess";

export function paramsFor(look: AvatarLook): AvatarParams {
  const skinIndex = Math.max(0, Math.min(SKIN_TONES.length - 1, Number(look.skin) || 0));
  const p = generateAvatar(SEED, {
    presentation: look.style as Presentation,
    hair: look.hair as HairStyle,
    skin: skinIndex,
    outfit: look.outfit as Outfit,
    outfitColor: look.outfitColor,
    faceShape: look.face as FaceShape,
    glasses: look.glasses as Glasses,
    facialHair: look.beard as FacialHair,
    background: look.background,
    expression: look.mouth as Expression,
    accessory: look.accessory as Accessory,
  });
  const hairColor = HAIR_COLORS[look.hairColor as keyof typeof HAIR_COLORS] ?? HAIR_COLORS.darkBrown;
  p.hair.color = hairColor;
  p.brows.color = hairColor;
  p.eyes.color = EYE_COLORS[look.eyes as keyof typeof EYE_COLORS] ?? EYE_COLORS.brown;
  p.earrings = (look.earrings as Earrings) ?? "none";
  p.freckles = look.details === "freckles" || look.details === "both" ? 0.8 : 0;
  p.blush = look.details === "blush" || look.details === "both" ? 0.8 : 0;
  const brow = { normal: { thickness: 1, arch: 0.5 }, thin: { thickness: 0.6, arch: 0.5 }, thick: { thickness: 1.5, arch: 0.45 }, arched: { thickness: 1, arch: 1 }, flat: { thickness: 1.05, arch: 0.05 } }[look.brows] ?? { thickness: 1, arch: 0.5 };
  p.brows.thickness = brow.thickness;
  p.brows.arch = brow.arch;
  return p;
}

/** Cache key for rendered images. */
export const lookKey = (look: AvatarLook) => JSON.stringify(look);
