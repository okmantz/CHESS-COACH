// The ten computer opponents, one per rung of the 600 -> 2600 ladder (each has a face and a voice: see personas.js).
// Levels 1-6 weaken a shallow search with deliberate, human-like errors; levels 7-10 use Stockfish's own strength limiter (UCI_Elo).
// The Elo numbers are approximate and relative to this app, not FIDE / Chess.com.
import { Chess } from '../vendor/chess.js';

export const LEVELS = [
  { n: 1, elo: 600, name: 'Beginner', who: 'Sam', color: '#34d399', avatar: 'bot-01', blurb: 'Just learned how the pieces move. Often leaves pieces hanging.', depth: 1, mpv: 10, T: 22, rnd: 0.34 },
  { n: 2, elo: 800, name: 'Novice', who: 'Maya', color: '#38bdf8', avatar: 'bot-02', blurb: 'Knows the basics. Grabs free pieces but misses most tactics.', depth: 1, mpv: 8, T: 14, rnd: 0.2 },
  { n: 3, elo: 1000, name: 'Amateur', who: 'Ethan', color: '#818cf8', avatar: 'bot-03', blurb: 'Thinks before moving. Sees one-move threats, still blunders.', depth: 2, mpv: 6, T: 9, rnd: 0.11 },
  { n: 4, elo: 1200, name: 'Casual', who: 'Jake', color: '#f87171', avatar: 'bot-04', blurb: 'Plays quickly and confidently. Solid basics, occasional slips.', depth: 3, mpv: 5, T: 6, rnd: 0.05 },
  { n: 5, elo: 1400, name: 'Intermediate', who: 'Sofia', color: '#c084fc', avatar: 'bot-05', blurb: 'Tactically alert. Punishes simple mistakes.', depth: 4, mpv: 4, T: 4, rnd: 0.02 },
  { n: 6, elo: 1600, name: 'Advanced', who: 'Marcus', color: '#60a5fa', avatar: 'bot-06', blurb: 'Calm and methodical. Rarely drops material.', depth: 6, mpv: 3, T: 2.2, rnd: 0 },
  { n: 7, elo: 1800, name: 'Expert', who: 'Elena', color: '#fbbf24', avatar: 'bot-07', blurb: 'Punishes inaccuracies and converts small advantages.', uci: 1750, ms: 260 },
  { n: 8, elo: 2000, name: 'Master', who: 'Daniel', color: '#4ade80', avatar: 'bot-08', blurb: 'Precise, patient, prepared. Hard to trick.', uci: 1950, ms: 330 },
  { n: 9, elo: 2200, name: 'Candidate Master', who: 'Kai', color: '#cbd5e1', avatar: 'bot-09', blurb: 'Sharp calculation and deep preparation.', uci: 2200, ms: 450 },
  { n: 10, elo: 2600, name: 'Grandmaster', who: 'Viktor', color: '#f5c451', avatar: 'bot-10', blurb: 'Plays like a grandmaster: relentless and almost flawless.', uci: 2600, ms: 700 },
];

export const levelByN = (n) => LEVELS[Math.max(1, Math.min(10, n)) - 1];

const wpRaw = (l) => (l.mate != null ? (l.mate > 0 ? 100 : 0) : 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-1500, Math.min(1500, l.cp)))) - 1));

/** Choose a move for `level`. `clock` = {ms, inc} optional (bot's remaining time). Returns {uci, eval(white), lines}. */
export async function botMove(engine, fen, levelN, { clock, rand = Math.random } = {}) {
  const L = levelByN(levelN);
  const turn = fen.split(' ')[1];
  const white = (l) => (l.mate != null ? { mate: turn === 'w' ? l.mate : -l.mate } : { cp: turn === 'w' ? l.cp : -l.cp });
  if (L.uci) {
    let ms = L.ms;
    if (clock && clock.ms != null) ms = Math.max(60, Math.min(ms, clock.ms / 25 + (clock.inc || 0) * 0.5));
    const r = await engine.go({ fen, movetime: Math.round(ms), multipv: 1, options: { UCI_LimitStrength: 'true', UCI_Elo: L.uci } });
    return { uci: r.bestmove, eval: r.lines[0] ? white(r.lines[0]) : null, lines: r.lines };
  }
  const r = await engine.go({ fen, depth: L.depth, multipv: L.mpv });
  const lines = r.lines;
  const ch = new Chess(fen);
  // how much worse (centipawns) was the chosen move than the best one? lets the opponent notice its own slips
  const cpOf = (l) => (l.mate != null ? (l.mate > 0 ? 10000 : -10000) : l.cp);
  const slipOf = (uci) => { const l = lines.find((x) => x.pv && x.pv[0] === uci); return l && lines[0] ? Math.max(0, cpOf(lines[0]) - cpOf(l)) : 0; };
  if (rand() < L.rnd) {
    const moves = ch.moves({ verbose: true });
    const m = moves[Math.floor(rand() * moves.length)];
    const uci = m.from + m.to + (m.promotion || '');
    return { uci, eval: lines[0] ? white(lines[0]) : null, lines, random: true, slipCp: slipOf(uci) };
  }
  const wps = lines.map(wpRaw);
  const top = Math.max(...wps);
  const w = wps.map((x) => Math.exp((x - top) / L.T));
  const sum = w.reduce((a, b) => a + b, 0);
  let roll = rand() * sum, idx = 0;
  for (let i = 0; i < w.length; i++) { roll -= w[i]; if (roll <= 0) { idx = i; break; } }
  return { uci: lines[idx].pv[0], eval: lines[0] ? white(lines[0]) : null, lines, slipCp: idx ? slipOf(lines[idx].pv[0]) : 0 };
}

/** Bots resign hopeless positions (stronger levels only) and accept draws they cannot improve on. */
export function botWantsToResign(levelN, evalWhite, botColor, history) {
  if (levelN < 5 || !evalWhite) return false;
  const cp = evalWhite.mate != null ? (evalWhite.mate > 0 ? 9999 : -9999) : evalWhite.cp;
  const mine = botColor === 'w' ? cp : -cp;
  history.push(mine);
  const h = history.slice(-4);
  return h.length >= 4 && h.every((x) => x <= -900);
}
export function botAcceptsDraw(evalWhite, botColor, ply) {
  if (!evalWhite) return false;
  const cp = evalWhite.mate != null ? (evalWhite.mate > 0 ? 9999 : -9999) : evalWhite.cp;
  const mine = botColor === 'w' ? cp : -cp;
  return mine <= 40 && ply >= 30;
}
