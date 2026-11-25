// Opening Explorer: a DYNAMIC way to learn an opening. Instead of one fixed line, every position offers the course move,
// the other book moves and Stockfish's top choices, each with the idea behind it. Two modes:
//   Explore — wander through any variation; tap a move to play it; the coach explains what it does and what to do next.
//   Quiz    — suggestions are hidden; the opponent steers into random variations from the course, the book or the engine,
//             and your moves are graded (course move / known book move / engine-approved / mistake) with the reason.
import { Chess } from '../../vendor/chess.js';
import * as store from '../store.js';
import { h, icon, toast } from '../ui.js';
import { Board } from '../board.js';
import { buildTree, isLearnerPly, parseLine, PLANS } from '../data/openings.js';
import { ECO } from '../data/eco.js';
import { bookName, fmtEval } from '../analysis.js';
import { searchPosition, judgeMove } from '../judge.js';
import { whyMove } from '../visual.js';
import { whyCard } from '../whyui.js';
import { planFor } from '../ideas.js';
import { legalTargetsFor, checkSquare, uciOf, engineSafe } from '../chessutil.js';
import { play as sfx, playForMove } from '../sound.js';
import { revealBelow } from '../playout.js';
import { povWin } from '../evalmath.js';
import { sansText } from '../pvutil.js';

const epd = (fen) => fen.split(' ').slice(0, 4).join(' ');
const FILES = 'abcdefgh';

/* ---------------------------------------------------------------- the book: position -> next moves (from the ECO list) */
let NEXT = null;
function nextMap() {
  if (NEXT) return NEXT;
  NEXT = new Map();
  for (const line of ECO) {
    const ch = new Chess();
    for (let i = 0; i < line.moves.length; i++) {
      const san = line.moves[i], k = epd(ch.fen());
      let m = NEXT.get(k); if (!m) { m = new Map(); NEXT.set(k, m); }
      const cur = m.get(san);
      if (!cur || line.moves.length < cur.len) m.set(san, { san, name: line.name, len: line.moves.length });
      try { ch.move(san); } catch (e) { break; }
    }
  }
  return NEXT;
}
/** Known continuations of a position: [{san, name}] */
export function bookNext(fen) { const m = nextMap().get(epd(fen)); return m ? [...m.values()] : []; }

/** Deepest opening name along the move list. */
function nameAlong(sans) {
  const ch = new Chess(); let name = null;
  for (const s of sans) { try { ch.move(s); } catch (e) { break; } const n = bookName(ch.fen()); if (n) name = n; }
  return name;
}

const standing = (white, color) => {
  if (!white) return '';
  if (white.mate != null) return (color === 'w') === (white.mate > 0) ? 'winning' : 'losing';
  const cp = color === 'w' ? white.cp : -white.cp;
  return cp >= 150 ? 'clearly better' : cp >= 50 ? 'a small edge' : cp > -50 ? 'equal' : cp > -150 ? 'slightly worse' : 'worse';
};

/**
 * @param opts { back(), setMode(mode), practiceLine(i), record(courseId, lineIdx, clean) }
 */
export function explorer(root, ctx, course, opts) {
  const settings = store.get().settings;
  const tree = buildTree(course);
  const learner = course.side;
  const chess = new Chess();
  const cache = new Map();           // fen -> engine lines
  let alive = true, mode = opts.initial || 'explore', token = 0, locked = false, mistakes = 0, shown = null, quizDone = false;
  let lastMove = null;

  const board = new Board(h('div'), { orientation: learner, coords: settings.coords, legalDots: settings.legalDots, animate: settings.animations, autoQueen: true, interactive: true,
    canSelect: (sq) => !locked && !!chess.get(sq) && chess.get(sq).color === chess.turn() && (mode === 'explore' || chess.turn() === learner),
    legalTargets: (sq) => legalTargetsFor(chess, sq), onMove: (m) => userMove(m) });

  const crumb = h('div.xp-crumb'), nameEl = h('div.xp-name'), status = h('div.small.muted');
  const sugg = h('div.xp-list'), planBox = h('div'), feedback = h('div'), ctrl = h('div.row');
  const seg = h('div.seg', [['watch', 'Watch'], ['practice', 'Practice'], ['drill', 'Drill'], ['explore', 'Explore']].map(([k, l]) => h('button', { class: k === 'explore' ? 'active' : '', onclick: () => opts.setMode(k) }, l)));
  const modeSeg = h('div.seg.seg-fill');
  const drawModeSeg = () => modeSeg.replaceChildren(...[['explore', 'Explore variations'], ['quiz', 'Quiz me']].map(([k, l]) => h('button', { class: k === mode ? 'active' : '', onclick: () => setXpMode(k) }, l)));

  document.body.classList.add('in-learn');
  root.replaceChildren(
    h('div.row.between.learn-top', h('button.back', { onclick: () => { alive = false; opts.back(); } }, icon('left', 16), course.name), seg),
    h('div.game-layout.learn-layout',
      h('div.board-col', h('div.board-box', board.el), status),
      h('div.side-col', h('div.card.xp-card', modeSeg, nameEl, crumb, feedback, planBox, sugg), h('div.learn-actions', ctrl))));

  const say = (node, kind = '') => { feedback.replaceChildren(h('div.say', { class: kind }, node)); revealBelow(feedback); };
  const show = (mv, anim = true) => { lastMove = mv || null; board.setPosition(chess.fen(), { lastMove: mv ? { from: mv.from, to: mv.to } : null, animate: anim && mv ? [{ from: mv.from, to: mv.to }] : false, check: checkSquare(chess) }); };
  const sans = () => chess.history();
  const treeNode = () => { let n = tree; for (const s of sans()) { n = n.children.find((c) => c.san === s); if (!n) return null; } return n; };
  const uciFor = (san) => { try { return uciOf(new Chess(chess.fen()).move(san)); } catch (e) { return null; } };

  /* ---------------- the candidate list ---------------- */
  function candidates() {
    const fen = chess.fen(), node = treeNode();
    const map = new Map();
    const get = (san) => { if (!map.has(san)) map.set(san, { san, course: false, book: null, engine: null, note: '' }); return map.get(san); };
    if (node) node.children.forEach((c, i) => { const x = get(c.san); x.course = true; x.note = c.note || ''; x.lineIds = c.lineIds; x.primary = i === 0; });
    bookNext(fen).forEach((b) => { get(b.san).book = b.name; });
    const lines = cache.get(fen) || [];
    lines.forEach((l, i) => { if (l.pv && l.pv[0]) { try { const san = new Chess(fen).move({ from: l.pv[0].slice(0, 2), to: l.pv[0].slice(2, 4), promotion: l.pv[0][4] }).san; get(san).engine = { rank: i + 1, white: l.white, pv: l.pv }; } catch (e) { /* ignore */ } } });
    const list = [...map.values()];
    list.sort((a, b) => (b.course - a.course) || ((a.engine ? a.engine.rank : 9) - (b.engine ? b.engine.rank : 9)) || ((b.book ? 1 : 0) - (a.book ? 1 : 0)));
    return list.slice(0, 9);
  }

  function whyFor(c) {
    const fen = chess.fen(), uci = uciFor(c.san);
    if (!uci) return null;
    const lines = (cache.get(fen) || []).map((l) => ({ ev: l.white, pv: l.pv }));
    const pv = c.engine ? c.engine.pv : null;
    const w = whyMove({ fen, uci, pv, lines, idx: 0, rootColor: chess.turn(), viewer: learner });
    return w;
  }

  function row(c) {
    const turn = chess.turn();
    const mine = turn === learner;
    const badges = [];
    if (c.course) badges.push(h('span.tag.accent', mine ? 'Your repertoire' : 'Course variation'));
    if (c.book) badges.push(h('span.tag', 'Book'));
    if (c.engine) badges.push(h('span.tag', { class: c.engine.rank === 1 ? 'good' : '' }, c.engine.rank === 1 ? 'Engine #1' : `Engine #${c.engine.rank}`));
    const ev = c.engine ? h('span.xp-eval', fmtEval(c.engine.white)) : null;
    const detail = h('div.xp-detail.hidden');
    let open = false;
    const toggle = () => {
      open = !open; detail.classList.toggle('hidden', !open);
      if (open) {
        const w = whyFor(c);
        const parts = [];
        if (c.note) parts.push(h('p.small', c.note));
        if (c.book) parts.push(h('p.small.muted', `Known as: ${c.book}.`));
        if (w) { const card = whyCard(w, { showLegend: false }); if (card) parts.push(card); if (w.overlay) { board.setArrows((w.overlay.arrows || []).map((a) => ({ from: a.from, to: a.to, color: a.color, opacity: a.opacity || 0.85, width: a.width, dash: a.dash }))); board.setMarks(w.overlay.marks || {}); } }
        detail.replaceChildren(...parts);
      } else { board.clearOverlays(); }
    };
    return h('div.xp-row', { class: c.course ? 'is-course' : '' },
      h('div.xp-main',
        h('button.xp-san', { onclick: () => playSan(c.san) }, c.san),
        h('div.xp-meta', h('div.xp-badges', ...badges), c.book && !c.course ? h('div.xs.muted', c.book) : null),
        ev, h('button.icon-btn.sm', { type: 'button', 'aria-label': `Why ${c.san}?`, title: 'Why this move?', onclick: toggle }, icon('bulb', 16))),
      detail);
  }

  /* ---------------- drawing ---------------- */
  function drawCrumb() {
    const hs = sans();
    crumb.replaceChildren(
      h('button.xp-chip', { onclick: () => jump(0) }, 'Start'),
      ...hs.map((s, i) => h('button.xp-chip', { class: i === hs.length - 1 ? 'on' : '', onclick: () => jump(i + 1) }, `${i % 2 === 0 ? Math.floor(i / 2) + 1 + '.' : ''}${s}`)));
    crumb.scrollLeft = crumb.scrollWidth;
  }
  function drawName() {
    const n = nameAlong(sans());
    nameEl.replaceChildren(h('div.eyebrow', mode === 'quiz' ? 'Quiz' : 'Where you are'), h('b', n || (sans().length ? 'Off the beaten path' : `${course.name}: choose your first move`)));
  }
  function drawPlan() {
    planBox.replaceChildren();
    if (sans().length < 6 || mode === 'quiz') return;
    try {
      const items = planFor(chess.fen(), learner, { max: 2 }).filter((x) => x.id !== 'improve');
      if (!items.length) return;
      planBox.replaceChildren(h('details.coach-more.xp-plan', { open: true }, h('summary', 'What this position wants (your plan)'),
        h('ul', items.map((p) => h('li', { onclick: () => { board.setMarks(Object.fromEntries(p.squares.map((s) => [s, 'info']))); board.setArrows((p.arrows || []).map((a) => ({ from: a.from, to: a.to, color: '#5fc88f', opacity: 0.9 }))); }, style: { cursor: 'pointer' } }, h('b', p.title + ' '), h('span.muted', p.how))))));
    } catch (e) { /* ignore */ }
  }
  function drawList() {
    if (mode === 'quiz') { sugg.replaceChildren(h('div.small.muted', 'Suggestions are hidden. Play the move you would choose; the opponent will answer with a real variation.')); return; }
    const turn = chess.turn();
    const cs = candidates();
    const fen = chess.fen();
    const pending = engineSafe(fen) && !chess.isGameOver() && !cache.has(fen);
    const title = turn === learner ? 'Your move — choose a plan' : 'Their move — what could they play?';
    sugg.replaceChildren(h('div.xp-title', h('b', title), pending ? h('span.xs.muted', 'engine checking…') : null),
      ...(cs.length ? cs.map(row) : [h('div.small.muted', chess.isGameOver() ? 'The game is over here.' : 'No stored variations here yet — play any move and the engine will assess it.')]));
  }
  function drawCtrl() {
    const node = treeNode();
    const lineIds = node && node.lineIds.length ? node.lineIds : [];
    ctrl.replaceChildren(
      h('button.btn', { onclick: () => undo() }, icon('undo', 16), 'Back'),
      h('button.btn', { onclick: () => reset() }, icon('repeat', 16), 'Restart'),
      h('button.btn', { onclick: () => { board.flip(); } }, icon('flip', 16), 'Flip'),
      lineIds.length && sans().length ? h('button.btn.primary', { onclick: () => opts.practiceLine(lineIds[0]) }, icon('play', 16), `Practise: ${course.lines[lineIds[0]].name}`) : null);
  }
  function redraw() {
    drawCrumb(); drawName(); drawPlan(); drawList(); drawCtrl();
    status.textContent = chess.isGameOver() ? 'Game over' : `${chess.turn() === 'w' ? 'White' : 'Black'} to move · ${sans().length} plies`;
  }

  /* ---------------- engine ---------------- */
  async function analyse() {
    const fen = chess.fen(), my = ++token;
    if (mode === 'quiz' || cache.has(fen) || chess.isGameOver() || !engineSafe(fen)) return;
    try {
      const e = await ctx.engine();
      if (!alive || my !== token) return;
      const r = await searchPosition(e, fen, { depth: 15, movetime: 2000, multipv: 3 });
      if (!alive) return;
      cache.set(fen, r.lines);
      if (my === token && fen === chess.fen()) {
        const ev = r.e;
        status.textContent = `${chess.turn() === 'w' ? 'White' : 'Black'} to move · engine: ${fmtEval(ev)} (${standing(ev, learner)} for ${learner === 'w' ? 'White' : 'Black'})`;
        drawList();
      }
    } catch (er) { /* engine not available: the book still works */ }
  }

  /* ---------------- moving ---------------- */
  function afterMove(mv) {
    show(mv, false); board.clearOverlays(); locked = false;
    redraw();
    if (mode === 'explore') analyse();
    else quizAfter();
  }
  function playSan(san) {
    if (locked) return;
    if (mode === 'quiz' && chess.turn() !== learner) return;
    let mv; try { mv = chess.move(san); } catch (e) { return; }
    playForMove(mv, chess.inCheck());
    if (mode === 'quiz') { chess.undo(); return gradeLearnerMove(mv); }
    afterMove(mv);
  }
  function userMove(m) {
    if (locked) return false;
    const probe = new Chess(chess.fen()); let mv; try { mv = probe.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch (e) { return false; }
    if (mode === 'quiz') { gradeLearnerMove(mv); return false; }
    chess.move(mv.san); playForMove(mv, chess.inCheck());
    const note = (treeNode() || {}).note;
    afterMove(mv);
    if (note) say(note);
    return true;
  }
  function undo() { if (!chess.history().length) return; chess.undo(); if (mode === 'quiz' && chess.history().length && chess.turn() !== learner) chess.undo(); token++; locked = false; quizDone = false; show(null, false); board.clearOverlays(); feedback.replaceChildren(); redraw(); if (mode === 'explore') analyse(); else quizAfter(); }
  function jump(n) { const hs = sans().slice(0, n); chess.reset(); hs.forEach((s) => chess.move(s)); token++; locked = false; show(null, false); board.clearOverlays(); feedback.replaceChildren(); redraw(); if (mode === 'explore') analyse(); }
  function reset() { chess.reset(); token++; locked = false; mistakes = 0; quizDone = false; show(null, false); board.clearOverlays(); feedback.replaceChildren(); redraw(); if (mode === 'explore') analyse(); else quizAfter(); }
  function setXpMode(k) { mode = k; drawModeSeg(); reset(); if (k === 'explore') say('Explore: tap any move to play it, or tap the bulb to see why it is played. The engine marks the best choices.'); else say(`Quiz: you play ${learner === 'w' ? 'White' : 'Black'}. The opponent will choose a random variation each time.`); }

  /* ---------------- quiz ---------------- */
  function pickOpponent() {
    const node = treeNode();
    const pool = [];
    if (node) node.children.forEach((c) => pool.push({ san: c.san, w: 3 }));
    bookNext(chess.fen()).forEach((b) => { if (!pool.some((p) => p.san === b.san)) pool.push({ san: b.san, w: 1 }); });
    if (!pool.length) return null;
    const tot = pool.reduce((a, p) => a + p.w, 0); let r = Math.random() * tot;
    for (const p of pool) { r -= p.w; if (r <= 0) return p.san; }
    return pool[0].san;
  }
  async function quizAfter() {
    if (mode !== 'quiz' || quizDone) return;
    const my = ++token;
    if (chess.isGameOver()) return finishQuiz('The game ended.');
    if (chess.turn() === learner) { locked = false; board.setInteractive(true); return; }
    locked = true; board.setInteractive(false);
    await new Promise((r) => setTimeout(r, 520));
    if (!alive || my !== token || mode !== 'quiz') return;
    let san = pickOpponent();
    if (!san) {
      // out of the book: let the engine choose a sensible reply, and wrap up the quiz after a few more moves
      try { const e = await ctx.engine(); const r = await e.go({ fen: chess.fen(), depth: 10, movetime: 400, multipv: 1 }); const u = r.bestmove; san = new Chess(chess.fen()).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch (er) { return finishQuiz('You are out of the stored variations.'); }
      if (sans().length >= 20) return finishQuiz('That is a long way out of the book — a great place to stop.');
    }
    if (!alive || my !== token) return;
    const mv = chess.move(san); playForMove(mv, chess.inCheck()); show(mv);
    locked = false; redraw();
    if (chess.history().length >= 30) return finishQuiz('Well played — that is deep into the line.');
    if (chess.turn() !== learner) return quizAfter();
    board.setInteractive(true);
  }
  async function gradeLearnerMove(mv) {
    if (locked || quizDone) return;
    const fen = chess.fen();
    const node = treeNode();
    const course1 = node ? node.children.find((c) => c.san === mv.san) : null;
    const wantNode = node && node.children[0];
    if (course1) return accept(mv, course1.note ? `${mv.san} ✓ ${course1.note}` : `${mv.san} ✓ That is the repertoire move.`, 'good');
    const bk = bookNext(fen).find((b) => b.san === mv.san);
    locked = true;
    say(h('div', `Checking ${mv.san} with the engine…`));
    let verdict = null;
    try { const e = await ctx.engine(); verdict = await judgeMove(e, fen, uciOf(mv), { depth: 15, movetime: 2000, verify: true }); } catch (er) { verdict = null; }
    if (!alive) return;
    locked = false;
    if (verdict && verdict.loss <= 6) {
      return accept(mv, bk ? `${mv.san} ✓ A known variation (${bk.name}). ${wantNode ? `The course teaches ${wantNode.san}, but this works too.` : ''}` : `${mv.san} ✓ Not in the course, but the engine agrees it is sound (${fmtEval(verdict.playedEval)}).`, 'good');
    }
    mistakes++; board.shake(); sfx('bad');
    const best = verdict ? verdict.best : null;
    let bestSan = wantNode ? wantNode.san : null, why = '';
    if (best) { try { const m2 = new Chess(fen).move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] }); bestSan = wantNode ? wantNode.san : m2.san; const w = whyMove({ fen, uci: wantNode ? uciFor(wantNode.san) : best, viewer: learner }); why = w ? w.headline : ''; } catch (e) { /* ignore */ } }
    say(h('div', verdict ? `${mv.san} is a ${verdict.cls === 'blunder' ? 'blunder' : verdict.cls === 'mistake' ? 'mistake' : 'weaker move'} here (${fmtEval(verdict.playedEval)}). ` : `${mv.san} is not what the opening wants. `,
      bestSan ? h('span', 'Try ', h('b', bestSan), why ? ` — ${why}` : '', '.') : null,
      bestSan ? h('div.row.tight.mt-s', h('button.btn.small', { onclick: () => { feedback.replaceChildren(); playSan2(bestSan); } }, `Play ${bestSan}`), h('button.btn.small', { onclick: () => feedback.replaceChildren() }, 'Try again')) : null), 'bad');
    show(null, false);
  }
  function playSan2(san) { let mv; try { mv = chess.move(san); } catch (e) { return; } mistakes += 0; playForMove(mv, chess.inCheck()); afterMove(mv); }
  function accept(mv, text, kind) {
    chess.move(mv.san); playForMove(mv, chess.inCheck());
    show(mv, false); locked = false; say(text, kind); redraw();
    quizAfter();
  }
  function finishQuiz(reason) {
    if (quizDone) return; quizDone = true; locked = true; board.setInteractive(false);
    const n = sans().length, name = nameAlong(sans());
    const clean = mistakes === 0 && n >= 8;
    if (clean) {
      store.update((s) => { const c = s.lessons.openings[course.id] || (s.lessons.openings[course.id] = { lines: {} }); c.quiz = (c.quiz || 0) + 1; c.quizClean = (c.quizClean || 0) + 1; c.lastQuiz = Date.now(); });
      store.logActivity('lessons');
      const node = treeNode(); if (node && node.lineIds.length && opts.record) node.lineIds.forEach((li) => opts.record(course.id, li, true));
    } else store.update((s) => { const c = s.lessons.openings[course.id] || (s.lessons.openings[course.id] = { lines: {} }); c.quiz = (c.quiz || 0) + 1; });
    sfx(clean ? 'win' : 'good');
    const plan = (() => { const node = treeNode(); const li = node && node.lineIds[0]; return li != null ? (course.lines[li].plan || PLANS[`${course.id}:${li}`]) : null; })();
    say(h('div', h('b', clean ? 'Clean run!' : `Finished with ${mistakes} slip${mistakes === 1 ? '' : 's'}.`), ` ${reason} You played ${Math.ceil(n / 2)} moves${name ? ` of the ${name}` : ''}.`, plan ? h('p.small', `What next? ${plan}`) : null,
      h('div.row.mt-s', h('button.btn.primary.small', { onclick: () => reset() }, icon('repeat', 15), 'Another variation'), h('button.btn.small', { onclick: () => setXpMode('explore') }, 'Explore from here'))), clean ? 'good' : '');
  }

  /* start */
  drawModeSeg(); show(null, false); redraw();
  if (mode === 'explore') { say('Explore: tap any move to play it, or tap the bulb to see why it is played. Course moves are marked; the engine marks the best choices in every position.'); analyse(); }
  else { say(`Quiz: you play ${learner === 'w' ? 'White' : 'Black'}. The opponent will choose a random variation each time.`); quizAfter(); }
  return () => { alive = false; token++; board.destroy(); document.body.classList.remove('in-learn'); };
}
