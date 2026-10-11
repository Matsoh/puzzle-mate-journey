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
- Home and win scenes use the reusable CSS/image ChampAvatarScene; load the procedural Hero3D only after an image fails, behind ClientOnly, and retain lazy 3D boss intros — keeps the normal home free of Three.js and the board 2D.
- Pure game rules (Elo, XP, levels, streak) live in `src/lib/rules.ts` with tests in `src/lib/rules.test.ts`.
- All decorative scenes share procedural geometry and stone textures through `stone.tsx`, `GoblinKnight.tsx` and `shared.tsx`; merged static geometry and CSS-derived scene tokens keep mobile draw calls low and the visual identity consistent.
- Shared CoachAvatar loads the optional public portrait with an image-error SVG fallback so every speech bubble uses the same portrait behavior.
- All content routes render inside a shared AppShell with desktop sidebar and mobile bottom navigation; global semantic tokens and shared Button variants keep presentation consistent without coupling game logic to layout.
- Daily coach selection and approved facts live in a browser-safe pure module with rule tests; a same-day session-only ladder-win notification supports contextual praise without changing saved progress.
