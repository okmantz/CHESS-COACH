// Positional "ideas" engine: what is good and bad about a position for each side, what the plan should be,
// and WHY a quiet move (the kind engines love and beginners cannot explain) is strong.
//
// Pure and engine-free: it reads the board with chess.js and geometry only, so it runs instantly for every position
// of a lesson, review or live analysis. Stockfish decides WHICH move is best; this module explains what the move is
// FOR — improving the worst piece, taking an outpost or an open file, hitting a weak pawn, a pawn break, king safety.
import { Chess } from '../vendor/chess.js';
import { boardMap, VAL, NAMES, nonPawnMaterial } from './themes.js';

const FILES = 'abcdefgh';
const nameOf = (f, r) => FILES[f] + (r + 1);
const opp = (c) => (c === 'w' ? 'b' : 'w');
const fOf = (s) => FILES.indexOf(s[0]);
const rOf = (s) => +s[1] - 1;
const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const KING = [...DIAG, ...ORTH];
const inB = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
const isLight = (s) => (fOf(s) + rOf(s)) % 2 === 1;
/** Rank counted from the owner's side, 0..7. */
const rel = (color, r) => (color === 'w' ? r : 7 - r);
const dir = (color) => (color === 'w' ? 1 : -1);
const nm = (t) => NAMES[t] || 'piece';
export const listSquares = (a) => (a.length <= 1 ? a.join('') : a.length === 2 ? `${a[0]} and ${a[1]}` : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

/* ------------------------------------------------------------------ geometry: who attacks what */

/** Squares attacked (or defended) by the piece standing on `s`. Sliders stop at the first piece, which is included. */
export function attacksFrom(map, s) {
  const p = map[s];
  if (!p) return [];
  const f = fOf(s), r = rOf(s), out = [];
  if (p.type === 'p') { for (const df of [-1, 1]) if (inB(f + df, r + dir(p.color))) out.push(nameOf(f + df, r + dir(p.color))); return out; }
  if (p.type === 'n' || p.type === 'k') {
    for (const [df, dr] of p.type === 'n' ? KN : KING) if (inB(f + df, r + dr)) out.push(nameOf(f + df, r + dr));
    return out;
  }
  const dirs = p.type === 'b' ? DIAG : p.type === 'r' ? ORTH : KING;
  for (const [df, dr] of dirs) {
    let nf = f + df, nr = r + dr;
    while (inB(nf, nr)) { const n = nameOf(nf, nr); out.push(n); if (map[n]) break; nf += df; nr += dr; }
  }
  return out;
}

function buildAttacks(map) {
  const cnt = { w: {}, b: {} }, pawnAtt = { w: new Set(), b: new Set() }, by = { w: {}, b: {} };
  for (const s in map) {
    const p = map[s];
    for (const t of attacksFrom(map, s)) {
      cnt[p.color][t] = (cnt[p.color][t] || 0) + 1;
      (by[p.color][t] = by[p.color][t] || []).push(s);
      if (p.type === 'p') pawnAtt[p.color].add(t);
    }
  }
  return { cnt, pawnAtt, by };
}

/** Squares a piece can usefully go to: not occupied by its own side, not covered by an enemy pawn. */
function safeMoves(map, s, pawnAttEnemy) {
  const p = map[s];
  if (!p || p.type === 'p' || p.type === 'k') return [];
  return attacksFrom(map, s).filter((t) => !(map[t] && map[t].color === p.color) && !pawnAttEnemy.has(t));
}

/* ------------------------------------------------------------------ pawn structure */

function pawnStructure(map, color, att) {
  const e = opp(color), d = dir(color);
  const mine = [], theirs = [];
  for (const s in map) if (map[s].type === 'p') (map[s].color === color ? mine : theirs).push({ s, f: fOf(s), r: rOf(s) });
  const byFile = {};
  mine.forEach((p) => { (byFile[p.f] = byFile[p.f] || []).push(p); });
  const isolated = [], doubled = [], backward = [], passed = [], chainBase = [];
  for (const p of mine) {
    const nb = (byFile[p.f - 1] || []).length + (byFile[p.f + 1] || []).length;
    if (!nb) isolated.push(p.s);
    // passed: no enemy pawn in front on the same or an adjacent file
    const blockers = theirs.filter((q) => Math.abs(q.f - p.f) <= 1 && (color === 'w' ? q.r > p.r : q.r < p.r));
    if (!blockers.length) passed.push(p.s);
    if (nb) {
      const supportBehind = [...(byFile[p.f - 1] || []), ...(byFile[p.f + 1] || [])].some((q) => (color === 'w' ? q.r <= p.r : q.r >= p.r));
      const stopAttacked = theirs.some((q) => Math.abs(q.f - p.f) === 1 && q.r === p.r + 2 * d);
      const stopSq = inB(p.f, p.r + d) ? nameOf(p.f, p.r + d) : null;
      if (!supportBehind && stopAttacked && stopSq && !map[stopSq]) backward.push(p.s);
    }
  }
  for (const f in byFile) if (byFile[f].length > 1) doubled.push(FILES[f]);
  const fileState = {};
  for (let f = 0; f < 8; f++) {
    const m = mine.some((p) => p.f === f), t = theirs.some((p) => p.f === f);
    fileState[FILES[f]] = !m && !t ? 'open' : !m && t ? 'semi' : m && !t ? 'semi-theirs' : 'closed';
  }
  return { isolated, doubled, backward, passed, fileState, count: mine.length, pawns: mine };
}

/**
 * Squares where a minor piece of `color` can never be driven away by an enemy pawn (an outpost when also guarded by a pawn).
 * Only ranks 4-6 from the owner's side count, and an enemy pawn on an adjacent file that is still behind the square can come and kick it.
 */
function outpostSquares(map, color) {
  const out = [];
  const e = opp(color), d = dir(color);
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    const rr = rel(color, r);
    if (rr < 3 || rr > 5) continue;
    const n = nameOf(f, r);
    // can an enemy pawn ever attack n? it sits on an adjacent file and is "behind" n from the enemy's side (further from its start)
    let attackable = false;
    for (const df of [-1, 1]) for (let q = 0; q < 8; q++) {
      const s = inB(f + df, q) ? nameOf(f + df, q) : null;
      if (s && map[s] && map[s].type === 'p' && map[s].color === e && (color === 'w' ? q > r : q < r)) attackable = true;
    }
    if (attackable) continue;
    const sup = [-1, 1].some((df) => inB(f + df, r - d) && map[nameOf(f + df, r - d)] && map[nameOf(f + df, r - d)].type === 'p' && map[nameOf(f + df, r - d)].color === color);
    const occ = map[n];
    out.push({ square: n, supported: sup, occupiedBy: occ ? { type: occ.type, color: occ.color } : null });
  }
  return out;
}

/* ------------------------------------------------------------------ one side's picture */

const EXPECT = { n: 5, b: 6, r: 6, q: 10 };

function sideInfo(map, color, att, ch) {
  const e = opp(color);
  const ps = pawnStructure(map, color, att);
  const pieces = [];
  for (const s in map) {
    const p = map[s];
    if (p.color !== color || p.type === 'p' || p.type === 'k') continue;
    const sm = safeMoves(map, s, att.pawnAtt[e]);
    const full = attacksFrom(map, s).filter((t) => !(map[t] && map[t].color === color)).length;
    const home = (color === 'w' ? ['b1', 'g1', 'c1', 'f1', 'a1', 'h1', 'd1'] : ['b8', 'g8', 'c8', 'f8', 'a8', 'h8', 'd8']).includes(s);
    pieces.push({ square: s, type: p.type, mob: full, safeMob: sm.length, home, ratio: sm.length / EXPECT[p.type] });
  }
  // king
  let ksq = null;
  for (const s in map) if (map[s].type === 'k' && map[s].color === color) ksq = s;
  const kf = ksq ? fOf(ksq) : 4, kr = ksq ? rOf(ksq) : 0;
  const homeRank = color === 'w' ? 0 : 7;
  const castled = !!ksq && kr === homeRank && (kf >= 6 || kf <= 2);
  const d = dir(color);
  let shield = 0;
  for (const df of [-1, 0, 1]) { const f = kf + df; if (!inB(f, 0)) continue; for (const dr of [1, 2]) { const q = inB(f, kr + d * dr) ? map[nameOf(f, kr + d * dr)] : null; if (q && q.type === 'p' && q.color === color) { shield++; break; } } }
  const zone = [];
  if (ksq) { for (const [df, dr] of [...KING, [0, 0]]) if (inB(kf + df, kr + dr)) zone.push(nameOf(kf + df, kr + dr)); for (const df of [-1, 0, 1]) if (inB(kf + df, kr + 2 * d)) zone.push(nameOf(kf + df, kr + 2 * d)); }
  const attackersOnZone = new Set();
  zone.forEach((z) => (att.by[e][z] || []).forEach((a) => { if (map[a].type !== 'p') attackersOnZone.add(a); }));
  const openNear = [];
  for (const df of [-1, 0, 1]) { const f = kf + df; if (f < 0 || f > 7) continue; if (ps.fileState[FILES[f]] === 'open' || ps.fileState[FILES[f]] === 'semi') openNear.push(FILES[f]); }
  const rights = ch ? ch.fen().split(' ')[2] : '';
  const canCastle = color === 'w' ? /[KQ]/.test(rights) : /[kq]/.test(rights);
  // bishops
  const bishops = pieces.filter((p) => p.type === 'b');
  const bad = bishops.filter((b) => {
    const same = ps.pawns.filter((p) => isLight(p.s) === isLight(b.square));
    if (same.length < 5 || b.safeMob > 5) return false;
    // a bishop that has already stepped outside (in front of) its pawn chain is the GOOD bishop, whatever the pawn colours
    const avg = same.reduce((a, p) => a + rel(color, p.r), 0) / same.length;
    return rel(color, rOf(b.square)) <= avg;
  }).map((b) => b.square);
  // rooks
  const rooks = pieces.filter((p) => p.type === 'r');
  const rookOpen = rooks.filter((r) => ps.fileState[r.square[0]] === 'open').map((r) => r.square);
  const rookSemi = rooks.filter((r) => ps.fileState[r.square[0]] === 'semi').map((r) => r.square);
  const seventh = rooks.filter((r) => rel(color, rOf(r.square)) === 6).map((r) => r.square);
  const connected = rooks.length === 2 && rooks[0].square[1] === rooks[1].square[1] && (() => { const [a, b] = rooks.map((r) => fOf(r.square)).sort((x, y) => x - y); for (let f = a + 1; f < b; f++) if (map[nameOf(f, rOf(rooks[0].square))]) return false; return true; })();
  // activity
  const sorted = pieces.filter((p) => p.type === 'n' || p.type === 'b').slice().sort((a, b) => a.ratio - b.ratio);
  const worst = sorted.length ? sorted[0] : null;
  const safeMobTotal = pieces.reduce((a, p) => a + p.safeMob, 0);
  // space: squares in the enemy half that my pawns control
  let space = 0;
  for (const t of att.pawnAtt[color]) if (rel(color, rOf(t)) >= 4) space++;
  const nonKing = Object.keys(map).filter((s) => map[s].color === color && map[s].type !== 'k' && map[s].type !== 'p');
  return {
    color, king: { square: ksq, castled, shield, zone, zoneAttackers: [...attackersOnZone], openNear, canCastle },
    pawns: ps, pieces, worst, safeMobTotal, space,
    bishops: { pair: bishops.length === 2, bad, list: bishops.map((b) => b.square) },
    rooks: { open: rookOpen, semi: rookSemi, seventh, connected, count: rooks.length },
    outposts: outpostSquares(map, color),
    material: nonKing.reduce((a, s) => a + VAL[map[s].type], 0) + ps.count,
  };
}

/** Everything the plan finder and the move explainer need. */
export function analyzePosition(fenOrChess) {
  const ch = typeof fenOrChess === 'string' ? new Chess(fenOrChess) : fenOrChess;
  const map = boardMap(ch);
  const att = buildAttacks(map);
  const info = { w: sideInfo(map, 'w', att, ch), b: sideInfo(map, 'b', att, ch) };
  const np = nonPawnMaterial(ch);
  const fen = ch.fen();
  return { fen, turn: ch.turn(), map, att, side: info, np, queens: np.queens, phase: np.total <= 26 ? 'endgame' : 'middlegame' };
}

/* ------------------------------------------------------------------ routes for a badly placed piece */

const centrality = (f, r) => 3.5 - Math.max(Math.abs(f - 3.5), Math.abs(r - 3.5));

function placeScore(map, att, color, type, to, from) {
  const e = opp(color);
  const m2 = { ...map }; delete m2[from]; m2[to] = { type, color };
  const safe = safeMoves(m2, to, att.pawnAtt[e]).length;
  const outp = outpostSquares(map, color).find((o) => o.square === to);
  let sc = safe * 1.0 + centrality(fOf(to), rOf(to)) * 0.8;
  if (outp && (type === 'n' || type === 'b')) sc += outp.supported ? 5 : 2.5;
  if (type === 'r') {
    const f = to[0]; const hasMine = Object.keys(map).some((s) => s[0] === f && map[s].type === 'p' && map[s].color === color);
    const hasTheirs = Object.keys(map).some((s) => s[0] === f && map[s].type === 'p' && map[s].color === e);
    if (!hasMine && !hasTheirs) sc += 6; else if (!hasMine) sc += 3.5;
    if (rel(color, rOf(to)) === 6) sc += 2.5;
  }
  // targets hit from there
  for (const t of attacksFrom(m2, to)) { const q = map[t]; if (q && q.color === e && q.type !== 'k') sc += q.type === 'p' ? 0.6 : 1.1; }
  // not safe? heavy penalty
  const attackers = (att.by[e][to] || []).filter((a) => a !== from);
  const defenders = (att.by[color][to] || []).filter((a) => a !== from);
  if (map[to] && map[to].color === color) sc -= 99;
  if (attackers.length && (!defenders.length || attackers.some((a) => VAL[map[a].type] < VAL[type]))) sc -= 7;
  return sc;
}

/** Best nearby home for a piece (knights: within two hops). Returns {to, via, gain} or null. */
export function routeFor(map, att, color, sq) {
  const p = map[sq];
  if (!p) return null;
  const f0 = fOf(sq), r0 = rOf(sq);
  const here = placeScore(map, att, color, p.type, sq, sq);
  let best = null;
  const consider = (to, via) => {
    if (map[to] && map[to].color === color) return;
    const sc = placeScore(map, att, color, p.type, to, sq) + (via ? -1.2 : 0);
    if (via) { const vs = placeScore(map, att, color, p.type, via, sq); if (vs < -3) return; }
    if (!best || sc > best.score) best = { to, via, score: sc };
  };
  if (p.type === 'n') {
    for (const [df, dr] of KN) {
      const a = [f0 + df, r0 + dr]; if (!inB(...a)) continue;
      const n1 = nameOf(...a); consider(n1, null);
      for (const [g, k] of KN) { const b = [a[0] + g, a[1] + k]; if (inB(...b) && nameOf(...b) !== sq) consider(nameOf(...b), n1); }
    }
  } else {
    for (const t of attacksFrom(map, sq)) consider(t, null);

  }
  if (!best) return null;
  const m2 = { ...map }; delete m2[sq]; m2[best.to] = { type: p.type, color };
  const mobTo = safeMoves(m2, best.to, att.pawnAtt[opp(color)]).length;
  const eyes = attacksFrom(m2, best.to).filter((t) => map[t] && map[t].color !== color && map[t].type !== 'k');
  const isOut = !!outpostSquares(map, color).find((o) => o.square === best.to && o.supported);
  return { to: best.to, via: best.via, gain: best.score - here, score: best.score, here, mobTo, eyes, isOut };
}

/* ------------------------------------------------------------------ pawn breaks */

/** Pawn moves that challenge an enemy pawn: a push that attacks it, or a capture that is available right now. */
function pawnBreaks(map, color, att) {
  const e = opp(color), d = dir(color), out = [];
  for (const s in map) {
    const p = map[s];
    if (p.type !== 'p' || p.color !== color) continue;
    const f = fOf(s), r = rOf(s), rr = rel(color, r);
    if (rr < 1 || rr > 5) continue;
    const push = inB(f, r + d) ? nameOf(f, r + d) : null;
    if (!push || map[push]) continue;
    if (rr === 1 && inB(f, r + 2 * d) && !map[nameOf(f, r + 2 * d)]) { /* double step is a break too */ }
    // after the push, which enemy pawns does it attack?
    const hits = [];
    for (const df of [-1, 1]) { const t = inB(f + df, r + 2 * d) ? nameOf(f + df, r + 2 * d) : null; if (t && map[t] && map[t].type === 'p' && map[t].color === e) hits.push(t); }
    if (!hits.length) continue;
    const attackers = (att.by[e][push] || []).length, supporters = (att.by[color][push] || []).length;
    out.push({ pawn: s, push, hits, safe: supporters >= attackers, supporters, attackers });
  }
  return out;
}

/* ------------------------------------------------------------------ the plan finder */

const squareFlash = (arr) => [...new Set(arr)].filter((s) => /^[a-h][1-8]$/.test(s));

/**
 * What should `color` do in this position? A ranked list of concrete ideas, each with the reason, the squares to look at and a
 * "how". The first item is always what to check FIRST (safety), the rest follow the classic middlegame method:
 * king -> targets -> worst piece -> files and outposts -> pawn break.
 * @returns {{id:string, title:string, text:string, how:string, squares:string[], arrows:{from:string,to:string}[], priority:number}[]}
 */
export function planFor(fenOrAnalysis, color, { max = 5 } = {}) {
  const A = typeof fenOrAnalysis === 'string' ? analyzePosition(fenOrAnalysis) : fenOrAnalysis;
  const { map, att } = A;
  const me = A.side[color], them = A.side[opp(color)], e = opp(color);
  const items = [];
  const add = (it) => items.push({ arrows: [], squares: [], how: '', ...it, squares: squareFlash(it.squares || []) });
  const endgame = A.phase === 'endgame';
  const matDiff = me.material - them.material;

  /* 1) loose pieces: always first */
  const loose = [];
  for (const s in map) {
    const p = map[s];
    if (p.color !== color || p.type === 'k') continue;
    const a = att.by[e][s] || []; if (!a.length) continue;
    const dfn = (att.by[color][s] || []).length;
    const cheaper = a.some((x) => VAL[map[x].type] < VAL[p.type]);
    if (!dfn || cheaper || a.length > dfn) loose.push({ s, type: p.type, undefended: !dfn });
  }
  const looseBig = loose.filter((x) => x.type !== 'p' || loose.length === 1);
  if (looseBig.length) {
    const x = looseBig.sort((a, b) => VAL[b.type] - VAL[a.type])[0];
    add({ id: 'safety', priority: 100, title: `Safety first: your ${nm(x.type)} on ${x.s} is under fire`, text: `Before any plan, make sure nothing hangs. Your ${nm(x.type)} on ${x.s} is attacked${x.undefended ? ' and nothing protects it' : ' more often than it is protected'}.`, how: 'Protect it, move it, or trade off the attacker.', squares: [x.s, ...(att.by[e][x.s] || [])] });
  }
  /* 2) king */
  if (!endgame && A.queens > 0) {
    if (!me.king.castled && me.king.canCastle) add({ id: 'castle', priority: 88, title: 'Get your king safe: castle', text: 'Your king is still in the middle where the opponent’s pieces and pawn breaks will target it. Castling also brings a rook toward the centre.', how: 'Clear the squares between king and rook, then castle.', squares: [me.king.square] });
    else if (!me.king.castled && !me.king.canCastle) add({ id: 'king-centre', priority: 80, title: 'Your king is stuck in the centre', text: 'You can no longer castle, so keep the centre closed, connect your rooks and avoid opening files near your king.', how: 'Avoid pawn breaks that open the centre unless you win something concrete.', squares: [me.king.square] });
    if (me.king.castled && me.king.zoneAttackers.length >= 3) add({ id: 'defend-king', priority: 90, title: 'Your king is under pressure', text: `${me.king.zoneAttackers.length} enemy pieces eye the squares around your king. Trade the most dangerous attacker or add defenders.`, how: 'Look for a trade of their best attacking piece, and avoid moving the pawns in front of your king.', squares: [me.king.square, ...me.king.zoneAttackers] });
  }
  /* 3) targets: weak enemy pawns */
  const enemyPawns = them.pawns;
  for (const s of enemyPawns.isolated.slice(0, 1)) {
    const f = s[0], onFile = enemyPawns.fileState[f];
    add({ id: 'target-isolated', priority: 72, title: `Target the isolated pawn on ${s}`, text: `The ${s} pawn has no pawn neighbours, so only pieces can defend it. ${onFile === 'semi-theirs' ? 'You have a half-open file to pressure it.' : 'Pile up on it and blockade the square in front of it.'}`, how: `Put a piece on the blockade square ${nameOf(fOf(s), rOf(s) + dir(e))}, then add rooks and queen on the ${f}-file.`, squares: [s, nameOf(fOf(s), rOf(s) + dir(e))] });
  }
  for (const s of enemyPawns.backward.slice(0, 1)) add({ id: 'target-backward', priority: 70, title: `Target the backward pawn on ${s}`, text: `The ${s} pawn cannot advance safely and no neighbour can protect it. The square in front of it is a hole for your pieces.`, how: `Occupy ${nameOf(fOf(s), rOf(s) + dir(e))} with a knight and hit the pawn down the file.`, squares: [s, nameOf(fOf(s), rOf(s) + dir(e))] });
  if (enemyPawns.doubled.length) { const f = enemyPawns.doubled[0]; add({ id: 'target-doubled', priority: 55, title: `Their doubled ${f}-pawns are a long-term weakness`, text: 'Doubled pawns control fewer squares and are hard to defend. Trade into an ending where they are a liability.', how: 'Keep pieces on and pressure the front pawn; aim for a favourable endgame.', squares: [f + '2', f + '7'].filter((q) => map[q]) }); }
  /* 4) worst piece */
  if (me.worst && me.worst.ratio < 0.65) {
    const wp = me.worst;
    const route = routeFor(map, att, color, wp.square);
    const pname = nm(wp.type);
    if (route && route.gain >= 2 && (route.mobTo >= wp.safeMob + 3 || route.isOut)) {
      const path = route.via ? `${wp.square} → ${route.via} → ${route.to}` : `${wp.square} → ${route.to}`;
      add({ id: 'worst-piece', priority: wp.safeMob <= 2 ? 78 : 64, title: `Improve your worst piece: the ${pname} on ${wp.square}`, text: `It only has ${wp.safeMob} safe square${wp.safeMob === 1 ? '' : 's'} to go to. A badly placed piece plays no part in the fight, and every plan works better once it is active.`, how: `Re-route it: ${path}. From ${route.to} it would have ${route.mobTo} safe squares${route.eyes.length ? ` and eye ${listSquares(route.eyes.slice(0, 2))}` : ''}.`, squares: [wp.square, route.to], arrows: [{ from: wp.square, to: route.via || route.to }, ...(route.via ? [{ from: route.via, to: route.to }] : [])], route });
    } else if (wp.safeMob <= 2) {
      add({ id: 'worst-piece', priority: 50, title: `Your ${pname} on ${wp.square} is boxed in`, text: `It has only ${wp.safeMob} safe square${wp.safeMob === 1 ? '' : 's'}. Free it by moving the pawns that block it, or trade it for a more active enemy piece.`, how: 'Ask: which pawn move opens a line for it?', squares: [wp.square] });
    }
  }
  /* 5) files and outposts */
  const openFiles = Object.entries(me.pawns.fileState).filter(([, v]) => v === 'open').map(([f]) => f);
  const semiFiles = Object.entries(me.pawns.fileState).filter(([, v]) => v === 'semi').map(([f]) => f);
  if (!endgame || me.rooks.count) {
    const mine = Object.keys(map).filter((s) => map[s].color === color && map[s].type === 'r');
    const freeRook = mine.find((s) => !openFiles.includes(s[0]) && !semiFiles.includes(s[0]));
    const file = openFiles[0] || semiFiles[0];
    if (file && mine.length && freeRook && !me.rooks.open.length) {
      const kind = openFiles.includes(file) ? 'open' : 'half-open';
      add({ id: 'file', priority: 66, title: `Take the ${kind} ${file}-file with a rook`, text: `The ${file}-file has ${kind === 'open' ? 'no pawns at all' : 'no pawns of yours'}, so a rook there reaches the enemy camp. Rooks belong on open lines, not behind their own pawns.`, how: `Play R${file}1 / R${file}8 (whichever is yours) and double rooks on it later.`, squares: [file + '1', file + '8', freeRook], arrows: [{ from: freeRook, to: file + (color === 'w' ? '4' : '5') }] });
    }
    if (me.rooks.open.length && me.rooks.count === 2 && !me.rooks.connected) add({ id: 'double', priority: 52, title: 'Double your rooks', text: 'A rook on an open file is strong; two rooks on it are crushing. Bring the other rook to the same file.', how: 'Connect your rooks, then stack them behind each other.', squares: me.rooks.open });
  }
  if (!endgame) {
    const tgt = me.outposts.filter((o) => !o.occupiedBy && (o.supported) && rel(color, rOf(o.square)) >= 4).slice(0, 2);
    const hasKnight = Object.keys(map).some((s) => map[s].color === color && map[s].type === 'n');
    if (tgt.length && hasKnight) {
      const o = tgt[0];
      add({ id: 'outpost', priority: 68, title: `Put a knight on the outpost ${o.square}`, text: `${o.square} is guarded by your pawn and no enemy pawn can ever attack it. A knight there is a monster: it cannot be chased away and it eyes the enemy camp.`, how: `Route a knight to ${o.square}, then back it up with a rook or bishop.`, squares: [o.square] });
    }
    const myOut = me.outposts.filter((o) => o.occupiedBy && o.occupiedBy.color === color && (o.occupiedBy.type === 'n' || o.occupiedBy.type === 'b') && o.supported);
    if (myOut.length) add({ id: 'keep-outpost', priority: 40, title: `Keep your ${nm(myOut[0].occupiedBy.type)} on ${myOut[0].square}`, text: 'It is a permanent outpost. Do not trade it off cheaply and bring more pieces to support the pressure it creates.', how: 'Add rooks or the queen behind it.', squares: [myOut[0].square] });
  }
  /* 6) bishops */
  if (me.bishops.bad.length) add({ id: 'bad-bishop', priority: 58, title: `Your bishop on ${me.bishops.bad[0]} is “bad”`, text: 'Many of your own pawns stand on its colour and block it. Either trade it for a knight, or move your pawns to the other colour and open its diagonals.', how: 'Re-route it outside the pawn chain or trade it for an enemy minor piece.', squares: [me.bishops.bad[0]] });
  if (them.bishops.bad.length && me.bishops.list.length) add({ id: 'their-bad-bishop', priority: 35, title: `Their bishop on ${them.bishops.bad[0]} is passive`, text: 'Keep the position closed on its colour and do not trade your good pieces for it.', how: 'Fix their pawns on the bishop’s colour.', squares: [them.bishops.bad[0]] });
  if (me.bishops.pair && !them.bishops.pair && !endgame) add({ id: 'bishop-pair', priority: 45, title: 'You have the bishop pair', text: 'Two bishops cover both colours and get stronger as the board opens up.', how: 'Open the position with pawn breaks and avoid trading a bishop for a knight without a reason.', squares: me.bishops.list });
  /* 7) pawn breaks */
  const myBreaks = pawnBreaks(map, color, att).filter((b) => b.safe);
  if (myBreaks.length && !endgame) {
    const b = myBreaks.sort((x, y) => y.hits.length - x.hits.length || x.supporters - y.supporters)[0];
    add({ id: 'break', priority: 60, title: `A pawn break is available: ${b.push}`, text: `Pushing the pawn to ${b.push} attacks the pawn on ${b.hits.join(' and ')}. Breaks are how you open lines for your pieces — but only when your pieces are ready and your king is safe.`, how: 'First finish developing and put your pieces behind the break, then push.', squares: [b.pawn, b.push, ...b.hits], arrows: [{ from: b.pawn, to: b.push }] });
  }
  /* 8) attack on the king */
  if (!endgame && them.king.zoneAttackers.length >= 2 && A.queens > 0) add({ id: 'attack-king', priority: 74, title: 'Go after their king', text: `${them.king.zoneAttackers.length} of your pieces already bear on the squares around the enemy king${them.king.shield < 2 ? ' and its pawn shield is thin' : ''}. When attackers outnumber defenders, attack.`, how: 'Bring one more piece (often a rook lift) and open a file or diagonal near their king.', squares: [them.king.square, ...them.king.zoneAttackers] });
  else if (!endgame && them.king.castled && me.king.castled && (fOf(me.king.square) >= 5) !== (fOf(them.king.square) >= 5) && A.queens > 0) add({ id: 'pawn-storm', priority: 62, title: 'Opposite-side castling: pawn storm', text: 'Your kings are on opposite wings, so it is a race. Push the pawns in front of THEIR king to open lines, and do not waste time on the other wing.', how: 'Advance the pawns near their king (with support), bring rooks to the open files.', squares: [them.king.square] });
  /* 9) endgame ideas */
  if (endgame) {
    if (me.pawns.passed.length) { const s = me.pawns.passed.sort((a, b) => rel(color, rOf(b)) - rel(color, rOf(a)))[0]; add({ id: 'passer', priority: 76, title: `Push your passed pawn on ${s}`, text: 'A passed pawn has no enemy pawn in front or beside it. It ties down the enemy pieces and may queen.', how: `Support it with the king or a rook BEHIND it, then advance.`, squares: [s, nameOf(fOf(s), rOf(s) + dir(color))] }); }
    if (them.pawns.passed.length) { const s = them.pawns.passed[0]; add({ id: 'stop-passer', priority: 77, title: `Stop their passed pawn on ${s}`, text: 'Blockade it with a piece in front (a knight is ideal) or attack it from behind with a rook.', how: 'Put the king or a piece directly in front of the pawn.', squares: [s, nameOf(fOf(s), rOf(s) + dir(e))] }); }
    add({ id: 'king-active', priority: 60, title: 'Activate your king', text: 'With the queens off, the king is a fighting piece. Bring it toward the centre and toward the pawns that matter.', how: 'Walk the king to the centre first, then toward the weak pawns.', squares: [me.king.square] });
    if (me.rooks.count && !me.rooks.seventh.length) add({ id: 'seventh', priority: 48, title: 'Rooks belong on the 7th rank', text: 'A rook on the 7th eats pawns and cuts off the king.', how: 'Find an open file and invade.', squares: [] });
  }
  /* 10) material-driven advice */
  if (!endgame || matDiff !== 0) {
    if (matDiff >= 2) add({ id: 'trade-down', priority: 56, title: 'You are ahead: trade pieces, not pawns', text: `You have about ${matDiff} points more material. Each trade of pieces makes the extra material count more and takes away their counterplay.`, how: 'Offer trades of active pieces, avoid risky tactics, keep your king safe.', squares: [] });
    else if (matDiff <= -2) add({ id: 'keep-tension', priority: 54, title: 'You are behind: keep pieces on and create problems', text: `You are about ${-matDiff} points down. Trades help your opponent; keep the position complicated and look for activity or an attack.`, how: 'Avoid simple trades; target their king or weak pawns.', squares: [] });
  }
  /* 11) prophylaxis: their best idea */
  const theirOut = them.outposts.filter((o) => !o.occupiedBy && o.supported && rel(e, rOf(o.square)) >= 4).slice(0, 1);
  if (theirOut.length && !endgame) add({ id: 'prophylaxis-outpost', priority: 42, title: `Watch the hole on ${theirOut[0].square}`, text: `An enemy knight on ${theirOut[0].square} would be rock solid, because none of your pawns can attack it. Control the square with a piece, or trade their knights.`, how: 'Keep a minor piece that can take on that square.', squares: [theirOut[0].square] });
  const theirBreaks = pawnBreaks(map, e, att).filter((b) => b.safe);
  if (theirBreaks.length && !endgame) { const b = theirBreaks[0]; add({ id: 'prophylaxis-break', priority: 41, title: `Anticipate their break ${b.push}`, text: `They can push to ${b.push} and challenge your pawn on ${b.hits[0]}. Make sure you are ready for it before you commit your pieces.`, how: 'Ask what you want to happen after that push. Prevent it or prepare the recapture.', squares: [b.pawn, b.push, ...b.hits] }); }
  if (!items.length) add({ id: 'improve', priority: 10, title: 'Improve your position with small moves', text: 'Nothing is urgent. Ask which of your pieces does the least and make it better.', how: 'Worst piece first, then rooks to open lines.', squares: [] });
  return items.sort((a, b) => b.priority - a.priority).slice(0, max);
}

/* ------------------------------------------------------------------ a one-glance scan (strengths / weaknesses) */

/**
 * Short lists for a "position scan" card: what is good and bad about each side, each with squares to show on the board.
 * @returns {{mine:{tone:'good'|'bad', text:string, squares:string[]}[], theirs:{...}[], material:number, phase:string}}
 */
export function positionScan(fenOrAnalysis, color) {
  const A = typeof fenOrAnalysis === 'string' ? analyzePosition(fenOrAnalysis) : fenOrAnalysis;
  const e = opp(color);
  const side = (c, who) => {
    const s = A.side[c], out = [];
    const push = (tone, text, squares = []) => out.push({ tone, text, squares: squareFlash(squares) });
    if (s.king.castled) push(s.king.shield >= 2 ? 'good' : 'bad', s.king.shield >= 2 ? `${who} king is castled with a pawn shield` : `${who} king is castled but the pawn shield is thin`, [s.king.square]);
    else if (A.phase !== 'endgame' && A.queens) push('bad', `${who} king is still in the centre`, [s.king.square]);
    if (s.pawns.isolated.length) push('bad', `isolated pawn${s.pawns.isolated.length > 1 ? 's' : ''} on ${listSquares(s.pawns.isolated)}`, s.pawns.isolated);
    if (s.pawns.doubled.length) push('bad', `doubled pawns on the ${listSquares(s.pawns.doubled)}-file`, []);
    if (s.pawns.backward.length) push('bad', `backward pawn on ${listSquares(s.pawns.backward)}`, s.pawns.backward);
    if (s.pawns.passed.length) push('good', `passed pawn on ${listSquares(s.pawns.passed)}`, s.pawns.passed);
    if (s.bishops.pair) push('good', 'the bishop pair', s.bishops.list);
    if (s.bishops.bad.length) push('bad', `a “bad” bishop on ${s.bishops.bad[0]}`, s.bishops.bad);
    const goodOut = s.outposts.filter((o) => o.occupiedBy && o.occupiedBy.color === c && o.supported);
    if (goodOut.length) push('good', `a ${nm(goodOut[0].occupiedBy.type)} on the outpost ${goodOut[0].square}`, [goodOut[0].square]);
    if (s.rooks.open.length) push('good', `a rook on an open file (${s.rooks.open.join(', ')})`, s.rooks.open);
    if (s.rooks.seventh.length) push('good', 'a rook on the 7th rank', s.rooks.seventh);
    if (s.worst && s.worst.ratio < 0.5 && !s.bishops.bad.includes(s.worst.square)) push('bad', `a passive ${nm(s.worst.type)} on ${s.worst.square}`, [s.worst.square]);
    return out;
  };
  return { mine: side(color, 'Your'), theirs: side(e, 'Their'), material: A.side[color].material - A.side[e].material, phase: A.phase };
}

/* ------------------------------------------------------------------ why was this quiet move good? */

/**
 * The positional point of a move: compares the position before and after and names what changed for the mover.
 * Returns the most meaningful reasons first, each with squares to highlight. Empty when the move is purely tactical.
 * @returns {{kind:string, text:string, squares:string[], weight:number}[]}
 */
export function moveIdeas(fen, uci, { max = 3 } = {}) {
  let before, after, mv;
  try {
    const ch = new Chess(fen);
    mv = ch.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    after = analyzePosition(ch);
    before = analyzePosition(fen);
  } catch (e) { return []; }
  if (!mv) return [];
  const color = mv.color, e = opp(color);
  const B = before.side[color], Bt = before.side[e], A2 = after.side[color], At = after.side[e];
  const out = [];
  const add = (kind, text, squares, weight) => out.push({ kind, text, squares: squareFlash(squares), weight });
  const piece = mv.piece, to = mv.to, from = mv.from;
  const endgame = before.phase === 'endgame';

  // castling
  if (mv.flags.includes('k') || mv.flags.includes('q')) add('castle', 'Castling tucks the king behind its pawns and brings a rook to the centre — the king is far safer and the rook joins the game.', [to], 9);

  // improving a piece (compare its safe mobility and its quality of square)
  if (piece !== 'p' && piece !== 'k') {
    const pb = B.pieces.find((p) => p.square === from), pa = A2.pieces.find((p) => p.square === to);
    if (pb && pa) {
      const gain = pa.safeMob - pb.safeMob;
      const wasWorst = B.worst && B.worst.square === from;
      const outp = A2.outposts.find((o) => o.square === to);
      if (outp && outp.supported && (piece === 'n' || piece === 'b') && rel(color, rOf(to)) >= 3) add('outpost', `The ${nm(piece)} lands on ${to}, an outpost: a pawn guards it and no enemy pawn can ever attack it, so it cannot be chased away.`, [to], 8.5);
      if (wasWorst && gain >= 2) add('worst-piece', `It improves the worst-placed piece: the ${nm(piece)} goes from ${pb.safeMob} to ${pa.safeMob} safe squares. Improving your least active piece is the most reliable way to build a middlegame advantage.`, [from, to], 8);
      else if (gain >= 3) add('activity', `The ${nm(piece)} becomes much more active — ${pb.safeMob} → ${pa.safeMob} safe squares — so it influences more of the board.`, [from, to], 6.5);
      else if (gain <= -3 && !mv.captured) add('passive', `The ${nm(piece)} has fewer safe squares afterwards (${pb.safeMob} → ${pa.safeMob}); this is a trade-off made for something else on the board.`, [to], 1);
      if (piece === 'r') {
        const fs = after.side[color].pawns.fileState[to[0]];
        if (fs === 'open') add('open-file', `The rook takes the open ${to[0]}-file: no pawns block it, so it can invade the enemy camp.`, [to], 8);
        else if (fs === 'semi' && Bt.pawns.pawns.some((p) => p.s[0] === to[0])) add('half-open', `The rook takes the half-open ${to[0]}-file and pressures the enemy pawn on that file.`, [to], 7);
        if (rel(color, rOf(to)) === 6 && rel(color, rOf(from)) !== 6) add('seventh', 'A rook on the 7th rank attacks pawns from the side and pins the king to the back rank.', [to], 7.5);
        if (A2.rooks.connected && !B.rooks.connected) add('connect', 'The rooks are now connected: they protect each other and can swing to any file.', [to], 5);
      }
      if (piece === 'b' && A2.bishops.bad.length < B.bishops.bad.length) add('bad-bishop', 'The “bad” bishop gets out from behind its own pawns.', [from, to], 6.5);
      // a retreat or re-route that heads to a better square next move is a plan: name where it's heading
      if (piece === 'n' && !outp) {
        const next = routeFor(after.map, after.att, color, to);
        if (next && next.gain >= 2 && next.to !== from) add('route', `It is a step in a re-route: from ${to} the knight can head for ${next.to}.`, [to, next.to], 4);
      }
    }
  }
  // pawn moves: structure, breaks, space
  if (piece === 'p') {
    const cap = !!mv.captured;
    const hitsBefore = pawnBreaks(before.map, color, before.att).find((b) => b.pawn === from);
    if (hitsBefore && !cap) add('break', `A pawn break: ${mv.san} challenges the pawn${hitsBefore.hits.length > 1 ? 's' : ''} on ${hitsBefore.hits.join(' and ')}. Breaks open lines for your pieces — this is how a position gets played.`, [to, ...hitsBefore.hits], 7.5);
    if (cap) {
      if (At.pawns.isolated.length > Bt.pawns.isolated.length) add('structure', `The exchange leaves the enemy with an isolated pawn (${listSquares(At.pawns.isolated.filter((s) => !Bt.pawns.isolated.includes(s)) || At.pawns.isolated)}), a lasting target.`, At.pawns.isolated, 7);
      if (At.pawns.doubled.length > Bt.pawns.doubled.length) add('structure', `It doubles the enemy pawns on the ${At.pawns.doubled.filter((f) => !Bt.pawns.doubled.includes(f)).join(', ') || At.pawns.doubled[0]}-file — a long-term weakness.`, [], 6.5);
      if (A2.pawns.isolated.length > B.pawns.isolated.length) add('structure-bad', 'The recapture leaves you with an isolated pawn, which is the price paid for open lines for your pieces.', A2.pawns.isolated, 2);
    }
    if (A2.pawns.passed.length > B.pawns.passed.length) add('passed', `It creates a passed pawn on ${listSquares(A2.pawns.passed.filter((s) => !B.pawns.passed.includes(s)))}: nothing in front of it can stop it by pawns, so the enemy pieces must babysit it.`, A2.pawns.passed, 8);
    if (!cap && Math.abs(fOf(to) - 3.5) < 1.5 && rel(color, rOf(to)) >= 3 && !hitsBefore) add('space', `The pawn gains space in the centre, which gives your pieces more squares and cramps the opponent.`, [to], 4.5);
    if ((fOf(to) <= 1 || fOf(to) >= 6) && rel(color, rOf(to)) >= 3 && !endgame && At.king.castled && Math.abs(fOf(to) - fOf(At.king.square)) <= 2) add('storm', 'A pawn advance toward the enemy king: pawn storms rip open the shield so your pieces can attack.', [to, At.king.square], 6);
    if (!cap && (rOf(to) === (color === 'w' ? 2 : 5)) && fOf(to) >= 5 && endgame === false && B.king.castled && fOf(B.king.square) >= 6) add('luft', 'It gives the king a flight square (luft) so a back-rank check can never be decisive.', [to], 3);
  }
  // trades
  if (mv.captured && mv.captured !== 'p' && piece !== 'p') {
    const matB = B.material - Bt.material;
    if (mv.captured === 'b' && Bt.bishops.pair && !At.bishops.pair) add('bishop-pair', 'It takes away the opponent’s bishop pair.', [to], 6);
    if (matB >= 2) add('trade-ahead', 'You are ahead in material, so every trade of pieces brings the win closer.', [to], 5);
    if (matB <= -2) add('trade-behind', 'Trading when you are behind is risky; the engine must see concrete counterplay here.', [to], 1);
  }
  // restricting the opponent
  const mobDrop = Bt.safeMobTotal - At.safeMobTotal, mobGain = A2.safeMobTotal - B.safeMobTotal;
  if (mobDrop >= 5 && piece !== 'k') add('restrict', `It takes squares away from the opponent’s pieces (their safe squares drop from ${Bt.safeMobTotal} to ${At.safeMobTotal}) — squeezing them is a plan in itself.`, [to], 6);
  else if (mobGain >= 8) add('activity-total', 'Your pieces together get noticeably more room to operate.', [to], 4);
  // pressure on a weak pawn
  for (const t of [...Bt.pawns.isolated, ...Bt.pawns.backward]) {
    const was = (before.att.by[color][t] || []).length, now = (after.att.by[color][t] || []).length;
    if (now > was) { add('target', `It adds pressure on the weak pawn on ${t} (${now} attackers against ${(after.att.by[e][t] || []).length} defender${(after.att.by[e][t] || []).length === 1 ? '' : 's'}).`, [to, t], 7); break; }
  }
  // king attack
  if (At.king.zoneAttackers.length > Bt.king.zoneAttackers.length && At.king.zoneAttackers.length >= 2 && !endgame && (At.king.castled || before.queens > 0 && mv.color && At.king.shield < 3)) add('king-attack', `Another piece joins the attack on the enemy king: ${At.king.zoneAttackers.length} pieces now bear on the squares around it.`, [to, At.king.square], 6.5);
  // king safety of mover
  if (piece === 'k' && endgame) { const c0 = centrality(fOf(from), rOf(from)), c1 = centrality(fOf(to), rOf(to)); if (c1 > c0) add('king-active', 'In the endgame the king is a fighting piece; stepping toward the centre makes it useful.', [to], 6); }
  if (A2.king.zoneAttackers.length < B.king.zoneAttackers.length) add('defence', 'It reduces the pressure around your own king.', [to], 5.5);
  return out.sort((a, b) => b.weight - a.weight).slice(0, max);
}

/** One-line summary sentences for a move's positional point (used when the tactical narration has nothing specific to say). */
export function positionalSentences(fen, uci, max = 2) {
  return moveIdeas(fen, uci, { max }).filter((x) => x.weight >= 3).map((x) => x.text);
}

/** The single strongest positional reason for a move as a short clause ("it takes the open d-file…"), or '' when there is none. */
export function whyShort(fen, uci) {
  try {
    const x = moveIdeas(fen, uci, { max: 1 }).filter((i) => i.weight >= 3)[0];
    if (!x) return '';
    return x.text.replace(/\.$/, '').replace(/^It /, 'it ').replace(/^The /, 'the ').replace(/^A /, 'a ');
  } catch (e) { return ''; }
}
