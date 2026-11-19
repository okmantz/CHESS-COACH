// Validates all lesson content: every FEN loads, every answer/line is legal, every tap/squares answer is a real square.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../vendor/chess.js';
import { BASICS } from '../js/data/basics.js';
import * as T from '../js/data/tactics.js';

const lessons = [...BASICS, ...(T.TACTICS || []), ...(T.STRATEGY || [])];
const sqRe = /^[a-h][1-8]$/;
const tryMove = (c, m) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m) ? c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }) : c.move(m);

for (const l of lessons) {
  test(`lesson ${l.id}`, () => {
    assert.ok(l.steps.length >= 2, 'has steps');
    let lastFen = l.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    l.steps.forEach((st, i) => {
      const where = `${l.id} step ${i + 1}`;
      const fen = st.fen || lastFen;
      if (st.t !== 'puzzles') { let c; assert.doesNotThrow(() => { c = new Chess(fen); }, `${where}: bad FEN ${fen}`); }
      if (st.fen) lastFen = st.fen;
      for (const a of st.arrows || []) assert.match(a.split(':')[0], /^[a-h][1-8][a-h][1-8]$/, `${where}: arrow ${a}`);
      for (const q of st.hl || []) assert.match(q, sqRe, `${where}: hl`);
      if (st.t === 'tap') { for (const a of [].concat(st.answer)) assert.match(a, sqRe, `${where}: tap answer`); }
      if (st.t === 'squares') { if (st.answer) for (const a of st.answer) assert.match(a, sqRe); else { const c = new Chess(fen); assert.ok(c.get(st.piece), `${where}: piece missing`); } }
      if (st.t === 'quiz') { assert.ok(st.correct >= 0 && st.correct < st.options.length, `${where}: quiz index`); }
      if (st.t === 'say' && st.play) { const c = new Chess(fen); for (const m of st.play) assert.doesNotThrow(() => c.move(m), `${where}: play ${m}`); }
      if (st.t === 'move') {
        if (st.answer) for (const a of st.answer) { const c = new Chess(fen); assert.doesNotThrow(() => tryMove(c, a), `${where}: answer ${a} illegal in ${fen}`); }
        if (st.line) { const c = new Chess(fen); for (const m of st.line) assert.doesNotThrow(() => tryMove(c, m), `${where}: line move ${m} illegal in ${fen}`); }
        assert.ok(st.answer || st.line || st.mateIn1, `${where}: needs answer`);
      }
    });
  });
}
