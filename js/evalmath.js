// Evaluation maths shared by analysis + coach.
/* ---------------- win probability ---------------- */

/** Evaluation object ({cp}|{mate}) from White's view -> centipawn-ish number (mate is huge). */
export function evalToCp(e) {
  if (!e) return 0;
  if (e.mate != null) return (e.mate > 0 ? 1 : -1) * (30000 - Math.min(Math.abs(e.mate), 200) * 100);
  return e.cp;
}

/** Lichess' logistic cp -> win% model (0..100) from White's perspective. */
export function winPct(e) {
  if (e && e.mate != null) return e.mate > 0 ? 100 : 0;
  const cp = Math.max(-1500, Math.min(1500, e ? e.cp : 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

const povWin = (e, color) => (color === 'w' ? winPct(e) : 100 - winPct(e));
export { povWin };

/* ---------------- centipawn view (never saturates) ---------------- */

/** Mate scores count as +/-1000cp, ordinary scores are capped at +/-2500cp. */
export function cappedCp(e) {
  if (!e) return 0;
  if (e.mate != null) return e.mate > 0 ? 1000 : -1000;
  return Math.max(-2500, Math.min(2500, e.cp));
}
export const moverCp = (e, color) => (color === 'w' ? cappedCp(e) : -cappedCp(e));

/**
 * How much did the mover give up by playing `playedE` instead of the best move (`bestE`)?
 * Both evaluations are White-pov and come from the same search depth.
 *
 * A pure win-probability loss hides mistakes in decided positions (a lost side that drops its queen goes from
 * 2% to 0%, which looks like "Best"). So in decided positions we also measure in pawns and convert that to the
 * same scale (about 11 centipawns per win-percentage point near equality, halved once the game is decided).
 */
export function effectiveLoss(bestE, playedE, color) {
  const wpBest = povWin(bestE, color), wpPlayed = povWin(playedE, color);
  const wpLoss = Math.max(0, wpBest - wpPlayed);
  const cB = moverCp(bestE, color), cP = moverCp(playedE, color);
  const cpLoss = Math.max(0, cB - cP);
  const decided = (cB >= 300 && cP >= 300) || (cB <= -300 && cP <= -300);
  // a mover who is still crushing the opponent after the move is judged more gently
  const pseudo = decided ? Math.min(45, cpLoss / 11) * 0.5 * (cP >= 800 ? 0.4 : 1) : 0;
  let loss = Math.max(wpLoss, pseudo);
  // forced mates: skipping a mate, or choosing a much slower one, is never "best"
  const mB = bestE && bestE.mate != null ? (color === 'w' ? bestE.mate : -bestE.mate) : null;
  const mP = playedE && playedE.mate != null ? (color === 'w' ? playedE.mate : -playedE.mate) : null;
  let missedMate = false;
  if (mB != null && mB > 0) {
    if (mP != null && mP > 0) { if (mP - mB >= 2) loss = Math.max(loss, Math.min(9, (mP - mB) * 1.1)); }
    else { loss = Math.max(loss, 6.5); missedMate = true; }
  }
  return { loss, wpLoss, cpLoss, wpBest, wpPlayed, decided, missedMate };
}

export function moveAccuracy(loss) {
  const a = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669 + 1;
  return Math.max(0, Math.min(100, a));
}

/** Format an evaluation for display: +1.23 / -0.40 / #3 */
export function fmtEval(e, opts = {}) {
  if (!e) return '0.0';
  if (e.mate != null) return (e.mate > 0 ? '#' : '-#') + Math.abs(e.mate);
  const v = e.cp / 100;
  const s = (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
  return (v > 0 && !opts.noPlus ? '+' : '') + s;
}

export const CLASSES = {
  brilliant: { label: 'Brilliant', sym: '!!', color: '#26c9b5', icon: '✦' },
  great: { label: 'Great', sym: '!', color: '#5b8bb9', icon: '★' },
  best: { label: 'Best', sym: '', color: '#7fb855', icon: '✓' },
  excellent: { label: 'Excellent', sym: '', color: '#96bc4b', icon: '👍' },
  good: { label: 'Good', sym: '', color: '#b5c46b', icon: '○' },
  book: { label: 'Book', sym: '', color: '#a88865', icon: '📖' },
  inaccuracy: { label: 'Inaccuracy', sym: '?!', color: '#f7c631', icon: '?' },
  mistake: { label: 'Mistake', sym: '?', color: '#e58f2a', icon: '✕' },
  blunder: { label: 'Blunder', sym: '??', color: '#ca3431', icon: '✕✕' },
};

/** Classification by win-probability loss (percentage points, mover's view). */
export function classifyLoss(loss, isTop) {
  if (isTop || loss <= 0.5) return 'best';
  if (loss <= 2) return 'excellent';
  if (loss <= 5) return 'good';
  if (loss <= 10) return 'inaccuracy';
  if (loss <= 20) return 'mistake';
  return 'blunder';
}

