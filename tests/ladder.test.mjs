import test from 'node:test';
import assert from 'node:assert/strict';
import { TIERS } from '../js/ladder.js';
import { BASICS } from '../js/data/basics.js';
import { TACTICS, STRATEGY } from '../js/data/tactics.js';
import { ENDGAMES } from '../js/data/endgames.js';
import { MIDDLEGAMES } from '../js/data/middlegames.js';
import { OPENINGS } from '../js/data/openings.js';

const pools = { basics: BASICS, tactics: TACTICS, strategy: STRATEGY, endgames: ENDGAMES, middlegames: MIDDLEGAMES, openings: OPENINGS };
test('every study step on the road points to a real lesson', () => {
  const missing = [];
  for (const t of TIERS) for (const s of t.steps) {
    if (s.kind === 'puzzles' || !s.track) continue;
    if (!(pools[s.track] || []).some((l) => l.id === s.id)) missing.push(`${t.n}: ${s.track}/${s.id}`);
  }
  assert.deepEqual(missing, []);
});
