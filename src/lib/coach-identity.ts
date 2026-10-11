import type { CoachId } from "./trainer";

export const COACH_IDENTITY: Record<CoachId, { label: string; src: string }> = {
  magnus: { label: "Magnus-inspirert trener", src: "/coach-magnus-avatar.png" },
  hikaru: { label: "Hikaru-inspirert trener", src: "/coach-hikaru-avatar.png" },
};
