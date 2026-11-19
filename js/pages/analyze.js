import { Chess } from '../../vendor/chess.js';
import * as store from '../store.js';
import { h, icon, toast, modal, tabs, avatar, progress, pickFile, readFile } from '../ui.js';
import { Board, EvalBar } from '../board.js';
import { parseGame, reviewGame, buildReview, attachCoach, compactReview, REVIEW_VERSION, DEPTHS, CLASSES, fmtEval, winPct, expandEval, buildPgn, START_FEN, accuracyToRating } from '../analysis.js';
import { pvToSan, TAGS } from '../coach.js';
import { legalTargetsFor, checkSquare, splitPgn, engineSafe, uciOf } from '../chessutil.js';
import { playerBar, moveList, evalChart, coachCard, classBadge, emptyState } from '../components.js';
import { playForMove } from '../sound.js';
import { trackPlan } from '../plan.js';

const NOTABLE = ['brilliant', 'great', 'inaccuracy', 'mistake', 'blunder', 'miss'];

export default async function analyzePage(view, ctx) {
  let teardown = () => {};
  let dead = false;
  const show = (node) => { if (!dead) view.replaceChildren(node); };

  const loadGame = async (record) => {
    teardown();
    reviewScreen(view, ctx, record, () => inputScreen(), (fn) => { teardown = fn; });
  };

  function inputScreen() {
    teardown(); teardown = () => {};
    const s = store.get();
    const ta = h('textarea', { placeholder: 'Paste a PGN, a list of moves (1. e4 e5 2. Nf3 …) or a FEN here', rows: 7 });
    let depth = s.settings.analysisDepth || 'standard';
    let side = 'auto';
    const depthSeg = h('div.seg');
    const sideSeg = h('div.seg');
    const drawSegs = () => {
      depthSeg.replaceChildren(...Object.keys(DEPTHS).map((k) => h('button', { class: k === depth ? 'active' : '', onclick: () => { depth = k; drawSegs(); } }, k[0].toUpperCase() + k.slice(1))));
      sideSeg.replaceChildren(...[['auto', 'Auto'], ['w', 'White'], ['b', 'Black'], ['none', 'Neither']].map(([k, l]) => h('button', { class: k === side ? 'active' : '', onclick: () => { side = k; drawSegs(); } }, l)));
    };
    drawSegs();
    const go = async (text) => {
      try {
        const games = text.includes('[Event ') ? splitPgn(text) : [text];
        if (games.length > 1) {
          const imported = games.map((t) => { try { return makeRecord(parseGame(t), t, side); } catch (e) { return null; } }).filter(Boolean);
          imported.forEach((r) => store.saveGame(r));
          toast(`Imported ${imported.length} games to your library`, 'good');
          ctx.navigate('#/games');
          return;
        }
        const parsed = parseGame(games[0]);
        const rec = makeRecord(parsed, games[0], side);
        rec.depth = depth;
        loadGame(rec);
      } catch (e) { toast(e.message || 'Could not read that game', 'bad'); }
    };
    const library = s.games.slice(0, 6);
    const node = h('div.page',
      h('div.page-head', h('h1', 'Analyze')),
      h('div.grid.g2',
        h('div.card.analysis-input', h('div.card-title', icon('upload', 18), 'Import a game'), ta,
          h('div.row', h('button.btn', { onclick: async () => { const f = await pickFile('.pgn,.txt'); if (f) ta.value = await readFile(f); } }, icon('upload', 16), 'Open .pgn file'),
            h('button.btn', { onclick: async () => { try { ta.value = await navigator.clipboard.readText(); } catch (e) { toast('Paste with Ctrl/Cmd+V instead'); } } }, icon('copy', 16), 'Paste')),
          h('div', h('label.field', 'Which side are you?'), sideSeg),
          h('div', h('label.field', 'Analysis depth'), depthSeg, h('div.xs.muted.mt', 'Quick ≈ 20 s · Standard ≈ 1 min · Deep ≈ 3 min for a 40-move game. Serious mistakes are always double-checked at a higher depth.')),
          h('button.btn.primary.big', { onclick: () => ta.value.trim() ? go(ta.value) : toast('Paste a game first') }, icon('search', 18), 'Analyze game')),
        h('div.card', h('div.card-title', icon('list', 18), 'From your library'),
          library.length ? h('div.col', library.map((g) => gameRow(g, () => ctx.navigate(`#/analyze?game=${g.id}`)))) : emptyState('list', 'No games yet', 'Play a game against the computer or import one to see it here.'),
          s.games.length > 6 ? h('a.btn.small.mt', { href: '#/games' }, 'See all games') : null)));
    show(node);
  }

  if (ctx.query.game) {
    const g = store.getGame(ctx.query.game);
    if (g) { loadGame(g); } else { toast('Game not found', 'bad'); inputScreen(); }
  } else inputScreen();

  return () => { dead = true; teardown(); };
}

export function gameRow(g, onClick) {
  const res = g.outcome === 'win' ? ['Win', 'good'] : g.outcome === 'loss' ? ['Loss', 'bad'] : g.outcome === 'draw' ? ['Draw', 'warn'] : [g.result || '*', ''];
  const title = g.source === 'play' ? `vs ${g.oppName} (${g.oppElo})` : `${(g.headers && g.headers.White) || 'White'} – ${(g.headers && g.headers.Black) || 'Black'}`;
  return h('button.card.click.flat', { onclick: onClick, style: { padding: '12px' } }, h('div.row.nowrapr', h('span.tag', { class: res[1] }, res[0]), h('div.grow', h('b', title), h('div.xs.muted', `${new Date(g.date).toLocaleDateString()} · ${g.moves || (g.sans || []).length} moves${g.review ? ` · ${Math.round(g.review.summary[g.color || 'w'].acc)}% acc` : ''}`)), icon('right', 16)));
}

function makeRecord(parsed, text, side) {
  const hd = parsed.headers || {};
  const prof = store.get().profile.name.toLowerCase();
  let color = side === 'w' || side === 'b' ? side : side === 'none' ? 'none' : null;
  if (!color) {
    if ((hd.White || '').toLowerCase() === prof) color = 'w'; else if ((hd.Black || '').toLowerCase() === prof) color = 'b'; else color = 'none';
  }
  return {
    source: 'import', color, sans: parsed.sans, startFen: parsed.startFen, headers: hd, result: parsed.result, moves: parsed.sans.length,
    pgn: parsed.sans.length ? buildPgn({ sans: parsed.sans, startFen: parsed.startFen, headers: { ...hd } }) : text,
    outcome: color !== 'none' && parsed.result !== '*' ? (parsed.result === '1/2-1/2' ? 'draw' : (parsed.result === '1-0') === (color === 'w') ? 'win' : 'loss') : undefined,
  };
}

/** Extract trainable mistakes for the human's colour. */
export function extractMistakes(review, color) {
  if (!color || color === 'none') return [];
  const out = [];
  review.moves.forEach((m, i) => {
    if (m.color !== color) return;
    if (!['mistake', 'blunder'].includes(m.cls) && !(m.cls === 'inaccuracy' && m.loss >= 8)) return;
    if (!m.best) return;
    out.push({ tag: (m.tags && m.tags[0]) || 'positional', cls: m.cls, fen: m.fenBefore, best: m.best, played: m.uci, san: m.san, bestSan: m.bestSan || m.best, moveNo: m.moveNo, color: m.color, phase: m.phase, loss: Math.round(m.loss), ply: i, themes: (m.coach && m.coach.themes) || [] });
  });
  return out;
}

function reviewScreen(view, ctx, record, toInput, setTeardown) {
  const settings = store.get().settings;
  const game = { sans: record.sans, startFen: record.startFen || START_FEN, headers: record.headers || {} };
  const chess = new Chess(game.startFen === START_FEN ? undefined : game.startFen);
  const fens = [chess.fen()]; const ucis = [];
  for (const san of game.sans) { const m = chess.move(san); ucis.push(uciOf(m)); fens.push(chess.fen()); }
  game.fens = fens; game.ucis = ucis;
  // reviews made by an older judging engine are re-analysed automatically; current ones just need their commentary rebuilt
  const stale = !!record.review && record.review.version !== REVIEW_VERSION;
  let review = record.review && !stale ? attachCoach(record.review) : null;
  let ply = review ? 0 : 0;
  let cancelled = false, alive = true;
  let variation = null; // {chess, fen, from}
  let liveToken = 0;

  const names = (() => {
    if (record.source === 'play') return record.color === 'w' ? [store.get().profile.name, record.oppName] : [record.oppName, store.get().profile.name];
    return [game.headers.White || 'White', game.headers.Black || 'Black'];
  })();
  const orient = record.color === 'b' ? 'b' : 'w';

  const root = h('div.page');
  view.replaceChildren(root);

  if (!review) {
    // --- progress screen
    const bar = progress(0, { height: 10 });
    const lbl = h('div.muted', 'Starting engine…');
    root.append(h('div.card.progress-wrap', h('div.big-num', '0%'), h('h3', stale ? 'Re-analysing with the improved engine' : 'Analyzing your game'), stale ? h('div.small.muted', 'This game was reviewed with an older version of the analysis. It is being re-checked so every verdict is accurate.') : null, lbl, h('div', { style: { height: '12px' } }), bar,
      h('div.mt', h('button.btn', { onclick: () => { cancelled = true; toInput(); } }, 'Cancel'))));
    const big = root.querySelector('.big-num');
    (async () => {
      try {
        const engine = await ctx.engine();
        if (!engineSafe(fens[0])) throw new Error('That starting position is not valid.');
        const depth = DEPTHS[record.depth || store.get().settings.analysisDepth] || DEPTHS.standard;
        review = await reviewGame(engine, game, {
          depth, shouldStop: () => cancelled || !alive,
          onProgress: (p, i) => { big.textContent = Math.round(p * 100) + '%'; bar.firstChild.style.width = p * 100 + '%'; lbl.textContent = `Move ${i + 1} of ${fens.length}`; },
        });
        if (cancelled || !alive) return;
        // persist
        const id = store.saveGame({ ...record, review: compactReview(review), depth: undefined, moves: game.sans.length });
        record.id = id; record.review = review;
        if (record.color && record.color !== 'none') store.setGameMistakes(id, extractMistakes(review, record.color));
        store.logActivity('analyses'); trackPlan({ kind: 'analyze' });
        history.replaceState(null, '', `#/analyze?game=${id}`);
        build();
      } catch (e) {
        if (String(e.message) === 'cancelled') return;
        root.replaceChildren(h('div.card', h('h3', 'Analysis failed'), h('p.muted', String(e.message || e)), h('button.btn', { onclick: toInput }, 'Back')));
      }
    })();
  } else build();

  setTeardown(() => { alive = false; cancelled = true; });
  return () => { alive = false; cancelled = true; liveToken++; };

  /* ================================================================ */
  function build() {
    if (!alive) return;
    const n = game.sans.length;
    const board = new Board(h('div'), {
      orientation: orient, coords: settings.coords, legalDots: settings.legalDots, animate: settings.animations, autoQueen: settings.autoQueen,
      interactive: true,
      canSelect: (sq) => { const c = variation ? variation.chess : new Chess(fens[ply]); const p = c.get(sq); return !!p && p.color === c.turn(); },
      legalTargets: (sq) => legalTargetsFor(variation ? variation.chess : new Chess(fens[ply]), sq),
      onMove: (m) => enterVariation(m),
    });
    const evalBar = new EvalBar(orient === 'b');
    const topBar = playerBar({ name: names[orient === 'w' ? 1 : 0], color: orient === 'w' ? 'b' : 'w', avatarEl: h('div.avatar', { style: { width: '34px', height: '34px', background: 'var(--surface-3)', fontSize: '17px' } }, orient === 'w' ? '♚' : '♔') });
    const botBar = playerBar({ name: names[orient === 'w' ? 0 : 1], color: orient, avatarEl: record.color === orient ? avatar(store.get().profile, 34) : h('div.avatar', { style: { width: '34px', height: '34px', background: 'var(--surface-3)', fontSize: '17px' } }, '♟') });
    const info = h('div');
    const coachBox = h('div');
    const lineBox = h('div');
    const listBox = h('div');
    const chartBox = h('div');
    let chart = null;
    let mlist = null;

    const accBadge = (c) => review.summary[c].acc;
    const showBest = h('button.btn.small', { onclick: () => toggleBest() }, icon('eye', 15), 'Best move');

    function mv(i) { return review.moves[i]; }
    function goTo(p, animate = true) {
      variation = null; liveToken++;
      p = Math.max(0, Math.min(n, p));
      const prev = ply; ply = p;
      const m = p > 0 ? mv(p - 1) : null;
      board.setPosition(fens[p], { lastMove: m ? { from: m.uci.slice(0, 2), to: m.uci.slice(2, 4) } : null, animate: animate && p === prev + 1 && m ? [{ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4) }] : false, check: checkSquare(new Chess(fens[p])) });
      board.clearOverlays();
      if (m && (NOTABLE.includes(m.cls))) board.setBadges({ [m.uci.slice(2, 4)]: { text: CLASSES[m.cls].sym || '', color: CLASSES[m.cls].color } });
      if (m && m.cls === 'book') board.setBadges({});
      if (p > prev && m) playForMove({ san: m.san, captured: m.san.includes('x'), flags: '' }, m.san.includes('+'));
      const e = expandEval(review.evals[p]);
      evalBar.update(winPct(e), fmtEval(e, { noPlus: true }));
      botBar.setCaptured(fens[p]); topBar.setCaptured(fens[p]);
      renderInfo(); renderCoach(); renderLine();
      if (mlist) { mlist.querySelectorAll('.mv').forEach((el) => el.classList.toggle('active', +el.dataset.idx === p - 1)); mlist.scrollToCurrent && mlist.scrollToCurrent(); }
      if (chart) chart.setCursor(p - 1);
      btnPrev.disabled = btnFirst.disabled = p === 0; btnNext.disabled = btnLast.disabled = p === n;
    }

    function renderInfo() {
      const m = ply > 0 ? mv(ply - 1) : null;
      info.replaceChildren(h('div.row.between', h('div.small.muted', m ? `${m.moveNo}${m.color === 'w' ? '.' : '…'} ${m.san}` : 'Start position'),
        review.opening ? h('span.tag.accent', review.opening.name) : null));
    }

    function renderCoach() {
      coachBox.replaceChildren();
      if (variation) {
        coachBox.append(h('div.card.coach-box', h('div.coach-head', h('div.coach-avatar', '🔬'), h('div.grow', h('b', 'Exploring a variation'), h('div.small.muted', 'The engine evaluates every move you play here.'))),
          variation.msg ? h('p', variation.msg) : null, h('button.btn.small.primary', { onclick: () => goTo(variation.from) }, icon('repeat', 15), 'Back to the game')));
        return;
      }
      if (ply === 0) {
        coachBox.append(h('div.card.coach-box', h('div.coach-head', h('div.coach-avatar', '🎓'), h('div.grow', h('b', 'Ready to review'), h('div.small.muted', review.opening ? review.opening.name : 'Step through the game with ← →'))),
          h('p.small.muted', 'Tap a move to jump to it, or press the arrow keys. Moves marked ?! ? ?? come with a coaching note on what happened and what to consider. You can also play any move on the board to explore a variation.')));
        return;
      }
      const m = mv(ply - 1);
      coachBox.append(coachCard(m, { onShowBest: m.best ? () => toggleBest(true) : null, onRetry: () => retry(m) }));
    }

    function renderLine() {
      lineBox.replaceChildren();
      if (variation || ply >= n + 1) return;
      const m = ply > 0 ? mv(ply - 1) : null;
      // the engine's preferred continuation from the current position
      const next = mv(ply) || null;
      if (next && next.pv && next.pv.length) {
        lineBox.append(h('div.card.flat.small', h('div.row.tight', h('b', 'Engine line'), h('span.tag', fmtEval(next.evalBefore))), h('div.muted.lines', pvToSan(fens[ply], next.pv, 7))));
      }
    }

    let bestShown = false;
    function toggleBest(force) {
      if (ply === 0 || variation) return;
      const m = mv(ply - 1);
      bestShown = force != null ? force : !bestShown;
      if (bestShown && m.best) {
        board.setPosition(m.fenBefore, { animate: false, lastMove: null });
        board.setArrows([{ from: m.best.slice(0, 2), to: m.best.slice(2, 4), color: '#5fc88f', opacity: 0.9 }, ...(m.uci !== m.best ? [{ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), color: '#ef6b6b', opacity: 0.75 }] : [])]);
        toast(`Best was ${m.bestSan || m.best}`);
      } else { goTo(ply, false); }
    }

    function retry(m) {
      variation = { chess: new Chess(m.fenBefore), from: ply - 1, retry: m, msg: 'Find a better move than the one you played.' };
      board.setPosition(m.fenBefore, { animate: false });
      board.clearOverlays();
      renderCoach();
    }

    async function enterVariation(mvv) {
      let base = variation ? variation.chess : new Chess(fens[ply]);
      const from = variation ? variation.from : ply;
      let moved;
      try { moved = base.move({ from: mvv.from, to: mvv.to, promotion: mvv.promotion }); } catch (e) { return false; }
      if (!moved) return false;
      playForMove(moved, base.inCheck());
      const retryMove = variation && variation.retry;
      variation = { chess: base, from, retry: retryMove && !retryMove.done ? retryMove : null, msg: '' };
      board.setPosition(base.fen(), { lastMove: { from: moved.from, to: moved.to }, animate: false, check: checkSquare(base) });
      board.clearOverlays();
      renderCoach(); lineBox.replaceChildren();
      const my = ++liveToken;
      try {
        const engine = await ctx.engine();
        if (my !== liveToken || !alive) return true;
        if (!engineSafe(base.fen()) || base.isGameOver()) { variation.msg = base.isCheckmate() ? 'Checkmate.' : 'The game is over here.'; renderCoach(); return true; }
        const r = await engine.go({ fen: base.fen(), depth: 13, multipv: 1 });
        if (my !== liveToken || !alive || !variation) return true;
        const e = r.lines[0].white;
        evalBar.update(winPct(e), fmtEval(e, { noPlus: true }));
        const rm = variation.retry;
        if (rm) {
          const col = rm.color;
          const before = col === 'w' ? winPct(expandEval(rm.evalBefore)) : 100 - winPct(expandEval(rm.evalBefore));
          const after = col === 'w' ? winPct(e) : 100 - winPct(e);
          const lossNow = before - after;
          rm.done = lossNow <= 6 || uciOf(moved) === rm.best;
          variation.msg = uciOf(moved) === rm.best ? `Yes — ${moved.san} is the engine's top choice.` : lossNow <= 6 ? `${moved.san} works too (${fmtEval(e)}). The engine slightly prefers ${rm.bestSan}.` : lossNow <= 12 ? `${moved.san} is better than the original but still gives something up (${fmtEval(e)}). Try again.` : `Not quite — ${moved.san} still leaves you worse (${fmtEval(e)}). Think about the points the coach listed.`;
          if (!rm.done) { setTimeout(() => { if (variation && variation.retry === rm) { variation.chess.undo(); board.setPosition(variation.chess.fen(), { animate: false }); } }, 1100); }
        } else {
          variation.msg = `${moved.san}: ${fmtEval(e)} — engine suggests ${pvToSan(base.fen(), r.lines[0].pv, 4)}`;
        }
        renderCoach();
      } catch (er) { /* engine busy or cancelled */ }
      return true;
    }

    // controls
    const btnFirst = h('button.btn', { onclick: () => goTo(0) }, icon('first', 18));
    const btnPrev = h('button.btn', { onclick: () => goTo(ply - 1) }, icon('left', 18));
    const btnNext = h('button.btn', { onclick: () => goTo(ply + 1) }, icon('right', 18));
    const btnLast = h('button.btn', { onclick: () => goTo(n) }, icon('last', 18));
    const nav = h('div.nav-controls', btnFirst, btnPrev, btnNext, btnLast, h('button.btn', { onclick: () => board.flip(), title: 'Flip board' }, icon('flip', 18)));

    // tabs
    const reportTab = () => reportView(review, record, names, n);
    const movesTab = () => {
      mlist = moveList(review.moves.map((m) => ({ san: m.san, cls: m.cls })), { current: ply - 1, onSelect: (i) => goTo(i + 1), startColor: game.fens[0].split(' ')[1] });
      return h('div', mlist);
    };
    const tab = tabs([
      { id: 'coach', label: 'Coach', render: () => h('div.col', info, coachBox, lineBox) },
      { id: 'moves', label: 'Moves', render: movesTab },
      { id: 'report', label: 'Report', render: reportTab },
    ], { active: 'coach' });

    chart = evalChart(review, { current: ply - 1, onSelect: (i) => goTo(i + 1, false) });
    chartBox.append(chart);

    const sideCol = h('div.side-col',
      h('div.card', h('div.acc-row',
        h('div.center', h('div.acc-val', `${accBadge('w').toFixed(1)}`), h('div.xs.muted', names[0])),
        h('div.xs.faint', 'accuracy'),
        h('div.center', h('div.acc-val', `${accBadge('b').toFixed(1)}`), h('div.xs.muted', names[1])))),
      chartBox, tab,
      h('div.row', h('button.btn.small', { onclick: () => { navigator.clipboard && navigator.clipboard.writeText(record.pgn || ''); toast('PGN copied', 'good'); } }, icon('copy', 15), 'Copy PGN'),
        record.id ? null : null,
        h('button.btn.small', { onclick: () => toInput() }, icon('plus', 15), 'New analysis'),
        record.color === 'none' || !record.color ? h('button.btn.small', { onclick: () => pickSide() }, icon('user', 15), 'I played…') : h('button.btn.small', { onclick: () => ctx.navigate('#/coach') }, icon('target', 15), 'See coaching plan')));

    root.replaceChildren(h('div.game-layout',
      h('div.board-col', topBar.el, h('div.board-row', evalBar.el, h('div.board-box', board.el)), botBar.el, nav),
      sideCol));

    function pickSide() {
      const m = modal(h('div.col', h('p', 'Which side did you play? The coach will learn from your mistakes in this game.'),
        h('div.row', ['w', 'b'].map((c) => h('button.btn.grow', { onclick: () => { record.color = c; store.saveGame({ id: record.id, color: c }); store.setGameMistakes(record.id, extractMistakes(review, c)); m.close(); toast('Added to your coaching profile', 'good'); } }, c === 'w' ? 'White' : 'Black')))), { title: 'I played…' });
    }

    const onKey = (e) => {
      if (e.target.matches('input,textarea') || !alive) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(ply - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(ply + 1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); goTo(0); }
      if (e.key === 'ArrowDown') { e.preventDefault(); goTo(n); }
    };
    document.addEventListener('keydown', onKey);
    setTeardown(() => { alive = false; document.removeEventListener('keydown', onKey); board.destroy(); });
    // first interesting moment: jump to first mistake/blunder of the player, else start
    const startAt = (() => { const c = record.color; const i = review.moves.findIndex((m) => (!c || c === 'none' || m.color === c) && ['mistake', 'blunder'].includes(m.cls)); return i >= 0 ? i + 1 : 0; })();
    goTo(0, false);
    if (startAt > 0 && ctx.query.game) { tab.show('coach'); goTo(startAt, false); }
  }
}

function reportView(review, record, names, n) {
  const S = review.summary;
  const rows = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'blunder'].filter((k) => CLASSES[k]);
  const table = h('div.cls-table', h('div'), h('div.hd', 'W'), h('div.hd', 'B'),
    ...rows.flatMap((k) => [h('div.lbl', h('i', { style: { background: CLASSES[k].color, width: '14px', height: '14px', borderRadius: '50%', display: 'inline-block' } }), CLASSES[k].label), h('div.n', { style: { color: S.w.counts[k] ? 'var(--text)' : 'var(--faint)' } }, String(S.w.counts[k] || 0)), h('div.n', { style: { color: S.b.counts[k] ? 'var(--text)' : 'var(--faint)' } }, String(S.b.counts[k] || 0))]));
  const phase = (c) => ['opening', 'middlegame', 'endgame'].map((p) => S[c].phase[p].n ? `${p[0].toUpperCase() + p.slice(1)} ${Math.round(S[c].phase[p].acc)}%` : null).filter(Boolean).join(' · ');
  const est = (c) => accuracyToRating(S[c].acc, S[c].moves);
  return h('div.col',
    h('div.card.flat', h('div.row.between', h('b', names[0]), h('span.muted', 'White')), h('div.small.muted', phase('w') || '—'), est('w') ? h('div.small', 'Performance ≈ ', h('b', String(est('w')))) : null),
    h('div.card.flat', h('div.row.between', h('b', names[1]), h('span.muted', 'Black')), h('div.small.muted', phase('b') || '—'), est('b') ? h('div.small', 'Performance ≈ ', h('b', String(est('b')))) : null),
    h('div.card.flat', table),
    review.opening ? h('div.small.muted', `Opening: ${review.opening.name}`) : null,
    h('div.xs.faint', `Stockfish depth ${review.depth}. Each move is compared with the engine's best move in the same search; losses are measured in win probability and, in decided positions, in pawns.`));
}
