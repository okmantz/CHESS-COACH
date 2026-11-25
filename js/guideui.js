// Shared pieces of the guided experience: the "next step" card (Home, Coach, Path) and the phase meters.
import { h, icon } from './ui.js';
import { journey, phaseLabel } from './journey.js';

export function nextStepCard(j = null, { compact = false } = {}) {
  j = j || journey();
  const n = j.next;
  return h('div.card.next-step', h('div.eyebrow', 'Your next step'),
    h('h3.m0', n.title),
    h('div.small.muted.mb-s', j.headline),
    compact ? null : h('p', n.why),
    h('div.row', h('a.btn.primary.big', { href: n.cta.href }, n.cta.label, icon('right', 16)), h('a.btn.ghost', { href: '#/path' }, 'See my full path')));
}

export function phaseMeters(profile) {
  const rows = ['opening', 'middlegame', 'endgame'].map((p) => {
    const x = profile[p];
    return h('div.phase-row', h('span.phase-name', phaseLabel(p)), h('div.phase-bar', x.acc == null ? h('span.phase-empty', 'not enough data yet') : h('span.phase-fill', { class: x.acc >= 85 ? 'good' : x.acc >= 72 ? 'mid' : 'bad', style: { width: `${Math.max(4, Math.min(100, x.acc))}%` } })), h('span.phase-val', x.acc == null ? '' : `${Math.round(x.acc)}%`));
  });
  return h('div.phase-meters', rows);
}
