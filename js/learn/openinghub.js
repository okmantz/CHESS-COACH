// The Openings list: filter by colour (both / White / Black), level and search, sort several ways, and see a picture of the
// setup you are aiming for on every card. A "Recommended for you" row comes from the coach's diagnosis of your own games.
import { Chess } from '../../vendor/chess.js';
import * as store from '../store.js';
import { h, icon, progress } from '../ui.js';
import { OPENINGS, parseLine } from '../data/openings.js';
import { miniBoard } from '../miniboard.js';
import { sansText } from '../pvutil.js';
import { courseProgress, lineStats } from './opening.js';
import { recommendOpenings } from '../journey.js';

/** How many plies of the course's first line to play to reach the picture that shows its character. */
const SETUP_PLY = {
  principles: 10, 'ruy-lopez': 10, london: 10, 'queens-gambit': 9, sicilian: 10, qgd: 9, 'kings-indian': 10, english: 10, colle: 10, evans: 10, petroff: 10,
  'two-knights': 9, dragon: 10, grunfeld: 10, scandinavian: 6,
};

/** The characteristic position of a course (after the first few moves of its first line). */
export function setupOf(course) {
  const mv = parseLine(course.lines[0].moves).map((x) => x.san);
  const n = Math.min(mv.length, course.setupPly || SETUP_PLY[course.id] || 8);
  const ch = new Chess(); const played = [];
  let last = null;
  for (let i = 0; i < n; i++) { try { last = ch.move(mv[i]); played.push(mv[i]); } catch (e) { break; } }
  return { fen: ch.fen(), sans: played, from: last && last.from, to: last && last.to, text: sansText(played, played.length) };
}

export function openingThumb(course, { size = null } = {}) {
  const s = setupOf(course);
  return miniBoard(s.fen, { orientation: course.side, from: s.from, to: s.to, size, label: `${course.name}: ${s.text}` });
}

const LEVEL_ORDER = { 'Start here': 0, Beginner: 1, Intermediate: 2, Advanced: 3 };
const SIDES = [['all', 'Both'], ['w', 'White'], ['b', 'Black']];
const SORTS = [['recommended', 'Best for me'], ['level', 'Easiest first'], ['name', 'A–Z'], ['progress', 'Progress']];

function view() {
  const v = (store.get().settings.openingsView) || {};
  return { side: v.side || 'all', level: v.level || 'all', sort: v.sort || 'recommended', q: '' };
}
function saveView(f) { store.update((s) => { s.settings.openingsView = { side: f.side, level: f.level, sort: f.sort }; }); }

export function openingHub({ crumb, searchInput }) {
  const f = view();
  const list = h('div'), recBox = h('div');
  const sideSeg = h('div.seg.seg-fill'), levelRow = h('div.chip-row'), sortRow = h('div.chip-row');
  const rating = store.get().rating.value || 600;
  const myLevel = rating < 1000 ? 'Beginner' : rating < 1500 ? 'Intermediate' : 'Advanced';

  const buttons = (c) => h('div.row.tight.mt-s', ...[['Learn', ''], ['Explore', '?start=explore'], ['Quiz me', '?start=quiz']].map(([l, q]) => h('a.chip', { href: `#/learn/openings/${c.id}${q}`, onclick: (e) => e.stopPropagation() }, l)));
  const card = (c, { compact = false } = {}) => {
    const p = courseProgress(c), started = c.lines.some((_, i) => lineStats(c.id, i).n > 0);
    return h('a.card.click.opening-card.with-thumb', { href: `#/learn/openings/${c.id}` },
      h('div.thumb', openingThumb(c), h('span.thumb-side', { class: c.side === 'w' ? 'w' : 'b' }, c.side === 'w' ? 'White' : 'Black')),
      h('div.opening-info',
        h('div.row.nowrapr.between', h('b', c.name), h('span.tag', c.level)),
        h('div.xs.muted.clamp2', c.tagline),
        compact ? null : h('div.opening-moves', setupOf(c).text),
        h('div.mt-s', progress(p, { height: 5 })),
        h('div.xs.muted.mt-s', `${c.lines.length} variations · ${Math.round(p * 100)}% learned${started && p < 1 ? ' · in progress' : ''}`),
        compact ? null : buttons(c)));
  };

  const sorter = () => {
    if (f.sort === 'name') return (a, b) => a.name.localeCompare(b.name);
    if (f.sort === 'level') return (a, b) => (LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]) || a.name.localeCompare(b.name);
    if (f.sort === 'progress') return (a, b) => (courseProgress(b) - courseProgress(a)) || a.name.localeCompare(b.name);
    // recommended: the player's own level first, unfinished before finished, then easy to hard
    const score = (c) => (courseProgress(c) >= 1 ? 50 : 0) + Math.abs(LEVEL_ORDER[c.level] - LEVEL_ORDER[myLevel]) * 10 + (c.level === 'Start here' ? -5 : 0);
    return (a, b) => score(a) - score(b) || a.name.localeCompare(b.name);
  };

  const draw = () => {
    sideSeg.replaceChildren(...SIDES.map(([k, l]) => { const n = OPENINGS.filter((c) => k === 'all' || c.side === k).length; return h('button', { class: k === f.side ? 'active' : '', onclick: () => { f.side = k; saveView(f); draw(); } }, `${l} · ${n}`); }));
    levelRow.replaceChildren(...['all', 'Beginner', 'Intermediate', 'Advanced'].map((k) => h('button.learn-chip', { class: k === f.level ? 'active' : '', onclick: () => { f.level = k; saveView(f); draw(); } }, k === 'all' ? 'Any level' : k)));
    sortRow.replaceChildren(h('span.xs.muted', 'Sort:'), ...SORTS.map(([k, l]) => h('button.learn-chip', { class: k === f.sort ? 'active' : '', onclick: () => { f.sort = k; saveView(f); draw(); } }, l)));
    const q = f.q.trim().toLowerCase();
    const match = (c) => (f.side === 'all' || c.side === f.side) && (f.level === 'all' || c.level === f.level) && (!q || `${c.name} ${c.tagline} ${c.lines.map((l) => l.name).join(' ')}`.toLowerCase().includes(q));
    // recommendations (only when nothing is being searched)
    let rec = [];
    try { rec = q ? [] : recommendOpenings({ side: f.side, max: 3 }); } catch (e) { rec = []; }
    recBox.replaceChildren(...(rec.length ? [h('div.card.rec-card.mb', h('div.eyebrow', 'Recommended for you'), h('div.small.muted.mb', rec[0].why), h('div.grid.g2', rec.map((r) => card(r.course, { compact: true }))))] : []));
    const groups = (f.side === 'all' ? [['w', 'Play as White'], ['b', 'Play as Black']] : [[f.side, f.side === 'w' ? 'Play as White' : 'Play as Black']]).map(([side, label]) => {
      const items = OPENINGS.filter((c) => c.side === side && match(c)).sort(sorter());
      return items.length ? h('div.mb', h('h3', `${label} · ${items.length}`), h('div.grid.g2', items.map((c) => card(c)))) : null;
    }).filter(Boolean);
    list.replaceChildren(...(groups.length ? groups : [h('div.card.flat.center', h('b', 'No openings match'), h('div.small.muted.mt-s', 'Clear the search or the filters.'))]));
  };
  draw();
  return h('div', crumb('Openings', `${OPENINGS.length} openings`, OPENINGS.reduce((a, c) => a + courseProgress(c), 0) / OPENINGS.length),
    h('div.filters', searchInput('Search openings — Sicilian, Italian, d4…', (v) => { f.q = v; draw(); }), sideSeg, levelRow, sortRow), recBox, list);
}
