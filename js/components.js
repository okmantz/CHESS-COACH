// Shared UI building blocks for game-like pages.
import { h, icon, fmtTime } from './ui.js';
import { CLASSES, fmtEval, winPct, expandEval } from './analysis.js';
import { capturedFromFen } from './chessutil.js';
import { TAGS, THEME_LABELS } from './coach.js';
import { navigate } from './app.js';

export function pieceImg(code, cls = '') { return h('div.piece', { class: `p-${code} ${cls}` }); }

/** Player bar with name/rating/captured/clock. Returns {el, setClock, setCaptured, setActive}. */
export function playerBar({ name, rating, avatarEl, color }) {
  const cap = h('div.captured');
  const clock = h('div.clock.hidden', '--:--');
  const el = h('div.player-bar', avatarEl, h('div', h('div.pname', name, rating ? h('span.prate', `(${rating})`) : null), cap), clock);
  return {
    el,
    setCaptured(fen) {
      const { lostBy, adv } = capturedFromFen(fen);
      const enemy = color === 'w' ? 'b' : 'w';
      // pieces *this* player captured = pieces the enemy lost
      const mine = lostBy[enemy];
      cap.replaceChildren(...mine.map((t) => pieceImg(enemy + t)));
      const a = color === 'w' ? adv : -adv;
      if (a > 0) cap.append(h('span.adv', `+${a}`));
    },
    setClock(ms, active, show = true) {
      clock.classList.toggle('hidden', !show);
      clock.textContent = fmtTime(ms);
      clock.classList.toggle('active', !!active);
      clock.classList.toggle('low', ms < 20000 && ms > 0);
    },
  };
}

export function classBadge(cls, size = 20) {
  const c = CLASSES[cls];
  if (!c) return null;
  return h('span.class-badge', h('i', { style: { background: c.color, width: size + 'px', height: size + 'px' } }, c.sym || '✓'), c.label);
}

/** Move list in 3-col grid. moves: [{san,cls?}] startPly: 0 for white to move. */
export function moveList(moves, { current = -1, onSelect, startColor = 'w' } = {}) {
  const el = h('div.movelist');
  const offset = startColor === 'b' ? 1 : 0;
  const total = moves.length + offset;
  for (let i = 0; i < total; i += 2) {
    el.append(h('div.mn', String(i / 2 + 1)));
    for (let j = 0; j < 2; j++) {
      const idx = i + j - offset;
      const m = moves[idx];
      if (idx < 0 || !m) { el.append(h('div.mv')); continue; }
      const c = m.cls && CLASSES[m.cls] && !['best', 'excellent', 'good', 'book'].includes(m.cls) ? CLASSES[m.cls] : null;
      const div = h('div.mv', { class: idx === current ? 'active' : '', onclick: () => onSelect && onSelect(idx), dataset: { idx } }, c ? h('span.ci', { style: { background: c.color }, title: c.label }, c.sym) : null, m.san);
      el.append(div);
    }
  }
  el.scrollToCurrent = () => { const a = el.querySelector('.mv.active'); if (a) { const t = a.offsetTop - el.clientHeight / 2; el.scrollTo({ top: t, behavior: 'smooth' }); } };
  return el;
}

/** Evaluation-over-time chart (SVG). evals: [{c|m}] (white pov), moves for markers. */
export function evalChart(review, { current, onSelect } = {}) {
  const W = 600, H = 140;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('class', 'chart');
  const n = review.evals.length;
  const pts = review.evals.map((e) => winPct(expandEval(e)));
  const x = (i) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (p) => H - (p / 100) * H;
  let d = `M0,${H} `;
  pts.forEach((p, i) => { d += `L${x(i).toFixed(1)},${y(p).toFixed(1)} `; });
  d += `L${W},${H} Z`;
  const mk = (tag, attrs) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  svg.append(mk('rect', { width: W, height: H, fill: '#2a2f3c' }));
  svg.append(mk('path', { d, fill: '#e9ebf2', opacity: 0.92 }));
  svg.append(mk('line', { x1: 0, x2: W, y1: H / 2, y2: H / 2, stroke: '#f2b84b', 'stroke-width': 1, opacity: 0.55, 'stroke-dasharray': '4 4' }));
  // critical-moment markers
  review.moves.forEach((m, i) => {
    if (['blunder', 'mistake'].includes(m.cls)) svg.append(mk('circle', { cx: x(i + 1), cy: y(pts[i + 1]), r: 4.2, fill: CLASSES[m.cls].color, stroke: '#111', 'stroke-width': 1 }));
  });
  const cur = mk('line', { y1: 0, y2: H, stroke: '#7c9cff', 'stroke-width': 2 });
  svg.append(cur);
  svg.setCursor = (i) => { cur.setAttribute('x1', x(i + 1)); cur.setAttribute('x2', x(i + 1)); };
  svg.setCursor(current != null ? current : -1);
  const pick = (e) => { const r = svg.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1)); onSelect && onSelect(Math.max(0, Math.min(n - 2, i - 1))); };
  let down = false;
  svg.addEventListener('pointerdown', (e) => { down = true; pick(e); });
  svg.addEventListener('pointermove', (e) => { if (down) pick(e); });
  window.addEventListener('pointerup', () => { down = false; });
  return svg;
}

/** Coach card for one explained move. handlers: {onShowBest,onRetry,onTask} */
export function coachCard(m, { onShowBest, onRetry, onTask } = {}) {
  const c = m.coach;
  const wrap = h('div.card.coach-box');
  const head = h('div.coach-head', h('div.coach-avatar', '🎓'), h('div.grow', h('div.row.tight', h('b', c ? c.title : `${m.moveNo}${m.color === 'w' ? '.' : '...'} ${m.san}`), classBadge(m.cls)), c ? h('div.small.muted', c.evalText) : h('div.small.muted', `Eval ${fmtEval(m.evalAfter)}`)));
  wrap.append(head);
  if (!c) {
    const best = m.cls === 'best' || m.cls === 'excellent' || m.cls === 'good' || m.cls === 'book';
    wrap.append(h('p', best ? `${m.san} is ${CLASSES[m.cls].label.toLowerCase()}${m.cls === 'book' ? ' — a known opening move.' : '.'}` : ''));
    if (m.bestSan && m.cls !== 'best' && m.cls !== 'book') wrap.append(h('p.small.muted', `The engine's first choice was ${m.bestSan}.`));
    return wrap;
  }
  wrap.append(h('div.coach-sec', h('h4', c.kind === 'positive' ? 'Why it works' : 'What happened?'), h('p', c.what)));
  if (c.kind === 'mistake') {
    if (c.bestSan) wrap.append(h('div.coach-sec', h('h4', 'Better was'), h('p', h('b', c.bestSan), c.bestDesc ? ` — it ${c.bestDesc}.` : '.', c.bestLineSan ? h('span.muted', `  (${c.bestLineSan})`) : null)));
    wrap.append(h('div.coach-sec', h('h4', 'What should you have considered?'), h('ul', c.consider.map((x) => h('li', x)))));
    if (c.recommendation) {
      wrap.append(h('div.rec-card', h('div.row.tight', icon('target', 16), h('b', 'Training recommendation: '), c.recommendation.label),
        h('div', c.recommendation.tasks.slice(0, 3).map((t) => h('button.btn.small', { onclick: () => onTask ? onTask(t) : runTask(t) }, t.label)))));
    }
  }
  const acts = h('div.row.mt');
  if (onShowBest && m.best) acts.append(h('button.btn.small', { onclick: onShowBest }, icon('eye', 15), 'Show best move'));
  if (onRetry && c.kind === 'mistake') acts.append(h('button.btn.small.primary', { onclick: onRetry }, icon('repeat', 15), 'Try it again'));
  if (acts.children.length) wrap.append(acts);
  return wrap;
}

/** Launch a training task (puzzles / lesson / mistakes / play). */
export function runTask(t) {
  if (t.kind === 'puzzles') navigate(`#/train/puzzles?theme=${t.theme}&n=${t.n || 5}`);
  else if (t.kind === 'mistakes') navigate(`#/train/mistakes${t.tag ? '?tag=' + t.tag : ''}`);
  else if (t.kind === 'lesson') navigate(`#/learn/${t.track}/${t.id}`);
  else navigate('#/play');
}

export function engineLinesView(lines, fen) {
  const el = h('div.lines');
  lines.forEach((l) => {
    el.append(h('div.eng-line', h('b', fmtEval(l.white)), h('span', l.san || l.pv.slice(0, 6).join(' '))));
  });
  return el;
}

export function emptyState(iconName, title, text, action) {
  return h('div.empty', icon(iconName, 36), h('h3', title), h('p', text), action || null);
}
export function statBox(value, label, sub) { return h('div.stat', h('b', String(value)), h('span', label), sub ? h('span.xs.faint', sub) : null); }
export { TAGS, THEME_LABELS };
