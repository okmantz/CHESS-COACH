import * as store from '../store.js';
import { h, icon, toast, confirmDialog, download, pickFile, readFile } from '../ui.js';
import { gameRow } from './analyze.js';
import { emptyState } from '../components.js';
import { parseGame, buildPgn } from '../analysis.js';
import { splitPgn } from '../chessutil.js';

export default async function gamesPage(view, ctx) {
  let filter = 'all';
  const root = h('div.page');
  view.replaceChildren(root);
  const draw = () => {
    const s = store.get();
    const list = s.games.filter((g) => filter === 'all' || (filter === 'play' && (g.source === 'play' || g.source === 'twoplayer')) || (filter === 'import' && g.source !== 'play' && g.source !== 'twoplayer') || (filter === 'analyzed' && g.review));
    root.replaceChildren(
      h('div.page-head', h('h1', 'My games'), h('div.grow'),
        h('button.btn', { onclick: async () => { const f = await pickFile('.pgn,.txt'); if (!f) return; const t = await readFile(f); const parts = t.includes('[Event ') ? splitPgn(t) : [t]; let ok = 0; for (const p of parts) { try { const g = parseGame(p); store.saveGame({ source: 'import', color: 'none', sans: g.sans, startFen: g.startFen, headers: g.headers, result: g.result, moves: g.sans.length, pgn: p }); ok++; } catch (e) { /* skip */ } } toast(`Imported ${ok} game${ok === 1 ? '' : 's'}`, ok ? 'good' : 'bad'); draw(); } }, icon('upload', 16), 'Import PGN'),
        s.games.length ? h('button.btn', { onclick: () => download('chess-coach-games.pgn', s.games.map((g) => g.pgn).filter(Boolean).join('\n\n')) }, icon('download', 16), 'Export all') : null),
      h('div.row.mb', [['all', 'All'], ['play', 'Played'], ['import', 'Imported'], ['analyzed', 'Analyzed']].map(([k, l]) => h('button.chip', { class: filter === k ? 'active' : '', onclick: () => { filter = k; draw(); } }, l))),
      list.length ? h('div.grid.g2', list.map((g) => h('div.card.col', gameRow(g, () => ctx.navigate(`#/analyze?game=${g.id}`)),
        h('div.row.end', h('button.btn.small.ghost', { onclick: () => { download(`game-${g.id}.pgn`, g.pgn || ''); } }, icon('download', 14), 'PGN'),
          h('button.btn.small.ghost', { onclick: async () => { if (await confirmDialog('Delete this game and the mistakes extracted from it?', { ok: 'Delete', danger: true })) { store.deleteGame(g.id); draw(); } } }, icon('trash', 14), 'Delete'))))) :
        emptyState('list', 'No games here yet', 'Play the computer or import a PGN to build your library.', h('a.btn.primary', { href: '#/play' }, 'Play a game')));
  };
  draw();
}
