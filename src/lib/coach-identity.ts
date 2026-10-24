import type { CoachId } from "./trainer";

/** Mike is the only trainer. The avatar is drawn (components/Mike.tsx), so no portrait file. */
export const COACH_IDENTITY: Record<CoachId, { label: string; src: null }> = {
  mike: { label: "Mike", src: null },
};
