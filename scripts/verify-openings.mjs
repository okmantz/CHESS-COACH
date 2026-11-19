// Engine check of repertoire: every learner move must be within a tolerance of the engine's best (so we never teach a blunder).
import { Chess } from '../vendor/chess.js';
import { nodeEngine } from './node-engine.mjs';
import { OPENINGS, buildTree, isLearnerPly } from '../js/data/openings.js';
const only = process.argv[2];
const eng = nodeEngine();
const score = (l) => (l.white.mate != null ? Math.sign(l.white.mate) * 10000 : l.white.cp);
let bad = 0, n = 0;
for (const c of OPENINGS) {
  if (only && c.id !== only) continue;
  const tree = buildTree(c);
  const todo = [];
  (function walk(node, ch) {
    for (const k of node.children) {
      const next = new Chess(ch.fen()); const fenBefore = ch.fen(); next.move(k.san);
      if (isLearnerPly(c, k.ply)) todo.push({ fen: fenBefore, san: k.san, ply: k.ply });
      walk(k, next);
    }
  })(tree, new Chess());
  const seen = new Set();
  for (const t of todo) {
    if (seen.has(t.fen)) continue; seen.add(t.fen); n++;
    const r = await eng.go({ fen: t.fen, depth: 11, movetime: 500, multipv: 6 });
    const side = t.fen.split(' ')[1];
    const pov = (l) => (side === 'w' ? score(l) : -score(l));
    const bestS = pov(r.lines[0]);
    const mv = new Chess(t.fen).move(t.san); const u = mv.from + mv.to + (mv.promotion || '');
    const ln = r.lines.find((l) => l.pv[0] === u);
    const d = ln ? bestS - pov(ln) : null;
    if (d == null || d > 90) { bad++; console.log(`${c.id} ply${t.ply} ${t.san}: ${d == null ? 'not in top 6 (best ' + r.lines[0].pv[0] + ' ' + bestS + ')' : d + 'cp below best ' + r.lines[0].pv[0]}`); }
  }
}
console.log(`checked ${n} learner positions, ${bad} flagged`);
process.exit(0);
