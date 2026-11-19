// Fills the lesson-title lookup used by coach recommendations (kept separate to avoid circular imports).
import { LESSON_TITLES } from './coach.js';
import { OPENINGS } from './data/openings.js';
import { ENDGAMES } from './data/endgames.js';
import { MIDDLEGAMES } from './data/middlegames.js';
import { BASICS } from './data/basics.js';
import { TACTICS, STRATEGY } from './data/tactics.js';
for (const c of OPENINGS) LESSON_TITLES['openings:' + c.id] = c.name;
for (const e of ENDGAMES) LESSON_TITLES['endgames:' + e.id] = e.name;
for (const m of MIDDLEGAMES) LESSON_TITLES['middlegames:' + m.id] = m.name;
for (const b of BASICS) LESSON_TITLES['basics:' + b.id] = b.name;
for (const t of TACTICS) LESSON_TITLES['tactics:' + t.id] = t.name;
for (const t of STRATEGY) LESSON_TITLES['strategy:' + t.id] = t.name;
