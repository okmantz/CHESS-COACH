import * as store from '../store.js';
import { h, icon, emptyState } from '../ui.js';
import { rankOf } from '../rating.js';
import { ensureTodayPlan, currentProfile } from '../plan.js';
import { runTask } from '../components.js';
import { gameRow } from './analyze.js';
import { roadStrip } from '../ladderui.js';
import { currentRung, tier, isPassed } from '../ladder.js';
import { avatarEl } from '../avatars.js';
import { nextStepCard } from '../guideui.js';

const greeting = () => { const hr = new Date().getHours(); return hr < 5 ? 'Still up' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'; };

function statTile(ic, value, label, { href, color } = {}) {
  const body = [h('span.stat-ic', { style: color ? { '--c': color } : null }, icon(ic, 20)), h('div.stat-txt', h('b', String(value)), h('span', label))];
  return href ? h('a.stat-tile', { href }, ...body) : h('div.stat-tile', ...body);
}

export default async function home(view, ctx) {
  const s = store.get();
  const rk = rankOf(s.rating.value);
  const plan = ensureTodayPlan();
  const prof = currentProfile();
  const done = plan.items.filter((i) => i.done).length;
  const last = s.games[0];
  const live = localStorage.getItem('chesscoach.live');
  const wins = s.games.filter((g) => g.outcome === 'win').length;
  const played = s.games.length;
  const unreviewed = played && !s.games.some((g) => g.review);

  const subtitle = played
    ? `${rk.name}${rk.next ? ` · ${Math.max(0, Math.round(rk.next.min - s.rating.value))} points to ${rk.next.name}` : ''}. Your coach is studying your games to build your plan.`
    : 'Play a few games against the computer — your rating starts at 600 and adjusts quickly as you win and lose.';

  const quick = (ic, title, sub, href, color) => h('a.quick', { href }, h('span.stat-ic', { style: { '--c': color } }, icon(ic, 20)), h('b', title), h('span', sub));

  const goal = (() => {
    const n = currentRung(), t = tier(n), complete = isPassed(10);
    return h('div.card.road-card',
      h('a.row.nowrapr', { href: '#/coach-play', style: { color: 'inherit', textDecoration: 'none' } },
        avatarEl({ kind: 'portrait', value: t.avatar }, 56, { square: true, ring: t.color }),
        h('div.grow', h('div.eyebrow', complete ? 'Road complete' : 'Your road to 2600'), h('b', complete ? 'You beat every opponent' : `Next: beat ${t.who} (${t.elo})`), h('div.small.muted', 'Play with Coach — it guides you at every step.')),
        icon('right', 18)),
      h('div.mt', roadStrip({})));
  })();

  const training = h('div.card',
    h('div.row.between.mb', { style: { marginBottom: '14px' } }, h('div.card-title', { style: { margin: 0 } }, icon('target', 18), 'Today’s training'), h('span.tag', { class: done === plan.items.length ? 'good' : 'accent' }, `${done}/${plan.items.length} done`)),
    h('div.train-list', plan.items.map((it) => h('button.task', { class: it.done ? 'done' : '', onclick: () => runTask(it), style: { textAlign: 'left', width: '100%' } }, h('div.tick', icon('check', 14)), h('div.grow', h('b', it.label), h('div.xs.muted', it.why)), icon('right', 16)))),
    plan.streak ? h('div.small.muted.mt', { style: { marginBottom: 0 } }, `🔥 ${plan.streak}-day training streak`) : null);

  const coachSees = h('div.card',
    h('div.card-title', icon('trend', 18), 'What the coach sees'),
    prof.length
      ? h('div.col', prof.slice(0, 3).map((w) => h('div.row.between', h('span', w.label), h('span.tag', { class: w.blunders ? 'bad' : 'warn' }, `${w.count}×`))), h('a.btn.small', { href: '#/coach' }, 'Full coaching report'))
      : emptyState('sparkle', 'Nothing to report yet', 'Analyze a few of your games and the coach will list your recurring mistakes here — then turn them into training.',
        unreviewed ? h('a.btn.small.primary', { href: `#/analyze?game=${s.games[0].id}` }, 'Analyze your last game') : h('a.btn.small', { href: '#/analyze' }, 'Analyze a game')),
    prof.length && unreviewed ? h('a.btn.small.primary.mt', { href: `#/analyze?game=${s.games[0].id}` }, 'Analyze your last game') : null);

  view.replaceChildren(h('div.page',
    h('div.home-greet',
      h('div.eyebrow', greeting()),
      h('h1', `Welcome back, ${s.profile.name}`),
      h('p', subtitle),
      h('div.row.mt', h('a.btn.primary.big', { href: '#/play' }, icon('play', 18), live ? 'Resume game' : 'Play now'), h('a.btn.big', { href: '#/analyze' }, icon('search', 18), 'Analyze a game'))),
    h('div.stat-strip',
      statTile('trend', Math.round(s.rating.value), rk.name, { href: '#/profile' }),
      statTile('zap', s.puzzles.rating, `Puzzle rating${s.puzzles.solved ? ` · ${s.puzzles.solved} solved` : ''}`, { href: '#/train', color: 'var(--warn)' }),
      statTile('award', wins, played ? `Wins · ${played} game${played === 1 ? '' : 's'}` : 'Games won', { href: '#/games', color: 'var(--good)' }),
      statTile('flame', plan.streak || 0, 'Day streak', { href: '#/coach', color: 'var(--gold)' })),
    h('div.home-grid',
      h('div.home-col', nextStepCard(null, { compact: true }), goal, last ? h('div.card', h('div.row.between', { style: { marginBottom: '12px' } }, h('div.card-title', { style: { margin: 0 } }, icon('list', 18), 'Last game'), h('a.small', { href: '#/games' }, 'All games')), gameRow(last, () => ctx.navigate(`#/analyze?game=${last.id}`))) : null),
      h('div.home-col', training, coachSees)),
    h('div.group-label', 'Explore'),
    h('div.quick-grid',
      quick('book', 'Learn', 'Openings, middlegames, endgames', '#/learn', 'var(--info)'),
      quick('zap', 'Puzzles', `Rating ${s.puzzles.rating}`, '#/train', 'var(--warn)'),
      quick('users', 'Play a friend', 'Two players, one screen', '#/two-player', 'var(--good)'),
      quick('chart', 'Progress', 'Accuracy, trends, rating', '#/coach', 'var(--accent)'))));
}
