// Middlegame Gym: short rounds on real middlegame positions (reached from the opening courses and the scenario library).
// Each round trains the 3-question method: 1) tap your worst piece, 2) pick the plan, 3) play the move (engine-judged, with the reason).
import { Chess } from '../../vendor/chess.js';
import * as store from '../store.js';
import { h, icon, toast } from '../ui.js';
import { Board } from '../board.js';
import { OPENINGS, parseLine } from '../data/openings.js';
import { MIDDLEGAMES } from '../data/middlegames.js';
import { analyzePosition, planFor } from '../ideas.js';
import { judgeMove } from '../judge.js';
import { whyMove } from '../visual.js';
import { whyCard } from '../whyui.js';
import { legalTargetsFor, checkSquare, uciOf, engineSafe } from '../chessutil.js';
import { play as sfx } from '../sound.js';
import { classBadge } from '../components.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
const NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** A fresh position where it is the learner's turn, deep enough to be a real middlegame. */
export function gymPosition(prefer = null) {
  for (let tries = 0; tries < 40; tries++) {
    let fen, color, source;
    if (Math.random() < 0.25) {
      const m = pick(MIDDLEGAMES); fen = m.fen; color = new Chess(fen).turn(); source = m.name;
    } else {
      const pool = prefer && prefer.length ? prefer : OPENINGS.filter((c) => c.id !== 'principles');
      const c = pick(pool), line = pick(c.lines);
      const sans = parseLine(line.moves).map((x) => x.san);
      const want = 12 + Math.floor(Math.random() * 7);
      const ch = new Chess(); let n = 0;
      for (const s of sans) { if (n >= want) break; try { ch.move(s); n++; } catch (e) { break; } }
      if (n < 10) continue;
      fen = ch.fen(); color = ch.turn(); source = `${c.name}, after ${Math.ceil(n / 2)} moves`;
    }
    try {
      const g = new Chess(fen);
      if (g.isGameOver() || g.inCheck() || !engineSafe(fen)) continue;
      const A = analyzePosition(fen);
      const plans = planFor(A, color, { max: 4 }).filter((p) => p.id !== 'safety');
      if (!plans.length) continue;
      return { fen, color, source, A, plans, worst: A.side[color].worst && A.side[color].worst.ratio < 0.6 ? A.side[color].worst : null };
    } catch (e) { /* try another */ }
  }
  return null;
}

export function gym(root, ctx, { back } = {}) {
  const st = () => store.get().gym || { rounds: 0, points: 0, best: 0, by: {} };
  let alive = true, pos = null, stage = 0, score = 0, locked = false, board = null, chess = null, streak = 0;
  const wrap = h('div.gym');
  const head = h('div.gym-head'), steps = h('div.gym-steps'), boardHost = h('div.gym-board'), panel = h('div.gym-panel');
  wrap.append(head, h('div.gym-main', boardHost, h('div.gym-side', steps, panel)));
  root.append(wrap);

  const drawHead = () => { const g = st(); head.replaceChildren(h('div.row', h('div.grow', h('h2.m0', 'Middlegame Gym'), h('div.small.muted', `${g.rounds} round${g.rounds === 1 ? '' : 's'} done · best score ${g.best}/3 · streak ${streak}`)), back ? h('a.btn.ghost.sm', { href: back }, 'Back') : null)); };
  const drawSteps = () => steps.replaceChildren(...['Worst piece', 'Plan', 'Best move'].map((l, i) => h('span.gym-step', { class: i < stage ? 'done' : i === stage ? 'now' : '' }, `${i + 1}. ${l}`)));
  const saveRound = () => store.update((s) => { const g = s.gym || (s.gym = { rounds: 0, points: 0, best: 0, by: {} }); g.rounds++; g.points += score; g.best = Math.max(g.best || 0, score); g.last = Date.now(); });

  function newRound() {
    pos = gymPosition(); if (!pos) { panel.replaceChildren(h('p', 'Could not build a position. Try again.')); return; }
    stage = 0; score = 0; locked = false; chess = new Chess(pos.fen);
    if (board) board.destroy();
    board = new Board(h('div'), { orientation: pos.color, coords: store.get().settings.coords, legalDots: store.get().settings.legalDots, animate: store.get().settings.animations, autoQueen: true, interactive: false,
      canSelect: (sq) => !locked && stage === 2 && !!chess.get(sq) && chess.get(sq).color === chess.turn(), legalTargets: (sq) => legalTargetsFor(chess, sq), onMove: (m) => userMove(m) });
    boardHost.replaceChildren(board.el);
    board.setPosition(pos.fen);
    drawHead(); drawSteps();
    next();
  }

  function next() {
    if (stage === 0) { if (!pos.worst) { stage = 1; drawSteps(); return next(); } stageWorst(); }
    else if (stage === 1) stagePlan();
    else if (stage === 2) stageMove();
    else finish();
  }

  /* 1: worst piece */
  function stageWorst() {
    board.setInteractive(false);
    panel.replaceChildren(h('div.gym-q', icon('target', 18), h('span', `${pos.color === 'w' ? 'White' : 'Black'} to move. Source: ${pos.source}.`)), h('p', h('b', 'Question 1:'), ' tap your worst-placed minor piece, the one doing the least.'));
    let tries = 0;
    board.setSquareMode((sq) => {
      if (locked) return;
      const w = pos.worst.square;
      if (sq === w) { board.setSquareMode(null); board.setMarks({ [sq]: 'good' }); score++; sfx('good'); explain(true, `Yes: your ${NAMES[pos.worst.type]} on ${sq} attacks the fewest squares of your pieces.`, () => { stage = 1; drawSteps(); next(); }); }
      else { tries++; board.setMarks({ [sq]: 'bad' }); sfx('bad'); if (tries >= 2) { board.setSquareMode(null); board.setMarks({ [w]: 'good' }); explain(false, `The worst piece is the ${NAMES[pos.worst.type]} on ${w}. It does the least: that is the first thing to improve.`, () => { stage = 1; drawSteps(); next(); }); } else toast('Not that one. Look for a piece with few squares.'); setTimeout(() => { if (alive && tries < 2) board.setMarks({}); }, 700); }
    });
  }

  /* 2: plan */
  function stagePlan() {
    board.setSquareMode(null); board.setMarks({});
    const good = pos.plans[0];
    const pool = GENERIC_PLANS.filter((p) => !p.ids.includes(good.id));
    const opts = shuffle([{ text: good.title, ok: true, why: good.text }, ...shuffle(pool).slice(0, 2).map((p) => ({ text: p.text, ok: false, why: p.why }))]);
    panel.replaceChildren(h('p', h('b', 'Question 2:'), ' what is the best plan in this position?'),
      h('div.gym-opts', opts.map((o) => h('button.btn.block.gym-opt', { type: 'button', onclick: (e) => answerPlan(o, e.currentTarget, opts) }, o.text))));
    board.setArrows(good.arrows || []);
    board.setArrows([]);
    function answerPlan(o) {
      if (locked) return; locked = true;
      panel.querySelectorAll('.gym-opt').forEach((b, i) => { b.disabled = true; b.classList.add(opts[i].ok ? 'ok' : (opts[i] === o ? 'no' : 'dim')); });
      if (o.ok) { score++; sfx('good'); } else sfx('bad');
      board.setArrows(good.arrows || []); if (good.squares && good.squares.length) board.setMarks(Object.fromEntries(good.squares.map((s) => [s, 'hint'])));
      explain(o.ok, `${o.ok ? 'Right. ' : `The plan the position asks for is: ${good.title}. `}${good.text}${good.how ? ' ' + good.how : ''}`, () => { locked = false; board.setArrows([]); board.setMarks({}); stage = 2; drawSteps(); next(); });
    }
  }

  /* 3: the move */
  async function stageMove() {
    locked = false; board.setInteractive(true);
    panel.replaceChildren(h('p', h('b', 'Question 3:'), ' now play your move. It should serve the plan and not hang anything.'), h('div.small.muted', 'The engine will judge it and the coach will say why.'));
  }
  async function userMove(m) {
    if (locked) return; locked = true; board.setInteractive(false);
    const fen = chess.fen();
    const mv = chess.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' }); const uci = uciOf(mv);
    board.setPosition(chess.fen(), { from: m.from, to: m.to });
    panel.replaceChildren(h('div.row', h('span.spinner'), h('span.muted', 'The coach is checking your move…')));
    let j = null;
    try { j = await judgeMove(await ctx.engine(), fen, uci, { depth: 14, movetime: 1500 }); } catch (e) { /* offline engine */ }
    if (!alive) return;
    const ok = !j || ['best', 'excellent', 'good', 'book'].includes(j.cls);
    if (ok) { score++; sfx('good'); } else sfx('bad');
    const bestSan = j ? sanOf(fen, j.best) : mv.san;
    let card = null;
    if (j && !j.isTop) { try { const w = whyMove({ fen, uci: j.best, pv: j.bestPv, lines: j.lines, idx: 0, rootColor: pos.color, viewer: pos.color }); card = whyCard(w, { showLegend: false }); } catch (e) { /* skip */ } }
    const msg = !j ? `You played ${mv.san}.` : j.isTop ? `${mv.san} is the engine's top move.` : ok ? `${mv.san} is a good move. The engine slightly prefers ${bestSan}.` : `${mv.san} is a ${j.cls}. The engine's choice is ${bestSan}.`;
    explain(ok, msg, () => { stage = 3; next(); }, card);
  }

  function explain(ok, text, onNext, extra = null) {
    locked = true;
    const nextBtn = h('button.btn.primary', { type: 'button', onclick: () => { locked = false; onNext(); } }, stage === 2 ? 'Finish round' : 'Next question');
    panel.replaceChildren(h('div.gym-fb', { class: ok ? 'ok' : 'no' }, h('b', ok ? '✓ ' : '✗ '), text), extra, h('div.row.mt', nextBtn));
  }

  function finish() {
    saveRound(); streak = score === 3 ? streak + 1 : 0; drawHead();
    board.setInteractive(false); board.setMarks({}); board.setArrows([]);
    const msg = score === 3 ? 'Perfect round: you found the worst piece, the plan and the move.' : score === 2 ? 'Good round. Review the one you missed, it is the habit to build.' : 'Keep going: the method comes with repetition. Re-read the explanations, then try another.';
    panel.replaceChildren(h('h3', `${score}/3`), h('p', msg), h('div.row', h('button.btn.primary', { type: 'button', onclick: newRound }, 'Next position'), back ? h('a.btn', { href: back }, 'Done') : null));
  }

  drawHead(); newRound();
  return () => { alive = false; if (board) board.destroy(); };
}

function sanOf(fen, uci) { try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch (e) { return uci; } }

// plausible-but-wrong answers; each lists the plan ids it would be right for, so a distractor is never accidentally correct
const GENERIC_PLANS = [
  { ids: ['castle', 'safety', 'king-centre'], text: 'Push the h-pawn and attack the enemy king', why: 'Without castling and safe pieces an attack backfires.' },
  { ids: [], text: 'Trade every piece you can, whatever it is', why: 'Trades must help you: trade your worst piece for their best.' },
  { ids: [], text: 'Move the queen to attack as early as possible', why: 'An early queen attack just loses tempi to developing moves.' },
  { ids: ['worst-piece', 'improve'], text: 'Make a waiting pawn move on the wing', why: 'Pawn moves cannot be taken back; improve a piece first.' },
  { ids: ['passer', 'trade-down', 'king-active'], text: 'Open the position and race for the enemy king', why: 'Only start a race when your pieces are ready.' },
];
