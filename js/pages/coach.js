import * as store from '../store.js';
import { h, icon, modal, fmtDate } from '../ui.js';
import { TAGS, THEME_LABELS } from '../coach.js';
import { accuracyToRating } from '../analysis.js';
import { ensureTodayPlan, currentProfile } from '../plan.js';
import { runTask, statBox, emptyState } from '../components.js';
import { rankOf } from '../rating.js';
import { nextStepCard } from '../guideui.js';

const NS = 'http://www.w3.org/2000/svg';
function lineChart(points, { color = 'var(--accent)', height = 120, yFmt = (v) => Math.round(v), min, max } = {}) {
  const W = 600, H = height, pad = 6;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'chart'); svg.setAttribute('preserveAspectRatio', 'none'); svg.style.height = height + 'px';
  if (points.length < 2) return h('div.small.muted.center', { style: { padding: '24px 0' } }, 'Play or analyze a few more games to see a trend.');
  const lo = min != null ? min : Math.min(...points) - 10, hi = max != null ? max : Math.max(...points) + 10;
  const x = (i) => pad + (i / (points.length - 1)) * (W - 2 * pad), y = (v) => H - pad - ((v - lo) / Math.max(1, hi - lo)) * (H - 2 * pad);
  const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  svg.append(mk('path', { d: points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' '), fill: 'none', stroke: color === 'var(--accent)' ? getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c9cff' : color, 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }));
  const wrap = h('div', svg, h('div.row.between.xs.faint', h('span', yFmt(points[0])), h('span', `latest ${yFmt(points[points.length - 1])}`)));
  return wrap;
}

export default async function coachPage(view, ctx) {
  const s = store.get();
  const plan = ensureTodayPlan();
  const prof = currentProfile();
  const analyzed = s.games.filter((g) => g.review && g.color && g.color !== 'none').slice().reverse();
  const accOf = (g) => g.review.summary[g.color].acc;
  const recent = analyzed.slice(-10);
  const avgAcc = recent.length ? recent.reduce((a, g) => a + accOf(g), 0) / recent.length : null;
  const estRating = avgAcc != null ? accuracyToRating(avgAcc, 20) : null;
  const rk = rankOf(s.rating.value);

  // accuracy per phase over analysed games
  const phase = { opening: [0, 0], middlegame: [0, 0], endgame: [0, 0] };
  for (const g of analyzed) for (const p of Object.keys(phase)) { const x = g.review.summary[g.color].phase[p]; if (x && x.n) { phase[p][0] += x.acc * x.n; phase[p][1] += x.n; } }
  const phaseVals = Object.entries(phase).map(([k, [a, n]]) => [k, n ? a / n : null, n]);
  const worst = phaseVals.filter((p) => p[1] != null).sort((a, b) => a[1] - b[1])[0];

  // tactical profile from puzzles
  const th = Object.entries(s.puzzles.themes).filter(([, v]) => v.attempts >= 2).map(([k, v]) => [k, v.solved / v.attempts, v.attempts]).sort((a, b) => b[1] - a[1]);
  const strengths = th.filter((t) => t[1] >= 0.7).slice(0, 3), weak = th.filter((t) => t[1] < 0.6).slice(-3).reverse();

  // activity
  const days = []; for (let i = 27; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const a = s.activity[k]; days.push([k, a ? Object.values(a).reduce((x, y) => x + y, 0) : 0]); }

  const bar = (label, v, sub, color) => h('div.bar-row', h('span', label), h('div.bar', h('i', { style: { width: Math.max(2, v) + '%', background: color || 'var(--accent)' } })), h('span.small.muted', sub));
  const showWeak = (w) => {
    const meta = TAGS[w.tag];
    const items = s.mistakes.filter((m) => m.tag === w.tag).slice(-5).reverse();
    const m = modal(h('div.col',
      meta ? h('div', h('h4', 'What to consider'), h('ul', meta.consider.map((c) => h('li', c)))) : null,
      items.length ? h('div', h('h4', 'Recent examples'), ...items.map((it) => h('a.card.flat.small', { href: `#/analyze?game=${it.gameId}`, onclick: () => m.close(), style: { display: 'block', margin: '6px 0' } }, `Move ${it.moveNo}: you played ${it.san}; better was ${it.bestSan}`))) : null,
      h('div.row', h('a.btn.primary', { href: `#/train/mistakes?tag=${w.tag}`, onclick: () => m.close() }, 'Replay these mistakes'), ...(meta ? meta.tasks.slice(0, 2).map((t) => h('button.btn', { onclick: () => { m.close(); runTask(t); } }, t.label || 'Practice')) : []))), { title: w.label });
  };

  view.replaceChildren(h('div.page',
    h('div.page-head', h('h1', 'Coach'), h('div.grow'), h('button.btn.small', { onclick: () => { ensureTodayPlan(true); ctx.navigate('#/coach'); location.reload(); } }, icon('repeat', 14), 'Refresh plan')),
    nextStepCard(),
    h('div.card.mb.grid.g4', statBox(Math.round(s.rating.value), 'Rating', rk.name), statBox(estRating || '—', 'Performance estimate', avgAcc != null ? `from ${recent.length} analyzed games` : 'analyze games to unlock'), statBox(avgAcc != null ? avgAcc.toFixed(0) + '%' : '—', 'Avg accuracy'), statBox(s.puzzles.rating, 'Puzzle rating')),
    h('div.grid.g2.mb',
      h('div.card', h('div.card-title', icon('target', 18), "Your plan for today"),
        h('div.col', plan.items.map((it) => h('button.task', { class: it.done ? 'done' : '', onclick: () => runTask(it), style: { textAlign: 'left', width: '100%' } }, h('div.tick', icon('check', 14)), h('div.grow', h('b', it.label), h('div.xs.muted', it.why), it.n > 1 ? h('div.xs.faint', `${Math.min(it.progress || 0, it.n)}/${it.n}`) : null), icon('right', 16)))),
        plan.streak ? h('div.small.muted.mt', `🔥 ${plan.streak}-day streak`) : null),
      h('div.card', h('div.card-title', icon('search', 18), 'Recurring mistakes'),
        prof.length ? h('div.col', prof.slice(0, 6).map((w) => h('button.line-row', { onclick: () => showWeak(w) }, h('div.grow', h('b', w.label), h('div.xs.muted', `${w.count} in ${analyzed.length} game${analyzed.length === 1 ? '' : 's'}${w.blunders ? ` · ${w.blunders} blunder${w.blunders > 1 ? 's' : ''}` : ''}`)), icon('right', 16))))
          : emptyState('search', 'Nothing yet', 'Analyze a game you played. The coach tags each mistake (hung piece, missed fork, king safety…) and tracks what keeps coming back.', h('a.btn.primary', { href: '#/analyze' }, 'Analyze a game')))),
    h('div.grid.g2.mb',
      h('div.card', h('div.card-title', icon('chart', 18), 'Accuracy by phase'), worst ? h('div', ...phaseVals.map(([k, v, n]) => bar(k[0].toUpperCase() + k.slice(1), v || 0, v == null ? '—' : Math.round(v) + '%', v != null && v < 70 ? 'var(--warn)' : 'var(--good)')), h('p.small.muted.mt', `Your ${worst[0]} is the weakest phase (${Math.round(worst[1])}% across ${worst[2]} moves).`)) : h('p.muted', 'Appears after your first analyzed game.')),
      h('div.card', h('div.card-title', icon('zap', 18), 'Tactical profile'),
        th.length ? h('div', ...th.slice(0, 8).map(([k, r, n]) => bar(THEME_LABELS[k] || k, r * 100, `${Math.round(r * 100)}%`, r >= 0.7 ? 'var(--good)' : r >= 0.5 ? 'var(--warn)' : 'var(--bad)')),
          strengths.length ? h('p.small.muted.mt', `Strong: ${strengths.map((t) => THEME_LABELS[t[0]] || t[0]).join(', ')}.`) : null, weak.length ? h('p.small.muted', `Needs work: ${weak.map((t) => THEME_LABELS[t[0]] || t[0]).join(', ')}.`) : null)
          : h('p.muted', 'Solve a few puzzles to map your tactical strengths and weaknesses.'))),
    h('div.grid.g2.mb',
      h('div.card', h('div.card-title', icon('trend', 18), 'Rating over time'), lineChart([600, ...s.rating.history.map((x) => x.r)].slice(-60))),
      h('div.card', h('div.card-title', icon('trend', 18), 'Accuracy per game'), lineChart(analyzed.slice(-20).map(accOf), { min: 0, max: 100, yFmt: (v) => Math.round(v) + '%', color: '#5fc88f' }))),
    h('div.card', h('div.card-title', icon('clock', 18), 'Activity · last 4 weeks'), h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: '4px' } }, days.map(([d, n]) => h('div', { title: `${d}: ${n}`, style: { aspectRatio: '1', borderRadius: '5px', background: n ? 'var(--accent)' : 'var(--surface-3)', opacity: n ? Math.min(1, 0.35 + n / 10) : 1 } }))))));
}
