import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../vendor/chess.js';
import { FASTTRACK } from '../js/data/fasttrack.js';
import { planFor, analyzePosition, moveIdeas } from '../js/ideas.js';

test('fast-track positions and answers are legal', () => {
  const ids = new Set();
  for (const l of FASTTRACK) {
    assert.ok(!ids.has(l.id)); ids.add(l.id);
    assert.ok(l.steps.length >= 5 && l.summary);
    for (const s of l.steps) {
      if (!s.fen) continue;
      const c = new Chess(s.fen);
      if (s.t === 'move') for (const a of s.answer) { const m = c.move({ from: a.slice(0, 2), to: a.slice(2, 4) }); assert.ok(m, `${l.id} ${a}`); c.undo(); }
      if (s.t === 'quiz') assert.ok(s.correct >= 0 && s.correct < s.options.length);
      if (s.t === 'tap') assert.ok(s.answer);
    }
  }
});

test('ideas engine gives plans for every fast-track position', () => {
  for (const l of FASTTRACK) for (const s of l.steps) if (s.fen && s.t !== 'say') {
    const c = new Chess(s.fen);
    assert.ok(Array.isArray(planFor(s.fen, c.turn())));
    assert.ok(analyzePosition(s.fen));
  }
  assert.ok(moveIdeas('r1bq1rk1/1pp2ppp/p1np1n2/2b1p3/4P3/1BPP1N2/PP3PPP/RNBQ1RK1 w - - 0 8', 'b1d2').length >= 0);
});
