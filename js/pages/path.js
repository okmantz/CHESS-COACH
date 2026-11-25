// "My path": the coach's plan, in order. What the games say, the one next step, openings picked for you, and the whole road.
import * as store from '../store.js';
import { h, icon } from '../ui.js';
import { journey } from '../journey.js';
import { nextStepCard, phaseMeters } from '../guideui.js';
import { openingThumb } from '../learn/openinghub.js';
import { TAGS } from '../coach.js';

export default async function path(view) {
  const j = journey(), s = store.get();
  const weakNote = j.focus ? `Over your last ${Math.min(6, j.stats.reviewed)} reviewed game${j.stats.reviewed > 1 ? 's' : ''}, your ${j.focus} costs you the most.` : j.stats.reviewed ? 'No single phase stands out. Keep all three improving.' : 'Play and review a game and the coach will show your strengths and weak spots here.';
  const rec = j.recs.slice(0, 3);
  view.replaceChildren(h('div.page.path-page',
    h('h1', 'My path'),
    h('p.muted', 'The coach reads your games and tells you exactly what to do next. Follow the steps in order.'),
    nextStepCard(j),
    h('div.card.mb', h('div.card-title', icon('chart', 18), 'What your games say'), phaseMeters(j.profile), h('p.small.muted.mt', weakNote),
      j.topTag ? h('p.small', h('b', 'Most common mistake: '), `${j.topTag.label} (${j.topTag.count}×). `, h('a', { href: j.topTag.tag && TAGS[j.topTag.tag] ? '#/coach' : '#/train' }, 'Train it')) : null),
    rec.length ? h('div.card.mb', h('div.card-title', icon('book', 18), 'Openings picked for you'), h('div.path-openings', rec.map((r) => h('a.path-opening', { href: `#/learn/openings/${r.course.id}` }, openingThumb(r.course, { size: 96 }), h('div', h('b', r.course.name), h('div.xs.muted', r.course.side === 'w' ? 'For White' : 'For Black'), h('div.small', r.why)))))) : null,
    h('div.card', h('div.card-title', icon('target', 18), 'The road'), h('ol.roadmap', j.roadmap.map((r, i) => h('li', { class: `${r.done ? 'done' : ''} ${r.current ? 'current' : ''}` },
      h('a.road-step', { href: r.href }, h('span.road-dot', r.done ? icon('check', 14) : String(i + 1)), h('span.grow', h('b', r.title), h('div.xs.muted', r.text)), r.progress != null && !r.done ? h('span.tag', `${Math.round(r.progress * 100)}%`) : null, r.current ? h('span.tag.accent', 'Now') : null)))))));
}
