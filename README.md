# Puzzle Mate Journey

Build a chess training game for an 11-year-old player rated ~1550 whose goal is to reach 2000. It must work great on phone and iPad (touch-first, responsive, installable as a PWA). All UI text in Norwegian (bokmål), written in a fun, encouraging tone for a kid.

GOAL OF VERSION 1: make him want to open the app every day. Short sessions (~10 min), visible progress, opponents to beat.

CORE TECH
- chess.js for rules/move validation, react-chessboard for the board.
- Stockfish compiled to WebAssembly running in a Web Worker in the browser (no server needed). Use UCI_LimitStrength + UCI_Elo to set opponent strength.
- The board itself is clean 2D (best for training). Use react-three-fiber / three.js for 3D only on the home screen hero scene, opponent "boss" intros, and victory celebrations.

FEATURES
1. Home screen ("Hovedkvarter"): 3D animated scene with the coach character, current rating, daily streak, XP bar, and big buttons: "Dagens pusler", "Opponentstigen", "Fritt parti".

2. Opponent ladder ("Opponentstigen"): 10 opponents from Elo 1500 to 2000+, each with a name, avatar, short personality line and favourite style (e.g. aggressive attacker, solid defender, endgame grinder). Opponents unlock in order; beating one unlocks the next, with a "boss fight" intro animation and a 3D celebration on win. Time control choice (10+0, 15+10, unlimited). Player can choose colour.

3. Daily puzzles ("Dagens pusler"): 5 tactics puzzles per day matched to his puzzle rating, with themes (gaffel, binding, spyd, matt i 2, osv.). Puzzle rating goes up/down Elo-style. Seed the app with ~60 real tactics puzzles in Lichess puzzle-database format (FEN, moves in UCI, rating, themes) stored in a JSON file, and structure the code so a larger set from the Lichess puzzle database (CC0) can be imported later.

4. Coach ("Treneren"): an original coach character (placeholder name "Stormester Storm", easy to rename later). After each game, Stockfish analyses the game and the coach shows the 3 biggest mistakes with a speech bubble explaining in simple Norwegian what went wrong and what the better move was, and lets him step through the position. Explanations must be based on Stockfish's evaluation and best moves, never invented. Prepare (but do not yet enable) a hook for an LLM to rephrase explanations and for text-to-speech voice later — keep the architecture ready for that.

5. Progress: XP, levels, daily streak, rating graph over time, badges (e.g. "Første seier", "7 dager på rad", "Slo 1800"). Store progress locally (localStorage) for now; no login needed in v1.

DESIGN
Dark, energetic, game-like look (deep navy/purple with neon accents), big touch targets, smooth animations, satisfying sounds on moves and wins (with mute toggle). Should feel like a game, not a school app.

Keep everything client-side in v1. No personal data collection.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://puzzle-mate-journey.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8f1bd007-85cb-4d74-a44b-1aa7614b7b88).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Mike's brain

Mike answers through a backend function (`supabase/functions/mike`) that calls the Lovable AI gateway with the project's own `LOVABLE_API_KEY` – no setup needed, it works from phones and tablets too. Usage draws on the workspace's AI credits (Lovable includes a monthly grant). Change the model with the `MIKE_MODEL` secret (default `google/gemini-3.7-flash`).

The personality lives in `src/lib/mike-brain.ts` (`MIKE_SYSTEM_PROMPT`); edit it together with Tobias. Only approved players can call the function.

Fallbacks, in order: if the cloud doesn't answer, Mike tries a local Ollama (`http://localhost:11434`, model `qwen2.5:7b`; configurable under Mike → settings icon – note that browsers usually block a published https site from reaching localhost, so this mainly works when running the app locally). Last resort is a built-in bank of replies, so Mike always answers something.
