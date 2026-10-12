import { afterEach, describe, expect, it, vi } from "vitest";

// Fake UCI worker: answers handshake; "go" answers with bestmove unless `hang` is set.
class FakeWorker {
  static instances: FakeWorker[] = [];
  static hang = false;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  terminated = false;
  constructor() { FakeWorker.instances.push(this); }
  postMessage(cmd: string) {
    const say = (d: string) => setTimeout(() => this.onmessage?.({ data: d }), 1);
    if (cmd === "uci") say("uciok");
    else if (cmd === "isready") say("readyok");
    else if (cmd.startsWith("go") && !FakeWorker.hang) say("bestmove e7e5");
  }
  terminate() { this.terminated = true; }
}

async function load() {
  vi.resetModules();
  FakeWorker.instances = [];
  vi.stubGlobal("Worker", FakeWorker);
  return (await import("./engine")).StockfishEngine;
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); FakeWorker.hang = false; });

describe("engine", () => {
  it("answers several bot turns in a row", async () => {
    const E = await load();
    const e = new E();
    for (let i = 0; i < 3; i++) expect(await e.bestMove("startpos", 50)).toBe("e7e5");
  });

  it("a hung search fails within a bounded time, restarts the worker, then works again", async () => {
    vi.useFakeTimers();
    const E = await load();
    const e = new E();
    FakeWorker.hang = true;
    const p = e.bestMove("startpos", 100);
    const caught = p.catch((x) => x as Error);
    await vi.advanceTimersByTimeAsync(10_200);
    expect(await caught).toBeInstanceOf(Error);
    expect(FakeWorker.instances[0]!.terminated).toBe(true);
    FakeWorker.hang = false;
    const next = e.bestMove("startpos", 50);
    await vi.advanceTimersByTimeAsync(100);
    expect(await next).toBe("e7e5");
    expect(FakeWorker.instances.length).toBe(2);
  });

  it("a worker crash rejects instead of waiting forever", async () => {
    const E = await load();
    const e = new E();
    await e.newGame();
    FakeWorker.hang = true;
    const p = e.bestMove("startpos", 5_000);
    setTimeout(() => FakeWorker.instances[0]!.onerror?.(), 5);
    await expect(p).rejects.toThrow();
  });
});
