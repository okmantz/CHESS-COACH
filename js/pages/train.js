import { Chess } from '../../vendor/chess.js';
import * as store from '../store.js';
import { h, icon, toast, fmtTime } from '../ui.js';
import { Board } from '../board.js';
import { legalTargetsFor, checkSquare, uciOf, engineSafe } from '../chessutil.js';
import { THEME_LABELS, TAGS } from '../coach.js';
import { winPct } from '../analysis.js';
import { PUZZLES } from '../data/puzzles.js';
import { trackPlan } from '../plan.js';
import { play as sfx, playForMove } from '../sound.js';
import { statBox, emptyState } from '../components.js';

const THEMES = [
  ['fork', 'Forks', 'One piece attacks two or more at once.'],
  ['pin', 'Pins', 'A piece cannot move without exposing something more valuable.'],
  ['skewer', 'Skewers', 'Attack a valuable piece so it must move and drop the one behind it.'],
  ['discovered', 'Discovered attacks', 'Move one piece to unleash another.'],
  ['mate', 'Checkmate', 'Find the forced mate.'],
  ['hangingPiece', 'Win material', 'Spot the undefended or overloaded piece.'],
  ['defensive', 'Defence', 'Find the only move that holds the position.'],
  ['sacrifice', 'Sacrifices', 'Give something up for a decisive gain.'],
  ['promotion', 'Promotion', 'Get a pawn to the end.'],
];
const BOXES = [0, 1, 3, 7, 14, 30];

const puzzleId = (p) => p.f.split(' ').slice(0, 2).join(' ').replace(/\//g, '').slice(0, 40) + p.m[0];
const withId = PUZZLES.map((p) => ({ ...p, id: puzzleId(p) }));

export default async function trainPage(view, ctx) {
  const mode = ctx.params[0] || 'hub';
  let teardown = () => {};
  const root = h('div.page');
  view.replaceChildren(root);
  const hub = () => { teardown(); teardown = () => {}; root.replaceChildren(hubView(ctx)); };
  if (mode === 'hub') hub();
  else if (mode === 'puzzles') teardown = puzzleRunner(root, ctx, { theme: ctx.query.theme || null, count: +ctx.query.n || 0 }, hub);
  else if (mode === 'rush') teardown = rushRunner(root, ctx, hub);
  else if (mode === 'mistakes') teardown = mistakeRunner(root, ctx, { tag: ctx.query.tag || null }, hub);
  else hub();
  return () => teardown();
}

function hubView(ctx) {
  const s = store.get();
  const due = s.mistakes.filter((m) => (m.due || 0) <= Date.now());
  const counts = {}; for (const p of withId) for (const t of p.t) counts[t] = (counts[t] || 0) + 1;
  const stat = (t) => { const x = s.puzzles.themes[t]; return x && x.attempts ? Math.round((100 * x.solved) / x.attempts) + '%' : '—'; };
  return h('div',
    h('div.page-head', h('h1', 'Train')),
    h('div.card.mb.grid.g4', statBox(s.puzzles.rating, 'Puzzle rating'), statBox(s.puzzles.solved, 'Solved'), statBox(s.puzzles.attempts ? Math.round((100 * s.puzzles.solved) / s.puzzles.attempts) + '%' : '—', 'Success rate'), statBox(s.puzzles.bestStreak, 'Best streak')),
    h('div.grid.g2.mb',
      h('a.card.click', { href: '#/train/mistakes', style: due.length ? { borderColor: 'var(--accent)' } : {} }, h('div.row.nowrapr', h('div.course-icon', icon('target', 22)), h('div.grow', h('b', 'Your own mistakes'), h('div.small.muted', s.mistakes.length ? `${due.length} due for review · ${s.mistakes.length} saved from your games` : 'Mistakes from your analyzed games show up here')), icon('right', 16))),
      h('a.card.click', { href: '#/train/rush' }, h('div.row.nowrapr', h('div.course-icon', icon('zap', 22)), h('div.grow', h('b', 'Puzzle Rush'), h('div.small.muted', `3 minutes, 3 strikes · best ${s.puzzles.rush.best}`)), icon('right', 16))),
      h('a.card.click', { href: '#/train/puzzles' }, h('div.row.nowrapr', h('div.course-icon', icon('sparkle', 22)), h('div.grow', h('b', 'Adaptive puzzles'), h('div.small.muted', 'Difficulty follows your results')), icon('right', 16)))),
    h('h3', 'Practice by theme'),
    h('div.grid.g3', THEMES.map(([id, name, sub]) => h('a.card.click', { href: `#/train/puzzles?theme=${id}` }, h('div.row.between', h('b', name), h('span.tag', stat(id))), h('div.small.muted', sub), h('div.xs.faint.mt', `${counts[id] || 0} puzzles`)))),
    h('div.grid.g2.mt', h('a.card.click', { href: '#/learn/openings' }, h('b', 'Opening trainer'), h('div.small.muted', 'Learn lines, drill them, build a repertoire →')), h('a.card.click', { href: '#/learn/endgames' }, h('b', 'Endgame trainer'), h('div.small.muted', 'Pawn endings, rooks, mating patterns →'))));
}

/* shared puzzle board UI ------------------------------------------------ */
function puzzleBoardUI(ctx) {
  const s = store.get().settings;
  const state = { chess: null, p: null, idx: 0, locked: true, mistakes: 0 };
  let onSolved = () => {}, onFailed = () => {}, onWrong = () => {};
  const board = new Board(h('div'), { interactive: true, coords: s.coords, legalDots: s.legalDots, animate: s.animations, autoQueen: s.autoQueen,
    canSelect: (sq) => !state.locked && state.chess && state.chess.get(sq) && state.chess.get(sq).color === state.chess.turn(),
    legalTargets: (sq) => legalTargetsFor(state.chess, sq),
    onMove: (m) => attempt(m) });
  function load(p, opp) {
    state.p = p; state.chess = new Chess(p.f); state.idx = 0; state.mistakes = 0; state.locked = false;
    const me = state.chess.turn();
    board.flip(me); board.clearOverlays();
    board.setPosition(p.f, { animate: false, check: checkSquare(state.chess) });
    return me;
  }
  function attempt(m) {
    if (state.locked) return false;
    const exp = state.p.m[state.idx];
    const probe = new Chess(state.chess.fen());
    let mv; try { mv = probe.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch (e) { return false; }
    const u = uciOf(mv);
    const ok = u === exp || (probe.isCheckmate() && state.p.t.includes('mate'));
    if (!ok) { state.mistakes++; board.shake(); sfx('bad'); onWrong(mv); return false; }
    state.chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    playForMove(mv, state.chess.inCheck());
    board.setPosition(state.chess.fen(), { lastMove: { from: mv.from, to: mv.to }, animate: false, check: checkSquare(state.chess) });
    state.idx++;
    if (state.idx >= state.p.m.length || state.chess.isCheckmate()) { state.locked = true; setTimeout(() => onSolved(state.mistakes === 0), 250); return true; }
    state.locked = true;
    setTimeout(() => {
      const r = state.p.m[state.idx]; const rm = state.chess.move({ from: r.slice(0, 2), to: r.slice(2, 4), promotion: r[4] });
      playForMove(rm, state.chess.inCheck());
      board.setPosition(state.chess.fen(), { lastMove: { from: rm.from, to: rm.to }, animate: [{ from: rm.from, to: rm.to }], check: checkSquare(state.chess) });
      state.idx++; state.locked = false;
    }, 420);
    return true;
  }
  function solution() {
    const c = new Chess(state.chess.fen()); const out = [];
    for (let i = state.idx; i < state.p.m.length; i++) { try { out.push(c.move({ from: state.p.m[i].slice(0, 2), to: state.p.m[i].slice(2, 4), promotion: state.p.m[i][4] }).san); } catch (e) { break; } }
    return out;
  }
  function showHint() { const u = state.p.m[state.idx]; board.setHint([u.slice(0, 2)]); }
  function reveal() { const u = state.p.m[state.idx]; board.setArrows([{ from: u.slice(0, 2), to: u.slice(2, 4), color: '#5fc88f', opacity: 0.9 }]); state.locked = true; }
  return { board, state, load, solution, showHint, reveal, on: (a, b, c) => { onSolved = a; onFailed = b; onWrong = c || (() => {}); }, unlock: () => { state.locked = false; } };
}

/* adaptive selection --------------------------------------------------- */
function pickPuzzle(theme, exclude, targetShift = 0) {
  const s = store.get().puzzles;
  const pool = withId.filter((p) => (!theme || p.t.includes(theme)) && !exclude.has(p.id));
  if (!pool.length) return null;
  const target = s.rating + targetShift;
  const fresh = pool.filter((p) => !s.seen[p.id]);
  const list = fresh.length ? fresh : pool.sort((a, b) => (s.seen[a.id].t - s.seen[b.id].t));
  const scored = list.map((p) => ({ p, d: Math.abs(p.r - target) + Math.random() * 120 })).sort((a, b) => a.d - b.d);
  return scored[0].p;
}

/* puzzle runner -------------------------------------------------------- */
function puzzleRunner(root, ctx, cfg, back) {
  const ui = puzzleBoardUI(ctx);
  const used = new Set();
  let solvedHere = 0, done = 0, current = null, failedFlag = false, alive = true;
  const title = h('h2', { style: { margin: 0 } });
  const status = h('div.pz-status');
  const meta = h('div.small.muted');
  const info = h('div');
  const btnHint = h('button.btn', { onclick: () => { failedFlag = true; ui.showHint(); } }, icon('bulb', 16), 'Hint');
  const btnSol = h('button.btn', { onclick: () => giveUp() }, icon('eye', 16), 'Solution');
  const btnNext = h('button.btn.primary.hidden', { onclick: () => next() }, 'Next puzzle', icon('right', 16));
  const prog = h('span.tag.accent');
  const theme = cfg.theme;
  root.replaceChildren(
    h('div.row.between', h('button.back', { onclick: back }, icon('left', 16), 'Train'), prog),
    h('div.game-layout',
      h('div.board-col', h('div.board-box', ui.board.el)),
      h('div.side-col', h('div.card', title, meta, h('div', { style: { height: '10px' } }), status, info), h('div.row', btnHint, btnSol, btnNext))));

  ui.on(async (clean) => {
    if (!alive) return;
    const p = current; const ok = clean && !failedFlag;
    store.recordPuzzle(p.t, ok, p.id, p.r); ctx.refreshChrome();
    trackPlan({ kind: 'puzzles', themes: p.t });
    done++; if (ok) solvedHere++;
    sfx(ok ? 'win' : 'move');
    status.className = 'pz-status ' + (ok ? 'good' : ''); status.replaceChildren(icon('check', 18), ok ? 'Solved!' : 'Solved — with help');
    btnNext.classList.remove('hidden'); btnHint.disabled = btnSol.disabled = true;
    const r = store.get().puzzles.rating;
    info.replaceChildren(h('div.small.muted.mt', `Puzzle rating ${r}`));
    refreshProg();
  }, () => {}, (mv) => {
    failedFlag = true;
    status.className = 'pz-status bad'; status.replaceChildren(icon('x', 18), `${mv.san} isn't it — try again`);
    if (!current._failed) { current._failed = true; store.recordPuzzle(current.t, false, current.id, current.r); ctx.refreshChrome(); }
  });

  function refreshProg() { prog.textContent = cfg.count ? `${done}/${cfg.count}` : `${solvedHere} solved`; }
  function giveUp() {
    failedFlag = true; if (!current._failed) { current._failed = true; store.recordPuzzle(current.t, false, current.id, current.r); }
    const sol = ui.solution(); ui.reveal();
    status.className = 'pz-status bad'; status.replaceChildren(icon('eye', 18), `Solution: ${sol.join(' ')}`);
    btnNext.classList.remove('hidden'); btnHint.disabled = btnSol.disabled = true; done++; refreshProg();
  }
  function next() {
    if (cfg.count && done >= cfg.count) { finishSet(); return; }
    const p = pickPuzzle(theme, used, 0);
    if (!p) { root.replaceChildren(h('div.card', emptyState('target', 'You have seen every puzzle in this set', 'Try another theme — more puzzles are added over time.', h('button.btn.primary', { onclick: back }, 'Back')))); return; }
    used.add(p.id); current = p; failedFlag = false; current._failed = false;
    const me = ui.load(p);
    title.textContent = `${me === 'w' ? 'White' : 'Black'} to move`;
    meta.textContent = `${p.t.map((t) => THEME_LABELS[t] || t).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join(' · ')} · rated ${p.r}`;
    status.className = 'pz-status'; status.replaceChildren(icon('target', 18), p.t.includes('defensive') ? 'Find the only move that holds.' : p.m.length > 1 ? 'Find the best sequence.' : 'Find the best move.');
    info.replaceChildren(); btnNext.classList.add('hidden'); btnHint.disabled = btnSol.disabled = false; refreshProg();
  }
  function finishSet() {
    root.replaceChildren(h('div.card.center', h('div', { style: { fontSize: '44px' } }, solvedHere >= done * 0.7 ? '🎯' : '💪'), h('h2', `${solvedHere} of ${done} solved cleanly`), h('p.muted', 'The coach adjusts the next puzzles to your results.'),
      h('div.row', { style: { justifyContent: 'center' } }, h('button.btn.primary', { onclick: () => { done = 0; solvedHere = 0; used.clear(); root.replaceChildren(...[]); teardownAndRestart(); } }, 'Another set'), h('button.btn', { onclick: back }, 'Done'))));
  }
  const teardownAndRestart = () => { alive = false; ctx.navigate(`#/train/puzzles?${theme ? 'theme=' + theme + '&' : ''}n=${cfg.count || 5}`); location.reload(); };
  next();
  return () => { alive = false; ui.board.destroy(); };
}

/* rush ------------------------------------------------------------------ */
function rushRunner(root, ctx, back) {
  const ui = puzzleBoardUI(ctx);
  const total = 180000; let left = total, strikes = 0, score = 0, running = false, timer = null, current = null, alive = true;
  const used = new Set();
  const clock = h('div.clock', fmtTime(total));
  const scoreEl = h('div.big-num', '0');
  const strikeEl = h('div.row.tight');
  const status = h('div.pz-status', icon('zap', 18), 'Solve as many as you can. Three strikes and you are out.');
  const startBtn = h('button.btn.primary.big.block', { onclick: () => start() }, icon('play', 18), 'Start');
  const drawStrikes = () => strikeEl.replaceChildren(...[0, 1, 2].map((i) => h('span', { style: { fontSize: '22px', opacity: i < strikes ? 1 : 0.25 } }, '✖️')));
  drawStrikes();
  root.replaceChildren(h('div.row.between', h('button.back', { onclick: back }, icon('left', 16), 'Train'), h('span.tag', `Best ${store.get().puzzles.rush.best}`)),
    h('div.game-layout', h('div.board-col', h('div.board-box', ui.board.el)),
      h('div.side-col', h('div.card.center', clock, scoreEl, h('div.xs.muted', 'solved'), strikeEl), status, startBtn)));
  ui.state.locked = true;
  const lvl = () => store.get().puzzles.rating - 250 + score * 55;
  function nextP() {
    const p = pickPuzzle(null, used, lvl() - store.get().puzzles.rating);
    if (!p) return end('No more puzzles');
    used.add(p.id); current = p; ui.load(p);
    status.className = 'pz-status'; status.replaceChildren(icon('target', 18), `${ui.state.chess.turn() === 'w' ? 'White' : 'Black'} to move`);
  }
  ui.on((clean) => {
    if (!running) return;
    if (clean) { score++; scoreEl.textContent = String(score); sfx('win'); nextP(); } else { strike(); }
  }, () => {}, () => { strike(true); });
  function strike(wrong) {
    strikes++; drawStrikes(); sfx('bad');
    if (strikes >= 3) return end('Three strikes');
    status.className = 'pz-status bad'; status.replaceChildren(icon('x', 18), 'Strike! Next puzzle…'); ui.state.locked = true;
    setTimeout(() => { if (running) nextP(); }, 600);
  }
  function start() {
    running = true; startBtn.classList.add('hidden'); const t0 = Date.now();
    nextP();
    timer = setInterval(() => { left = total - (Date.now() - t0); clock.textContent = fmtTime(left); clock.classList.toggle('low', left < 20000); if (left <= 0) end("Time's up"); }, 100);
  }
  function end(why) {
    if (!running) return; running = false; clearInterval(timer); ui.state.locked = true;
    store.update((s) => { s.puzzles.rush.history.push({ t: Date.now(), score }); if (s.puzzles.rush.history.length > 50) s.puzzles.rush.history.shift(); if (score > s.puzzles.rush.best) s.puzzles.rush.best = score; });
    store.logActivity('puzzles', 0);
    const best = store.get().puzzles.rush.best;
    status.className = 'pz-status'; status.replaceChildren(icon('award', 18), `${why}. You solved ${score}${score >= best && score > 0 ? ' — a new best!' : ''}`);
    startBtn.textContent = 'Play again'; startBtn.classList.remove('hidden'); startBtn.onclick = () => { ctx.navigate('#/train/rush'); location.reload(); };
  }
  return () => { alive = false; clearInterval(timer); ui.board.destroy(); };
}

/* mistake trainer: spaced repetition on your own errors ------------------ */
function mistakeRunner(root, ctx, cfg, back) {
  const ui = puzzleBoardUI(ctx);
  let alive = true, current = null, solvedOnce = false, tries = 0;
  const all = () => store.get().mistakes.filter((m) => !cfg.tag || m.tag === cfg.tag);
  const queue = () => { const now = Date.now(); const l = all().filter((m) => (m.due || 0) <= now); l.sort((a, b) => (a.box - b.box) || (a.due - b.due)); return l; };
  const title = h('h2', { style: { margin: 0 } });
  const status = h('div.pz-status');
  const info = h('div');
  const btnHint = h('button.btn', { onclick: () => { tries = Math.max(tries, 1); ui.showHint(); } }, icon('bulb', 16), 'Hint');
  const btnSol = h('button.btn', { onclick: () => reveal() }, icon('eye', 16), 'Show answer');
  const btnNext = h('button.btn.primary.hidden', { onclick: () => next() }, 'Next', icon('right', 16));
  root.replaceChildren(h('div.row.between', h('button.back', { onclick: back }, icon('left', 16), 'Train'), h('span.tag.accent', cfg.tag && TAGS[cfg.tag] ? TAGS[cfg.tag].label : 'All mistakes')),
    h('div.game-layout', h('div.board-col', h('div.board-box', ui.board.el)), h('div.side-col', h('div.card', title, h('div.small.muted', { id: 'mm' }), h('div', { style: { height: '10px' } }), status, info), h('div.row', btnHint, btnSol, btnNext))));

  const grade = (ok) => store.update((s) => { const m = s.mistakes.find((x) => x.id === current.id); if (!m) return; m.seen++; if (ok) { m.solved++; m.box = Math.min(5, m.box + 1); } else m.box = 0; m.due = Date.now() + (ok ? BOXES[m.box] * 86400000 : 10 * 60000); });
  const explain = () => {
    const meta = TAGS[current.tag];
    info.replaceChildren(h('div.say', h('b', `In your game you played ${current.san}`), h('div.small.muted', `${current.cls} · cost about ${current.loss}% win probability.`), h('div.mt', 'Better was ', h('b', current.bestSan))),
      meta ? h('div.coach-sec', h('h4', 'What to consider'), h('ul', meta.consider.map((c) => h('li', c)))) : null);
  };
  async function check(mv) {
    // engine-checked: accept any move that is nearly as good as the best
    const probe = new Chess(current.fen); const mm = probe.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
    if (uciOf(mm) === current.best) return { ok: true, exact: true };
    if (uciOf(mm) === current.played) return { ok: false, same: true };
    try {
      const e = await ctx.engine(); if (!engineSafe(probe.fen())) return { ok: false };
      const [a, b] = [await e.go({ fen: current.fen, depth: 12, multipv: 1 }), await e.go({ fen: probe.fen(), depth: 12, multipv: 1 })];
      const col = current.color; const pov = (l) => { const w = l.white.mate != null ? (l.white.mate > 0 ? 100 : 0) : winPct(l.white); return col === 'w' ? w : 100 - w; };
      return { ok: pov(a.lines[0]) - pov(b.lines[0]) <= 5, san: mm.san };
    } catch (er) { return { ok: false }; }
  }
  ui.on(() => {}, () => {}, () => {});
  // custom attempt handler: validate via check()
  ui.board.o.onMove = async (m) => {
    if (ui.state.locked) return false;
    const probe = new Chess(current.fen); let mm; try { mm = probe.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch (e) { return false; }
    ui.state.locked = true; status.className = 'pz-status'; status.replaceChildren(icon('cpu', 18), 'Checking…');
    const r = await check(m);
    if (!alive) return false;
    if (r.ok) {
      ui.state.chess.move({ from: m.from, to: m.to, promotion: m.promotion }); playForMove(mm, probe.inCheck());
      ui.board.setPosition(ui.state.chess.fen(), { lastMove: { from: mm.from, to: mm.to }, animate: false });
      status.className = 'pz-status good'; status.replaceChildren(icon('check', 18), r.exact ? 'Yes — that is the move.' : `${mm.san} works too. The engine's pick was ${current.bestSan}.`);
      if (!solvedOnce) { grade(tries === 0); trackPlan({ kind: 'mistakes', tag: current.tag }); store.logActivity('puzzles', 0); }
      solvedOnce = true; explain(); btnNext.classList.remove('hidden'); btnHint.disabled = btnSol.disabled = true; sfx('win'); return true;
    }
    tries++; ui.state.locked = false; ui.board.shake(); sfx('bad');
    ui.board.setPosition(current.fen, { animate: false });
    status.className = 'pz-status bad'; status.replaceChildren(icon('x', 18), r.same ? `${mm.san} is the move you played in the game. Look for something better.` : `${mm.san} doesn't solve it. Try again.`);
    return false;
  };
  function reveal() {
    if (!solvedOnce) { grade(false); solvedOnce = true; }
    ui.reveal(); explain(); status.className = 'pz-status bad'; status.replaceChildren(icon('eye', 18), `Answer: ${current.bestSan}`);
    btnNext.classList.remove('hidden'); btnHint.disabled = btnSol.disabled = true;
  }
  function next() {
    const q = queue();
    if (!q.length) { const left = all(); root.replaceChildren(h('div.card', emptyState('check', left.length ? 'All caught up!' : 'No mistakes saved yet', left.length ? 'Nothing is due right now. The coach will bring these back at spaced intervals so they stick.' : 'Play a game, then analyze it — the mistakes the coach finds will become training positions here.', h('div.row', { style: { justifyContent: 'center' } }, h('a.btn.primary', { href: left.length ? '#/train' : '#/analyze' }, left.length ? 'Back to training' : 'Analyze a game'))))); return; }
    current = q[0]; solvedOnce = false; tries = 0;
    const p = { f: current.fen, m: [current.best], t: current.themes || [] };
    ui.load(p);
    title.textContent = `${current.color === 'w' ? 'White' : 'Black'} to move`;
    root.querySelector('#mm').textContent = `Move ${current.moveNo} of one of your games · ${q.length} due`;
    status.className = 'pz-status'; status.replaceChildren(icon('target', 18), 'You went wrong here. Find a better move.');
    info.replaceChildren(); btnNext.classList.add('hidden'); btnHint.disabled = btnSol.disabled = false;
  }
  next();
  return () => { alive = false; ui.board.destroy(); };
}
