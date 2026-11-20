// Guided practice for endgames and middlegames: the coach demonstrates, then you play against Stockfish
// while the coach scores each move and explains what it was trying to do.
import { Chess } from '../../vendor/chess.js';
import * as store from '../store.js';
import { h, icon, toast } from '../ui.js';
import { Board } from '../board.js';
import { botMove } from '../bot.js';
import { legalTargetsFor, checkSquare, uciOf, engineSafe, gameOverReason } from '../chessutil.js';
import { povWin, CLASSES, classifyLoss, fmtEval, moveAccuracy } from '../evalmath.js';
import { judgeMove } from '../judge.js';
import { makeHint, narrateMove, quickComment } from '../coach.js';
import { play as sfx, playForMove } from '../sound.js';
import { trackPlan } from '../plan.js';
import { classBadge } from '../components.js';
import { playChip, isPhone, revealBelow } from '../playout.js';

export const lessonDone = (track, id) => !!(store.get().lessons[track][id] || {}).done;
function mark(track, id, patch) {
  store.update((s) => { const l = s.lessons[track][id] || (s.lessons[track][id] = { n: 0, ok: 0 }); Object.assign(l, patch(l)); l.last = Date.now(); });
  store.logActivity('lessons');
}

export function guidedLesson(root, ctx, track, lesson, back) {
  const isEnd = track === 'endgames';
  const settings = store.get().settings;
  const side = lesson.side;
  const start = lesson.fen;
  let chess = new Chess(start);
  let alive = true, locked = true, mode = 'watch', over = false, hintLevel = 0;
  let learnerMoves = 0, accSum = 0, bestKnown = null, history = [], hintsUsed = 0, token = 0;
  const board = new Board(h('div'), { orientation: side, coords: settings.coords, legalDots: settings.legalDots, animate: settings.animations, autoQueen: false,
    canSelect: (sq) => !locked && chess.get(sq) && chess.get(sq).color === chess.turn() && chess.turn() === side,
    legalTargets: (sq) => legalTargetsFor(chess, sq), onMove: (m) => userMove(m) });
  const say = h('div'); const stat = h('div.small.muted'); const ctrl = h('div.row');
  const bubble = (t, kind = '') => { if (!t) return; const b = h('div.say', { class: kind }, t); say.prepend(b); while (say.children.length > 5) say.lastChild.remove(); revealBelow(b); };
  const sel = h('div.seg', [['watch', 'Watch'], ['practice', 'Practice']].map(([k, l]) => h('button', { class: k === mode ? 'active' : '', onclick: () => setMode(k) }, l)));
  const intro = h('div.card', h('div.row.nowrapr', h('div.course-icon', lesson.icon), h('div.grow', h('h3', { style: { margin: 0 } }, lesson.name), h('div.small.muted', lesson.summary))),
    h('details.coach-more.ideas', { open: !isPhone() }, h('summary', isEnd ? 'Key ideas' : 'The plan'), h('ul', (lesson.ideas || lesson.plan).map((x) => h('li', x)))));
  document.body.classList.add('in-learn');
  root.replaceChildren(h('div.row.between.learn-top', h('button.back', { onclick: () => { alive = false; back(); } }, icon('left', 16), isEnd ? 'Endgames' : 'Middlegames'), sel),
    h('div.game-layout.learn-layout', h('div.board-col', h('div.board-box', board.el), stat), h('div.side-col', ...(isPhone() ? [h('div.card', say), intro] : [intro, h('div.card', say)]), h('div.learn-actions', ctrl))));

  const show = (mv, anim = true) => board.setPosition(chess.fen(), { lastMove: mv ? { from: mv.from, to: mv.to } : null, animate: anim && mv ? [{ from: mv.from, to: mv.to }] : false, check: checkSquare(chess) });
  const goalText = () => isEnd ? (lesson.goal === 'win' ? 'Goal: win this position.' : `Goal: hold the draw for ${lesson.holdMoves} moves.`) : `Play ${lesson.moves} accurate moves following the plan.`;

  async function bestOf(fen, depth = 13) { const e = await ctx.engine(); if (!engineSafe(fen)) return null; const r = await e.go({ fen, depth, multipv: 1 }); return r.lines[0] ? { uci: r.lines[0].pv[0], white: r.lines[0].white, pv: r.lines[0].pv } : null; }
  const povOf = (white, color) => povWin(white, color);

  function setMode(m) {
    token++; mode = m; sel.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', ['watch', 'practice'][i] === m));
    reset(); say.replaceChildren();
    if (m === 'watch') watch(); else practice();
  }
  function reset() { chess = new Chess(start); over = false; learnerMoves = 0; accSum = 0; hintLevel = 0; hintsUsed = 0; bestKnown = null; history = []; locked = true; board.clearOverlays(); show(null, false); board.setInteractive(false); }

  /* ----- WATCH: engine plays both sides, coach narrates ----- */
  function watch() {
    const my = token; let auto = false, running = false, step = 0;
    const next = h('button.btn.primary.grow', { onclick: () => doStep() }, 'Next move', icon('right', 18));
    const autoBtn = h('button.btn', { onclick: () => { auto = !auto; autoBtn.classList.toggle('primary', auto); if (auto) loop(); } }, icon('play', 16), 'Auto');
    ctrl.replaceChildren(next, autoBtn, h('button.btn', { onclick: () => setMode('practice') }, 'Your turn'), h('button.btn', { onclick: () => setMode('watch') }, icon('repeat', 16)));
    stat.textContent = 'The coach plays both sides with perfect play.';
    bubble(`${goalText()} Watch how the stronger side makes progress — then you'll do it yourself.`);
    async function doStep() {
      if (running || over || my !== token || !alive) return;
      running = true; next.disabled = true;
      try {
        const side2move = chess.turn();
        let uci;
        const b = await bestOf(chess.fen(), 14);
        if (!b || !alive || my !== token) return;
        uci = b.uci;
        const note = narrateMove(chess.fen(), uci);
        const mv = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
        playForMove(mv, chess.inCheck()); show(mv);
        const learnerSide = side2move === side;
        bubble(`${learnerSide ? (isEnd ? 'Stronger side' : 'You') : 'Defender'}: ${note}  (${fmtEval(b.white)})`, learnerSide ? 'good' : '');
        step++;
        const r = gameOverReason(chess);
        if (r) { over = true; bubble(chess.isCheckmate() ? 'Checkmate! That is the technique.' : `The game ends in a draw (${r}).`, 'good'); mark(track, lesson.id, (l) => ({ watched: true })); }
        else if (step >= (isEnd ? 40 : 16)) { over = true; bubble('That is enough to see the pattern. Now try it yourself!'); mark(track, lesson.id, () => ({ watched: true })); }
      } finally { running = false; next.disabled = over; if (auto && !over && alive && my === token) setTimeout(loop, 1100); }
    }
    function loop() { if (auto && !over && alive && my === token && !running) doStep(); }
  }

  /* ----- PRACTICE ----- */
  function practice() {
    const hintBtn = h('button.btn', { onclick: () => hint() }, icon('bulb', 16), 'Hint');
    ctrl.replaceChildren(hintBtn, h('button.btn', { onclick: () => takeback() }, icon('undo', 16), 'Takeback'), h('button.btn', { onclick: () => setMode('practice') }, icon('repeat', 16), 'Restart'), h('button.btn', { onclick: () => setMode('watch') }, icon('eye', 16), 'Watch again'));
    bubble(`${goalText()} I'll score each of your moves and explain.`);
    nextTurn();
  }
  async function nextTurn() {
    if (!alive || over) return;
    const my = token;
    updateStat();
    if (chess.turn() === side) {
      locked = true; hintLevel = 0;
      const b = await bestOf(chess.fen()); if (my !== token || !alive) return;
      bestKnown = b; locked = false; board.setInteractive(true);
    } else {
      locked = true; board.setInteractive(false);
      try {
        const e = await ctx.engine(); if (my !== token || !alive) return;
        const r = await botMove(e, chess.fen(), isEnd ? 10 : 8, { clock: { ms: 4000, inc: 0 } });
        if (my !== token || !alive) return;
        await new Promise((res) => setTimeout(res, 450)); if (my !== token || !alive) return;
        const mv = chess.move({ from: r.uci.slice(0, 2), to: r.uci.slice(2, 4), promotion: r.uci[4] });
        history.push(mv.san); playForMove(mv, chess.inCheck()); show(mv);
        if (checkOver()) return;
      } catch (er) { console.warn(er); }
      nextTurn();
    }
  }
  function updateStat() {
    stat.textContent = isEnd ? (lesson.goal === 'draw' ? `Moves held: ${learnerMoves}/${lesson.holdMoves}` : `Moves: ${learnerMoves}`) : `Move ${Math.min(learnerMoves + 1, lesson.moves)} of ${lesson.moves}`;
  }
  async function userMove(m) {
    if (locked || over || chess.turn() !== side) return false;
    const before = bestKnown; const fenBefore = chess.fen();
    let mv; try { mv = chess.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch (e) { return false; }
    if (!mv) return false;
    locked = true; board.clearOverlays(); history.push(mv.san); playForMove(mv, chess.inCheck()); show(mv, false);
    learnerMoves++;
    const my = token;
    // evaluate the played move against the best move
    let cls = 'good', loss = 0, afterEval = null, bestUci = before ? before.uci : null;
    try {
      afterEval = gameOverReason(chess) ? null : await bestOf(chess.fen(), 12);
      if (my !== token || !alive) return true;
      if (chess.isCheckmate()) { cls = 'best'; loss = 0; }
      else if (engineSafe(fenBefore)) {
        // same-search comparison (see judge.js): the played move and the best move are valued in one search
        const j = await judgeMove(await ctx.engine(), fenBefore, uciOf(mv), { depth: 12, movetime: 900 });
        if (my !== token || !alive) return true;
        cls = j.cls; loss = j.loss; bestUci = j.best;
      }
    } catch (er) { /* ignore */ }
    accSum += moveAccuracy(loss);
    const best = bestUci && bestUci !== uciOf(mv) ? new Chess(fenBefore).move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci[4] }).san : null;
    const talk = h('div', h('div.row.tight', classBadge(cls), h('b', mv.san)), h('div.small', cls === 'best' || cls === 'excellent' ? (quickComment(fenBefore, uciOf(mv)) || 'Exactly the right idea.') : cls === 'good' ? 'Fine, but there was something sharper.' : 'That lets the position slip.'), best && loss > 2 ? h('div.small.muted', `The engine preferred ${best}.`) : null,
      best && bestUci && loss > 5 ? h('div.row.tight.mt-s', playChip(`Try ${best} instead`, () => tryInstead(fenBefore, bestUci, moveAccuracy(loss)), 'undo')) : null);
    bubble(talk, loss <= 5 ? 'good' : 'bad');
    sfx(loss <= 5 ? 'good' : 'bad');
    if (loss > 12 && best && bestUci) board.setArrows([{ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), color: '#5fc88f', opacity: 0.8 }]);
    if (checkOver(afterEval)) return true;
    nextTurn();
    return true;
  }
  function takeback() {
    if (over || locked && chess.turn() !== side) return;
    token++; const n = chess.turn() === side ? 2 : 1;
    for (let i = 0; i < n; i++) { if (chess.history().length) { const u = chess.undo(); if (u && u.color === side) learnerMoves = Math.max(0, learnerMoves - 1); } }
    if (chess.history().length === 0 && chess.turn() !== side) { /* learner is to move at start */ }
    board.clearOverlays(); show(null, false); bubble('Takeback — try a different idea.'); nextTurn();
  }
  function hint() {
    if (locked || over || !bestKnown) return;
    hintLevel++; hintsUsed++;
    const hh = makeHint(chess.fen(), bestKnown.uci, Math.min(3, hintLevel));
    board.setHint([hh.from, hintLevel >= 3 ? hh.to : null].filter(Boolean));
    if (hintLevel >= 3) board.setArrows([{ from: hh.from, to: hh.to, color: '#62b8ff', opacity: 0.85 }]);
    let chip = null;
    if (hintLevel >= 3) { try { const m = new Chess(chess.fen()).move({ from: hh.from, to: hh.to, promotion: bestKnown.uci[4] }); chip = h('div.row.tight.mt-s', playChip(`Play ${m.san}`, () => playHint(bestKnown.uci, chess.fen()))); } catch (e) { /* ignore */ } }
    bubble(hintLevel === 1 ? lesson.hint || 'Look for the move that improves your position the most.' : chip ? h('div', hh.text, chip) : hh.text);
  }
  /** Play the hinted move for the learner (counts as a hint, so the lesson is not "clean"). */
  function playHint(uci, fen) {
    if (locked || over || chess.turn() !== side || chess.fen() !== fen) { toast('That suggestion was for an earlier position'); return; }
    board.setArrows([]); board.setHint([]);
    userMove({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  }
  /** Rewind to the position before the learner's last move and play the engine's preferred move instead. */
  function tryInstead(fen, uci, accGain) {
    if (over || !alive) return;
    token++;
    let guard = 0;
    while (chess.fen() !== fen && chess.history().length && guard++ < 8) { const u = chess.undo(); if (u && u.color === side) learnerMoves = Math.max(0, learnerMoves - 1); }
    if (chess.fen() !== fen) return;
    accSum = Math.max(0, accSum - (accGain || 0)); hintsUsed++;
    board.clearOverlays(); show(null, false);
    bestKnown = { uci, white: null, pv: [uci] };
    locked = false; board.setInteractive(true);
    bubble('Rewound — here is the engine\'s idea.');
    userMove({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  }

  function checkOver(afterEval) {
    const reason = gameOverReason(chess);
    let result = null; // 'win' | 'draw' | 'lose'
    const lastPov = afterEval ? povOf(afterEval.white, side) : null;
    if (reason) {
      if (chess.isCheckmate()) result = chess.turn() === side ? 'lose' : 'win'; else result = 'draw';
    } else if (isEnd && lesson.goal === 'win') {
      const promoted = chess.history({ verbose: true }).some((m) => m.color === side && m.promotion);
      if (promoted && lastPov != null && lastPov >= 90) result = 'win';
      else if (learnerMoves >= 60) result = 'lose';
      else if (lastPov != null && lastPov < 30) result = 'lose';
    } else if (isEnd && lesson.goal === 'draw') {
      if (lastPov != null && lastPov < 15) result = 'lose';
      else if (learnerMoves >= lesson.holdMoves) result = 'win';
    } else if (!isEnd) {
      if (learnerMoves >= lesson.moves) result = 'win';
    }
    if (!result) return false;
    over = true; locked = true; token++; board.setInteractive(false);
    finish(result, reason);
    return true;
  }
  function finish(result, reason) {
    const acc = learnerMoves ? accSum / learnerMoves : 0;
    const clean = result === 'win' && acc >= (isEnd ? 80 : 75) && hintsUsed === 0;
    if (result === 'win') { sfx('win'); mark(track, lesson.id, (l) => ({ n: (l.n || 0) + 1, ok: (l.ok || 0) + (clean ? 1 : 0), done: true, best: Math.max(l.best || 0, Math.round(acc)) })); trackPlan({ kind: 'lesson', track, id: lesson.id }); }
    else { sfx('end'); mark(track, lesson.id, (l) => ({ n: (l.n || 0) + 1 })); }
    const msg = result === 'win'
      ? (isEnd ? (lesson.goal === 'draw' ? `You held the draw! That defensive technique is exactly what the engine would show.` : chess.isCheckmate() ? 'Checkmate — well done!' : 'The win is secure: your pawn promoted with a decisive advantage.') : `Plan completed with ${Math.round(acc)}% accuracy.`)
      : result === 'draw' ? `The position was drawn (${reason}). ${lesson.goal === 'win' ? 'Review the key ideas and try again.' : 'That counts as holding!'}` : `The position got away from you. ${lesson.goal === 'draw' ? 'Re-read the key ideas about opposition and hold again.' : 'Watch the coach\'s solution and then try again.'}`;
    bubble(h('div', h('b', result === 'win' ? '🎉 Lesson complete' : 'Not this time'), h('div', msg), h('div.small.muted.mt', `Accuracy ${Math.round(acc)}%${hintsUsed ? ` · ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''}` : ''}`)), result === 'win' ? 'good' : 'bad');
    ctrl.replaceChildren(h('button.btn.primary', { onclick: () => setMode('practice') }, icon('repeat', 16), 'Try again'), h('button.btn', { onclick: () => setMode('watch') }, 'Watch the coach'), h('button.btn', { onclick: () => { alive = false; back(); } }, 'More lessons'));
  }

  reset(); watch();
  return () => { alive = false; token++; document.body.classList.remove('in-learn'); board.destroy(); };
}
