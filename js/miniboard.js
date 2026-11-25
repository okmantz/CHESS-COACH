// A small, non-interactive board picture: used for the opening thumbnails, "what to look at" snapshots and puzzle previews.
// It reuses the real board's CSS (board theme colours and the chosen piece set), so thumbnails match the main board.
import { h } from './ui.js';

const FILES = 'abcdefgh';

/** FEN piece placement -> { 'e4': 'wp', ... } */
export function placement(fen) {
  const out = {};
  const rows = fen.split(' ')[0].split('/');
  rows.forEach((row, i) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { f += +ch; continue; }
      out[FILES[f] + (8 - i)] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toLowerCase();
      f++;
    }
  });
  return out;
}

/**
 * @param fen          position to draw
 * @param opts.orientation  'w' | 'b' (which side is at the bottom)
 * @param opts.from/to      optional last-move squares to tint
 * @param opts.marks        { square: 'good'|'bad'|'warn'|'info' } tinted squares
 * @param opts.arrows       [{from,to,color}] drawn as thin arrows
 * @param opts.size         CSS width (e.g. '96px'); omit to fill the parent
 */
export function miniBoard(fen, { orientation = 'w', from = null, to = null, marks = {}, arrows = [], size = null, label = '' } = {}) {
  const pos = placement(fen);
  const el = h('div.board.mini-board', { role: 'img', 'aria-label': label || 'Chess position' });
  if (size) el.style.width = size;
  const place = (node, sq) => {
    const f = FILES.indexOf(sq[0]), r = +sq[1] - 1;
    const x = orientation === 'w' ? f : 7 - f, y = orientation === 'w' ? 7 - r : r;
    node.style.left = x * 12.5 + '%'; node.style.top = y * 12.5 + '%';
  };
  const sqLayer = h('div.sq-layer'), pcLayer = h('div.piece-layer');
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const sq = FILES[f] + (r + 1);
    const cls = (f + r) % 2 === 0 ? 'dark' : 'light';
    const extra = marks[sq] ? ` mark-${marks[sq]}` : (sq === from || sq === to ? ' last' : '');
    const n = h('div.sq', { class: cls + extra }); place(n, sq); sqLayer.append(n);
  }
  for (const sq in pos) { const n = h('div.piece', { class: `p-${pos[sq]}` }); place(n, sq); pcLayer.append(n); }
  el.append(sqLayer, pcLayer);
  if (arrows.length) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'arrow-layer'); svg.setAttribute('viewBox', '0 0 8 8');
    const c = (sq) => { const f = FILES.indexOf(sq[0]), r = +sq[1] - 1; return [(orientation === 'w' ? f : 7 - f) + 0.5, (orientation === 'w' ? 7 - r : r) + 0.5]; };
    for (const a of arrows) {
      const [x1, y1] = c(a.from), [x2, y2] = c(a.to);
      const ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
      ln.setAttribute('stroke', a.color || '#5fc88f'); ln.setAttribute('stroke-width', '0.2'); ln.setAttribute('stroke-linecap', 'round'); ln.setAttribute('opacity', '0.85');
      svg.append(ln);
    }
    el.append(svg);
  }
  return el;
}
