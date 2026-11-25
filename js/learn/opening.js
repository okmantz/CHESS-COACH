// Guided opening trainer: Watch (coach plays the line and explains) -> Practice (you play, with variations) -> Drill.
import { Chess } from '../../vendor/chess.js';
import * as store from '../store.js';
import { h, icon, toast } from '../ui.js';
import { Board } from '../board.js';
import { OPENINGS, PLANS, parseLine, buildTree, isLearnerPly } from '../data/openings.js';
import { legalTargetsFor, checkSquare, uciOf, engineSafe } from '../chessutil.js';
import { winPct, fmtEval } from '../analysis.js';
import { makeHint } from '../coach.js';
import { play as sfx, playForMove } from '../sound.js';
import { trackPlan } from '../plan.js';
import { tabs } from '../ui.js';
import { progress } from '../ui.js';
import { playChip, revealBelow } from '../playout.js';
import { moveStrip } from '../gameui.js';
import { sansText } from '../pvutil.js';
import { judgeMove } from '../judge.js';
import { whyShort as positionalWhy } from '../ideas.js';
import { sanOf } from '../coach.js';
import { explorer } from './explorer.js';

export const lineStats = (courseId, li) => (store.get().lessons.openings[courseId] || { lines: {} }).lines[li] || { n: 0, ok: 0 };
export function courseProgress(course) {
  const done = course.lines.filter((_, i) => lineStats(course.id, i).ok >= 2).length;
  return done / course.lines.length;
}
function record(courseId, li, clean) {
  store.update((s) => { const c = s.lessons.openings[courseId] || (s.lessons.openings[courseId] = { lines: {} }); const l = c.lines[li] || (c.lines[li] = { n: 0, ok: 0 }); l.n++; if (clean) l.ok++; l.last = Date.now(); });
  store.logActivity('lessons');
  trackPlan({ kind: 'lesson', track: 'openings', id: courseId });
}

export function openingCourse(root, ctx, course, back) {
  const tree = buildTree(course);
  const st = { mode: 'watch', li: 0 };
  let teardown = () => {};
  const head = h('div');
  const body = h('div');
  const mastery = (li) => { const s = lineStats(course.id, li); return h('span.mastery', [1, 2, 3].map((k) => h('i', { class: s.ok >= k ? 'on' : '' }))); };

  function draw() {
    teardown(); teardown = () => {};
    const p = courseProgress(course);
    head.replaceChildren(
      h('button.back', { onclick: back }, icon('left', 16), 'Openings'),
      h('div.row.nowrapr.mb', h('div.course-icon', course.icon), h('div.grow', h('h2', { style: { margin: 0 } }, course.name), h('div.small.muted', course.tagline)), h('span.tag', course.side === 'w' ? 'As White' : 'As Black')),
      h('div.card.flat.mb', h('div.row.between', h('b', 'Key ideas'), h('span.xs.muted', `${Math.round(p * 100)}% learned`)), h('ul.ex-list.small', { style: { margin: '6px 0 0', paddingLeft: '18px' } }, course.ideas.map((i) => h('li', i))), h('div.mt', progress(p, { height: 6 }))));
    body.replaceChildren(course.deep ? deepGuide() : null, h('div.grid.g2',
      ...course.lines.map((l, i) => h('button.card.click', { onclick: () => { st.li = i; start('watch'); } }, h('div.row.between', h('b', l.name), mastery(i)), h('div.opening-moves', sansText(parseLine(l.moves).map((x) => x.san), 8)), h('div.xs.muted.mt-s', `${parseLine(l.moves).length} moves · ${lineStats(course.id, i).n} attempts`), h('div.row.mt.tight', h('span.chip', { onclick: (e) => { e.stopPropagation(); st.li = i; start('watch'); } }, 'Watch'), h('span.chip', { onclick: (e) => { e.stopPropagation(); st.li = i; start('practice'); } }, 'Practice'))))),
      h('div.row.mt', h('button.btn.primary', { onclick: () => start('drill') }, icon('zap', 16), 'Drill every variation (no hints)'), h('button.btn', { onclick: () => start('explore') }, icon('sliders', 16), 'Explore variations'), h('button.btn', { onclick: () => start('explore', { quiz: true }) }, icon('target', 16), 'Quiz me')));
  }

  function deepGuide() {
    const d = course.deep;
    const sec = (t, items) => items && items.length ? h('div.coach-sec', h('h4', t), h('ul', items.map((x) => h('li', x)))) : null;
    return h('div.card.mb', h('div.card-title', icon('book', 18), 'Study guide'), h('p', d.overview), sec('Plans for both sides', d.plans), sec('Typical mistakes', d.mistakes), sec('Traps and tricks to know', d.traps));
  }

  function start(mode, opts = {}) {
    teardown();
    st.mode = mode;
    if (mode === 'explore') {
      const t = explorer(root, ctx, course, { initial: opts.quiz ? 'quiz' : 'explore', back: () => { draw(); root.replaceChildren(head, body); }, setMode: (k) => start(k), practiceLine: (li) => { st.li = li; start('practice'); }, record });
      teardown = () => { t(); document.body.classList.remove('in-learn'); };
      return;
    }
    const t = player(mode, opts);
    teardown = () => { t(); document.body.classList.remove('in-learn'); };
  }

  /* the board + coach for one session */
  function player(mode, opts) {
    const settings = store.get().settings;
    const chess = new Chess();
    let node = tree, alive = true, mistakes = 0, locked = true, hintLevel = 0, finished = false, lineIdx = st.li, pendingChoice = false;
    let choose = !!opts.choose;
    const learnerSide = course.side;
    const lineMoves = mode === 'drill' ? null : parseLine(course.lines[lineIdx].moves);
    // DRILL covers EVERY variation: a queue of all lines, weakest first, each drilled once per round
    const queue = mode === 'drill' ? course.lines.map((_, i) => i).sort((a, b) => { const A = lineStats(course.id, a), B = lineStats(course.id, b); return (A.ok - B.ok) || ((A.last || 0) - (B.last || 0)) || Math.random() - 0.5; }) : [];
    let qi = 0; const roundResults = [];
    const board = new Board(h('div'), { orientation: learnerSide, coords: settings.coords, legalDots: settings.legalDots, animate: settings.animations, autoQueen: true, interactive: mode !== 'watch',
      canSelect: (sq) => !locked && chess.get(sq) && chess.get(sq).color === chess.turn(),
      legalTargets: (sq) => legalTargetsFor(chess, sq), onMove: (m) => userMove(m) });
    const say = h('div');
    const choices = h('div.variation-chips');
    const title = h('div.row.between', h('b', mode === 'drill' ? 'Drill' : course.lines[lineIdx].name), h('span.tag.accent', mode === 'watch' ? 'Watching' : mode === 'drill' ? 'Drill' : 'Practice'));
    const stat = h('div.small.muted');
    const ctrl = h('div.row');
    const sel = h('div.seg', [['watch', 'Watch'], ['practice', 'Practice'], ['drill', 'Drill'], ['explore', 'Explore']].map(([k, l]) => h('button', { class: k === mode ? 'active' : '', onclick: () => start(k) }, l)));
    const boardCol = h('div.board-col', h('div.board-box', board.el), stat);
    document.body.classList.add('in-learn');
    root.replaceChildren(h('div.row.between.learn-top', h('button.back', { onclick: () => { alive = false; draw(); root.replaceChildren(head, body); } }, icon('left', 16), course.name), sel),
      h('div.game-layout.learn-layout', boardCol,
        h('div.side-col', h('div.card', title, say, choices), h('div.learn-actions', ctrl))));
    const bubble = (txt, kind = '') => { if (!txt) return; const b = h('div.say', { class: kind }, txt); say.prepend(b); while (say.children.length > 4) say.lastChild.remove(); revealBelow(b); };
    const show = (mv, anim = true) => board.setPosition(chess.fen(), { lastMove: mv ? { from: mv.from, to: mv.to } : null, animate: anim && mv ? [{ from: mv.from, to: mv.to }] : false, check: checkSquare(chess) });
    const plyNo = () => chess.history().length;
    const playSan = (san) => { const m = chess.move(san); playForMove(m, chess.inCheck()); show(m); return m; };
    const moveLabel = (n) => { const ply = n.ply; return `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${n.san}`; };

    /* ---------------- WATCH ---------------- */
    if (mode === 'watch') {
      let i = 0, timer = null, auto = false;
      const prev = h('button.btn', { onclick: () => step(-1) }, icon('left', 18)), next = h('button.btn.primary.grow', { onclick: () => step(1) }, 'Next move', icon('right', 18));
      const autoBtn = h('button.btn', { onclick: () => toggleAuto() }, icon('play', 16), 'Auto');
      // every move of the line is a button: tap one to jump straight to it
      const strip = moveStrip({ nav: false, onSelect: (k) => { stopAuto(); go(k + 1); const m = lineMoves[k]; bubble(`${moveLabel({ ply: k + 1, san: m.san })}${m.note ? ' — ' + m.note : ''}`, isLearnerPly(course, k + 1) ? 'good' : ''); } });
      boardCol.append(strip.el);
      const practiceBtn = h('button.btn', { onclick: () => start('practice') }, 'Your turn');
      ctrl.replaceChildren(prev, next, autoBtn, practiceBtn);
      const go = (n) => {
        chess.reset(); say.replaceChildren(); i = 0;
        for (let k = 0; k < n; k++) { const m = chess.move(lineMoves[k].san); i++; if (k === n - 1) show(m, false); }
        if (n === 0) show(null, false);
        board.clearOverlays(); update();
      };
      function update() {
        const m = lineMoves[i - 1];
        stat.textContent = i === 0 ? 'Press Next to start' : `Move ${Math.ceil(i / 2)} of ${Math.ceil(lineMoves.length / 2)}`;
        prev.disabled = i === 0; next.disabled = i >= lineMoves.length;
        strip.setMoves(lineMoves.map((x) => x.san), i - 1);
      }
      function step(d) {
        if (d < 0) { go(Math.max(0, i - 1)); if (i > 0 && lineMoves[i - 1].note) bubble(`${moveLabel({ ply: i, san: lineMoves[i - 1].san })}: ${lineMoves[i - 1].note}`); return; }
        if (i >= lineMoves.length) return;
        const mv = lineMoves[i];
        const m = playSan(mv.san); i++;
        const who = isLearnerPly(course, i) ? 'You' : 'Opponent';
        bubble(`${who} play ${moveLabel({ ply: i, san: mv.san })}${mv.note ? ' — ' + mv.note : '.'}`, isLearnerPly(course, i) ? 'good' : '');
        update();
        if (i >= lineMoves.length) { finishWatch(); }
      }
      function finishWatch() {
        const plan = course.lines[lineIdx].plan || PLANS[`${course.id}:${lineIdx}`];
        bubble(plan || 'End of the line. Now try it yourself from memory.', 'good');
        record(course.id, lineIdx, false); stopAuto();
      }
      function toggleAuto() { auto ? stopAuto() : (auto = true, autoBtn.classList.add('primary'), tick()); }
      function stopAuto() { auto = false; autoBtn.classList.remove('primary'); clearTimeout(timer); }
      function tick() { if (!auto || !alive) return; if (i >= lineMoves.length) return stopAuto(); step(1); timer = setTimeout(tick, 1800); }
      go(0); bubble(`Watch the coach play the ${course.lines[lineIdx].name}. Each move comes with the idea behind it.`);
      return () => { alive = false; clearTimeout(timer); board.destroy(); };
    }

    /* ---------------- PRACTICE / DRILL ---------------- */
    if (mode === 'drill') { lineIdx = queue[0]; }
    const hintBtn = h('button.btn', { onclick: () => hint() }, icon('bulb', 16), 'Hint');
    const undoBtn = h('button.btn', { onclick: () => restart() }, icon('repeat', 16), 'Restart');
    const showBtn = h('button.btn', { onclick: () => revealMove() }, icon('eye', 16), 'Show move');
    const chooseTog = h('label.chip', h('input', { type: 'checkbox', checked: choose, style: { marginRight: '6px' }, onchange: (e) => { choose = e.target.checked; } }), 'I choose their replies');
    ctrl.replaceChildren(hintBtn, showBtn, undoBtn, mode === 'practice' ? chooseTog : null);
    hintBtn.disabled = mode === 'drill';

    function expectedChild() {
      const ch = node.children;
      if (!ch.length) return null;
      if (isLearnerPly(course, node.ply + 1)) return ch[0];
      // opponent: follow the target line (practice) or the line being drilled, so every variation gets visited
      if ((mode === 'practice' && !choose) || mode === 'drill') { const c = ch.find((x) => x.lineIds.includes(lineIdx)); if (c) return c; }
      return ch[Math.floor(Math.random() * ch.length)];
    }
    function restart() {
      chess.reset(); node = tree; mistakes = 0; hintLevel = 0; finished = false; pendingChoice = false; choices.replaceChildren();
      if (mode === 'drill') lineIdx = queue[qi];
      title.firstChild.textContent = mode === 'drill' ? `Drill · variation ${qi + 1} of ${queue.length}` : course.lines[lineIdx].name;
      say.replaceChildren(); board.clearOverlays(); show(null, false);
      bubble(mode === 'drill' ? `Drill ${qi + 1} of ${queue.length}: your opponent will steer into one of the variations of this opening. Play the repertoire from memory — every variation gets its turn.` : `Play the ${course.lines[lineIdx].name} from memory. I'll step in if you go astray.`);
      advance();
    }
    function advance() {
      stat.textContent = `Mistakes: ${mistakes}`;
      if (!node.children.length) return complete();
      if (isLearnerPly(course, node.ply + 1)) { locked = false; board.setInteractive(true); return; }
      locked = true; board.setInteractive(false);
      if (mode === 'practice' && choose && node.children.length > 1) {
        pendingChoice = true; choices.replaceChildren(h('div.xs.muted', 'Your opponent could play:'), ...node.children.map((c) => h('button.chip', { onclick: () => { choices.replaceChildren(); pendingChoice = false; oppPlay(c); } }, c.san)));
        return;
      }
      setTimeout(() => { if (alive) oppPlay(expectedChild()); }, 550);
    }
    function oppPlay(child) {
      const m = playSan(child.san); node = child;
      if (child.note) bubble(`${moveLabel(child)} — ${child.note}`);
      advance();
    }
    async function userMove(m) {
      if (locked || finished) return false;
      const want = node.children[0];
      const probe = new Chess(chess.fen()); let mv; try { mv = probe.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch (e) { return false; }
      if (mv.san === want.san) {
        chess.move(mv.san); playForMove(mv, chess.inCheck()); show(mv, false); board.clearOverlays(); node = want; hintLevel = 0;
        bubble(`${moveLabel(want)} ✓ ${want.note || ''}`, 'good');
        advance(); return true;
      }
      // not the repertoire move: explain, and check with the engine whether it is playable
      locked = true; mistakes++; board.shake(); sfx('bad');
      stat.textContent = `Mistakes: ${mistakes}`;
      const wantUci = uciOf(new Chess(chess.fen()).move(want.san));
      bubble(h('div', `${mv.san} is not the move of this line. The course plays `, h('b', want.san), `.${want.note ? ' ' + want.note : ''}`, h('div.row.tight.mt-s', playChip(`Play ${want.san}`, () => playSuggested(want.san)))), 'bad');
      board.setPosition(chess.fen(), { animate: false, check: checkSquare(chess) });
      engineVerdict(mv, wantUci, want.san);
      setTimeout(() => { locked = false; board.setArrows([]); }, 400);
      return false;
    }
    async function engineVerdict(mv, wantUci, wantSan) {
      try {
        const e = await ctx.engine(); if (!alive) return;
        const base = chess.fen(); const after = new Chess(base); after.move(mv.san);
        if (!engineSafe(base) || !engineSafe(after.fen())) return;
        // one search for both moves: the move played and the engine's best are compared inside the same search
        const j = await judgeMove(e, base, uciOf(mv), { depth: 15, movetime: 2000, verify: true });
        if (!alive) return;
        const loss = j.loss, ev = fmtEval(j.playedEval);
        const why = positionalWhy(base, j.best);
        bubble(h('div', loss <= 5 ? `For what it's worth, ${mv.san} is a sound move too (${ev}). This course just teaches ${wantSan} to keep a consistent plan.` : loss <= 15 ? `${mv.san} is playable but gives up some of your advantage (${ev}).` : `${mv.san} is actually a mistake here: the engine evaluates it ${ev}.`,
          loss > 5 && j.bestPv ? h('div.small.mt-s', `The engine's choice is ${sanOf(base, j.best)}${why ? ` — ${why}` : ''}.`) : null));
      } catch (er) { /* ignore */ }
    }
    function hint() {
      if (locked || finished || !node.children.length) return;
      hintLevel++;
      const want = node.children[0];
      const uci = uciOf(new Chess(chess.fen()).move(want.san));
      const hh = makeHint(chess.fen(), uci, Math.min(3, hintLevel));
      board.setHint([hh.from, hintLevel >= 3 ? hh.to : null].filter(Boolean));
      if (hintLevel >= 3) board.setArrows([{ from: hh.from, to: hh.to, color: '#62b8ff', opacity: 0.85 }]);
      mistakes += hintLevel >= 3 ? 1 : 0;
      bubble(hintLevel === 1 ? `Think about the plan: ${course.ideas[Math.min(course.ideas.length - 1, Math.floor(node.ply / 4))]}` : hintLevel >= 3 ? h('div', hh.text, h('div.row.tight.mt-s', playChip(`Play ${want.san}`, () => playSuggested(want.san)))) : hh.text);
    }
    function revealMove() {
      if (locked || finished || !node.children.length) return;
      const want = node.children[0]; const uci = uciOf(new Chess(chess.fen()).move(want.san));
      mistakes++; board.setArrows([{ from: uci.slice(0, 2), to: uci.slice(2, 4), color: '#5fc88f', opacity: 0.9 }]);
      bubble(h('div', `The move is `, h('b', want.san), `.${want.note ? ' ' + want.note : ''}`, h('div.row.tight.mt-s', playChip(`Play ${want.san}`, () => playSuggested(want.san)))));
    }
    /** Play a suggested move for the learner (only while it is still the expected move of the position they are looking at). */
    function playSuggested(san) {
      if (locked || finished) return;
      const want = node.children[0];
      if (!want || want.san !== san) { toast('That suggestion was for an earlier position'); return; }
      let m; try { m = new Chess(chess.fen()).move(san); } catch (e) { return; }
      board.setArrows([]); board.setHint([]);
      userMove({ from: m.from, to: m.to, promotion: m.promotion });
    }
    function complete() {
      finished = true; locked = true; board.setInteractive(false);
      const clean = mistakes === 0;
      const line = course.lines[lineIdx];
      // credit every line that passes through this leaf
      const credited = node.lineIds.length ? node.lineIds : [lineIdx];
      credited.forEach((li) => record(course.id, li, clean));
      sfx(clean ? 'win' : 'good');
      bubble(clean ? `Perfect! ${line.name} learned without a single mistake.` : `Line complete with ${mistakes} slip${mistakes === 1 ? '' : 's'}. Repeat it until you can play it cleanly.`, clean ? 'good' : '');
      const plan = line.plan || PLANS[`${course.id}:${credited[0]}`];
      if (plan) bubble(`What next? ${plan}`);
      if (mode === 'drill') {
        roundResults.push({ li: lineIdx, clean, mistakes });
        const last = qi + 1 >= queue.length;
        if (last) {
          const cleanN = roundResults.filter((r) => r.clean).length;
          bubble(`Round complete: you drilled all ${queue.length} variations — ${cleanN} clean, ${queue.length - cleanN} with slips.`, cleanN === queue.length ? 'good' : '');
          choices.replaceChildren(h('div.card.flat', h('b', 'Round summary'), ...roundResults.map((r) => h('div.row.between.small', h('span', course.lines[r.li].name), h('span.tag', { class: r.clean ? 'good' : 'warn' }, r.clean ? 'Clean' : `${r.mistakes} slip${r.mistakes === 1 ? '' : 's'}`)))),
            h('div.row.mt', h('button.btn.primary', { onclick: () => start('drill') }, icon('repeat', 16), 'Another round'), h('button.btn', { onclick: () => { alive = false; draw(); root.replaceChildren(head, body); } }, 'Back to the course')));
        } else {
          choices.replaceChildren(h('div.row', h('button.btn.primary', { onclick: () => { qi++; restart(); } }, icon('right', 16), `Next variation (${qi + 2} of ${queue.length})`)));
        }
      } else {
        choices.replaceChildren(h('div.row', h('button.btn.primary', { onclick: () => restart() }, icon('repeat', 16), 'Again'),
          lineIdx < course.lines.length - 1 ? h('button.btn', { onclick: () => { st.li = lineIdx + 1; start('practice'); } }, 'Practice next variation') : null,
          h('button.btn', { onclick: () => start('drill') }, icon('zap', 16), 'Drill every variation')));
      }
      stat.textContent = `Mistakes: ${mistakes}`;
    }
    restart();
    return () => { alive = false; board.destroy(); };
  }

  draw();
  root.replaceChildren(head, body);
  if (ctx.query.start) { st.li = +ctx.query.line || 0; if (ctx.query.start === 'quiz') start('explore', { quiz: true }); else start(ctx.query.start); }
  return () => teardown();
}
