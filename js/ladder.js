// The Road from 600 to 2600: ten rungs, one opponent per rung. For every rung the coach spells out what the opponent is like,
// what to learn, what to practise and exactly what counts as "passing" — so a player always knows the next step.
import * as store from './store.js';
import { LEVELS } from './bot.js';

const L = (track, id, label) => ({ kind: 'lesson', track, id, label });
const P = (theme, n, label) => ({ kind: 'puzzles', theme, n, label });

/** Accuracy needed for a "clean win" on each rung (average move accuracy over the whole game). */
const TARGET_ACC = [55, 57, 59, 61, 63, 65, 66, 67, 68, 68];

const T = [
  {
    expect: 'Sam moves almost at random and leaves pieces hanging. You win by keeping your own pieces safe and capturing what he leaves loose.',
    skills: ['How every piece moves and captures', 'Develop knights and bishops before moving a piece twice', 'Check what can be captured before every move'],
    steps: [L('basics', 'values', 'Piece values'), L('basics', 'golden-develop', 'Develop your pieces'), L('basics', 'checkmate', 'How checkmate works'), P('mateIn1', 5, 'Mate in 1'), P('hangingPiece', 5, 'Win the loose piece')],
    habit: 'The blunder check: before each move, ask "what can they take?"',
  },
  {
    expect: 'Maya grabs any free piece and plays sensible developing moves, but she misses forks and pins.',
    skills: ['Control the centre with pawns', 'Castle early to get your king safe', 'Win material with a simple fork'],
    steps: [L('basics', 'golden-center', 'Control the centre'), L('basics', 'castling', 'Castling'), L('tactics', 'forks', 'Forks'), P('fork', 5, 'Fork puzzles'), P('hangingPiece', 5, 'Win the loose piece')],
    habit: 'Castle by move 10 — and do not bring the queen out early.',
  },
  {
    expect: 'Ethan checks one move ahead, so he will not hang a piece for nothing — but a two-move tactic still beats him.',
    skills: ['Protect every piece (or move it)', 'Pins and forks win material from a careful player', 'Slow down: list your candidate moves'],
    steps: [L('tactics', 'hanging-pieces', 'Hanging pieces'), L('tactics', 'pins', 'Pins'), L('strategy', 'candidate-moves', 'Candidate moves'), P('pin', 5, 'Pin puzzles'), P('fork', 5, 'Fork puzzles')],
    habit: 'Write down 2–3 candidate moves before you choose one.',
  },
  {
    expect: 'Jake plays fast and confidently with solid basics. He slips under pressure — keep your pieces active and wait for the mistake.',
    skills: ['Keep your king safe (pawn shield, back rank)', 'Use skewers and back-rank tactics', 'Put every piece on an active square'],
    steps: [L('basics', 'safety', 'King safety'), L('tactics', 'back-rank', 'Back-rank mates'), L('tactics', 'skewers', 'Skewers'), L('strategy', 'piece-activity', 'Piece activity'), P('mateIn2', 5, 'Mate in 2')],
    habit: 'Before attacking, check that your own king is safe.',
  },
  {
    expect: 'Sofia sees tactics and punishes simple mistakes. To beat her you need a plan, not just traps.',
    skills: ['Discovered attacks and removing defenders', 'Understand pawn structure', 'Know the basic checkmates by heart'],
    steps: [L('tactics', 'discovered', 'Discovered attacks'), L('tactics', 'remove-defender', 'Remove the defender'), L('strategy', 'pawn-structure', 'Pawn structure'), L('endgames', 'kq-mate', 'King and queen mate'), P('discovered', 5, 'Discovered attacks'), P('skewer', 5, 'Skewers')],
    habit: 'Ask "what is my opponent threatening?" after every reply.',
  },
  {
    expect: 'Marcus rarely drops material. You need open files, good squares and a long-term plan to outplay him.',
    skills: ['Rooks on open files and the 7th rank', 'Outposts for knights; good versus bad bishops', 'Convert simple endgames'],
    steps: [L('strategy', 'open-files', 'Open files'), L('strategy', 'outposts', 'Outposts and bishops'), L('endgames', 'key-squares', 'Key squares'), L('basics', 'golden-rooks', 'Connect your rooks'), P('mateIn2', 5, 'Mate in 2'), P('defensive', 5, 'Defensive puzzles')],
    habit: 'Improve your worst piece before you start any attack.',
  },
  {
    expect: 'Elena converts small advantages and punishes inaccuracies. Technique matters from here.',
    skills: ['King safety in the middlegame', 'Know when to trade pieces', 'Rook endgames: Lucena and Philidor'],
    steps: [L('strategy', 'king-safety', 'King safety'), L('strategy', 'trading', 'When to trade'), L('endgames', 'lucena', 'The Lucena position'), P('sacrifice', 5, 'Sacrifices'), P('mateIn3', 5, 'Mate in 3')],
    habit: 'Trade pieces when you are ahead; keep them when you are attacking.',
  },
  {
    expect: 'Daniel is patient, prepared and hard to trick. Beat him with understanding: weak squares and the initiative.',
    skills: ['Find and attack weaknesses', 'Keep the initiative', 'Know your opening repertoire to move 10'],
    steps: [L('strategy', 'weak-squares', 'Weak squares'), L('strategy', 'initiative', 'The initiative'), L('endgames', 'philidor', 'The Philidor position'), P('sacrifice', 5, 'Sacrifices'), P('defensive', 5, 'Defensive puzzles')],
    habit: 'Every move: improve something, or take something away from them.',
  },
  {
    expect: 'Kai calculates sharply and prepares deeply. Mistakes get punished at once.',
    skills: ['Prophylaxis: stop their plan before it starts', 'Convert an advantage without allowing counterplay', 'Calculate forcing lines to the end'],
    steps: [L('strategy', 'prophylaxis', 'Prophylaxis'), L('strategy', 'converting', 'Converting an advantage'), L('endgames', 'convert-rook', 'Converting rook endings'), P('mateIn3', 5, 'Mate in 3'), P('sacrifice', 5, 'Sacrifices')],
    habit: 'Ask "what does my opponent want to do next?" before your own move.',
  },
  {
    expect: 'Viktor plays like a grandmaster: no free gifts, relentless pressure, and an excellent endgame. A draw is already a great result.',
    skills: ['Make a concrete plan and stick to it', 'Endgame technique', 'Calculation accuracy under pressure'],
    steps: [L('strategy', 'planning', 'Making a plan'), L('endgames', 'rook-pawn', 'Rook pawn endings'), P('defensive', 5, 'Defensive puzzles'), P('mateIn3', 5, 'Mate in 3')],
    habit: 'Think in plans, verify with calculation.',
  },
];

export const TIERS = LEVELS.map((lv, i) => ({ ...lv, ...T[i], target: TARGET_ACC[i], needWins: 3 }));
export const tier = (n) => TIERS[Math.max(1, Math.min(10, n)) - 1];

/* ---------------------------------------------------------------- state */

const blank = () => ({ passed: 0, results: {} });
export function state() { const s = store.get(); if (!s.ladder) store.update((st) => { st.ladder = blank(); }); return store.get().ladder; }

/** The rung the player is working on right now (the first one not yet passed). */
export const currentRung = () => Math.min(10, state().passed + 1);
export const isPassed = (n) => n <= state().passed;
export const resultOf = (n) => state().results[n] || { played: 0, wins: 0, draws: 0, losses: 0, bestAcc: 0 };

const lessonDone = (track, id) => !!(((store.get().lessons || {})[track] || {})[id] || {}).done;

/** Checklist for a rung: recommended study steps (with live ticks) and the one gate (a clean win). */
export function progressFor(n) {
  const t = tier(n), s = store.get(), r = resultOf(n);
  const steps = t.steps.map((st) => {
    if (st.kind === 'lesson') return { ...st, done: lessonDone(st.track, st.id), href: `#/learn/${st.track}/${st.id}` };
    const th = s.puzzles.themes[st.theme] || { solved: 0 };
    return { ...st, have: Math.min(th.solved, st.n), done: th.solved >= st.n, href: `#/train/puzzles?theme=${st.theme}&n=${st.n}` };
  });
  const studied = steps.filter((x) => x.done).length;
  return { steps, studied, total: steps.length, result: r, target: t.target, needWins: t.needWins, passed: isPassed(n), ready: studied >= Math.ceil(steps.length / 2) };
}

/**
 * Record a finished coached game. Returns {passed, newlyPassed, clean, reason}.
 * Rule: a "clean win" (win with accuracy >= target) passes the rung; so do three wins in total.
 */
export function recordResult(n, outcome, accuracy) {
  const t = tier(n);
  let out = null;
  store.update((s) => {
    s.ladder = s.ladder || blank();
    const r = s.ladder.results[n] || (s.ladder.results[n] = { played: 0, wins: 0, draws: 0, losses: 0, bestAcc: 0 });
    r.played++; r.lastAcc = accuracy; r.last = Date.now();
    if (outcome === 'win') r.wins++; else if (outcome === 'draw') r.draws++; else r.losses++;
    r.bestAcc = Math.max(r.bestAcc || 0, accuracy);
    const clean = outcome === 'win' && accuracy >= t.target;
    const before = s.ladder.passed;
    let why = '';
    if (clean) why = `a clean win (${accuracy}% accuracy)`;
    else if (outcome === 'win' && r.wins >= t.needWins) why = `${r.wins} wins against ${t.who}`;
    if (why && n > s.ladder.passed) { s.ladder.passed = n; r.passedOn = Date.now(); }
    out = { passed: n <= s.ladder.passed, newlyPassed: s.ladder.passed > before && n === s.ladder.passed, clean, why, wins: r.wins, accuracy, target: t.target, wonButShort: outcome === 'win' && !clean };
  });
  store.flush();
  return out;
}

/** Plain-language explanation of where the player stands, used by the setup screen and the report. */
export function statusLine(n) {
  const t = tier(n), r = resultOf(n);
  if (isPassed(n)) return `Passed${r.bestAcc ? ` · best accuracy ${Math.round(r.bestAcc)}%` : ''}`;
  if (n === currentRung()) return r.played ? `Current rung · ${r.wins} win${r.wins === 1 ? '' : 's'} so far (${t.needWins} wins also pass)` : 'Your current rung';
  return n === currentRung() + 1 ? 'Next up' : 'Challenge: beat it to jump ahead';
}
