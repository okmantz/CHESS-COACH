import test from 'node:test';
import assert from 'node:assert/strict';
import { crownsFor, crownsOfGame } from '../js/crowns.js';

test('3 crowns for a clean win, 2 for one hint or takeback, 1 for more, none for a loss or draw', () => {
  assert.equal(crownsFor({ outcome: 'win', hints: 0, takebacks: 0 }), 3);
  assert.equal(crownsFor({ outcome: 'win', hints: 1, takebacks: 0 }), 2);
  assert.equal(crownsFor({ outcome: 'win', hints: 0, takebacks: 1 }), 2);
  assert.equal(crownsFor({ outcome: 'win', hints: 1, takebacks: 1 }), 1);
  assert.equal(crownsFor({ outcome: 'win', hints: 0, takebacks: 4 }), 1);
  assert.equal(crownsFor({ outcome: 'win', hints: 7, takebacks: 0 }), 1);
  assert.equal(crownsFor({ outcome: 'loss', hints: 0, takebacks: 0 }), 0);
  assert.equal(crownsFor({ outcome: 'draw', hints: 0, takebacks: 0 }), 0);
});

test('saved games: stored crowns win; older records only get what can be proven', () => {
  assert.equal(crownsOfGame({ source: 'play', outcome: 'win', crowns: 2 }), 2);
  assert.equal(crownsOfGame({ source: 'play', outcome: 'win', rated: true }), 3);      // a rated win never used help
  assert.equal(crownsOfGame({ source: 'play', outcome: 'win', rated: false }), 1);
  assert.equal(crownsOfGame({ source: 'coach-play', outcome: 'win' }), 1);
  assert.equal(crownsOfGame({ source: 'play', outcome: 'loss', rated: true }), 0);
  assert.equal(crownsOfGame({ source: 'import', outcome: 'win' }), 0);
});
