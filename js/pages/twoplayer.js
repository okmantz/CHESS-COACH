/* Two-player mode: two people share one screen and play each other. No bot, no rating.
   Optional coach help: off · commentary on every move · commentary + hints (with arrows and a "why" card). */
import { Chess } from '../../vendor/chess.js';
import * as store from '../store.js';
import { h, icon, toast, modal, confirmDialog, fmtTime } from '../ui.js';
import { Board } from '../board.js';
import { legalTargetsFor, checkSquare, gameOverReason, uciOf, engineSafe } from '../chessutil.js';
import { playerBar } from '../components.js';
import { coachDock, moveStrip } from '../gameui.js';
import { buildPgn, START_FEN } from '../analysis.js';
import { play as sfx, playForMove } from '../sound.js';
import { describePlayed, whyMove } from '../visual.js';
import { normLines } from '../pvutil.js';
import { whyCard, legend } from '../whyui.js';
import { trackPlan } from '../plan.js';

const KEY = 'chesscoach.live2p';
const SETUP_KEY = 'chesscoach.setup2p';
const TCS = [
  { id: 'unlimited', label: '∞', sub: 'Unlimited', ms: 0, inc: 0 },
  { id: '3+0', label: '3+0', sub: 'Blitz', ms: 180000, inc: 0 },
  { id: '3+2', label: '3+2', sub: 'Blitz', ms: 180000, inc: 2000 },
  { id: '5+0', label: '5+0', sub: 'Blitz', ms: 300000, inc: 0 },
  { id: '5+3', label: '5+3', sub: 'Blitz', ms: 300000, inc: 3000 },
  { id: '10+0', label: '10+0', sub: 'Rapid', ms: 600000, inc: 0 },
  { id: '15+10', label: '15+10', sub: 'Rapid', ms: 900000, inc: 10000 },
  { id: '30+0', label: '30+0', sub: 'Classical', ms: 1800000, inc: 0 },
];
const HELP = [['off', 'Off', 'Just the two of you.'], ['talk', 'Commentary', 'The coach explains each move, with arrows on the board.'], ['hints', 'Commentary + hints', 'Adds a Hint button that shows the best move and why.']];

export default async function twoPlayerPage(view, ctx) {
  let teardown = () => {};
  let disposed = false;
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } })();
  const showSetup = () => {
    if (disposed) return;
    teardown(); teardown = () => {};
    view.replaceChildren(setupView(saved && !ctx.query.new && localStorage.getItem(KEY) ? JSON.parse(localStorage.getItem(KEY)) : null, (cfg) => start(cfg, null), (st) => start(null, st)));
  };
  const start = (cfg, resume) => {
    teardown();
    const g = gameView(view, ctx, cfg, resume, showSetup, () => start(cfg || { names: resume.names, tc: resume.tc, flip: resume.flip, help: resume.help }, null));
    teardown = g.destroy;
  };
  showSetup();
  return () => { disposed = true; teardown(); };
}

/* ------------------------------------------------------------------ setup */
function setupView(resumable, onStart, onResume) {
  const last = (() => { try { return JSON.parse(localStorage.getItem(SETUP_KEY)) || {}; } catch (e) { return {}; } })();
  const cfg = { names: last.names || ['White', 'Black'], tc: last.tc || 'unlimited', flip: last.flip !== false, help: last.help || 'talk' };
  const root = h('div.page');
  const tcBox = h('div.tc-grid');
  const helpBox = h('div.col');
  const flipRow = h('div');
  const nameIn = (i) => h('input', { type: 'text', value: cfg.names[i] === (i ? 'Black' : 'White') ? '' : cfg.names[i], placeholder: i ? 'Black' : 'White', maxlength: 20, oninput: (e) => { cfg.names[i] = e.target.value.trim() || (i ? 'Black' : 'White'); } });
  const draw = () => {
    tcBox.replaceChildren(...TCS.map((t) => h('button', { class: t.id === cfg.tc ? 'active' : '', onclick: () => { cfg.tc = t.id; draw(); } }, t.label, h('small', t.sub))));
    helpBox.replaceChildren(h('div.seg', HELP.map(([k, l]) => h('button', { class: cfg.help === k ? 'active' : '', onclick: () => { cfg.help = k; draw(); } }, l))),
      h('div.small.muted', HELP.find((x) => x[0] === cfg.help)[2]));
    flipRow.replaceChildren(h('div.setting', h('div', h('div.s-title', 'Turn the board after every move'), h('div.s-sub', cfg.flip ? 'The board faces whoever is to move — good for passing a phone back and forth.' : 'The board stays put — good for sitting on opposite sides of a tablet.')),
      h('label.switch', h('input', { type: 'checkbox', checked: cfg.flip, onchange: (e) => { cfg.flip = e.target.checked; draw(); } }), h('i'))));
  };
  draw();
  root.append(h('div',
    h('div.page-head', h('a.back', { href: '#/play' }, icon('left', 16), 'Play'), h('h1', 'Two players')),
    resumable ? h('div.card.mb', { style: { borderColor: 'var(--accent)' } }, h('div.row', h('div.grow', h('b', 'Game in progress'), h('div.small.muted', `${resumable.names[0]} vs ${resumable.names[1]} · ${resumable.sans.length} moves`)),
      h('button.btn.primary', { onclick: () => onResume(resumable) }, 'Resume'), h('button.btn.ghost', { onclick: () => { localStorage.removeItem(KEY); location.hash = '#/two-player?new=1'; location.reload(); } }, 'Abandon'))) : null,
    h('div.twop-setup',
      h('div.col',
        h('div.card', h('div.card-title', icon('user', 18), 'Players'), h('div.name-fields',
          h('label.nf', h('span.tag-dot', h('i.w'), 'White'), nameIn(0)), h('label.nf', h('span.tag-dot', h('i.b'), 'Black'), nameIn(1)))),
        h('div.card', h('div.card-title', icon('clock', 18), 'Time control'), tcBox)),
      h('div.col',
        h('div.card', h('div.card-title', icon('bulb', 18), 'Coach help'), helpBox),
        h('div.card', flipRow),
        h('button.btn.primary.big.block', { onclick: () => { localStorage.setItem(SETUP_KEY, JSON.stringify(cfg)); onStart({ ...cfg, names: [...cfg.names] }); } }, icon('play', 18), 'Start game')))));
  return root;
}

/* ------------------------------------------------------------------ game */
function gameView(view, ctx, cfg, resume, back, rematch) {
  const s0 = store.get();
  const st = resume ? { ...resume } : { names: cfg.names, tc: cfg.tc, flip: cfg.flip, help: cfg.help, sans: [], clocks: null, undone: 0, hints: 0, start: Date.now() };
  const tc = TCS.find((t) => t.id === st.tc) || TCS[0];
  const chess = new Chess();
  for (const san of st.sans) chess.move(san);
  const clocks = st.clocks || { w: tc.ms, b: tc.ms };
  const settings = s0.settings;
  let alive = true, over = false, view_ply = null, lastTick = Date.now(), hintBusy = false;
  let shown = null; // what the coach is currently drawing: { arrows, marks }
  const showArrows = settings.showArrows !== false;
  const talk = st.help !== 'off';

  const board = new Board(h('div'), { orientation: 'w', coords: settings.coords, legalDots: settings.legalDots, autoQueen: settings.autoQueen, animate: settings.animations, interactive: true,
    canSelect: (sq) => !over && view_ply === null && chess.get(sq) && chess.get(sq).color === chess.turn(),
    legalTargets: (sq) => legalTargetsFor(chess, sq), onMove: (m) => move(m) });
  const bars = {
    w: playerBar({ name: st.names[0], color: 'w', avatarEl: h('div.avatar-dot.w') }),
    b: playerBar({ name: st.names[1], color: 'b', avatarEl: h('div.avatar-dot.b') }),
  };
  const topSlot = h('div.twop-bar'), botSlot = h('div.twop-bar');
  const turnLine = h('div.twop-turn');
  const dock = coachDock();
  if (!talk) dock.el.classList.add('hidden');
  const btn = (ic, label, fn) => h('button.btn', { onclick: fn, 'aria-label': label }, icon(ic, 18), h('span', label));
  const bUndo = btn('undo', 'Takeback', () => takeback());
  const bHint = btn('bulb', 'Hint', () => hint());
  const bDraw = btn('draw', 'Draw', () => offerDraw());
  const bResign = btn('flag', 'Resign', () => resign());
  const bFlip = btn('flip', 'Flip', () => { board.flip(); seat(); });
  const controls = h('div.actions-bar', bUndo, st.help === 'hints' ? bHint : null, bDraw, bResign, bFlip);
  const strip = moveStrip({ onPrev: () => goPly((view_ply ?? chess.history().length) - 1), onNext: () => goPly(view_ply == null ? null : view_ply + 1), onSelect: (i) => goPly(i + 1) });
  const overlayRow = h('div.coach-visual-note.hidden');

  view.replaceChildren(h('div.page.game', h('div.game-layout.fit',
    h('div.board-col',
      h('div.row.between.nowrapr.game-head', h('button.back', { onclick: leave, style: { margin: 0 } }, icon('left', 16), 'Setup'), h('div.row.tight', h('span.tag.accent', 'Two players'), h('span.tag', tc.ms ? tc.label : 'No clock'))),
      topSlot, h('div.board-box', board.el), botSlot, turnLine),
    h('div.side-col', strip.el, controls, overlayRow, dock.el))));
  document.body.classList.add('in-game');

  /* bars sit on the side of the board their colour is on */
  function seat() {
    const bottom = board.orientation, topC = bottom === 'w' ? 'b' : 'w';
    topSlot.replaceChildren(bars[topC].el); botSlot.replaceChildren(bars[bottom].el);
  }
  const persist = () => { if (over) { localStorage.removeItem(KEY); return; } try { localStorage.setItem(KEY, JSON.stringify({ ...st, sans: chess.history(), clocks })); } catch (e) { /* ignore */ } };
  const lastMoveAt = (n) => { const hv = chess.history({ verbose: true }); const m = hv[(n == null ? hv.length : n) - 1]; return m ? { from: m.from, to: m.to } : null; };
  const fenAt = (n) => { if (n == null || n >= chess.history().length) return chess.fen(); const c = new Chess(); const hist = chess.history(); for (let i = 0; i < n; i++) c.move(hist[i]); return c.fen(); };

  function renderMoves() {
    const hist = chess.history(); const idx = view_ply == null ? hist.length - 1 : view_ply - 1;
    strip.setMoves(hist, idx); strip.setNav(hist.length > 0 && (view_ply == null || view_ply > 0), view_ply != null);
  }
  function refresh(fen = chess.fen()) {
    for (const c of ['w', 'b']) { bars[c].setCaptured(fen); bars[c].setClock(clocks[c], !over && chess.turn() === c, tc.ms > 0); bars[c].el.classList.toggle('on-turn', !over && chess.turn() === c); bars[c].el.classList.toggle('low-clock', clocks[c] < 20000 && tc.ms > 0); }
    bUndo.disabled = over || !chess.history().length; bDraw.disabled = over || chess.history().length < 2; bHint.disabled = over || hintBusy;
    const t = chess.turn();
    turnLine.replaceChildren(over ? '' : h('span', h('i.dot', { class: t }), `${st.names[t === 'w' ? 0 : 1]} to move`, chess.inCheck() ? ' — check!' : ''));
  }
  function goPly(n) {
    const len = chess.history().length;
    view_ply = n == null || n >= len ? null : Math.max(0, n);
    board.clearOverlays(); shown = null; overlayRow.classList.add('hidden');
    board.setPosition(fenAt(view_ply), { lastMove: lastMoveAt(view_ply), animate: false, check: view_ply == null ? checkSquare(chess) : null });
    board.setInteractive(view_ply == null && !over);
    renderMoves(); refresh(fenAt(view_ply));
  }

  /* ---- the visual coach: describe the move just played, on the board ---- */
  function narrate(fenBefore, mv) {
    if (!talk) return;
    let d = null;
    try { d = describePlayed({ fenBefore, uci: uciOf(mv), viewer: null }); } catch (e) { d = null; }
    if (!d) return;
    const who = st.names[mv.color === 'w' ? 0 : 1];
    const text = [d.sentences.join(' '), d.threatText].filter(Boolean).join(' ');
    const draw = () => { if (!d.overlay) return; shown = d.overlay; board.setOverlay({ arrows: showArrows ? d.overlay.arrows : [], marks: d.overlay.marks }); };
    const show = h('button.btn.small', { onclick: () => { if (view_ply !== null) goPly(null); draw(); } }, icon('eye', 14), 'Show on board');
    const node = [h('p', h('b', `${who}: ${d.san}`)), text ? h('p', text) : null, d.overlay && d.overlay.legend.length ? legend(d.overlay.legend) : null, d.overlay ? show : null].filter(Boolean);
    dock.el.classList.remove('hidden'); dock.say(node);
    draw();   // arrows appear straight away; the button brings them back after they are cleared
  }

  function move(m) {
    if (over || view_ply !== null) return false;
    const fenBefore = chess.fen();
    let mv; try { mv = chess.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch (e) { return false; }
    if (!mv) return false;
    playForMove(mv, chess.inCheck());
    if (tc.ms) clocks[mv.color] += tc.inc;
    board.clearOverlays(); shown = null;
    board.setPosition(chess.fen(), { lastMove: { from: mv.from, to: mv.to }, animate: false, check: checkSquare(chess) });
    renderMoves(); refresh(); persist();
    narrate(fenBefore, mv);
    if (!checkEnd() && st.flip) { setTimeout(() => { if (alive && !over) { board.flip(chess.turn()); seat(); } }, 650); }
    return true;
  }
  function checkEnd() {
    const r = gameOverReason(chess);
    if (!r) return false;
    finish(chess.isCheckmate() ? (chess.turn() === 'w' ? '0-1' : '1-0') : '1/2-1/2', r);
    return true;
  }

  /* ---- hints: engine best move, drawn with a why card ---- */
  async function hint() {
    if (over || hintBusy || view_ply !== null) return;
    hintBusy = true; refresh(); st.hints++;
    const fen = chess.fen();
    try {
      if (!engineSafe(fen)) throw new Error('bad position');
      const engine = await ctx.engine();
      const r = await engine.go({ fen, depth: 14, multipv: 3 });
      if (!alive || fen !== chess.fen()) return;
      const lines = r.lines.filter((l) => l.pv && l.pv.length);
      const best = lines[0]; if (!best) throw new Error('no line');
      const why = whyMove({ fen, uci: best.pv[0], pv: best.pv, lines: normLines(lines, 3), idx: 0, rootColor: chess.turn() });
      if (!why) throw new Error('no why');
      const mark = why.overlay || { arrows: [], marks: {} };
      shown = mark; board.setOverlay({ arrows: showArrows ? mark.arrows : [], marks: mark.marks });
      dock.el.classList.remove('hidden');
      dock.say([h('p', h('b', `Hint for ${st.names[chess.turn() === 'w' ? 0 : 1]}`)), whyCard(why, { onSquares: (s) => board.flashSquares(s) })]);
    } catch (e) { toast('The coach could not analyse this position'); }
    hintBusy = false; refresh();
  }

  async function takeback() {
    if (over || !chess.history().length) return;
    chess.undo(); st.undone++;
    view_ply = null; board.clearOverlays(); shown = null;
    board.setPosition(chess.fen(), { lastMove: lastMoveAt(null), animate: false, check: checkSquare(chess) });
    board.setInteractive(true); renderMoves(); refresh(); persist(); sfx('move');
    if (st.flip) { board.flip(chess.turn()); seat(); }
  }
  async function offerDraw() {
    if (over || chess.history().length < 2) return;
    const t = chess.turn(), other = st.names[t === 'w' ? 0 : 1];
    if (await confirmDialog(`${st.names[t === 'w' ? 1 : 0]} offers a draw. ${other}, do you accept?`, { ok: 'Accept draw', cancel: 'Decline', title: 'Draw offer' })) finish('1/2-1/2', 'agreement');
  }
  async function resign() {
    if (over) return;
    const m = modal(h('div.col', h('h3', 'Who resigns?'), h('div.resign-pick',
      h('button.btn', { onclick: () => { m.close(); finish('0-1', `${st.names[0]} resigned`); } }, st.names[0]),
      h('button.btn', { onclick: () => { m.close(); finish('1-0', `${st.names[1]} resigned`); } }, st.names[1])), h('button.btn.ghost', { onclick: () => m.close() }, 'Cancel')), { dismissible: true });
  }
  function leave() { if (!over && chess.history().length) { toast('Game saved — resume it any time'); persist(); } back(); }

  /* ---- end ---- */
  function finish(result, reason) {
    if (over) return;
    over = true; clearInterval(timer); board.setInteractive(false); refresh(); sfx('end');
    const sans = chess.history();
    const pgn = buildPgn({ sans, headers: { White: st.names[0], Black: st.names[1], Result: result, TimeControl: tc.ms ? `${tc.ms / 1000}+${tc.inc / 1000}` : '-', Termination: reason } });
    const id = store.saveGame({ source: 'twoplayer', color: 'none', result, sans, pgn, headers: { White: st.names[0], Black: st.names[1], Result: result }, startFen: START_FEN, moves: sans.length, tc: tc.id });
    store.logActivity('games'); localStorage.removeItem(KEY); trackPlan({ kind: 'play' }); ctx.refreshChrome();
    const winner = result === '1-0' ? st.names[0] : result === '0-1' ? st.names[1] : null;
    const m = modal(h('div.col', { style: { textAlign: 'center' } }, h('div', { style: { fontSize: '46px' } }, winner ? '🏆' : '🤝'), h('h2', winner ? `${winner} wins!` : 'Draw'), h('div.muted', `by ${reason}`),
      h('div.col', h('a.btn.primary.block', { href: `#/analyze?game=${id}`, onclick: () => m.close() }, icon('search', 18), 'Analyze with coach'),
        h('div.row', { style: { flexWrap: 'nowrap' } }, h('button.btn.grow', { onclick: () => { m.close(); back(); } }, 'New game'), h('button.btn.grow', { onclick: () => { m.close(); rematch(); } }, 'Rematch')))), { dismissible: true });
  }

  const timer = setInterval(() => {
    const now = Date.now(), dt = now - lastTick; lastTick = now;
    if (over || !tc.ms || chess.history().length < 2) return;
    const c = chess.turn(); clocks[c] -= dt;
    if (clocks[c] <= 0) { clocks[c] = 0; refresh(); finish(c === 'w' ? '0-1' : '1-0', 'time'); return; }
    bars[c].setClock(clocks[c], true, true); bars[c].el.classList.toggle('low-clock', clocks[c] < 20000);
  }, 100);

  /* ---- boot ---- */
  board.flip(st.flip ? chess.turn() : 'w'); seat();
  board.setPosition(chess.fen(), { lastMove: lastMoveAt(null), animate: false, check: checkSquare(chess) });
  renderMoves(); refresh();
  if (!resume) sfx('start');
  if (talk && !resume) dock.say('Two players, one board. I will explain each move as it is played — tap "Show on board" to see it again.');
  checkEnd();

  const onKey = (e) => { if (e.target.matches('input,textarea')) return; if (e.key === 'ArrowLeft') goPly((view_ply ?? chess.history().length) - 1); if (e.key === 'ArrowRight') goPly(view_ply == null ? null : view_ply + 1); };
  document.addEventListener('keydown', onKey);
  const onHide = () => persist(); window.addEventListener('pagehide', onHide);
  return { destroy() { alive = false; clearInterval(timer); document.body.classList.remove('in-game'); document.removeEventListener('keydown', onKey); window.removeEventListener('pagehide', onHide); if (!over) persist(); board.destroy(); } };
}
