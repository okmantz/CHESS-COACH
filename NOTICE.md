# Credits & licenses

Chess Coach is released under the **GNU GPL v3** (see `LICENSE`) because it bundles Stockfish.

| Component | License | Notes |
|---|---|---|
| [Stockfish](https://stockfishchess.org) 19 (lite, single-thread WASM build) | GPL-3.0 | `engine/` — source: https://github.com/official-stockfish/Stockfish |
| [Stockfish.js](https://github.com/nmrugg/stockfish.js) (WASM/JS build) | GPL-3.0 | the browser wrapper that makes the engine run in a Web Worker |
| [chess.js](https://github.com/jhlywa/chess.js) 1.4 | BSD-2-Clause | `vendor/` — rules, move generation, PGN |
| Chess pieces by Colin M.L. Burnett ("cburnett") | CC BY-SA 3.0 / GPL / BSD | `assets/pieces/` |
| ECO-style opening names | hand-written from public chess knowledge | `js/data/eco.js` |

Inspired by Lichess (win-probability and accuracy formulas are the published Lichess approximations) and OpenChess.
The coach is a rule-based system fed by Stockfish evaluations. It is not a language model.
