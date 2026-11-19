// "Play a Game with Coach": a real game against the computer in which the coach TEACHES instead of answering.
//
// Before each move the coach gives a short checklist (what did they threaten? what can I take? is my move safe?).
// A blunder check judges every move with the engine; a mistake is intercepted BEFORE it is played, with a question
// ("look at e5...") rather than the best move. A hint ladder offers help in four steps, from a question to the move.
// Afterwards a report shows habits (not just mistakes) and what to train next.
import { Chess } from '../../vendor/chess.js';
import * as store from '../store.js';
import { h, icon, toast, modal, confirmDialog, avatar } from '../ui.js';
import { Board } from '../board.js';
import { LEVELS, levelByN, botMove } from '../bot.js';
import { legalTargetsFor, checkSquare, gameOverReason, uciOf, engineSafe } from '../chessutil.js';
import { judgeMove, searchPosition, LIVE } from '../judge.js';
import { CLASSES, moveAccuracy, povWin } from '../evalmath.js';
import { threatsAgainst, hangingPieces, targetsFor, positionFacts, moveInsight, narrateInsight, describeSquareList } from '../insight.js';
import { moveFeatures, phaseOf } from '../themes.js';
import { makeHint, describeMove, phaseAdvice, explainMove, sanOf, pvToSan, PRINCIPLES } from '../coach.js';
import { buildPgn, START_FEN, accuracyToRating } from '../analysis.js';
import { classBadge, coachCard, runTask } from '../components.js';
import { playerBar, moveList } from '../components.js';
import { play as sfx, playForMove } from '../sound.js';
import { trackPlan } from '../plan.js';
import { updateRating } from '../rating.js';

const MODES = [
  { id: 'guided', name: 'Guided', blurb: 'Questions before each move, blunder check, hints on request. Best for learning.' },
  { id: 'check', name: 'Blunder check only', blurb: 'No prompts. The coach only stops you before a serious mistake.' },
  { id: 'review', name: 'Silent', blurb: 'Play freely; the coach says nothing until the report at the end.' },
];
const NICE = { best: 'Best move', excellent: 'Excellent', good: 'Good', book: 'Book move', great: 'Great move', brilliant: 'Brilliant', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' };
const closest = (r) => LEVELS.reduce((b, l) => (Math.abs(l.elo - r) < Math.abs(b.elo - r) ? l : b), LEVELS[0]).n;

export default async function coachPlay(view, ctx) {
  let teardown = () => {};
  let disposed = false;
  const setup = () => { if (disposed) return; teardown(); teardown = () => {}; view.replaceChildren(setupView((cfg) => { teardown = gameView(view, ctx, cfg, setup); })); };
  setup();
  return () => { disposed = true; teardown(); };
}

/* ------------------------------------------------------------------ setup */
function setupView(onStart) {
  const s = store.get();
  const cp = s.coachPlay;
  const rating = Math.round(s.rating.value);
  const cfg = { level: cp.level || Math.max(1, closest(rating) - 1), color: 'w', mode: cp.mode || 'guided' };
  const root = h('div.page');
  const body = h('div');
  const draw = () => {
    const L = levelByN(cfg.level);
    body.replaceChildren(
      h('div.card.mb', h('div.card-title', icon('cpu', 18), 'Opponent'),
        h('select.select', { 'aria-label': 'Opponent', onchange: (e) => { cfg.level = +e.target.value; draw(); } }, LEVELS.map((l) => h('option', { value: l.n, selected: l.n === cfg.level }, `${l.n}. ${l.name} (~${l.elo})`))),
        h('div.small.muted.mt', L.blurb, L.elo > rating + 250 ? ' This is a big step up — expect a tough game.' : L.elo < rating - 350 ? ' Quite a bit weaker than you: good for practising a plan.' : ' A good match for learning.')),
      h('div.card.mb', h('div.card-title', icon('user', 18), 'Play as'),
        h('div.color-pick', [['w', 'White', 'wk'], ['r', 'Random', 'wn'], ['b', 'Black', 'bk']].map(([id, name, code]) => h('button', { class: cfg.color === id ? 'active' : '', onclick: () => { cfg.color = id; draw(); } }, h('div.piece', { class: `p-${code}` }), name)))),
      h('div.card.mb', h('div.card-title', icon('sparkle', 18), 'Coaching style'),
        h('div.col', MODES.map((m) => h('button.level-item', { class: cfg.mode === m.id ? 'active' : '', onclick: () => { cfg.mode = m.id; draw(); } }, h('div.grow', h('b', m.name), h('div.xs.muted', m.blurb)))))),
      h('button.btn.primary.big.block', { onclick: () => { store.update((st) => { st.coachPlay.level = cfg.level; st.coachPlay.mode = cfg.mode; }); onStart({ ...cfg, color: cfg.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : cfg.color }); } }, icon('play', 18), 'Start the game'));
  };
  draw();
  root.append(
    h('div.page-head', h('h1', 'Play a Game with Coach')),
    h('div.card.mb.flat', h('b', 'How this works'), h('ul.small.muted', { style: { paddingLeft: '18px', margin: '6px 0 0' } },
      h('li', h('b', 'Think first. '), 'Before each move the coach asks what your opponent is threatening, what you can win and whether your move is safe — it does not tell you the move.'),
      h('li', h('b', 'The blunder check. '), 'If your move loses material or worse, the coach stops you and asks you to look again. You can always override it.'),
      h('li', h('b', 'Hints that teach. '), 'Four steps: an idea, a piece, a square, the move — take only as many as you need.'),
      h('li', h('b', 'A report on your habits. '), 'At the end: what you did well, your recurring slips, and exactly what to practise.'))),
    body);
  return root;
}

/* ------------------------------------------------------------------ game */
function gameView(view, ctx, cfg, back) {
  const s0 = store.get();
  const settings = s0.settings;
  const L = levelByN(cfg.level);
  const me = cfg.color, bot = me === 'w' ? 'b' : 'w';
  const guided = cfg.mode === 'guided', checking = cfg.mode !== 'review';
  const chess = new Chess();
  let alive = true, over = false, busy = false, token = 0, hintLevel = 0, intercepts = 0, planned = null;
  const recs = [];                 // one record per move I played
  const habits = { intercepted: 0, overridden: 0, hints: 0, retried: 0, ignoredThreat: 0 };
  let prefetch = null;
  const sans = [], ucis = [];

  const board = new Board(h('div'), { orientation: me, coords: settings.coords, legalDots: settings.legalDots, autoQueen: settings.autoQueen, animate: settings.animations, interactive: true,
    canSelect: (sq) => !over && !busy && chess.turn() === me && chess.get(sq) && chess.get(sq).color === me,
    legalTargets: (sq) => legalTargetsFor(chess, sq), onMove: (m) => humanMove(m) });
  const checklist = h('div.card.checklist');
  const talk = h('div.card.talk');
  const status = h('div.small.muted', { style: { minHeight: '20px' } });
  const moves = h('div.card.moves');
  const hintBtn = h('button.btn', { onclick: () => giveHint() }, icon('bulb', 16), 'Hint');
  const resignBtn = h('button.btn.ghost', { onclick: async () => { if (!over && await confirmDialog('Resign this game?', 'The coach will still prepare your report.')) finish('resign'); } }, icon('flag', 16), 'Resign');
  const top = playerBar({ name: L.name, rating: L.elo, color: bot, avatarEl: h('div.avatar', { style: { width: '38px', height: '38px', background: 'var(--surface-3)', fontSize: '20px' } }, '🤖') });
  const profile = store.get().profile;
  const bottom = playerBar({ name: profile.name, rating: Math.round(s0.rating.value), color: me, avatarEl: avatar(profile, 38) });
  view.replaceChildren(h('div.page', h('div.row.between', h('button.back', { onclick: () => { if (over || !sans.length) back(); else confirmDialog('Leave this game?', 'The game will not be saved.').then((ok) => ok && back()); } }, icon('left', 16), 'Coach play'), h('span.tag.accent', MODES.find((m) => m.id === cfg.mode).name)),
    h('div.game-layout', h('div.board-col', top.el, h('div.board-box', board.el), bottom.el, status),
      h('div.side-col', checklist, talk, h('div.row', hintBtn, resignBtn), moves))));
  hintBtn.classList.toggle('hidden', !guided);

  /* ---------- coach voice ---------- */
  const say = (node, kind = '') => { talk.prepend(h('div.say', { class: kind }, ...(Array.isArray(node) ? node : [node]))); while (talk.children.length > 4) talk.lastChild.remove(); };
  const sayText = (t, kind) => say(String(t).split('\n').map((p) => h('p', p)), kind);
  const engine = () => ctx.engine();
  const phase = () => phaseOf(chess.fen(), sans.length);
  const showMoves = () => moves.replaceChildren(moveList(chess.history({ verbose: true }).map((m, i) => ({ san: m.san, cls: (recs.find((r) => r.ply === i) || {}).cls })), { current: sans.length - 1 }));

  /* ---------- pre-move checklist (questions, not answers) ---------- */
  async function beginMyTurn() {
    hintLevel = 0; busy = false; board.setHint([]); board.setArrows([]); board.setMarks({});
    board.setInteractive(true);
    const fen = chess.fen();
    // start thinking about the position now, so judging my move later is instant
    prefetch = engineSafe(fen) ? engine().then((e) => searchPosition(e, fen, { depth: 12, movetime: 900 })).catch(() => null) : null;
    if (!guided) { checklist.replaceChildren(); return; }
    const last = chess.history({ verbose: true }).slice(-1)[0];
    const th = threatsAgainst(fen, me, { limit: 3 });
    const hang = hangingPieces(fen, me);
    const win = targetsFor(fen, me);
    const ph = phase();
    const facts = positionFacts(fen, me);
    const items = [];
    items.push({ q: last ? `What did ${last.san} change?` : 'It is your move — what does the opening checklist say?', a: last ? (th.length ? th.slice(0, 2).map((t) => t.text).join(' ') : 'It makes no direct threat — you have time to improve your position.') : phaseAdvice(fen, me, 'opening'), kind: th.length ? 'warn' : 'ok', squares: th.flatMap((t) => t.squares) });
    items.push({ q: 'Can you win something?', a: win.length ? `The ${win.slice(0, 2).map((t) => `${t.type === 'n' ? 'knight' : t.type === 'b' ? 'bishop' : t.type === 'r' ? 'rook' : t.type === 'q' ? 'queen' : 'pawn'} on ${t.square}`).join(' and ')} ${win.length > 1 ? 'are' : 'is'} loose or attackable.` : 'Nothing is hanging right now — look for checks and threats instead.', kind: win.length ? 'good' : 'ok', squares: win.map((t) => t.square) });
    items.push({ q: 'Is everything of yours safe?', a: hang.length ? `Careful: your ${hang.slice(0, 2).map((t) => `${t.type === 'n' ? 'knight' : t.type === 'b' ? 'bishop' : t.type === 'r' ? 'rook' : t.type === 'q' ? 'queen' : 'pawn'} on ${t.square}`).join(' and ')} could be captured.` : 'Everything is protected. After your move, check that this is still true.', kind: hang.length ? 'warn' : 'ok', squares: hang.map((t) => t.square) });
    if (ph === 'opening') items.push({ q: 'Opening checklist', a: phaseAdvice(fen, me, 'opening'), kind: 'ok', squares: [] });
    const reveal = new Set();
    const render = () => checklist.replaceChildren(h('div.card-title', icon('target', 18), 'Before you move'),
      h('div.small.muted.mb', 'Answer these in your head first. Tap a question only to check yourself.'),
      ...items.map((it, i) => h('div.cl-item', { class: reveal.has(i) ? 'open ' + it.kind : '' },
        h('button.cl-q', { onclick: () => { if (reveal.has(i)) reveal.delete(i); else { reveal.add(i); if (it.kind === 'warn') habits.hints += 0; board.setMarks(Object.fromEntries(it.squares.map((s) => [s, it.kind === 'good' ? 'good' : 'warn']))); } render(); } }, h('span', it.q), icon(reveal.has(i) ? 'check' : 'right', 14)),
        reveal.has(i) ? h('div.cl-a', it.a) : null)));
    render();
    planned = { th, hang, win };
  }

  /* ---------- hint ladder ---------- */
  async function giveHint() {
    if (over || busy || chess.turn() !== me) return;
    const fen = chess.fen();
    const pf = prefetch ? await prefetch : null;
    const lines = pf ? pf.lines : (await searchPosition(await engine(), fen, { depth: 12, movetime: 900 })).lines;
    const best = lines[0] && lines[0].pv[0];
    if (!best) return;
    hintLevel = Math.min(4, hintLevel + 1); habits.hints++;
    const f = moveFeatures(fen, best);
    if (hintLevel === 1) {
      const t = makeHint(fen, best, 1).text;
      sayText(`Hint 1 of 4 — the idea. ${t}`);
    } else if (hintLevel === 2) { board.setHint([best.slice(0, 2)]); sayText(`Hint 2 of 4 — the piece. Look at the highlighted piece. What could it do?`); }
    else if (hintLevel === 3) { board.setHint([best.slice(0, 2)]); board.setMarks({ [best.slice(2, 4)]: 'info' }); sayText(`Hint 3 of 4 — the square. The marked square is where this piece wants to go. Why is it good there?`); }
    else { board.setArrows([{ from: best.slice(0, 2), to: best.slice(2, 4), color: '#5fc88f', opacity: 0.95 }]); sayText(`Hint 4 of 4 — ${f ? f.san : ''}. It ${f ? describeMove(f, f.san) : 'is the engine\'s choice'}. Play it, then tell yourself why it works.`); }
  }

  /* ---------- my move: judge, maybe intercept ---------- */
  async function humanMove(m) {
    if (over || busy || chess.turn() !== me) return false;
    const fen = chess.fen();
    let mv;
    try { mv = new Chess(fen).move({ from: m.from, to: m.to, promotion: m.promotion }); } catch (e) { return false; }
    if (!mv) return false;
    const uci = mv.from + mv.to + (mv.promotion || '');
    busy = true; board.setInteractive(false);
    // show the move at once, judge it, and take it back if the coach intercepts
    chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    playForMove(mv, chess.inCheck());
    board.setPosition(chess.fen(), { lastMove: { from: mv.from, to: mv.to }, animate: false, check: checkSquare(chess) });
    board.setHint([]); board.setMarks({}); board.setArrows([]);
    status.textContent = checking ? 'Checking your move…' : '';
    let j = null;
    if (engineSafe(fen)) {
      try {
        const e = await engine();
        const pf = prefetch ? await prefetch : null;
        if (!alive) return true;
        j = await judgeMove(e, fen, uci, { lines: pf ? pf.lines : null, depth: 12, movetime: 1000 });
      } catch (err) { j = null; }
    }
    if (!alive) return true;
    status.textContent = '';
    const bad = j && (j.cls === 'blunder' || j.cls === 'mistake') && j.loss >= 10;
    const canIntercept = checking && bad && intercepts < 40;
    if (canIntercept) {
      intercepts++; habits.intercepted++;
      const r = interceptText(fen, mv, j);
      chess.undo();
      board.setPosition(chess.fen(), { lastMove: lastMoveOf(), animate: false, check: checkSquare(chess) });
      board.setMarks(Object.fromEntries(r.squares.map((s) => [s, 'warn'])));
      sfx('bad');
      showIntercept(r, mv, j, uci);
      return false;
    }
    commit(mv, uci, j, fen);
    return true;
  }
  const lastMoveOf = () => { const h2 = chess.history({ verbose: true }).slice(-1)[0]; return h2 ? { from: h2.from, to: h2.to } : null; };

  /** What to say when a move is intercepted: a question about the consequence, not the better move. */
  function interceptText(fen, mv, j) {
    const after = new Chess(fen); after.move(mv.san);
    const replyUci = (j.playedPv || [])[1];
    const reply = replyUci ? moveFeatures(after.fen(), replyUci) : null;
    const squares = [mv.to];
    let q, tell;
    const mated = j.playedEval && j.playedEval.mate != null && ((j.playedEval.mate < 0) === (me === 'w'));
    if (mated) { q = `Wait. After ${mv.san}, look at every check your opponent has. Is your king really safe?`; tell = reply ? `${reply.san} leads to a forced checkmate.` : 'There is a forced checkmate against you.'; if (reply) squares.push(replyUci.slice(2, 4)); }
    else if (reply && reply.info.captured) { const sq = replyUci.slice(2, 4); squares.push(sq); q = `Hold on. After ${mv.san}, what can your opponent capture? Look at ${sq}.`; tell = `${reply.san} wins your ${({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' })[reply.info.captured] || 'piece'} on ${sq}${j.bestEval && Math.abs(j.loss) > 0 ? '' : ''}.`; }
    else if (reply && (reply.themes.includes('fork') || reply.themes.includes('pin') || reply.themes.includes('skewer'))) { const t = ['fork', 'pin', 'skewer'].find((x) => reply.themes.includes(x)); squares.push(replyUci.slice(2, 4)); q = `Hold on. Your opponent has a strong reply to ${mv.san}. Can a single enemy piece attack two of yours (a ${t})?`; tell = `${reply.san} would give them a ${t}.`; }
    else if (reply) { squares.push(replyUci.slice(2, 4)); q = `Hold on — ${mv.san} gives your opponent a strong answer. What is the most dangerous thing they can do next?`; tell = `The engine's answer is ${reply.san}; it leaves you clearly worse.`; }
    else { q = `Hold on — the engine thinks ${mv.san} is a ${j.cls}. Re-check what it leaves undefended.`; tell = 'It leaves you clearly worse than other moves.'; }
    return { q, tell, squares };
  }
  function showIntercept(r, mv, j, uci) {
    let stage = 0;
    const box = h('div.intercept');
    const render = () => {
      box.replaceChildren(h('div.row.tight', h('b', 'Blunder check'), h('span.tag.bad', j.cls === 'blunder' ? 'Serious' : 'Risky')),
        h('p', r.q),
        stage >= 1 ? h('p.tell', icon('eye', 14), ' ', r.tell) : null,
        h('div.row',
          h('button.btn.primary', { onclick: () => { habits.retried++; box.remove(); busy = false; board.setMarks({}); beginMyTurnKeep(); } }, icon('undo', 16), 'Take it back and think'),
          stage < 1 ? h('button.btn', { onclick: () => { stage = 1; render(); } }, 'Show me what is wrong') : null,
          h('button.btn.ghost', { onclick: () => { habits.overridden++; box.remove(); board.setMarks({}); chess.move(mv.san); const f0 = new Chess(chess.fen()); f0.undo(); commit(mv, uci, j, f0.fen(), true); board.setPosition(chess.fen(), { lastMove: { from: mv.from, to: mv.to }, animate: false, check: checkSquare(chess) }); } }, 'Play it anyway')));
    };
    render();
    talk.prepend(box);
    while (talk.children.length > 4) talk.lastChild.remove();
    // the learner is thinking again: board stays interactive once they pick "take it back"
  }
  function beginMyTurnKeep() { busy = false; board.setInteractive(true); status.textContent = 'Your move — look for something safer.'; }

  /* ---------- commit a move that stands ---------- */
  function commit(mv, uci, j, fenBefore, overridden = false) {
    const ply = sans.length;
    sans.push(mv.san); ucis.push(uci);
    const rec = { ply, fenBefore, san: mv.san, uci, moveNo: Math.floor(ply / 2) + 1, color: me, cls: j ? j.cls : 'good', loss: j ? j.loss : 0, cpLoss: j ? j.cpLoss : 0, j, overridden, hints: hintLevel, phase: phaseOf(fenBefore, ply) };
    recs.push(rec);
    if (guided || checking) feedback(rec, mv);
    showMoves(); top.setCaptured(chess.fen()); bottom.setCaptured(chess.fen());
    if (checkEnd()) return;
    botTurn();
  }
  function feedback(rec, mv) {
    const f = moveFeatures(rec.fenBefore, rec.uci);
    if (!guided) { if (rec.overridden) sayText(`You played ${mv.san} against the warning. The report will cover it.`); return; }
    if (rec.cls === 'blunder' || rec.cls === 'mistake') {
      sayText(`${mv.san}: ${NICE[rec.cls]}. Noted — we will look at the position together in the report.`, 'bad');
    } else if (rec.cls === 'inaccuracy') {
      sayText(`${mv.san} is playable, but there was a more accurate move. I will show you in the report.`);
    } else if (rec.cls === 'brilliant' || rec.cls === 'great') {
      sayText(`${mv.san} — ${NICE[rec.cls]}! ${f ? `It ${describeMove(f, mv.san)}.` : ''}`, 'good');
    } else if (rec.cls === 'best' || rec.cls === 'excellent') {
      sayText(`${mv.san} — ${NICE[rec.cls].toLowerCase()}. ${f ? `It ${describeMove(f, mv.san)}.` : ''}`, 'good');
    }
    sfx(rec.cls === 'blunder' || rec.cls === 'mistake' ? 'bad' : 'good');
  }

  /* ---------- bot reply ---------- */
  async function botTurn() {
    if (over) return;
    busy = true; board.setInteractive(false);
    status.textContent = `${L.name} is thinking…`;
    const my = ++token;
    const fen = chess.fen();
    await new Promise((r) => setTimeout(r, 350));
    let uci;
    try { const e = await engine(); const r = await botMove(e, fen, cfg.level); uci = r.uci; } catch (e) { uci = null; }
    if (!alive || my !== token) return;
    status.textContent = '';
    if (!uci) { const mv = chess.moves({ verbose: true })[0]; uci = mv.from + mv.to + (mv.promotion || ''); }
    const mv = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    sans.push(mv.san); ucis.push(uci);
    playForMove(mv, chess.inCheck());
    board.setPosition(chess.fen(), { lastMove: { from: mv.from, to: mv.to }, animate: [{ from: mv.from, to: mv.to }], check: checkSquare(chess) });
    showMoves(); top.setCaptured(chess.fen()); bottom.setCaptured(chess.fen());
    if (checkEnd()) return;
    beginMyTurn();
  }

  function checkEnd() {
    if (chess.isGameOver()) { finish(chess.isCheckmate() ? (chess.turn() === me ? 'lose' : 'win') : 'draw'); return true; }
    return false;
  }

  /* ---------- the report ---------- */
  async function finish(how) {
    if (over) return;
    over = true; busy = true; board.setInteractive(false); token++;
    const outcome = how === 'resign' ? 'loss' : how === 'win' ? 'win' : how === 'lose' ? 'loss' : 'draw';
    const reason = how === 'resign' ? 'resignation' : gameOverReason(chess) || 'game over';
    checklist.remove(); status.textContent = 'Preparing your report…';
    const result = outcome === 'draw' ? '1/2-1/2' : (outcome === 'win') === (me === 'w') ? '1-0' : '0-1';
    const pgn = buildPgn({ sans, headers: { White: me === 'w' ? 'You' : `${L.name} (${L.elo})`, Black: me === 'b' ? 'You' : `${L.name} (${L.elo})`, Result: result } });
    const id = store.saveGame({ source: 'coach-play', color: me, result, outcome, reason, sans: sans.slice(), pgn, level: cfg.level, oppElo: L.elo, oppName: L.name, tc: 'unlimited', rated: false, startFen: START_FEN, moves: sans.length });
    store.logActivity('games'); trackPlan({ kind: 'play' });
    sfx(outcome === 'win' ? 'win' : 'end');
    const rep = buildReport();
    store.update((s) => {
      const c = s.coachPlay; c.games++; c.lastFocus = rep.focus ? rep.focus.label : null;
      for (const k of Object.keys(rep.habitFlags)) c.habits[k] = (c.habits[k] || 0) + (rep.habitFlags[k] ? 1 : 0);
      if (outcome === 'win' && rep.accuracy >= 70) c.level = Math.min(10, cfg.level + 1); else if (outcome === 'loss' && rep.accuracy < 55) c.level = Math.max(1, cfg.level - 1);
    });
    ctx.refreshChrome && ctx.refreshChrome();
    status.textContent = '';
    view.replaceChildren(reportView(rep, outcome, reason, id));
  }

  function buildReport() {
    const mine = recs.filter((r) => r.color === me);
    const by = {}; mine.forEach((r) => { by[r.cls] = (by[r.cls] || 0) + 1; });
    const accs = mine.map((r) => moveAccuracy(r.loss));
    const accuracy = accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : 0;
    const bad = mine.filter((r) => r.cls === 'blunder' || r.cls === 'mistake').sort((a, b) => b.loss - a.loss);
    const moments = bad.slice(0, 3).map((r) => {
      const j = r.j;
      let coach = null;
      try {
        const fenAfter = new Chess(r.fenBefore); fenAfter.move(r.san);
        const m = { ply: r.ply, moveNo: r.moveNo, color: r.color, san: r.san, uci: r.uci, cls: r.cls, loss: r.loss, cpLoss: r.cpLoss, fenBefore: r.fenBefore, fenAfter: fenAfter.fen(), phase: r.phase,
          evalBefore: j.bestEval, evalAfter: j.playedEval, evalPlayed: j.playedEval, best: j.best, bestSan: sanOf(r.fenBefore, j.best), pv: j.bestPv, replyPv: (j.playedPv || []).slice(1), top: false };
        coach = explainMove(m, { prevUcis: ucis.slice(0, r.ply) });
        m.coach = coach; return { r, m };
      } catch (e) { return { r, m: null }; }
    });
    // habits: things the player controls, with an honest read
    const opening = mine.filter((r) => r.phase === 'opening');
    const openingBad = opening.filter((r) => r.loss >= 6).length;
    const lateGame = new Chess(); sans.forEach((s) => lateGame.move(s));
    const f = positionFacts(lateGame.fen(), me);
    const hung = mine.filter((r) => r.loss >= 10 && r.cls !== 'brilliant').length;
    const habitFlags = { hangingPieces: hung >= 1, ignoredWarnings: habits.overridden > 0, usedHints: habits.hints >= 3, openingTrouble: openingBad >= 2 };
    const notes = [];
    if (habits.intercepted) notes.push({ tone: habits.overridden ? 'warn' : 'good', text: `The blunder check stopped ${habits.intercepted} move${habits.intercepted === 1 ? '' : 's'}; you rethought ${habits.retried} of them${habits.overridden ? ` and played ${habits.overridden} anyway` : ''}. ${habits.retried ? 'Taking the move back is the habit that wins games.' : ''}` });
    if (habits.hints) notes.push({ tone: 'ok', text: `You used ${habits.hints} hint${habits.hints === 1 ? '' : 's'}. ${habits.hints > 5 ? 'Try to solve the position with the checklist before asking next time.' : 'Good balance — hints are for learning.'}` });
    if (opening.length >= 4) notes.push({ tone: openingBad ? 'warn' : 'good', text: openingBad ? `${openingBad} of your first ${opening.length} moves were inaccurate. Revisit the three golden rules: centre, develop, castle.` : 'Your opening followed the golden rules. Nice.' });
    if (mine.length > 8 && !f.castled && !f.kingCentral === false) notes.push({ tone: 'warn', text: 'Your king was still in the centre at the end of the game. Castling early is the simplest safety habit.' });
    const best = mine.filter((r) => ['brilliant', 'great', 'best'].includes(r.cls)).slice(0, 3);
    // the single most useful focus, from the worst mistake's tag
    const first = moments.find((x) => x.m && x.m.coach);
    const focus = first ? { label: first.m.coach.recommendation.label, tasks: first.m.coach.recommendation.tasks, principle: first.m.coach.principle } : null;
    return { by, accuracy, moments, notes, best, focus, habitFlags, total: mine.length, elo: accuracyToRating(accuracy, mine.length) };
  }

  function reportView(rep, outcome, reason, id) {
    const root = h('div.page');
    const title = outcome === 'win' ? 'You won!' : outcome === 'draw' ? 'A draw' : 'Game over';
    const cls = ['brilliant', 'great', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'];
    root.append(
      h('div.page-head', h('h1', 'Coach report'), h('span.tag.accent', `${title} · by ${reason}`)),
      h('div.card.mb', h('div.row.around', stat(rep.accuracy + '%', 'Accuracy'), stat(String(rep.total), 'Your moves'), stat(String(rep.by.blunder || 0), 'Blunders'), stat(String(rep.by.mistake || 0), 'Mistakes')),
        h('div.row.mt.tight', ...cls.filter((c) => rep.by[c]).map((c) => h('span.tag', { class: c }, `${rep.by[c]} ${NICE[c].toLowerCase()}`)))),
      rep.notes.length ? h('div.card.mb', h('div.card-title', icon('trend', 18), 'Your habits'), ...rep.notes.map((n) => h('div.say', { class: n.tone }, h('p', n.text)))) : null,
      rep.moments.length ? h('div.mb', h('h3', 'Turning points'), h('p.small.muted', 'The moves that cost you most — look at each position and find the problem before you read the coach.'),
        ...rep.moments.filter((x) => x.m).map((x) => h('div.mb', h('div.small.muted', `Position before move ${x.m.moveNo}${x.m.color === 'w' ? '.' : '...'}`), coachCard(x.m, { onTask: runTask })))) :
        h('div.card.mb', h('b', 'No serious mistakes!'), h('div.small.muted', 'You avoided the big errors. Play a stronger opponent for a bigger challenge.')),
      rep.best.length ? h('div.card.mb', h('div.card-title', icon('award', 18), 'Moves to be proud of'), ...rep.best.map((r) => { const f = moveFeatures(r.fenBefore, r.uci); return h('div.say.good', h('p', `${r.moveNo}${r.color === 'w' ? '.' : '...'} ${r.san} (${NICE[r.cls].toLowerCase()}) — ${f ? 'it ' + describeMove(f, r.san) + '.' : ''}`)); })) : null,
      rep.focus ? h('div.card.mb.rec-card', h('div.card-title', icon('target', 18), 'What to practise next'), h('p', h('b', rep.focus.label)), h('p.small.muted', rep.focus.principle), h('div.row', rep.focus.tasks.slice(0, 3).map((t) => h('button.btn.small', { onclick: () => runTask(t) }, t.label)))) : null,
      h('div.row', h('a.btn.primary', { href: `#/analyze?game=${id}` }, icon('search', 18), 'Full engine analysis'), h('button.btn', { onclick: back }, 'Play again'), h('a.btn.ghost', { href: '#/learn' }, 'Go to Learn')));
    return root;
  }
  const stat = (v, l) => h('div.stat', h('b', v), h('span', l));

  /* ---------- boot ---------- */
  board.setPosition(chess.fen(), { animate: false });
  sfx('start');
  sayText(guided ? `Let's play! You are ${me === 'w' ? 'White' : 'Black'} against ${L.name}. Before each move, use the checklist on the right. I will not give you moves unless you ask — and I will stop you if you are about to blunder.` : `Good luck! I will stay quiet and only step in before a serious mistake.`);
  showMoves(); top.setCaptured(chess.fen()); bottom.setCaptured(chess.fen());
  if (me === 'w') beginMyTurn(); else botTurn();
  return () => { alive = false; token++; board.destroy(); };
}
