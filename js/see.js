// Static exchange evaluation (SEE): "if somebody starts capturing on this square, who comes out ahead?"
//
// The coach uses it everywhere it talks about loose pieces, threats and "is that square safe?", so the advice is right about
//  - pieces that are defended but attacked twice (the exchange still loses material),
//  - x-rays (a rook behind a rook, a queen behind a bishop),
//  - attackers that are pinned or cannot legally capture (the first capture is always a LEGAL move),
//  - kings that cannot recapture into another attack.
// Values are in pawns (1 / 3 / 3 / 5 / 9); the king counts as a huge value so it never "wins" an exchange it cannot survive.
import { Chess } from '../vendor/chess.js';

const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const opp = (c) => (c === 'w' ? 'b' : 'w');

/** The same position with `color` to move and no en-passant square. Null when chess.js refuses it. */
function withSideToMove(fen, color) {
  const p = fen.split(' ');
  if (p[1] !== color) { p[1] = color; p[3] = '-'; }
  try { return new Chess(p.join(' ')); } catch (e) { return null; }
}

/** Legal captures of the piece on `square` by `by`: [{from, piece}]. Falls back to geometric attackers if the position cannot be flipped. */
function firstCapturers(fen, square, by) {
  const base = new Chess(fen);
  const flipped = withSideToMove(fen, by);
  if (flipped) {
    // the side that is NOT to move in the flipped position must not be in check, otherwise "legal" moves are meaningless
    let kingSq = null;
    for (const row of flipped.board()) for (const p of row) if (p && p.type === 'k' && p.color === opp(by)) kingSq = p.square;
    if (kingSq && !flipped.isAttacked(kingSq, by)) {
      const out = [];
      const seen = new Set();
      for (const m of flipped.moves({ verbose: true })) {
        if (m.to !== square || !m.captured || seen.has(m.from)) continue;
        seen.add(m.from);
        out.push({ from: m.from, type: m.piece });
      }
      return out;
    }
  }
  return base.attackers(square, by).map((s) => ({ from: s, type: base.get(s).type }));
}

/**
 * Net material (in pawns) that `by` wins by capturing the piece on `square`, with both sides recapturing optimally and
 * stopping whenever continuing would lose material. Positive = a real threat; 0 or negative = capturing does not pay.
 * Pass `from` to evaluate one specific capturing piece instead of the cheapest legal one.
 */
export function see(fen, square, by, { from = null } = {}) {
  const board = new Chess(fen);
  const target = board.get(square);
  if (!target || target.color === by || target.type === 'k') return 0;
  const starters = firstCapturers(fen, square, by);
  if (!starters.length) return 0;
  const first = from ? starters.find((s) => s.from === from) : starters.slice().sort((a, b) => V[a.type] - V[b.type])[0];
  if (!first) return 0;

  const gain = [V[target.type]];
  let onSquare = V[first.type];
  board.remove(first.from);
  let side = opp(by);
  let d = 0;
  for (let guard = 0; guard < 32; guard++) {
    const atts = board.attackers(square, side);
    if (!atts.length) break;
    let best = null;
    for (const s of atts) { const t = V[board.get(s).type]; if (!best || t < best.v) best = { s, v: t }; }
    d++;
    gain[d] = onSquare - gain[d - 1];
    onSquare = best.v;
    board.remove(best.s);
    side = opp(side);
  }
  while (d > 0) { gain[d - 1] = -Math.max(-gain[d - 1], gain[d]); d--; }
  return gain[0];
}

/** Value of a piece type in pawns (shared so the coach and the tests agree). */
export const pieceValue = (t) => V[t] || 0;
