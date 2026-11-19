// Interactive chessboard: tap-to-move + drag-and-drop, highlights, arrows, badges, animations, promotion picker.
import { h } from './ui.js';

const FILES = 'abcdefgh';

export class Board {
  /**
   * @param {HTMLElement} mount
   * @param {object} opts
   *   orientation: 'w'|'b'
   *   interactive: boolean
   *   canSelect(sq) -> bool       can the user pick up the piece on sq?
   *   legalTargets(sq) -> [{to, capture, promotion}]
   *   onMove({from,to,promotion}) -> bool|Promise<bool>   return false to reject
   *   coords: bool, legalDots: bool, autoQueen: bool, animate: bool
   */
  constructor(mount, opts = {}) {
    this.o = { orientation: 'w', interactive: true, coords: true, legalDots: true, autoQueen: false, animate: true, ...opts };
    this.orientation = this.o.orientation;
    this.pieces = {};
    this.selected = null;
    this.lastMove = null;
    this.checkSq = null;
    this.marks = {};
    this.badges = {};
    this.arrows = [];
    this.hints = {};
    this._drag = null;

    this.el = h('div.board');
    this.sqLayer = h('div.sq-layer');
    this.pieceLayer = h('div.piece-layer');
    this.dotLayer = h('div.dot-layer');
    this.arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.arrowSvg.setAttribute('class', 'arrow-layer');
    this.arrowSvg.setAttribute('viewBox', '0 0 8 8');
    this.badgeLayer = h('div.badge-layer');
    this.coordLayer = h('div.coord-layer');
    this.el.append(this.sqLayer, this.dotLayer, this.arrowSvg, this.pieceLayer, this.badgeLayer, this.coordLayer);
    this.ghost = h('div.piece.ghost');
    this.ghost.style.display = 'none';
    this.el.append(this.ghost);
    mount.append(this.el);

    this._buildSquares();
    this._bind();
    this.setCoords(this.o.coords !== false);
    this.el.dataset.theme = document.documentElement.dataset.board || 'classic';
  }

  /* ------------------------------------------------ geometry */
  _pos(sq) {
    let f = FILES.indexOf(sq[0]), r = +sq[1] - 1;
    if (this.orientation === 'w') return { x: f, y: 7 - r };
    return { x: 7 - f, y: r };
  }
  _sqAt(x, y) {
    let f, r;
    if (this.orientation === 'w') { f = x; r = 7 - y; } else { f = 7 - x; r = y; }
    return FILES[f] + (r + 1);
  }
  _sqFromEvent(e) {
    const rect = this.el.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * 8);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * 8);
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    return this._sqAt(x, y);
  }
  _place(el, sq) { const { x, y } = this._pos(sq); el.style.left = x * 12.5 + '%'; el.style.top = y * 12.5 + '%'; }

  _buildSquares() {
    this.sqLayer.replaceChildren();
    this.sqEls = {};
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const sq = FILES[f] + (r + 1);
      const el = h('div.sq', { class: (f + r) % 2 === 0 ? 'dark' : 'light' });
      el.dataset.sq = sq;
      this._place(el, sq);
      this.sqLayer.append(el);
      this.sqEls[sq] = el;
    }
  }

  /**
   * Coordinates: file letters (a-h) along the bottom edge, rank numbers (1-8) down the left edge. The colour of each
   * label is the colour of the OTHER square type so it is always readable (a1 is dark, so its label is light).
   */
  setCoords(on) {
    this.o.coords = on !== false;
    this.coordLayer.replaceChildren();
    if (!this.o.coords) return;
    for (let i = 0; i < 8; i++) {
      const fileSq = this._sqAt(i, 7), rankSq = this._sqAt(0, i);
      const dark = (sq) => (FILES.indexOf(sq[0]) + (+sq[1] - 1)) % 2 === 0;
      const f = h('span.coord.file', { class: dark(fileSq) ? 'on-dark' : 'on-light' }, fileSq[0]);
      f.style.left = i * 12.5 + '%'; f.style.top = '87.5%';
      const r = h('span.coord.rank', { class: dark(rankSq) ? 'on-dark' : 'on-light' }, rankSq[1]);
      r.style.top = i * 12.5 + '%'; r.style.left = '0';
      this.coordLayer.append(f, r);
    }
  }

  /** Square-picking mode for lessons: while set, taps report the square instead of moving pieces. */
  setSquareMode(fn) { this.squareMode = fn || null; if (!fn) { this.selected = null; } }

  /* ------------------------------------------------ rendering */
  /** @param fen position; @param opts {lastMove:{from,to}, animate:[{from,to}], check:sq} */
  setPosition(fen, opts = {}) {
    this.fen = fen;
    const rows = fen.split(' ')[0].split('/');
    const map = {};
    rows.forEach((row, i) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) f += +ch;
        else { map[FILES[f] + (8 - i)] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toLowerCase(); f++; }
      }
    });
    this.pieceMap = map;
    const prev = this.pieces;
    const next = {};
    const anims = (this.o.animate && opts.animate) ? opts.animate : [];
    // reuse pieces that stay put; create / remove others
    for (const sq of Object.keys(map)) {
      if (prev[sq] && prev[sq].dataset.p === map[sq]) { next[sq] = prev[sq]; delete prev[sq]; }
    }
    for (const sq of Object.keys(prev)) prev[sq].remove();
    for (const sq of Object.keys(map)) {
      if (next[sq]) continue;
      const el = h('div.piece', { class: 'p-' + map[sq] });
      el.dataset.p = map[sq]; el.dataset.sq = sq;
      this._place(el, sq);
      this.pieceLayer.append(el);
      next[sq] = el;
      const a = anims.find((x) => x.to === sq);
      if (a) this._slide(el, a.from, a.to);
    }
    this.pieces = next;
    this.lastMove = opts.lastMove || null;
    this.checkSq = opts.check || null;
    this.selected = null;
    this.hints = {};
    this._refresh();
  }

  _slide(el, from, to) {
    const a = this._pos(from), b = this._pos(to);
    el.style.transition = 'none';
    el.style.transform = `translate(${(a.x - b.x) * 100}%, ${(a.y - b.y) * 100}%)`;
    el.style.zIndex = 5;
    void el.offsetWidth;
    el.style.transition = 'transform .16s cubic-bezier(.3,.8,.4,1)';
    el.style.transform = 'translate(0,0)';
    setTimeout(() => { el.style.zIndex = ''; el.style.transition = ''; }, 200);
  }

  flip(v) {
    this.orientation = v || (this.orientation === 'w' ? 'b' : 'w');
    this._buildSquares();
    for (const sq of Object.keys(this.pieces)) this._place(this.pieces[sq], sq);
    this.setCoords(this.o.coords !== false);
    this._refresh();
  }

  _refresh() {
    for (const sq in this.sqEls) {
      const el = this.sqEls[sq];
      el.className = 'sq ' + (((FILES.indexOf(sq[0]) + (+sq[1] - 1)) % 2 === 0) ? 'dark' : 'light');
      if (this.lastMove && (sq === this.lastMove.from || sq === this.lastMove.to)) el.classList.add('last');
      if (this.selected === sq) el.classList.add('selected');
      if (this.checkSq === sq) el.classList.add('check');
      if (this.marks[sq]) el.classList.add('mark-' + this.marks[sq]);
      if (this.hints[sq]) el.classList.add('hint');
    }
    this.badgeLayer.replaceChildren();
    for (const [sq, b] of Object.entries(this.badges)) {
      const el = h('div.badge', { style: { background: b.color } }, b.text);
      const { x, y } = this._pos(sq);
      el.style.left = (x + 1) * 12.5 + '%'; el.style.top = y * 12.5 + '%';
      this.badgeLayer.append(el);
    }
    this._drawArrows();
  }

  /* ------------------------------------------------ overlays */
  setMarks(marks) { this.marks = marks || {}; this._refresh(); }          // {sq: 'good'|'bad'|'warn'}
  setBadges(badges) { this.badges = badges || {}; this._refresh(); }      // {sq: {text,color}}
  setHint(sqs) { this.hints = {}; (sqs || []).forEach((s) => { this.hints[s] = true; }); this._refresh(); }
  setArrows(arrows) { this.arrows = arrows || []; this._drawArrows(); }   // [{from,to,color,opacity}]
  clearOverlays() { this.marks = {}; this.badges = {}; this.arrows = []; this.hints = {}; this._refresh(); }
  setCheck(sq) { this.checkSq = sq; this._refresh(); }

  _drawArrows() {
    const svg = this.arrowSvg;
    svg.replaceChildren();
    const ns = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(ns, 'defs');
    const colors = new Set(this.arrows.map((a) => a.color || '#7fb855'));
    colors.forEach((c) => {
      const m = document.createElementNS(ns, 'marker');
      const id = 'ah' + c.replace('#', '');
      m.setAttribute('id', id); m.setAttribute('viewBox', '0 0 10 10'); m.setAttribute('refX', '6'); m.setAttribute('refY', '5');
      m.setAttribute('markerWidth', '3.2'); m.setAttribute('markerHeight', '3.2'); m.setAttribute('orient', 'auto');
      const p = document.createElementNS(ns, 'path'); p.setAttribute('d', 'M0,0 L10,5 L0,10 z'); p.setAttribute('fill', c);
      m.append(p); defs.append(m);
    });
    svg.append(defs);
    for (const a of this.arrows) {
      const c = a.color || '#7fb855';
      const f = this._pos(a.from), t = this._pos(a.to);
      let x1 = f.x + 0.5, y1 = f.y + 0.5, x2 = t.x + 0.5, y2 = t.y + 0.5;
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      const sh = 0.32; // shorten for arrow head
      x2 -= (dx / len) * sh; y2 -= (dy / len) * sh;
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('stroke', c); line.setAttribute('stroke-width', a.width || 0.16); line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('opacity', a.opacity || 0.85); line.setAttribute('marker-end', `url(#ah${c.replace('#', '')})`);
      svg.append(line);
    }
  }

  _showDots(sq) {
    this.dotLayer.replaceChildren();
    if (!sq || !this.o.legalDots || !this.o.legalTargets) return;
    for (const t of this.o.legalTargets(sq)) {
      if (t.hidden) continue;
      const d = h('div.dot', { class: t.capture ? 'cap' : '' });
      this._place(d, t.to);
      this.dotLayer.append(d);
    }
  }

  /* ------------------------------------------------ interaction */
  setInteractive(v) { this.o.interactive = v; if (!v) { this.selected = null; this.dotLayer.replaceChildren(); this._refresh(); } }

  _bind() {
    const el = this.el;
    el.addEventListener('pointerdown', (e) => this._down(e));
    window.addEventListener('pointermove', (e) => this._move(e));
    window.addEventListener('pointerup', (e) => this._up(e));
    window.addEventListener('pointercancel', () => this._cancelDrag());
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _down(e) {
    if (e.button > 0) return;
    if (this.squareMode) { const q = this._sqFromEvent(e); if (q) { e.preventDefault(); this.squareMode(q); } return; }
    if (!this.o.interactive) return;
    if (this.promoEl) return;
    const sq = this._sqFromEvent(e);
    if (!sq) return;
    const piece = this.pieceMap && this.pieceMap[sq];
    // second tap on a target square completes a move
    if (this.selected && this.selected !== sq) {
      const t = this.o.legalTargets && this.o.legalTargets(this.selected).find((x) => x.to === sq);
      if (t) { this._attempt(this.selected, sq, t); return; }
    }
    if (piece && this.o.canSelect && this.o.canSelect(sq)) {
      const wasSelected = this.selected === sq;
      this.selected = sq;
      this._showDots(sq);
      this._refresh();
      this._drag = { from: sq, startX: e.clientX, startY: e.clientY, moved: false, wasSelected, el: this.pieces[sq], pid: e.pointerId };
      e.preventDefault();
    } else {
      this.selected = null; this.dotLayer.replaceChildren(); this._refresh();
    }
  }

  _move(e) {
    const d = this._drag;
    if (!d) return;
    const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    if (!d.moved && dist > 6) {
      d.moved = true;
      d.el.classList.add('dragging');
      this.ghost.className = 'piece ghost p-' + this.pieceMap[d.from];
      this.ghost.style.display = 'block';
    }
    if (d.moved) {
      const rect = this.el.getBoundingClientRect();
      const size = rect.width / 8;
      this.ghost.style.width = size * 1.15 + 'px'; this.ghost.style.height = size * 1.15 + 'px';
      this.ghost.style.left = (e.clientX - rect.left - size * 0.575) + 'px';
      this.ghost.style.top = (e.clientY - rect.top - size * 0.7) + 'px';
      const over = this._sqFromEvent(e);
      for (const s in this.sqEls) this.sqEls[s].classList.toggle('over', s === over);
    }
  }

  _up(e) {
    const d = this._drag;
    if (!d) return;
    this._drag = null;
    d.el.classList.remove('dragging');
    this.ghost.style.display = 'none';
    for (const s in this.sqEls) this.sqEls[s].classList.remove('over');
    if (d.moved) {
      const to = this._sqFromEvent(e);
      if (to && to !== d.from) {
        const t = this.o.legalTargets && this.o.legalTargets(d.from).find((x) => x.to === to);
        if (t) { this._attempt(d.from, to, t); return; }
      }
      this.selected = null; this.dotLayer.replaceChildren(); this._refresh();
    } else if (d.wasSelected) {
      this.selected = null; this.dotLayer.replaceChildren(); this._refresh();
    }
  }
  _cancelDrag() { if (this._drag) { this._drag.el.classList.remove('dragging'); this._drag = null; this.ghost.style.display = 'none'; } }

  async _attempt(from, to, t) {
    let promotion;
    if (t.promotion) promotion = this.o.autoQueen ? 'q' : await this._askPromotion(to, this.pieceMap[from][0]);
    if (t.promotion && !promotion) { this.selected = null; this.dotLayer.replaceChildren(); this._refresh(); return; }
    this.selected = null; this.dotLayer.replaceChildren();
    let ok = true;
    if (this.o.onMove) ok = await this.o.onMove({ from, to, promotion });
    if (ok === false) { this._refresh(); this._shake(); }
  }

  _shake() { this.el.classList.remove('shake'); void this.el.offsetWidth; this.el.classList.add('shake'); }
  shake() { this._shake(); }

  _askPromotion(to, color) {
    return new Promise((resolve) => {
      const { x, y } = this._pos(to);
      const down = y === 0;       // menu grows away from the edge
      const menu = h('div.promo');
      const opts = ['q', 'n', 'r', 'b'];
      opts.forEach((p, i) => {
        const b = h('button.promo-btn', { 'aria-label': p, onclick: (ev) => { ev.stopPropagation(); close(p); } }, h('div.piece', { class: 'p-' + color + p }));
        b.style.left = x * 12.5 + '%';
        b.style.top = (down ? y + i : y - i) * 12.5 + '%';
        menu.append(b);
      });
      const shade = h('div.promo-shade', { onclick: () => close(null) });
      const close = (v) => { shade.remove(); menu.remove(); this.promoEl = null; resolve(v); };
      this.promoEl = menu;
      this.el.append(shade, menu);
    });
  }

  destroy() { this.el.remove(); }
}

/** Vertical evaluation bar. update(whitePct 0..100, label) */
export class EvalBar {
  constructor(flipped = false) {
    this.fill = h('div.eval-fill');
    this.label = h('span.eval-label', '0.0');
    this.el = h('div.eval-bar', this.fill, this.label);
    this.flipped = flipped;
    this.update(50, '0.0');
  }
  setFlipped(f) { this.flipped = f; this.el.classList.toggle('flipped', f); }
  update(whitePct, label) {
    this.fill.style.height = whitePct + '%';
    this.label.textContent = label;
    this.label.classList.toggle('top', whitePct < 50);
    this.el.classList.toggle('flipped', this.flipped);
  }
}
