// Live analysis board: set up any position or play a game on the board and Stockfish analyses it in real time.
//  - the engine's top lines (1–3) stream in as it thinks, are drawn on the board as arrows and listed as tappable moves
//  - tapping a suggested move plays it and explains exactly why it is good (what it does, how it compares, what follows)
//  - every move you play is judged against the engine's best move and explained by the coach
//  - positions can be built piece by piece, loaded from a FEN, saved to your library and reviewed as a full game
import { Chess } from '../vendor/chess.js';
import * as store from './store.js';
import { h, icon, toast } from './ui.js';
import { Board, EvalBar } from './board.js';
import { START_FEN, buildPgn, CLASSES, fmtEval, winPct } from './analysis.js';
import { legalTargetsFor, checkSquare, engineSafe, uciOf } from './chessutil.js';
import { playerBar, moveList, coachCard } from './components.js';
import { playForMove } from './sound.js';
import { parsePv, normLines } from './pvutil.js';
import { suggestPanel } from './suggest.js';
import { whyCard, keepAnchor, nudgeIntoView } from './whyui.js';
import { whyMove, engineArrows } from './visual.js';
import { judgeMove, searchPosition } from './judge.js';
import { explainMove, sanOf } from './coach.js';
import { phaseOf } from './themes.js';
import { stopEngine } from './engine-host.js';

const FILES = 'abcdefgh';
const MAX_DEPTH = 22;
/** Engine lines shallower than this are rough guesses (they change a lot while the search deepens), so they are not shown as advice. */
const MIN_SHOW = 13;
const NOTABLE = ['brilliant', 'great', 'inaccuracy', 'mistake', 'blunder'];
const PIECE_ORDER = ['k', 'q', 'r', 'b', 'n', 'p'];

/* ------------------------------------------------------------------ FEN helpers (pure) live in fenutil.js */
import { normaliseFen, placementFromMap, mapFromFen, legalCastling, fenFromSetup } from './fenutil.js';
export { normaliseFen, placementFromMap, mapFromFen, legalCastling, fenFromSetup };

const toWhite = (info, turn) => (info.mate != null ? { mate: turn === 'w' ? info.mate : -info.mate } : { cp: turn === 'w' ? info.cp : -info.cp });
const sideName = (c) => (c === 'w' ? 'White' : 'Black');

/* ------------------------------------------------------------------ the page */

/**
 * @param opts {fen, setup, back}
 * @returns {{destroy()}}
 */
export function liveBoard(view, ctx, { fen = null, setup = false, back = null } = {}) {
  const settings = store.get().settings;
  let startFen = (fen && normaliseFen(fen)) || START_FEN;
  let moves = [];            // [{san, uci, fenBefore, fen, color, cls?, engine?}]
  let idx = 0;               // number of moves currently applied
  let mode = setup ? 'setup' : 'play';
  let alive = true;
  let engineOn = true, arrowsOn = settings.showArrows !== false, nLines = 3;
  let lines = [];            // live engine lines for the position on the board [{ev, pv, white, depth}]
  let depth = 0, token = 0, judgeToken = 0, searchDone = false;
  let whyOverlay = null;
  let verdict = null;        // {i, m, j} for the last move you played
  const cache = new Map();   // fen -> {lines:[{white,pv,...}], depth} so a move can be judged without searching again

  const fenAt = (i) => (i <= 0 ? startFen : moves[i - 1].fen);
  const here = () => fenAt(idx);
  const chessHere = () => new Chess(here());
  /* captured pieces only mean something when the game started from the normal position */
  const setCaps = (f) => {
    const ok = f && startFen.split(' ')[0] === START_FEN.split(' ')[0];
    if (ok) { topBar.setCaptured(f); botBar.setCaptured(f); } else for (const b of [topBar, botBar]) { const c = b.el.querySelector('.captured'); if (c) c.replaceChildren(); }
  };
  const startTurn = () => startFen.split(' ')[1];

  /* ---------- board and chrome ---------- */
  const board = new Board(h('div'), {
    orientation: 'w', coords: settings.coords, legalDots: settings.legalDots, animate: settings.animations, autoQueen: settings.autoQueen, interactive: true,
    canSelect: (sq) => { if (mode !== 'play') return false; const c = chessHere(); const p = c.get(sq); return !c.isGameOver() && !!p && p.color === c.turn(); },
    legalTargets: (sq) => legalTargetsFor(chessHere(), sq),
    onMove: (m) => playMove(m, { human: true }),
  });
  const evalBar = new EvalBar(false);
  const avatarDot = (txt) => h('div.avatar', { style: { width: '34px', height: '34px', background: 'var(--surface-3)', fontSize: '17px' } }, txt);
  const mkBar = (c) => playerBar({ name: sideName(c), color: c, avatarEl: avatarDot(c === 'b' ? '♚' : '♔') });
  let topColor = 'b', botColor = 'w';
  let topBar = mkBar(topColor), botBar = mkBar(botColor);
  const banner = h('div.move-banner', { 'aria-live': 'polite' });
  const btn = (ic, label, fn, extra = {}) => h('button.btn', { 'aria-label': label, title: label, onclick: fn, ...extra }, icon(ic, 18));
  const bFirst = btn('first', 'Start position', () => goTo(0));
  const bPrev = btn('left', 'Take back one move', () => goTo(idx - 1));
  const bNext = btn('right', 'Forward one move', () => goTo(idx + 1));
  const bLast = btn('last', 'Latest move', () => goTo(moves.length));
  const bFlip = btn('flip', 'Flip board', () => flipBoard());
  const nav = h('div.nav-controls', bFirst, bPrev, bNext, bLast, bFlip);

  /* ---------- side panel ---------- */
  const sp = suggestPanel({
    title: 'Engine suggestions', hint: 'tap a move to play it — arrows show the same moves', arrows: arrowsOn,
    onArrows: (on) => { arrowsOn = on; store.update((s) => { s.settings.showArrows = on; }); paint(); },
    onPick: ({ group, lineIndex, moveIndex, line }) => pickSuggestion(group, lineIndex, moveIndex, line),
  });
  const verdictBox = h('div.live-verdict');
  const toolbar = h('div.card.flat.live-tools');
  const movesBox = h('div.card.flat.live-moves');
  const actions = h('div.row.live-actions');
  const setupBox = h('div.card.setup-card');
  const status = h('div.live-status.xs.muted', { 'aria-live': 'polite' });
  const side = h('div.side-col', toolbar, verdictBox, sp.el, movesBox, actions, setupBox);
  const layout = h('div.game-layout.review-layout.live-layout',
    h('div.board-col', topBar.el, h('div.board-row', evalBar.el, h('div.board-box', board.el)), botBar.el, nav, banner),
    side);
  const root = h('div.page', layout);
  view.replaceChildren(root);
  document.body.classList.add('in-review');
  window.scrollTo(0, 0);

  /* ------------------------------------------------------------------ drawing */
  function syncBars() {
    const f = here();
    setCaps(f);
    const turn = f.split(' ')[1];
    topBar.el.classList.toggle('on-turn', mode === 'play' && turn === topColor);
    botBar.el.classList.toggle('on-turn', mode === 'play' && turn === botColor);
  }
  /** Flip the board and swap the two player bars so the side at the bottom always has the bar at the bottom. */
  function flipBoard() {
    board.flip();
    const flipped = board.orientation === 'b';
    topColor = flipped ? 'w' : 'b'; botColor = flipped ? 'b' : 'w';
    const nt = mkBar(topColor), nb = mkBar(botColor);
    topBar.el.replaceWith(nt.el); botBar.el.replaceWith(nb.el);
    topBar = nt; botBar = nb;
    if (mode === 'setup') paintSetupBoard(); else syncBars();
  }

  function paint() {
    if (mode !== 'play') return;
    const c = chessHere();
    const m = idx > 0 ? moves[idx - 1] : null;
    let arrows = [], marks = {};
    const badges = {};
    if (m && m.cls && NOTABLE.includes(m.cls)) badges[m.uci.slice(2, 4)] = { text: CLASSES[m.cls].sym || '', color: CLASSES[m.cls].color };
    if (whyOverlay) { arrows = whyOverlay.arrows.slice(); marks = { ...whyOverlay.marks }; }
    if (arrowsOn && engineOn && !c.isGameOver()) arrows = arrows.concat(engineArrows(lines, { max: whyOverlay ? 2 : nLines }));
    if (m && (m.cls === 'brilliant' || m.cls === 'great')) marks[m.uci.slice(2, 4)] = marks[m.uci.slice(2, 4)] || 'ring-good';
    board.setOverlay({ arrows, marks, badges });
  }

  function renderBanner() {
    const c = chessHere();
    let txt = '', e = null;
    if (c.isCheckmate()) txt = `Checkmate — ${sideName(c.turn() === 'w' ? 'b' : 'w')} wins`;
    else if (c.isStalemate()) txt = 'Stalemate — draw';
    else if (c.isDraw()) txt = 'Draw';
    else txt = `${sideName(c.turn())} to move${c.inCheck() ? ' — check' : ''}`;
    if (lines[0]) e = lines[0].ev;
    banner.replaceChildren(h('b', txt), h('span.grow'), e ? h('span.mb-eval', fmtEval(e, { noPlus: true })) : h('span.mb-eval.muted', engineOn ? '…' : 'off'));
  }

  function setEval(e) {
    if (!e) { evalBar.update(50, '0.0'); return; }
    evalBar.update(winPct(e), fmtEval(e, { noPlus: true }));
  }

  function syncPanel() {
    const c = chessHere();
    const groups = [];
    if (engineOn && !c.isGameOver()) {
      groups.push({ key: 'live', title: `${sideName(c.turn())} to move`, sub: depth ? `depth ${depth}` : '', fen: here(), lines: lines.map((l) => ({ ev: l.ev, pv: l.pv })), pending: !lines.length, dots: true });
    }
    sp.setGroups(groups);
    sp.el.classList.toggle('hidden', mode !== 'play');
    sp.setStatus(!engineOn ? 'The engine is off.' : c.isGameOver() ? '' : searchDone ? `Depth ${depth} — analysis complete` : lines.length ? `Thinking… depth ${depth}` : 'Starting the engine…');
  }

  function renderToolbar() {
    const seg = (items, cur, on) => h('div.seg', items.map(([k, l]) => h('button', { type: 'button', class: String(k) === String(cur) ? 'active' : '', onclick: () => on(k) }, l)));
    toolbar.replaceChildren(
      h('div.row.between.nowrapr',
        h('div.grow', h('b', 'Live engine'), h('div.xs.muted', 'Stockfish analyses whatever is on the board.')),
        h('label.switch', { title: 'Engine on / off' }, h('input', { type: 'checkbox', checked: engineOn, onchange: (e) => { engineOn = e.target.checked; if (!engineOn) { token++; stopEngine(); lines = []; depth = 0; } renderToolbar(); afterChange({ restart: engineOn }); } }), h('i'))),
      h('div.row.nowrapr.tools-row', h('span.xs.muted', 'Lines'), seg([[1, '1'], [2, '2'], [3, '3']], nLines, (k) => { nLines = +k; renderToolbar(); lines = lines.slice(0, nLines); if (engineOn) analyse(); else syncPanel(); paint(); })));
    toolbar.classList.toggle('hidden', mode !== 'play');
  }

  function renderMoves() {
    movesBox.replaceChildren();
    movesBox.classList.toggle('hidden', mode !== 'play');
    if (mode !== 'play') return;
    if (!moves.length) { movesBox.append(h('div.small.muted', 'Make a move on the board — or tap a suggestion — and it appears here.')); return; }
    const ml = moveList(moves.map((m) => ({ san: m.san, cls: m.cls })), { current: idx - 1, onSelect: (i) => goTo(i + 1), startColor: startTurn() });
    movesBox.append(h('div.xs.muted.mb', 'Moves'), ml);
    ml.scrollToCurrent && setTimeout(() => ml.scrollToCurrent(), 0);
  }

  function renderActions() {
    actions.replaceChildren();
    actions.classList.toggle('hidden', mode !== 'play');
    if (mode !== 'play') return;
    actions.append(...[
      h('button.btn.small', { onclick: () => enterSetup() }, icon('sliders', 15), 'Set up position'),
      h('button.btn.small', { onclick: () => { navigator.clipboard && navigator.clipboard.writeText(here()); toast('FEN copied', 'good'); } }, icon('copy', 15), 'Copy FEN'),
      moves.length ? h('button.btn.small', { onclick: () => { navigator.clipboard && navigator.clipboard.writeText(pgnText()); toast('PGN copied', 'good'); } }, icon('copy', 15), 'Copy PGN') : null,
      moves.length >= 4 ? h('button.btn.small.primary', { onclick: () => reviewWhole() }, icon('search', 15), 'Review whole game') : null,
      back ? h('button.btn.small.ghost', { onclick: () => back() }, icon('left', 15), 'Back') : null].filter(Boolean));
  }

  function pgnText() {
    return buildPgn({ sans: moves.slice(0, moves.length).map((m) => m.san), startFen, headers: { White: 'White', Black: 'Black', Result: '*' } });
  }
  function reviewWhole() {
    if (moves.length < 2) { toast('Play a few more moves first'); return; }
    const id = store.saveGame({ source: 'import', color: 'none', sans: moves.map((m) => m.san), startFen, headers: { White: 'White', Black: 'Black', Event: 'Analysis board' }, result: '*', moves: moves.length, pgn: pgnText() });
    ctx.navigate(`#/analyze?game=${id}`);
  }

  function renderVerdict() { keepAnchor(sp.el, drawVerdict); }
  function drawVerdict() {
    verdictBox.replaceChildren();
    if (mode !== 'play' || !verdict || verdict.i !== idx - 1) return;
    const { m, j, rec } = verdict;
    if (!rec) return;
    const c = CLASSES[rec.cls];
    if (verdict.pending) { verdictBox.append(h('div.card.flat.small.muted', 'Checking your move…')); return; }
    if (NOTABLE.includes(rec.cls) && m) {
      const card = coachCard(m, { onSquares: (s) => board.flashSquares(s) });
      const row = h('div.row.mt',
        ['inaccuracy', 'mistake', 'blunder'].includes(rec.cls) ? h('button.btn.small.primary', { onclick: () => { goTo(idx - 1); } }, icon('undo', 15), 'Take it back') : null,
        j && j.best && j.best !== rec.uci ? h('button.btn.small', { onclick: () => { const b = j.best; goTo(idx - 1); playMove({ from: b.slice(0, 2), to: b.slice(2, 4), promotion: b[4] }, { human: false }); } }, icon('bulb', 15), `Play ${m.bestSan || 'the best move'} instead`) : null);
      card.append(row);
      verdictBox.append(card);
    } else {
      verdictBox.append(h('div.card.flat.verdict-line', h('span.class-badge', h('i', { style: { background: c.color, width: '20px', height: '20px' } }, c.sym || '✓'), c.label), h('span.small.muted', ` ${rec.san}`),
        j && j.best && j.best !== rec.uci ? h('span.small.muted', ` — engine preferred ${sanOf(rec.fenBefore, j.best)}`) : null));
    }
  }

  /* ------------------------------------------------------------------ position changes */
  function afterChange({ animate = false, restart = true } = {}) {
    const c = chessHere();
    const m = idx > 0 ? moves[idx - 1] : null;
    board.setPosition(here(), { lastMove: m ? { from: m.uci.slice(0, 2), to: m.uci.slice(2, 4) } : null, animate: animate && m ? [{ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4) }] : false, check: checkSquare(c) });
    whyOverlay = null; sp.setWhy(null); sp.setActive(null);
    syncBars();
    const cached = cache.get(here());
    lines = cached && engineOn ? cached.lines.map((l) => ({ ev: l.white, pv: l.pv, white: l.white, depth: l.depth })).slice(0, nLines) : [];
    depth = cached && engineOn ? cached.depth : 0;
    setEval(lines[0] ? lines[0].ev : null);
    renderBanner(); renderMoves(); renderActions(); renderVerdict(); syncPanel(); paint();
    bFirst.disabled = bPrev.disabled = idx === 0; bNext.disabled = bLast.disabled = idx === moves.length;
    if (restart) analyse();
  }

  function goTo(i) {
    i = Math.max(0, Math.min(moves.length, i));
    if (i === idx) return;
    judgeToken++;
    idx = i;
    afterChange({ animate: false });
  }

  /** A move was made on the board (by hand or from a suggestion). */
  function playMove({ from, to, promotion }, { human = false, engine = false } = {}) {
    if (mode !== 'play') return false;
    const c = chessHere();
    if (c.isGameOver()) return false;
    let mvv; try { mvv = c.move({ from, to, promotion }); } catch (e) { return false; }
    if (!mvv) return false;
    const rec = { san: mvv.san, uci: uciOf(mvv), fenBefore: here(), fen: c.fen(), color: mvv.color, engine };
    moves = moves.slice(0, idx); moves.push(rec); idx++;
    playForMove(mvv, c.inCheck());
    verdict = null;
    afterChange({ animate: !human, restart: false });
    if (human && engineOn && !c.isGameOver()) judgeAndAnalyse(rec, idx - 1);
    else analyse();
    return true;
  }

  /* ------------------------------------------------------------------ engine */
  async function analyse() {
    const my = ++token;
    const f = here();
    const c = new Chess(f);
    searchDone = false;
    if (mode !== 'play' || !engineOn) { syncPanel(); return; }
    stopEngine();
    if (c.isGameOver() || !engineSafe(f)) { lines = []; depth = 0; syncPanel(); paint(); return; }
    let engine;
    try { engine = await ctx.engine(); } catch (e) { sp.setStatus('The engine could not be loaded.'); return; }
    if (my !== token || !alive) return;
    const turn = c.turn();
    let lastUi = 0;
    const apply = (all, final = false) => {
      const arr = Object.keys(all).map(Number).sort((a, b) => a - b).map((k) => all[k]).filter((x) => x && x.pv);
      if (!arr.length) return;
      const d = Math.min(...arr.map((x) => x.depth || 0));
      const out = arr.slice(0, nLines).map((x) => ({ white: x.white || toWhite(x, turn), ev: x.white || toWhite(x, turn), pv: x.pv, depth: x.depth }));
      cache.set(f, { lines: arr.map((x) => ({ white: x.white || toWhite(x, turn), pv: x.pv, depth: x.depth })), depth: d });
      if (cache.size > 80) cache.delete(cache.keys().next().value);
      if (!final && d < MIN_SHOW) return;
      lines = out; depth = d;
      setEval(lines[0].ev);
      renderBanner(); syncPanel(); paint();
    };
    try {
      const res = await engine.go({
        fen: f, depth: MAX_DEPTH, multipv: Math.max(nLines, 3),
        onInfo: (info, all) => {
          if (my !== token || !alive) { stopEngine(); return; }
          const now = performance.now();
          if (now - lastUi < 300) return;
          lastUi = now;
          apply(all);
        },
      });
      if (my !== token || !alive) return;
      const all = {}; res.lines.forEach((l, i) => { all[i + 1] = l; });
      apply(all, true);
      searchDone = true; syncPanel();
    } catch (e) { if (my === token && alive) sp.setStatus('The engine stopped — try again.'); }
  }

  /** Judge the move the player just made (comparing it with the engine's best in the SAME search), then analyse the new position. */
  async function judgeAndAnalyse(rec, i) {
    const my = ++judgeToken;
    verdict = { i, rec: { ...rec, cls: 'good' }, pending: true };
    renderVerdict();
    try {
      stopEngine();
      const engine = await ctx.engine();
      if (my !== judgeToken || !alive) return;
      const before = rec.fenBefore;
      const hit = cache.get(before);
      let src = hit && hit.depth >= 14 ? hit.lines : null;
      if (!src && engineSafe(before)) src = (await searchPosition(engine, before, { depth: 15, movetime: 2000 })).lines;
      if (my !== judgeToken || !alive) return;
      const j = await judgeMove(engine, before, rec.uci, { lines: src, depth: 15, movetime: 2000, verify: true });
      if (my !== judgeToken || !alive) return;
      rec.cls = j.cls;
      const fenAfter = rec.fen;
      let m = null;
      try {
        m = { ply: i, moveNo: Math.floor((fenPly(startFen) + i) / 2) + 1, color: rec.color, san: rec.san, uci: rec.uci, cls: j.cls, loss: j.loss, cpLoss: j.cpLoss, fenBefore: before, fenAfter,
          phase: phaseOf(before, i), evalBefore: j.bestEval, evalAfter: j.playedEval, evalPlayed: j.playedEval, best: j.best, bestSan: sanOf(before, j.best), pv: j.bestPv, replyPv: (j.playedPv || []).slice(1), top: j.isTop };
        m.coach = explainMove(m, { prevUcis: moves.slice(0, i).map((x) => x.uci) });
      } catch (e) { m = null; }
      verdict = { i, rec, j, m };
      if (i === idx - 1) { renderVerdict(); renderMoves(); paint(); }
    } catch (e) { if (my === judgeToken) verdict = null; }
    if (my === judgeToken && alive) { renderVerdict(); analyse(); }
  }
  const fenPly = (f) => { const p = f.split(' '); return (p[1] === 'b' ? 1 : 0) + ((+p[5] || 1) - 1) * 2; };

  /* ------------------------------------------------------------------ suggestions */
  function pickSuggestion(group, li, i, line) {
    if (mode !== 'play' || group.fen !== here()) return;
    const all = parsePv(group.fen, line.pv, 12);
    if (!all.length) return;
    const k = Math.min(i, all.length - 1);
    judgeToken++;
    for (let t = 0; t <= k; t++) { if (!playMove({ from: all[t].from, to: all[t].to, promotion: all[t].promotion }, { engine: true })) break; }
    const fenBefore = k === 0 ? group.fen : all[k - 1].fen;
    const why = whyMove({ fen: fenBefore, uci: all[k].uci, pv: all.map((x) => x.uci), lines: normLines(group.lines, 3), idx: k, rootColor: group.fen.split(' ')[1] });
    if (!why) return;
    whyOverlay = why.overlay ? { arrows: why.overlay.arrows.filter((a) => a.key !== 'mv'), marks: why.overlay.marks } : null;
    sp.setWhy(whyCard(why, { onClose: () => { whyOverlay = null; sp.setWhy(null); paint(); }, onSquares: (s) => board.flashSquares(s) }));
    paint();
    nudgeIntoView(sp.el.querySelector('.why-card'));
  }

  /* ------------------------------------------------------------------ set-up mode */
  let setupMap = {}, setupTurn = 'w', setupCastle = 'KQkq', tool = { kind: 'move' }, picked = null;

  function enterSetup() {
    token++; judgeToken++; stopEngine();
    mode = 'setup';
    setupMap = mapFromFen(here()); setupTurn = here().split(' ')[1]; setupCastle = here().split(' ')[2] === '-' ? '' : here().split(' ')[2];
    tool = { kind: 'move' }; picked = null;
    board.clearOverlays(); board.setInteractive(false);
    board.setSquareMode((sq) => onSetupTap(sq));
    sp.setWhy(null);
    drawSetup();
    [toolbar, movesBox, actions, verdictBox, sp.el].forEach((x) => x.classList.add('hidden'));
    setupBox.classList.remove('hidden');
    paintSetupBoard();
    banner.replaceChildren(h('b', 'Set up a position'), h('span.grow'), h('span.xs.muted', 'tap a piece, then a square'));
    bFirst.disabled = bPrev.disabled = bNext.disabled = bLast.disabled = true;
    topBar.el.classList.remove('on-turn'); botBar.el.classList.remove('on-turn');
  }

  function paintSetupBoard() {
    const placement = placementFromMap(setupMap);
    board.setPosition(`${placement} ${setupTurn} - - 0 1`, { animate: false });
    board.clearOverlays();
    board.setMarks(picked ? { [picked]: 'info' } : {});
    setCaps(null);
  }

  function onSetupTap(sq) {
    if (tool.kind === 'erase') { delete setupMap[sq]; picked = null; }
    else if (tool.kind === 'put') {
      if (setupMap[sq] === tool.piece) delete setupMap[sq];
      else if (tool.piece[1] === 'p' && (sq[1] === '1' || sq[1] === '8')) { toast('Pawns cannot stand on the first or last rank', 'warn'); return; }
      else setupMap[sq] = tool.piece;
      picked = null;
    } else {
      if (picked && picked !== sq) {
        const p = setupMap[picked];
        if (p && p[1] === 'p' && (sq[1] === '1' || sq[1] === '8')) { toast('Pawns cannot stand on the first or last rank', 'warn'); picked = null; }
        else { if (p) { setupMap[sq] = p; delete setupMap[picked]; } picked = null; }
      } else if (picked === sq) picked = null;
      else picked = setupMap[sq] ? sq : null;
    }
    paintSetupBoard(); drawSetup();
  }

  function drawSetup() {
    const castle = legalCastling(setupMap, setupCastle);
    const pal = (c) => h('div.palette-row', PIECE_ORDER.map((t) => h('button.pal-btn', { type: 'button', class: tool.kind === 'put' && tool.piece === c + t ? 'active' : '', 'aria-label': `${sideName(c)} ${({ k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' })[t]}`, onclick: () => { tool = { kind: 'put', piece: c + t }; picked = null; paintSetupBoard(); drawSetup(); } }, h('div.piece', { class: `p-${c}${t}` }))));
    const turnSeg = h('div.seg', [['w', 'White to move'], ['b', 'Black to move']].map(([k, l]) => h('button', { type: 'button', class: setupTurn === k ? 'active' : '', onclick: () => { setupTurn = k; paintSetupBoard(); drawSetup(); } }, l)));
    const cs = [['K', 'White O-O'], ['Q', 'White O-O-O'], ['k', 'Black O-O'], ['q', 'Black O-O-O']].map(([k, l]) => {
      const possible = legalCastling(setupMap, k) === k;
      return h('label.chk', { class: possible ? '' : 'off' }, h('input', { type: 'checkbox', disabled: !possible, checked: possible && castle.includes(k), onchange: (e) => { const set = new Set(setupCastle.split('').filter(Boolean)); if (e.target.checked) set.add(k); else set.delete(k); setupCastle = 'KQkq'.split('').filter((x) => set.has(x)).join(''); } }), l);
    });
    const fenIn = h('input', { type: 'text', placeholder: 'Paste a FEN to load it', 'aria-label': 'FEN', spellcheck: false, autocomplete: 'off' });
    setupBox.replaceChildren(
      h('div.card-title', icon('sliders', 18), 'Set up a position'),
      h('p.small.muted', 'Pick a piece, then tap squares to place it (tap it again to remove). With ✋ selected, tap a piece and then a square to move it.'),
      h('div.palette', pal('w'), pal('b'),
        h('div.palette-row.tools',
          h('button.pal-btn.wide', { type: 'button', class: tool.kind === 'move' ? 'active' : '', onclick: () => { tool = { kind: 'move' }; picked = null; paintSetupBoard(); drawSetup(); } }, '✋ Move'),
          h('button.pal-btn.wide', { type: 'button', class: tool.kind === 'erase' ? 'active' : '', onclick: () => { tool = { kind: 'erase' }; picked = null; paintSetupBoard(); drawSetup(); } }, icon('trash', 15), 'Erase'))),
      turnSeg,
      h('div.chk-row', cs),
      h('div.row',
        h('button.btn.small', { onclick: () => { setupMap = mapFromFen(START_FEN); setupTurn = 'w'; setupCastle = 'KQkq'; picked = null; paintSetupBoard(); drawSetup(); } }, 'Starting position'),
        h('button.btn.small', { onclick: () => { setupMap = {}; picked = null; paintSetupBoard(); drawSetup(); } }, 'Clear board')),
      h('div.row.nowrapr', fenIn, h('button.btn', { onclick: () => { const f = normaliseFen(fenIn.value); if (!f) { toast('That FEN is not valid', 'bad'); return; } setupMap = mapFromFen(f); setupTurn = f.split(' ')[1]; setupCastle = f.split(' ')[2] === '-' ? '' : f.split(' ')[2]; picked = null; paintSetupBoard(); drawSetup(); } }, 'Load')),
      h('button.btn.primary.big.block', { onclick: () => finishSetup() }, icon('search', 18), 'Start analysing'));
  }

  function finishSetup() {
    const r = fenFromSetup(setupMap, setupTurn, setupCastle);
    if (r.error) { toast(r.error, 'bad'); return; }
    startFen = r.fen; moves = []; idx = 0; verdict = null; cache.clear();
    mode = 'play';
    board.setSquareMode(null); board.setInteractive(true);
    setupBox.classList.add('hidden'); setupBox.replaceChildren();
    renderToolbar();
    afterChange({ animate: false });
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------ keyboard + boot */
  const onKey = (e) => {
    if (!alive || mode !== 'play' || (e.target && e.target.matches && e.target.matches('input,textarea'))) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(idx - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(idx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); goTo(0); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); goTo(moves.length); }
  };
  document.addEventListener('keydown', onKey);

  renderToolbar();
  setupBox.classList.toggle('hidden', mode !== 'setup');
  if (mode === 'setup') enterSetup();
  else afterChange({ animate: false });

  return {
    destroy() {
      alive = false; token++; judgeToken++;
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('in-review');
      board.destroy();
    },
    // exposed for tests
    _state: () => ({ mode, idx, moves, lines, depth, startFen, fen: here() }),
  };
}
