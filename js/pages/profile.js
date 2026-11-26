import * as store from '../store.js';
import { h, icon, toast, avatar, confirmDialog, download, pickFile, readFile, pageHead } from '../ui.js';
import { rankOf } from '../rating.js';
import { Board } from '../board.js';
import { avatarPicker } from '../avatars.js';
import { BOARDS, PIECE_SETS, HIGHLIGHTS, ACCENTS, THEMES, TEXT_SIZES, FRAMES, INDICATORS } from '../skins.js';

const DEPTH = [['quick', 'Quick'], ['standard', 'Standard'], ['deep', 'Deep']];
const PREVIEW_FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5';

export default async function profilePage(view, ctx) {
  const root = h('div.page');
  view.replaceChildren(root);
  const draw = () => {
    const s = store.get();
    const set = (fn) => { store.update(fn); store.flush(); draw(); };
    const toggle = (key, title, sub) => h('div.setting', h('div', h('div.s-title', title), sub ? h('div.s-sub', sub) : null), h('label.switch', h('input', { type: 'checkbox', checked: !!s.settings[key], onchange: (e) => set((st) => { st.settings[key] = e.target.checked; }) }), h('i')));
    const rk = rankOf(s.rating.value);
    const wins = s.games.filter((g) => g.outcome === 'win').length, losses = s.games.filter((g) => g.outcome === 'loss').length, draws = s.games.filter((g) => g.outcome === 'draw').length;
    const nameIn = h('input', { type: 'text', value: s.profile.name, maxlength: 24, onchange: (e) => { store.update((st) => { st.profile.name = e.target.value.trim() || 'Player'; }); store.flush(); toast('Saved', 'good'); } });
    const bioIn = h('input', { type: 'text', value: s.profile.bio || '', maxlength: 80, placeholder: 'A line about you (optional)', onchange: (e) => { store.update((st) => { st.profile.bio = e.target.value; }); store.flush(); } });
    root.replaceChildren(
      pageHead('Profile', { eyebrow: 'You', sub: 'Your avatar, boards, pieces and preferences.' }),
      h('div.grid.g2',
        h('div.col',
          h('div.card', h('div.row.nowrapr', avatar(s.profile, 64), h('div.grow', h('h2', { style: { margin: 0 } }, s.profile.name), h('div.muted', `${Math.round(s.rating.value)} · ${rk.name}`), h('div.xs.faint', `${wins}W ${draws}D ${losses}L · puzzle rating ${s.puzzles.rating}`))),
            h('div.mt', h('label.field', 'Display name'), nameIn), h('div.mt', h('label.field', 'About'), bioIn)),
          h('div.card', h('div.card-title', 'Avatar'),
            avatarPicker(s.profile.avatar, (av) => set((st) => { st.profile.avatar = av; }), { photo: () => h('button.btn.small', { onclick: () => uploadPhoto(set) }, icon('upload', 14), 'Upload your own photo') }),
            h('div.mt', h('label.field', 'Accent colour'), h('div.swatches', ACCENTS.map((c) => h('button', { class: s.profile.color === c ? 'active' : '', style: { background: c }, 'aria-label': c, onclick: () => set((st) => { st.profile.color = c; }) })),
              h('label.swatch-custom', { title: 'Custom colour' }, h('input', { type: 'color', value: s.profile.color || '#7c9cff', onchange: (e) => set((st) => { st.profile.color = e.target.value; }) }), icon('plus', 14))))),
          h('div.card', h('div.card-title', 'Rating'), h('div.kv', h('span', 'Current'), h('b', String(Math.round(s.rating.value)))), h('div.kv', h('span', 'Peak'), h('b', String(Math.round(s.rating.peak)))), h('div.kv', h('span', 'Rated games'), h('b', String(s.rating.games))),
            h('button.btn.small.mt', { onclick: async () => { if (await confirmDialog('Reset your rating to 600 and start over? Your games are kept.', { ok: 'Reset rating', danger: true })) set((st) => { st.rating = { value: 600, games: 0, peak: 600, history: [] }; }); } }, 'Reset rating'))),
        h('div.col',
          h('div.card', h('div.card-title', 'Live preview'), previewBoard(s.settings)),
          h('div.card', h('div.card-title', 'Appearance'),
            segRow('Theme', THEMES.map((t) => [t.id, t.name]), s.settings.theme, 'theme', set),
            segRow('Text size', TEXT_SIZES, s.settings.textSize || 'm', 'textSize', set),
            toggle('reduceMotion', 'Reduce motion', 'Calmer animations'),
            h('div.mt', h('label.field', 'Board colours'), h('div.theme-grid', BOARDS.map((b) => h('button.theme-card', { class: b.id === s.settings.board ? 'active' : '', 'aria-label': b.name, onclick: () => set((st) => { st.settings.board = b.id; }) }, h('div.board-preview.board', { dataset: { theme: b.id } }, ...[...Array(16).keys()].map((i) => h('i', { style: { background: ((i >> 2) + i) % 2 ? 'var(--dk)' : 'var(--lt)' } }))), h('b', { style: { marginTop: '6px' } }, b.name)))))),
          h('div.card', h('div.card-title', 'Pieces'), h('div.piece-grid', PIECE_SETS.map((p) => h('button.piece-card', { class: (s.settings.pieceSet || 'classic') === p.id ? 'active' : '', onclick: () => set((st) => { st.settings.pieceSet = p.id; }) }, h('div.piece-row', ['wn', 'bq', 'wk'].map((c) => h('img', { src: `${p.path}/${c}.svg`, alt: '', width: 34, height: 34 }))), h('b', p.name), h('span.xs.muted', p.note)))),
            h('div.mt', h('label.field', 'Highlight colour'), h('div.swatches', HIGHLIGHTS.map((x) => h('button', { class: (s.settings.highlight || 'gold') === x.id ? 'active' : '', style: { background: x.swatch }, 'aria-label': x.name, onclick: () => set((st) => { st.settings.highlight = x.id; }) })))),
            segRow('Move hints', INDICATORS, s.settings.indicator || 'dot', 'indicator', set),
            segRow('Board frame', FRAMES, s.settings.boardFrame || 'soft', 'boardFrame', set)),
          h('div.card', h('div.card-title', 'Gameplay'), toggle('sound', 'Sound effects'), toggle('coords', 'Board coordinates'), toggle('legalDots', 'Show legal moves'), toggle('animations', 'Piece animation'), toggle('autoQueen', 'Auto-queen promotions'), toggle('confirmResign', 'Confirm before resigning'), toggle('botChat', 'Opponent speech bubbles', 'Opponents comment on the game'),
            h('div.setting', h('div', h('div.s-title', 'Analysis depth'), h('div.s-sub', 'Default for game review')), h('div.seg', DEPTH.map(([k, l]) => h('button', { class: s.settings.analysisDepth === k ? 'active' : '', onclick: () => set((st) => { st.settings.analysisDepth = k; }) }, l))))),
          h('div.card', h('div.card-title', 'Your data'), h('p.small.muted', 'Everything is saved on this device. Export a backup to move to another phone or computer.'),
            h('div.row', h('button.btn', { onclick: () => download(`chess-coach-backup-${store.today()}.json`, store.exportJson(), 'application/json') }, icon('download', 16), 'Export'),
              h('button.btn', { onclick: async () => { const f = await pickFile('.json'); if (!f) return; try { store.importJson(await readFile(f)); toast('Backup restored', 'good'); draw(); } catch (e) { toast('That file is not a Chess Coach backup', 'bad'); } } }, icon('upload', 16), 'Import'),
              h('button.btn.danger', { onclick: async () => { if (await confirmDialog('Erase ALL games, ratings and progress on this device?', { ok: 'Erase everything', danger: true })) { store.resetAll(); toast('Everything erased'); location.hash = '#/'; location.reload(); } } }, icon('trash', 16), 'Erase'))),
          h('div.card', h('div.card-title', 'Install as an app'), ctx.app.installed ? h('p.small.muted', 'Chess Coach is installed on this device. ✓') : h('div', h('p.small.muted', 'Add it to your home screen for a full-screen, offline-ready app.'), h('button.btn.primary', { onclick: async () => { if (!(await ctx.app.install())) toast('iPhone/iPad: tap Share → Add to Home Screen. Android/desktop: use the browser menu → Install app.'); } }, icon('download', 16), 'Install'))),
          h('div.card.small.muted', h('b', 'Credits'), h('div', 'Engine: Stockfish (GPL-3.0) via Stockfish.js WASM build. Rules: chess.js (BSD). Pieces: cburnett (CC BY-SA 3.0). The coach is rule-based and powered by Stockfish evaluations — it is not a language model.')))));
  };
  draw();
}

function segRow(title, opts, cur, key, set) {
  return h('div.setting', h('div.s-title', title), h('div.seg', opts.map(([k, l]) => h('button', { class: cur === k ? 'active' : '', onclick: () => set((st) => { st.settings[key] = k; }) }, l))));
}
function previewBoard(settings) {
  const box = h('div.preview-wrap');
  const b = new Board(h('div'), { orientation: 'w', coords: settings.coords, legalDots: false, interactive: false, animate: false });
  box.append(b.el);
  b.setPosition(PREVIEW_FEN, { animate: false, lastMove: { from: 'g1', to: 'f3' } });
  return box;
}
function uploadPhoto(set) {
  return pickFile('image/*').then((f) => {
    if (!f) return;
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'); const m = Math.min(img.width, img.height); x.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 160, 160); set((st) => { st.profile.avatar = { kind: 'image', value: c.toDataURL('image/jpeg', 0.82) }; }); };
    img.src = URL.createObjectURL(f);
  });
}
