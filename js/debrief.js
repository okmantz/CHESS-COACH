// Post-game debrief: right after a game, the coach quietly reviews it and says what went well, what to fix and what to do next.
import { Chess } from '../vendor/chess.js';
import * as store from './store.js';
import { h, icon } from './ui.js';
import { reviewGame, compactReview, DEPTHS } from './analysis.js';
import { extractMistakes } from './pages/analyze.js';
import { uciOf, engineSafe } from './chessutil.js';
import { journey, debriefOf, phaseLabel } from './journey.js';
import { nextStepCard } from './guideui.js';
import { whyShort } from './ideas.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Returns { el, stop }. `el` fills in by itself once the engine has looked at the game. */
export function debriefPanel(ctx, gameId, { onNavigate } = {}) {
  const el = h('div.debrief');
  let stopped = false;
  const g = store.getGame(gameId);
  if (!g || !g.sans || g.sans.length < 6 || !(g.color === 'w' || g.color === 'b')) { return { el: h('div'), stop() {} }; }
  if (g.review) { render(g.review); return { el, stop() {} }; }
  const bar = h('div.progress', h('span')), lbl = h('div.small.muted', 'The coach is studying your game…');
  el.append(h('div.card.flat', h('div.row', h('b', 'Coach debrief'), h('span.grow'), icon('sparkle', 16)), bar, lbl));
  (async () => {
    try {
      const startFen = g.startFen || START;
      const chess = new Chess(startFen === START ? undefined : startFen);
      const fens = [chess.fen()], ucis = [];
      for (const san of g.sans) { const m = chess.move(san); ucis.push(uciOf(m)); fens.push(chess.fen()); }
      if (!engineSafe(fens[0])) return;
      const engine = await ctx.engine();
      const game = { sans: g.sans, startFen, headers: g.headers || {}, fens, ucis };
      const review = await reviewGame(engine, game, { depth: DEPTHS.quick, shouldStop: () => stopped, onProgress: (p) => { bar.firstChild.style.width = `${Math.round(p * 100)}%`; } });
      if (stopped) return;
      const id = store.saveGame({ ...g, review: compactReview(review), depth: 'quick', moves: g.sans.length });
      store.setGameMistakes(id, extractMistakes(review, g.color));
      render(review);
    } catch (e) { el.replaceChildren(h('div.small.muted', 'The quick review could not finish. You can still open the full analysis below.')); }
  })();
  return { el, stop() { stopped = true; } };

  function render(review) {
    const d = debriefOf(g, review);
    const j = journey();
    const bits = [];
    if (d.accuracy != null) bits.push(h('div.debrief-acc', h('div.big-num', `${Math.round(d.accuracy)}%`), h('div.small.muted', 'accuracy')));
    const line = (ic, t) => h('li', icon(ic, 15), h('span', t));
    const pts = [];
    if (d.opening && d.opening.name) pts.push(line('book', `Opening: ${d.opening.name}. You stayed in book for ${d.bookMoves} move${d.bookMoves === 1 ? '' : 's'}.`));
    if (d.firstOpeningSlip) { const m = d.firstOpeningSlip; pts.push(line('alert', `Your first opening slip was move ${m.moveNo}. ${m.san} cost about ${Math.round(m.loss)} points; the engine preferred ${m.bestSan || 'another move'}.`)); }
    if (d.biggest) {
      const m = d.biggest; let why = '';
      try { why = m.bestUci || m.best ? whyShort(m.fenBefore, m.best) : ''; } catch (e) { why = ''; }
      pts.push(line('target', `Biggest mistake: move ${m.moveNo}, ${m.san} (${m.cls}).${m.bestSan ? ` Better was ${m.bestSan}${why ? `, because ${why}` : ''}.` : ''}`));
    }
    if (d.worstPhase) pts.push(line('trend', `Your weakest phase this game was the ${phaseLabel(d.worstPhase.phase).toLowerCase()} (${Math.round(d.worstPhase.acc)}%).${d.bestPhase && d.bestPhase.phase !== d.worstPhase.phase ? ` Strongest: ${phaseLabel(d.bestPhase.phase).toLowerCase()} (${Math.round(d.bestPhase.acc)}%).` : ''}`));
    el.replaceChildren(h('div.card.flat', h('div.row.between', h('b', 'Coach debrief'), h('span.small.muted', `${d.counts.blunder} blunder${d.counts.blunder === 1 ? '' : 's'} · ${d.counts.mistake} mistake${d.counts.mistake === 1 ? '' : 's'} · ${d.counts.inaccuracy} inaccuracies`)),
      h('div.row.nowrapr', ...bits, h('ul.debrief-list.grow', pts))),
      nextStepCard(j, { compact: false }));
    el.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => onNavigate && onNavigate()));
  }
}
