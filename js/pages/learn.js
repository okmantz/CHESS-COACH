import * as store from '../store.js';
import { h, icon, progress } from '../ui.js';
import { OPENINGS, courseById } from '../data/openings.js';
import { ENDGAMES, ENDGAME_CATS, endgameById } from '../data/endgames.js';
import { MIDDLEGAMES, middlegameById } from '../data/middlegames.js';
import { BASICS, BASICS_PARTS, basicById } from '../data/basics.js';
import { TACTICS, TACTICS_PARTS, tacticById, STRATEGY, STRATEGY_PARTS, strategyById } from '../data/tactics.js';
import { GLOSSARY } from '../data/glossary.js';
import { Board } from '../board.js';
import { Chess } from '../../vendor/chess.js';
import { currentRung, tier, progressFor } from '../ladder.js';
import { openingCourse, courseProgress } from '../learn/opening.js';
import { guidedLesson, lessonDone } from '../learn/guided.js';
import { lessonPlayer } from '../learn/lesson.js';
import '../lessons.js';

export default async function learnPage(view, ctx) {
  const [track, id] = ctx.params;
  const root = h('div.page');
  view.replaceChildren(root);
  let teardown = () => {};
  const toHub = (t) => () => { ctx.navigate(t ? `#/learn/${t}` : '#/learn'); };
  const done = (t, i) => lessonDone(t, i);
  const frac = (list, t) => (list.length ? list.filter((x) => done(t, x.id)).length / list.length : 0);

  if (!track) { root.append(hub()); return; }
  if (track === 'basics') {
    const l = id && basicById(id);
    if (l) { const k = BASICS.indexOf(l); const nx = BASICS[k + 1]; teardown = lessonPlayer(root, ctx, { track: 'basics', lesson: l, back: toHub('basics'), backLabel: 'How to play', nextLesson: nx ? { name: nx.name, href: `#/learn/basics/${nx.id}` } : null }); return () => teardown(); }
    root.append(basicsList()); return;
  }
  if (track === 'tactics') {
    const l = id && tacticById(id);
    if (l) { const ordered = orderedTactics(); const k = ordered.indexOf(l); const nx = ordered[k + 1]; teardown = lessonPlayer(root, ctx, { track: 'tactics', lesson: l, back: toHub('tactics'), backLabel: 'Tactics', nextLesson: nx ? { name: nx.name, href: `#/learn/tactics/${nx.id}` } : null }); return () => teardown(); }
    root.append(tacticsList()); return;
  }
  if (track === 'strategy') {
    const l = id && strategyById(id);
    if (l) { const ordered = STRATEGY_PARTS.flatMap((_, p) => STRATEGY.filter((t) => t.part === p)); const k = ordered.indexOf(l); const nx = ordered[k + 1]; teardown = lessonPlayer(root, ctx, { track: 'strategy', lesson: l, back: toHub('strategy'), backLabel: 'Strategy', nextLesson: nx ? { name: nx.name, href: `#/learn/strategy/${nx.id}` } : null }); return () => teardown(); }
    root.append(strategyList()); return;
  }
  if (track === 'glossary') { root.append(glossaryPage()); return; }
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

  function orderedTactics() { return TACTICS_PARTS.flatMap((_, p) => TACTICS.filter((t) => t.part === p)); }

  function hub() {
    const op = OPENINGS.reduce((a, c) => a + courseProgress(c), 0) / OPENINGS.length;
    const st = frac(STRATEGY, 'strategy'), bs = frac(BASICS, 'basics'), tc = frac(TACTICS, 'tactics'), en = frac(ENDGAMES, 'endgames'), mg = frac(MIDDLEGAMES, 'middlegames');
    const nextBasic = BASICS.find((b) => !done('basics', b.id));
    const card = (ic, title, text, p, href, meta) => h('a.card.click.course', { href }, h('div.row.nowrapr', h('div.course-icon', ic), h('div.grow', h('h3', { style: { margin: 0 } }, title), h('div.small.muted', text))), h('div.mt', progress(p, { height: 6 })), h('div.xs.muted.mt', `${meta} · ${Math.round(p * 100)}% complete`));
    const total = STRATEGY.length + BASICS.length + TACTICS.length + ENDGAMES.length + MIDDLEGAMES.length + OPENINGS.length;
    return h('div',
      h('div.page-head', h('h1', 'Learn'), h('span.tag.accent', `${total} courses & lessons`)),
      h('p.muted.mb', 'A coach explains each idea, shows it on the board, then makes you play it yourself. Start at the top and work down, or jump to what you need.'),
      h('a.card.click.hero-card', { href: nextBasic ? `#/learn/basics/${nextBasic.id}` : '#/learn/basics' },
        h('div.row.nowrapr', h('div.course-icon.big', '🎓'), h('div.grow', h('div.eyebrow', bs >= 1 ? 'Course complete' : bs > 0 ? 'Continue' : 'Start here'), h('h2', { style: { margin: '2px 0 4px' } }, 'How to Play Chess'), h('div.small.muted', 'New to chess? A step-by-step course from how the pieces move to the three golden rules: control the centre, develop your pieces, connect your rooks.')), h('span.btn.primary', bs > 0 ? 'Continue' : 'Begin', icon('right', 16))),
        h('div.mt', progress(bs, { height: 6 })), h('div.xs.muted.mt', `${BASICS.filter((b) => done('basics', b.id)).length} of ${BASICS.length} lessons`)),
      pathCard(),
      h('h3.mt', 'Courses'),
      h('div.grid.g2',
        card('⚔️', 'Tactics', 'Forks, pins, skewers, discovered attacks, mating patterns and more.', tc, '#/learn/tactics', `${TACTICS.length} lessons`),
        card('🧠', 'Strategy', 'The "why" behind good moves: plans, pawns, files, outposts, king safety.', st, '#/learn/strategy', `${STRATEGY.length} lessons`),
        card('📖', 'Openings', 'Learn every main variation with the ideas behind the moves, for White and Black.', op, '#/learn/openings', `${OPENINGS.length} openings`),
        card('🧭', 'Middlegames', 'Plans and typical structures, scored move by move.', mg, '#/learn/middlegames', `${MIDDLEGAMES.length} lessons`),
        card('🏁', 'Endgames', 'Mating patterns, pawn endings, rook endings and key ideas.', en, '#/learn/endgames', `${ENDGAMES.length} lessons`)),
      h('a.card.click.mt', { href: '#/coach-play' }, h('div.row.nowrapr', h('div.course-icon', '🤝'), h('div.grow', h('b', 'Play a game with Coach'), h('div.small.muted', 'Apply what you learn in a real game. The coach asks questions instead of giving answers, and builds a report of your habits.')), icon('right', 18))),
      h('a.card.click.mt', { href: '#/learn/glossary' }, h('div.row.nowrapr', h('div.course-icon', '📚'), h('div.grow', h('b', 'Chess glossary'), h('div.small.muted', `${GLOSSARY.length} terms explained in plain English, each with a small board example.`)), icon('right', 18))),
      h('div.card.flat.mt', h('b', 'How a lesson works'), h('ol.small.muted', { style: { paddingLeft: '18px', margin: '6px 0 0' } }, h('li', 'Watch — the coach explains the idea and shows it on the board.'), h('li', 'Do — you play the move, tap the squares or answer the question; wrong tries get a specific explanation.'), h('li', 'Practice — drills and puzzles make the pattern stick.'))));
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
  function strategyList() {
    return h('div', crumb('Strategy', `${STRATEGY.filter((b) => done('strategy', b.id)).length}/${STRATEGY.length}`), h('p.muted.mb', 'Tactics win material; strategy tells you which move to play when nothing is hanging. Each lesson explains the why and then makes you apply it.'),
      ...STRATEGY_PARTS.map((label, p) => h('div.mb', h('h3', label), h('div.grid.g2', STRATEGY.filter((b) => b.part === p).map((b) => lessonCard('strategy', b))))));
  }
  function glossaryPage() {
    const list = h('div.col');
    const search = h('input', { type: 'search', placeholder: 'Search terms…', oninput: () => draw() });
    const draw = () => {
      const qy = search.value.trim().toLowerCase();
      list.replaceChildren(...GLOSSARY.filter((g) => !qy || g.term.toLowerCase().includes(qy) || g.def.toLowerCase().includes(qy)).map((g) => {
        const card = h('div.card.gloss', h('div.row.nowrapr', h('div.grow', h('b', g.term), h('p.small.muted', { style: { margin: '4px 0 0' } }, g.def), g.note ? h('p.xs.muted', g.note) : null)));
        if (g.fen) {
          const holder = h('div.gloss-board'); card.firstChild.append(holder);
          const b = new Board(h('div'), { orientation: 'w', interactive: false, coords: false, animate: false });
          holder.append(b.el); b.setPosition(g.fen, { animate: false });
          b.setMarks(Object.fromEntries((g.hl || []).map((s) => [s, 'warn'])));
          b.setArrows((g.arrows || []).map((a) => { const [m, c] = a.split(':'); return { from: m.slice(0, 2), to: m.slice(2, 4), color: c === 'r' ? '#ef6b6b' : '#5fc88f', opacity: 0.9 }; }));
        }
        return card;
      }));
    };
    draw();
    return h('div', crumb('Glossary', `${GLOSSARY.length} terms`), h('div.mb', search), list);
  }
  function crumb(t, sub) { return h('div.page-head', h('button.back', { onclick: toHub() }, icon('left', 16), 'Learn'), h('h1', t), sub ? h('span.muted.small', sub) : null); }
  function lessonCard(track, l) { return h('a.card.click', { href: `#/learn/${track}/${l.id}` }, h('div.row.nowrapr', h('div.course-icon', l.icon), h('div.grow', h('b', l.name), h('div.xs.muted', l.summary)), done(track, l.id) ? h('span.tag.good', 'Done') : h('span.tag', l.time || l.level))); }
  function basicsList() {
    return h('div', crumb('How to Play Chess', `${BASICS.filter((b) => done('basics', b.id)).length}/${BASICS.length}`),
      ...BASICS_PARTS.map((label, p) => h('div.mb', h('h3', label), h('div.grid.g2', BASICS.filter((b) => b.part === p).map((b) => lessonCard('basics', b))))));
  }
  function tacticsList() {
    return h('div', crumb('Tactics', `${TACTICS.filter((b) => done('tactics', b.id)).length}/${TACTICS.length}`), h('p.muted.mb', 'Tactics are short, forcing combinations. Learn the patterns, then train them with puzzles.'),
      ...TACTICS_PARTS.map((label, p) => h('div.mb', h('h3', label), h('div.grid.g2', TACTICS.filter((b) => b.part === p).map((b) => lessonCard('tactics', b))))));
  }
  function openingList() {
    const group = (side, label) => h('div.mb', h('h3', label), h('div.grid.g2', OPENINGS.filter((c) => c.side === side).map((c) => { const p = courseProgress(c); return h('a.card.click', { href: `#/learn/openings/${c.id}` }, h('div.row.nowrapr', h('div.course-icon', c.icon), h('div.grow', h('b', c.name), h('div.xs.muted', c.tagline)), h('span.tag', c.level)), h('div.mt', progress(p, { height: 5 })), h('div.xs.muted.mt', `${c.lines.length} lines · ${Math.round(p * 100)}% learned`)); })));
    return h('div', crumb('Openings', `${OPENINGS.length} openings`), group('w', 'Play as White'), group('b', 'Play as Black'));
  }
  function endgameList() {
    return h('div', crumb('Endgames', `${ENDGAMES.length} lessons`), ...ENDGAME_CATS.map((cat) => h('div.mb', h('h3', cat), h('div.grid.g2', ENDGAMES.filter((e) => e.cat === cat).map((e) => h('a.card.click', { href: `#/learn/endgames/${e.id}` }, h('div.row.nowrapr', h('div.course-icon', e.icon), h('div.grow', h('b', e.name), h('div.xs.muted', e.summary)), done('endgames', e.id) ? h('span.tag.good', 'Done') : h('span.tag', e.level))))))));
  }
  function middlegameList() {
    return h('div', crumb('Middlegames', `${MIDDLEGAMES.length} lessons`), h('div.grid.g2', MIDDLEGAMES.map((e) => h('a.card.click', { href: `#/learn/middlegames/${e.id}` }, h('div.row.nowrapr', h('div.course-icon', e.icon), h('div.grow', h('b', e.name), h('div.xs.muted', e.summary)), done('middlegames', e.id) ? h('span.tag.good', 'Done') : h('span.tag', e.level))))));
  }
}
