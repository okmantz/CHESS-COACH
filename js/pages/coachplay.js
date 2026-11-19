// "Play a Game with Coach": a real game on the road from 600 to 2600, in which the coach TEACHES instead of answering.
//
// Before each move the coach gives a short checklist (what did they threaten? what can I take? is my move safe?).
// A blunder check judges every move with the engine; a mistake is intercepted BEFORE it is played, with a question
// ("look at e5...") rather than the best move. A hint ladder offers help in four steps, from a question to the move.
// The coach also explains the OPPONENT's moves, with more hand-holding on the low rungs that fades as you climb.
// Afterwards a report shows habits and exactly what to practise, and says whether you passed the rung (see ladder.js).
import { Chess } from '../../vendor/chess.js';
import * as store from '../store.js';
import { h, icon, confirmDialog, avatar, modal, tabs } from '../ui.js';
import { Board } from '../board.js';
import { levelByN, botMove } from '../bot.js';
import { legalTargetsFor, checkSquare, gameOverReason, engineSafe } from '../chessutil.js';
import { judgeMove, searchPosition } from '../judge.js';
import { moveAccuracy } from '../evalmath.js';
import { threatsAgainst, hangingPieces, targetsFor, positionFacts, moveInsight, narrateInsight } from '../insight.js';
import { moveFeatures, phaseOf } from '../themes.js';
import { makeHint, describeMove, phaseAdvice, explainMove, sanOf } from '../coach.js';
import { buildPgn, START_FEN, accuracyToRating } from '../analysis.js';
import { coachCard, runTask, playerBar } from '../components.js';
import { opponentStage, coachDock, moveStrip, isMobile } from '../gameui.js';
import { opponentPicker, roadMap, roadStrip, tierDetail } from '../ladderui.js';
import { react, best as bestReaction, line as personaLine } from '../personas.js';
import { tier, currentRung, recordResult, progressFor, isPassed } from '../ladder.js';
import { avatarEl } from '../avatars.js';
import { play as sfx, playForMove } from '../sound.js';
import { trackPlan } from '../plan.js';

const MODES = [
  { id: 'guided', name: 'Guided', blurb: 'Questions before each move, explanations of their moves, blunder check, hints on request. Best for learning.' },
  { id: 'check', name: 'Blunder check only', blurb: 'No prompts. The coach only stops you before a serious mistake.' },
  { id: 'review', name: 'Silent', blurb: 'Play freely; the coach says nothing until the report at the end.' },
];
const NICE = { best: 'Best move', excellent: 'Excellent', good: 'Good', book: 'Book move', great: 'Great move', brilliant: 'Brilliant', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' };
const PN = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const evCp = (e, color) => (!e ? null : (e.mate != null ? (e.mate > 0 ? 10000 : -10000) : e.cp) * (color === 'w' ? 1 : -1));
/** How much the coach hand-holds, by rung: fades as the player improves. */
export const supportLevel = (n) => (n <= 3 ? 'high' : n <= 6 ? 'medium' : 'light');
const SUPPORT_TEXT = { high: 'High support — the coach warns you about threats and explains every opponent move.', medium: 'Medium support — the coach explains opponent moves and nudges you to look for threats yourself.', light: 'Light support — the coach explains moves briefly and stays out of your way.' };

export default async function coachPlay(view, ctx) {
  let teardown = () => {};
  let disposed = false;
  const setup = (preset) => { if (disposed) return; teardown(); teardown = () => {}; view.replaceChildren(setupView(preset, (cfg) => { teardown = gameView(view, ctx, cfg, setup); })); window.scrollTo(0, 0); };
  setup();
  return () => { disposed = true; teardown(); };
}

/* ------------------------------------------------------------------ setup: the road + the game options */
function setupView(preset, onStart) {
  const s = store.get();
  const cp = s.coachPlay;
  const rating = Math.round(s.rating.value);
  const rung = currentRung();
  const cfg = { level: (preset && preset.level) || rung, color: 'w', mode: cp.mode || 'guided' };
  const root = h('div.page');
  const playBox = h('div');

  const start = () => { store.update((st) => { st.coachPlay.level = cfg.level; st.coachPlay.mode = cfg.mode; }); onStart({ ...cfg, color: cfg.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : cfg.color }); };
  const picker = opponentPicker(cfg, { rating, onChange: () => drawRest() });
  const rest = h('div');
  const drawRest = () => {
    const t = tier(cfg.level);
    const pf = progressFor(cfg.level);
    const sup = supportLevel(cfg.level);
    rest.replaceChildren(
      h('div.card.mb.coach-plan', { style: { '--tier': t.color } },
        h('div.row.nowrapr', avatarEl({ kind: 'portrait', value: 'coach' }, 44, { square: true, ring: '#f5c451' }), h('div.grow', h('b', `Coach's plan against ${t.who}`), h('div.xs.muted', SUPPORT_TEXT[sup]))),
        h('p.small.mt', t.expect),
        h('ul.small', { style: { paddingLeft: '18px', margin: '4px 0 8px' } }, t.skills.map((x) => h('li', x))),
        h('div.gate', h('div.row.tight', icon('target', 16), h('b', isPassed(cfg.level) ? 'Passed — play again to improve' : 'To pass this rung')), h('div.small.muted', `Win with at least ${t.target}% accuracy, or win ${t.needWins} games. Study ${pf.studied}/${pf.total} steps done.`),
          !isPassed(cfg.level) && pf.studied < Math.ceil(pf.total / 2) ? h('div.xs.mt', icon('bulb', 12), ' Tip: spend 10 minutes on the study steps first — open "The road" tab.') : null)),
      h('div.card.mb', h('div.card-title', icon('user', 18), 'Play as'),
        h('div.color-pick', [['w', 'White', 'wk'], ['r', 'Random', 'wn'], ['b', 'Black', 'bk']].map(([id, name, code]) => h('button', { class: cfg.color === id ? 'active' : '', onclick: () => { cfg.color = id; drawRest(); } }, h('div.piece', { class: `p-${code}` }), name)))),
      h('div.card.mb', h('div.card-title', icon('sparkle', 18), 'Coaching style'),
        h('div.col', MODES.map((m) => h('button.level-item', { class: cfg.mode === m.id ? 'active' : '', onclick: () => { cfg.mode = m.id; drawRest(); } }, h('div.grow', h('b', m.name), h('div.xs.muted', m.blurb)))))),
      h('button.btn.primary.big.block', { onclick: start }, icon('play', 18), `Play ${t.who} (${t.elo})`));
  };
  drawRest();

  const next = tier(rung);
  const goal = h('div.card.mb.goal-card', { style: { '--tier': next.color } },
    h('div.row.nowrapr', avatarEl({ kind: 'portrait', value: next.avatar }, 52, { square: true, ring: next.color }), h('div.grow', h('div.eyebrow', isPassed(10) ? 'Road complete' : 'Your next goal'), h('b', isPassed(10) ? 'You beat the Grandmaster. Keep sharpening!' : `Beat ${next.who} (${next.elo}) with ${next.target}%+ accuracy`), h('div.xs.muted', 'Each win moves you one step up the road. The coach helps with every step.'))),
    h('div.mt', roadStrip({ href: '#/coach-play' })));

  const tabsEl = tabs([
    { id: 'play', label: 'Play', render: () => h('div', h('div.card.mb', h('div.card-title', icon('cpu', 18), 'Choose your opponent'), picker), rest) },
    { id: 'road', label: 'The road', render: () => h('div', h('p.small.muted.mb', 'Ten opponents, ten steps: 600 → 2600. Open a rung to see what to learn, what to practise and exactly what you need to pass.'), roadMap({ selected: rung, onPlay: (n) => { cfg.level = n; picker.refresh(); drawRest(); tabsEl.show('play'); window.scrollTo(0, 0); } })) },
    { id: 'how', label: 'How it works', render: () => howItWorks() },
  ], { active: preset && preset.tab ? preset.tab : 'play' });
  root.append(h('div.page-head', h('h1', 'Play with Coach')), goal, tabsEl);
  return root;
}

function howItWorks() {
  return h('div.col',
    h('div.card', h('div.card-title', icon('target', 18), 'Think first'), h('p.small.muted', 'Before each move the coach asks what your opponent is threatening, what you can win and whether your move is safe. It does not tell you the move.')),
    h('div.card', h('div.card-title', icon('flag', 18), 'The blunder check'), h('p.small.muted', 'If your move loses material or worse, the coach stops you and asks you to look again. You can always override it.')),
    h('div.card', h('div.card-title', icon('eye', 18), 'Understand their moves'), h('p.small.muted', 'After each opponent move the coach explains what it does. On the low rungs it also warns you about threats; as you climb it fades so you learn to see them yourself.')),
    h('div.card', h('div.card-title', icon('bulb', 18), 'Hints that teach'), h('p.small.muted', 'Four steps: an idea, a piece, a square, the move — take only as many as you need.')),
    h('div.card', h('div.card-title', icon('award', 18), 'A report and a road'), h('p.small.muted', 'At the end: what you did well, your recurring slips and what to practise. Win cleanly and you move up to the next opponent.')));
}

/* ------------------------------------------------------------------ game */
function gameView(view, ctx, cfg, back) {
  const s0 = store.get();
  const settings = s0.settings;
  const L = levelByN(cfg.level);
  const T = tier(cfg.level);
  const sup = supportLevel(cfg.level);
  const me = cfg.color, bot = me === 'w' ? 'b' : 'w';
  const guided = cfg.mode === 'guided', checking = cfg.mode !== 'review';
  const chess = new Chess();
  let alive = true, over = false, busy = false, token = 0, hintLevel = 0, intercepts = 0, prevPhase = 'opening', prevBotEval = null, lastBot = null;
  const recs = [];                 // one record per move I played
  const habits = { intercepted: 0, overridden: 0, hints: 0, retried: 0, asked: 0 };
  let prefetch = null;
  const sans = [], ucis = [];

  const board = new Board(h('div'), { orientation: me, coords: settings.coords, legalDots: settings.legalDots, autoQueen: settings.autoQueen, animate: settings.animations, interactive: true,
    canSelect: (sq) => !over && !busy && chess.turn() === me && chess.get(sq) && chess.get(sq).color === me,
    legalTargets: (sq) => legalTargetsFor(chess, sq), onMove: (m) => humanMove(m) });
  const stage = opponentStage(L, { color: bot, chat: settings.botChat !== false });
  const profile = store.get().profile;
  const bottom = playerBar({ name: profile.name, rating: Math.round(s0.rating.value), color: me, avatarEl: avatar(profile, 38, { ring: profile.color }) });
  bottom.el.classList.add('me');
  const dock = coachDock();
  const status = h('div.small.muted.center.status-line', { style: { minHeight: '18px' } });
  const strip = moveStrip({ nav: false, onSelect: () => {} });

  const act = (ic, label, fn, cls = '') => h('button.btn', { class: cls, onclick: fn, 'aria-label': label }, icon(ic, 18), h('span', label));
  const hintBtn = act('bulb', 'Hint', () => giveHint());
  const whyBtn = act('eye', 'Why that?', () => explainLast());
  const planBtn = act('target', 'Plan', () => showPlan());
  const flipBtn = act('flip', 'Flip', () => board.flip());
  const resignBtn = act('flag', 'Resign', async () => { if (!over && await confirmDialog('Resign this game? The coach will still prepare your report.', { ok: 'Resign', danger: true })) finish('resign'); });
  const actions = h('div.actions-bar', guided ? hintBtn : null, guided ? whyBtn : null, guided ? planBtn : null, flipBtn, resignBtn);

  // checklist: collapsible so it never pushes the coach's comments off the screen
  let checkOpen = !isMobile();
  const checklist = h('div.card.checklist.hidden');
  const checkBody = h('div');
  const checkHead = h('button.cl-toggle', { onclick: () => { checkOpen = !checkOpen; renderCheckHead(); } });
  const renderCheckHead = () => { checkHead.replaceChildren(icon('target', 16), h('b', 'Before you move'), h('span.grow'), h('span.xs.muted', checkOpen ? 'Hide' : 'Think first'), icon(checkOpen ? 'check' : 'right', 14)); checkBody.classList.toggle('hidden', !checkOpen); checkHead.setAttribute('aria-expanded', String(checkOpen)); };
  checklist.append(checkHead, checkBody);
  renderCheckHead();

  view.replaceChildren(h('div.page.game', h('div.game-layout.fit',
    h('div.board-col',
      h('div.row.between.nowrapr.game-head', h('button.back', { style: { margin: 0 }, onclick: () => { if (over || !sans.length) back(); else confirmDialog('Leave this game? It will not be saved.', { ok: 'Leave' }).then((ok) => ok && back()); } }, icon('left', 16), 'Road'),
        h('div.row.tight', h('span.tag.accent', MODES.find((m) => m.id === cfg.mode).name), h('span.tag', `${supportLevel(cfg.level)} support`))),
      stage.el, h('div.board-box', board.el), bottom.el, status),
    h('div.side-col', strip.el, actions, dock.el, checklist))));
  document.body.classList.add('in-game');

  /* ---------- coach voice ---------- */
  const say = (node, kind = '') => dock.say(node, kind);
  const sayText = (t, kind) => say(String(t).split('\n').map((p) => h('p', p)), kind);
  const engine = () => ctx.engine();
  const phase = () => phaseOf(chess.fen(), sans.length);
  const showMoves = () => strip.setMoves(chess.history(), chess.history().length - 1);
  const refreshBars = () => { stage.setCaptured(chess.fen()); bottom.setCaptured(chess.fen()); };

  /* ---------- the opponent reacts (speech bubble) ---------- */
  const chatter = (res, mv) => {
    const botEval = evCp(res && res.eval, bot);
    const swingOk = sans.length >= 3 && prevBotEval != null;
    const r = bestReaction(swingOk ? react(L.n, { mover: 'user', botEval, prevEval: prevBotEval, mv: chess.history({ verbose: true }).slice(-2)[0] }) : null,
      react(L.n, { mover: 'bot', mv, check: chess.inCheck(), botEval, slip: ((res && res.slipCp) || 0) >= 120 }));
    prevBotEval = botEval == null ? null : botEval - ((res && res.slipCp) || 0);
    if (r) stage.say(r.text, { mood: r.mood });
  };

  /* ---------- pre-move checklist (questions, not answers) ---------- */
  async function beginMyTurn() {
    hintLevel = 0; busy = false; board.setHint([]); board.setArrows([]);
    board.setInteractive(true);
    const fen = chess.fen();
    prefetch = engineSafe(fen) ? engine().then((e) => searchPosition(e, fen, { depth: 12, movetime: 900 })).catch(() => null) : null;
    if (!guided) { checklist.classList.add('hidden'); return; }
    const last = chess.history({ verbose: true }).slice(-1)[0];
    const th = threatsAgainst(fen, me, { limit: 3 });
    const hang = hangingPieces(fen, me);
    const win = targetsFor(fen, me);
    const ph = phase();
    const nm = (t) => `${PN[t.type] || 'piece'} on ${t.square}`;
    const items = [];
    items.push({ q: last ? `What did ${last.san} change?` : 'It is your move — what does the opening checklist say?', a: last ? (th.length ? th.slice(0, 2).map((t) => t.text).join(' ') : 'It makes no direct threat — you have time to improve your position.') : phaseAdvice(fen, me, 'opening'), kind: th.length ? 'warn' : 'ok', squares: th.flatMap((t) => t.squares) });
    items.push({ q: 'Can you win something?', a: win.length ? `The ${win.slice(0, 2).map(nm).join(' and ')} ${win.length > 1 ? 'are' : 'is'} loose or attackable.` : 'Nothing is hanging right now — look for checks and threats instead.', kind: win.length ? 'good' : 'ok', squares: win.map((t) => t.square) });
    items.push({ q: 'Is everything of yours safe?', a: hang.length ? `Careful: your ${hang.slice(0, 2).map(nm).join(' and ')} could be captured.` : 'Everything is protected. After your move, check that this is still true.', kind: hang.length ? 'warn' : 'ok', squares: hang.map((t) => t.square) });
    if (ph === 'opening') items.push({ q: 'Opening checklist', a: phaseAdvice(fen, me, 'opening'), kind: 'ok', squares: [] });
    const reveal = new Set();
    const render = () => checkBody.replaceChildren(
      h('div.small.muted.mb', 'Answer these in your head first. Tap a question only to check yourself.'),
      ...items.map((it, i) => h('div.cl-item', { class: reveal.has(i) ? 'open ' + it.kind : '' },
        h('button.cl-q', { onclick: () => { if (reveal.has(i)) reveal.delete(i); else { reveal.add(i); board.setMarks(Object.fromEntries(it.squares.map((s) => [s, it.kind === 'good' ? 'good' : 'warn']))); } render(); } }, h('span', it.q), icon(reveal.has(i) ? 'check' : 'right', 14)),
        reveal.has(i) ? h('div.cl-a', it.a) : null)));
    render();
    checklist.classList.remove('hidden');
  }

  /* ---------- the coach explains the opponent's move ---------- */
  function describeOpponentMove(fenBefore, uci, full = false) {
    let ins = null;
    try { ins = moveInsight(fenBefore, uci); } catch (e) { ins = null; }
    if (!ins) return null;
    const sentences = narrateInsight(ins, { phase: phase(), max: full ? 3 : 1 });
    const nodes = [h('p', h('b', `${L.who} played ${ins.san}. `), sentences.join(' '))];
    const fenNow = chess.fen();
    const th = guided ? threatsAgainst(fenNow, me, { limit: 4 }).filter((t) => !/\bpin/i.test(t.text)).slice(0, 2) : [];
    let kind = '';
    if (th.length && (sup === 'high' || full)) {
      nodes.push(h('p', h('b', '⚠ Heads up: '), th.map((t) => t.text).join(' ')));
      kind = 'warn';
      board.setMarks(Object.fromEntries(th.flatMap((t) => t.squares).map((s) => [s, 'warn'])));
    } else if (th.length && sup === 'medium') {
      nodes.push(h('p.small', '⚠ This creates a threat. Use the checklist below to find it.'));
      kind = 'warn';
    }
    return { nodes, kind };
  }

  async function explainLast() {
    if (over || busy || !lastBot) { sayText('Make a move first — then I can explain what your opponent did.'); return; }
    habits.asked++;
    const d = describeOpponentMove(lastBot.fenBefore, lastBot.uci, true);
    if (d) say(d.nodes, d.kind);
    board.setArrows([{ from: lastBot.uci.slice(0, 2), to: lastBot.uci.slice(2, 4), color: '#62b8ff', opacity: 0.85 }]);
  }

  function showPlan() {
    habits.asked++;
    const ph = phase();
    say([h('p', h('b', `Plan against ${L.who} · ${ph}`)), h('p', phaseAdvice(chess.fen(), me, ph)), h('p.small', T.habit)], 'good');
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
    if (hintLevel === 1) sayText(`Hint 1 of 4 — the idea. ${makeHint(fen, best, 1).text}`);
    else if (hintLevel === 2) { board.setHint([best.slice(0, 2)]); sayText('Hint 2 of 4 — the piece. Look at the highlighted piece. What could it do?'); }
    else if (hintLevel === 3) { board.setHint([best.slice(0, 2)]); board.setMarks({ [best.slice(2, 4)]: 'info' }); sayText('Hint 3 of 4 — the square. The marked square is where this piece wants to go. Why is it good there?'); }
    else { board.setArrows([{ from: best.slice(0, 2), to: best.slice(2, 4), color: '#5fc88f', opacity: 0.95 }]); sayText(`Hint 4 of 4 — ${f ? f.san : ''}. It ${f ? describeMove(f, f.san) : "is the engine's choice"}. Play it, then tell yourself why it works.`); }
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
    if (checking && bad && intercepts < 40) {
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
    else if (reply && reply.info.captured) { const sq = replyUci.slice(2, 4); squares.push(sq); q = `Hold on. After ${mv.san}, what can your opponent capture? Look at ${sq}.`; tell = `${reply.san} wins your ${PN[reply.info.captured] || 'piece'} on ${sq}.`; }
    else if (reply && (reply.themes.includes('fork') || reply.themes.includes('pin') || reply.themes.includes('skewer'))) { const t = ['fork', 'pin', 'skewer'].find((x) => reply.themes.includes(x)); squares.push(replyUci.slice(2, 4)); q = `Hold on. Your opponent has a strong reply to ${mv.san}. Can a single enemy piece attack two of yours (a ${t})?`; tell = `${reply.san} would give them a ${t}.`; }
    else if (reply) { squares.push(replyUci.slice(2, 4)); q = `Hold on — ${mv.san} gives your opponent a strong answer. What is the most dangerous thing they can do next?`; tell = `The engine's answer is ${reply.san}; it leaves you clearly worse.`; }
    else { q = `Hold on — the engine thinks ${mv.san} is a ${j.cls}. Re-check what it leaves undefended.`; tell = 'It leaves you clearly worse than other moves.'; }
    return { q, tell, squares };
  }
  function showIntercept(r, mv, j, uci) {
    let stage2 = 0;
    const box = h('div.intercept');
    const render = () => {
      box.replaceChildren(h('div.row.tight', h('b', 'Blunder check'), h('span.tag.bad', j.cls === 'blunder' ? 'Serious' : 'Risky')),
        h('p', r.q),
        stage2 >= 1 ? h('p.tell', icon('eye', 14), ' ', r.tell) : null,
        h('div.row',
          h('button.btn.primary', { onclick: () => { habits.retried++; dock.unpin(); busy = false; board.setMarks({}); beginMyTurnKeep(); } }, icon('undo', 16), 'Take it back'),
          stage2 < 1 ? h('button.btn', { onclick: () => { stage2 = 1; render(); } }, 'Show me') : null,
          h('button.btn.ghost', { onclick: () => { habits.overridden++; dock.unpin(); board.setMarks({}); chess.move(mv.san); const f0 = new Chess(chess.fen()); f0.undo(); commit(mv, uci, j, f0.fen(), true); board.setPosition(chess.fen(), { lastMove: { from: mv.from, to: mv.to }, animate: false, check: checkSquare(chess) }); } }, 'Play it anyway')));
    };
    render();
    dock.pin(box);
  }
  function beginMyTurnKeep() { busy = false; board.setInteractive(true); status.textContent = 'Your move — look for something safer.'; }

  /* ---------- commit a move that stands ---------- */
  function commit(mv, uci, j, fenBefore, overridden = false) {
    const ply = sans.length;
    sans.push(mv.san); ucis.push(uci);
    const rec = { ply, fenBefore, san: mv.san, uci, moveNo: Math.floor(ply / 2) + 1, color: me, cls: j ? j.cls : 'good', loss: j ? j.loss : 0, cpLoss: j ? j.cpLoss : 0, j, overridden, hints: hintLevel, phase: phaseOf(fenBefore, ply) };
    recs.push(rec);
    if (guided || checking) feedback(rec, mv);
    showMoves(); refreshBars();
    if (checkEnd()) return;
    botTurn();
  }
  function feedback(rec, mv) {
    const f = moveFeatures(rec.fenBefore, rec.uci);
    if (!guided) { if (rec.overridden) sayText(`You played ${mv.san} against the warning. The report will cover it.`); return; }
    if (rec.cls === 'blunder' || rec.cls === 'mistake') {
      const b = say([h('p', h('b', `${mv.san}: ${NICE[rec.cls]}.`), ' We will study it together in the report.'), h('button.btn.small', { onclick: (e) => { e.currentTarget.replaceWith(whyMistake(rec, mv)); } }, icon('eye', 14), 'Why was that a mistake?')], 'bad');
      void b;
    } else if (rec.cls === 'inaccuracy') {
      sayText(`${mv.san} is playable, but there was a more accurate move. I will show you in the report.`);
    } else if (rec.cls === 'brilliant' || rec.cls === 'great') {
      sayText(`${mv.san} — ${NICE[rec.cls]}! ${f ? `It ${describeMove(f, mv.san)}.` : ''}`, 'good');
    } else if (rec.cls === 'best' || rec.cls === 'excellent') {
      sayText(`${mv.san} — ${NICE[rec.cls].toLowerCase()}. ${f ? `It ${describeMove(f, mv.san)}.` : ''}`, 'good');
    }
    sfx(rec.cls === 'blunder' || rec.cls === 'mistake' ? 'bad' : 'good');
  }
  /** Immediate, short explanation of a mistake the player chose to play (built from the engine verdict). */
  function whyMistake(rec, mv) {
    const wrap = h('div');
    try {
      const j = rec.j;
      const fenAfter = new Chess(rec.fenBefore); fenAfter.move(rec.san);
      const m = { ply: rec.ply, moveNo: rec.moveNo, color: rec.color, san: rec.san, uci: rec.uci, cls: rec.cls, loss: rec.loss, cpLoss: rec.cpLoss, fenBefore: rec.fenBefore, fenAfter: fenAfter.fen(), phase: rec.phase,
        evalBefore: j.bestEval, evalAfter: j.playedEval, evalPlayed: j.playedEval, best: j.best, bestSan: sanOf(rec.fenBefore, j.best), pv: j.bestPv, replyPv: (j.playedPv || []).slice(1), top: false };
      const c = explainMove(m, { prevUcis: ucis.slice(0, rec.ply) });
      wrap.append(h('p', c.what), c.idea ? h('p', h('b', 'Better idea: '), c.idea) : null, c.principle ? h('p.small.muted', c.principle) : null);
    } catch (e) { wrap.append(h('p', 'It gave away material or position. The full explanation is in the report.')); }
    return wrap;
  }

  /* ---------- bot reply ---------- */
  async function botTurn() {
    if (over) return;
    busy = true; board.setInteractive(false);
    status.textContent = `${L.who} is thinking…`;
    const my = ++token;
    const fen = chess.fen();
    await new Promise((r) => setTimeout(r, 350));
    let uci, res = null;
    try { const e = await engine(); res = await botMove(e, fen, cfg.level); uci = res.uci; } catch (e) { uci = null; }
    if (!alive || my !== token) return;
    status.textContent = '';
    if (!uci) { const mv0 = chess.moves({ verbose: true })[0]; uci = mv0.from + mv0.to + (mv0.promotion || ''); }
    const mv = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    sans.push(mv.san); ucis.push(uci);
    lastBot = { fenBefore: fen, uci, san: mv.san };
    playForMove(mv, chess.inCheck());
    board.setPosition(chess.fen(), { lastMove: { from: mv.from, to: mv.to }, animate: [{ from: mv.from, to: mv.to }], check: checkSquare(chess) });
    showMoves(); refreshBars();
    if (checkEnd()) return;
    chatter(res, mv);
    if (guided) {
      const d = describeOpponentMove(fen, uci, false);
      if (d) say(d.nodes, d.kind);
      const ph = phase();
      if (ph !== prevPhase) { prevPhase = ph; say([h('p', h('b', ph === 'middlegame' ? 'The middlegame begins.' : ph === 'endgame' ? 'We are in the endgame.' : 'Opening.')), h('p', phaseAdvice(chess.fen(), me, ph))], 'good'); }
    }
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
    { const fin = react(L.n, { over: outcome === 'win' ? 'lose' : outcome === 'loss' ? 'win' : 'draw' }); if (fin) stage.say(fin.text, { mood: fin.mood }); }
    const result = outcome === 'draw' ? '1/2-1/2' : (outcome === 'win') === (me === 'w') ? '1-0' : '0-1';
    const pgn = buildPgn({ sans, headers: { White: me === 'w' ? 'You' : `${L.who} (${L.name})`, Black: me === 'b' ? 'You' : `${L.who} (${L.name})`, Result: result } });
    const id = store.saveGame({ source: 'coach-play', color: me, result, outcome, reason, sans: sans.slice(), pgn, level: cfg.level, oppElo: L.elo, oppName: `${L.who} · ${L.name}`, tc: 'unlimited', rated: false, startFen: START_FEN, moves: sans.length });
    store.logActivity('games'); trackPlan({ kind: 'play' });
    sfx(outcome === 'win' ? 'win' : 'end');
    const rep = buildReport();
    const counts = rep.total >= 6;
    const road = counts ? recordResult(cfg.level, outcome, rep.accuracy) : null;
    store.update((s) => {
      const c = s.coachPlay; c.games++; c.lastFocus = rep.focus ? rep.focus.label : null; c.level = cfg.level;
      for (const k of Object.keys(rep.habitFlags)) c.habits[k] = (c.habits[k] || 0) + (rep.habitFlags[k] ? 1 : 0);
    });
    ctx.refreshChrome && ctx.refreshChrome();
    status.textContent = '';
    document.body.classList.remove('in-game');
    view.replaceChildren(reportView(rep, outcome, reason, id, road, counts));
    window.scrollTo(0, 0);
    if (road && road.newlyPassed) celebrate(road);
  }

  function celebrate(road) {
    const nxt = cfg.level < 10 ? tier(cfg.level + 1) : null;
    const m = modal(h('div.col.center', { style: { gap: '12px' } },
      h('div.row', { style: { justifyContent: 'center' } }, avatarEl({ kind: 'portrait', value: T.avatar }, 84, { square: true, ring: '#5fc88f' })),
      h('h2', `You passed ${T.who}!`), h('p.muted', `${road.why}. ${nxt ? `The road continues: next up is ${nxt.who}, around ${nxt.elo}.` : 'You have beaten every opponent on the road. Congratulations!'}`),
      nxt ? h('div.card.flat', { style: { textAlign: 'left' } }, tierDetail(nxt.n)) : null,
      h('div.col', nxt ? h('button.btn.primary.big.block', { onclick: () => { m.close(); back({ level: nxt.n }); } }, icon('play', 18), `Play ${nxt.who} (${nxt.elo})`) : null, h('button.btn.ghost', { onclick: () => m.close() }, 'See my report'))));
  }

  function buildReport() {
    const mine = recs.filter((r) => r.color === me);
    const by = {}; mine.forEach((r) => { by[r.cls] = (by[r.cls] || 0) + 1; });
    const accs = mine.map((r) => moveAccuracy(r.loss));
    const accuracy = accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : 0;
    const bad = mine.filter((r) => r.cls === 'blunder' || r.cls === 'mistake').sort((a, b) => b.loss - a.loss);
    const moments = bad.slice(0, 3).map((r) => {
      const j = r.j;
      try {
        const fenAfter = new Chess(r.fenBefore); fenAfter.move(r.san);
        const m = { ply: r.ply, moveNo: r.moveNo, color: r.color, san: r.san, uci: r.uci, cls: r.cls, loss: r.loss, cpLoss: r.cpLoss, fenBefore: r.fenBefore, fenAfter: fenAfter.fen(), phase: r.phase,
          evalBefore: j.bestEval, evalAfter: j.playedEval, evalPlayed: j.playedEval, best: j.best, bestSan: sanOf(r.fenBefore, j.best), pv: j.bestPv, replyPv: (j.playedPv || []).slice(1), top: false };
        m.coach = explainMove(m, { prevUcis: ucis.slice(0, r.ply) }); return { r, m };
      } catch (e) { return { r, m: null }; }
    });
    const opening = mine.filter((r) => r.phase === 'opening');
    const openingBad = opening.filter((r) => r.loss >= 6).length;
    const lateGame = new Chess(); sans.forEach((s) => lateGame.move(s));
    const f = positionFacts(lateGame.fen(), me);
    const hung = mine.filter((r) => r.loss >= 10 && r.cls !== 'brilliant').length;
    const habitFlags = { hangingPieces: hung >= 1, ignoredWarnings: habits.overridden > 0, usedHints: habits.hints >= 3, openingTrouble: openingBad >= 2 };
    const notes = [];
    if (habits.intercepted) notes.push({ tone: habits.overridden ? 'warn' : 'good', text: `The blunder check stopped ${habits.intercepted} move${habits.intercepted === 1 ? '' : 's'}; you rethought ${habits.retried} of them${habits.overridden ? ` and played ${habits.overridden} anyway` : ''}. ${habits.retried ? 'Taking the move back is the habit that wins games.' : ''}` });
    if (habits.hints) notes.push({ tone: 'ok', text: `You used ${habits.hints} hint${habits.hints === 1 ? '' : 's'}. ${habits.hints > 5 ? 'Try to solve the position with the checklist before asking next time.' : 'Good balance — hints are for learning.'}` });
    if (habits.asked) notes.push({ tone: 'good', text: `You asked the coach about the opponent's moves or your plan ${habits.asked} time${habits.asked === 1 ? '' : 's'}. Understanding why they move is how you start to predict them.` });
    if (opening.length >= 4) notes.push({ tone: openingBad ? 'warn' : 'good', text: openingBad ? `${openingBad} of your first ${opening.length} moves were inaccurate. Revisit the three golden rules: centre, develop, castle.` : 'Your opening followed the golden rules. Nice.' });
    if (mine.length > 8 && !f.castled && f.kingCentral) notes.push({ tone: 'warn', text: 'Your king was still in the centre at the end of the game. Castling early is the simplest safety habit.' });
    const best = mine.filter((r) => ['brilliant', 'great', 'best'].includes(r.cls)).slice(0, 3);
    const first = moments.find((x) => x.m && x.m.coach);
    const focus = first ? { label: first.m.coach.recommendation.label, tasks: first.m.coach.recommendation.tasks, principle: first.m.coach.principle } : null;
    return { by, accuracy, moments, notes, best, focus, habitFlags, total: mine.length, elo: accuracyToRating(accuracy, mine.length) };
  }

  function roadCard(road, outcome, counts, rep) {
    const pf = progressFor(cfg.level);
    const left = pf.steps.filter((x) => !x.done).slice(0, 3);
    const head = !counts ? ['Too short to count', 'Play at least 6 moves for a game to count toward the road.']
      : road && road.newlyPassed ? [`Rung passed: ${T.who}`, `${road.why}.`]
        : road && road.passed ? [`Already passed`, 'You can keep playing this opponent for practice, or move up the road.']
          : outcome === 'win' ? ['A win — but not yet a clean one', `Your accuracy was ${rep.accuracy}%; a clean win needs ${T.target}%+. ${road ? `You have ${road.wins} of ${T.needWins} wins.` : ''}`]
            : outcome === 'draw' ? ['A draw — good fight', `Win the game with ${T.target}%+ accuracy to pass ${T.who}.`] : ['Not this time', `Study the turning points below, then try ${T.who} again. You need a win with ${T.target}%+ accuracy.`];
    return h('div.card.mb.road-card', { style: { '--tier': T.color } },
      h('div.row.nowrapr', avatarEl({ kind: 'portrait', value: T.avatar }, 48, { square: true, ring: T.color }), h('div.grow', h('div.eyebrow', `Road · ${T.elo} ${T.name}`), h('b', head[0]), h('div.small.muted', head[1]))),
      counts ? h('div.mt', h('div.row.between.xs.muted', h('span', 'Accuracy'), h('span', `${rep.accuracy}% / ${T.target}% needed`)), h('div.progress', { style: { height: '8px' } }, h('div.progress-fill', { style: { width: Math.min(100, (rep.accuracy / T.target) * 100) + '%', background: rep.accuracy >= T.target ? 'var(--good)' : 'var(--warn)' } }))) : null,
      !isPassed(cfg.level) && left.length ? h('div.mt', h('div.small', h('b', 'Do next: ')), h('div.col', { style: { gap: '6px', marginTop: '6px' } }, left.map((st) => h('a.road-step', { href: st.href }, h('span.tick', icon('check', 12)), h('span.grow', st.label), icon('right', 14))))) : null);
  }

  function reportView(rep, outcome, reason, id, road, counts) {
    const root = h('div.page');
    const title = outcome === 'win' ? 'You won!' : outcome === 'draw' ? 'A draw' : 'Game over';
    const cls = ['brilliant', 'great', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'];
    const stat = (v, l) => h('div.stat', h('b', v), h('span', l));
    const nxt = cfg.level < 10 ? tier(cfg.level + 1) : null;
    root.append(...[
      h('div.page-head', h('h1', 'Coach report'), h('span.tag.accent', `${title} · ${reason}`)),
      roadCard(road, outcome, counts, rep),
      h('div.card.mb', h('div.row.around', stat(rep.accuracy + '%', 'Accuracy'), stat(String(rep.total), 'Your moves'), stat(String(rep.by.blunder || 0), 'Blunders'), stat(String(rep.by.mistake || 0), 'Mistakes')),
        h('div.row.mt.tight', ...cls.filter((c) => rep.by[c]).map((c) => h('span.tag', { class: c }, `${rep.by[c]} ${NICE[c].toLowerCase()}`)))),
      rep.notes.length ? h('div.card.mb', h('div.card-title', icon('trend', 18), 'Your habits'), ...rep.notes.map((n) => h('div.say', { class: n.tone }, h('p', n.text)))) : null,
      rep.moments.length ? h('div.mb', h('h3', 'Turning points'), h('p.small.muted', 'The moves that cost you most — look at each position and find the problem before you read the coach.'),
        ...rep.moments.filter((x) => x.m).map((x) => h('div.mb', h('div.small.muted', `Position before move ${x.m.moveNo}${x.m.color === 'w' ? '.' : '...'}`), coachCard(x.m, { onTask: runTask })))) :
        h('div.card.mb', h('b', 'No serious mistakes!'), h('div.small.muted', 'You avoided the big errors. Play a stronger opponent for a bigger challenge.')),
      rep.best.length ? h('div.card.mb', h('div.card-title', icon('award', 18), 'Moves to be proud of'), ...rep.best.map((r) => { const f = moveFeatures(r.fenBefore, r.uci); return h('div.say.good', h('p', `${r.moveNo}${r.color === 'w' ? '.' : '...'} ${r.san} (${NICE[r.cls].toLowerCase()}) — ${f ? 'it ' + describeMove(f, r.san) + '.' : ''}`)); })) : null,
      rep.focus ? h('div.card.mb.rec-card', h('div.card-title', icon('target', 18), 'What to practise next'), h('p', h('b', rep.focus.label)), h('p.small.muted', rep.focus.principle), h('div.row', rep.focus.tasks.slice(0, 3).map((t) => h('button.btn.small', { onclick: () => runTask(t) }, t.label)))) : null,
      h('div.row', h('a.btn.primary', { href: `#/analyze?game=${id}` }, icon('search', 18), 'Full engine analysis'),
        (road && road.passed && nxt) ? h('button.btn', { onclick: () => back({ level: nxt.n }) }, icon('play', 16), `Play ${nxt.who}`) : h('button.btn', { onclick: () => back({ level: cfg.level }) }, 'Play again'),
        h('button.btn.ghost', { onclick: () => back({ tab: 'road' }) }, 'The road'))].filter(Boolean));
    return root;
  }

  /* ---------- boot ---------- */
  board.setPosition(chess.fen(), { animate: false });
  sfx('start');
  showMoves(); refreshBars();
  setTimeout(() => { if (alive && !over) stage.say(personaLine(L.n, 'greet'), { mood: 'happy' }); }, 700);
  sayText(guided ? `Let's play! You are ${me === 'w' ? 'White' : 'Black'} against ${L.who} (${L.elo}). ${T.habit}\nI will not give you moves unless you ask — and I will stop you if you are about to blunder.` : `Good luck! I will stay quiet and only step in before a serious mistake.`);
  if (me === 'w') beginMyTurn(); else botTurn();
  return () => { alive = false; token++; stage.destroy(); document.body.classList.remove('in-game'); board.destroy(); };
}
