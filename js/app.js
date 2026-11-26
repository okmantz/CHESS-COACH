import * as store from './store.js';
import { h, $, icon, avatar, toast, modal } from './ui.js';
import { rankOf } from './rating.js';
import { setSoundEnabled } from './sound.js';
import { applySkins, ACCENTS } from './skins.js';
import { avatarPicker } from './avatars.js';
import { getEngine, stopEngine } from './engine-host.js';

const NAV = [
  { id: 'play', label: 'Play', icon: 'play', hash: '#/play' },
  { id: 'analyze', label: 'Analyze', icon: 'search', hash: '#/analyze' },
  { id: 'learn', label: 'Learn', icon: 'book', hash: '#/learn' },
  { id: 'train', label: 'Train', icon: 'zap', hash: '#/train' },
  { id: 'coach', label: 'Coach', icon: 'target', hash: '#/coach' },
];
const SIDE_EXTRA = [
  { id: 'home', label: 'Home', icon: 'home', hash: '#/' },
  { id: 'path', label: 'My path', icon: 'target', hash: '#/path' },
  { id: 'games', label: 'My games', icon: 'list', hash: '#/games' },
  { id: 'profile', label: 'Profile', icon: 'user', hash: '#/profile' },
];
const ROUTES = [
  [/^\/?$/, 'home'], [/^\/play$/, 'play'], [/^\/analyze$/, 'analyze'], [/^\/learn(?:\/([a-z]+))?(?:\/([\w-]+))?$/, 'learn'],
  [/^\/train(?:\/([a-z]+))?$/, 'train'], [/^\/coach$/, 'coach'], [/^\/coach-play$/, 'coachplay'], [/^\/two-player$/, 'twoplayer'], [/^\/games$/, 'games'], [/^\/profile$/, 'profile'], [/^\/path$/, 'path'],
];

export const app = { deferredInstall: null, installed: matchMedia('(display-mode: standalone)').matches || navigator.standalone };
export const navigate = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

let cleanup = null;
let routeToken = 0;

function applyTheme() {
  const s = store.get();
  applySkins(s.settings, s.profile);
  const c = s.profile.color || '#7c9cff';
  const root = document.documentElement.style;
  root.setProperty('--accent', c);
  root.setProperty('--accent-soft', c + '24');
  const lum = (() => { const n = parseInt(c.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; })();
  root.setProperty('--accent-ink', lum > 0.62 ? '#0b1020' : '#ffffff');
  document.querySelector('meta[name=theme-color]').setAttribute('content', s.settings.theme === 'light' ? '#f3f5f9' : s.settings.theme === 'amoled' ? '#000000' : '#0e1015');
  setSoundEnabled(s.settings.sound);
}

function renderChrome() {
  const side = $('#sidebar'), top = $('#topbar'), bot = $('#bottomnav');
  const item = (n) => h('a.nav-item', { href: n.hash, dataset: { id: n.id } }, h('span.nav-ic', icon(n.icon, 20)), h('span.nav-label', n.label));
  const mobileItem = (n) => h('a.nav-item', { href: n.hash, dataset: { id: n.id } }, h('span.nav-ic', icon(n.icon, 22)), h('span.nav-label', n.label));
  side.replaceChildren(
    h('a.brand', { href: '#/' }, h('div.brand-mark', '♞'), h('span.brand-text', 'Chess', h('b', 'Coach'))),
    h('nav.side-nav', { 'aria-label': 'Main' },
      item(SIDE_EXTRA[0]),
      h('div.nav-group', 'Practice'), ...NAV.map(item),
      h('div.nav-group', 'You'), ...SIDE_EXTRA.slice(1).map(item)),
    h('div.side-foot', h('div#side-rating'), h('div#side-install')),
  );
  bot.replaceChildren(...NAV.map(mobileItem));
  top.replaceChildren(
    h('a.brand', { href: '#/' }, h('div.brand-mark', '♞'), h('span.brand-text', 'Chess', h('b', 'Coach'))), h('div.top-spacer'),
    h('a.rating-pill', { href: '#/coach', id: 'top-rating', 'aria-label': 'Your rating' }),
    h('button.icon-btn.theme-btn', { id: 'theme-btn', 'aria-label': 'Switch light / dark theme', onclick: toggleTheme }),
    h('button.top-avatar', { id: 'top-avatar', 'aria-label': 'Account menu', onclick: accountMenu }),
  );
  refreshChrome();
}
function toggleTheme() {
  const cur = store.get().settings.theme;
  store.update((st) => { st.settings.theme = cur === 'light' ? 'dark' : 'light'; });
  store.flush();
}
function accountMenu() {
  const s = store.get(), rk = rankOf(s.rating.value);
  const link = (ic, label, sub, hash) => h('a.menu-row', { href: hash, onclick: () => m.close() }, h('span.menu-ic', icon(ic, 18)), h('span.grow', h('b', label), sub ? h('span.xs.muted', sub) : null), icon('right', 16));
  const m = modal(h('div.account-menu',
    h('div.account-head', avatar(s.profile, 52), h('div.grow', h('b', s.profile.name), h('div.small.muted', `${Math.round(s.rating.value)} · ${rk.name}`))),
    h('div.menu-list',
      link('home', 'Home', 'Your dashboard', '#/'), link('target', 'My path', 'Your next steps', '#/path'),
      link('list', 'My games', 'Played and analyzed', '#/games'), link('user', 'Profile & settings', 'Avatar, boards, pieces, theme', '#/profile')),
    app.deferredInstall ? h('button.btn.block.mt', { onclick: async () => { await app.install(); m.close(); } }, icon('download', 16), 'Install the app') : null));
}
function refreshChrome() {
  const s = store.get();
  const rk = rankOf(s.rating.value);
  const pill = $('#top-rating');
  if (pill) pill.replaceChildren(icon('trend', 15), h('b', `${Math.round(s.rating.value)}`), h('span.pill-rank', rk.name));
  const av = $('#top-avatar'); if (av) av.replaceChildren(avatar(s.profile, 36));
  const tb = $('#theme-btn'); if (tb) tb.replaceChildren(icon(s.settings.theme === 'light' ? 'moon' : 'sun', 18));
  const sr = $('#side-rating');
  if (sr) sr.replaceChildren(h('a.side-card', { href: '#/profile' },
    h('div.row.nowrapr', avatar(s.profile, 40), h('div.grow', h('b', s.profile.name), h('div.xs.muted', `${Math.round(s.rating.value)} · ${rk.name}`))),
    h('div.side-meter', { title: rk.next ? `${Math.max(0, Math.round(rk.next.min - s.rating.value))} points to ${rk.next.name}` : 'Top rank' }, h('i', { style: { width: `${Math.round((rk.progress || 0) * 100)}%` } }))));
  const si = $('#side-install');
  if (si) si.replaceChildren(...(app.deferredInstall ? [h('button.btn.small.block', { onclick: () => app.install() }, icon('download', 14), 'Install app')] : []));
}

function setActive(page) {
  const map = { home: 'home', play: 'play', analyze: 'analyze', learn: 'learn', train: 'train', coach: 'coach', coachplay: 'play', games: 'games', profile: 'profile', path: 'path' };
  document.body.dataset.page = page;
  document.querySelectorAll('.nav-item').forEach((n) => { const on = n.dataset.id === map[page]; n.classList.toggle('active', on); if (on) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current'); });
}

async function route() {
  const token = ++routeToken;
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = hash.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  let page = 'home', params = [];
  for (const [re, name] of ROUTES) { const m = re.exec(path); if (m) { page = name; params = m.slice(1); break; } }
  if (cleanup) { try { cleanup(); } catch (e) { console.warn(e); } cleanup = null; }
  document.body.classList.remove('in-game', 'in-review', 'in-learn');
  stopEngine();
  const view = $('#view');
  view.replaceChildren(h('div.page', h('div.row', { style: { justifyContent: 'center', padding: '60px 0' } }, h('div.spin'))));
  setActive(page);
  window.scrollTo(0, 0);
  try {
    const mod = await import(`./pages/${page}.js`);
    if (token !== routeToken) return;
    view.replaceChildren();
    const res = await mod.default(view, { params, query, app, navigate, engine: getEngine, refreshChrome, path });
    if (token !== routeToken) { if (typeof res === 'function') res(); return; }
    cleanup = typeof res === 'function' ? res : null;
  } catch (err) {
    console.error(err);
    view.replaceChildren(h('div.page', h('div.card', h('h2', 'Something went wrong'), h('p.muted', String(err && err.message || err)), h('a.btn', { href: '#/' }, 'Back to home'))));
  }
}

function onboarding() {
  const s = store.get();
  if (s.onboarded) return;
  let name = s.profile.name === 'Player' ? '' : s.profile.name, av = s.profile.avatar, goal = 'play', step = 0;
  const body = h('div.wizard');
  const m = modal(body, { dismissible: false });
  const dots = () => h('div.wiz-dots', [0, 1, 2].map((i) => h('i', { class: i === step ? 'on' : i < step ? 'done' : '' })));
  const finish = () => {
    store.update((st) => { st.onboarded = true; st.profile.name = name.trim() || 'Player'; st.profile.avatar = av; });
    store.flush(); m.close(); refreshChrome();
    navigate(goal === 'learn' ? '#/learn/basics' : goal === 'puzzles' ? '#/train' : '#/play');
  };
  const draw = () => {
    if (step === 0) {
      const input = h('input', { type: 'text', placeholder: 'Your name', maxlength: 24, value: name, autocomplete: 'nickname', oninput: (e) => { name = e.target.value; }, onkeydown: (e) => { if (e.key === 'Enter') { step = 1; draw(); } } });
      body.replaceChildren(dots(),
        h('div.center', h('div.brand-mark.xl', '♞'), h('h2', 'Welcome to Chess Coach'), h('p.muted', 'Play, analyze and learn with Stockfish — and a coach that studies your own games to build a personal plan.')),
        h('div.wiz-feats', ...[['play', 'Play 10 opponents', '600 to 2600 Elo'], ['bulb', 'Understand why', 'Plain-English coaching'], ['target', 'Train your weak spots', 'Built from your games']].map(([ic, t, sub]) => h('div.wiz-feat', h('span', icon(ic, 18)), h('b', t), h('small', sub)))),
        h('div', h('label.field', 'What should we call you?'), input),
        h('button.btn.primary.big.block', { onclick: () => { step = 1; draw(); } }, 'Continue', icon('right', 16)));
      setTimeout(() => input.focus({ preventScroll: true }), 50);
    } else if (step === 1) {
      body.replaceChildren(dots(), h('div.center', h('h2', 'Pick your avatar'), h('p.muted', 'You can change it any time in your profile.')),
        h('div.onboard-avatars', avatarPicker(av, (a) => { av = a; })),
        h('div.row.nowrapr', h('button.btn.big', { onclick: () => { step = 0; draw(); } }, 'Back'), h('button.btn.primary.big.grow', { onclick: () => { step = 2; draw(); } }, 'Continue', icon('right', 16))));
    } else {
      const opt = (id, ic, t, sub) => h('button.goal', { class: goal === id ? 'active' : '', onclick: () => { goal = id; draw(); } }, h('span.goal-ic', icon(ic, 22)), h('span.grow', h('b', t), h('small', sub)), h('span.goal-check', icon('check', 14)));
      body.replaceChildren(dots(), h('div.center', h('h2', 'Where would you like to start?'), h('p.muted', 'Your rating starts at 600 and adjusts quickly as you play.')),
        h('div.goals', opt('learn', 'graduation', 'I’m new to chess', 'A short, friendly course on how the pieces move'), opt('play', 'play', 'I know the rules', 'Play your first game and get a rating'), opt('puzzles', 'zap', 'Test my tactics', 'Solve puzzles that adapt to your level')),
        h('div.row.nowrapr', h('button.btn.big', { onclick: () => { step = 1; draw(); } }, 'Back'), h('button.btn.primary.big.grow', { onclick: finish }, 'Start', icon('right', 16))));
    }
  };
  draw();
}

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); app.deferredInstall = e; window.dispatchEvent(new Event('app-install-ready')); });
window.addEventListener('appinstalled', () => { app.installed = true; app.deferredInstall = null; toast('Chess Coach installed', 'good'); });
app.install = async () => {
  if (app.deferredInstall) { app.deferredInstall.prompt(); await app.deferredInstall.userChoice; app.deferredInstall = null; return true; }
  return false;
};

function boot() {
  store.load();
  applyTheme();
  renderChrome();
  store.subscribe(() => { applyTheme(); refreshChrome(); });
  window.addEventListener('hashchange', route);
  route().then(() => { const sp = $('#splash'); sp.classList.add('out'); setTimeout(() => sp.remove(), 400); onboarding(); });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  // warm the engine in the background so first use is instant
  setTimeout(() => getEngine().catch(() => {}), 1200);
}
boot();
