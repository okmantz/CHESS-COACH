// Pure (DOM-free) helpers for "suggested moves you can click and play out".
// A suggestion is a line of UCI moves from a FEN (an engine PV, a repertoire line, a hint). These helpers turn it
// into labelled moves and replay it up to any point, so every UI can offer the same tap-to-play behaviour.
import { Chess } from '../vendor/chess.js';

const isUci = (u) => typeof u === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u);

/**
 * Parse a line of UCI moves into display moves.
 * @returns [{uci, san, from, to, promotion, color, no, fen, label}]  (fen = position AFTER the move)
 * Parsing stops at the first illegal move, so a stale or truncated PV never throws.
 */
export function parsePv(fen, ucis, n = 8) {
  let c;
  try { c = new Chess(fen); } catch (e) { return []; }
  const out = [];
  for (const u of (ucis || []).slice(0, n)) {
    if (!isUci(u)) break;
    const color = c.turn();
    const no = +c.fen().split(' ')[5] || 1;
    let mv;
    try { mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch (e) { mv = null; }
    if (!mv) break;
    out.push({
      uci: u, san: mv.san, from: mv.from, to: mv.to, promotion: mv.promotion, color, no, fen: c.fen(),
      label: color === 'w' ? `${no}.${mv.san}` : (out.length === 0 ? `${no}…${mv.san}` : mv.san),
    });
  }
  return out;
}

/** Replay a line up to and including index `idx` (-1 = the start position). */
export function replayPv(fen, ucis, idx) {
  const moves = parsePv(fen, ucis, Math.max(0, idx + 1));
  const chess = new Chess(fen);
  let last = null;
  for (const m of moves) last = chess.move({ from: m.from, to: m.to, promotion: m.promotion });
  return { chess, last, moves, applied: moves.length };
}

/** SAN -> UCI in a position (null if illegal). */
export function sanToUci(fen, san) {
  try {
    const mv = new Chess(fen).move(san);
    return mv ? mv.from + mv.to + (mv.promotion || '') : null;
  } catch (e) { return null; }
}

/** Normalise engine lines from different sources ({e,pv} stored in a review, {white,pv} live from the engine). */
export function normLines(lines, max = 3) {
  return (lines || []).filter((l) => l && Array.isArray(l.pv) && l.pv.length).slice(0, max).map((l) => ({ ev: l.e || l.white || null, pv: l.pv }));
}

/** Numbered text for a line, e.g. "12. Nf3 Nc6 13. Bb5". */
export function lineText(fen, ucis, n = 8) {
  return parsePv(fen, ucis, n).map((m) => m.label.replace(/^(\d+)\.(?=\S)/, '$1. ')).join(' ');
}

/** Numbered text for SAN moves (opening lines): "1. e4 e5 2. Nf3 Nc6". */
export function sansText(sans, n = 8, startColor = 'w') {
  let out = '';
  sans.slice(0, n).forEach((san, i) => {
    const white = (i % 2 === 0) === (startColor === 'w');
    const no = Math.floor((i + (startColor === 'w' ? 0 : 1)) / 2) + 1;
    out += (white ? `${out ? ' ' : ''}${no}. ` : (i === 0 ? `${no}… ` : ' ')) + san;
  });
  return out;
}
