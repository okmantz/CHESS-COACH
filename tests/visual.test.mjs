import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../vendor/chess.js';
import { whyMove, moveOverlay, engineArrows, lineOutcome, describePlayed, lineArrows, rankColor, COL } from '../js/visual.js';

const AFTER_E4E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const RUY = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const lines = [{ ev: { cp: 35 }, pv: ['f1b5', 'a7a6', 'b5a4', 'g8f6'] }, { ev: { cp: 28 }, pv: ['d2d4', 'e5d4'] }, { ev: { cp: 20 }, pv: ['f1c4'] }];

test('moveOverlay always draws the move and uses valid squares', () => {
  const o = moveOverlay(AFTER_E4E5, 'g1f3');
  assert.ok(o.arrows.length >= 1);
  for (const a of o.arrows) { assert.match(a.from, /^[a-h][1-8]$/); assert.match(a.to, /^[a-h][1-8]$/); }
});

test('engineArrows ranks colours and respects max', () => {
  const a = engineArrows(lines, { max: 2 });
  assert.equal(a.length, 2);
  assert.equal(a[0].color, rankColor(0));
  assert.equal(rankColor(0), COL.best);
  assert.notEqual(a[0].color, a[1].color);
});

test('lineArrows follows a line in order', () => {
  const a = lineArrows(RUY, lines[0].pv);
  assert.ok(a.length >= 2);
  assert.equal(a[0].from, 'f1'); assert.equal(a[0].to, 'b5');
});

test('whyMove explains the best move with a label and points', () => {
  const w = whyMove({ fen: RUY, uci: 'f1b5', pv: lines[0].pv, lines, idx: 0 });
  assert.equal(w.san, 'Bb5');
  assert.ok(w.label && w.label.text);
  assert.ok(w.headline.length > 5);
  assert.ok(w.points.length >= 1);
  assert.ok(w.overlay.arrows.some((a) => a.from === 'f1' && a.to === 'b5'));
});

test('whyMove copes with no engine lines at all', () => {
  const w = whyMove({ fen: RUY, uci: 'f1b5', lines: [] });
  assert.ok(w && w.san === 'Bb5');
});

test('describePlayed narrates a move and tags the mover', () => {
  const d = describePlayed({ fenBefore: AFTER_E4E5, uci: 'g1f3', viewer: 'b' });
  assert.equal(d.san, 'Nf3'); assert.equal(d.mover, 'w'); assert.equal(d.against, true);
  assert.ok(d.sentences.length >= 1);
  assert.ok(!d.overlay.legend.includes('best'), 'commentary should say "Move played", not "Best move"');
});

test('lineOutcome reports a capture sequence', () => {
  const r = lineOutcome('rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', ['f3e5', 'd7d6', 'e5f7', 'e8f7']);
  assert.ok(r);
});

test('overlays never throw on every legal move of a middlegame position', () => {
  const fen = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7';
  const c = new Chess(fen);
  for (const m of c.moves({ verbose: true })) {
    const uci = m.from + m.to + (m.promotion || '');
    assert.doesNotThrow(() => { moveOverlay(fen, uci); describePlayed({ fenBefore: fen, uci, viewer: 'b' }); whyMove({ fen, uci, lines: [] }); }, uci);
  }
});
