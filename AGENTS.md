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
- Personal progress stores are built with `createSyncedStore` in `src/lib/cloud-sync.ts`: server table `user_state` (one row per store, optimistic revision via `save_user_state`, conflict merge in pure `sync-merge.ts`) plus a per-user device cache; writes are ignored until an approved user is hydrated — fail-closed and no blind overwrites.
- Access is a closed allowlist (`approved_players`, no client writes, signup disabled) checked by `AuthGate` in __root; only /innlogging and /tilbakestill-passord render without it — RLS is the real boundary, the gate is UX.
- Stockfish runs as the lite single-threaded WASM build from `public/stockfish/` in a Web Worker (`src/lib/engine.ts`) — works without cross-origin isolation headers and stays small for phones.
- Coach explanations are built only from Stockfish facts in `src/lib/coach.ts`; LLM rephrasing and TTS plug in through `src/lib/coach-hooks.ts` (disabled flags) — keeps advice truthful.
- Puzzles use the Lichess puzzle CSV format; import larger sets with `parseLichessCsv` into `src/data/puzzles.json` — one data format end to end.
- Home and win scenes use the reusable CSS/image ChampAvatarScene; load the procedural Hero3D only after an image fails, behind ClientOnly, and retain lazy 3D boss intros — keeps the normal home free of Three.js and the board 2D.
- Pure game rules (Elo, XP, levels, streak) live in `src/lib/rules.ts` with tests in `src/lib/rules.test.ts`.
- All decorative scenes share procedural geometry and stone textures through `stone.tsx`, `GoblinKnight.tsx` and `shared.tsx`; merged static geometry and CSS-derived scene tokens keep mobile draw calls low and the visual identity consistent.
- Coach voice uses the selected Magnus/Hikaru profile via shared CoachAvatar/CoachBubble (head-cropped portraits, neutral fallback); PlayerAvatar is the player's own hero image. Post-game CoachDebrief only judges the engine PV move vs. the game move (pure `src/lib/debrief.ts`) — keeps feedback truthful.
- All content routes render inside a shared AppShell with desktop sidebar and mobile bottom navigation; global semantic tokens and shared Button variants keep presentation consistent without coupling game logic to layout.
- Daily coach selection and approved facts live in a browser-safe pure module with rule tests; a same-day session-only ladder-win notification supports contextual praise without changing saved progress.
- Virtual trainer profiles, curated advice and chess.js-verified exercises live in pure `src/lib/trainer.ts` (tests alongside); choice and per-day sessions persist in a separate versioned key via `trainer-store.ts` — keeps main progress untouched.
- Adaptive trainer bank is a compact local JSON of selected CC0 Lichess puzzles (`src/data/trainer-bank.json`), with the skill model, selection and repetition as pure functions in `src/lib/adaptive.ts` (tests alongside) and state in versioned `goblin-chess.trainer.v2` migrated from v1 — no runtime API, testable rules, progress untouched.
- Light/dark theme: `.dark`/`.light` class on <html> set by an inline head script before paint from `src/lib/theme.ts` (own localStorage key, default dark); light values only override semantic tokens in `:root.light` — no filters, no per-component colors.
- Tournament day (/turnering) is pure rules in `src/lib/tournament.ts` (tests alongside) with its own versioned key via `tournament-store.ts`; external results never touch progress/rating/XP, and the in-game view shows only neutral status.
- Home-screen game loop is pure: `src/lib/quests.ts` (three daily quests from `Progress.dayStats` + daily puzzles, level titles) and `src/lib/mike.ts` (Mike's deterministic English lines by mood) with tests; `src/components/Mike.tsx` is the SVG avatar. Mike is the only voice that speaks English; all UI stays Norwegian. `VITE_LOCAL_DEV=1` with `vite dev` runs the app without Supabase (device-only saves) — never active in production builds.
- Collection, chest, avatar and celebrations are pure modules with tests: `collection.ts` (motifs from Lichess themes), `chest.ts` (seeded variable reward, once per day), `avatar.ts` (parts catalogue, buy/equip), `celebrate.ts` (queue consumed by `<Celebrations/>` in AppShell). Progress fields `motifs`, `coins`, `chests`, `avatar`, `avatarOwned` default via `migrate`. Mike's LLM path is `mike-brain.ts`: system prompt + real-number context → Ollama, with `offlineMike` as the always-available fallback; the model never gets to invent results. SVG components use `useId()` for gradient/filter ids — shared ids break when a hidden copy exists.
- `MikeCompanion` is the one way Mike appears inside a feature (game, training game, tournament day, trainer page). Pure helpers in `mike-game.ts`: `gameReaction` (deterministic, never names a move), context builders, and `MODE_RULES` appended to the system prompt per mode so the LLM cannot hint moves in a rated game. Keep the trainer profiles (Magnus/Hikaru) as the teaching voice and Mike as the companion voice.
- Real games: `games-import.ts` parses chess.com (month JSON + PGN) and Lichess (ndjson) into `ImportedGame` (SAN moves only, capped at 40 in `Progress.importedGames`); analysis reuses `analyseGame`. `notebook.ts` turns engine facts into `LessonId`s and keeps `Progress.notebook` (30 entries + pattern counters) — Mike's long-term memory of Tobias, fed into `mikeContext`. Never infer lessons from anything but engine facts.
- Bots: every bot move goes through `bot.ts` → Maia 3 (`maia.ts`, own encoder: 64×12 tokens, mirrored for Black, 4352-move vocab generated in code, sampling with rating-dependent temperature) when loaded and >8 pieces, else Stockfish at UCI_Elo. The model and worker live in `public/maia3`, `public/maia-worker.js`, `public/ort` (onnxruntime-web, MIT). Maia 3 weights come from the CSSLab maia-platform repo; the platform code is GPL so nothing from it is copied.
