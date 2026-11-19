// Move judging shared by game review, "Play with Coach", guided lessons and the mistake trainer.
//
// The one rule that keeps the verdicts honest: the move that was played and the engine's best move are always
// compared INSIDE THE SAME SEARCH (same position, same depth, `searchmoves` for the played move), never by
// comparing two different positions searched to the same nominal depth. Serious verdicts are re-checked deeper.
import { effectiveLoss, classifyLoss, povWin } from './evalmath.js';

export const LIVE = { depth: 14, ms: 1500, verifyDepth: 18, verifyMs: 3500 };

/** Search a position once, MultiPV 3. Returns {lines, best, e} with White-pov evaluations. */
export async function searchPosition(engine, fen, { depth = LIVE.depth, movetime = LIVE.ms, multipv = 3 } = {}) {
  const r = await engine.go({ fen, depth, movetime, multipv });
  return { lines: r.lines, best: r.lines[0] ? r.lines[0].pv[0] : null, e: r.lines[0] ? r.lines[0].white : null };
}

/** Evaluation (white pov) of a specific move, searched to the same depth as `lines` was. */
export async function valueOfMove(engine, fen, uci, lines, { depth = LIVE.depth, movetime = LIVE.ms } = {}) {
  const hit = lines && lines.find((l) => l.pv && l.pv[0] === uci);
  if (hit) return hit;
  const r = await engine.go({ fen, depth, movetime, multipv: 1, searchmoves: [uci] });
  return r.lines[0];
}

/** Upgrade a plain "best"/"excellent" to "great" or "brilliant" when the move deserves it. */
export function refineClass({ cls, isTop, loss, wpB, wpA, wpSecond, feats }) {
  if (cls === 'best' || cls === 'excellent') {
    if (isTop && wpSecond != null && wpB - wpSecond >= 18 && wpB > 20 && wpB < 97 && !(feats && feats.themes.includes('mate'))) cls = 'great';
    if (feats && feats.themes.includes('sacrifice') && loss <= 2 && wpA >= 45 && wpB < 90 && wpA > wpB - 6 && (isTop || wpSecond == null || wpB - wpSecond >= 5)) cls = 'brilliant';
  }
  return cls;
}

/**
 * Judge one move.
 * @param lines optional pre-computed MultiPV lines for `fen` (e.g. prefetched while the player was thinking)
 * @returns {best, bestEval, playedEval, loss, cpLoss, cls, isTop, lines, wpBest, wpPlayed, wpSecond, verified}
 */
export async function judgeMove(engine, fen, uci, { lines = null, depth = LIVE.depth, movetime = LIVE.ms, verify = true } = {}) {
  const color = fen.split(' ')[1];
  let src = lines || (await searchPosition(engine, fen, { depth, movetime })).lines;
  let best = src[0];
  let played = await valueOfMove(engine, fen, uci, src, { depth, movetime });
  let L = effectiveLoss(best.white, played.white, color);
  let verified = false;
  if (verify && L.loss >= 6 && !(best.pv[0] === uci)) {
    // a serious verdict: look again, deeper, before telling the player they went wrong
    const deep = await searchPosition(engine, fen, { depth: LIVE.verifyDepth, movetime: LIVE.verifyMs });
    const p2 = await valueOfMove(engine, fen, uci, deep.lines, { depth: LIVE.verifyDepth, movetime: LIVE.verifyMs });
    src = deep.lines; best = src[0]; played = p2;
    L = effectiveLoss(best.white, played.white, color);
    verified = true;
  }
  const isTop = best.pv[0] === uci;
  const loss = isTop ? 0 : L.loss;
  const second = src[1] || null;
  const wpSecond = second ? povWin(second.white, color) : null;
  return {
    best: best.pv[0], bestEval: best.white, bestPv: best.pv, playedEval: played.white, playedPv: played.pv || [uci],
    loss, cpLoss: L.cpLoss, cls: classifyLoss(loss, isTop), isTop, lines: src,
    wpBest: L.wpBest, wpPlayed: L.wpPlayed, wpSecond, verified, color, decided: L.decided,
  };
}
