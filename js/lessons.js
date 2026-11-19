// Fills the lesson-title lookup used by coach recommendations (kept separate to avoid circular imports).
import { LESSON_TITLES } from './coach.js';
import { OPENINGS } from './data/openings.js';
import { ENDGAMES } from './data/endgames.js';
import { MIDDLEGAMES } from './data/middlegames.js';
for (const c of OPENINGS) LESSON_TITLES['openings:' + c.id] = c.name;
for (const e of ENDGAMES) LESSON_TITLES['endgames:' + e.id] = e.name;
for (const m of MIDDLEGAMES) LESSON_TITLES['middlegames:' + m.id] = m.name;
