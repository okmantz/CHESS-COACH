import { Chess } from '../../vendor/chess.js';
import * as store from '../store.js';
import { h, icon, toast, modal, confirmDialog, avatar, fmtTime } from '../ui.js';
import { Board } from '../board.js';
import { LEVELS, levelByN, botMove, botWantsToResign, botAcceptsDraw } from '../bot.js';
import { updateRating, rankOf, PROVISIONAL_GAMES } from '../rating.js';
import { legalTargetsFor, checkSquare, gameOverReason, uciOf, engineSafe } from '../chessutil.js';
import { playerBar } from '../components.js';
import { opponentStage, coachDock, moveStrip } from '../gameui.js';
import { opponentPicker } from '../ladderui.js';
import { roadStrip } from '../ladderui.js';
import { react, best as bestReaction, line as personaLine } from '../personas.js';
import { currentRung } from '../ladder.js';
import { buildPgn, START_FEN, evalToCp } from '../analysis.js';
import { makeHint } from '../coach.js';
import { play as sfx, playForMove } from '../sound.js';
import { trackPlan } from '../plan.js';
import { crownsFor, recordCrowns, crownBanner } from '../crowns.js';
import { describePlayed } from '../visual.js';
import { legend as visLegend } from '../whyui.js';

const LIVE_KEY = 'chesscoach.live';
const TCS = [
  { id: 'unlimited', label: '∞', sub: 'Unlimited', ms: 0, inc: 0 },
  { id: '1+0', label: '1+0', sub: 'Bullet', ms: 60000, inc: 0 },
  { id: '2+1', label: '2+1', sub: 'Bullet', ms: 120000, inc: 1000 },
  { id: '3+0', label: '3+0', sub: 'Blitz', ms: 180000, inc: 0 },
  { id: '3+2', label: '3+2', sub: 'Blitz', ms: 180000, inc: 2000 },
  { id: '5+0', label: '5+0', sub: 'Blitz', ms: 300000, inc: 0 },
  { id: '5+3', label: '5+3', sub: 'Blitz', ms: 300000, inc: 3000 },
  { id: '10+0', label: '10+0', sub: 'Rapid', ms: 600000, inc: 0 },
  { id: '15+10', label: '15+10', sub: 'Rapid', ms: 900000, inc: 10000 },
  { id: '30+0', label: '30+0', sub: 'Classical', ms: 1800000, inc: 0 },
];

const closestLevel = (r) => LEVELS.reduce((b, l) => (Math.abs(l.elo - r) < Math.abs(b.elo - r) ? l : b), LEVELS[0]).n;
const evCp = (e, color) => (!e ? null : (e.mate != null ? (e.mate > 0 ? 10000 : -10000) : e.cp) * (color === 'w' ? 1 : -1));

export default async function playPage(view, ctx) {
  let disposed = false;
  let teardown = () => {};
  const live = (() => { try { return JSON.parse(localStorage.getItem(LIVE_KEY)); } catch (e) { return null; } })();
  const showSetup = () => {
    if (disposed) return;
    teardown(); teardown = () => {};
    view.replaceChildren(setupView(live && !ctx.query.new ? live : null, (cfg) => startGame(cfg), (saved) => startGame(null, saved)));
  };
  const startGame = (cfg, resume) => {
    teardown();
    const g = gameView(view, ctx, cfg, resume, showSetup, () => startGame({ ...cfg, color: cfg.color === 'w' ? 'b' : 'w' }));
    teardown = g.destroy;
  };
  showSetup();
  return () => { disposed = true; teardown(); };
}

/* ------------------------------------------------------------------ setup */
function setupView(resumable, onStart, onResume) {
  const s = store.get();
  const rating = Math.round(s.rating.value);
  const last = JSON.parse(localStorage.getItem('chesscoach.lastsetup') || 'null') || {};
  const cfg = { level: last.level || Math.min(currentRung(), closestLevel(rating) + 1), color: last.color || 'w', tc: last.tc || s.settings.defaultTime || 'unlimited', rated: last.rated !== false };
  const rk = rankOf(s.rating.value);
  const root = h('div.page');

  const picker = opponentPicker(cfg, { rating, onChange: () => draw() });
  const tcBox = h('div.tc-grid');
  const colorBox = h('div.color-pick');
  const ratedRow = h('div');

  const draw = () => {
    const cur = levelByN(cfg.level);
    /* opponent picker is built once below; here we only refresh the dependent rows */
    tcBox.replaceChildren(...TCS.map((t) => h('button', { class: t.id === cfg.tc ? 'active' : '', onclick: () => { cfg.tc = t.id; draw(); } }, t.label, h('small', t.sub))));
    colorBox.replaceChildren(...[['w', 'White', 'wk'], ['r', 'Random', 'wn'], ['b', 'Black', 'bk']].map(([id, name, code]) => h('button', { class: cfg.color === id ? 'active' : '', onclick: () => { cfg.color = id; draw(); } },
      h('div.piece', { class: `p-${code}` }), name)));
    const L = levelByN(cfg.level);
    const diff = L.elo - rating;
    ratedRow.replaceChildren(h('div.setting', h('div', h('div.s-title', 'Rated game'), h('div.s-sub', cfg.rated ? `Counts toward your rating. ${diff > 250 ? 'This is a big step up — a win would be worth a lot.' : diff < -300 ? 'Much weaker than you: little to gain here.' : 'A good match for your level.'}` : 'Practice only — rating stays unchanged.')),
      h('label.switch', h('input', { type: 'checkbox', checked: cfg.rated, onchange: (e) => { cfg.rated = e.target.checked; draw(); } }), h('i'))));
  };
  draw();

  root.append(h('div',
    h('div.page-head', h('h1', 'Play')),
    h('a.card.click.mb.coach-banner', { href: '#/coach-play' }, h('div.row.nowrapr', h('div.course-icon', '🤝'), h('div.grow', h('b', 'Play a game with Coach'), h('div.small.muted', 'A guided game: the coach asks you the right questions before you move, stops blunders, and reviews your habits afterwards.')), h('span.btn.primary', 'Start', icon('right', 16)))),
    h('a.card.click.mb.coach-banner', { href: '#/two-player' }, h('div.row.nowrapr', h('div.course-icon', '👥'), h('div.grow', h('b', 'Play a friend — two players'), h('div.small.muted', 'Share one screen and play each other. The board can turn each move, and the coach can explain the moves with arrows.')), h('span.btn', 'Play', icon('right', 16)))),
    resumable ? h('div.card.mb', { style: { borderColor: 'var(--accent)' } }, h('div.row', h('div.grow', h('b', 'Game in progress'), h('div.small.muted', `vs ${levelByN(resumable.level).who} · ${resumable.sans.length} moves`)),
      h('button.btn.primary', { onclick: () => onResume(resumable) }, 'Resume'), h('button.btn.ghost', { onclick: () => { localStorage.removeItem(LIVE_KEY); location.hash = '#/play?new=1'; location.reload(); } }, 'Abandon'))) : null,
    h('div.card.mb.row', h('div.rank-ring', { style: { '--p': rk.progress * 100, '--c': rk.color } }, h('div', h('b', String(rating)), h('span', rk.name))),
      h('div.grow', h('b', s.rating.games < PROVISIONAL_GAMES ? 'Provisional rating' : 'Your rating'),
        h('div.small.muted', s.rating.games < PROVISIONAL_GAMES ? `${PROVISIONAL_GAMES - s.rating.games} more rated games to settle your rating. It moves fast at first.` : rk.next ? `${Math.round(rk.next.min - s.rating.value)} points to ${rk.next.name}` : 'Top rank reached'),
        h('div.small.muted', `${s.rating.games} rated games · peak ${Math.round(s.rating.peak)}`))),
    h('div.game-setup-grid', { style: { display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' } },
      h('div.col', h('div.card', h('div.card-title', icon('cpu', 18), 'Choose your opponent'), picker, h('div.mt', roadStrip()))),
      h('div.col',
        h('div.card', h('div.card-title', icon('user', 18), 'Play as'), colorBox),
        h('div.card', h('div.card-title', icon('clock', 18), 'Time control'), tcBox),
        h('div.card', ratedRow),
        h('button.btn.primary.big.block', { onclick: () => { localStorage.setItem('chesscoach.lastsetup', JSON.stringify(cfg)); onStart({ ...cfg, color: cfg.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : cfg.color }); } }, icon('play', 18), 'Start game'))),
  ));
  return root;
}

/* ------------------------------------------------------------------ game */
function gameView(view, ctx, cfg, resume, back, rematch) {
  const s0 = store.get();
  const st = resume ? { ...resume } : {
    level: cfg.level, color: cfg.color, tc: cfg.tc, rated: cfg.rated, sans: [], ucis: [], start: Date.now(),
    clocks: null, helped: false, undone: 0, hints: 0, hintFens: [],
  };
  st.hintFens = st.hintFens || [];   // positions where a hint was requested (crowns count one hint per position)
  const L = levelByN(st.level);
  const tc = TCS.find((t) => t.id === st.tc) || TCS[0];
  const me = st.color, bot = me === 'w' ? 'b' : 'w';
  const chess = new Chess();
  for (const san of st.sans) chess.move(san);
  const clocks = st.clocks || { w: tc.ms, b: tc.ms };
  let lastBot = null;
  let alive = true, over = false, token = 0, thinking = false, lastTick = Date.now(), evalHist = [], lastEval = null, prevBotEval = null;
  let view_ply = null; // null = live, else index being reviewed
  const settings = s0.settings;

  // UI
  const board = new Board(h('div'), { orientation: me, coords: settings.coords, legalDots: settings.legalDots, autoQueen: settings.autoQueen, animate: settings.animations,
    interactive: true,
    canSelect: (sq) => !over && !thinking && view_ply === null && chess.turn() === me && chess.get(sq) && chess.get(sq).color === me,
    legalTargets: (sq) => legalTargetsFor(chess, sq),
    onMove: (m) => humanMove(m),
  });
  const boardBox = h('div.board-box', board.el);
  const stage = opponentStage(L, { color: bot, chat: settings.botChat !== false });
  const profile = s0.profile;
  const bottom = playerBar({ name: profile.name, rating: Math.round(s0.rating.value), color: me, avatarEl: avatar(profile, 38, { ring: profile.color }) });
  bottom.el.classList.add('me');
  const top = stage; // same API as a player bar: setCaptured / setClock
  const status = h('div.small.muted.center.status-line', { style: { minHeight: '18px' } });
  const dock = coachDock();
  dock.el.classList.add('hidden');

  const btn = (ic, label, fn, cls = '') => h('button.btn', { class: cls, onclick: fn, 'aria-label': label }, icon(ic, 18), h('span', label));
  const bUndo = btn('undo', 'Takeback', () => takeback());
  const bHint = btn('bulb', 'Hint', () => hint());
  const bWhy = btn('eye', 'Why?', () => explainBot());
  const bDraw = btn('draw', 'Draw', () => offerDraw());
  const bResign = btn('flag', 'Resign', () => resign());
  const bFlip = btn('flip', 'Flip', () => board.flip());
  const controls = h('div.actions-bar', bUndo, bHint, bWhy, bDraw, bResign, bFlip);
  const strip = moveStrip({ onPrev: () => goPly((view_ply ?? chess.history().length) - 1), onNext: () => goPly(view_ply == null ? null : view_ply + 1), onSelect: (i) => goPly(i + 1) });

  const layout = h('div.game-layout.fit',
    h('div.board-col',
      h('div.row.between.nowrapr.game-head', h('button.back', { onclick: leave, style: { margin: 0 } }, icon('left', 16), 'Setup'), h('div.row.tight', h('span.tag', st.rated ? 'Rated' : 'Casual'), h('span.tag', tc.sub === 'Unlimited' ? 'No clock' : tc.label))),
      stage.el, boardBox, bottom.el, status),
    h('div.side-col', strip.el, controls, dock.el));
  view.replaceChildren(h('div.page.game', layout));
  document.body.classList.add('in-game');
  board.o.interactive = true;

  function persist() {
    if (over) { localStorage.removeItem(LIVE_KEY); return; }
    try { localStorage.setItem(LIVE_KEY, JSON.stringify({ ...st, sans: chess.history(), ucis: chess.history({ verbose: true }).map(uciOf), clocks })); } catch (e) { /* ignore */ }
  }

  function renderMoves() {
    const hist = chess.history();
    const idx = view_ply == null ? hist.length - 1 : view_ply - 1;
    strip.setMoves(hist, idx);
    strip.setNav(hist.length > 0 && (view_ply == null || view_ply > 0), view_ply != null);
  }

  function fenAt(n) {
    if (n == null || n >= chess.history().length) return chess.fen();
    const c = new Chess(); const hist = chess.history();
    for (let i = 0; i < n; i++) c.move(hist[i]);
    return c.fen();
  }
  function lastMoveAt(n) {
    const hv = chess.history({ verbose: true }); const k = n == null ? hv.length : n;
    const m = hv[k - 1]; return m ? { from: m.from, to: m.to } : null;
  }
  function goPly(n) {
    const len = chess.history().length;
    if (n == null || n >= len) view_ply = null; else view_ply = Math.max(0, n);
    const fen = fenAt(view_ply);
    board.setPosition(fen, { lastMove: lastMoveAt(view_ply), animate: false, check: view_ply == null ? checkSquare(chess) : null });
    board.setInteractive(view_ply == null && !over && chess.turn() === me && !thinking);
    renderMoves(); refreshBars(fen);
  }

  function refreshBars(fen = chess.fen()) {
    top.setCaptured(fen); bottom.setCaptured(fen);
    const show = tc.ms > 0;
    const tmr = (c) => clocks[c];
    top.setClock(tmr(bot), !over && chess.turn() === bot, show);
    bottom.setClock(tmr(me), !over && chess.turn() === me, show);
    bUndo.disabled = over || chess.history().length < (me === 'w' ? 1 : 2) || thinking && false;
    bHint.disabled = over || chess.turn() !== me || thinking;
    bWhy.disabled = over || !lastBot || thinking;
    bDraw.disabled = over || chess.history().length < 2;
    status.textContent = over ? '' : thinking ? `${L.who} is thinking…` : chess.turn() === me ? (chess.inCheck() ? 'Check! Your move.' : 'Your move') : '';
  }

  function afterMove(mv, bySelf) {
    playForMove(mv, chess.inCheck());
    if (tc.ms > 0) { /* increment applies to the mover */ clocks[mv.color] += tc.inc; }
    dock.clear(); dock.el.classList.add('hidden');
    board.clearOverlays();
    board.setPosition(chess.fen(), { lastMove: { from: mv.from, to: mv.to }, animate: bySelf ? false : [{ from: mv.from, to: mv.to }], check: checkSquare(chess) });
    renderMoves(); refreshBars(); persist();
  }

  async function humanMove(m) {
    if (over || thinking || view_ply !== null || chess.turn() !== me) return false;
    let mv;
    try { mv = chess.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch (e) { return false; }
    if (!mv) return false;
    afterMove(mv, true);
    if (!checkEnd()) botTurn();
    return true;
  }

  function checkEnd() {
    const r = gameOverReason(chess);
    if (r) { finish(chess.isCheckmate() ? (chess.turn() === me ? 'loss' : 'win') : 'draw', r); return true; }
    return false;
  }

  async function botTurn() {
    if (over || chess.turn() !== bot) return;
    const my = ++token;
    thinking = true; board.setInteractive(false); refreshBars();
    const t0 = Date.now();
    try {
      const engine = await ctx.engine();
      if (my !== token || !alive) return;
      if (!engineSafe(chess.fen())) throw new Error('bad position');
      const res = await botMove(engine, chess.fen(), st.level, { clock: tc.ms ? { ms: clocks[bot], inc: tc.inc } : null });
      if (my !== token || !alive) return;
      lastEval = res.eval; if (res.eval) updateEvalHist(res.eval);
      // human-like pacing for the weaker bots
      const wait = Math.max(0, (L.n <= 6 ? 350 + Math.random() * 500 : 150) - (Date.now() - t0));
      if (wait) await new Promise((r) => setTimeout(r, wait));
      if (my !== token || !alive) return;
      if (chess.history().length >= 8 && botWantsToResign(st.level, res.eval, bot, evalHist)) { thinking = false; toast(`${L.who} resigns`, 'good'); finish('win', `${L.who} resigned`); return; }
      const fenBeforeBot = chess.fen();
      const mv = chess.move({ from: res.uci.slice(0, 2), to: res.uci.slice(2, 4), promotion: res.uci[4] });
      lastBot = { fenBefore: fenBeforeBot, uci: res.uci };
      if (tc.ms) clocks[bot] -= 0; // time already deducted by ticking
      thinking = false;
      afterMove(mv, false);
      // the opponent reacts out loud (speech bubble)
      const botEval = evCp(res.eval, bot);
      const swingOk = chess.history().length >= 3 && prevBotEval != null;
      const r = bestReaction(
        swingOk ? react(L.n, { mover: 'user', botEval, prevEval: prevBotEval, mv: chess.history({ verbose: true }).slice(-2)[0] }) : null,
        react(L.n, { mover: 'bot', mv, check: chess.inCheck(), botEval, slip: (res.slipCp || 0) >= 120 }));
      prevBotEval = botEval == null ? null : botEval - (res.slipCp || 0);
      if (!checkEnd()) { if (r) stage.say(r.text, { mood: r.mood }); board.setInteractive(true); }
    } catch (e) {
      console.warn('bot error', e);
      thinking = false;
      if (my === token && alive && !over) {
        // fall back to a random legal move so the game never stalls
        const ms = chess.moves({ verbose: true }); if (ms.length) { const m = ms[Math.floor(Math.random() * ms.length)]; const mv = chess.move(m); afterMove(mv, false); if (!checkEnd()) board.setInteractive(true); }
      }
    }
    thinking = false; refreshBars();
    if (!over && view_ply === null) board.setInteractive(chess.turn() === me);
  }
  const evalHistArr = evalHist;
  function updateEvalHist() { /* resign logic keeps own history in botWantsToResign */ }

  /* --- clocks --- */
  const timer = setInterval(() => {
    const now = Date.now(); const dt = now - lastTick; lastTick = now;
    if (over || !tc.ms || chess.history().length < 2) { return; }
    const c = chess.turn();
    clocks[c] -= dt;
    if (clocks[c] <= 0) { clocks[c] = 0; refreshBars(); if (!over) { finish(c === me ? 'loss' : 'win', 'time'); } return; }
    top.setClock(clocks[bot], chess.turn() === bot, true); bottom.setClock(clocks[me], chess.turn() === me, true);
  }, 100);

  /* --- helpers: hint, takeback, draw, resign --- */
  async function hint() {
    if (over || chess.turn() !== me || thinking) return;
    st.helped = true; st.hints++;
    { const key = chess.fen().split(' ').slice(0, 4).join(' '); if (!st.hintFens.includes(key)) st.hintFens.push(key); }
    const level = (hint.level = ((hint.fen === chess.fen() ? hint.level : 0) || 0) + 1);
    hint.fen = chess.fen();
    const engine = await ctx.engine();
    if (!hint.cache || hint.cache.fen !== chess.fen()) {
      status.textContent = 'Coach is looking…';
      const r = await engine.go({ fen: chess.fen(), depth: 14, multipv: 1 });
      hint.cache = { fen: chess.fen(), best: r.lines[0].pv[0] };
    }
    const hh = makeHint(chess.fen(), hint.cache.best, Math.min(3, level));
    board.setHint([hh.from, level >= 3 ? hh.to : null].filter(Boolean));
    if (level >= 3) board.setArrows([{ from: hh.from, to: hh.to, color: '#62b8ff', opacity: 0.85 }]);
    dock.el.classList.remove('hidden'); dock.clear();
    dock.say([h('p', h('b', `Hint ${Math.min(level, 3)} of 3`), ' — using hints makes this game unrated.'), h('p', hh.text), level < 3 ? h('p.small.muted', 'Tap Hint again for a stronger clue.') : null]);
    st.rated = false; refreshBars();
  }

  /** "Why?": the coach explains what the opponent's last move does, drawn on the board. */
  function explainBot() {
    if (over || !lastBot || view_ply !== null) return;
    let d = null; try { d = describePlayed({ fenBefore: lastBot.fenBefore, uci: lastBot.uci, viewer: me }); } catch (e) { d = null; }
    if (!d) { toast('Nothing to show yet'); return; }
    const draw = () => { if (d.overlay) board.setOverlay({ arrows: settings.showArrows === false ? [] : d.overlay.arrows, marks: d.overlay.marks }); };
    draw();
    dock.el.classList.remove('hidden'); dock.clear();
    dock.say([h('p', h('b', `${L.who} played ${d.san}`)), h('p', [d.sentences.join(' '), d.threatText].filter(Boolean).join(' ')), d.overlay && d.overlay.legend.length ? visLegend(d.overlay.legend) : null, h('button.btn.small', { onclick: draw }, icon('eye', 14), 'Show on board')].filter(Boolean));
  }

  async function takeback() {
    if (over) return;
    const hist = chess.history();
    if (!hist.length) return;
    token++; thinking = false; lastBot = null;
    // undo to the human's previous turn
    chess.undo();
    if (chess.turn() !== me && hist.length > 1) chess.undo();
    if (chess.turn() !== me) { /* human is black and only one move played: bot to move again */ }
    st.undone++; st.rated = false;
    dock.clear(); dock.el.classList.add('hidden'); board.clearOverlays();
    view_ply = null;
    board.setPosition(chess.fen(), { lastMove: lastMoveAt(null), animate: false, check: checkSquare(chess) });
    renderMoves(); refreshBars(); persist(); sfx('move');
    toast('Takeback — this game is now unrated');
    if (chess.turn() === bot) botTurn(); else board.setInteractive(true);
  }

  async function resign() {
    if (over) return;
    if (settings.confirmResign && !(await confirmDialog('Resign this game?', { ok: 'Resign', danger: true }))) return;
    finish('loss', 'you resigned');
  }
  async function offerDraw() {
    if (over || chess.history().length < 2) return;
    const ok = botAcceptsDraw(lastEval, bot, chess.history().length) || (L.n <= 3 && Math.random() < 0.5);
    if (ok) { toast('Draw accepted', 'good'); finish('draw', 'agreement'); }
    else toast(`${L.who} declines the draw`, 'warn'); stage.say(personaLine(L.n, 'losing') && (L.n <= 3 ? 'Maybe later. I am having fun!' : 'No draw. Let us keep playing.'));
  }
  function leave() {
    if (!over && chess.history().length) { toast('Game saved — resume it any time'); persist(); }
    back();
  }

  /* --- game end --- */
  function finish(outcome, reason) {
    if (over) return;
    over = true; token++; thinking = false; clearInterval(timer);
    board.setInteractive(false); refreshBars();
    const score = outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0;
    const result = outcome === 'draw' ? '1/2-1/2' : (outcome === 'win') === (me === 'w') ? '1-0' : '0-1';
    const rated = st.rated && !st.helped && chess.history().length >= 4;
    let delta = 0, newR = store.get().rating.value;
    if (rated) {
      const rs = store.get().rating;
      const u = updateRating(rs.value, rs.games, L.elo, score);
      delta = u.delta; newR = u.rating;
      store.update((s) => { s.rating.value = u.rating; s.rating.games++; s.rating.peak = Math.max(s.rating.peak, u.rating); s.rating.history.push({ t: Date.now(), r: Math.round(u.rating), opp: L.elo, score }); if (s.rating.history.length > 400) s.rating.history.shift(); });
    }
    const sans = chess.history();
    const names = me === 'w' ? [store.get().profile.name, `${L.who} (${L.name})`] : [`${L.who} (${L.name})`, store.get().profile.name];
    const pgn = buildPgn({ sans, headers: { White: names[0], Black: names[1], Result: result, WhiteElo: me === 'w' ? Math.round(store.get().rating.value) : L.elo, BlackElo: me === 'b' ? Math.round(store.get().rating.value) : L.elo, TimeControl: tc.id === 'unlimited' ? '-' : `${tc.ms / 1000}+${tc.inc / 1000}`, Termination: reason } });
    const hintsUsed = st.hintFens.length, takebacks = st.undone || 0;
    const crowns = crownsFor({ outcome, hints: hintsUsed, takebacks });
    recordCrowns(L.n, crowns);
    const id = store.saveGame({ source: 'play', color: me, result, outcome, reason, sans, pgn, level: st.level, oppElo: L.elo, oppName: `${L.who} · ${L.name}`, tc: tc.id, rated, ratingDelta: Math.round(delta), ratingAfter: Math.round(newR), helped: st.helped, hints: hintsUsed, takebacks, crowns, startFen: START_FEN, moves: sans.length });
    store.logActivity('games'); localStorage.removeItem(LIVE_KEY);
    trackPlan({ kind: 'play' });
    sfx(outcome === 'win' ? 'win' : 'end');
    ctx.refreshChrome();
    { const fin = react(L.n, { over: outcome === 'win' ? 'lose' : outcome === 'loss' ? 'win' : 'draw' }); if (fin) stage.say(fin.text, { mood: fin.mood }); }
    showResult(outcome, reason, rated, delta, newR, id, crowns);
  }

  function showResult(outcome, reason, rated, delta, newR, id, crowns = 0) {
    const rs = store.get().rating;
    const title = outcome === 'win' ? 'You won!' : outcome === 'draw' ? 'Draw' : 'You lost';
    const m = modal(h('div.col', { style: { textAlign: 'center' } },
      h('div', { style: { fontSize: '46px' } }, outcome === 'win' ? '🏆' : outcome === 'draw' ? '🤝' : '♟'),
      h('h2', title), h('div.muted', `by ${reason}`),
      outcome === 'win' ? crownBanner(crowns) : null,
      rated ? h('div.card.flat', h('div.big-num', { style: { color: delta >= 0 ? 'var(--good)' : 'var(--bad)' } }, `${delta >= 0 ? '+' : ''}${Math.round(delta)}`),
        h('div', `New rating: `, h('b', String(Math.round(newR))), rs.games <= PROVISIONAL_GAMES ? h('span.muted', ` · provisional (${rs.games}/${PROVISIONAL_GAMES})`) : null)) :
        h('div.small.muted', st.helped || st.undone ? 'Unrated — hints or takebacks were used.' : 'Unrated game.'),
      h('div.col', h('a.btn.primary.block', { href: `#/analyze?game=${id}`, onclick: () => m.close() }, icon('search', 18), 'Analyze with coach'),
        h('div.row', { style: { flexWrap: 'nowrap' } }, h('button.btn.grow', { onclick: () => { m.close(); back(); } }, 'New game'),
          h('button.btn.grow', { onclick: () => { m.close(); rematch(); } }, 'Rematch')))), { dismissible: true });
  }

  /* --- boot --- */
  board.setPosition(chess.fen(), { lastMove: lastMoveAt(null), animate: false, check: checkSquare(chess) });
  renderMoves(); refreshBars();
  if (!resume) sfx('start');
  setTimeout(() => { if (!alive) return; if (!over && !resume) stage.say(personaLine(L.n, 'greet'), { mood: 'happy' }); else stage.reveal(); }, 700);
  if (!checkEnd() && chess.turn() === bot) setTimeout(botTurn, 300); else board.setInteractive(chess.turn() === me && !over);

  const onKey = (e) => {
    if (e.target.matches('input,textarea')) return;
    if (e.key === 'ArrowLeft') goPly((view_ply ?? chess.history().length) - 1);
    if (e.key === 'ArrowRight') goPly(view_ply == null ? null : view_ply + 1);
  };
  document.addEventListener('keydown', onKey);
  const onHide = () => persist();
  window.addEventListener('pagehide', onHide);

  return {
    destroy() { alive = false; token++; clearInterval(timer); stage.destroy(); document.body.classList.remove('in-game'); document.removeEventListener('keydown', onKey); window.removeEventListener('pagehide', onHide); if (!over) persist(); board.destroy(); },
  };
}
