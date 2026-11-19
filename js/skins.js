// Board themes, piece sets, highlight colours, accent colours — the "look" of the app. Everything is data so the profile page,
// onboarding and the CSS all agree. Applying a skin only sets attributes / one <style> element; no page reload is needed.

export const BOARDS = [
  { id: 'classic', name: 'Classic', lt: '#f0d9b5', dk: '#b58863' },
  { id: 'walnut', name: 'Walnut', lt: '#e9cfa6', dk: '#8a5a3b', wood: true },
  { id: 'tournament', name: 'Tournament', lt: '#f3f1d3', dk: '#6f9a58' },
  { id: 'green', name: 'Forest', lt: '#ebecd0', dk: '#739552' },
  { id: 'emerald', name: 'Emerald', lt: '#cfe6d6', dk: '#2f7357' },
  { id: 'ocean', name: 'Ocean', lt: '#d9ecf2', dk: '#4f93b0' },
  { id: 'blue', name: 'Mist', lt: '#dee3e6', dk: '#8ca2ad' },
  { id: 'ice', name: 'Ice', lt: '#eaf4fb', dk: '#7ca7c9' },
  { id: 'slate', name: 'Slate', lt: '#c8d1dd', dk: '#5b6c84' },
  { id: 'midnight', name: 'Midnight', lt: '#8d9ac0', dk: '#2c3866' },
  { id: 'purple', name: 'Amethyst', lt: '#e7dff2', dk: '#8b6fb5' },
  { id: 'rose', name: 'Rose', lt: '#f7e4ea', dk: '#c06c84' },
  { id: 'coral', name: 'Coral', lt: '#ffe8d8', dk: '#e07a5f' },
  { id: 'sand', name: 'Sand', lt: '#f2e6c9', dk: '#c2a56b' },
  { id: 'mono', name: 'Graphite', lt: '#e6e6e6', dk: '#6d6d72' },
  { id: 'neon', name: 'Neon night', lt: '#2b3558', dk: '#161c36', glow: true },
];
export const boardById = (id) => BOARDS.find((b) => b.id === id) || BOARDS[0];

export const PIECE_SETS = [
  { id: 'classic', name: 'Classic', note: 'The timeless Staunton look', path: 'assets/pieces' },
  { id: 'midnight', name: 'Midnight', note: 'Ice white and deep blue', path: 'assets/pieces/midnight' },
  { id: 'royal', name: 'Royal', note: 'Gold and burgundy', path: 'assets/pieces/royal' },
  { id: 'emerald', name: 'Emerald', note: 'Ivory and jade', path: 'assets/pieces/emerald' },
  { id: 'steel', name: 'Steel', note: 'Silver and gunmetal', path: 'assets/pieces/steel' },
  { id: 'ember', name: 'Ember', note: 'Cream and burnt orange', path: 'assets/pieces/ember' },
  { id: 'neon', name: 'Neon', note: 'Cyan versus magenta', path: 'assets/pieces/neon' },
];
export const pieceSetById = (id) => PIECE_SETS.find((p) => p.id === id) || PIECE_SETS[0];

export const HIGHLIGHTS = [
  { id: 'gold', name: 'Gold', last: 'rgba(255, 221, 60, .45)', sel: 'rgba(255, 221, 60, .65)', swatch: '#ffdd3c' },
  { id: 'lime', name: 'Lime', last: 'rgba(155, 220, 70, .5)', sel: 'rgba(155, 220, 70, .7)', swatch: '#9bdc46' },
  { id: 'sky', name: 'Sky', last: 'rgba(80, 175, 255, .45)', sel: 'rgba(80, 175, 255, .65)', swatch: '#50afff' },
  { id: 'pink', name: 'Pink', last: 'rgba(255, 105, 180, .45)', sel: 'rgba(255, 105, 180, .65)', swatch: '#ff69b4' },
  { id: 'orange', name: 'Orange', last: 'rgba(255, 150, 40, .5)', sel: 'rgba(255, 150, 40, .7)', swatch: '#ff9628' },
];
export const highlightById = (id) => HIGHLIGHTS.find((x) => x.id === id) || HIGHLIGHTS[0];

export const ACCENTS = ['#7c9cff', '#38bdf8', '#2dd4bf', '#5fc88f', '#a3e635', '#f2b84b', '#fb923c', '#ef6b6b', '#f472b6', '#c084fc', '#a78bfa', '#94a3b8'];

export const THEMES = [
  { id: 'dark', name: 'Dark' },
  { id: 'amoled', name: 'Black' },
  { id: 'light', name: 'Light' },
];
export const TEXT_SIZES = [['s', 'Small'], ['m', 'Default'], ['l', 'Large']];
export const FRAMES = [['none', 'None'], ['soft', 'Soft'], ['accent', 'Accent']];
export const INDICATORS = [['dot', 'Dots'], ['ring', 'Rings']];

/** Apply every skin-related setting to the document. Cheap; safe to call on every store update. */
export function applySkins(settings, profile) {
  const root = document.documentElement;
  const theme = settings.theme === 'light' ? 'light' : settings.theme === 'amoled' ? 'amoled' : 'dark';
  root.dataset.theme = theme;
  root.dataset.board = boardById(settings.board).id;
  root.dataset.pieces = pieceSetById(settings.pieceSet).id;
  root.dataset.frame = settings.boardFrame || 'soft';
  root.dataset.indicator = settings.indicator || 'dot';
  root.dataset.text = settings.textSize || 'm';
  root.dataset.motion = settings.reduceMotion ? 'reduce' : 'full';
  const hl = highlightById(settings.highlight);
  root.style.setProperty('--hl-last', hl.last);
  root.style.setProperty('--hl-sel', hl.sel);

  let st = document.getElementById('piece-set-css');
  if (!st) { st = document.createElement('style'); st.id = 'piece-set-css'; document.head.append(st); }
  const set = pieceSetById(settings.pieceSet);
  const css = ['w', 'b'].flatMap((c) => ['p', 'n', 'b', 'r', 'q', 'k'].map((k) => `.p-${c}${k}{background-image:url(${set.path}/${c}${k}.svg)}`)).join('');
  if (st.textContent !== css) st.textContent = css;
}
