// The guided journey: reads everything the app knows about the player (rating, games, reviews, mistakes, lessons) and decides
// what to do NEXT, in plain words, with one button. Pure functions over the store state, so they are easy to test.
import * as store from './store.js';
import { OPENINGS } from './data/openings.js';
import { FASTTRACK } from './data/fasttrack.js';
import { BASICS } from './data/basics.js';
import { ENDGAMES } from './data/endgames.js';
import { TACTICS } from './data/tactics.js';
import { weaknessProfile, TAGS } from './coach.js';

const PHASES = ['opening', 'middlegame', 'endgame'];
const PHASE_LABEL = { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' };
export const phaseLabel = (p) => PHASE_LABEL[p] || p;

/* ---------------------------------------------------------------- lesson progress helpers */
const lessonOf = (s, track, id) => ((s.lessons || {})[track] || {})[id] || {};
export const isDone = (s, track, id) => !!lessonOf(s, track, id).done;
export function openingProgress(s, course) {
  const rec = (s.lessons.openings || {})[course.id];
  if (!rec) return 0;
  const done = course.lines.filter((_, i) => ((rec.lines || {})[i] || { ok: 0 }).ok >= 2).length;
  return done / course.lines.length;
}
const doneFrac = (s, track, list) => (list.length ? list.filter((x) => isDone(s, track, x.id)).length / list.length : 0);

/* ---------------------------------------------------------------- what the games say */

/** Games the coach has reviewed, with the player's colour known. */
export function reviewedGames(s) { return s.games.filter((g) => g.review && (g.color === 'w' || g.color === 'b')); }
export function playedGames(s) { return s.games.filter((g) => (g.source === 'play' || g.source === 'coach-play') && (g.color === 'w' || g.color === 'b')); }

/** Weighted accuracy per phase over the last few reviewed games (the player's own moves only). */
export function phaseProfile(s, last = 6) {
  const out = Object.fromEntries(PHASES.map((p) => [p, { n: 0, acc: null }]));
  const acc = Object.fromEntries(PHASES.map((p) => [p, 0]));
  for (const g of reviewedGames(s).slice(0, last)) {
    const sum = g.review.summary && g.review.summary[g.color];
    if (!sum || !sum.phase) continue;
    for (const p of PHASES) { const ph = sum.phase[p]; if (ph && ph.n && ph.acc != null) { out[p].n += ph.n; acc[p] += ph.acc * ph.n; } }
  }
  for (const p of PHASES) out[p].acc = out[p].n ? Math.round((acc[p] / out[p].n) * 10) / 10 : null;
  return out;
}

/** Which phase is costing the most? Compares each phase with the player's own overall level, not with an absolute bar. */
export function weakestPhase(profile) {
  const have = PHASES.filter((p) => profile[p].n >= 4 && profile[p].acc != null);
  if (!have.length) return null;
  const overall = have.reduce((a, p) => a + profile[p].acc * profile[p].n, 0) / have.reduce((a, p) => a + profile[p].n, 0);
  const ranked = have.map((p) => ({ p, acc: profile[p].acc, gap: overall - profile[p].acc })).sort((a, b) => a.acc - b.acc);
  const w = ranked[0];
  // a phase is "the problem" if it is clearly below the rest, or simply poor in absolute terms
  return w.gap >= 3 || w.acc < 72 ? w.p : null;
}

/* ---------------------------------------------------------------- openings: which course fits this player? */
const NAME_TO_COURSE = [
  [/Italian|Giuoco|Fried Liver|Evans/i, ['italian', 'evans']], [/Ruy Lopez|Spanish|Berlin|Marshall/i, ['ruy-lopez']], [/Scotch/i, ['scotch']], [/Vienna/i, ['vienna']],
  [/King's Gambit/i, ['kings-gambit']], [/Petrov/i, ['petroff']], [/Two Knights/i, ['two-knights']], [/Sicilian|Najdorf|Dragon|Sveshnikov|Taimanov|Kan\b/i, ['sicilian', 'dragon']],
  [/French/i, ['french']], [/Caro-Kann/i, ['caro-kann']], [/Scandinavian/i, ['scandinavian']], [/Pirc|Modern Defense/i, ['pirc']],
  [/Queen's Gambit Declined|QGD|Orthodox/i, ['qgd']], [/Queen's Gambit Accepted/i, ['qga']], [/Queen's Gambit/i, ['queens-gambit']], [/Slav/i, ['slav']],
  [/King's Indian/i, ['kings-indian']], [/Nimzo/i, ['nimzo-indian']], [/Gr[uü]nfeld/i, ['grunfeld']], [/Dutch/i, ['dutch']], [/London/i, ['london']],
  [/Catalan/i, ['catalan']], [/Colle/i, ['colle']], [/English/i, ['english']],
];
const courseOf = (id) => OPENINGS.find((c) => c.id === id);
export function courseForName(name, side) {
  if (!name) return null;
  for (const [re, ids] of NAME_TO_COURSE) if (re.test(name)) { const c = ids.map(courseOf).find((x) => x && (!side || x.side === side)); if (c) return c; }
  return null;
}
const STARTERS = {
  w: { Beginner: ['italian', 'london', 'scotch'], Intermediate: ['queens-gambit', 'ruy-lopez', 'vienna'], Advanced: ['english', 'catalan', 'kings-gambit'] },
  b: { Beginner: ['caro-kann', 'french', 'scandinavian'], Intermediate: ['qgd', 'petroff', 'slav'], Advanced: ['sicilian', 'nimzo-indian', 'kings-indian'] },
};
const levelOf = (rating) => (rating < 1000 ? 'Beginner' : rating < 1500 ? 'Intermediate' : 'Advanced');

/**
 * Specific courses to study. Uses the openings the player actually reached (from reviewed games) when the opening phase was
 * weak; otherwise a sensible starter set for the player's rating. Never recommends a course that is already finished.
 * @returns {{course, why:string}[]}
 */
export function recommendOpenings({ side = 'all', max = 3, state = null } = {}) {
  const s = state || store.get();
  const level = levelOf(s.rating.value || 600);
  const sides = side === 'all' ? ['w', 'b'] : [side];
  const out = [];
  const seen = new Set();
  const prof = phaseProfile(s);
  const weak = prof.opening.acc != null && prof.opening.acc < 78;
  const push = (course, why) => { if (course && !seen.has(course.id) && openingProgress(s, course) < 1) { seen.add(course.id); out.push({ course, why }); } };
  // 1) the openings the player really plays, when the opening phase is where points are lost
  if (weak) {
    const freq = {};
    for (const g of reviewedGames(s)) { const nm = g.review.opening && g.review.opening.name; const c = courseForName(nm, g.color); if (c) freq[c.id] = (freq[c.id] || 0) + 1; }
    Object.entries(freq).sort((a, b) => b[1] - a[1]).forEach(([id, n]) => { const c = courseOf(id); if (c && sides.includes(c.side)) push(c, `Your opening accuracy is ${prof.opening.acc}% and you keep reaching the ${c.name}. Learn it properly.`); });
  }
  // 2) starters for the rating, one per colour so a repertoire grows evenly
  for (const sd of sides) {
    const have = OPENINGS.filter((c) => c.side === sd && openingProgress(s, c) >= 0.5).length;
    for (const id of STARTERS[sd][level]) { const c = courseOf(id); if (c) push(c, have ? `Next step in your ${sd === 'w' ? 'White' : 'Black'} repertoire at your level.` : `A great first ${sd === 'w' ? 'White' : 'Black'} opening at your level (${level.toLowerCase()}): clear plans and few traps.`); }
  }
  if (!out.length) OPENINGS.filter((c) => sides.includes(c.side) && openingProgress(s, c) < 1).slice(0, max).forEach((c) => push(c, 'Keep building your repertoire.'));
  return out.slice(0, max);
}

/* ---------------------------------------------------------------- middlegame fast-track progress */
export function nextFastTrack(s) { return FASTTRACK.find((l) => !isDone(s, 'middlegames', l.id)) || null; }
export const fastTrackProgress = (s) => doneFrac(s, 'middlegames', FASTTRACK);
export function gymStats(s) { const g = s.gym || {}; return { rounds: g.rounds || 0, by: g.by || {}, best: g.best || 0 }; }

/* ---------------------------------------------------------------- the diagnosis and the next step */

/** One step the player can take right now. */
const step = (id, title, why, label, href, extra = {}) => ({ id, title, why, cta: { label, href }, ...extra });

/**
 * Everything the Path page and the Home card need.
 * @returns {{stage:string, headline:string, next:object, focus:string|null, profile:object, steps:object[], stats:object}}
 */
export function journey(state = null) {
  const s = state || store.get();
  const played = playedGames(s), reviewed = reviewedGames(s);
  const prof = phaseProfile(s);
  const focus = weakestPhase(prof);
  const rating = Math.round(s.rating.value || 600);
  const lastUnreviewed = played.find((g) => !g.review);
  const tags = weaknessProfile(s.mistakes || [], s.games || []);
  const topTag = tags[0] || null;
  const basicsDone = doneFrac(s, 'basics', BASICS);
  const ft = nextFastTrack(s);
  const recs = recommendOpenings({ max: 3, state: s });
  const stats = { games: played.length, reviewed: reviewed.length, rating, basics: basicsDone, fastTrack: fastTrackProgress(s), gym: gymStats(s) };

  let next, stage, headline;
  if (!played.length) {
    stage = 'start'; headline = 'Step 1 — play one game so the coach can see how you play';
    next = step('first-game', 'Play your first game', rating < 900 && basicsDone < 0.3 ? 'The coach needs a game to see where you stand. Pick the 600 or 800 opponent and just play — there is nothing to lose.' : 'The coach studies how you open, how you handle the middlegame and how you finish. One game is enough to start.', 'Play a game', '#/play');
  } else if (lastUnreviewed && reviewed.length < 3) {
    stage = 'review'; headline = 'Step 2 — let the coach study your game';
    next = step('review-game', 'See what your game says about you', 'The coach will score every move, find your biggest mistakes and tell you exactly what to train first.', 'Review my game', `#/analyze?game=${lastUnreviewed.id}`, { gameId: lastUnreviewed.id });
  } else if (focus === 'opening' || (!focus && reviewed.length && recs.length && OPENINGS.every((c) => openingProgress(s, c) < 0.3))) {
    stage = 'opening'; const r = recs[0];
    headline = focus === 'opening' ? `Your opening needs work (${prof.opening.acc}% accuracy)` : 'Build an opening repertoire';
    next = r ? step('opening', `Learn the ${r.course.name}`, r.why, 'Open the course', `#/learn/openings/${r.course.id}`, { course: r.course.id }) : step('opening', 'Learn the Opening Principles', 'Centre, development, castling.', 'Start', '#/learn/openings/principles');
  } else if (focus === 'middlegame' || (!focus && ft && rating < 1700)) {
    stage = 'middlegame'; headline = focus === 'middlegame' ? `The middlegame is where you lose points (${prof.middlegame.acc}% accuracy)` : 'Level up your middlegame';
    next = ft ? step('fast-track', `Middlegame Fast-Track: ${ft.name}`, ft.summary, 'Start lesson', `#/learn/middlegames/${ft.id}`, { lesson: ft.id }) : step('gym', 'Train in the Middlegame Gym', 'Short drills on real positions: find the worst piece, name the plan, find the best move.', 'Open the gym', '#/learn/middlegames/gym');
  } else if (focus === 'endgame') {
    const eg = ENDGAMES.find((e) => !isDone(s, 'endgames', e.id) && e.level === 'Beginner') || ENDGAMES.find((e) => !isDone(s, 'endgames', e.id));
    stage = 'endgame'; headline = `Your endgames cost you points (${prof.endgame.acc}% accuracy)`;
    next = eg ? step('endgame', `Endgame: ${eg.name}`, eg.summary, 'Start lesson', `#/learn/endgames/${eg.id}`) : step('gym', 'Keep the endgame sharp', 'Play a game with Coach and finish it.', 'Play', '#/coach-play');
  } else if (topTag && topTag.tag && TAGS[topTag.tag] && ['hung-piece', 'missed-fork', 'missed-pin', 'allowed-tactic', 'missed-capture', 'missed-mate', 'missed-skewer', 'missed-discovered'].includes(topTag.tag)) {
    stage = 'tactics'; headline = `Tactics: ${topTag.label.toLowerCase()} is your most common mistake`;
    const t = TAGS[topTag.tag].tasks[0];
    next = step('tactics', `Train: ${topTag.label}`, `You made this mistake ${topTag.count} time${topTag.count > 1 ? 's' : ''} recently.`, 'Train now', t.kind === 'puzzles' ? `#/train/puzzles?theme=${t.theme}&n=${t.n || 6}` : `#/train/mistakes?tag=${topTag.tag}`);
  } else {
    stage = 'play'; headline = 'Put it into practice';
    next = step('play-coach', 'Play a game with Coach', 'The coach asks questions before you move and keeps your new habits honest. After each game you get a fresh plan.', 'Play with Coach', '#/coach-play');
  }

  /* the full road, in order, each step marked done / current / later */
  const roadmap = [];
  const add = (id, title, text, href, done, extra = {}) => roadmap.push({ id, title, text, href, done: !!done, ...extra });
  add('play', 'Play your first game', 'The coach needs to see you play.', '#/play', played.length >= 1);
  add('review', 'Review a game with the coach', 'Move-by-move verdicts and your biggest mistakes.', lastUnreviewed ? `#/analyze?game=${lastUnreviewed.id}` : '#/games', reviewed.length >= 1);
  add('basics', 'Learn the fundamentals', 'How the pieces work, the three golden rules, the blunder check.', '#/learn/basics', basicsDone >= 0.75, { progress: basicsDone, optional: rating >= 1000 });
  const wRep = OPENINGS.filter((c) => c.side === 'w' && openingProgress(s, c) >= 0.5).length, bRep = OPENINGS.filter((c) => c.side === 'b' && openingProgress(s, c) >= 0.5).length;
  add('rep', 'Build a repertoire: one opening for White, one for Black', `${wRep ? '✓' : '○'} White · ${bRep ? '✓' : '○'} Black`, recs[0] ? `#/learn/openings/${recs[0].course.id}` : '#/learn/openings', wRep >= 1 && bRep >= 1, { progress: (Math.min(wRep, 1) + Math.min(bRep, 1)) / 2 });
  add('tactics', 'Sharpen tactics', 'Forks, pins, skewers and mating patterns.', '#/learn/tactics', doneFrac(s, 'tactics', TACTICS) >= 0.6, { progress: doneFrac(s, 'tactics', TACTICS) });
  FASTTRACK.forEach((l, i) => add(l.id, `Middlegame ${i + 1}: ${l.name}`, l.summary, `#/learn/middlegames/${l.id}`, isDone(s, 'middlegames', l.id), { group: 'middlegame' }));
  add('gym', 'Middlegame Gym: 5 rounds', 'Drills on real positions until the method is automatic.', '#/learn/middlegames/gym', stats.gym.rounds >= 5, { progress: Math.min(1, stats.gym.rounds / 5) });
  const keyEnd = ENDGAMES.filter((e) => e.level === 'Beginner');
  add('endgames', 'Endgame essentials', 'Key squares, the opposition, basic mates.', '#/learn/endgames', doneFrac(s, 'endgames', keyEnd) >= 0.75, { progress: doneFrac(s, 'endgames', keyEnd) });
  add('coach-play', 'Climb the road: beat the next opponent with Coach', 'Apply everything in real games.', '#/coach-play', (s.ladder && s.ladder.passed >= 3));
  const firstOpen = roadmap.findIndex((r) => !r.done && !r.optional);
  roadmap.forEach((r, i) => { r.current = i === firstOpen; });

  return { stage, headline, next, focus, profile: prof, topTag, recs, roadmap, stats };
}

/** After a single game: what went well, what to fix, and what to do about it. Works on a stored review. */
export function debriefOf(game, review) {
  const color = game.color;
  const moves = review.moves.filter((m) => m.color === color);
  const sum = (review.summary || {})[color] || { phase: {} };
  const phases = PHASES.map((p) => ({ phase: p, label: PHASE_LABEL[p], n: (sum.phase[p] || {}).n || 0, acc: (sum.phase[p] || {}).acc }));
  const have = phases.filter((p) => p.n >= 3 && p.acc != null);
  const worstPhase = have.length ? have.slice().sort((a, b) => a.acc - b.acc)[0] : null;
  const bestPhase = have.length > 1 ? have.slice().sort((a, b) => b.acc - a.acc)[0] : null;
  const bad = moves.filter((m) => ['blunder', 'mistake', 'inaccuracy'].includes(m.cls)).sort((a, b) => b.loss - a.loss);
  const biggest = bad[0] || null;
  const firstOpeningSlip = moves.find((m) => m.phase === 'opening' && ['blunder', 'mistake', 'inaccuracy'].includes(m.cls)) || null;
  const bookMoves = moves.filter((m) => m.cls === 'book').length;
  const counts = { blunder: 0, mistake: 0, inaccuracy: 0 };
  moves.forEach((m) => { if (counts[m.cls] != null) counts[m.cls]++; });
  return { color, accuracy: sum.acc, estRating: sum.estRating, phases, worstPhase, bestPhase, biggest, firstOpeningSlip, bookMoves, counts, opening: review.opening || null };
}
