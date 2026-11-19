// Tactical / positional feature detection built on chess.js.
// Everything here is heuristic and deliberately explainable: it feeds the coach's wording and the
// mistake taxonomy. Engine evaluations (not these heuristics) decide *whether* a move was bad.
import { Chess } from '../vendor/chess.js';

export const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const FILES = 'abcdefgh';
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const opp = (c) => (c === 'w' ? 'b' : 'w');

export const sq = (f, r) => FILES[f] + (r + 1);
export const fileOf = (s) => FILES.indexOf(s[0]);
export const rankOf = (s) => +s[1] - 1;

export function boardMap(ch) {
  const m = {};
  for (const row of ch.board()) for (const p of row) if (p) m[p.square] = p;
  return m;
}

/** First piece met from `s` in direction (df,dr). */
function ray(map, s, df, dr) {
  let f = fileOf(s) + df, r = rankOf(s) + dr;
  while (f >= 0 && f < 8 && r >= 0 && r < 8) {
    const n = sq(f, r);
    if (map[n]) return { square: n, piece: map[n] };
    f += df; r += dr;
  }
  return null;
}

/** Pieces a slider on `s` "sees" first along each of its rays. */
function sliderTargets(map, s, type) {
  const dirs = type === 'b' ? DIAG : type === 'r' ? ORTH : [...DIAG, ...ORTH];
  const out = [];
  for (const [df, dr] of dirs) { const h = ray(map, s, df, dr); if (h) out.push({ ...h, dir: [df, dr] }); }
  return out;
}

/** All squares occupied by pieces attacked/defended by the piece on `s`. */
export function pieceTargets(map, s) {
  const p = map[s];
  if (!p) return [];
  if (['b', 'r', 'q'].includes(p.type)) return sliderTargets(map, s, p.type);
  const out = [];
  const f = fileOf(s), r = rankOf(s);
  let deltas = [];
  if (p.type === 'n') deltas = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  else if (p.type === 'k') deltas = [...DIAG, ...ORTH];
  else if (p.type === 'p') { const d = p.color === 'w' ? 1 : -1; deltas = [[1, d], [-1, d]]; }
  for (const [df, dr] of deltas) {
    const nf = f + df, nr = r + dr;
    if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
    const n = sq(nf, nr);
    if (map[n]) out.push({ square: n, piece: map[n] });
  }
  return out;
}

export function material(ch) {
  const map = boardMap(ch);
  let w = 0, b = 0;
  for (const s in map) { const p = map[s]; if (p.type === 'k') continue; if (p.color === 'w') w += VAL[p.type]; else b += VAL[p.type]; }
  return { w, b, diff: w - b };
}

export function nonPawnMaterial(ch) {
  const map = boardMap(ch);
  let t = 0, queens = 0, minors = 0, rooks = 0;
  for (const s in map) {
    const p = map[s];
    if (p.type === 'p' || p.type === 'k') continue;
    t += VAL[p.type];
    if (p.type === 'q') queens++; else if (p.type === 'r') rooks++; else minors++;
  }
  return { total: t, queens, rooks, minors };
}

/** 'opening' | 'middlegame' | 'endgame' */
export function phaseOf(fenOrChess, ply) {
  const ch = typeof fenOrChess === 'string' ? new Chess(fenOrChess) : fenOrChess;
  const n = nonPawnMaterial(ch);
  if (n.total <= 26) return 'endgame';
  const fm = +ch.fen().split(' ')[5];
  const p = ply != null ? ply : (fm - 1) * 2;
  if (p <= 20 && n.total >= 44) return 'opening';
  return 'middlegame';
}

export function findKing(map, color) {
  for (const s in map) if (map[s].type === 'k' && map[s].color === color) return s;
  return null;
}

/** Pieces of `color` that are attacked by the opponent and either undefended or attacked by something cheaper. */
export function loosePieces(ch, color) {
  const map = boardMap(ch);
  const res = [];
  for (const s in map) {
    const p = map[s];
    if (p.color !== color || p.type === 'k' || p.type === 'p') continue;
    const att = ch.attackers(s, opp(color));
    if (!att.length) continue;
    const def = ch.attackers(s, color).filter((x) => x !== s);
    const minAtt = Math.min(...att.map((a) => (map[a].type === 'k' ? 99 : VAL[map[a].type])));
    if (!def.length || minAtt < VAL[p.type]) res.push({ square: s, type: p.type, undefended: !def.length, byCheaper: minAtt < VAL[p.type] });
  }
  return res;
}

/**
 * Features of a move played from `fen` (UCI string). Returns null when the move is illegal.
 * themes: fork, pin, skewer, discovered, doubleCheck, mate, backRank, smothered, check, capture, freePiece,
 *         promotion, castle, sacrifice (possible), kingAttack
 */
export function moveFeatures(fen, uci) {
  const ch = new Chess(fen);
  const mover = ch.turn();
  const enemy = opp(mover);
  const mapB = boardMap(ch);
  let mv;
  try { mv = ch.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch (e) { return null; }
  if (!mv) return null;
  const chBefore = new Chess(fen);
  const mapA = boardMap(ch);
  const themes = new Set();
  const info = { san: mv.san, piece: mv.piece, from: mv.from, to: mv.to, captured: mv.captured || null, targets: [] };
  const to = mv.to;
  const movedVal = VAL[mv.piece];
  const enemyKing = findKing(mapA, enemy);

  if (mv.captured) themes.add('capture');
  if (mv.promotion) themes.add('promotion');
  if (mv.flags.includes('k') || mv.flags.includes('q')) themes.add('castle');
  if (ch.inCheck()) themes.add('check');

  // --- free piece / winning exchange
  if (mv.captured && mv.captured !== 'p') {
    const defBefore = chBefore.attackers(to, enemy).filter((x) => x !== to);
    if (!defBefore.length) themes.add('freePiece');
    else if (VAL[mv.captured] > movedVal) themes.add('winsExchange');
  }

  // --- mate patterns
  if (ch.isCheckmate()) {
    themes.add('mate');
    const kr = rankOf(enemyKing);
    const homeRank = enemy === 'w' ? 0 : 7;
    const checkers = ch.attackers(enemyKing, mover);
    if (kr === homeRank && ['r', 'q'].includes(mv.piece) && checkers.length === 1 && rankOf(checkers[0]) === kr) {
      const fwd = enemy === 'w' ? 1 : -1;
      const kf = fileOf(enemyKing);
      let blocked = 0, total = 0;
      for (const df of [-1, 0, 1]) {
        const nf = kf + df;
        if (nf < 0 || nf > 7) continue;
        total++;
        const n = sq(nf, kr + fwd);
        if (mapA[n] && mapA[n].color === enemy) blocked++;
      }
      if (blocked === total) themes.add('backRank');
    }
    if (mv.piece === 'n') {
      const kf = fileOf(enemyKing), krk = rankOf(enemyKing);
      let ok = true;
      for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
        if (!df && !dr) continue;
        const nf = kf + df, nr = krk + dr;
        if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
        const o = mapA[sq(nf, nr)];
        if (!o || o.color !== enemy) ok = false;
      }
      if (ok) themes.add('smothered');
    }
  }

  // --- double check
  if (ch.inCheck()) {
    const checkers = ch.attackers(enemyKing, mover);
    if (checkers.length >= 2) themes.add('doubleCheck');
  }

  // --- fork: the moved piece attacks 2+ worthwhile targets and cannot simply be taken
  {
    const targets = pieceTargets(mapA, to).filter((t) => t.piece.color === enemy);
    const good = [];
    for (const t of targets) {
      const v = t.piece.type === 'k' ? 100 : VAL[t.piece.type];
      if (t.piece.type === 'p' && mv.piece !== 'p') continue;
      const def = ch.attackers(t.square, enemy).filter((x) => x !== t.square);
      if (t.piece.type === 'k' || v > movedVal || !def.length) {
        if (v >= 3 || t.piece.type === 'k') good.push({ square: t.square, type: t.piece.type });
        else if (t.piece.type === 'p' && mv.piece === 'p') good.push({ square: t.square, type: 'p' });
      }
    }
    const attackers = ch.attackers(to, enemy);
    const defended = ch.attackers(to, mover).filter((x) => x !== to).length > 0;
    const cheapAttacker = attackers.some((a) => mapA[a].type !== 'k' && VAL[mapA[a].type] < movedVal);
    const hanging = attackers.length > 0 && !defended && !cheapAttacker ? true : false;
    const safe = !cheapAttacker && (attackers.length === 0 || defended || hanging === false);
    if (good.length >= 2 && !cheapAttacker && (attackers.length === 0 || defended || good.some((g) => g.type === 'k'))) {
      themes.add('fork');
      info.targets = good;
    } else if (safe && good.length >= 2) { themes.add('fork'); info.targets = good; }
  }

  // --- pin / skewer by the moved slider
  if (['b', 'r', 'q'].includes(mv.piece)) {
    for (const first of sliderTargets(mapA, to, mv.piece)) {
      if (first.piece.color !== enemy) continue;
      const back = ray(mapA, first.square, first.dir[0], first.dir[1]);
      if (!back || back.piece.color !== enemy) continue;
      const vA = first.piece.type === 'k' ? 100 : VAL[first.piece.type];
      const vB = back.piece.type === 'k' ? 100 : VAL[back.piece.type];
      if (first.piece.type === 'p' && back.piece.type !== 'k' && vB < 5) continue;
      if (vB > vA) { themes.add('pin'); info.pin = { pinned: first.square, behind: back.square }; }
      else if (vA > vB && vB >= 3 && vA >= 5) { themes.add('skewer'); info.skewer = { front: first.square, behind: back.square }; }
    }
  }

  // --- discovered attack / check by another slider uncovered by this move
  {
    const mapNoMove = mapB;
    for (const s in mapA) {
      const p = mapA[s];
      if (p.color !== mover || s === to || !['b', 'r', 'q'].includes(p.type)) continue;
      const beforeSet = new Set(pieceTargets(mapNoMove, s).map((t) => t.square));
      for (const t of pieceTargets(mapA, s)) {
        if (t.piece.color !== enemy || beforeSet.has(t.square)) continue;
        const v = t.piece.type === 'k' ? 100 : VAL[t.piece.type];
        if (v >= 3) { themes.add('discovered'); if (t.piece.type === 'k') themes.add('discoveredCheck'); info.discovered = { slider: s, target: t.square }; }
      }
    }
  }

  // --- sacrifice-ish & king attack flavour
  const att = ch.attackers(to, enemy);
  if (att.length) {
    const def = ch.attackers(to, mover).filter((x) => x !== to);
    const minAtt = Math.min(...att.map((a) => (mapA[a].type === 'k' ? (def.length ? 99 : 1) : VAL[mapA[a].type])));
    const gain = mv.captured ? VAL[mv.captured] : 0;
    const net = def.length ? gain - movedVal + (minAtt >= 99 ? movedVal : minAtt) : gain - movedVal;
    if (movedVal >= 3 && net <= -2) themes.add('sacrifice');
  }
  if (enemyKing) {
    const dist = Math.max(Math.abs(fileOf(to) - fileOf(enemyKing)), Math.abs(rankOf(to) - rankOf(enemyKing)));
    if (dist <= 2 && (themes.has('check') || themes.has('capture'))) themes.add('kingAttack');
    info.nearKing = dist <= 2;
  }
  info.kingFile = enemyKing ? enemyKing[0] : null;
  return { themes: [...themes], info, san: mv.san, mover, fenAfter: ch.fen() };
}

/** Play a list of UCI moves, return {boards, sans, material swing from mover's view after each ply}. */
export function playLine(fen, ucis, maxPlies = 8) {
  const ch = new Chess(fen);
  const mover = ch.turn();
  const m0 = material(ch).diff * (mover === 'w' ? 1 : -1);
  const sans = [];
  const deltas = [];
  let captures = [];
  for (const u of ucis.slice(0, maxPlies)) {
    let mv;
    try { mv = ch.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch (e) { break; }
    if (!mv) break;
    sans.push(mv.san);
    captures.push(mv.captured || null);
    deltas.push(material(ch).diff * (mover === 'w' ? 1 : -1) - m0);
  }
  return { sans, deltas, captures, final: ch };
}

/** Rough king-safety features for `color`. */
export function kingInfo(ch, color) {
  const map = boardMap(ch);
  const k = findKing(map, color);
  if (!k) return null;
  const home = color === 'w' ? 0 : 7;
  const castled = rankOf(k) === home && (fileOf(k) >= 6 || fileOf(k) <= 2);
  const central = rankOf(k) === home && fileOf(k) >= 3 && fileOf(k) <= 5;
  // pawn shield
  let shield = 0;
  const fwd = color === 'w' ? 1 : -1;
  for (const df of [-1, 0, 1]) {
    const f = fileOf(k) + df;
    if (f < 0 || f > 7) continue;
    for (const dr of [1, 2]) {
      const p = map[sq(f, rankOf(k) + fwd * dr)];
      if (p && p.type === 'p' && p.color === color) { shield++; break; }
    }
  }
  return { square: k, castled, central, shield };
}

export function pieceName(t) { return NAMES[t] || 'piece'; }
