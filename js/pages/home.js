import * as store from '../store.js';
import { h, icon } from '../ui.js';
import { rankOf } from '../rating.js';
import { ensureTodayPlan, currentProfile } from '../plan.js';
import { runTask } from '../components.js';
import { gameRow } from './analyze.js';
import { TAGS } from '../coach.js';
import { roadStrip } from '../ladderui.js';
import { currentRung, tier, isPassed } from '../ladder.js';
import { avatarEl } from '../avatars.js';

export default async function home(view, ctx) {
  const s = store.get();
  const rk = rankOf(s.rating.value);
  const plan = ensureTodayPlan();
  const prof = currentProfile();
  const done = plan.items.filter((i) => i.done).length;
  const last = s.games[0];
  const live = localStorage.getItem('chesscoach.live');
  const tile = (ic, title, sub, href) => h('a.card.click', { href }, h('div.row.nowrapr', h('div.course-icon', icon(ic, 22)), h('div.grow', h('b', title), h('div.small.muted', sub)), icon('right', 16)));
  view.replaceChildren(h('div.page',
    h('div.hero.mb', h('div.small.muted', `Welcome back, ${s.profile.name}`), h('h1', { style: { marginBottom: '6px' } }, s.games.length ? `You're rated ${Math.round(s.rating.value)}` : 'Let\'s find your level'),
      h('p.muted', { style: { maxWidth: '520px' } }, s.games.length ? `${rk.name}${rk.next ? ` · ${Math.round(rk.next.min - s.rating.value)} points to ${rk.next.name}` : ''}. The coach is studying your games to build your plan.` : 'Play a few games against the computer — your rating starts at 600 and adjusts quickly as you win and lose.'),
      h('div.row', h('a.btn.primary.big', { href: '#/play' }, icon('play', 18), live ? 'Resume game' : 'Play now'), h('a.btn.big', { href: '#/analyze' }, icon('search', 18), 'Analyze a game'))),
    (() => { const n = currentRung(), t = tier(n); return h('a.card.click.mb.goal-card', { href: '#/coach-play', style: { '--tier': t.color } }, h('div.row.nowrapr', avatarEl({ kind: 'portrait', value: t.avatar }, 52, { square: true, ring: t.color }), h('div.grow', h('div.eyebrow', isPassed(10) ? 'Road complete' : 'Your road to 2600'), h('b', isPassed(10) ? 'You beat every opponent' : `Next: beat ${t.who} (${t.elo})`), h('div.xs.muted', 'Play with Coach — it guides you at every step.')), icon('right', 16)), h('div.mt', roadStrip({}))); })(),
    h('div.grid.g2.mb',
      h('div.card', h('div.row.between.mb', h('div.card-title', { style: { margin: 0 } }, icon('target', 18), "Today's training"), h('span.tag', { class: done === plan.items.length ? 'good' : 'accent' }, `${done}/${plan.items.length}`)),
        h('div.col', plan.items.map((it) => h('button.task', { class: it.done ? 'done' : '', onclick: () => runTask(it), style: { textAlign: 'left', width: '100%' } }, h('div.tick', icon('check', 14)), h('div.grow', h('b', it.label), h('div.xs.muted', it.why)), icon('right', 16)))),
        plan.streak ? h('div.small.muted.mt', `🔥 ${plan.streak}-day training streak`) : null),
      h('div.card', h('div.card-title', icon('trend', 18), 'What the coach sees'),
        prof.length ? h('div.col', prof.slice(0, 3).map((w) => h('div.row.between', h('span', w.label), h('span.tag', { class: w.blunders ? 'bad' : 'warn' }, `${w.count}×`))), h('a.btn.small', { href: '#/coach' }, 'Full coaching report'))
          : h('p.muted', 'Analyze a few of your games and the coach will list your recurring mistakes here — then turn them into training.'),
        s.games.length && !s.games.some((g) => g.review) ? h('a.btn.small.primary.mt', { href: `#/analyze?game=${s.games[0].id}` }, 'Analyze your last game') : null)),
    h('div.grid.g3.mb', tile('book', 'Learn', 'Openings, middlegames, endgames', '#/learn'), tile('zap', 'Puzzles', `Rating ${s.puzzles.rating}`, '#/train'), tile('chart', 'Progress', 'Accuracy, trends, rating', '#/coach')),
    last ? h('div.card', h('div.card-title', icon('list', 18), 'Last game'), gameRow(last, () => ctx.navigate(`#/analyze?game=${last.id}`))) : null));
}
