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
import { isMobile } from '../gameui.js';
import { lineChips, suggestList, lineStepper } from '../playout.js';
import { parsePv, replayPv } from '../pvutil.js';

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
    const nm = (v, d) => (!v || v === '?' ? d : v);
    return [nm(game.headers.White, 'White'), nm(game.headers.Black, 'Black')];
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
    document.body.classList.add('in-review');   // phones: hides the top bar so the sticky board has room
    window.scrollTo(0, 0);
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
    const info = h('div.rv-info');
    const banner = h('div.move-banner', { 'aria-live': 'polite' });
    const coachBox = h('div');
    const lineBox = h('div');
    const listBox = h('div');
    const chartBox = h('div');
    let chart = null;
    let mlist = null;

    const accBadge = (c) => review.summary[c].acc;
    const showBest = h('button.btn.small', { onclick: () => toggleBest() }, icon('eye', 15), 'Best move');

    let booting = true;
    function mv(i) { return review.moves[i]; }

    /* ---- key moments: jump straight to the player's mistakes and blunders ---- */
    const keyBar = h('div.key-bar');
    const keyPlies = () => review.moves.map((m, i) => ({ m, i })).filter(({ m }) => ['mistake', 'blunder'].includes(m.cls) && (!record.color || record.color === 'none' || m.color === record.color)).map(({ i }) => i + 1);
    function jumpKey(dir) {
      const ks = keyPlies();
      const t = dir > 0 ? ks.find((k) => k > ply) : ks.slice().reverse().find((k) => k < ply);
      if (t != null) goTo(t);
    }
    function renderKeyBar() {
      const ks = keyPlies();
      if (!ks.length) { keyBar.replaceChildren(h('div.small.muted', 'No mistakes or blunders to review in this game.')); return; }
      const done = ks.filter((k) => k <= ply).length;
      keyBar.replaceChildren(
        h('button.btn.small', { disabled: !ks.some((k) => k < ply), onclick: () => jumpKey(-1), 'aria-label': 'Previous key moment' }, icon('left', 14), 'Prev'),
        h('div.grow.center.small', h('b', 'Key moments'), h('span.muted', ` ${done}/${ks.length}`)),
        h('button.btn.small', { disabled: !ks.some((k) => k > ply), onclick: () => jumpKey(1), 'aria-label': 'Next key moment' }, 'Next', icon('right', 14)));
    }
    /** Phones: the board is pinned at the top, so make sure the coach's note is not hidden underneath it after a jump. */
    function revealCoach() {
      if (!isMobile()) return;
      const bc = root.querySelector('.board-col'); const tw = root.querySelector('.tabs-wrap');
      if (!bc || !tw) return;
      const edge = bc.getBoundingClientRect().bottom; const r = tw.getBoundingClientRect();
      if (r.top < edge) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - edge - 6) });
    }
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
      renderInfo(); renderCoach(); renderLine(); renderKeyBar();
      if (!booting) revealCoach();
      if (mlist) { mlist.querySelectorAll('.mv').forEach((el) => el.classList.toggle('active', +el.dataset.idx === p - 1)); mlist.scrollToCurrent && mlist.scrollToCurrent(); }
      if (chart) chart.setCursor(p - 1);
      btnPrev.disabled = btnFirst.disabled = p === 0; btnNext.disabled = btnLast.disabled = p === n;
    }

    /** One-line summary pinned under the board on phones, so you always know which move and verdict you are looking at. */
    function renderBanner() {
      const m = ply > 0 ? mv(ply - 1) : null;
      const e = expandEval(review.evals[ply]);
      if (variation) { banner.replaceChildren(h('span.mb-dot', { style: { background: 'var(--info)' } }, '↯'), h('b', 'Exploring'), h('span.grow'), h('span.mb-eval', fmtEval(e, { noPlus: true }))); return; }
      if (!m) { banner.replaceChildren(h('b', review.opening ? review.opening.name : 'Start position'), h('span.grow'), h('span.mb-eval', fmtEval(e, { noPlus: true }))); return; }
      const c = CLASSES[m.cls];
      banner.replaceChildren(
        h('span.mb-dot', { style: { background: c ? c.color : 'var(--surface-3)' } }, (c && c.sym) || '✓'),
        h('b', `${m.moveNo}${m.color === 'w' ? '.' : '…'} ${m.san}`), h('span.muted.small', c ? c.label : ''), h('span.grow'), h('span.mb-eval', fmtEval(e, { noPlus: true })));
    }

    function renderInfo() {
      const m = ply > 0 ? mv(ply - 1) : null;
      info.replaceChildren(h('div.row.between', h('div.small.muted', m ? `${m.moveNo}${m.color === 'w' ? '.' : '…'} ${m.san}` : 'Start position'),
        review.opening ? h('span.tag.accent', review.opening.name) : null));
    }

    function renderCoach() {
      coachBox.replaceChildren();
      renderBanner();
      if (variation) {
        const v = variation;
        const card = h('div.card.coach-box', h('div.coach-head', h('div.coach-avatar', '🔬'), h('div.grow', h('b', 'Exploring a variation'), h('div.small.muted', 'Tap suggested moves or play your own — the engine checks every move.'))),
          v.msg ? h('p.var-msg', v.msg) : (v.pending ? h('p.small.muted', 'Evaluating…') : null));
        if (v.line) {
          card.append(h('div.coach-sec', h('h4', 'Line'), lineChips(v.line.fen, v.line.ucis, { n: 12, active: v.line.idx, onPick: (i) => previewLine(v.line.fen, v.line.ucis, i) }),
            lineStepper({ idx: v.line.idx, len: v.line.ucis.length, onStep: (i) => previewLine(v.line.fen, v.line.ucis, i) })));
        }
        if (v.suggest) {
          card.append(h('div.coach-sec', h('h4', 'Suggested moves from here'), suggestList(v.suggest.fen, v.suggest.lines, { onPick: (li, i) => previewLine(v.suggest.fen, v.suggest.lines[li].pv, i) })));
        }
        card.append(h('div.row.mt', h('button.btn.small.primary', { onclick: () => goTo(v.from) }, icon('repeat', 15), 'Back to the game'),
          v.chess.history().length ? h('button.btn.small', { onclick: () => undoVariation() }, icon('undo', 15), 'Undo') : null));
        coachBox.append(card);
        return;
      }
      if (ply === 0) {
        coachBox.append(h('div.card.coach-box', h('div.coach-head', h('div.coach-avatar', '🎓'), h('div.grow', h('b', 'Ready to review'), h('div.small.muted', review.opening ? review.opening.name : 'Step through the game with ← →'))),
          h('p.small.muted', 'Step through the game with the arrows under the board (or swipe left / right here), or jump straight to your mistakes with Prev / Next above. Moves marked ?! ? ?? come with a coaching note. Tap any suggested move to play it out, or play your own move on the board to explore a variation.')));
        return;
      }
      const m = mv(ply - 1);
      coachBox.append(coachCard(m, { onShowBest: m.best ? () => toggleBest(true) : null, onRetry: () => retry(m), onPlayLine: (fen, pv, i) => previewLine(fen, pv, i) }));
    }

    /** The engine's top choices for the position on the board. Every move is a button that plays the line out. */
    function renderLine() {
      lineBox.replaceChildren();
      if (variation) return;
      const next = mv(ply) || null;
      let lines = null;
      if (next && next.top && next.top.length) lines = next.top;
      else if (next && next.pv && next.pv.length) lines = [{ e: next.evalBefore, pv: next.pv }];
      else if (ply > 0 && mv(ply - 1).replyPv && mv(ply - 1).replyPv.length) lines = [{ e: expandEval(review.evals[ply]), pv: mv(ply - 1).replyPv }];
      if (!lines) return;
      const fen = fens[ply];
      lineBox.append(h('div.card.flat.sug-card', h('div.sug-head', h('b', 'Suggested moves'), h('span.xs.muted', 'tap a move to play it out')),
        suggestList(fen, lines.map((l) => ({ e: l.e && l.e.cp == null && l.e.mate == null ? expandEval(l.e) : l.e, pv: l.pv })), { n: 6, onPick: (li, i) => previewLine(fen, lines[li].pv, i) })));
    }

    /**
     * Play a suggested line out on the board up to move `idx` (-1 = its starting position). The result behaves like any
     * variation: it is evaluated, offers its own suggested moves, and you can keep playing your own moves from it.
     */
    function previewLine(fen, ucis, idx) {
      const all = parsePv(fen, ucis, 12);
      if (!all.length) return;
      idx = Math.max(-1, Math.min(all.length - 1, idx));
      const { chess: base, last } = replayPv(fen, all.map((m) => m.uci), idx);
      const from = variation ? variation.from : ply;
      variation = { chess: base, from, retry: null, msg: '', pending: true, suggest: null, line: { fen, ucis: all.map((m) => m.uci), idx } };
      if (last) playForMove(last, base.inCheck());
      board.setPosition(base.fen(), { lastMove: last ? { from: last.from, to: last.to } : null, animate: last ? [{ from: last.from, to: last.to }] : false, check: checkSquare(base) });
      board.clearOverlays(); bestShown = false;
      lineBox.replaceChildren();
      renderCoach(); revealCoach();
      evalVariation(base, last);
    }

    /** Take back the last move played inside a variation. */
    function undoVariation() {
      if (!variation || !variation.chess.history().length) return;
      const v = variation;
      if (v.line) { previewLine(v.line.fen, v.line.ucis, v.line.idx - 1); return; }
      v.chess.undo(); v.retry = null; v.msg = ''; v.suggest = null; v.pending = true;
      const hist = v.chess.history({ verbose: true }); const lm = hist[hist.length - 1];
      board.setPosition(v.chess.fen(), { lastMove: lm ? { from: lm.from, to: lm.to } : null, animate: false, check: checkSquare(v.chess) });
      board.clearOverlays(); renderCoach();
      evalVariation(v.chess, lm || null);
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
      variation = { chess: base, from, retry: retryMove && !retryMove.done ? retryMove : null, msg: '', pending: true, suggest: null, line: null };
      board.setPosition(base.fen(), { lastMove: { from: moved.from, to: moved.to }, animate: false, check: checkSquare(base) });
      board.clearOverlays();
      renderCoach(); lineBox.replaceChildren();
      await evalVariation(base, moved);
      return true;
    }

    /** Ask the engine about the position in the current variation (top three lines, so they can be offered as suggestions). */
    async function evalVariation(base, moved) {
      const my = ++liveToken;
      const v = variation;
      try {
        const engine = await ctx.engine();
        if (my !== liveToken || !alive || variation !== v) return;
        if (!engineSafe(base.fen()) || base.isGameOver()) { v.msg = base.isCheckmate() ? 'Checkmate.' : base.isGameOver() ? 'The game is over here.' : v.msg; v.pending = false; renderCoach(); return; }
        const r = await engine.go({ fen: base.fen(), depth: 12, multipv: 3 });
        if (my !== liveToken || !alive || variation !== v) return;
        const e = r.lines[0].white;
        evalBar.update(winPct(e), fmtEval(e, { noPlus: true }));
        const rm = v.retry;
        let reveal = true;
        if (rm && moved) {
          const col = rm.color;
          const before = col === 'w' ? winPct(expandEval(rm.evalBefore)) : 100 - winPct(expandEval(rm.evalBefore));
          const after = col === 'w' ? winPct(e) : 100 - winPct(e);
          const lossNow = before - after;
          rm.done = lossNow <= 6 || uciOf(moved) === rm.best;
          v.msg = uciOf(moved) === rm.best ? `Yes — ${moved.san} is the engine's top choice.` : lossNow <= 6 ? `${moved.san} works too (${fmtEval(e)}). The engine slightly prefers ${rm.bestSan}.` : lossNow <= 12 ? `${moved.san} is better than the original but still gives something up (${fmtEval(e)}). Try again.` : `Not quite — ${moved.san} still leaves you worse (${fmtEval(e)}). Think about the points the coach listed.`;
          reveal = rm.done;
          if (!rm.done) { setTimeout(() => { if (variation === v && v.retry === rm) { v.chess.undo(); board.setPosition(v.chess.fen(), { animate: false }); } }, 1100); }
        } else {
          v.msg = moved ? `${moved.san}: ${fmtEval(e)}` : `Position: ${fmtEval(e)}`;
        }
        v.suggest = reveal ? { fen: base.fen(), lines: r.lines.slice(0, 3) } : null;
        v.pending = false;
        renderCoach();
      } catch (er) { if (variation === v) { v.pending = false; if (alive) renderCoach(); } }
    }

    // controls
    const btnFirst = h('button.btn', { 'aria-label': 'First move', onclick: () => goTo(0) }, icon('first', 18));
    const btnPrev = h('button.btn', { 'aria-label': 'Previous move', onclick: () => goTo(ply - 1) }, icon('left', 18));
    const btnNext = h('button.btn', { 'aria-label': 'Next move', onclick: () => goTo(ply + 1) }, icon('right', 18));
    const btnLast = h('button.btn', { 'aria-label': 'Last move', onclick: () => goTo(n) }, icon('last', 18));
    const nav = h('div.nav-controls', btnFirst, btnPrev, btnNext, btnLast, h('button.btn', { 'aria-label': 'Flip board', onclick: () => board.flip(), title: 'Flip board' }, icon('flip', 18)));

    // tabs
    const reportTab = () => reportView(review, record, names, n);
    const movesTab = () => {
      mlist = moveList(review.moves.map((m) => ({ san: m.san, cls: m.cls })), { current: ply - 1, onSelect: (i) => goTo(i + 1), startColor: game.fens[0].split(' ')[1] });
      return h('div', mlist);
    };
    const tab = tabs([
      { id: 'coach', label: 'Coach', render: () => h('div.col', keyBar, info, coachBox, lineBox) },
      { id: 'moves', label: 'Moves', render: movesTab },
      { id: 'report', label: 'Report', render: reportTab },
    ], { active: 'coach' });

    chart = evalChart(review, { current: ply - 1, onSelect: (i) => goTo(i + 1, false) });
    chartBox.append(chart);

    const sideCol = h('div.side-col',
      h('div.card.acc-card', h('div.acc-row',
        h('div.center', h('div.acc-val', `${accBadge('w').toFixed(1)}`), h('div.xs.muted', names[0])),
        h('div.xs.faint', 'accuracy'),
        h('div.center', h('div.acc-val', `${accBadge('b').toFixed(1)}`), h('div.xs.muted', names[1])))),
      h('div.chart-box', chartBox), tab,
      h('div.row', h('button.btn.small', { onclick: () => { navigator.clipboard && navigator.clipboard.writeText(record.pgn || ''); toast('PGN copied', 'good'); } }, icon('copy', 15), 'Copy PGN'),
        record.id ? null : null,
        h('button.btn.small', { onclick: () => toInput() }, icon('plus', 15), 'New analysis'),
        record.color === 'none' || !record.color ? h('button.btn.small', { onclick: () => pickSide() }, icon('user', 15), 'I played…') : h('button.btn.small', { onclick: () => ctx.navigate('#/coach') }, icon('target', 15), 'See coaching plan')));

    root.replaceChildren(h('div.game-layout.review-layout',
      h('div.board-col', topBar.el, h('div.board-row', evalBar.el, h('div.board-box', board.el)), botBar.el, nav, banner),
      sideCol));

    /* phones: swipe left / right on the coach panel to step through the game */
    {
      let tx = 0, ty = 0, tt = 0, tracking = false;
      sideCol.addEventListener('touchstart', (e) => { tracking = e.touches.length === 1 && !e.target.closest('.chart-box,.tabs,.pv-line,.sug-list,.movelist,.line-stepper,textarea,input'); if (!tracking) return; tx = e.touches[0].clientX; ty = e.touches[0].clientY; tt = Date.now(); }, { passive: true });
      sideCol.addEventListener('touchend', (e) => {
        if (!tracking || variation) return; tracking = false;
        const t = e.changedTouches[0]; const dx = t.clientX - tx, dy = t.clientY - ty;
        if (Date.now() - tt < 600 && Math.abs(dx) > 70 && Math.abs(dy) < 40 && Math.abs(dx) > 2.2 * Math.abs(dy)) goTo(ply + (dx < 0 ? 1 : -1));
      }, { passive: true });
    }

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
    setTeardown(() => { alive = false; document.body.classList.remove('in-review'); document.removeEventListener('keydown', onKey); board.destroy(); });
    // first interesting moment: jump to first mistake/blunder of the player, else start
    const startAt = (() => { const c = record.color; const i = review.moves.findIndex((m) => (!c || c === 'none' || m.color === c) && ['mistake', 'blunder'].includes(m.cls)); return i >= 0 ? i + 1 : 0; })();
    goTo(0, false);
    if (startAt > 0 && ctx.query.game) { tab.show('coach'); goTo(startAt, false); }
    booting = false;
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
