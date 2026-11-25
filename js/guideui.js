// Shared pieces of the guided experience: the "next step" card (Home, Coach, Path) and the phase meters.
import { h, icon } from './ui.js';
import { journey, phaseLabel } from './journey.js';

/** The journey in six milestones: each is done when every road step in it is done; the first unfinished one is "now". */
const MILESTONES = [
  ['Play', (r) => r.id === 'play'], ['Review', (r) => r.id === 'review'], ['Openings', (r) => r.id === 'rep'],
  ['Middlegame', (r) => r.group === 'middlegame' || r.id === 'gym'], ['Endgames', (r) => r.id === 'endgames'], ['Climb', (r) => r.id === 'coach-play'],
];
export function milestones(j) {
  const out = MILESTONES.map(([label, test]) => { const rs = j.roadmap.filter(test); return { label, done: rs.length > 0 && rs.every((r) => r.done) }; });
  const now = out.findIndex((m) => !m.done);
  out.forEach((m, i) => { m.now = i === now; });
  return { items: out, now };
}

export function nextStepCard(j = null, { compact = false } = {}) {
  j = j || journey();
  const n = j.next;
  const ms = milestones(j);
  const label = ms.now >= 0 ? `Step ${ms.now + 1} of ${ms.items.length} · ${ms.items[ms.now].label}` : 'Journey complete';
  return h('div.card.next-step',
    h('div.ns-track', ...ms.items.map((m) => h('i', { class: m.done ? 'done' : m.now ? 'now' : '', title: m.label })), h('span.ns-track-label', label)),
    h('div.eyebrow', 'Your next step'),
    h('h3', n.title),
    h('div.ns-headline', j.headline),
    compact ? null : h('p', n.why),
    h('div.ns-actions', h('a.btn.primary.big', { href: n.cta.href }, n.cta.label, icon('right', 16)), h('a.btn.ghost', { href: '#/path' }, 'My full path')));
}

export function phaseMeters(profile) {
  const rows = ['opening', 'middlegame', 'endgame'].map((p) => {
    const x = profile[p];
    return h('div.phase-row', h('span.phase-name', phaseLabel(p)), h('div.phase-bar', x.acc == null ? h('span.phase-empty', 'not enough data yet') : h('span.phase-fill', { class: x.acc >= 85 ? 'good' : x.acc >= 72 ? 'mid' : 'bad', style: { width: `${Math.max(4, Math.min(100, x.acc))}%` } })), h('span.phase-val', x.acc == null ? '' : `${Math.round(x.acc)}%`));
  });
  return h('div.phase-meters', rows);
}
