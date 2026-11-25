// DOM pieces for the visual coach: the "why this move" card, the colour legend, tappable square references and a
// scroll-anchoring helper that keeps the thing you are tapping exactly where it is while the panel around it changes.
import { h, icon } from './ui.js';
import { COL, LEGEND } from './visual.js';

/**
 * Run `fn` (which changes the DOM) while keeping `el` at the same place on the screen. Without this, anything that
 * changes the height of content ABOVE the element you are tapping (or briefly empties the list) moves the page under
 * your finger and, on a phone, ends up snapping the view back up to the top.
 */
export function keepAnchor(el, fn) {
  if (!el || !el.isConnected || typeof window === 'undefined') return fn();
  const top0 = el.getBoundingClientRect().top;
  const out = fn();
  const d = el.getBoundingClientRect().top - top0;
  if (Math.abs(d) > 0.5) window.scrollBy(0, d);
  return out;
}

/** Hold an element's current height for a moment so the page can not shrink (and clamp the scroll position) while its content is swapped. */
export function holdHeight(el, ms = 900) {
  if (!el || !el.isConnected) return;
  el.style.minHeight = el.offsetHeight + 'px';
  clearTimeout(el._holdT);
  el._holdT = setTimeout(() => { el.style.minHeight = ''; }, ms);
}

const SQ_RE = /\b(?:[KQRBN][a-h]?[1-8]?x?([a-h][1-8])|[a-h]x([a-h][1-8])|([a-h][1-8]))(?![a-z0-9])/g;

/**
 * Turn a sentence into nodes where every square or move it mentions ("the knight on c3", "Nxe5") is a small button that
 * lights that square on the board. `onHit(squares)` receives the squares to pulse.
 */
export function linkSquares(text, onHit) {
  const out = [];
  let last = 0;
  String(text).replace(SQ_RE, (m, a, b, c, off) => {
    const sq = a || b || c;
    if (off > last) out.push(String(text).slice(last, off));
    const hit = () => onHit && onHit([sq]);
    out.push(h('button.sqref', { type: 'button', 'aria-label': `Show ${sq} on the board`, onclick: (e) => { e.stopPropagation(); hit(); }, onmouseenter: hit, onfocus: hit }, m));
    last = off + m.length;
    return m;
  });
  if (last < String(text).length) out.push(String(text).slice(last));
  return out;
}

/** A row of colour swatches explaining the arrows currently on the board. keys: ['best','threat',...] */
export function legend(keys) {
  const ks = (keys || []).filter((k) => LEGEND[k]);
  if (!ks.length) return null;
  return h('div.vis-legend', { 'aria-label': 'What the colours mean' }, ks.map((k) => h('span.lg', h('i', { class: k === 'defend' ? 'dash' : '', style: { '--c': COL[k] } }), LEGEND[k])));
}

const KIND_ICON = { engine: 'cpu', idea: 'bulb', line: 'right', threat: 'flag', material: 'trend', plan: 'target' };

/**
 * The explanation card shown when a suggested move is tapped.
 * @param why   result of whyMove()
 * @param opts  { onClose, onSquares(sqs), showLegend }
 */
export function whyCard(why, { onClose, onSquares, showLegend = true } = {}) {
  if (!why) return null;
  const link = (t) => linkSquares(t, onSquares);
  const tone = why.label ? why.label.tone : 'info';
  const card = h('div.why-card', { class: `tone-${tone}`, role: 'region', 'aria-label': `Why ${why.san}` },
    h('div.why-head',
      h('span.why-label', why.label ? why.label.text : 'Suggestion'),
      h('b.why-san', why.san),
      h('span.grow'),
      onClose ? h('button.icon-btn.sm', { type: 'button', 'aria-label': 'Close explanation', onclick: onClose }, icon('x', 16)) : null),
    why.headline ? h('p.why-headline', link(why.headline)) : null,
    why.points.length ? h('ul.why-points', why.points.map((p) => h('li', { class: `k-${p.kind}` }, icon(KIND_ICON[p.kind] || 'info', 15), h('span', link(p.text))))) : null,
    why.threatText && !why.points.some((p) => p.kind === 'threat') ? h('p.why-next', h('b', 'Next: '), link(why.threatText)) : null,
    showLegend && why.overlay ? legend(why.overlay.legend) : null);
  return card;
}

/** If a freshly shown card starts below the visible part of the screen, scroll just enough to bring its top into view. Never scrolls up. */
export function nudgeIntoView(node) {
  if (!node || typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') return;
  requestAnimationFrame(() => {
    try {
      const r = node.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top > vh - 90) window.scrollBy({ top: r.top - (vh - 190), behavior: 'smooth' });
    } catch (e) { /* ignore */ }
  });
}
