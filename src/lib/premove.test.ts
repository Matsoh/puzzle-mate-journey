import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { canPremoveFrom, nextPremove, premoveSquares } from "./premove";

const START = new Chess().fen();

describe("premoves", () => {
  it("only own pieces, or squares a queued piece will land on", () => {
    expect(canPremoveFrom(START, "w", [], "e2")).toBe(true);
    expect(canPremoveFrom(START, "w", [], "e7")).toBe(false);
    expect(canPremoveFrom(START, "w", [], "e4")).toBe(false);
    const q = [{ from: "e2", to: "e4" }];
    expect(canPremoveFrom(START, "w", q, "e4")).toBe(true); // the pawn will be there
    expect(canPremoveFrom(START, "w", q, "e2")).toBe(false); // it has left
  });
  it("fires the first legal premove, clears on an illegal one, auto-queens", () => {
    const q = [{ from: "e2", to: "e4" }, { from: "g1", to: "f3" }];
    const n = nextPremove(START, q)!;
    expect(n.move).toEqual({ from: "e2", to: "e4" });
    expect(n.rest).toEqual([{ from: "g1", to: "f3" }]);
    expect(nextPremove(START, [{ from: "e2", to: "e5" }])).toBeNull();
    expect(nextPremove("8/P7/8/8/8/8/8/k6K w - - 0 1", [{ from: "a7", to: "a8" }])!.promotion).toBe("q");
    expect(premoveSquares(q)).toEqual(["e2", "e4", "g1", "f3"]);
  });
});
