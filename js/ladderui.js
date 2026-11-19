// UI for the 600 -> 2600 ladder: the opponent picker (a row of portraits, like a character-select screen), the road map with
// per-rung missions, and a compact progress strip. Pure presentation: the rules live in ladder.js.
import { h, icon, progress } from './ui.js';
import { avatarEl } from './avatars.js';
import { withCrowns } from './crowns.js';
import { TIERS, tier, currentRung, isPassed, statusLine, progressFor, resultOf } from './ladder.js';

const portrait = (t, size, opts = {}) => avatarEl({ kind: 'portrait', value: t.avatar }, size, { square: true, ...opts });

/** Character-select grid. cfg.level is read and written. onChange(n) fires after a pick. */
export function opponentPicker(cfg, { onChange, rating = 0 } = {}) {
  const grid = h('div.opp-grid', { role: 'listbox', 'aria-label': 'Choose your opponent' });
  const detail = h('div.opp-detail');
  const draw = () => {
    const cur = currentRung();
    grid.replaceChildren(...TIERS.map((t) => h('button.opp-card', {
      class: [t.n === cfg.level ? 'active' : '', isPassed(t.n) ? 'passed' : '', t.n === cur ? 'current' : ''].join(' '), style: { '--tier': t.color },
      role: 'option', 'aria-selected': t.n === cfg.level ? 'true' : 'false', 'aria-label': `${t.who}, ${t.name}, about ${t.elo}`,
      onclick: () => { cfg.level = t.n; draw(); onChange && onChange(t.n); },
    }, withCrowns(portrait(t, 64), t.n, { size: 10 }), h('b', String(t.elo)), isPassed(t.n) ? h('i.opp-badge.ok', icon('check', 11)) : t.n === cur ? h('i.opp-badge.cur', icon('star', 11)) : null)));
    detail.replaceChildren(tierDetail(cfg.level, rating));
  };
  draw();
  const el = h('div.opp-picker', grid, detail);
  el.refresh = draw;
  return el;
}

export function tierDetail(n, rating = 0) {
  const t = tier(n);
  const diff = rating ? t.elo - rating : 0;
  const hint = !rating ? '' : diff > 250 ? ' A big step up from your rating — expect a tough game.' : diff < -350 ? ' Much weaker than you — good for practising a plan.' : ' A good match for your level.';
  return h('div.opp-info', { style: { '--tier': t.color } },
    h('div.row.nowrapr', withCrowns(portrait(t, 56, { ring: t.color }), t.n, { size: 10 }), h('div.grow', h('div.row.tight', h('b.opp-name', t.who), h('span.tier-tag', t.name), h('span.tag', `~${t.elo}`)), h('div.small.muted', t.blurb + hint))),
    h('div.xs.faint.mt', statusLine(n)));
}

/** Compact strip of all ten rungs with progress, for Home / Play. */
export function roadStrip({ href = '#/coach-play' } = {}) {
  const cur = currentRung();
  return h('a.road-strip', { href, 'aria-label': 'Your road from 600 to 2600' },
    h('div.road-line', ...TIERS.map((t) => h('span.road-dot', { class: isPassed(t.n) ? 'done' : t.n === cur ? 'cur' : '', style: { '--tier': t.color }, title: `${t.who} · ${t.elo}` }, isPassed(t.n) ? icon('check', 10) : String(t.n)))),
    h('div.row.between.xs.muted', h('span', '600'), h('b', cur <= 10 && !isPassed(10) ? `Next: ${tier(cur).who} (${tier(cur).elo})` : 'Road complete'), h('span', '2600')));
}

/** The full road: every rung with its mission. onPlay(n) starts a game against that rung's opponent. */
export function roadMap({ onPlay, selected = null } = {}) {
  const cur = currentRung();
  const root = h('div.road');
  const open = new Set([selected || cur]);
  const draw = () => {
    root.replaceChildren(...TIERS.map((t) => {
      const pf = progressFor(t.n), r = resultOf(t.n), done = isPassed(t.n), isCur = t.n === cur, isOpen = open.has(t.n);
      const head = h('button.road-head', { onclick: () => { if (isOpen) open.delete(t.n); else open.add(t.n); draw(); }, 'aria-expanded': String(isOpen) },
        withCrowns(portrait(t, 46, { ring: done ? '#5fc88f' : isCur ? t.color : null }), t.n, { size: 8 }),
        h('div.grow', h('div.row.tight', h('b', `${t.elo} · ${t.name}`), isCur ? h('span.tag.accent', 'You are here') : null, done ? h('span.tag.good', 'Passed') : null), h('div.xs.muted', `${t.who} — ${statusLine(t.n)}`)),
        icon('right', 16));
      const body = !isOpen ? null : h('div.road-body',
        h('p.small', t.expect),
        h('div.coach-sec', h('h4', 'What to master'), h('ul', t.skills.map((s) => h('li', s)))),
        h('div.coach-sec', h('h4', `Study and practise (${pf.studied}/${pf.total})`),
          h('div.col', { style: { gap: '6px' } }, pf.steps.map((st) => h('a.road-step', { href: st.href, class: st.done ? 'done' : '' }, h('span.tick', icon('check', 12)), h('span.grow', st.label, st.kind === 'puzzles' ? h('span.xs.muted', ` · ${st.have || 0}/${st.n} solved`) : null), icon('right', 14))))),
        h('div.gate', h('div.row.tight', icon('target', 16), h('b', 'To pass this rung')), h('p.small.muted', { style: { margin: '4px 0 0' } }, `Beat ${t.who} with at least ${t.target}% accuracy (a clean win) — or win ${t.needWins} games. You have ${r.wins} win${r.wins === 1 ? '' : 's'} so far${r.bestAcc ? `, best accuracy ${Math.round(r.bestAcc)}%` : ''}.`),
          h('div.mt', progress(Math.min(1, Math.max(r.wins / t.needWins, (r.bestAcc || 0) >= t.target && r.wins ? 1 : 0)), { height: 6 }))),
        t.habit ? h('div.principle', icon('bulb', 16), h('span', t.habit)) : null,
        onPlay ? h('button.btn.primary.block.mt', { onclick: () => onPlay(t.n) }, icon('play', 16), `Play ${t.who} (${t.elo})`) : null);
      return h('div.road-item', { class: (done ? 'done ' : '') + (isCur ? 'cur' : ''), style: { '--tier': t.color } }, head, body);
    }));
  };
  draw();
  return root;
}
