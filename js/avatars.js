// Avatar catalogue: the ten opponents, the coach, character & animal portraits, and generated piece "emblems".
// Portrait images live in assets/avatars/ (256x256 webp). To use higher-resolution art, replace the files with the same names.
import { h } from './ui.js';

export const PORTRAITS = [
  { id: 'coach', name: 'Coach', group: 'Characters' },
  { id: 'bot-01', name: 'Sam', group: 'Characters' },
  { id: 'bot-02', name: 'Maya', group: 'Characters' },
  { id: 'bot-03', name: 'Ethan', group: 'Characters' },
  { id: 'bot-04', name: 'Jake', group: 'Characters' },
  { id: 'bot-05', name: 'Sofia', group: 'Characters' },
  { id: 'bot-06', name: 'Marcus', group: 'Characters' },
  { id: 'bot-07', name: 'Elena', group: 'Characters' },
  { id: 'bot-08', name: 'Daniel', group: 'Characters' },
  { id: 'bot-09', name: 'Kai', group: 'Characters' },
  { id: 'bot-10', name: 'Viktor', group: 'Characters' },
  { id: 'anonymous', name: 'Anonymous', group: 'Mascots' },
  { id: 'king', name: 'King', group: 'Mascots' },
  { id: 'wolf', name: 'Wolf', group: 'Mascots' },
  { id: 'panda', name: 'Panda', group: 'Mascots' },
  { id: 'cat', name: 'Cat', group: 'Mascots' },
  { id: 'knight', name: 'Knight', group: 'Mascots' },
];
export const portraitSrc = (id) => `assets/avatars/${id}.webp`;

// Emblems: a piece on a gradient badge.
const EMBLEM_PALETTES = {
  ocean: ['#38bdf8', '#1d4ed8'], ember: ['#fb923c', '#b91c1c'], forest: ['#4ade80', '#0f766e'], violet: ['#c084fc', '#4c1d95'],
  gold: ['#fcd34d', '#b45309'], steel: ['#94a3b8', '#334155'], rose: ['#f9a8d4', '#9d174d'], night: ['#6366f1', '#0f172a'],
};
export const EMBLEMS = [
  ['knight', 'ocean'], ['rook', 'ember'], ['bishop', 'forest'], ['queen', 'violet'], ['king', 'gold'], ['pawn', 'steel'],
  ['knight', 'night'], ['queen', 'rose'], ['rook', 'steel'], ['bishop', 'violet'], ['king', 'ember'], ['pawn', 'ocean'],
].map(([piece, pal]) => ({ id: `${piece}:${pal}`, name: `${piece[0].toUpperCase()}${piece.slice(1)}`, piece, pal, group: 'Emblems' }));

export const DEFAULT_AVATAR = { kind: 'portrait', value: 'knight' };

/** Normalise any stored avatar (new portrait / emblem / photo, or the legacy emoji object). */
export function normAvatar(a) { return a && a.kind ? a : DEFAULT_AVATAR; }

/**
 * Round avatar element. `a` = profile.avatar ({kind:'portrait'|'emblem'|'image'|'emoji', value}).
 * opts: { ring: css colour for a coloured ring, square: rounded-square instead of circle, color: legacy emoji bg }
 */
export function avatarEl(a, size = 40, { ring = null, square = false, color = null } = {}) {
  a = normAvatar(a);
  const el = h('div.avatar.av', { style: { width: size + 'px', height: size + 'px', borderRadius: square ? Math.round(size * 0.24) + 'px' : '50%' } });
  if (ring) el.style.boxShadow = `0 0 0 2px ${ring}, 0 0 ${Math.round(size / 4)}px ${ring}55`;
  if (a.kind === 'portrait') {
    el.append(h('img', { src: portraitSrc(a.value), alt: '', draggable: false, loading: 'lazy' }));
  } else if (a.kind === 'emblem') {
    const [piece, pal] = String(a.value).split(':');
    const [c1, c2] = EMBLEM_PALETTES[pal] || EMBLEM_PALETTES.ocean;
    el.style.background = `radial-gradient(circle at 30% 25%, ${c1}, ${c2})`;
    el.append(h('div.emblem-piece', { style: { backgroundImage: `url(assets/pieces/w${piece === 'knight' ? 'n' : piece[0]}.svg)` } }));
  } else if (a.kind === 'image') {
    el.style.backgroundImage = `url(${a.value})`; el.style.backgroundSize = 'cover';
  } else {
    el.style.background = color || 'var(--accent)'; el.style.fontSize = size * 0.55 + 'px'; el.textContent = a.value || '♞';
  }
  return el;
}

export const sameAvatar = (a, b) => a && b && a.kind === b.kind && a.value === b.value;

/**
 * Avatar chooser: grouped grid of portraits and emblems (+ optional photo upload). `onPick(avatarObject)` is called on selection;
 * the grid re-renders itself so the checkmark follows the choice. Returns an element.
 */
export function avatarPicker(current, onPick, { photo = null } = {}) {
  let cur = normAvatar(current);
  const root = h('div');
  const groups = [['Characters', PORTRAITS.filter((p) => p.group === 'Characters').map((p) => ({ kind: 'portrait', value: p.id, name: p.name }))],
    ['Mascots', PORTRAITS.filter((p) => p.group === 'Mascots').map((p) => ({ kind: 'portrait', value: p.id, name: p.name }))],
    ['Emblems', EMBLEMS.map((e) => ({ kind: 'emblem', value: e.id, name: e.name }))]];
  const draw = () => {
    root.replaceChildren(...groups.flatMap(([label, list]) => [
      h('div.group-label', label),
      h('div.avatar-pick', list.map((a) => h('button', { class: sameAvatar(a, cur) ? 'active' : '', 'aria-label': a.name, 'aria-pressed': String(sameAvatar(a, cur)), onclick: () => { cur = { kind: a.kind, value: a.value }; draw(); onPick(cur); } }, avatarEl(a, 64, { square: true }), h('small', a.name)))),
    ]), photo ? h('div.row.mt', photo(() => { cur = null; draw(); })) : null);
  };
  draw();
  root.setCurrent = (a) => { cur = a; draw(); };
  return root;
}
