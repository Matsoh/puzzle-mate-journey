// @ts-nocheck — vendored from bright-kumedzro/zuri (MIT); checked upstream, not against this project's stricter tsconfig.
/** Starts a mesher worker. The published build replaces this module with one that inlines the worker (see build.mjs). */
export const spawnWorker = (): Worker => new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
