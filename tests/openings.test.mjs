import { Chess } from '../vendor/chess.js';
import { OPENINGS, parseLine, buildTree, isLearnerPly } from '../js/data/openings.js';
import { ECO } from '../js/data/eco.js';
let bad = 0;
for (const c of OPENINGS) {
  const tree = buildTree(c);
  c.lines.forEach((l, li) => {
    const ch = new Chess(); const mv = parseLine(l.moves);
    for (let i = 0; i < mv.length; i++) { try { ch.move(mv[i].san); } catch (e) { console.log('ILLEGAL', c.id, l.name, 'ply', i + 1, mv[i].san, 'after', ch.history().join(' ')); bad++; break; } }
  });
  // one learner move per position
  (function walk(n) { if (n.ply > 0 || n === tree) { const nextPly = n.ply + 1; if (isLearnerPly(c, nextPly) && n.children.length > 1) { console.log('LEARNER BRANCH', c.id, 'after', n.san, n.children.map(x=>x.san)); bad++; } } n.children.forEach(walk); })(tree);
  const noNote = []; (function walk(n) { if (n.ply && isLearnerPly(c, n.ply) && !n.note) noNote.push(n.ply + ':' + n.san); n.children.forEach(walk); })(tree);
  console.log(c.id, 'lines', c.lines.length, 'learner moves w/o note', noNote.length);
}
for (const l of ECO) { const ch = new Chess(); for (const s of l.moves) { try { ch.move(s); } catch (e) { console.log('ECO ILLEGAL', l.name, s); bad++; break; } } }
console.log(bad ? 'FAILED ' + bad : 'ALL OK');
process.exit(bad ? 1 : 0);
