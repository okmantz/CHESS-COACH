# ♞ Chess Coach

A complete, installable chess coach that runs **100% in the browser** — no server, no build step, no accounts.
Stockfish does the analysis; a rule-based coach explains *why* a move matters and learns from your own games.

**Features**

- **Play** the computer at 10 levels (≈400 → full Stockfish), pick White/Black/Random, time controls from unlimited to bullet, takebacks, 3-step hints, draw/resign, resume unfinished games, every game saved with all its moves.
- **Rating** starts at 600 (Beginner) and moves quickly then settles (K=64→16, provisional for 10 games). Hinted/takeback games are unrated.
- **Analyze** any PGN, move list, FEN or saved game: move classification (Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Blunder). Every move is compared with the engine's best move **inside the same search**; serious verdicts are re-checked at a higher depth, and decided positions are judged by centipawn loss as well as win probability so blunders by the lost or the winning side are never labelled "best". Plus accuracy, eval graph, engine lines, free variation exploring, and a **coach note on every mistake**: what happened, what you should have considered, and a training recommendation.
- **Coach** — learns from your games: tags each mistake (hung piece, missed fork, king safety, …), tracks recurring ones with recency weighting, builds a daily personalised plan, and sends mistakes to a spaced-repetition trainer.
- **Learn** — an interactive **How to Play Chess** course (16 lessons: pieces, rules, the three golden rules — control the centre, develop your pieces, connect your rooks — and a blunder-check habit); a **Tactics** course (forks, pins, skewers, discovered attacks, removing the defender, back-rank and classic mating patterns, sacrifices) mixing coach-built positions with puzzles; **27 opening courses** (White and Black) with a study guide per opening and a **Drill that visits every variation**; guided middlegame and endgame lessons where you play against Stockfish and the coach scores each move.
- **Play a Game with Coach** — a Socratic game: a pre-move checklist (what did they threaten? what can I win? is my move safe?), a **blunder check** that stops a serious mistake before it is played and asks a question instead of giving the answer, a four-step hint ladder, and a report on your habits and what to practise next.
- **Play** — pick any of the ten opponents from a dropdown.
- **Train** — adaptive tactics (forks, pins, skewers, discovered attacks, mates, defence, sacrifices), Puzzle Rush, and your-own-mistakes review.
- **Progress** — rating, accuracy by phase, tactical strengths/weaknesses, trends, activity.
- **Profile** — name, avatar/photo, colour, board theme, light/dark, sound; export/import backup. Installable PWA that works offline.

## Deploy on GitHub Pages (2 minutes)

1. Create a new GitHub repo and push these files to `main`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.** The included workflow (`.github/workflows/pages.yml`) deploys on every push.
   *(Alternative: Source "Deploy from a branch" → `main` / root. Works too; `.nojekyll` is included.)*
3. Open `https://<you>.github.io/<repo>/`, then use the browser's **Install app / Add to Home Screen**.

All paths are relative, so it works under a sub-path. No COOP/COEP headers are needed (single-threaded engine).

## Run locally

```
python3 -m http.server 8000      # then open http://localhost:8000
node --test tests/*.test.mjs               # data + analysis tests (uses the bundled engine)
node scripts/gen-sw.mjs          # refresh the offline cache list after editing files
```
(Service workers need `localhost` or HTTPS; use a server, not `file://`.)

## Project layout

```
index.html  manifest.webmanifest  sw.js        app shell + PWA (sw.js is generated)
css/styles.css                                  design system
js/app.js                                       router, chrome, onboarding
js/pages/    play analyze learn train coach games profile home
js/learn/    opening.js (opening trainer)  guided.js (endgames/middlegames)
js/engine.js UCI wrapper (Worker in browser, child process in Node)
js/analysis.js  review pipeline     js/judge.js  same-search move judging (analysis, coach play, lessons)
js/coach.js  explanations, weakness profile, plan     js/insight.js  position/move facts and threats
js/learn/lesson.js  interactive lesson player     js/data/basics.js, tactics.js  lesson content
js/pages/coachplay.js  Play a Game with Coach
js/bot.js    10 levels              js/rating.js  Elo
js/data/     openings, endgames, middlegames, puzzles, eco
engine/      Stockfish 19 lite WASM   vendor/ chess.js   assets/ pieces + icons
scripts/gen-puzzles.mjs                         engine-verified puzzle generator
```

## Honest notes

- The coach is **rules + Stockfish**, not an LLM: its explanations are templates driven by engine evaluations and tactic detectors, and are built from what each move actually does (threats, hanging pieces, development, king safety).
- Bot "Elo" per level is approximate (levels 1–6 are weakened shallow searches, 7–9 use Stockfish's limiter). Your rating is relative to these levels, not FIDE/Chess.com.
- Data lives in your browser's `localStorage` (no cloud sync). Use Profile → Export to back up or move devices.
- Puzzles are generated from engine self-play and verified for a unique best move; the pool is modest and grows if you run `scripts/gen-puzzles.mjs`.

Licensed GPL-3.0 — see `NOTICE.md`.


## Verifying content

- `node --test tests/*.test.mjs` — structure and legality of every lesson, opening line and puzzle.
- `node scripts/verify-content.mjs` — checks lesson answers with Stockfish.
- `node scripts/verify-openings.mjs [courseId]` — checks that repertoire moves are sound.
