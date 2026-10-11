import { describe, expect, it } from "vitest";
import { compareDrillMove, profileFocus } from "./debrief";
const m = { bestUci: "e2e4", playedUci: "a2a3" };
describe("review drill", () => {
  it("marks only the engine PV move as the engine suggestion", () => expect(compareDrillMove(m, "e2e4")).toBe("best"));
  it("recognises the game move", () => expect(compareDrillMove(m, "a2a3")).toBe("played"));
  it("never judges other legal moves as wrong", () => expect(compareDrillMove(m, "d2d4")).toBe("other"));
  it("uses allowed mate fact for Hikaru focus", () => {
    const mk = { fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", facts: { allowedMateIn: 2 } } as never;
    expect(profileFocus("hikaru", mk)).toContain("matt i 2");
  });
});
