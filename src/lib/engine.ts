// Stockfish (WASM, lite single-threaded) running in a Web Worker. Browser only.

export type AnalysisResult = { cp?: number; mate?: number; bestMove: string; pv: string[] };

type Listener = (line: string) => void;

export class StockfishEngine {
  private worker: Worker;
  private listeners = new Set<Listener>();
  private queue: Promise<unknown> = Promise.resolve();
  private ready: Promise<void>;

  constructor() {
    this.worker = new Worker("/stockfish/stockfish-19-lite-single.js");
    this.worker.onmessage = (e) => {
      const line = typeof e.data === "string" ? e.data : String(e.data);
      this.listeners.forEach((l) => l(line));
    };
    this.ready = this.init();
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  private waitFor(pred: (l: string) => boolean, onLine?: Listener): Promise<string> {
    return new Promise((resolve) => {
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
    const r = this.queue.then(() => this.ready).then(task);
    this.queue = r.catch(() => undefined);
    return r;
  }

  /** null = full strength */
  setStrength(elo: number | null) {
    return this.run(async () => {
      if (elo == null) {
        this.send("setoption name UCI_LimitStrength value false");
      } else {
        this.send("setoption name UCI_LimitStrength value true");
        this.send(`setoption name UCI_Elo value ${Math.max(1320, Math.min(3190, Math.round(elo)))}`);
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
      const line = await p;
      return line.split(" ")[1] ?? "";
    });
  }

  /** Score is from the side to move's perspective. */
  analyse(fen: string, depth: number): Promise<AnalysisResult> {
    return this.run(async () => {
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
          if (pvm) pv = pvm[1].trim().split(/\s+/);
        },
      );
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
      const line = await p;
      return { cp, mate, pv, bestMove: line.split(" ")[1] ?? "" };
    });
  }

  terminate() {
    this.worker.terminate();
  }
}

let shared: StockfishEngine | null = null;
export function getEngine(): StockfishEngine {
  if (!shared) shared = new StockfishEngine();
  return shared;
}
