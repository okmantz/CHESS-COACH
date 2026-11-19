// Game review: evaluations -> win-probability -> move classification -> accuracy -> coach commentary.
import { Chess } from '../vendor/chess.js';
import { ECO } from './data/eco.js';
import { phaseOf, moveFeatures } from './themes.js';
import { explainMove } from './coach.js';
import { evalToCp, winPct, povWin, moveAccuracy, fmtEval, CLASSES, classifyLoss } from './evalmath.js';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export { evalToCp, winPct, povWin, moveAccuracy, fmtEval, CLASSES, classifyLoss };

/* ---------------- opening book ---------------- */

const epd = (fen) => fen.split(' ').slice(0, 4).join(' ');
let BOOK = null;
export function getBook() {
  if (BOOK) return BOOK;
  BOOK = new Map();
  for (const line of ECO) {
    const ch = new Chess();
    let ok = true;
    for (const san of line.moves) { try { ch.move(san); } catch (e) { ok = false; break; } }
    if (!ok) continue;
    // register every prefix position; the full line gets the specific name
    const c2 = new Chess();
    line.moves.forEach((san, i) => {
      c2.move(san);
      const k = epd(c2.fen());
      if (i === line.moves.length - 1 || !BOOK.has(k)) BOOK.set(k, i === line.moves.length - 1 ? line.name : (BOOK.get(k) || null));
    });
  }
  return BOOK;
}
export function bookName(fen) { const n = getBook().get(epd(fen)); return n || null; }
export function isBookFen(fen) { return getBook().has(epd(fen)); }

/** Deepest named position reached while following `sans`. */
export function identifyOpening(sans, startFen = START_FEN) {
  if (startFen !== START_FEN) return null;
  const ch = new Chess();
  let name = null, ply = 0;
  for (let i = 0; i < Math.min(sans.length, 24); i++) {
    try { ch.move(sans[i]); } catch (e) { break; }
    const n = bookName(ch.fen());
    if (n) { name = n; ply = i + 1; }
  }
  return name ? { name, ply } : null;
}

/* ---------------- PGN helpers ---------------- */

/** Parse PGN (or bare SAN list) -> {headers, startFen, sans, ucis, fens} */
export function parseGame(text) {
  const ch = new Chess();
  let headers = {};
  const t = (text || '').trim();
  if (!t) throw new Error('Nothing to import.');
  if (/^[rnbqkpRNBQKP1-8]+\/[rnbqkpRNBQKP1-8/]+\s+[wb]\s/.test(t)) {
    // plain FEN: a single position
    const c = new Chess(t);
    return { headers: { FEN: t, SetUp: '1' }, startFen: c.fen(), sans: [], ucis: [], fens: [c.fen()], result: '*' };
  }
  try { ch.loadPgn(t); } catch (e) {
    // try as bare move text
    const c2 = new Chess();
    const cleaned = t.replace(/\{[^}]*\}/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/[?!]+/g, '').replace(/1-0|0-1|1\/2-1\/2|\*/g, ' ');
    let n = 0;
    for (const tok of cleaned.split(/\s+/).filter(Boolean)) { try { c2.move(tok); n++; } catch (er) { throw new Error(`Couldn't read move "${tok}" (after ${n} moves).`); } }
    if (!n) throw new Error('No legal moves found in that text.');
    return rebuild(c2.history({ verbose: true }), START_FEN, {});
  }
  headers = ch.getHeaders ? ch.getHeaders() : ch.header();
  const startFen = headers.FEN && headers.SetUp === '1' ? headers.FEN : START_FEN;
  const hist = ch.history({ verbose: true });
  if (!hist.length) throw new Error('That PGN has no moves.');
  return rebuild(hist, startFen, headers);
}

function rebuild(hist, startFen, headers) {
  const sans = hist.map((m) => m.san);
  const ucis = hist.map((m) => m.from + m.to + (m.promotion || ''));
  const fens = [startFen, ...hist.map((m) => m.after)];
  return { headers, startFen, sans, ucis, fens, result: headers.Result || '*' };
}

export function buildPgn({ sans, startFen = START_FEN, headers = {} }) {
  const ch = new Chess(startFen === START_FEN ? undefined : startFen);
  const h = { Event: 'Chess Coach game', Site: 'Chess Coach', Date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'), Round: '-', White: '?', Black: '?', Result: '*', ...headers };
  for (const [k, v] of Object.entries(h)) ch.setHeader(k, String(v));
  if (startFen !== START_FEN) { ch.setHeader('SetUp', '1'); ch.setHeader('FEN', startFen); }
  for (const s of sans) ch.move(s);
  return ch.pgn();
}

/* ---------------- the review pipeline ---------------- */

export const DEPTHS = { quick: 10, standard: 13, deep: 16 };

function terminalEval(ch) {
  if (ch.isCheckmate()) return { mate: 0, white: ch.turn() === 'w' ? -1 : 1 };
  if (ch.isDraw() || ch.isStalemate()) return { draw: true };
  return null;
}

/** Analyse every position of the game (N+1 searches, MultiPV 2). */
export async function analysePositions(engine, fens, { depth = 13, onProgress, shouldStop } = {}) {
  const out = [];
  for (let i = 0; i < fens.length; i++) {
    if (shouldStop && shouldStop()) throw new Error('cancelled');
    const ch = new Chess(fens[i]);
    const term = terminalEval(ch);
    if (term) {
      out.push(term.draw ? { e: { cp: 0 }, terminal: true } : { e: { cp: term.white * 30000 }, terminal: true, mated: true });
    } else {
      const r = await engine.go({ fen: fens[i], depth, multipv: 2 });
      const l1 = r.lines[0], l2 = r.lines[1];
      out.push({
        e: l1.white,
        best: l1.pv[0],
        pv: l1.pv.slice(0, 8),
        e2: l2 ? l2.white : null,
        second: l2 ? l2.pv[0] : null,
        pv2: l2 ? l2.pv.slice(0, 4) : null,
      });
    }
    if (onProgress) onProgress((i + 1) / fens.length, i);
  }
  return out;
}

/** Pure function: positions + game -> full review (no engine needed). */
export function buildReview(game, pos, { depth } = {}) {
  const { sans, ucis, fens, startFen } = game;
  const moves = [];
  const book = startFen === START_FEN;
  let leftBook = false;
  for (let i = 0; i < sans.length; i++) {
    const color = fens[i].split(' ')[1];
    const before = pos[i], after = pos[i + 1];
    const wpB = povWin(before.e, color);
    const wpA = povWin(after.e, color);
    const isTop = before.best === ucis[i];
    let loss = Math.max(0, wpB - wpA);
    if (isTop) loss = Math.min(loss, 0.3);
    // if the played move was the engine's 2nd line, use that line's value when it is better than a noisy follow-up eval
    if (!isTop && before.second === ucis[i] && before.e2) loss = Math.min(loss, Math.max(0, wpB - povWin(before.e2, color)) + 1.5);
    const inBook = book && isBookFen(fens[i + 1]) && !leftBook && i < 30;
    if (!inBook) leftBook = true;
    let cls = classifyLoss(loss, isTop);
    let feats = null;
    const wpSecond = before.e2 ? povWin(before.e2, color) : null;
    if (cls === 'best' || cls === 'excellent') {
      feats = moveFeatures(fens[i], ucis[i]);
      if (isTop && wpSecond != null && wpB - wpSecond >= 18 && wpB > 20 && wpB < 97 && !(feats && feats.themes.includes('mate')) ) cls = 'great';
      if (feats && feats.themes.includes('sacrifice') && loss <= 2 && wpA >= 45 && wpB < 90 && wpA > wpB - 6 && (isTop || wpSecond == null || wpB - wpSecond >= 5)) cls = 'brilliant';
    }
    if (inBook && loss < 10) cls = 'book';
    const ply = i;
    const phase = phaseOf(fens[i], ply);
    const m = {
      ply, color, san: sans[i], uci: ucis[i], fenBefore: fens[i], fenAfter: fens[i + 1],
      moveNo: Math.floor((startFenPly(startFen) + i) / 2) + 1,
      evalBefore: before.e, evalAfter: after.e,
      best: before.best || null, pv: before.pv || [], second: before.second || null, evalSecond: before.e2 || null,
      replyPv: after.pv || [],
      wpBefore: wpB, wpAfter: wpA, loss, cls, acc: moveAccuracy(loss), phase,
    };
    if (before.best) { try { const c = new Chess(fens[i]); const mv = c.move({ from: before.best.slice(0, 2), to: before.best.slice(2, 4), promotion: before.best[4] }); m.bestSan = mv.san; } catch (e) { /* ignore */ } }
    if (['inaccuracy', 'mistake', 'blunder', 'brilliant', 'great'].includes(cls)) {
      try { m.coach = explainMove(m, { feats }); m.tags = m.coach.tags; } catch (e) { m.coach = null; m.tags = []; }
    } else m.tags = [];
    moves.push(m);
  }
  const summary = summarise(moves);
  const opening = identifyOpening(sans, startFen);
  return { version: 1, depth, startFen, moves, summary, opening, evals: pos.map((p) => compactEval(p.e)) };
}

function startFenPly(fen) { const p = fen.split(' '); return (p[1] === 'b' ? 1 : 0) + ((+p[5] || 1) - 1) * 2; }
function compactEval(e) { return e.mate != null ? { m: e.mate } : { c: e.cp }; }
export function expandEval(c) { return c.m != null ? { mate: c.m } : { cp: c.c }; }

export function summarise(moves) {
  const side = () => ({ acc: 0, avgLoss: 0, counts: Object.fromEntries(Object.keys(CLASSES).map((k) => [k, 0])), phase: { opening: { n: 0, acc: 0 }, middlegame: { n: 0, acc: 0 }, endgame: { n: 0, acc: 0 } }, moves: 0 });
  const s = { w: side(), b: side() };
  const accs = { w: [], b: [] };
  for (const m of moves) {
    const x = s[m.color];
    x.counts[m.cls]++; x.moves++;
    x.avgLoss += m.loss;
    accs[m.color].push(m.acc);
    x.phase[m.phase].n++; x.phase[m.phase].acc += m.acc;
  }
  for (const c of ['w', 'b']) {
    const a = accs[c];
    if (a.length) {
      const mean = a.reduce((p, q) => p + q, 0) / a.length;
      const harm = a.length / a.reduce((p, q) => p + 1 / Math.max(q, 1), 0);
      s[c].acc = Math.round(((mean + harm) / 2) * 10) / 10;
      s[c].avgLoss = s[c].avgLoss / a.length;
    }
    for (const ph of Object.values(s[c].phase)) ph.acc = ph.n ? Math.round((ph.acc / ph.n) * 10) / 10 : null;
    s[c].estRating = accuracyToRating(s[c].acc, a.length);
  }
  return s;
}

/** Very rough accuracy -> rating mapping (documented as an estimate in the UI). */
export function accuracyToRating(acc, n = 20) {
  if (!n || n < 8) return null;
  const pts = [[30, 200], [45, 400], [55, 700], [65, 1000], [72, 1300], [78, 1600], [84, 1900], [89, 2200], [93, 2500], [97, 2800]];
  if (acc <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (acc <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return Math.round(y0 + ((acc - x0) / (x1 - x0)) * (y1 - y0)); }
  }
  return 2800;
}

/** Full review with the engine. */
export async function reviewGame(engine, game, { depth = 13, onProgress, shouldStop } = {}) {
  const pos = await analysePositions(engine, game.fens, { depth, onProgress, shouldStop });
  return buildReview(game, pos, { depth });
}

/** Re-hydrate chess.js-free structure: eval for any position index (white pov). */
export function evalAt(review, i) { return expandEval(review.evals[i]); }
