// The "Suggested moves" panel used by the game review and the live analysis board.
//
// Why it exists: the old suggestion list was thrown away and rebuilt every time a move was tapped (and the page was scrolled
// back to the coach note), which on a phone snapped the view to the top each time. This panel keeps its DOM: tapping the
// next move of a line only changes which chip is highlighted, groups are rebuilt only when their content really changed,
// and anything that does change keeps the panel where it is on the screen.
import { h, icon } from './ui.js';
import { lineChips } from './playout.js';
import { normLines } from './pvutil.js';
import { fmtEval } from './evalmath.js';
import { rankColor } from './visual.js';
import { keepAnchor, holdHeight } from './whyui.js';

const sigOf = (g) => JSON.stringify([g.fen, g.title, g.pending ? 1 : 0, g.dots ? 1 : 0, g.n || 6, (g.lines || []).map((l) => [l.pv.slice(0, 12), l.ev ? (l.ev.mate != null ? 'm' + l.ev.mate : l.ev.cp) : null])]);

/**
 * @param opts { title, hint, onPick({group, lineIndex, moveIndex}), arrows (bool), onArrows(bool) }
 * @returns {{el, setGroups(groups), setActive(sel|null), setWhy(node|null), setStatus(text), setArrows(bool), anchor}}
 *   group = { key, title, sub, fen, lines:[{ev,pv}], dots (colour dots matching the board arrows), pending, n }
 */
export function suggestPanel({ title = 'Suggested moves', hint = 'tap a move to play it', onPick, arrows = true, onArrows } = {}) {
  let arrowsOn = arrows;
  const arrowBtn = h('button.btn.small.arrow-toggle', { type: 'button', 'aria-pressed': String(arrowsOn), title: 'Show the suggestions as arrows on the board' }, icon('eye', 14), 'Arrows');
  const setArrowsUi = () => { arrowBtn.classList.toggle('on', arrowsOn); arrowBtn.setAttribute('aria-pressed', String(arrowsOn)); };
  arrowBtn.onclick = () => { arrowsOn = !arrowsOn; setArrowsUi(); onArrows && onArrows(arrowsOn); };
  setArrowsUi();
  const head = h('div.sug-head', h('div.sug-title', h('b', title), h('span.xs.muted', hint)), onArrows ? arrowBtn : null);
  const groupsBox = h('div.sug-groups');
  const whyBox = h('div.sug-why');
  const status = h('div.sug-status.xs.muted');
  const el = h('div.card.flat.sug-card.sug-panel', head, groupsBox, whyBox, status);

  const recs = new Map();   // key -> {el, sig, g}
  let active = null;        // {key, li, i}

  function buildGroup(g) {
    const lines = normLines(g.lines, 3);
    const box = h('div.sug-group', { class: g.pending ? 'stale' : '', dataset: { key: g.key } },
      g.title ? h('div.sug-gtitle', h('span', g.title), g.sub ? h('span.xs.muted', g.sub) : null, g.pending ? h('span.sug-spin', { 'aria-label': 'Thinking' }) : null) : null);
    if (!lines.length) { box.append(h('div.xs.muted.sug-empty', g.pending ? 'The engine is looking at this position…' : 'No suggestions for this position.')); return box; }
    const list = h('div.sug-list');
    lines.forEach((l, li) => {
      const chips = lineChips(g.fen, l.pv, { n: g.n || 6, label: `${g.title || 'Engine'} line ${li + 1}`, onPick: (i) => pick(g.key, li, i) });
      [...chips.children].forEach((c, i) => { c.dataset.key = g.key; c.dataset.l = li; c.dataset.i = i; });
      list.append(h('div.sug-row',
        g.dots ? h('span.sug-dot', { style: { '--c': rankColor(li) }, title: li === 0 ? 'Best move (green arrow)' : li === 1 ? 'Second choice (blue arrow)' : 'Third choice (amber arrow)' }) : null,
        l.ev ? h('span.sug-eval', fmtEval(l.ev)) : null, chips));
    });
    box.append(list);
    return box;
  }

  function applyActive() {
    el.querySelectorAll('.mv-chip').forEach((c) => {
      const on = !!active && c.dataset.key === active.key && +c.dataset.l === active.li && +c.dataset.i === active.i;
      c.classList.toggle('active', on); c.setAttribute('aria-pressed', String(on));
    });
  }

  function pick(key, li, i) {
    const rec = recs.get(key);
    if (!rec) return;
    active = { key, li, i };
    applyActive();
    onPick && onPick({ group: rec.g, lineIndex: li, moveIndex: i, line: normLines(rec.g.lines, 3)[li] });
  }

  return {
    el, anchor: el,
    setGroups(groups) {
      // remember which chip had keyboard focus so it can be given back if its group has to be rebuilt
      const fa = document.activeElement && el.contains(document.activeElement) && document.activeElement.dataset ? { ...document.activeElement.dataset } : null;
      holdHeight(groupsBox);
      keepAnchor(el, () => {
        const next = [];
        for (const g of groups) {
          const sig = sigOf(g);
          let rec = recs.get(g.key);
          if (!rec || rec.sig !== sig) { rec = { el: buildGroup(g), sig, g }; recs.set(g.key, rec); } else rec.g = g;
          next.push(rec.el);
        }
        for (const k of [...recs.keys()]) if (!groups.some((g) => g.key === k)) recs.delete(k);
        groupsBox.replaceChildren(...next);
        applyActive();
      });
      if (fa && fa.key != null) {
        const c = el.querySelector(`.mv-chip[data-key="${CSS.escape(fa.key)}"][data-l="${fa.l}"][data-i="${fa.i}"]`);
        if (c && document.activeElement !== c) c.focus({ preventScroll: true });
      }
    },
    setActive(sel) { active = sel; applyActive(); },
    getActive: () => active,
    setWhy(node) { keepAnchor(el, () => { whyBox.replaceChildren(...(node ? [node] : [])); whyBox.classList.toggle('open', !!node); }); },
    setStatus(t) { status.textContent = t || ''; },
    setArrows(v) { arrowsOn = !!v; setArrowsUi(); },
    arrowsOn: () => arrowsOn,
  };
}
