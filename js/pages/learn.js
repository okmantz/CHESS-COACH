import * as store from '../store.js';
import { h, icon, progress } from '../ui.js';
import { OPENINGS, courseById, parseLine } from '../data/openings.js';
import { ENDGAMES, ENDGAME_CATS, endgameById } from '../data/endgames.js';
import { MIDDLEGAMES, middlegameById } from '../data/middlegames.js';
import { BASICS, BASICS_PARTS, basicById } from '../data/basics.js';
import { TACTICS, TACTICS_PARTS, tacticById, STRATEGY, STRATEGY_PARTS, strategyById } from '../data/tactics.js';
import { GLOSSARY } from '../data/glossary.js';
import { Board } from '../board.js';
import { currentRung, tier, progressFor } from '../ladder.js';
import { openingCourse, courseProgress, lineStats } from '../learn/opening.js';
import { guidedLesson, lessonDone } from '../learn/guided.js';
import { lessonPlayer } from '../learn/lesson.js';
import { sansText } from '../pvutil.js';
import '../lessons.js';

const SECTIONS = [
  ['basics', 'Basics', '🎓'], ['tactics', 'Tactics', '⚔️'], ['strategy', 'Strategy', '🧠'], ['openings', 'Openings', '📖'],
  ['middlegames', 'Middlegames', '🧭'], ['endgames', 'Endgames', '🏁'], ['glossary', 'Glossary', '📚'],
];

export default async function learnPage(view, ctx) {
  const [track, id] = ctx.params;
  const root = h('div.page.learn-page');
  view.replaceChildren(root);
  let teardown = () => {};
  let searchIndex = null;
  const toHub = (t) => () => { ctx.navigate(t ? `#/learn/${t}` : '#/learn'); };
  const done = (t, i) => lessonDone(t, i);
  const frac = (list, t) => (list.length ? list.filter((x) => done(t, x.id)).length / list.length : 0);

  if (!track) { root.append(learnNav(null), hub()); return; }
  if (track === 'basics') {
    const l = id && basicById(id);
    if (l) { const k = BASICS.indexOf(l); const nx = BASICS[k + 1]; teardown = lessonPlayer(root, ctx, { track: 'basics', lesson: l, back: toHub('basics'), backLabel: 'How to play', nextLesson: nx ? { name: nx.name, href: `#/learn/basics/${nx.id}` } : null }); return () => teardown(); }
    root.append(learnNav('basics'), basicsList()); return;
  }
  if (track === 'tactics') {
    const l = id && tacticById(id);
    if (l) { const ordered = orderedTactics(); const k = ordered.indexOf(l); const nx = ordered[k + 1]; teardown = lessonPlayer(root, ctx, { track: 'tactics', lesson: l, back: toHub('tactics'), backLabel: 'Tactics', nextLesson: nx ? { name: nx.name, href: `#/learn/tactics/${nx.id}` } : null }); return () => teardown(); }
    root.append(learnNav('tactics'), tacticsList()); return;
  }
  if (track === 'strategy') {
    const l = id && strategyById(id);
    if (l) { const ordered = STRATEGY_PARTS.flatMap((_, p) => STRATEGY.filter((t) => t.part === p)); const k = ordered.indexOf(l); const nx = ordered[k + 1]; teardown = lessonPlayer(root, ctx, { track: 'strategy', lesson: l, back: toHub('strategy'), backLabel: 'Strategy', nextLesson: nx ? { name: nx.name, href: `#/learn/strategy/${nx.id}` } : null }); return () => teardown(); }
    root.append(learnNav('strategy'), strategyList()); return;
  }
  if (track === 'glossary') { root.append(learnNav('glossary'), glossaryPage()); return; }
  if (track === 'openings') {
    if (id && courseById(id)) { teardown = openingCourse(root, ctx, courseById(id), toHub('openings')); return () => teardown(); }
    root.append(learnNav('openings'), openingList()); return;
  }
  if (track === 'endgames') {
    if (id && endgameById(id)) { teardown = guidedLesson(root, ctx, 'endgames', endgameById(id), toHub('endgames')); return () => teardown(); }
    root.append(learnNav('endgames'), endgameList()); return;
  }
  if (track === 'middlegames') {
    if (id && middlegameById(id)) { teardown = guidedLesson(root, ctx, 'middlegames', middlegameById(id), toHub('middlegames')); return () => teardown(); }
    root.append(learnNav('middlegames'), middlegameList()); return;
  }
  root.append(learnNav(null), hub());
  return () => teardown();

  function orderedTactics() { return TACTICS_PARTS.flatMap((_, p) => TACTICS.filter((t) => t.part === p)); }

  /* ---------------------------------------------------------------- shared pieces */
  /** A scrollable switcher between the Learn sections, so you never have to go back to the hub to change topic. */
  function learnNav(active) {
    const chip = (href, label, on) => h('a.learn-chip', { href, class: on ? 'active' : '', 'aria-current': on ? 'page' : null }, label);
    const nav = h('nav.learn-nav', { 'aria-label': 'Learn sections' }, chip('#/learn', '🏠 All', !active), ...SECTIONS.map(([k, l, ic]) => chip(`#/learn/${k}`, `${ic} ${l}`, active === k)));
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => { const a = nav.querySelector('.active'); if (a && nav.scrollTo) nav.scrollTo({ left: Math.max(0, a.offsetLeft - 16) }); });
    return nav;
  }
  function crumb(t, sub, p) {
    return h('div.page-head.learn-head', h('button.back', { onclick: toHub() }, icon('left', 16), 'Learn'), h('h1', t), sub ? h('span.muted.small', sub) : null,
      p != null ? h('div.list-progress', progress(p, { height: 6 })) : null);
  }
  function searchInput(placeholder, onInput, value = '') {
    return h('div.search-box', icon('search', 18), h('input', { type: 'search', placeholder, 'aria-label': placeholder, enterkeyhint: 'search', autocomplete: 'off', value, oninput: (e) => onInput(e.target.value) }));
  }

  /* ---------------------------------------------------------------- hub */
  function buildIndex() {
    const mk = (arr, tr, label, href, extra) => arr.map((l) => ({ label: extra ? extra(l) : label, name: l.name, sub: l.summary || l.tagline || '', icon: l.icon, href: href(l), hay: `${l.name} ${l.summary || l.tagline || ''} ${l.cat || ''} ${l.level || ''} ${tr}`.toLowerCase() }));
    return [
      ...mk(BASICS, 'basics', 'How to play', (l) => `#/learn/basics/${l.id}`),
      ...mk(TACTICS, 'tactics', 'Tactics', (l) => `#/learn/tactics/${l.id}`),
      ...mk(STRATEGY, 'strategy', 'Strategy', (l) => `#/learn/strategy/${l.id}`),
      ...OPENINGS.map((c) => ({ label: `Opening · ${c.side === 'w' ? 'White' : 'Black'}`, name: c.name, sub: c.tagline, icon: c.icon, href: `#/learn/openings/${c.id}`, hay: `${c.name} ${c.tagline} ${c.level} ${c.lines.map((x) => x.name).join(' ')} opening`.toLowerCase() })),
      ...mk(MIDDLEGAMES, 'middlegames', 'Middlegame', (l) => `#/learn/middlegames/${l.id}`),
      ...mk(ENDGAMES, 'endgames', 'Endgame', (l) => `#/learn/endgames/${l.id}`),
      ...GLOSSARY.map((g) => ({ label: 'Glossary', name: g.term, sub: g.def, icon: '📚', href: `#/learn/glossary?q=${encodeURIComponent(g.term)}`, hay: `${g.term} ${g.def}`.toLowerCase() })),
    ];
  }
  function searchResults(q) {
    if (!searchIndex) searchIndex = buildIndex();
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = searchIndex.filter((it) => words.every((w) => it.hay.includes(w)))
      .map((it) => ({ it, score: (it.name.toLowerCase().startsWith(words[0]) ? 0 : it.name.toLowerCase().includes(words[0]) ? 1 : 2) }))
      .sort((a, b) => a.score - b.score).slice(0, 30).map((x) => x.it);
    if (!hits.length) return h('div.card.flat.center', h('b', 'Nothing found'), h('div.small.muted.mt-s', 'Try a shorter word, like “fork”, “Sicilian” or “rook”.'));
    return h('div.col', hits.map((it) => h('a.card.click.result', { href: it.href }, h('div.row.nowrapr', h('div.course-icon', it.icon || '♞'), h('div.grow', h('b', it.name), h('div.xs.muted.clamp2', it.sub)), h('span.tag', it.label)))));
  }

  /** The unfinished lesson you touched most recently. */
  function resumeCard() {
    const L = store.get().lessons; let best = null;
    [['basics', BASICS], ['tactics', TACTICS], ['strategy', STRATEGY]].forEach(([t, list]) => list.forEach((l) => {
      const s = (L[t] || {})[l.id];
      if (s && !s.done && s.step > 0 && s.last && (!best || s.last > best.s.last)) best = { t, l, s };
    }));
    if (!best) return null;
    return h('a.card.click.resume-card', { href: `#/learn/${best.t}/${best.l.id}` },
      h('div.row.nowrapr', h('div.course-icon', best.l.icon || '▶'), h('div.grow', h('div.eyebrow', 'Pick up where you left off'), h('b', best.l.name), h('div.xs.muted', `Step ${best.s.step + 1} · ${best.t === 'basics' ? 'How to play' : best.t[0].toUpperCase() + best.t.slice(1)}`)), h('span.btn.primary.small', 'Resume', icon('right', 15))));
  }

  function hub() {
    const op = OPENINGS.reduce((a, c) => a + courseProgress(c), 0) / OPENINGS.length;
    const st = frac(STRATEGY, 'strategy'), bs = frac(BASICS, 'basics'), tc = frac(TACTICS, 'tactics'), en = frac(ENDGAMES, 'endgames'), mg = frac(MIDDLEGAMES, 'middlegames');
    const nextBasic = BASICS.find((b) => !done('basics', b.id));
    const tile = (ic, title, text, p, href, meta) => h('a.card.click.tile', { href },
      h('div.tile-top', h('div.course-icon', ic), p != null ? h('span.tile-pct', `${Math.round(p * 100)}%`) : null),
      h('b.tile-title', title), h('div.tile-text.small.muted', text),
      p != null ? h('div.tile-bar', progress(p, { height: 5 })) : null, h('div.xs.muted.tile-meta', meta));
    const total = STRATEGY.length + BASICS.length + TACTICS.length + ENDGAMES.length + MIDDLEGAMES.length + OPENINGS.length;
    const main = h('div',
      resumeCard(),
      h('a.card.click.hero-card', { href: nextBasic ? `#/learn/basics/${nextBasic.id}` : '#/learn/basics' },
        h('div.row.nowrapr', h('div.course-icon.big', '🎓'), h('div.grow', h('div.eyebrow', bs >= 1 ? 'Course complete' : bs > 0 ? 'Continue' : 'Start here'), h('h2', { style: { margin: '2px 0 4px' } }, 'How to Play Chess'), h('div.small.muted.hero-text', 'New to chess? A step-by-step course from how the pieces move to the three golden rules: control the centre, develop your pieces, connect your rooks.')), h('span.btn.primary.hero-btn', bs > 0 ? 'Continue' : 'Begin', icon('right', 16))),
        h('div.mt', progress(bs, { height: 6 })), h('div.xs.muted.mt-s', `${BASICS.filter((b) => done('basics', b.id)).length} of ${BASICS.length} lessons`)),
      pathCard(),
      h('h3.mt', 'Courses'),
      h('div.tile-grid',
        tile('⚔️', 'Tactics', 'Forks, pins, skewers, mating patterns and more.', tc, '#/learn/tactics', `${TACTICS.length} lessons`),
        tile('🧠', 'Strategy', 'Plans, pawns, files, outposts, king safety.', st, '#/learn/strategy', `${STRATEGY.length} lessons`),
        tile('📖', 'Openings', 'Every main variation, for White and Black.', op, '#/learn/openings', `${OPENINGS.length} openings`),
        tile('🧭', 'Middlegames', 'Plans and typical structures, scored move by move.', mg, '#/learn/middlegames', `${MIDDLEGAMES.length} lessons`),
        tile('🏁', 'Endgames', 'Mating patterns, pawn and rook endings.', en, '#/learn/endgames', `${ENDGAMES.length} lessons`),
        tile('📚', 'Glossary', 'Plain-English terms with a board example.', null, '#/learn/glossary', `${GLOSSARY.length} terms`)),
      h('a.card.click.mt', { href: '#/coach-play' }, h('div.row.nowrapr', h('div.course-icon', '🤝'), h('div.grow', h('b', 'Play a game with Coach'), h('div.small.muted', 'Apply what you learn in a real game. The coach asks questions instead of giving answers, and builds a report of your habits.')), icon('right', 18))),
      h('div.card.flat.mt', h('b', 'How a lesson works'), h('ol.small.muted', { style: { paddingLeft: '18px', margin: '6px 0 0' } }, h('li', 'Watch — the coach explains the idea and shows it on the board.'), h('li', 'Do — you play the move, tap the squares or answer the question; wrong tries get a specific explanation.'), h('li', 'Practice — drills and puzzles make the pattern stick.'), h('li', 'Stuck? Tap a suggested move and it is played for you.'))));
    const results = h('div.hidden');
    const onSearch = (v) => {
      const q = v.trim();
      if (q.length < 2) { results.classList.add('hidden'); main.classList.remove('hidden'); return; }
      results.replaceChildren(searchResults(q)); results.classList.remove('hidden'); main.classList.add('hidden');
    };
    return h('div',
      h('div.page-head', h('h1', 'Learn'), h('span.tag.accent', `${total} courses & lessons`)),
      searchInput('Search lessons, openings, endgames, terms…', onSearch), h('div.mb'),
      results, main);
  }
  function pathCard() {
    const n = currentRung(), t = tier(n), pf = progressFor(n);
    const nextStep = pf.steps.find((x) => !x.done);
    return h('div.card.mt.path-card', { style: { '--tier': t.color } },
      h('div.eyebrow', `Your learning path · road to ${t.elo}`),
      h('b', nextStep ? `Next: ${nextStep.label}` : `You have studied everything for ${t.who}`),
      h('div.small.muted', nextStep ? `One of ${pf.steps.length - pf.studied} steps left before you face ${t.who} (${t.elo}).` : 'Go and play your next opponent!'),
      h('div.row.mt', nextStep ? h('a.btn.primary', { href: nextStep.href }, icon('play', 16), 'Start') : h('a.btn.primary', { href: '#/coach-play' }, icon('play', 16), 'Play now'), h('a.btn', { href: '#/coach-play' }, 'See the road')));
  }

  /* ---------------------------------------------------------------- lists */
  function lessonCard(tr, l, isNext) { return h('a.card.click.lesson-row', { href: `#/learn/${tr}/${l.id}` }, h('div.row.nowrapr', h('div.course-icon', l.icon), h('div.grow', h('b', l.name), h('div.xs.muted.clamp2', l.summary)), done(tr, l.id) ? h('span.tag.good', 'Done') : isNext ? h('span.tag.accent', 'Next') : h('span.tag', l.time || l.level))); }
  function groupedList(tr, list, parts, intro, title) {
    const nextId = (list.find((b) => !done(tr, b.id)) || {}).id;
    return h('div', crumb(title, `${list.filter((b) => done(tr, b.id)).length}/${list.length}`, frac(list, tr)), intro ? h('p.muted.mb', intro) : null,
      ...parts.map((label, p) => h('div.mb', h('h3', label), h('div.grid.g2', list.filter((b) => b.part === p).map((b) => lessonCard(tr, b, b.id === nextId))))));
  }
  function basicsList() { return groupedList('basics', BASICS, BASICS_PARTS, null, 'How to Play Chess'); }
  function tacticsList() { return groupedList('tactics', TACTICS, TACTICS_PARTS, 'Tactics are short, forcing combinations. Learn the patterns, then train them with puzzles.', 'Tactics'); }
  function strategyList() { return groupedList('strategy', STRATEGY, STRATEGY_PARTS, 'Tactics win material; strategy tells you which move to play when nothing is hanging. Each lesson explains the why and then makes you apply it.', 'Strategy'); }

  function glossaryPage() {
    const list = h('div.col');
    const draw = (v = '') => {
      const qy = v.trim().toLowerCase();
      const items = GLOSSARY.filter((g) => !qy || g.term.toLowerCase().includes(qy) || g.def.toLowerCase().includes(qy));
      list.replaceChildren(...(items.length ? items.map((g) => {
        const card = h('div.card.gloss', h('div.row.nowrapr', h('div.grow', h('b', g.term), h('p.small.muted', { style: { margin: '4px 0 0' } }, g.def), g.note ? h('p.xs.muted', g.note) : null)));
        if (g.fen) {
          const holder = h('div.gloss-board'); card.firstChild.append(holder);
          const b = new Board(h('div'), { orientation: 'w', interactive: false, coords: false, animate: false });
          holder.append(b.el); b.setPosition(g.fen, { animate: false });
          b.setMarks(Object.fromEntries((g.hl || []).map((s) => [s, 'warn'])));
          b.setArrows((g.arrows || []).map((a) => { const [m, c] = a.split(':'); return { from: m.slice(0, 2), to: m.slice(2, 4), color: c === 'r' ? '#ef6b6b' : '#5fc88f', opacity: 0.9 }; }));
        }
        return card;
      }) : [h('div.card.flat.center', h('b', 'No matching terms'))]));
    };
    const q0 = ctx.query.q || '';
    draw(q0);
    return h('div', crumb('Glossary', `${GLOSSARY.length} terms`), h('div.mb', searchInput('Search terms…', draw, q0)), list);
  }

  function openingList() {
    const f = { q: '', side: 'all', level: 'all' };
    const list = h('div');
    const sideSeg = h('div.seg.seg-fill'); const levelRow = h('div.chip-row');
    const card = (c) => {
      const p = courseProgress(c);
      const started = c.lines.some((_, i) => lineStats(c.id, i).n > 0);
      const first = c.lines[0] ? sansText(parseLine(c.lines[0].moves).map((x) => x.san), 6) : '';
      return h('a.card.click.opening-card', { href: `#/learn/openings/${c.id}` },
        h('div.row.nowrapr', h('div.course-icon', c.icon), h('div.grow', h('b', c.name), h('div.xs.muted.clamp2', c.tagline)), h('span.tag', c.level)),
        first ? h('div.opening-moves', first) : null,
        h('div.mt-s', progress(p, { height: 5 })), h('div.xs.muted.mt-s', `${c.lines.length} lines · ${Math.round(p * 100)}% learned${started && p < 1 ? ' · in progress' : ''}`));
    };
    const draw = () => {
      sideSeg.replaceChildren(...[['all', 'All'], ['w', 'As White'], ['b', 'As Black']].map(([k, l]) => h('button', { class: k === f.side ? 'active' : '', onclick: () => { f.side = k; draw(); } }, l)));
      levelRow.replaceChildren(...['all', 'Beginner', 'Intermediate', 'Advanced'].map((k) => h('button.learn-chip', { class: k === f.level ? 'active' : '', onclick: () => { f.level = k; draw(); } }, k === 'all' ? 'Any level' : k)));
      const q = f.q.trim().toLowerCase();
      const match = (c) => (f.side === 'all' || c.side === f.side) && (f.level === 'all' || c.level === f.level) && (!q || `${c.name} ${c.tagline} ${c.lines.map((l) => l.name).join(' ')}`.toLowerCase().includes(q));
      const groups = [['w', 'Play as White'], ['b', 'Play as Black']].map(([side, label]) => {
        const items = OPENINGS.filter((c) => c.side === side && match(c));
        return items.length ? h('div.mb', h('h3', label), h('div.grid.g2', items.map(card))) : null;
      }).filter(Boolean);
      list.replaceChildren(...(groups.length ? groups : [h('div.card.flat.center', h('b', 'No openings match'), h('div.small.muted.mt-s', 'Clear the search or the filters.'))]));
    };
    draw();
    return h('div', crumb('Openings', `${OPENINGS.length} openings`, OPENINGS.reduce((a, c) => a + courseProgress(c), 0) / OPENINGS.length),
      h('div.filters', searchInput('Search openings — Sicilian, Italian, d4…', (v) => { f.q = v; draw(); }), sideSeg, levelRow), list);
  }
  function endgameList() {
    return h('div', crumb('Endgames', `${ENDGAMES.length} lessons`, frac(ENDGAMES, 'endgames')), ...ENDGAME_CATS.map((cat) => h('div.mb', h('h3', cat), h('div.grid.g2', ENDGAMES.filter((e) => e.cat === cat).map((e) => h('a.card.click.lesson-row', { href: `#/learn/endgames/${e.id}` }, h('div.row.nowrapr', h('div.course-icon', e.icon), h('div.grow', h('b', e.name), h('div.xs.muted.clamp2', e.summary)), done('endgames', e.id) ? h('span.tag.good', 'Done') : h('span.tag', e.level))))))));
  }
  function middlegameList() {
    return h('div', crumb('Middlegames', `${MIDDLEGAMES.length} lessons`, frac(MIDDLEGAMES, 'middlegames')), h('div.grid.g2', MIDDLEGAMES.map((e) => h('a.card.click.lesson-row', { href: `#/learn/middlegames/${e.id}` }, h('div.row.nowrapr', h('div.course-icon', e.icon), h('div.grow', h('b', e.name), h('div.xs.muted.clamp2', e.summary)), done('middlegames', e.id) ? h('span.tag.good', 'Done') : h('span.tag', e.level))))));
  }
}
