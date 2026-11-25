// Guards the coach's "why" text: every factual claim it makes about the engine's best move must be true on the board.
// (Found by this kind of audit: "takes the open a-file" for a rook already on it, "opens lines for the bishop and queen"
//  in a pawn ending, "Play Rc1" when the rook is already on the c-file.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../vendor/chess.js';
import { nodeEngine } from '../scripts/node-engine.mjs';
import { whyMove } from '../js/visual.js';
import { planFor } from '../js/ideas.js';
import { OPENINGS, parseLine } from '../js/data/openings.js';

const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
let seed = 987654321; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

function claimProblems(fen, uci, w) {
  const out = [];
  const mv = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  const after = new Chess(fen); after.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  const texts = [w.headline, ...(w.points || []).filter((p) => p.kind !== 'engine' && p.kind !== 'line').map((p) => p.text)].filter(Boolean);
  const pawnOnly = after.board().flat().every((x) => !x || x.type === 'k' || x.type === 'p');
  const me = mv.color, them = me === 'w' ? 'b' : 'w';
  const has = (c, t) => after.board().flat().some((x) => x && x.color === c && x.type === t);
  for (const t of texts) {
    let m;
    const bad = (why) => out.push(`${why}: "${t}" (${mv.san} in ${fen})`);
    if (/opens lines for your/.test(t)) { if (/bishop/.test(t) && !has(me, 'b')) bad('mentions a bishop that is not there'); if (/queen/.test(t) && !has(me, 'q')) bad('mentions a queen that is not there'); }
    if ((m = t.match(/takes the (?:half-)?open ([a-h])-file/))) if (!['r', 'q'].includes(mv.piece) || mv.from[0] === mv.to[0] || mv.to[0] !== m[1]) bad('file claim for a piece that did not arrive');
    if ((m = t.match(/^It captures the (\w+) on ([a-h][1-8])/))) if (!mv.captured || NAME[mv.captured] !== m[1] || mv.to !== m[2]) bad('wrong capture claim');
    if ((m = t.match(/It attacks the (\w+) on ([a-h][1-8])/))) { const p = after.get(m[2]); if (!p || p.color !== them || NAME[p.type] !== m[1]) bad('wrong attack target'); }
    if ((m = t.match(/protects the (\w+) on ([a-h][1-8])/))) { const p = after.get(m[2]); if (!p || p.color !== me || NAME[p.type] !== m[1]) bad('wrong protected piece'); }
    if ((m = t.match(/It develops the (\w+)/))) if (NAME[mv.piece] !== m[1]) bad('develops the wrong piece');
    if (pawnOnly && /\b(bishop|knight|rook)\b|\bqueen\b/i.test(t.replace(/to queen/g, ''))) bad('mentions pieces in a pawn ending');
    if (/^It also /.test(t) && texts[0] === t) bad('"It also" used as the headline');
  }
  return out;
}
function planProblems(fen, color) {
  const out = []; const ch = new Chess(fen);
  for (const p of planFor(fen, color, { max: 5 })) {
    const txt = `${p.title} ${p.text} ${p.how}`; let m;
    if (/whichever is yours/.test(txt)) out.push(`vague wording in plan ${p.id}`);
    if ((m = txt.match(/rook from ([a-h][1-8])/))) { const x = ch.get(m[1]); if (!x || x.type !== 'r' || x.color !== color) out.push(`plan ${p.id} names a rook that is not on ${m[1]} (${fen})`); }
    if (p.id === 'file') { const f = p.title.match(/([a-h])-file/)[1]; if (ch.board().flat().some((x) => x && x.type === 'r' && x.color === color && x.square[0] === f)) out.push(`plan suggests taking the ${f}-file the side already holds (${fen})`); }
  }
  return out;
}

test('the coach never states something false about the engine\'s best move', async () => {
  const eng = nodeEngine(); await eng.init();
  const problems = []; let n = 0;
  try {
    for (let g = 0; g < 4; g++) {
      const c = new Chess();
      const course = OPENINGS[Math.floor(rnd() * OPENINGS.length)]; const line = course.lines[Math.floor(rnd() * course.lines.length)];
      for (const s of parseLine(line.moves).map((x) => x.san).slice(0, 8 + Math.floor(rnd() * 8))) { try { c.move(s); } catch (e) { break; } }
      for (let i = 0; i < 22 && !c.isGameOver(); i++) {
        const fen = c.fen();
        const r = await eng.go({ fen, depth: 8, movetime: 300, multipv: 3 });
        const lines = r.lines.map((l) => ({ ev: l.white, pv: l.pv, white: l.white }));
        const w = whyMove({ fen, uci: lines[0].pv[0], pv: lines[0].pv, lines, idx: 0 });
        if (w) { problems.push(...claimProblems(fen, lines[0].pv[0], w)); n++; }
        problems.push(...planProblems(fen, c.turn()));
        const pick = rnd() < 0.7 ? lines[0] : (lines[1] || lines[0]);
        c.move({ from: pick.pv[0].slice(0, 2), to: pick.pv[0].slice(2, 4), promotion: pick.pv[0][4] });
      }
    }
    for (const fen of ['8/8/4k3/8/4PK2/8/8/8 w - - 0 1', '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', '8/5k2/8/5PK1/8/8/8/8 w - - 0 1', '8/p7/8/8/3k4/8/P2K4/8 w - - 0 1']) {
      const r = await eng.go({ fen, depth: 12, movetime: 500, multipv: 3 });
      const lines = r.lines.map((l) => ({ ev: l.white, pv: l.pv, white: l.white }));
      for (const l of lines) { const w = whyMove({ fen, uci: l.pv[0], pv: l.pv, lines, idx: 0 }); if (w) { problems.push(...claimProblems(fen, l.pv[0], w)); n++; } }
    }
  } finally { eng.terminate(); }
  assert.ok(n > 60, `only ${n} explanations were checked`);
  assert.deepEqual([...new Set(problems)], []);
});

test('king-and-pawn endings get real reasons (key squares, opposition), not bishop-and-queen talk', async () => {
  const eng = nodeEngine(); await eng.init();
  try {
    const fen = '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1';
    const r = await eng.go({ fen, depth: 14, movetime: 800, multipv: 2 });
    const lines = r.lines.map((l) => ({ ev: l.white, pv: l.pv, white: l.white }));
    const w = whyMove({ fen, uci: lines[0].pv[0], pv: lines[0].pv, lines, idx: 0 });
    assert.match(w.headline, /key square|opposition/i);
  } finally { eng.terminate(); }
});
