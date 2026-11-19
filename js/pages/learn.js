import * as store from '../store.js';
import { h, icon, progress } from '../ui.js';
import { OPENINGS, courseById } from '../data/openings.js';
import { ENDGAMES, ENDGAME_CATS, endgameById } from '../data/endgames.js';
import { MIDDLEGAMES, middlegameById } from '../data/middlegames.js';
import { openingCourse, courseProgress } from '../learn/opening.js';
import { guidedLesson, lessonDone } from '../learn/guided.js';
import '../lessons.js';

export default async function learnPage(view, ctx) {
  const [track, id] = ctx.params;
  const root = h('div.page');
  view.replaceChildren(root);
  let teardown = () => {};
  const toHub = (t) => () => { ctx.navigate(t ? `#/learn/${t}` : '#/learn'); };

  if (!track) { root.append(hub()); return; }
  if (track === 'openings') {
    if (id && courseById(id)) { teardown = openingCourse(root, ctx, courseById(id), toHub('openings')); return () => teardown(); }
    root.append(openingList()); return;
  }
  if (track === 'endgames') {
    if (id && endgameById(id)) { teardown = guidedLesson(root, ctx, 'endgames', endgameById(id), toHub('endgames')); return () => teardown(); }
    root.append(endgameList()); return;
  }
  if (track === 'middlegames') {
    if (id && middlegameById(id)) { teardown = guidedLesson(root, ctx, 'middlegames', middlegameById(id), toHub('middlegames')); return () => teardown(); }
    root.append(middlegameList()); return;
  }
  root.append(hub());
  return () => teardown();

  function hub() {
    const s = store.get();
    const op = OPENINGS.reduce((a, c) => a + courseProgress(c), 0) / OPENINGS.length;
    const en = ENDGAMES.filter((e) => lessonDone('endgames', e.id)).length / ENDGAMES.length;
    const mg = MIDDLEGAMES.filter((e) => lessonDone('middlegames', e.id)).length / MIDDLEGAMES.length;
    const card = (ic, title, text, p, href) => h('a.card.click', { href }, h('div.row.nowrapr', h('div.course-icon', ic), h('div.grow', h('h3', { style: { margin: 0 } }, title), h('div.small.muted', text))), h('div.mt', progress(p, { height: 6 })), h('div.xs.muted.mt', `${Math.round(p * 100)}% complete`));
    return h('div', h('div.page-head', h('h1', 'Learn')),
      h('p.muted.mb', 'A guided coach shows you the moves and ideas, then lets you play them yourself — against every sensible reply — until they stick.'),
      h('div.grid.g3', card('📖', 'Openings', `${OPENINGS.length} courses with every main variation.`, op, '#/learn/openings'), card('⚔️', 'Middlegames', 'Plans and typical structures, scored move by move.', mg, '#/learn/middlegames'), card('🏁', 'Endgames', 'Mating patterns, pawn and rook endings.', en, '#/learn/endgames')),
      h('div.card.flat.mt', h('b', 'How a lesson works'), h('ol.small.muted', { style: { paddingLeft: '18px', margin: '6px 0 0' } }, h('li', 'Watch — the coach plays the line and explains every idea.'), h('li', 'Practice — you play it from memory; wrong moves get explained, and the engine tells you whether your alternative is sound.'), h('li', 'Vary — choose the opponent\'s replies and learn the branches.'), h('li', 'Drill — random lines, no hints, until you get them clean three times.'))));
  }
  function crumb(t) { return h('div.page-head', h('button.back', { onclick: toHub() }, icon('left', 16), 'Learn'), h('h1', t)); }
  function openingList() {
    const group = (side, label) => h('div.mb', h('h3', label), h('div.grid.g2', OPENINGS.filter((c) => c.side === side).map((c) => { const p = courseProgress(c); return h('a.card.click', { href: `#/learn/openings/${c.id}` }, h('div.row.nowrapr', h('div.course-icon', c.icon), h('div.grow', h('b', c.name), h('div.xs.muted', c.tagline)), h('span.tag', c.level)), h('div.mt', progress(p, { height: 5 })), h('div.xs.muted.mt', `${c.lines.length} lines · ${Math.round(p * 100)}% learned`)); })));
    return h('div', crumb('Openings'), group('w', 'Play as White'), group('b', 'Play as Black'));
  }
  function endgameList() {
    return h('div', crumb('Endgames'), ...ENDGAME_CATS.map((cat) => h('div.mb', h('h3', cat), h('div.grid.g2', ENDGAMES.filter((e) => e.cat === cat).map((e) => h('a.card.click', { href: `#/learn/endgames/${e.id}` }, h('div.row.nowrapr', h('div.course-icon', e.icon), h('div.grow', h('b', e.name), h('div.xs.muted', e.summary)), lessonDone('endgames', e.id) ? h('span.tag.good', 'Done') : h('span.tag', e.level))))))));
  }
  function middlegameList() {
    return h('div', crumb('Middlegames'), h('div.grid.g2', MIDDLEGAMES.map((e) => h('a.card.click', { href: `#/learn/middlegames/${e.id}` }, h('div.row.nowrapr', h('div.course-icon', e.icon), h('div.grow', h('b', e.name), h('div.xs.muted', e.summary)), lessonDone('middlegames', e.id) ? h('span.tag.good', 'Done') : h('span.tag', e.level))))));
  }
}
