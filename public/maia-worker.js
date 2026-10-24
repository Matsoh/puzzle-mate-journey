/* Maia 3 web worker for Goblin Chess: downloads the ONNX model once (cached in
 * IndexedDB), then answers {fen tokens, elo} → move logits off the main thread.
 * Messages in:  {type:"init", modelUrl, version} | {type:"download"} | {type:"infer", id, tokens, eloSelf, eloOppo}
 * Messages out: {type:"status", status, progress?} | {type:"result", id, logits} | {type:"error", id?, message}
 */
importScripts("/ort/ort.wasm.min.js");
const ORT = self.ort;
ORT.env.wasm.wasmPaths = "/ort/";
ORT.env.wasm.numThreads = 1;

const DB = "goblin-maia", STORE = "models", KEY = "maia3";
let session = null, modelUrl = null, version = null;

function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(STORE, { keyPath: "id" }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function cached() {
  try {
    const db = await openDb();
    const row = await new Promise((res, rej) => { const q = db.transaction(STORE).objectStore(STORE).get(KEY); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); });
    if (!row || row.version !== version) return null;
    return await row.data.arrayBuffer();
  } catch { return null; }
}
async function store(buf) {
  try {
    const db = await openDb();
    await new Promise((res, rej) => { const q = db.transaction(STORE, "readwrite").objectStore(STORE).put({ id: KEY, version, data: new Blob([buf]) }); q.onsuccess = () => res(); q.onerror = () => rej(q.error); });
  } catch { /* storage may be blocked; the model still works this session */ }
}
async function load(buf) {
  session = await ORT.InferenceSession.create(buf);
  postMessage({ type: "status", status: "ready" });
}

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "init") {
      modelUrl = m.modelUrl; version = m.version;
      const buf = await cached();
      if (buf) await load(buf); else postMessage({ type: "status", status: "missing" });
    } else if (m.type === "download") {
      postMessage({ type: "status", status: "downloading", progress: 0 });
      const res = await fetch(modelUrl);
      if (!res.ok || !res.body) throw new Error("download failed " + res.status);
      const total = +(res.headers.get("Content-Length") || 0);
      const reader = res.body.getReader();
      const chunks = []; let got = 0, last = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); got += value.length;
        const p = total ? Math.floor((got / total) * 100) : 0;
        if (p >= last + 5) { last = p; postMessage({ type: "status", status: "downloading", progress: p }); }
      }
      const buf = new Uint8Array(got); let pos = 0;
      for (const c of chunks) { buf.set(c, pos); pos += c.length; }
      await store(buf.buffer);
      await load(buf.buffer);
    } else if (m.type === "infer") {
      if (!session) { postMessage({ type: "error", id: m.id, message: "not ready" }); return; }
      const feeds = {
        tokens: new ORT.Tensor("float32", new Float32Array(m.tokens), [1, 64, 12]),
        elo_self: new ORT.Tensor("float32", Float32Array.from([m.eloSelf]), [1]),
        elo_oppo: new ORT.Tensor("float32", Float32Array.from([m.eloOppo]), [1]),
      };
      const out = await session.run(feeds);
      const logits = new Float32Array(out.logits_move.data);
      const wdl = new Float32Array(out.logits_value.data);
      postMessage({ type: "result", id: m.id, logits: logits.buffer, wdl: wdl.buffer }, [logits.buffer, wdl.buffer]);
    }
  } catch (err) {
    postMessage({ type: "error", id: m.id, message: (err && err.message) || String(err) });
  }
};
