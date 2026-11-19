// Game-screen building blocks shared by Play, Play-with-Coach and lessons:
//  - opponentStage: the opponent's portrait rises from behind the board (starting as a silhouette that lights up when they speak),
//    with name, captured pieces, clock and a speech bubble.
//  - coachDock: the coach's portrait pops up beside a feed of speech bubbles that always shows the newest comment first, so nothing
//    important is ever off-screen.
//  - moveStrip: a one-line, auto-scrolling move list with back/forward buttons and a full list on tap.
import { h, icon, modal } from './ui.js';
import { playerBar, moveList } from './components.js';
import { portraitSrc } from './avatars.js';
import { COACH } from './personas.js';

export const isMobile = () => window.matchMedia('(max-width: 959px)').matches;

/** Opponent presence above the board. `L` is a level from bot.js. */
export function opponentStage(L, { color, chat = true }) {
  const pb = playerBar({ name: `${L.who}`, rating: L.elo, avatarEl: null, color });
  const tag = h('span.tier-tag', L.name);
  pb.el.querySelector('.pname').append(tag);
  const img = h('img', { src: portraitSrc(L.avatar), alt: `${L.who}, ${L.name}`, draggable: false });
  const peek = h('div.stage-peek.silhouette', { style: { '--tier': L.color } }, img);
  const bubble = h('div.bubble.hidden', { role: 'status', 'aria-live': 'polite' });
  const body = h('div.stage-body', pb.el, chat ? bubble : null);
  const el = h('div.stage', { style: { '--tier': L.color } }, peek, body);
  let hideT = null;
  return {
    el, setCaptured: pb.setCaptured, setClock: pb.setClock,
    /** Show a speech bubble. mood: neutral | happy | sad. */
    say(text, { mood = 'neutral', ms = 0 } = {}) {
      if (!chat || !text) return;
      peek.classList.remove('silhouette');
      peek.dataset.mood = mood;
      bubble.textContent = text;
      bubble.classList.remove('hidden', 'pop'); void bubble.offsetWidth; bubble.classList.add('pop');
      peek.classList.remove('talk'); void peek.offsetWidth; peek.classList.add('talk');
      clearTimeout(hideT);
      if (ms) hideT = setTimeout(() => bubble.classList.add('hidden'), ms);
    },
    reveal() { peek.classList.remove('silhouette'); },
    destroy() { clearTimeout(hideT); },
  };
}

/** The coach's feed: newest first, internal scroll, never pushes the board off-screen. */
export function coachDock({ title = COACH.who, open = true } = {}) {
  const img = h('img', { src: portraitSrc(COACH.avatar), alt: 'Your coach', draggable: false });
  const peek = h('div.dock-peek', { style: { '--tier': COACH.color } }, img);
  const pinned = h('div.dock-pinned');
  const feed = h('div.dock-feed');
  const empty = h('div.dock-empty.muted.small', 'Your coach will comment here.');
  const body = h('div.dock-body', pinned, feed);
  const el = h('div.dock', peek, body);
  feed.append(empty);
  const MAX = 30;
  const wrap = (node, kind) => h('div.say.bubble-l', { class: kind || '' }, ...(Array.isArray(node) ? node : [node]));
  return {
    el, feed, pinned,
    /** node: string | Node | Node[] */
    say(node, kind = '') {
      empty.remove();
      const n = typeof node === 'string' ? [h('p', node)] : node;
      const b = wrap(n, kind);
      feed.prepend(b);
      while (feed.children.length > MAX) feed.lastChild.remove();
      feed.scrollTo({ top: 0 });
      peek.classList.remove('talk'); void peek.offsetWidth; peek.classList.add('talk');
      return b;
    },
    /** Keep a card (e.g. the blunder-check question) above the feed until removed. */
    pin(node) { pinned.replaceChildren(node); feed.scrollTo({ top: 0 }); peek.classList.remove('talk'); void peek.offsetWidth; peek.classList.add('talk'); return node; },
    unpin() { pinned.replaceChildren(); },
    clear() { feed.replaceChildren(empty); pinned.replaceChildren(); },
  };
}

/** One-line move strip. api: setMoves(sans[], currentIdx), with optional prev/next callbacks. */
export function moveStrip({ onPrev, onNext, onSelect, startColor = 'w', nav = true } = {}) {
  const strip = h('div.strip-moves');
  const prev = h('button.icon-btn.sm', { 'aria-label': 'Previous move', onclick: () => onPrev && onPrev() }, icon('left', 16));
  const next = h('button.icon-btn.sm', { 'aria-label': 'Next move', onclick: () => onNext && onNext() }, icon('right', 16));
  const all = h('button.icon-btn.sm', { 'aria-label': 'All moves' }, icon('list', 16));
  const el = h('div.move-strip', nav ? prev : null, strip, nav ? next : null, all);
  let cur = { sans: [], idx: -1 };
  const render = (sans, idx) => {
    cur = { sans, idx };
    strip.replaceChildren();
    if (!sans.length) { strip.append(h('span.faint.small', 'No moves yet')); return; }
    sans.forEach((san, i) => {
      const white = (i % 2 === 0) === (startColor === 'w');
      const no = Math.floor((i + (startColor === 'w' ? 0 : 1)) / 2) + 1;
      strip.append(h('span.mchip', { class: i === idx ? 'active' : '', onclick: () => onSelect && onSelect(i) }, white ? h('i', `${no}.`) : (i === 0 ? h('i', `${no}…`) : null), san));
    });
    const a = strip.querySelector('.mchip.active') || strip.lastChild;
    if (a && a.scrollIntoView) strip.scrollTo({ left: Math.max(0, a.offsetLeft - strip.clientWidth / 2), behavior: 'smooth' });
  };
  all.onclick = () => {
    const m = modal(h('div', moveList(cur.sans.map((san) => ({ san })), { current: cur.idx, startColor, onSelect: (i) => { onSelect && onSelect(i); m.close(); } })), { title: 'Moves' });
  };
  return { el, setMoves: render, setNav(canPrev, canNext) { prev.disabled = !canPrev; next.disabled = !canNext; } };
}
