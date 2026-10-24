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

## Mike's brain (Ollama on your Mac)

Mike works without any setup – he answers from a built-in bank of replies. To give him a real brain, run a local model with [Ollama](https://ollama.com):

```sh
brew install ollama
ollama pull qwen2.5:7b
OLLAMA_ORIGINS="https://puzzle-mate-journey.lovable.app,http://localhost:5173" ollama serve
```

`OLLAMA_ORIGINS` lets the app in the browser talk to Ollama (CORS). The app looks for Ollama at `http://localhost:11434` – change the address or model under Mike → settings icon. The personality lives in `src/lib/mike-brain.ts` (`MIKE_SYSTEM_PROMPT`); edit it together with Tobias.

Note: this works when the app runs on the same computer as Ollama. From a phone, point the address at the Mac's IP on the home network (e.g. `http://192.168.1.20:11434`) and start Ollama with `OLLAMA_HOST=0.0.0.0`; some browsers block that from an https page, in which case Mike falls back to the built-in replies.
