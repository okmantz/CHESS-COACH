// Visual coaching, pure and DOM-free: turns moves and engine lines into things that can be drawn ON the board
// (arrows, rings) and into plain-English "why" explanations built from what the move really does and what the
// engine's line says. Used by Analyze (review + live board), Play-with-Coach, Play and the two-player mode.
import { Chess } from '../vendor/chess.js';
import { moveIdeas } from './ideas.js';
import { moveInsight, narrateInsight, threatsAgainst } from './insight.js';
import { VAL, NAMES, boardMap, phaseOf, findKing } from './themes.js';
import { parsePv } from './pvutil.js';
import { povWin, fmtEval } from './evalmath.js';

const opp = (c) => (c === 'w' ? 'b' : 'w');
const nm = (t) => NAMES[t] || 'piece';
const isUci = (u) => typeof u === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u);

/** One palette for every arrow on every screen, so a colour always means the same thing. */
export const COL = {
  best: '#5fc88f',     // the engine's first choice / a move you should play
  played: '#5fc88f',   // the move that was just played (commentary)
  second: '#62b8ff',   // second choice
  third: '#f2b84b',    // third choice
  threat: '#ff8a4c',   // "this piece attacks / threatens that one"
  defend: '#7fd6a4',   // "this piece protects that one"
  reply: '#ef6b6b',    // the opponent's answer / the punishment
  idea: '#b69cff',     // a follow-up idea
};
export const LEGEND = {
  played: 'Move played', best: 'Best move', second: '2nd choice', third: '3rd choice', threat: 'Attacks', defend: 'Protects', reply: 'Opponent’s reply', idea: 'Follow-up',
};
const RANK_COLORS = [COL.best, COL.second, COL.third];

/** Colour for engine line number `i` (0-based). Used by arrows AND the dots in the suggestion list so they match. */
export const rankColor = (i) => RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)];

const sqOf = (u) => ({ from: u.slice(0, 2), to: u.slice(2, 4) });

/* ------------------------------------------------------------------ engine arrows */

/**
 * Arrows for the engine's top lines: the first move of each. Best = thick green, then blue, then amber.
 * @param lines [{pv:[uci...]}] (any extra keys are ignored)
 */
export function engineArrows(lines, { max = 3 } = {}) {
  const out = [], seen = new Set();
  (lines || []).forEach((l, i) => {
    const u = l && l.pv && l.pv[0];
    if (!isUci(u) || seen.has(u.slice(0, 4)) || out.length >= max) return;
    seen.add(u.slice(0, 4));
    const w = [0.18, 0.145, 0.12][Math.min(i, 2)], o = [0.92, 0.78, 0.66][Math.min(i, 2)];
    out.push({ ...sqOf(u), color: rankColor(i), width: w, opacity: o, key: `eng${i}` });
  });
  return out;
}

/**
 * The next few moves of a line drawn as a story: the mover's move in green, the answer in red, then a dashed follow-up.
 * Pass `from` to skip moves that were already played.
 */
export function lineArrows(fen, ucis, { n = 3, from = 0 } = {}) {
  const moves = parsePv(fen, ucis, from + n).slice(from);
  const first = moves.length ? moves[0].color : 'w';
  return moves.map((m, i) => ({
    from: m.from, to: m.to,
    color: m.color === first ? (i === 0 ? COL.best : COL.idea) : COL.reply,
    width: i === 0 ? 0.17 : 0.13, opacity: i === 0 ? 0.92 : 0.72, dash: i >= 2, key: `ln${i}`,
  }));
}

/* ------------------------------------------------------------------ what a move does, drawn */

const CASTLE_ROOK = { e1g1: ['h1', 'f1'], e1c1: ['a1', 'd1'], e8g8: ['h8', 'f8'], e8c8: ['a8', 'd8'] };

/**
 * Overlay describing a move: the move itself, what the moved piece now attacks (orange), what it protects (green, dashed),
 * forks / pins / discovered attacks, the checkmate square and any piece left en prise.
 * Works for a position BEFORE the move (when: 'before', the move is shown as a green arrow) and AFTER it (when: 'after').
 * @returns {{arrows:[], marks:{}, legend:string[], ins:object}|null}
 */
export function moveOverlay(fenBefore, uci, { when = 'after', withMove = true } = {}) {
  let ins;
  try { ins = moveInsight(fenBefore, uci); } catch (e) { ins = null; }
  if (!ins) return null;
  const arrows = [], marks = {}, legend = new Set();
  const T = ins.themes || [];
  if (withMove) { arrows.push({ from: ins.from, to: ins.to, color: COL.best, width: 0.17, opacity: 0.9, key: 'mv' }); legend.add('best'); }
  const rook = CASTLE_ROOK[ins.from + ins.to];
  if (T.includes('castle') && rook) { arrows.push({ from: rook[0], to: rook[1], color: COL.best, width: 0.12, opacity: 0.7, dash: true, key: 'rook' }); }
  const used = new Set();
  const aim = (target, color, o = {}) => {
    if (!target || target === ins.to || used.has(target + color) || arrows.length >= 6) return;
    used.add(target + color);
    arrows.push({ from: ins.to, to: target, color, width: 0.11, opacity: 0.85, key: `fx${arrows.length}`, ...o });
    legend.add(color === COL.threat ? 'threat' : color === COL.defend ? 'defend' : 'reply');
  };
  const F = ins.feats && ins.feats.info ? ins.feats.info : {};
  if (T.includes('fork') && F.targets) for (const t of F.targets) { aim(t.square, COL.threat); marks[t.square] = 'ring-bad'; }
  else if (T.includes('pin') && F.pin) { marks[F.pin.pinned] = 'ring-warn'; marks[F.pin.behind] = 'ring-bad'; aim(F.pin.pinned, COL.threat); }
  else if (T.includes('skewer') && F.skewer) { marks[F.skewer.front] = 'ring-warn'; marks[F.skewer.behind] = 'ring-bad'; aim(F.skewer.front, COL.threat); }
  else if (T.includes('discovered') && F.discovered) { marks[F.discovered.target] = 'ring-bad'; if (F.discovered.slider) arrows.push({ from: F.discovered.slider, to: F.discovered.target, color: COL.threat, width: 0.11, opacity: 0.85, key: 'disc' }); legend.add('threat'); }
  for (const a of (ins.attacks || []).slice().sort((x, y) => (y.wins - x.wins) || (y.value - x.value)).slice(0, 3)) {
    if (marks[a.square]) continue;
    aim(a.square, COL.threat);
    marks[a.square] = a.undefended || a.wins ? 'ring-bad' : 'ring-warn';
  }
  // only mention a protected piece when it actually needed protecting (an enemy piece is attacking it)
  let afterPos = null;
  try { afterPos = new Chess(fenBefore); afterPos.move({ from: ins.from, to: ins.to, promotion: uci[4] }); } catch (e) { afterPos = null; }
  for (const d of (ins.defends || [])) {
    if (!afterPos || !afterPos.attackers(d.square, ins.enemy).length) continue;
    aim(d.square, COL.defend, { dash: true, opacity: 0.8 });
    if (!marks[d.square]) marks[d.square] = 'ring-good';
  }
  for (const s of (ins.controlsCenter || []).slice(0, 2)) if (!marks[s]) marks[s] = 'ring-info';
  if (ins.threatensMate && ins.mateSquare) marks[ins.mateSquare] = 'ring-bad';
  if (T.includes('mate') && afterPos) {
    const k = findKing(boardMap(afterPos), opp(ins.mover));
    if (k) marks[k] = 'ring-bad';
  }
  if (when === 'before') marks[ins.to] = marks[ins.to] || 'info';
  if (!ins.safe && !T.includes('mate') && !ins.captured) marks[ins.to] = 'ring-warn';
  return { arrows, marks, legend: [...legend], ins };
}

/** Rings for the squares an opponent's move put in danger (what you must now deal with). */
export function threatOverlay(fen, victim, { limit = 3 } = {}) {
  const th = threatsAgainst(fen, victim, { limit });
  const arrows = [], marks = {};
  for (const t of th) {
    if (t.kind === 'check') { for (const s of t.squares) marks[s] = 'ring-bad'; continue; }
    if (t.uci && arrows.length < 3) arrows.push({ ...sqOf(t.uci), color: COL.reply, width: 0.12, opacity: 0.8, dash: true, key: `th${arrows.length}` });
    for (const s of t.squares) marks[s] = t.kind === 'mate' ? 'ring-bad' : 'ring-warn';
  }
  return { arrows, marks, threats: th, legend: arrows.length ? ['reply'] : [] };
}

/**
 * Small rings that make a verdict visible at a glance when stepping through a game:
 * a mistake shows what the opponent's best reply takes / attacks, a great move shows a green ring.
 */
export function reviewMarks(m) {
  const marks = {};
  if (!m) return marks;
  const to = m.uci.slice(2, 4);
  if (m.cls === 'brilliant' || m.cls === 'great') marks[to] = 'ring-good';
  if (['mistake', 'blunder', 'inaccuracy'].includes(m.cls) && m.replyPv && isUci(m.replyPv[0])) {
    try {
      const c = new Chess(m.fenAfter);
      const r = c.move({ from: m.replyPv[0].slice(0, 2), to: m.replyPv[0].slice(2, 4), promotion: m.replyPv[0][4] });
      if (r && r.captured) marks[r.to] = 'ring-bad';
      if (r && c.inCheck()) { const k = findKing(boardMap(c), c.turn()); if (k) marks[k] = 'ring-bad'; }
    } catch (e) { /* ignore */ }
  }
  return marks;
}

/* ------------------------------------------------------------------ line facts */

const matDiff = (chess, color) => {
  const map = boardMap(chess);
  let d = 0;
  for (const s in map) { const p = map[s]; if (p.type === 'k') continue; d += (p.color === color ? 1 : -1) * VAL[p.type]; }
  return d;
};

/**
 * What happens to the material if the line is played out? Trailing captures are ignored so that a line that stops in the
 * middle of an exchange is not misread.
 * @returns {{delta:number, plies:number, settled:number, mate:boolean}} delta is from the point of view of the side that moves first
 */
export function lineOutcome(fen, ucis, n = 8) {
  let c;
  try { c = new Chess(fen); } catch (e) { return { delta: 0, plies: 0, settled: 0, mate: false }; }
  const me = c.turn(), base = matDiff(c, me), deltas = [], caps = [];
  let mate = false;
  for (const u of (ucis || []).slice(0, n)) {
    if (!isUci(u)) break;
    let mv; try { mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch (e) { mv = null; }
    if (!mv) break;
    deltas.push(matDiff(c, me) - base); caps.push(!!mv.captured);
    if (c.isCheckmate()) { mate = true; break; }
  }
  let k = deltas.length; while (k > 0 && caps[k - 1]) k--;
  return { delta: k ? deltas[k - 1] : 0, plies: deltas.length, settled: k, mate };
}

const theirs = (t) => String(t).replace(/\bYour\b/g, 'Their').replace(/\byour\b/g, 'their');
const sideName = (c) => (c === 'w' ? 'White' : 'Black');
const pawnsWord = (n) => `${n} ${n === 1 ? 'point' : 'points'}`;
const standing = (ev, color) => {
  if (!ev) return '';
  if (ev.mate != null) return (color === 'w' ? ev.mate > 0 : ev.mate < 0) ? 'a forced win' : 'a forced loss';
  const cp = color === 'w' ? ev.cp : -ev.cp;
  if (cp >= 400) return 'a winning advantage';
  if (cp >= 150) return 'a clear advantage';
  if (cp >= 50) return 'a small edge';
  if (cp > -50) return 'an equal position';
  if (cp > -150) return 'a slightly worse position';
  if (cp > -400) return 'a clearly worse position';
  return 'a lost position';
};

/* ------------------------------------------------------------------ the "why this move" explanation */

/**
 * Explain a suggested move: what it does on the board, what the engine's numbers say about it compared with the
 * alternatives, how the line is expected to go, and which threat it answers.
 *
 * @param fen        position BEFORE the move
 * @param uci        the move
 * @param pv         the full line the move belongs to, starting with `uci` at index `idx` (default: just the move)
 * @param lines      all candidate lines from the root position [{ev, pv}] (ev = White-pov {cp}|{mate}); optional
 * @param idx        index of this move inside the line (0 = the line's first move)
 * @param rootColor  the side the suggestion is FOR (defaults to the mover); replies are explained from its point of view
 * @param viewer     whose perspective the text uses for "you" ('w'|'b'|null = the root side)
 * @returns {{title, san, label:{text,tone}, headline, points:[{kind,text}], overlay, ins}|null}
 */
export function whyMove({ fen, uci, pv = null, lines = [], idx = 0, rootColor = null, viewer = null, phase = null }) {
  let ins;
  try { ins = moveInsight(fen, uci); } catch (e) { ins = null; }
  if (!ins) return null;
  const mover = ins.mover;
  const root = rootColor || mover;
  const you = viewer || root;
  const mine = mover === you;
  const ph = phase || phaseOf(fen);
  const line = Array.isArray(pv) && pv.length ? pv : [uci];
  const points = [];

  // 1) what the move does on the board
  const doing = narrateInsight(ins, { phase: ph, max: 3 });
  // the generic fallback sentence ("It improves the knight...") is replaced by the real positional point when we can name one
  const generic = (t) => /^(It improves the|A pawn move: it gains space|A king move)/.test(t || '');
  let ideasHere = [];
  try { ideasHere = idx === 0 || mover === root ? moveIdeas(fen, uci, { max: 3 }).filter((x) => x.weight >= 3) : []; } catch (e) { ideasHere = []; }
  const headline = (generic(doing[0]) && ideasHere.length ? ideasHere[0].text : doing[0]) || '';
  const skip = generic(doing[0]) && ideasHere.length ? 1 : 0;
  doing.slice(1).forEach((t) => points.push({ kind: 'idea', text: t }));
  ideasHere.slice(skip).forEach((x) => { if (!points.some((p) => p.text === x.text)) points.push({ kind: 'plan', text: x.text, squares: x.squares }); });

  // 2) engine verdict and comparison with the alternatives (only for the first move of a line, where `lines` is the root list)
  let label = { text: mine ? 'Follow-up' : 'Likely reply', tone: 'info' };
  const cand = (lines || []).filter((l) => l && l.pv && l.pv.length);
  const rank = idx === 0 ? cand.findIndex((l) => l.pv[0] === uci) : -1;
  const hit = rank >= 0 ? cand[rank] : null;
  if (idx === 0 && hit) {
    const best = cand[0];
    const wpOf = (l) => povWin(l.ev, mover);
    const gapTo = (a, b) => wpOf(a) - wpOf(b);
    const bestSan = (l) => { const p = parsePv(fen, l.pv, 1)[0]; return p ? p.san : l.pv[0]; };
    const posture = standing(hit.ev, mover);
    const evTxt = fmtEval(hit.ev);
    if (hit.ev && hit.ev.mate != null) {
      const n = Math.abs(hit.ev.mate), winning = (mover === 'w') === (hit.ev.mate > 0);
      points.unshift({ kind: 'engine', text: winning ? `The engine sees a forced checkmate in ${n} with this move — no defence holds.` : `Every move loses by force here (mate in ${n}); this is the most stubborn defence.` });
      label = winning ? { text: rank === 0 ? 'Forced mate' : 'Also wins', tone: 'good' } : { text: 'Best defence', tone: 'warn' };
    } else if (rank === 0) {
      const second = cand[1];
      if (second) {
        const gap = gapTo(hit, second);
        const s2 = bestSan(second), e2 = fmtEval(second.ev);
        if (gap >= 12) {
          points.unshift({ kind: 'engine', text: `Clearly the best move: it keeps ${posture} (${evTxt}), while the next-best option, ${s2}, drops to ${e2}.` });
          label = { text: 'Only move', tone: 'good' };
        } else if (gap >= 3) {
          points.unshift({ kind: 'engine', text: `The engine’s first choice, ${evTxt} (${posture}). ${s2} (${e2}) is a little behind it.` });
          label = { text: 'Best move', tone: 'good' };
        } else {
          points.unshift({ kind: 'engine', text: `The engine’s first choice, ${evTxt} (${posture}) — but ${s2} (${e2}) is almost as good, so this position has more than one good move.` });
          label = { text: 'Best move', tone: 'good' };
        }
      } else {
        points.unshift({ kind: 'engine', text: `The engine’s top choice: ${evTxt}, ${posture}.` });
        label = { text: 'Best move', tone: 'good' };
      }
    } else {
      const gap = gapTo(best, hit);
      points.unshift({ kind: 'engine', text: `The engine ranks it #${rank + 1}: ${evTxt} against ${fmtEval(best.ev)} for ${bestSan(best)}. ${gap < 3 ? 'The difference is tiny, so it is a fine choice.' : gap < 10 ? 'A playable alternative, but a little less accurate.' : 'Noticeably weaker than the best move.'}` });
      label = gap < 3 ? { text: 'Equally good', tone: 'good' } : gap < 10 ? { text: 'Good alternative', tone: 'ok' } : { text: 'Weaker option', tone: 'warn' };
    }
  }

  // 3) which threat does it answer (only for the side the suggestion is for)
  let after = null;
  try { after = new Chess(fen); after.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch (e) { after = null; }
  if (after && mover === root) {
    try {
      const before = threatsAgainst(fen, mover, { limit: 2 }).filter((t) => t.kind !== 'check');
      const left = threatsAgainst(after.fen(), mover, { limit: 2 }).filter((t) => t.kind !== 'check');
      const wasCheck = new Chess(fen).inCheck();
      if (wasCheck) points.push({ kind: 'threat', text: 'It gets the king out of check — the first thing that has to happen here.' });
      else if (before.length && !left.length) points.push({ kind: 'threat', text: `It stops the opponent’s threat: ${before[0].text}` });
      else if (before.length && left.length < before.length) points.push({ kind: 'threat', text: `It reduces the danger: ${before[0].text}` });
    } catch (e) { /* ignore */ }
  }

  // 4) material along the line
  if (line.length >= 3 || (!ins.captured && line.length >= 1)) {
    const o = lineOutcome(fen, line.slice(idx), 8);
    if (o.mate) points.push({ kind: 'material', text: 'The line ends in checkmate.' });
    else if (o.delta >= 1 && o.settled >= 1) points.push({ kind: 'material', text: mine ? `If the line is played out, you win about ${pawnsWord(o.delta)} of material.` : `If the line is played out, ${sideName(mover)} wins about ${pawnsWord(o.delta)} of material.` });
    else if (o.delta <= -1 && o.settled >= 1) {
      const compensated = !hit || povWin(hit.ev, mover) >= 40;
      if (compensated) points.push({ kind: 'material', text: `It gives up about ${pawnsWord(-o.delta)} of material on purpose — the engine judges the activity or attack to be worth it.` });
    }
  }

  // 5) what the opponent is expected to do next, and what that move does
  if (line.length > idx + 1) {
    const reply = line[idx + 1];
    try {
      const insR = moveInsight(after.fen(), reply);
      if (insR) {
        const s = narrateInsight(insR, { phase: ph, max: 1 })[0] || '';
        points.push({ kind: 'line', text: `Expected answer: ${insR.san}. ${s}` });
      }
    } catch (e) { /* ignore */ }
  }

  // what this move threatens next (for opponent moves in real games, where no engine line exists)
  let threats = [];
  if (after && !after.isGameOver()) {
    try {
      threats = threatsAgainst(after.fen(), opp(mover), { limit: 2 }).filter((t) => t.kind !== 'check' && t.kind !== 'pin');
    } catch (e) { threats = []; }
  }

  const overlay = moveOverlay(fen, uci, { when: 'after' });
  return {
    title: ins.san, san: ins.san, mover, label, headline, points, overlay, ins, threats,
    threatText: threats.length ? (mine ? theirs(threats[0].text) : threats[0].text) : '',
  };
}

/**
 * Narrate a move that was just played in a real game (opponent or partner), for the visual coach.
 * `viewer` is the side the commentary talks to ("you"); a threat against the viewer becomes a heads-up.
 */
export function describePlayed({ fenBefore, uci, viewer, phase = null, max = 2, withThreats = true }) {
  let ins;
  try { ins = moveInsight(fenBefore, uci); } catch (e) { ins = null; }
  if (!ins) return null;
  const after = new Chess(fenBefore);
  after.move({ from: ins.from, to: ins.to, promotion: uci[4] });
  const sentences = narrateInsight(ins, { phase: phase || phaseOf(fenBefore), max });
  let threats = [];
  if (withThreats && !after.isGameOver()) {
    try { threats = threatsAgainst(after.fen(), opp(ins.mover), { limit: 3 }).filter((t) => t.kind !== 'pin'); } catch (e) { threats = []; }
  }
  const against = viewer && opp(ins.mover) === viewer;
  const overlay = moveOverlay(fenBefore, uci, { when: 'after' });
  if (overlay) overlay.legend = overlay.legend.map((k) => (k === 'best' ? 'played' : k));
  if (overlay && threats.length) {
    // threats against the other side show as red dashed arrows + rings, on top of what the move itself does
    for (const t of threats) {
      if (t.uci && overlay.arrows.length < 7 && t.kind !== 'check') overlay.arrows.push({ ...sqOf(t.uci), color: COL.reply, width: 0.12, opacity: 0.8, dash: true, key: `th${overlay.arrows.length}` });
      for (const s of t.squares) if (!overlay.marks[s] || overlay.marks[s] === 'ring-info') overlay.marks[s] = t.kind === 'mate' ? 'ring-bad' : 'ring-warn';
    }
    if (!overlay.legend.includes('reply') && overlay.arrows.some((a) => a.color === COL.reply)) overlay.legend.push('reply');
  }
  return {
    san: ins.san, mover: ins.mover, ins, sentences, threats, against, overlay,
    threatText: threats.length ? (against ? threats.map((t) => t.text).join(' ') : threats.map((t) => theirs(t.text)).join(' ')) : '',
  };
}
