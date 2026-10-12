// Stockfish (WASM, lite single-threaded) running in a Web Worker. Browser only.

export type AnalysisResult = {
  cp?: number | undefined;
  mate?: number | undefined;
  bestMove: string;
  pv: string[];
};

type Listener = (line: string) => void;

export class StockfishEngine {
  private worker!: Worker;
  private listeners = new Set<Listener>();
  private queue: Promise<unknown> = Promise.resolve();
  private ready!: Promise<void>;
  private strength: number | null = null;
  private failAll: ((e: Error) => void)[] = [];

  constructor() {
    this.boot();
  }

  /** (Re)start the worker. Pending waits are rejected so no caller hangs forever. */
  private boot() {
    this.worker = new Worker("/stockfish/stockfish-19-lite-single.js");
    this.worker.onmessage = (e) => {
      const line = typeof e.data === "string" ? e.data : String(e.data);
      this.listeners.forEach((l) => l(line));
    };
    const crash = () => this.fail(new Error("Stockfish worker error"));
    this.worker.onerror = crash;
    this.worker.onmessageerror = crash;
    this.ready = withTimeout(this.init(), 15_000, () => this.fail(new Error("Stockfish init timeout")));
    this.ready.catch(() => undefined);
  }

  private fail(err: Error) {
    const f = this.failAll;
    this.failAll = [];
    this.listeners.clear();
    f.forEach((r) => r(err));
  }

  /** Kill a stuck/crashed worker and boot a fresh one with the last strength. */
  private restart() {
    this.fail(new Error("Stockfish restarted"));
    try { this.worker.terminate(); } catch { /* already gone */ }
    this.boot();
    const elo = this.strength;
    this.ready = this.ready.then(async () => { this.applyStrength(elo); await this.isReady(); });
    this.ready.catch(() => undefined);
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  private waitFor(pred: (l: string) => boolean, onLine?: Listener): Promise<string> {
    return new Promise((resolve, reject) => {
      this.failAll.push(reject);
      const l: Listener = (line) => {
        onLine?.(line);
        if (pred(line)) {
          this.listeners.delete(l);
          resolve(line);
        }
      };
      this.listeners.add(l);
    });
  }

  private async init() {
    const ok = this.waitFor((l) => l.startsWith("uciok"));
    this.send("uci");
    await ok;
    await this.isReady();
  }

  private async isReady() {
    const p = this.waitFor((l) => l.startsWith("readyok"));
    this.send("isready");
    await p;
  }

  private run<T>(task: () => Promise<T>): Promise<T> {
    const r = this.queue.then(() => this.ready).then(task).catch((e) => {
      // Any failure (crash, timeout) gets a fresh worker so the next request can succeed.
      this.restart();
      throw e;
    });
    this.queue = r.catch(() => undefined);
    return r;
  }

  /** null = full strength */
  setStrength(elo: number | null) {
    this.strength = elo;
    return this.run(async () => {
      if (elo == null) {
        this.send("setoption name UCI_LimitStrength value false");
      } else {
        this.send("setoption name UCI_LimitStrength value true");
        this.send(
          `setoption name UCI_Elo value ${Math.max(1320, Math.min(3190, Math.round(elo)))}`,
        );
      }
      await this.isReady();
    });
  }

  newGame() {
    return this.run(async () => {
      this.send("ucinewgame");
      await this.isReady();
    });
  }

  bestMove(fen: string, movetimeMs: number): Promise<string> {
    return this.run(async () => {
      const p = this.waitFor((l) => l.startsWith("bestmove"));
      this.send(`position fen ${fen}`);
      this.send(`go movetime ${Math.round(movetimeMs)}`);
      // Bounded: never wait forever for a bestmove.
      const line = await withTimeout(p, movetimeMs + 10_000, () => this.fail(new Error("Stockfish bestmove timeout")));
      return line.split(" ")[1] ?? "";
    });
  }

  /** Score is from the side to move's perspective. */
  analyse(fen: string, depth: number): Promise<AnalysisResult> {
    return this.run(() => this.analyseNow(fen, depth));
  }

  private applyStrength(elo: number | null) {
    if (elo == null) this.send("setoption name UCI_LimitStrength value false");
    else {
      this.send("setoption name UCI_LimitStrength value true");
      this.send(`setoption name UCI_Elo value ${Math.max(1320, Math.min(3190, Math.round(elo)))}`);
    }
  }

  /** Full-strength analysis in one queued job, then restores the bot strength — bot moves never interleave. */
  analyseFull(fen: string, depth: number, restoreElo: number | null): Promise<AnalysisResult> {
    return this.run(async () => {
      this.applyStrength(null);
      await this.isReady();
      try {
        return await this.analyseNow(fen, depth);
      } finally {
        this.applyStrength(restoreElo);
        await this.isReady();
      }
    });
  }

  private analyseNow(fen: string, depth: number): Promise<AnalysisResult> {
    return (async () => {
      let cp: number | undefined;
      let mate: number | undefined;
      let pv: string[] = [];
      const p = this.waitFor(
        (l) => l.startsWith("bestmove"),
        (line) => {
          if (!line.startsWith("info") || !line.includes(" score ")) return;
          if (line.includes(" multipv ") && !line.includes(" multipv 1 ")) return;
          const m = line.match(/score (cp|mate) (-?\d+)/);
          if (m) {
            if (m[1] === "cp") {
              cp = Number(m[2]);
              mate = undefined;
            } else {
              mate = Number(m[2]);
              cp = undefined;
            }
          }
          const pvm = line.match(/ pv (.+)$/);
          if (pvm?.[1]) pv = pvm[1].trim().split(/\s+/);
        },
      );
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
      const line = await p;
      return { cp, mate, pv, bestMove: line.split(" ")[1] ?? "" };
    })();
  }

  terminate() {
    this.worker.terminate();
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p,
    new Promise<T>((_, rej) => {
      t = setTimeout(() => { onTimeout(); rej(new Error("timeout")); }, ms);
    }),
  ]).finally(() => clearTimeout(t));
}

let shared: StockfishEngine | null = null;
export function getEngine(): StockfishEngine {
  if (!shared) shared = new StockfishEngine();
  return shared;
}
