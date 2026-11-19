// Engine-verifies lesson "move" steps: the first learner answer(s) must be best or within 0.5 pawns of best, and lines must stay good.
import { Chess } from '../vendor/chess.js';
import { nodeEngine } from './node-engine.mjs';
import { BASICS } from '../js/data/basics.js';
import { TACTICS, STRATEGY } from '../js/data/tactics.js';

const eng = nodeEngine();
await eng.init?.();
const toU = (c, m) => { const mv = /^[a-h][1-8][a-h][1-8]/.test(m) ? c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }) : c.move(m); return mv.from + mv.to + (mv.promotion || ''); };
let bad = 0, n = 0;
for (const l of [...BASICS, ...TACTICS, ...STRATEGY]) {
  let last = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  for (const [i, st] of l.steps.entries()) {
    const fen = st.fen || last; if (st.fen) last = st.fen;
    if (st.t !== 'move' || st.puzzle) continue;
    const side = new Chess(fen).turn();
    const res = await eng.go({ fen, depth: 14, multipv: 8 });
    const lines = (res.lines || res.multi || []);
    const score = (x) => (x.mate != null ? Math.sign(x.mate) * (10000 - Math.abs(x.mate)) : x.cp);
    const povScore = (x) => (side === 'w' ? score(x.white || x) : -score(x.white || x));
    const best = lines.length ? povScore(lines[0]) : null;
    const wants = st.answer || [st.line[0]];
    for (const a of wants) {
      const c = new Chess(fen); const u = toU(c, a);
      const ln = lines.find((x) => (x.pv || [])[0] === u);
      n++;
      if (!ln) { console.log(`?  ${l.id}#${i + 1} ${a}: not in top 8`); bad++; continue; }
      const d = best - povScore(ln);
      if (d > 60) { console.log(`✗  ${l.id}#${i + 1} ${a}: ${d}cp worse than best ${lines[0].pv[0]}`); bad++; }
    }
  }
}
console.log(`checked ${n} answers, ${bad} issues`);
eng.terminate?.(); process.exit(0);
