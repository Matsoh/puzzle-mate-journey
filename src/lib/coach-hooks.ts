// Extension points for the coach. Disabled in v1 — everything stays client-side.
// Later: plug in an LLM rephraser (via a server function + Lovable AI) and a TTS voice.

import type { MistakeFacts } from "./coach";

export interface ExplanationRephraser {
  /** Must only rephrase — facts come from Stockfish and must not be changed. */
  rephrase(facts: MistakeFacts, baseText: string): Promise<string>;
}

export interface CoachVoice {
  speak(text: string): Promise<void>;
  stop(): void;
}

export const COACH_FEATURES = {
  llmRephrase: false,
  voice: false,
};

const identity: ExplanationRephraser = { rephrase: async (_f, t) => t };
const silent: CoachVoice = { speak: async () => undefined, stop: () => undefined };

let rephraser: ExplanationRephraser = identity;
let voice: CoachVoice = silent;

export function setRephraser(r: ExplanationRephraser) {
  rephraser = r;
}
export function setCoachVoice(v: CoachVoice) {
  voice = v;
}
export function getRephraser(): ExplanationRephraser {
  return COACH_FEATURES.llmRephrase ? rephraser : identity;
}
export function getCoachVoice(): CoachVoice {
  return COACH_FEATURES.voice ? voice : silent;
}
