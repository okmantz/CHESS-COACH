// DOM building blocks for "tap a suggested move to play it out on the board".
// Used by Analyze (engine lines, best moves), the lesson player, opening trainer and guided endgame/middlegame lessons.
import { h, icon } from './ui.js';
import { parsePv, normLines } from './pvutil.js';
import { fmtEval } from './evalmath.js';

export const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 959px)').matches;

/** A row of tappable moves. onPick(index, move) is called with the index of the tapped move in the line. */
export function lineChips(fen, ucis, { n = 6, onPick, active = -1, label = 'Suggested line' } = {}) {
  const moves = parsePv(fen, ucis, n);
  const el = h('div.pv-line', { role: 'group', 'aria-label': label });
  moves.forEach((m, i) => el.append(h('button.mv-chip', {
    type: 'button', class: (i === active ? 'active ' : '') + (m.color === 'w' ? 'w' : 'b'),
    'aria-label': `Play ${m.san}`, 'aria-pressed': i === active ? 'true' : 'false',
    onclick: (e) => { e.stopPropagation(); onPick && onPick(i, m); },
  }, m.label)));
  return el;
}

/** Several engine lines, each with its evaluation and tappable moves. onPick(lineIndex, moveIndex). */
export function suggestList(fen, lines, { onPick, n = 6, max = 3 } = {}) {
  const ls = normLines(lines, max);
  const el = h('div.sug-list');
  ls.forEach((l, li) => el.append(h('div.sug-row',
    l.ev ? h('span.sug-eval', fmtEval(l.ev)) : null,
    lineChips(fen, l.pv, { n, onPick: (i) => onPick && onPick(li, i), label: `Engine line ${li + 1}` }))));
  return el;
}

/** A single prominent "play this move" button. */
export function playChip(label, onClick, ic = 'play') {
  return h('button.play-chip', { type: 'button', onclick: (e) => { e.stopPropagation(); onClick && onClick(e); } }, icon(ic, 14), label);
}

/** First / previous / next / last buttons for stepping through a line that is being played out. */
export function lineStepper({ idx, len, onStep }) {
  const b = (ic, label, to, off) => h('button.btn.small', { type: 'button', 'aria-label': label, disabled: off, onclick: () => onStep(to) }, icon(ic, 15));
  return h('div.line-stepper',
    b('first', 'Start of the line', -1, idx < 0),
    b('left', 'Previous move in the line', idx - 1, idx < 0),
    h('span.xs.muted.grow.center', idx < 0 ? 'Start' : `Move ${idx + 1} of ${len}`),
    b('right', 'Next move in the line', idx + 1, idx >= len - 1),
    b('last', 'End of the line', len - 1, idx >= len - 1));
}

/**
 * On a phone the board is pinned at the top, so a comment that appears underneath it can end up hidden behind the board
 * (or below the bottom bar). Scroll just enough to bring it into the free area. Does nothing on desktop.
 */
export function revealBelow(node, { boardSel = '.board-col', gap = 8 } = {}) {
  if (!isPhone() || !node || typeof requestAnimationFrame !== 'function') return;
  requestAnimationFrame(() => {
    try {
      const bc = document.querySelector(boardSel);
      const edge = bc ? bc.getBoundingClientRect().bottom : 0;
      const bottomBar = document.querySelector('.learn-actions');
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const floor = bottomBar ? bottomBar.getBoundingClientRect().top : vh - 70;
      const r = node.getBoundingClientRect();
      if (!r.height) return;
      if (r.top < edge) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - edge - gap), behavior: 'smooth' });
      else if (r.bottom > floor && r.top > edge + 40) window.scrollTo({ top: window.scrollY + Math.min(r.bottom - floor + gap, r.top - edge - gap), behavior: 'smooth' });
    } catch (e) { /* ignore */ }
  });
}
