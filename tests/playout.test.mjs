// The tap-to-play helpers: parsing a suggested line, replaying it to any point, and never throwing on stale input.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePv, replayPv, sanToUci, normLines, lineText, sansText } from '../js/pvutil.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

test('parsePv labels moves with numbers and ellipses', () => {
  const m = parsePv(START, ['e2e4', 'e7e5', 'g1f3', 'b8c6']);
  assert.deepEqual(m.map((x) => x.label), ['1.e4', 'e5', '2.Nf3', 'Nc6']);
  assert.equal(m[0].fen.split(' ')[1], 'b');
});
test('parsePv from a black-to-move position starts with an ellipsis', () => {
  const m = parsePv(AFTER_E4, ['e7e5', 'g1f3']);
  assert.deepEqual(m.map((x) => x.label), ['1…e5', '2.Nf3']);
});
test('parsePv stops at the first illegal or malformed move instead of throwing', () => {
  assert.equal(parsePv(START, ['e2e4', 'e2e4', 'g1f3']).length, 1);
  assert.equal(parsePv(START, ['zz', 'e2e4']).length, 0);
  assert.equal(parsePv('not a fen', ['e2e4']).length, 0);
  assert.equal(parsePv(START, null).length, 0);
});
test('parsePv handles promotion and respects the length limit', () => {
  const m = parsePv('8/P7/8/8/8/8/k6K/8 w - - 0 1', ['a7a8q']);
  assert.equal(m[0].san.startsWith('a8=Q'), true);
  assert.equal(parsePv(START, ['e2e4', 'e7e5', 'g1f3'], 2).length, 2);
});
test('replayPv plays a line up to any index, including the start', () => {
  const line = ['e2e4', 'e7e5', 'g1f3'];
  assert.equal(replayPv(START, line, -1).chess.fen(), START);
  assert.equal(replayPv(START, line, 0).chess.fen(), AFTER_E4);
  const r = replayPv(START, line, 2);
  assert.equal(r.applied, 3); assert.equal(r.last.san, 'Nf3'); assert.equal(r.chess.history().length, 3);
  assert.equal(replayPv(START, line, 99).applied, 3);
});
test('sanToUci converts and rejects', () => {
  assert.equal(sanToUci(START, 'Nf3'), 'g1f3');
  assert.equal(sanToUci(START, 'Ke2'), null);
});
test('normLines accepts stored ({e}) and live ({white}) lines and drops empties', () => {
  const out = normLines([{ e: { cp: 20 }, pv: ['e2e4'] }, { white: { mate: 3 }, pv: ['d2d4'] }, { pv: [] }, null]);
  assert.equal(out.length, 2); assert.deepEqual(out[1].ev, { mate: 3 });
});
test('text helpers', () => {
  assert.equal(lineText(START, ['e2e4', 'e7e5', 'g1f3']), '1. e4 e5 2. Nf3');
  assert.equal(sansText(['e4', 'e5', 'Nf3', 'Nc6'], 3), '1. e4 e5 2. Nf3');
  assert.equal(sansText(['e5', 'Nf3'], 8, 'b'), '1… e5 2. Nf3');
});
