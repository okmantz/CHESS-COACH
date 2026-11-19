// Offline puzzle generator: noisy engine self-play -> tactical positions -> verified (unique best move) puzzles.
// Usage: node scripts/gen-puzzles.mjs <seed> <minutes> <out.jsonl>
import fs from 'node:fs';
import { Chess } from '../vendor/chess.js';
import { nodeEngine } from './node-engine.mjs';
import { ECO } from '../js/data/eco.js';
import { moveFeatures, playLine, material, phaseOf } from '../js/themes.js';

const seed = +process.argv[2] || 1;
const minutes = +process.argv[3] || 10;
const out = process.argv[4] || `scripts/out/puzzles.${seed}.jsonl`;
fs.mkdirSync('scripts/out', { recursive: true });

function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(seed * 7919);
const pick = (a) => a[Math.floor(rand() * a.length)];

const wpOf = (l) => (l.mate != null ? (l.mate > 0 ? 100 : 0) : 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-1500, Math.min(1500, l.cp)))) - 1));
const uciOf = (mv) => mv.from + mv.to + (mv.promotion || '');
const e = nodeEngine();
await e.init();
const seen = new Set(fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).f) : []);
const t0 = Date.now();
let games = 0, made = 0;

async function noisyMove(ch) {
  const r = await e.go({ fen: ch.fen(), depth: 5, multipv: 5 });
  const lines = r.lines;
  const roll = rand();
  let idx = 0;
  if (roll > 0.62) idx = Math.min(lines.length - 1, 1 + Math.floor(rand() * (lines.length - 1)));
  if (roll > 0.93) { const moves = ch.moves({ verbose: true }); const m = pick(moves); return uciOf(m); }
  return lines[idx].pv[0];
}

async function trySolve(fen, lastUci) {
  const ch0 = new Chess(fen);
  if (ch0.isGameOver()) return null;
  if (ch0.moves().length < 2) return null;
  const pre = await e.go({ fen, depth: 8, multipv: 2 });
  if (pre.lines.length < 2) return null;
  const g = wpOf(pre.lines[0]) - wpOf(pre.lines[1]);
  if (g < 10 && !(pre.lines[0].mate > 0)) return null;
  if (wpOf(pre.lines[0]) > 97 && !(pre.lines[0].mate > 0 && pre.lines[0].mate <= 3)) return null; // already trivially won

  const solverColor = ch0.turn();
  const start = await e.go({ fen, depth: 15, multipv: 2 });
  const s1 = start.lines[0], s2 = start.lines[1];
  const wp0 = wpOf(s1), gap0 = wp0 - (s2 ? wpOf(s2) : 0);
  const mate0 = s1.mate != null && s1.mate > 0 ? s1.mate : null;
  const matStart = material(ch0).diff * (solverColor === 'w' ? 1 : -1);

  const line = [];
  const ch = new Chess(fen);
  let cur = start;
  let solverMoves = 0;
  for (let step = 0; step < 4; step++) {
    const l1 = cur.lines[0], l2 = cur.lines[1];
    if (!l2) return null;
    const gap = wpOf(l1) - wpOf(l2);
    const mateStep = l1.mate != null && l1.mate > 0;
    if (step === 0) { if (gap < 12) return null; } else if (gap < 14 && !(mateStep && !(l2.mate > 0 && l2.mate <= l1.mate))) break;
    if (mateStep && l2.mate != null && l2.mate > 0 && l2.mate <= l1.mate + 1) { if (step === 0) return null; break; }
    const mv = l1.pv[0];
    ch.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] });
    line.push(mv); solverMoves++;
    if (ch.isCheckmate()) break;
    if (ch.isGameOver()) { line.pop(); solverMoves--; break; }
    if (solverMoves >= 3) break;
    // opponent's best reply
    const rep = await e.go({ fen: ch.fen(), depth: 12, multipv: 1 });
    const rm = rep.lines[0].pv[0];
    const snapshot = ch.fen();
    ch.move({ from: rm.slice(0, 2), to: rm.slice(2, 4), promotion: rm[4] });
    if (ch.isGameOver()) { ch.undo(); break; }
    const nxt = await e.go({ fen: ch.fen(), depth: 14, multipv: 2 });
    if (!nxt.lines[1]) { ch.undo(); break; }
    const ngap = wpOf(nxt.lines[0]) - wpOf(nxt.lines[1]);
    const nmate = nxt.lines[0].mate != null && nxt.lines[0].mate > 0;
    if (ngap < 14 && !nmate) { ch.undo(); break; }
    line.push(rm);
    cur = nxt;
  }
  if (!line.length) return null;
  // final outcome check
  const fin = await e.go({ fen: ch.fen(), depth: 12, multipv: 1 });
  const finWpSolver = ch.isCheckmate() ? 100 : 100 - wpOf(fin.lines[0]); // fin is from opponent's view
  const matEnd = material(ch).diff * (solverColor === 'w' ? 1 : -1);
  const matGain = matEnd - matStart;
  const isMate = ch.isCheckmate() || (mate0 != null);
  const themes = new Set();
  // theme detection along the solution
  const c2 = new Chess(fen);
  for (let i = 0; i < line.length; i++) {
    const f = moveFeatures(c2.fen(), line[i]);
    if (i % 2 === 0 && f) for (const t of f.themes) {
      if (['fork', 'pin', 'skewer', 'discovered', 'backRank', 'smothered', 'promotion', 'doubleCheck'].includes(t)) themes.add(t === 'smothered' || t === 'doubleCheck' ? t : t);
      if (t === 'sacrifice' && i === 0) themes.add('sacrifice');
      if (t === 'freePiece' && i === 0) themes.add('hangingPiece');
    }
    c2.move({ from: line[i].slice(0, 2), to: line[i].slice(2, 4), promotion: line[i][4] });
  }
  if (isMate) {
    const n = ch.isCheckmate() ? Math.ceil(line.length / 2) : mate0;
    if (n <= 3) themes.add('mateIn' + n);
    themes.add('mate');
  }
  const firstQuiet = (() => { const f = moveFeatures(fen, line[0]); return f && !f.themes.includes('capture') && !f.themes.includes('check'); })();
  const isTactic = isMate || matGain >= 1 || themes.has('promotion') || (finWpSolver - wp0 >= 25) || (wp0 >= 70 && gap0 >= 25);
  if (!isTactic) {
    // defensive: the only move that holds
    if (s2 && wp0 >= 38 && gap0 >= 25 && wp0 <= 75 && firstQuiet) {
      themes.add('defensive');
      line.length = 1;
    } else return null;
  } else if (!isMate && s2 && wp0 >= 38 && wp0 <= 70 && gap0 >= 35 && firstQuiet && matGain < 1) {
    themes.add('defensive');
  }
  if (!isMate && matGain < 1 && !themes.has('defensive') && !themes.has('promotion') && finWpSolver - wp0 < 25 && !(wp0 >= 70 && gap0 >= 25)) return null;
  // skip pure recaptures
  if (lastUci) {
    
    const f0 = moveFeatures(fen, line[0]);
    if (f0 && f0.themes.includes('capture') && f0.info.to === lastUci.slice(2, 4) && !isMate && themes.size === 0) return null;
  }
  // difficulty: shallowest depth at which the final answer is found & stays found
  let firstDepth = 8;
  for (let d = 1; d <= 8; d++) {
    const r = await e.go({ fen, depth: d, multipv: 1 });
    if (r.lines[0].pv[0] === line[0]) { let stays = true; for (let d2 = d + 1; d2 <= Math.min(d + 2, 8); d2++) { const r2 = await e.go({ fen, depth: d2, multipv: 1 }); if (r2.lines[0].pv[0] !== line[0]) { stays = false; break; } } if (stays) { firstDepth = d; break; } }
  }
  const nSolver = Math.ceil(line.length / 2);
  let rating = 500 + firstDepth * 130 + (nSolver - 1) * 140 + (themes.has('sacrifice') ? 150 : 0) + (themes.has('defensive') ? 100 : 0);
  if (isMate) rating += Math.max(0, ((mate0 || nSolver) - 1) * 100);
  rating = Math.max(500, Math.min(2300, Math.round(rating / 10) * 10));
  return { f: fen, m: line, t: [...themes], r: rating };
}

while ((Date.now() - t0) / 60000 < minutes) {
  games++;
  const ch = new Chess();
  // random book opening
  const book = pick(ECO.filter((x) => x.moves.length >= 3));
  const nb = Math.min(book.moves.length, 3 + Math.floor(rand() * 8));
  for (let i = 0; i < nb; i++) ch.move(book.moves[i]);
  let last = null;
  const cand = [];
  for (let ply = nb; ply < 90 && !ch.isGameOver(); ply++) {
    if (ply > 12 && rand() < 0.5) cand.push({ fen: ch.fen(), last });
    const uci = await noisyMove(ch);
    ch.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    last = uci;
    if (cand.length > 40) break;
  }
  let got = 0;
  for (const c of cand) {
    const key = c.fen;
    if (seen.has(key)) continue;
    let p = null;
    try { p = await trySolve(c.fen, c.last); } catch (err) { console.error('err', err.message); }
    if (p) { seen.add(key); fs.appendFileSync(out, JSON.stringify(p) + '\n'); made++; got++; if (got >= 4) break; }
  }
  if (games % 5 === 0) console.log(`[seed ${seed}] games=${games} puzzles=${made} elapsed=${((Date.now() - t0) / 60000).toFixed(1)}m`);
}
console.log('done', made);
e.terminate();
