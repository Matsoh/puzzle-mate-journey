import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { INDEX_MOVE, MOVE_INDEX, VOCAB_SIZE, boardTokens, encode, mirrorFen, mirrorMove, policyFromLogits, sampleHumanMove } from "./maia";

describe("Maia encoding", () => {
  it("builds the 4352-move vocabulary in the model's order", () => {
    expect(VOCAB_SIZE).toBe(4352);
    expect(INDEX_MOVE[0]).toBe("a1a1");
    expect(INDEX_MOVE[1]).toBe("a1b1");
    expect(INDEX_MOVE[8]).toBe("a1a2");
    expect(INDEX_MOVE[4095]).toBe("h8h8");
    expect(INDEX_MOVE[4096]).toBe("a7a8q");
    expect(INDEX_MOVE[4100]).toBe("a7b8q");
    expect(INDEX_MOVE[4351]).toBe("h7h8n");
    expect(MOVE_INDEX["e2e4"]).toBe(INDEX_MOVE.indexOf("e2e4"));
  });
  it("mirrors FENs and moves so Black becomes White", () => {
    const fen = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2";
    const m = mirrorFen(fen);
    expect(m).toBe("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2");
    expect(mirrorMove("g8f6")).toBe("g1f3");
    expect(mirrorFen("4k3/8/8/8/8/8/8/R3K3 b Q - 0 1")).toBe("r3k3/8/8/8/8/8/8/4K3 w q - 0 1");
    expect(new Chess(m).moves().length).toBe(new Chess(fen).moves().length);
  });
  it("tokens are one-hot per square and mirrored legal moves map back", () => {
    const t = boardTokens(new Chess().fen());
    expect(t.reduce((a, b) => a + b, 0)).toBe(32);
    expect(t[(0 * 8 + 4) * 12 + 5]).toBe(1); // white king on e1
    const enc = encode("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2");
    expect(enc.mirrored).toBe(true);
    const logits = new Float32Array(VOCAB_SIZE);
    logits[MOVE_INDEX["g1f3"]!] = 5; // in the mirrored frame = Black's Nf6
    const pol = policyFromLogits(enc, logits);
    expect(pol[0]!.uci).toBe("g8f6");
    expect(pol.reduce((a, m) => a + m.p, 0)).toBeCloseTo(1, 5);
  });
  it("samples more conservatively at higher ratings", () => {
    const pol = [{ uci: "a", p: 0.5 }, { uci: "b", p: 0.3 }, { uci: "c", p: 0.2 }];
    let lo = 0, hi = 0;
    for (let i = 0; i < 400; i++) { const r = ((i * 7919) % 400) / 400; if (sampleHumanMove(pol, 1200, () => r) === "a") lo++; if (sampleHumanMove(pol, 2000, () => r) === "a") hi++; }
    expect(hi).toBeGreaterThan(lo);
    expect(sampleHumanMove(pol, 1500, () => 0)).toBe("a");
  });
});
