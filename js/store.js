// Persistent "memory": profile, settings, rating, games, mistakes, puzzle stats, lesson progress.
// Everything lives in the browser's localStorage (no server). Export/Import JSON makes it portable.
import { START_RATING } from './rating.js';

const KEY = 'chesscoach.v1';
const listeners = new Set();
let state = null;
let saveTimer = null;
let memoryFallback = false;

export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export function defaults() {
  return {
    version: 1,
    created: Date.now(),
    onboarded: false,
    profile: { name: 'Player', avatar: { kind: 'portrait', value: 'knight' }, color: '#7c9cff', country: '', bio: '' },
    settings: {
      board: 'classic', theme: 'dark', coords: true, sound: true, highlights: true, legalDots: true, autoQueen: false,
      animations: true, analysisDepth: 'standard', defaultTime: 'unlimited', confirmResign: true, showEvalBar: true,
      pieceSet: 'classic', highlight: 'gold', boardFrame: 'soft', indicator: 'dot', textSize: 'm', reduceMotion: false, botChat: true,
      showArrows: true, coachVisuals: true,
    },
    rating: { value: START_RATING, games: 0, peak: START_RATING, history: [] },
    games: [],
    mistakes: [],
    puzzles: { rating: 800, solved: 0, attempts: 0, streak: 0, bestStreak: 0, themes: {}, seen: {}, rush: { best: 0, history: [] } },
    lessons: { openings: {}, endgames: {}, middlegames: {}, basics: {}, tactics: {}, strategy: {} },
    coachPlay: { games: 0, level: 0, mode: 'guided', habits: {}, lastFocus: null },
    ladder: { passed: 0, results: {} },
    crowns: {},
    plan: { date: null, items: [], streak: 0, lastCompleted: null },
    activity: {},
  };
}

function merge(base, extra) {
  for (const k of Object.keys(extra || {})) {
    if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], extra[k]);
    else base[k] = extra[k];
  }
  return base;
}

export function load() {
  if (state) return state;
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { memoryFallback = true; }
  state = defaults();
  if (raw) { try { merge(state, JSON.parse(raw)); } catch (e) { console.warn('Could not parse saved data', e); } }
  // one-time migration: board coordinates (a-h, 1-8) are always shown unless the player switches them off again
  if (state.settings.coordsV2 !== true) { state.settings.coords = true; state.settings.coordsV2 = true; }
  // migration: emoji avatars (v1) become portrait / emblem avatars
  const av = state.profile && state.profile.avatar;
  if (av && av.kind === 'emoji') {
    const map = { '♞': ['portrait', 'knight'], '🦁': ['portrait', 'king'], '🐺': ['portrait', 'wolf'], '♜': ['emblem', 'rook:ember'], '♝': ['emblem', 'bishop:forest'], '♛': ['emblem', 'queen:violet'], '♚': ['emblem', 'king:gold'], '♟': ['emblem', 'pawn:steel'] };
    const m = map[av.value] || ['emblem', 'knight:ocean'];
    state.profile.avatar = { kind: m[0], value: m[1] };
  }
  return state;
}

export const get = () => load();

function persist() {
  saveTimer = null;
  if (memoryFallback) return;
  const write = () => localStorage.setItem(KEY, JSON.stringify(state));
  try { write(); } catch (e) {
    // quota: strip stored reviews from the oldest games until it fits
    for (const g of [...state.games].reverse()) {
      if (g.review) { delete g.review; try { write(); return; } catch (er) { /* keep trimming */ } }
    }
    try { state.mistakes = state.mistakes.slice(-300); write(); } catch (er) { console.warn('Storage full', er); memoryFallback = true; }
  }
}

export function update(fn) {
  load();
  fn(state);
  if (!saveTimer) saveTimer = setTimeout(persist, 250);
  listeners.forEach((l) => l(state));
}
export function flush() { if (saveTimer) { clearTimeout(saveTimer); persist(); } }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
if (typeof window !== 'undefined') window.addEventListener('pagehide', flush);

export function logActivity(kind, n = 1) {
  update((s) => { const d = today(); s.activity[d] = s.activity[d] || { games: 0, puzzles: 0, lessons: 0, reviews: 0 }; s.activity[d][kind] = (s.activity[d][kind] || 0) + n; });
}

export function exportJson() { load(); return JSON.stringify(state, null, 1); }
export function importJson(text, { replace = true } = {}) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || !data.profile) throw new Error('That file is not a Chess Coach backup.');
  update((s) => {
    if (replace) { const d = defaults(); merge(d, data); Object.keys(s).forEach((k) => delete s[k]); Object.assign(s, d); } else {
      const ids = new Set(s.games.map((g) => g.id));
      for (const g of data.games || []) if (!ids.has(g.id)) s.games.push(g);
      const mids = new Set(s.mistakes.map((m) => m.id));
      for (const m of data.mistakes || []) if (!mids.has(m.id)) s.mistakes.push(m);
    }
  });
  flush();
}
export function resetAll() { update((s) => { const d = defaults(); Object.keys(s).forEach((k) => delete s[k]); Object.assign(s, d); }); flush(); }

/* ---------- helpers used across pages ---------- */

export function saveGame(g) {
  update((s) => {
    g.id = g.id || uid();
    g.date = g.date || Date.now();
    const i = s.games.findIndex((x) => x.id === g.id);
    if (i >= 0) s.games[i] = { ...s.games[i], ...g }; else s.games.unshift(g);
    if (s.games.length > 300) s.games.length = 300;
  });
  flush();
  return g.id;
}
export const getGame = (id) => load().games.find((g) => g.id === id);
export function deleteGame(id) { update((s) => { s.games = s.games.filter((g) => g.id !== id); s.mistakes = s.mistakes.filter((m) => m.gameId !== id); }); flush(); }

/** Replace the mistakes belonging to a game with freshly extracted ones. */
export function setGameMistakes(gameId, list) {
  update((s) => {
    s.mistakes = s.mistakes.filter((m) => m.gameId !== gameId);
    for (const m of list) s.mistakes.push({ id: uid(), gameId, box: 0, due: 0, seen: 0, solved: 0, date: Date.now(), ...m });
    if (s.mistakes.length > 600) s.mistakes = s.mistakes.slice(-600);
  });
  flush();
}

export function recordPuzzle(theme, solved, puzzleId, puzzleRating) {
  update((s) => {
    const p = s.puzzles;
    p.attempts++; if (solved) { p.solved++; p.streak++; p.bestStreak = Math.max(p.bestStreak, p.streak); } else p.streak = 0;
    const themes = Array.isArray(theme) ? theme : [theme];
    for (const th of themes) { const t = p.themes[th] || (p.themes[th] = { attempts: 0, solved: 0 }); t.attempts++; if (solved) t.solved++; }
    // Elo-style puzzle rating
    const exp = 1 / (1 + Math.pow(10, ((puzzleRating || p.rating) - p.rating) / 400));
    p.rating = Math.max(400, Math.round(p.rating + 24 * ((solved ? 1 : 0) - exp)));
    if (puzzleId) p.seen[puzzleId] = { ok: solved ? 1 : 0, t: Date.now() };
  });
  logActivity('puzzles');
}
