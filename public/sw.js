// Goblin Chess service worker: offline-capable shell + cached chess engine.
const CACHE = "goblin-chess-v5-coaches";
const PRECACHE = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/stockfish/stockfish-19-lite-single.js", "/stockfish/stockfish-19-lite-single.wasm"];
const PORTRAIT_PRECACHE = ["/coach-stage.png", "/coach-hero.png", "/coach-magnus-avatar.png", "/coach-hikaru-avatar.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(PRECACHE);
    // Optional until uploaded: missing portraits must not break offline installation.
    await Promise.all(PORTRAIT_PRECACHE.map(async (url) => {
      try {
        const res = await fetch(url);
        if (res.ok && res.headers.get("content-type")?.startsWith("image/")) await c.put(url, res);
      } catch { /* Retry on a later online visit. */ }
    }));
  }).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
