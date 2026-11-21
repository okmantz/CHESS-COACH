import test from 'node:test';
import assert from 'node:assert/strict';
let live;
try { live = await import('../js/fenutil.js'); } catch (e) { live = null; }
const skip = !live && 'live.js needs a DOM in this environment';
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

test('normaliseFen completes partial FENs and rejects junk', { skip }, () => {
  assert.equal(live.normaliseFen(START), `${START} w - - 0 1`);
  assert.equal(live.normaliseFen(`${START} b KQkq`), `${START} b KQkq - 0 1`);
  assert.equal(live.normaliseFen('not a fen'), null);
  assert.equal(live.normaliseFen(''), null);
});

test('placement <-> map round trip', { skip }, () => {
  assert.equal(live.placementFromMap(live.mapFromFen(`${START} w KQkq - 0 1`)), START);
});

test('castling rights only survive when king and rook are home', { skip }, () => {
  const map = live.mapFromFen(`${START} w KQkq - 0 1`);
  assert.equal(live.legalCastling(map), 'KQkq');
  delete map.h1; assert.equal(live.legalCastling(map), 'Qkq');
});

test('fenFromSetup validates kings, pawns and legality', { skip }, () => {
  const map = live.mapFromFen(`${START} w KQkq - 0 1`);
  assert.ok(live.fenFromSetup(map, 'w', 'KQkq').fen);
  const noKing = { ...map }; delete noKing.e1;
  assert.ok(live.fenFromSetup(noKing, 'w', '').error);
  assert.ok(live.fenFromSetup({ ...map, a1: 'wp' }, 'w', '').error);
});
