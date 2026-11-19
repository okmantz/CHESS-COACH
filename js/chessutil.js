import { Chess } from '../vendor/chess.js';

export const uciOf = (m) => m.from + m.to + (m.promotion || '');

export function legalTargetsFor(chess, sq) {
  return chess.moves({ square: sq, verbose: true }).map((m) => ({ to: m.to, capture: !!m.captured || m.flags.includes('e'), promotion: !!m.promotion }));
}

export function tryMove(chess, uci) {
  try { return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch (e) { return null; }
}

export function kingSquare(chess, color) {
  for (const row of chess.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  return null;
}
export const checkSquare = (chess) => (chess.inCheck() ? kingSquare(chess, chess.turn()) : null);

const START = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
/** Captured material per side from a FEN (accounts for promotions roughly). */
export function capturedFromFen(fen) {
  const board = fen.split(' ')[0];
  const cnt = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  for (const ch of board) { if (/[pnbrqPNBRQ]/.test(ch)) cnt[ch === ch.toUpperCase() ? 'w' : 'b'][ch.toLowerCase()]++; }
  const lostBy = { w: [], b: [] };           // pieces each side has lost
  for (const c of ['w', 'b']) for (const t of ['q', 'r', 'b', 'n', 'p']) for (let i = 0; i < Math.max(0, START[t] - cnt[c][t]); i++) lostBy[c].push(t);
  const mat = (c) => Object.entries(cnt[c]).reduce((s, [t, n]) => s + VAL[t] * n, 0);
  return { lostBy, adv: mat('w') - mat('b') };
}

export function resultText(chess, extra) {
  if (extra) return extra;
  if (chess.isCheckmate()) return chess.turn() === 'w' ? '0-1' : '1-0';
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) return '1/2-1/2';
  return '*';
}
export function gameOverReason(chess) {
  if (chess.isCheckmate()) return 'checkmate';
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isInsufficientMaterial()) return 'insufficient material';
  if (chess.isThreefoldRepetition()) return 'threefold repetition';
  if (chess.isDrawByFiftyMoves && chess.isDrawByFiftyMoves()) return '50-move rule';
  if (chess.isDraw()) return 'draw';
  return null;
}

/** A position is safe to hand to Stockfish only if the side NOT to move is not in check and both kings exist. */
export function engineSafe(fen) {
  try {
    const c = new Chess(fen);
    const flipped = fen.replace(/ [wb] /, c.turn() === 'w' ? ' b ' : ' w ').replace(/ [a-h][36] /, ' - ');
    const c2 = new Chess(flipped);
    if (c2.inCheck()) return false;
    let wk = 0, bk = 0;
    for (const row of c.board()) for (const p of row) if (p && p.type === 'k') (p.color === 'w' ? wk++ : bk++);
    return wk === 1 && bk === 1;
  } catch (e) { return false; }
}

export function splitPgn(text) {
  const t = text.replace(/\r/g, '').trim();
  const parts = t.split(/\n(?=\[Event )/);
  return parts.map((s) => s.trim()).filter(Boolean);
}
