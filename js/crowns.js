// Crowns: a small reward for beating a computer opponent cleanly. They sit next to the opponent's avatar once you have played them.
//
//   win with no hints and no takebacks ........ 3 crowns
//   win with exactly 1 hint or takeback ........ 2 crowns
//   win with more than 1 hint / takeback ....... 1 crown
//   draw or loss ............................... no crowns
//
// A "hint" is counted once per position you asked about (pressing Hint again on the same move for a stronger clue is still one hint).
// Every takeback counts. In Play-with-Coach, taking back a move after the blunder check counts as a takeback too — set
// COUNT_BLUNDER_CHECK_RETRIES to false to let the coach's own "Take it back" prompt be free.
import { h } from './ui.js';
import * as store from './store.js';

export const COUNT_BLUNDER_CHECK_RETRIES = true;
export const BOT_SOURCES = ['play', 'coach-play'];

/** Crowns earned by one finished game. */
export function crownsFor({ outcome, hints = 0, takebacks = 0 } = {}) {
  if (outcome !== 'win') return 0;
  const assists = Math.max(0, hints | 0) + Math.max(0, takebacks | 0);
  return assists === 0 ? 3 : assists === 1 ? 2 : 1;
}

/** Crowns for a saved game record. Older records (before crowns existed) get what can be proven: a rated win used no help at all. */
export function crownsOfGame(g) {
  if (!g || !BOT_SOURCES.includes(g.source) || g.outcome !== 'win') return 0;
  if (typeof g.crowns === 'number') return g.crowns;
  if (g.source === 'play' && g.rated) return 3;
  return 1;
}

/** {played, best} for one opponent level (1-10), from the permanent record plus any games still in the library. */
export function crownInfo(level) {
  const s = store.get();
  const saved = (s.crowns && s.crowns[level]) || null;
  let played = !!saved, best = saved ? saved.best || 0 : 0;
  for (const g of s.games) {
    if (!BOT_SOURCES.includes(g.source) || g.level !== level) continue;
    played = true;
    best = Math.max(best, crownsOfGame(g));
  }
  return { played, best };
}

/** Remember the result of a finished bot game (the library keeps only the newest 300 games; this record is permanent). */
export function recordCrowns(level, earned) {
  store.update((s) => {
    s.crowns = s.crowns || {};
    const cur = s.crowns[level] || { best: 0 };
    s.crowns[level] = { best: Math.max(cur.best || 0, earned), played: true };
  });
}

const CROWN_PATH = 'M3 8.2l4.6 3.6L12 4.6l4.4 7.2L21 8.2l-1.7 10H4.7L3 8.2zM5 20.2h14v1.6H5z';
const crownSvg = (px) => `<svg viewBox="0 0 24 24" width="${px}" height="${px}" aria-hidden="true"><path d="${CROWN_PATH}"/></svg>`;

/** Three small crowns; the first `n` are lit. */
export function crownRow(n, { size = 12 } = {}) {
  const el = h('span.crowns', { role: 'img', 'aria-label': `${n} of 3 crowns`, title: `${n} of 3 crowns`, dataset: { n: String(n) } });
  for (let i = 0; i < 3; i++) el.append(h('span.crown', { class: i < n ? 'on' : '', html: crownSvg(size) }));
  return el;
}

/**
 * Wrap an opponent's avatar so a little crown pill sits on its lower edge — but only once that opponent has been played.
 * Before the first game the avatar is returned untouched.
 */
export function withCrowns(avatarNode, level, { size = 11 } = {}) {
  const info = crownInfo(level);
  if (!info.played) return avatarNode;
  const pill = h('span.crown-pill', { class: info.best ? 'earned' : '' }, crownRow(info.best, { size }));
  return h('span.crown-wrap', avatarNode, pill);
}

/** Large celebratory row for a result screen. */
export function crownBanner(n) {
  const row = crownRow(n, { size: 30 });
  row.classList.add('big');
  return h('div.crown-banner', row, h('div.xs.muted', n === 3 ? 'Flawless: no hints, no takebacks' : n === 2 ? 'One hint or takeback used' : n === 1 ? 'Won with some help' : 'Win a game to earn crowns'));
}
