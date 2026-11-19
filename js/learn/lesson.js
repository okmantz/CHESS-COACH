// Interactive lesson player. A lesson is a list of steps; the coach explains, demonstrates and then asks the learner
// to DO something on the board (play a move, tap squares, answer a question) before moving on.
//
// Step kinds (see js/data/basics.js and js/data/tactics.js for the authoring helpers):
//   say      explain with a position, arrows and highlights (optionally animate a few moves)
//   move     the learner must play a move (or a whole forcing line); wrong moves get a specific explanation
//   squares  tap every square a piece can reach / attack
//   tap      tap one named square
//   quiz     multiple choice
//   sandbox  free play on the board
//   puzzles  N engine-verified puzzles on a theme, drawn from the puzzle bank
import { Chess } from '../../vendor/chess.js';
import * as store from '../store.js';
import { h, icon, toast, progress } from '../ui.js';
import { Board } from '../board.js';
import { legalTargetsFor, checkSquare, uciOf } from '../chessutil.js';
import { play as sfx, playForMove } from '../sound.js';
import { PUZZLES } from '../data/puzzles.js';
import { moveFeatures } from '../themes.js';
import { describeMove } from '../coach.js';
import { moveInsight, narrateInsight } from '../insight.js';
import { trackPlan } from '../plan.js';

const COLORS = { g: '#5fc88f', r: '#ef6b6b', b: '#62b8ff', y: '#f2b84b' };
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const lessonState = (track, id) => (store.get().lessons[track] || {})[id] || {};
export const lessonDone = (track, id) => !!lessonState(track, id).done;
function mark(track, id, patch) {
  store.update((s) => { s.lessons[track] = s.lessons[track] || {}; const l = s.lessons[track][id] || (s.lessons[track][id] = { n: 0, ok: 0 }); Object.assign(l, patch(l)); l.last = Date.now(); });
}

/** **bold** and line breaks -> DOM. */
export function rich(text) {
  const paras = Array.isArray(text) ? text : String(text || '').split('\n');
  return paras.filter((p) => p !== '').map((p) => {
    const parts = String(p).split(/(\*\*[^*]+\*\*)/g).map((x) => (x.startsWith('**') ? h('b', x.slice(2, -2)) : x));
    return h('p', parts);
  });
}

const clean = (s) => String(s).replace(/[+#!?x=]/g, '').replace(/\s/g, '');
function matches(mv, spec) {
  if (!spec) return false;
  const u = mv.from + mv.to + (mv.promotion || '');
  return spec === u || clean(spec) === clean(mv.san) || (spec.length === 4 && spec === mv.from + mv.to);
}
function arrowsOf(list) {
  return (list || []).map((a) => {
    const [mv, c] = String(a).split(':');
    return { from: mv.slice(0, 2), to: mv.slice(2, 4), color: COLORS[c] || COLORS.g, opacity: 0.9 };
  });
}
function marksOf(step) {
  const m = {};
  (step.hl || []).forEach((s) => { m[s] = 'info'; });
  Object.assign(m, step.marks || {});
  return m;
}

/** Squares to be tapped in a `squares` step. */
export function squaresFor(fen, piece, mode = 'moves') {
  const ch = new Chess(fen);
  const p = ch.get(piece);
  if (!p) return [];
  if (mode === 'attacks') {
    const out = [];
    for (const f of 'abcdefgh') for (let r = 1; r <= 8; r++) { const s = f + r; if (s !== piece && ch.attackers(s, p.color).includes(piece)) out.push(s); }
    return out;
  }
  return [...new Set(ch.moves({ square: piece, verbose: true }).map((m) => m.to))];
}

/** Turn `puzzles` steps into concrete `move` steps using the puzzle bank. */
function expand(lesson) {
  const out = [];
  for (const st of lesson.steps) {
    if (st.t !== 'puzzles') { out.push(st); continue; }
    const pool = PUZZLES.filter((p) => p.t.includes(st.theme) && (!st.maxMoves || p.m.length <= st.maxMoves)).sort((a, b) => a.r - b.r).slice(0, Math.max(12, st.n * 4));
    const picks = []; const bag = pool.slice();
    while (picks.length < (st.n || 3) && bag.length) picks.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
    picks.forEach((p, i) => {
      const side = new Chess(p.f).turn();
      out.push({ t: 'move', puzzle: true, fen: p.f, side, ask: `${st.title || 'Practice'} ${i + 1} of ${picks.length}: ${side === 'w' ? 'White' : 'Black'} to move. ${st.ask || 'Find the best move.'}`, line: p.m, mateAny: p.t.includes('mate') });
    });
  }
  return out;
}

/**
 * @param root   container element
 * @param opts   { track, lesson, back(), backLabel, nextLesson?:{id,name,href} }
 * @returns teardown function
 */
export function lessonPlayer(root, ctx, { track, lesson, back, backLabel = 'Learn', nextLesson = null }) {
  const settings = store.get().settings;
  const steps = expand(lesson);
  const saved = lessonState(track, lesson.id);
  let idx = 0, alive = true, chess = new Chess(lesson.fen || START), side = lesson.side || 'w';
  const solved = new Set();
  let timers = [];
  let stepToken = 0;
  let wrongCount = 0, assisted = false, linePos = 0, lineSteps = null, picked = new Set();

  const board = new Board(h('div'), {
    orientation: side, coords: settings.coords, legalDots: settings.legalDots, animate: settings.animations, autoQueen: true, interactive: false,
    canSelect: (sq) => { const p = chess.get(sq); return !!p && p.color === chess.turn(); },
    legalTargets: (sq) => legalTargetsFor(chess, sq),
    onMove: (m) => onUserMove(m),
  });
  const later = (fn, ms) => { const t = setTimeout(() => { if (alive) fn(); }, ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* ---------------- chrome ---------------- */
  const stepTag = h('span.tag.accent');
  const bar = progress(0, { height: 6 });
  const titleEl = h('div.lesson-title');
  const coachBox = h('div.lesson-say');
  const taskBox = h('div.lesson-task');
  const feedback = h('div.lesson-feedback');
  const btnBack = h('button.btn', { onclick: () => go(idx - 1) }, icon('left', 18), 'Back');
  const btnHint = h('button.btn', { onclick: () => hintNow() }, icon('bulb', 16), 'Hint');
  const btnShow = h('button.btn', { onclick: () => showAnswer() }, icon('eye', 16), 'Show me');
  const btnCheck = h('button.btn.primary', { onclick: () => checkSquares() }, icon('check', 16), 'Check');
  const btnReset = h('button.btn', { onclick: () => resetSandbox() }, icon('repeat', 16), 'Reset');
  const btnNext = h('button.btn.primary.grow', { onclick: () => go(idx + 1) }, 'Continue', icon('right', 18));
  const tools = h('div.row');
  const dots = h('div.step-dots');

  const intro = h('div.card.lesson-head', h('div.row.nowrapr', h('div.course-icon', lesson.icon || '♞'), h('div.grow', h('h2', { style: { margin: 0 } }, lesson.name), h('div.small.muted', lesson.summary || '')), stepTag), h('div', { style: { height: '10px' } }), bar);
  root.replaceChildren(
    h('div.row.between', h('button.back', { onclick: () => { alive = false; back(); } }, icon('left', 16), backLabel)),
    h('div.game-layout', h('div.board-col', h('div.board-box', board.el), dots),
      h('div.side-col', intro, h('div.card.lesson-card', titleEl, coachBox, taskBox, feedback, tools, h('div.row.mt', btnBack, btnNext)))));

  function updateChrome() {
    stepTag.textContent = `${Math.min(idx + 1, steps.length)} / ${steps.length}`;
    bar.firstChild.style.width = (solved.size / steps.length) * 100 + '%';
    dots.replaceChildren(...steps.map((s, i) => h('i', { class: (i === idx ? 'on ' : '') + (solved.has(i) ? 'done' : ''), onclick: () => { if (solved.has(i) || i <= idx) go(i); } })));
    btnBack.disabled = idx === 0;
    const last = idx >= steps.length - 1;
    btnNext.replaceChildren(last ? 'Finish lesson' : 'Continue', icon(last ? 'check' : 'right', 18));
    btnNext.disabled = !(solved.has(idx) || steps[idx].t === 'say' || steps[idx].t === 'sandbox');
  }

  function say(text, kind = '') { feedback.replaceChildren(h('div.say', { class: kind }, ...(typeof text === 'string' ? rich(text) : [text]))); }
  const setBoard = (fen, o = {}) => { board.setPosition(fen, { lastMove: o.lastMove || null, animate: o.animate || false, check: checkSquare(chess) }); };
  const orient = (s) => { if (s && s !== board.orientation) board.flip(s); };

  function loadFen(fen, st) {
    chess = new Chess(fen || chess.fen());
    orient(st.side || lesson.side || 'w');
    board.clearOverlays();
    setBoard(chess.fen());
    board.setArrows(arrowsOf(st.arrows));
    board.setMarks(marksOf(st));
  }

  /* ---------------- step runner ---------------- */
  function go(i) {
    if (i < 0) return;
    if (i >= steps.length) return finish();
    clearTimers(); stepToken++;
    idx = i; wrongCount = 0; assisted = false; linePos = 0; picked = new Set();
    board.setSquareMode(null); board.setInteractive(false);
    feedback.replaceChildren(); taskBox.replaceChildren(); coachBox.replaceChildren(); tools.replaceChildren();
    const st = steps[idx];
    titleEl.textContent = st.title || '';
    titleEl.classList.toggle('hidden', !st.title);
    if (st.text) coachBox.replaceChildren(h('div.coach-line', h('div.coach-avatar', icon('sparkle', 18)), h('div.coach-text', ...rich(st.text))));
    if (st.t !== 'say' || st.fen) loadFen(st.fen || (st.t === 'say' ? chess.fen() : undefined), st); else { board.setArrows(arrowsOf(st.arrows)); board.setMarks(marksOf(st)); }
    if (st.t === 'say') runSay(st);
    else if (st.t === 'move') runMove(st);
    else if (st.t === 'squares') runSquares(st);
    else if (st.t === 'tap') runTap(st);
    else if (st.t === 'quiz') runQuiz(st);
    else if (st.t === 'sandbox') runSandbox(st);
    updateChrome();
    if (idx > saved.step) mark(track, lesson.id, () => ({ step: idx }));
  }

  function complete(extra) {
    solved.add(idx); sfx('good'); updateChrome();
    if (extra) say(extra, 'good');
  }

  function runSay(st) {
    solved.add(idx);
    if (st.play && st.play.length) {
      // demonstration: play the listed moves one after another
      const c = chess; let k = 0;
      const stepOne = () => {
        if (k >= st.play.length) return;
        let mv; try { mv = c.move(st.play[k]); } catch (e) { return; }
        playForMove(mv, c.inCheck());
        board.setPosition(c.fen(), { lastMove: { from: mv.from, to: mv.to }, animate: [{ from: mv.from, to: mv.to }], check: checkSquare(c) });
        board.setArrows([]); board.setMarks({});
        k++; later(stepOne, st.delay || 900);
      };
      tools.replaceChildren(h('button.btn', { onclick: () => { clearTimers(); chess = new Chess(st.fen || chess.fen()); orient(st.side || lesson.side || 'w'); setBoard(chess.fen()); board.setArrows(arrowsOf(st.arrows)); board.setMarks(marksOf(st)); later(stepOne, 400); } }, icon('repeat', 16), 'Replay'));
      later(stepOne, 700);
    }
    if (st.insight) { try { const ins = moveInsight(chess.fen(), st.insight); if (ins) say(narrateInsight(ins, { max: 3 }).join(' ')); } catch (e) { /* ignore */ } }
    if (st.cta) tools.append(h('a.btn.primary', { href: st.cta.href }, st.cta.label));
  }

  /* ----- move ----- */
  function lineList(st) { return st.line ? st.line : [(st.answer && st.answer[0]) || null]; }
  function runMove(st) {
    lineSteps = lineList(st);
    taskBox.replaceChildren(h('div.task-ask', icon('target', 18), h('span', st.ask || 'Your move.')));
    tools.replaceChildren(btnHint, btnShow);
    board.setInteractive(true);
    if (st.fen) board.setMarks(marksOf(st));
  }
  function acceptable(st, mv) {
    if (linePos === 0 && st.answer && st.answer.length) return st.answer.some((a) => matches(mv, a));
    const want = lineSteps[linePos];
    if (st.mateAny) { const t = new Chess(chess.fen()); t.move(mv.san); if (t.isCheckmate()) return true; }
    if (st.mateIn1 && linePos === 0) { const t = new Chess(chess.fen()); t.move(mv.san); if (t.isCheckmate()) return true; }
    return matches(mv, want);
  }
  function onUserMove(m) {
    const st = steps[idx];
    if (st.t === 'sandbox') return sandboxMove(m);
    if (st.t !== 'move' || solved.has(idx) && !st.again) return false;
    let mv;
    const probe = new Chess(chess.fen());
    try { mv = probe.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch (e) { return false; }
    if (!mv) return false;
    if (acceptable(st, mv)) {
      chess.move({ from: m.from, to: m.to, promotion: m.promotion });
      playForMove(mv, chess.inCheck());
      board.clearOverlays();
      board.setPosition(chess.fen(), { lastMove: { from: mv.from, to: mv.to }, animate: false, check: checkSquare(chess) });
      const wasFirst = linePos === 0;
      linePos++;
      const rightText = wasFirst && st.right ? st.right : '';
      if (linePos >= lineSteps.length || chess.isGameOver()) {
        let msg = rightText;
        if (!msg) { try { msg = `${mv.san} — it ${describeMove(moveFeatures(probe.fen() && st.fen ? new Chess(st.fen).fen() : probe.fen(), mv.from + mv.to + (mv.promotion || '')), mv.san) || 'is the right idea'}.`; } catch (e) { msg = `${mv.san} is the move.`; } }
        complete(`✓ ${msg}${st.after ? '\n' + st.after : ''}`);
        return true;
      }
      // the opponent replies automatically, then the learner continues
      board.setInteractive(false);
      say(rightText ? `✓ ${rightText}` : `✓ ${mv.san}. Now watch the reply…`, 'good');
      later(() => {
        const reply = lineSteps[linePos];
        let rm; try { rm = chess.move(typeof reply === 'string' && reply.length >= 4 && /^[a-h][1-8][a-h][1-8]/.test(reply) ? { from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] } : reply); } catch (e) { rm = null; }
        if (!rm) { complete('✓ Well played.'); return; }
        playForMove(rm, chess.inCheck());
        board.setPosition(chess.fen(), { lastMove: { from: rm.from, to: rm.to }, animate: [{ from: rm.from, to: rm.to }], check: checkSquare(chess) });
        linePos++;
        if (linePos >= lineSteps.length || chess.isGameOver()) { complete('✓ Done.'); return; }
        board.setInteractive(true);
        say(`Opponent played ${rm.san}. Your move again.`);
      }, 600);
      return true;
    }
    // wrong move
    wrongCount++; sfx('bad'); board.shake();
    const key = clean(mv.san);
    const custom = st.wrong && (st.wrong[mv.san] || st.wrong[key] || st.wrong[mv.from + mv.to]);
    let msg = custom || `${mv.san} is not the move I am looking for.`;
    if (!custom) {
      // say something true about the move they chose
      try {
        const f = moveFeatures(chess.fen(), mv.from + mv.to + (mv.promotion || ''));
        const t = new Chess(chess.fen()); t.move(mv.san);
        const loose = t.attackers(mv.to, t.turn()).length > 0 && t.attackers(mv.to, t.turn() === 'w' ? 'b' : 'w').filter((x) => x !== mv.to).length === 0;
        if (loose && f && !f.themes.includes('check')) msg += ` Notice the ${mv.piece === 'n' ? 'knight' : 'piece'} could simply be captured there.`;
      } catch (e) { /* ignore */ }
      msg += ' Think again about the idea of this lesson.';
    }
    say(msg, 'bad');
    board.setPosition(chess.fen(), { animate: false, check: checkSquare(chess) });
    board.setMarks({ [mv.to]: 'bad' });
    setTimeout(() => { if (alive) board.setMarks(marksOf(st)); }, 900);
    if (wrongCount === 2) hintNow();
    if (wrongCount >= 4) showAnswer();
    return false;
  }
  function hintNow() {
    const st = steps[idx];
    if (st.t === 'quiz') return;
    const want = st.t === 'move' ? lineSteps[linePos] || (st.answer && st.answer[0]) : null;
    assisted = true;
    if (st.hint && wrongCount < 3) { say(`💡 ${st.hint}`); }
    if (want) {
      try {
        const t = new Chess(chess.fen());
        const mv = t.move(/^[a-h][1-8][a-h][1-8]/.test(want) ? { from: want.slice(0, 2), to: want.slice(2, 4), promotion: want[4] } : want);
        board.setHint([mv.from]);
        if (!st.hint) say(`💡 Look at the highlighted ${({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' })[mv.piece]}.`);
      } catch (e) { /* ignore */ }
    }
  }
  function showAnswer() {
    const st = steps[idx];
    assisted = true;
    if (st.t === 'move') {
      const want = lineSteps[linePos] || (st.answer && st.answer[0]);
      try {
        const t = new Chess(chess.fen());
        const mv = t.move(/^[a-h][1-8][a-h][1-8]/.test(want) ? { from: want.slice(0, 2), to: want.slice(2, 4), promotion: want[4] } : want);
        board.setArrows([{ from: mv.from, to: mv.to, color: COLORS.g, opacity: 0.95 }]);
        say(`The move is **${mv.san}**. Play it on the board to continue.`);
      } catch (e) { /* ignore */ }
    } else if (st.t === 'squares' || st.t === 'tap') {
      const ans = answerSquares(st);
      const m = {}; ans.forEach((s) => { m[s] = 'good'; });
      board.setMarks(m); picked = new Set(ans);
      say(`Here they are — ${ans.length} square${ans.length === 1 ? '' : 's'} highlighted. Study the pattern, then press Continue.`);
      solved.add(idx); updateChrome();
    }
  }

  /* ----- squares / tap ----- */
  function answerSquares(st) {
    if (st.answer) return Array.isArray(st.answer) ? st.answer : [st.answer];
    return squaresFor(st.fen || chess.fen(), st.piece, st.mode || 'moves');
  }
  function paintPicked() { const m = marksOf(steps[idx]); picked.forEach((s) => { m[s] = 'info'; }); board.setMarks(m); }
  function runSquares(st) {
    taskBox.replaceChildren(h('div.task-ask', icon('target', 18), h('span', st.ask || 'Tap every square this piece can move to.')));
    tools.replaceChildren(btnCheck, btnHint, btnShow);
    if (st.piece) board.setMarks({ ...marksOf(st), [st.piece]: 'warn' });
    board.setSquareMode((sq) => {
      if (solved.has(idx)) return;
      if (picked.has(sq)) picked.delete(sq); else picked.add(sq);
      paintPicked(); if (st.piece) { const m = marksOf(st); picked.forEach((s) => { m[s] = 'info'; }); m[st.piece] = 'warn'; board.setMarks(m); }
      sfx('move');
    });
  }
  function checkSquares() {
    const st = steps[idx];
    if (st.t !== 'squares') return;
    const ans = new Set(answerSquares(st));
    const missing = [...ans].filter((s) => !picked.has(s));
    const wrong = [...picked].filter((s) => !ans.has(s));
    if (!missing.length && !wrong.length) {
      const m = {}; ans.forEach((s) => { m[s] = 'good'; }); if (st.piece) m[st.piece] = 'warn';
      board.setMarks(m); board.setSquareMode(null);
      complete(`✓ ${st.right || 'Exactly right!'}`);
      return;
    }
    sfx('bad'); wrongCount++;
    const m = {}; wrong.forEach((s) => { m[s] = 'bad'; }); picked.forEach((s) => { if (ans.has(s)) m[s] = 'good'; }); if (st.piece) m[st.piece] = 'warn';
    board.setMarks(m);
    say(`${wrong.length ? `${wrong.length} square${wrong.length === 1 ? ' is' : 's are'} not reachable (red). ` : ''}${missing.length ? `You still need ${missing.length} more.` : ''}${st.hint && wrongCount >= 2 ? ' 💡 ' + st.hint : ''}`, 'bad');
    setTimeout(() => { if (!alive) return; wrong.forEach((s) => picked.delete(s)); const mm = {}; picked.forEach((s) => { mm[s] = 'info'; }); if (st.piece) mm[st.piece] = 'warn'; board.setMarks(mm); }, 1100);
  }
  function runTap(st) {
    taskBox.replaceChildren(h('div.task-ask', icon('target', 18), h('span', st.ask)));
    tools.replaceChildren(btnShow);
    const ans = answerSquares(st);
    board.setSquareMode((sq) => {
      if (solved.has(idx)) return;
      if (ans.includes(sq)) { board.setMarks({ [sq]: 'good' }); board.setSquareMode(null); complete(`✓ ${st.right || `Yes, ${sq}.`}`); }
      else { sfx('bad'); wrongCount++; board.setMarks({ [sq]: 'bad' }); say(st.wrong && st.wrong[sq] ? st.wrong[sq] : `That is ${sq}. ${st.hint || 'Try again.'}`, 'bad'); setTimeout(() => { if (alive && !solved.has(idx)) board.setMarks({}); }, 800); if (wrongCount >= 3) showAnswer(); }
    });
  }

  /* ----- quiz ----- */
  function runQuiz(st) {
    taskBox.replaceChildren(h('div.task-ask', icon('target', 18), h('span', st.ask)),
      h('div.quiz-opts', st.options.map((o, i) => h('button.quiz-opt', { onclick: (e) => answer(i, e.currentTarget) }, o))));
    const answer = (i, btn) => {
      if (solved.has(idx)) return;
      if (i === st.correct) { btn.classList.add('right'); complete(`✓ ${st.why || 'Correct!'}`); }
      else { btn.classList.add('wrong'); btn.disabled = true; sfx('bad'); wrongCount++; say(st.wrongWhy && st.wrongWhy[i] ? st.wrongWhy[i] : 'Not quite — read the options again.', 'bad'); }
    };
  }

  /* ----- sandbox ----- */
  function runSandbox(st) {
    taskBox.replaceChildren(h('div.task-ask', icon('target', 18), h('span', st.ask || 'Move the pieces around and get a feel for them.')));
    tools.replaceChildren(btnReset);
    board.setInteractive(true);
    solved.add(idx);
    if (st.goal) say(st.goal);
  }
  function sandboxMove(m) {
    let mv; try { mv = chess.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch (e) { return false; }
    if (!mv) return false;
    playForMove(mv, chess.inCheck());
    board.setPosition(chess.fen(), { lastMove: { from: mv.from, to: mv.to }, animate: false, check: checkSquare(chess) });
    if (chess.isCheckmate()) say('Checkmate!', 'good');
    else if (chess.isStalemate()) say('Stalemate — a draw!', 'good');
    else if (chess.inCheck()) say('Check!', 'bad');
    else feedback.replaceChildren();
    return true;
  }
  function resetSandbox() { const st = steps[idx]; chess = new Chess(st.fen || START); setBoard(chess.fen()); feedback.replaceChildren(); }

  /* ---------------- finish ---------------- */
  function finish() {
    clearTimers(); board.setInteractive(false); board.setSquareMode(null);
    const first = !saved.done;
    mark(track, lesson.id, (l) => ({ done: true, n: (l.n || 0) + 1, step: steps.length }));
    store.logActivity('lessons'); trackPlan({ kind: 'lesson', track, id: lesson.id });
    sfx('win');
    ctx.refreshChrome && ctx.refreshChrome();
    coachBox.replaceChildren(); taskBox.replaceChildren(); tools.replaceChildren(); titleEl.textContent = '';
    feedback.replaceChildren(h('div.lesson-done',
      h('div.big-emoji', '🎓'), h('h2', first ? 'Lesson complete!' : 'Lesson complete — nice review'),
      lesson.takeaways ? h('div.coach-sec', h('h4', 'What you learned'), h('ul', lesson.takeaways.map((t) => h('li', t)))) : null,
      h('div.row.mt',
        nextLesson ? h('a.btn.primary', { href: nextLesson.href }, `Next: ${nextLesson.name}`, icon('right', 16)) : null,
        lesson.practice ? h('a.btn', { href: lesson.practice.href }, lesson.practice.label) : null,
        h('button.btn', { onclick: () => go(0) }, icon('repeat', 16), 'Review lesson'),
        h('button.btn.ghost', { onclick: () => { alive = false; back(); } }, `Back to ${backLabel}`))));
    btnNext.disabled = true; btnBack.disabled = false;
    steps.forEach((_, i) => solved.add(i)); updateChrome();
  }

  go(Math.min(saved.step && saved.step < steps.length && !saved.done ? 0 : 0, steps.length - 1));
  return () => { alive = false; clearTimers(); board.destroy(); };
}
