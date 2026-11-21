/* Pure FEN / set-up helpers for the live analysis board (no DOM, unit-tested). */
import { Chess } from '../vendor/chess.js';
import { engineSafe } from './chessutil.js';

const FILES = 'abcdefgh';

/** Accept a full FEN, a FEN without the move counters, or just the piece placement. Returns a normalised FEN or null. */
export function normaliseFen(text) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (!t) return null;
  const parts = t.split(' ');
  let fen;
  if (parts.length === 1) fen = `${parts[0]} w - - 0 1`;
  else if (parts.length === 2) fen = `${parts[0]} ${parts[1]} - - 0 1`;
  else if (parts.length === 3) fen = `${parts[0]} ${parts[1]} ${parts[2]} - 0 1`;
  else if (parts.length === 4) fen = `${t} 0 1`;
  else if (parts.length === 5) fen = `${t} 1`;
  else fen = parts.slice(0, 6).join(' ');
  try { new Chess(fen); return fen; } catch (e) { return null; }
}

/** piece map {sq:'wn'} -> piece placement string */
export function placementFromMap(map) {
  const rows = [];
  for (let r = 8; r >= 1; r--) {
    let row = '', empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = map[FILES[f] + r];
      if (!p) { empty++; continue; }
      if (empty) { row += empty; empty = 0; }
      row += p[0] === 'w' ? p[1].toUpperCase() : p[1];
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join('/');
}
export function mapFromFen(fen) {
  const map = {};
  fen.split(' ')[0].split('/').forEach((row, i) => {
    let f = 0;
    for (const ch of row) { if (/\d/.test(ch)) f += +ch; else { map[FILES[f] + (8 - i)] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toLowerCase(); f++; } }
  });
  return map;
}
/** Castling rights that are actually possible with the pieces on the board, as a subset of the wanted ones ("KQkq"). */
export function legalCastling(map, want = 'KQkq') {
  let out = '';
  if (want.includes('K') && map.e1 === 'wk' && map.h1 === 'wr') out += 'K';
  if (want.includes('Q') && map.e1 === 'wk' && map.a1 === 'wr') out += 'Q';
  if (want.includes('k') && map.e8 === 'bk' && map.h8 === 'br') out += 'k';
  if (want.includes('q') && map.e8 === 'bk' && map.a8 === 'br') out += 'q';
  return out;
}
/** Validate a set-up position. Returns {fen} or {error}. */
export function fenFromSetup(map, turn, castling) {
  const kings = { w: 0, b: 0 };
  for (const sq in map) { if (map[sq][1] === 'k') kings[map[sq][0]]++; if (map[sq][1] === 'p' && (sq[1] === '1' || sq[1] === '8')) return { error: 'Pawns cannot stand on the first or last rank.' }; }
  if (kings.w !== 1 || kings.b !== 1) return { error: 'Each side needs exactly one king.' };
  const fen = `${placementFromMap(map)} ${turn} ${legalCastling(map, castling) || '-'} - 0 1`;
  try { new Chess(fen); } catch (e) { return { error: 'That position is not legal.' }; }
  if (!engineSafe(fen)) return { error: 'The side that is not to move is in check — that cannot happen in a real game.' };
  return { fen };
}
