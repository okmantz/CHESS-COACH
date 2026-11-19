// The ten computer opponents. Levels 1-6 weaken a shallow search with deliberate, human-like errors;
// levels 7-9 use Stockfish's own strength limiter (UCI_Elo); level 10 is the full engine.
import { Chess } from '../vendor/chess.js';

export const LEVELS = [
  { n: 1, elo: 400, name: 'Beginner', blurb: 'Plays almost randomly and often hangs pieces.', depth: 1, mpv: 10, T: 22, rnd: 0.4 },
  { n: 2, elo: 600, name: 'Basic moves', blurb: 'Knows how the pieces move, little else.', depth: 1, mpv: 8, T: 14, rnd: 0.22 },
  { n: 3, elo: 800, name: 'Developing', blurb: 'Grabs free pieces, misses most tactics.', depth: 2, mpv: 6, T: 9, rnd: 0.12 },
  { n: 4, elo: 1000, name: 'Casual player', blurb: 'Sees one-move threats, still blunders.', depth: 3, mpv: 5, T: 6, rnd: 0.05 },
  { n: 5, elo: 1200, name: 'Intermediate', blurb: 'Solid basics with occasional slips.', depth: 4, mpv: 4, T: 4, rnd: 0.02 },
  { n: 6, elo: 1400, name: 'Advanced intermediate', blurb: 'Tactically alert, positionally loose.', depth: 6, mpv: 3, T: 2.2, rnd: 0 },
  { n: 7, elo: 1650, name: 'Strong club player', blurb: 'Rarely drops material.', uci: 1650, ms: 220 },
  { n: 8, elo: 1950, name: 'Expert', blurb: 'Punishes inaccuracies.', uci: 1950, ms: 320 },
  { n: 9, elo: 2250, name: 'Master', blurb: 'Plays near master strength.', uci: 2300, ms: 450 },
  { n: 10, elo: 2800, name: 'Full engine', blurb: 'Stockfish at maximum strength.', ms: 900, full: true },
];

export const levelByN = (n) => LEVELS[Math.max(1, Math.min(10, n)) - 1];

const wpRaw = (l) => (l.mate != null ? (l.mate > 0 ? 100 : 0) : 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-1500, Math.min(1500, l.cp)))) - 1));

/** Choose a move for `level`. `clock` = {ms, inc} optional (bot's remaining time). Returns {uci, eval(white), lines}. */
export async function botMove(engine, fen, levelN, { clock, rand = Math.random } = {}) {
  const L = levelByN(levelN);
  const turn = fen.split(' ')[1];
  const white = (l) => (l.mate != null ? { mate: turn === 'w' ? l.mate : -l.mate } : { cp: turn === 'w' ? l.cp : -l.cp });
  if (L.uci || L.full) {
    let ms = L.ms;
    if (clock && clock.ms != null) ms = Math.max(60, Math.min(ms, clock.ms / 25 + (clock.inc || 0) * 0.5));
    const r = await engine.go({ fen, movetime: Math.round(ms), multipv: 1, options: L.uci ? { UCI_LimitStrength: 'true', UCI_Elo: L.uci } : {} });
    return { uci: r.bestmove, eval: r.lines[0] ? white(r.lines[0]) : null, lines: r.lines };
  }
  const r = await engine.go({ fen, depth: L.depth, multipv: L.mpv });
  const lines = r.lines;
  const ch = new Chess(fen);
  if (rand() < L.rnd) {
    const moves = ch.moves({ verbose: true });
    const m = moves[Math.floor(rand() * moves.length)];
    return { uci: m.from + m.to + (m.promotion || ''), eval: lines[0] ? white(lines[0]) : null, lines, random: true };
  }
  const wps = lines.map(wpRaw);
  const top = Math.max(...wps);
  const w = wps.map((x) => Math.exp((x - top) / L.T));
  const sum = w.reduce((a, b) => a + b, 0);
  let roll = rand() * sum, idx = 0;
  for (let i = 0; i < w.length; i++) { roll -= w[i]; if (roll <= 0) { idx = i; break; } }
  return { uci: lines[idx].pv[0], eval: lines[0] ? white(lines[0]) : null, lines };
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
