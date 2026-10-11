<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Everything runs client-side in v1; progress lives in localStorage via `src/lib/progress.ts` (single store, useSyncExternalStore) — no login or personal data.
- Stockfish runs as the lite single-threaded WASM build from `public/stockfish/` in a Web Worker (`src/lib/engine.ts`) — works without cross-origin isolation headers and stays small for phones.
- Coach explanations are built only from Stockfish facts in `src/lib/coach.ts`; LLM rephrasing and TTS plug in through `src/lib/coach-hooks.ts` (disabled flags) — keeps advice truthful.
- Puzzles use the Lichess puzzle CSV format; import larger sets with `parseLichessCsv` into `src/data/puzzles.json` — one data format end to end.
- 3D (react-three-fiber) is only used for home hero, boss intro and celebration, lazy-loaded behind ClientOnly (`src/components/three/Lazy3D.tsx`); the board stays 2D — SSR-safe and fast.
- Pure game rules (Elo, XP, levels, streak) live in `src/lib/rules.ts` with tests in `src/lib/rules.test.ts`.
- All decorative scenes share procedural geometry and stone textures through `stone.tsx`, `GoblinKnight.tsx` and `shared.tsx`; merged static geometry and CSS-derived scene tokens keep mobile draw calls low and the visual identity consistent.
