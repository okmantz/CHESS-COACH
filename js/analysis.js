// Game review: evaluations -> win-probability -> move classification -> accuracy -> coach commentary.
import { Chess } from '../vendor/chess.js';
import { ECO } from './data/eco.js';
import { phaseOf, moveFeatures } from './themes.js';
import { explainMove } from './coach.js';
import { evalToCp, winPct, povWin, moveAccuracy, fmtEval, CLASSES, classifyLoss, effectiveLoss, moverCp } from './evalmath.js';
import { refineClass } from './judge.js';

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

/** Search depth per review level; each search also has a time cap so a long game never stalls. */
export const DEPTHS = { quick: 12, standard: 16, deep: 20 };
const CAPS = { 12: 700, 16: 2600, 20: 6500 };
const capFor = (d) => CAPS[d] || Math.round(d * 120);
/** Bumped whenever the judging logic changes: older saved reviews are re-analysed automatically. */
export const REVIEW_VERSION = 5;

function terminalEval(ch) {
  if (ch.isCheckmate()) return { mate: 0, white: ch.turn() === 'w' ? -1 : 1 };
  if (ch.isDraw() || ch.isStalemate()) return { draw: true };
  return null;
}

const slim = (lines) => lines.slice(0, 3).map((l) => ({ e: l.white, pv: l.pv.slice(0, 8) }));

/**
 * Analyse every position of the game. For each position before a move we run MultiPV 3 and then make sure
 * the PLAYED move has a value from the very same search (searchmoves when it is not among the top three).
 */
export async function analysePositions(engine, fens, { ucis = [], depth = 15, onProgress, shouldStop } = {}) {
  const out = [];
  const ms = capFor(depth);
  for (let i = 0; i < fens.length; i++) {
    if (shouldStop && shouldStop()) throw new Error('cancelled');
    const ch = new Chess(fens[i]);
    const term = terminalEval(ch);
    if (term) {
      out.push(term.draw ? { e: { cp: 0 }, terminal: true } : { e: { cp: term.white * 30000 }, terminal: true, mated: true });
    } else {
      const r = await engine.go({ fen: fens[i], depth, movetime: ms, multipv: 3 });
      const l1 = r.lines[0];
      const entry = { e: l1.white, best: l1.pv[0], pv: l1.pv.slice(0, 8), top: slim(r.lines), depth };
      const l2 = r.lines[1];
      entry.e2 = l2 ? l2.white : null; entry.second = l2 ? l2.pv[0] : null; entry.pv2 = l2 ? l2.pv.slice(0, 4) : null;
      const u = ucis[i];
      if (u) {
        const hit = r.lines.find((l) => l.pv[0] === u);
        if (hit) entry.played = { e: hit.white, pv: hit.pv.slice(0, 6) };
        else {
          const p = await engine.go({ fen: fens[i], depth, movetime: ms, multipv: 1, searchmoves: [u] });
          if (p.lines[0]) entry.played = { e: p.lines[0].white, pv: p.lines[0].pv.slice(0, 6) };
        }
      }
      out.push(entry);
    }
    if (onProgress) onProgress((i + 1) / fens.length, i);
  }
  return out;
}

/** Which moves deserve a second, deeper look? Serious verdicts and moves whose two searches disagree. */
export function findSuspicious(game, pos, limit = 18) {
  const list = [];
  for (let i = 0; i < game.ucis.length; i++) {
    const b = pos[i], a = pos[i + 1];
    if (!b || b.terminal || !b.played) continue;
    const color = game.fens[i].split(' ')[1];
    const L = effectiveLoss(b.e, b.played.e, color);
    const isTop = b.best === game.ucis[i];
    const drift = a && !a.terminal ? Math.abs(povWin(b.played.e, color) - povWin(a.e, color)) : 0;
    const driftCp = a && !a.terminal ? Math.abs(moverCp(b.played.e, color) - moverCp(a.e, color)) : 0;
    const score = (isTop ? 0 : L.loss) + Math.max(drift, driftCp / 20);
    if ((!isTop && L.loss >= 5) || drift >= 10 || driftCp >= 200) list.push({ i, score });
  }
  return list.sort((x, y) => y.score - x.score).slice(0, limit).map((x) => x.i).sort((x, y) => x - y);
}

/** Re-search position i (and the position after it) deeper and overwrite the shallow results. */
async function verifyPosition(engine, game, pos, i, depth) {
  const ms = Math.round(capFor(depth) * 2.2);
  const fen = game.fens[i];
  const r = await engine.go({ fen, depth, movetime: ms, multipv: 3 });
  const l1 = r.lines[0];
  if (!l1) return;
  const entry = { e: l1.white, best: l1.pv[0], pv: l1.pv.slice(0, 8), top: slim(r.lines), depth, verified: true };
  const l2 = r.lines[1];
  entry.e2 = l2 ? l2.white : null; entry.second = l2 ? l2.pv[0] : null; entry.pv2 = l2 ? l2.pv.slice(0, 4) : null;
  const u = game.ucis[i];
  const hit = r.lines.find((l) => l.pv[0] === u);
  if (hit) entry.played = { e: hit.white, pv: hit.pv.slice(0, 6) };
  else { const p = await engine.go({ fen, depth, movetime: ms, multipv: 1, searchmoves: [u] }); if (p.lines[0]) entry.played = { e: p.lines[0].white, pv: p.lines[0].pv.slice(0, 6) }; }
  pos[i] = entry;
  const next = pos[i + 1];
  if (next && !next.terminal) {
    const r2 = await engine.go({ fen: game.fens[i + 1], depth, movetime: ms, multipv: 1 });
    if (r2.lines[0]) { next.e = r2.lines[0].white; next.pv = r2.lines[0].pv.slice(0, 8); next.best = r2.lines[0].pv[0]; }
  }
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
    // the played move's value comes from the same search as the best move (legacy reviews fall back to the next position)
    const playedE = before.played ? before.played.e : isTop ? before.e : after.e;
    const L = effectiveLoss(before.e, playedE, color);
    const loss = isTop ? 0 : L.loss;
    const inBook = book && isBookFen(fens[i + 1]) && !leftBook && i < 30;
    if (!inBook) leftBook = true;
    let cls = classifyLoss(loss, isTop);
    const wpSecond = before.e2 ? povWin(before.e2, color) : null;
    let feats = null;
    if (cls === 'best' || cls === 'excellent') {
      feats = moveFeatures(fens[i], ucis[i]);
      cls = refineClass({ cls, isTop, loss, wpB, wpA: povWin(playedE, color), wpSecond, feats });
    }
    if (inBook && loss < 10) cls = 'book';
    const phase = phaseOf(fens[i], i);
    const m = {
      ply: i, color, san: sans[i], uci: ucis[i], fenBefore: fens[i], fenAfter: fens[i + 1],
      moveNo: Math.floor((startFenPly(startFen) + i) / 2) + 1,
      evalBefore: before.e, evalAfter: after.e, evalPlayed: playedE,
      best: before.best || null, pv: before.pv || [], second: before.second || null, evalSecond: before.e2 || null,
      replyPv: after.pv || [], playedPv: before.played ? before.played.pv : [],
      wpBefore: wpB, wpAfter: wpA, loss, cpLoss: isTop ? 0 : L.cpLoss, missedMate: !isTop && L.missedMate, cls, acc: moveAccuracy(loss), phase,
      top: before.top || null, verified: !!before.verified,
      openingName: cls === 'book' ? bookName(fens[i + 1]) : null,
    };
    if (before.best) { try { const c = new Chess(fens[i]); const mv = c.move({ from: before.best.slice(0, 2), to: before.best.slice(2, 4), promotion: before.best[4] }); m.bestSan = mv.san; } catch (e) { /* ignore */ } }
    moves.push(m);
  }
  const review = { version: REVIEW_VERSION, depth, startFen, moves, summary: null, opening: identifyOpening(sans, startFen), evals: pos.map((p) => compactEval(p.e)) };
  attachCoach(review);
  review.summary = summarise(moves);
  return review;
}

/** (Re)generate the coach commentary for every move. Commentary is derived data and is not stored. */
export function attachCoach(review) {
  const prevUcis = [];
  for (const m of review.moves) {
    try { m.coach = explainMove(m, { prevUcis: prevUcis.slice() }); m.tags = m.coach.kind === 'mistake' ? m.coach.tags : []; } catch (e) { m.coach = null; m.tags = []; }
    prevUcis.push(m.uci);
  }
  return review;
}

/** What gets saved to localStorage: everything except the (re-creatable) commentary text. */
export function compactReview(review) {
  return { ...review, moves: review.moves.map((m) => { const { coach, ...rest } = m; return { ...rest, tags: m.tags || [] }; }) };
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

/** Full review with the engine: one consistent pass, then a deeper second look at the moves that matter. */
export async function reviewGame(engine, game, { depth = 15, onProgress, shouldStop } = {}) {
  const pos = await analysePositions(engine, game.fens, { ucis: game.ucis, depth, shouldStop, onProgress: onProgress ? (p, i) => onProgress(p * 0.8, i) : null });
  const flagged = findSuspicious(game, pos);
  for (let k = 0; k < flagged.length; k++) {
    if (shouldStop && shouldStop()) throw new Error('cancelled');
    await verifyPosition(engine, game, pos, flagged[k], Math.min(22, depth + 4));
    if (onProgress) onProgress(0.8 + 0.2 * ((k + 1) / flagged.length), flagged[k]);
  }
  return buildReview(game, pos, { depth });
}

/** Re-hydrate chess.js-free structure: eval for any position index (white pov). */
export function evalAt(review, i) { return expandEval(review.evals[i]); }
