import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { botMood, botQuip } from "./bot-mood";
import { OPPONENTS } from "./opponents";
import type { PlayedMove } from "./coach";

function play(sans: string[]): { fen: string; moves: PlayedMove[] } {
  const c = new Chess(); const moves: PlayedMove[] = [];
  for (const s of sans) { const fenBefore = c.fen(); const m = c.move(s); moves.push({ fenBefore, uci: m.from + m.to, san: m.san, color: m.color }); }
  return { fen: c.fen(), moves };
}

describe("bot mood", () => {
  it("reacts to captures, material and the result", () => {
    expect(botMood({ ...play([]), player: "w" })).toBe("idle");
    expect(botMood({ ...play(["e4"]), player: "w" })).toBe("think");
    // human takes a piece → angry
    expect(botMood({ ...play(["e4", "d5", "exd5"]), player: "w" })).toBe("angry");
    // bot takes back → happy
    expect(botMood({ ...play(["e4", "d5", "exd5", "Qxd5"]), player: "w" })).toBe("happy");
    // bot a queen down → sad
    expect(botMood({ ...play(["e4", "e5", "Qh5", "Nc6", "Qxe5+", "Nxe5"]), player: "b" })).toBe("sad");
    expect(botMood({ ...play([]), player: "w", outcome: "win" })).toBe("lose");
    expect(botMood({ ...play([]), player: "w", outcome: "loss" })).toBe("win");
    expect(botMood({ ...play([]), player: "w", outcome: "draw" })).toBe("draw");
  });
  it("quips with personality", () => {
    const et = OPPONENTS.find((o) => o.id === "storm")!;
    expect(botQuip(et, "lose", 0)).toBe(et.winLine);
    expect(botQuip(et, "win", 0)).toMatch(/Jorda/);
    expect(botQuip(undefined, "angry", 1)).toBeTruthy();
    for (const o of OPPONENTS) expect(o.portrait).toMatch(/^\/bots\/\d+\.png$/);
  });
});
