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
  const s = store.get();
  const side = $('#sidebar'), top = $('#topbar'), bot = $('#bottomnav');
  const item = (n, cls = '') => h('a.nav-item', { href: n.hash, dataset: { id: n.id } }, icon(n.icon, 22), h('span', n.label));
  side.replaceChildren(
    h('a.brand', { href: '#/' }, h('div.brand-mark', '♞'), 'Chess Coach'),
    ...NAV.map(item), h('div.divider'), ...SIDE_EXTRA.map(item),
    h('div.side-foot', h('div.card.flat.small', { id: 'side-rating' })),
  );
  bot.replaceChildren(...NAV.map(item));
  top.replaceChildren(
    h('a.brand', { href: '#/' }, h('div.brand-mark', '♞'), 'Chess Coach'), h('div.top-spacer'),
    h('a.rating-pill', { href: '#/play', id: 'top-rating' }), h('a', { href: '#/profile', id: 'top-avatar', 'aria-label': 'Profile' }),
  );
  refreshChrome();
}
function refreshChrome() {
  const s = store.get();
  const rk = rankOf(s.rating.value);
  const pill = $('#top-rating');
  if (pill) pill.replaceChildren(icon('trend', 15), `${Math.round(s.rating.value)}`);
  const av = $('#top-avatar'); if (av) av.replaceChildren(avatar(s.profile, 34));
  const sr = $('#side-rating');
  if (sr) sr.replaceChildren(h('div.row.nowrapr', avatar(s.profile, 36), h('div.grow', h('b', s.profile.name), h('div.xs.muted', `${Math.round(s.rating.value)} · ${rk.name}`))));
}

function setActive(page) {
  const map = { home: 'home', play: 'play', analyze: 'analyze', learn: 'learn', train: 'train', coach: 'coach', coachplay: 'play', games: 'games', profile: 'profile', path: 'path' };
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.id === map[page]));
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
  let name = s.profile.name === 'Player' ? '' : s.profile.name, av = s.profile.avatar;
  const input = h('input', { type: 'text', placeholder: 'Your name', maxlength: 24, value: name, oninput: (e) => { name = e.target.value; } });
  const grid = avatarPicker(av, (a) => { av = a; });
  const m = modal(h('div.col',
    h('div.center', h('div.brand-mark', { style: { width: '56px', height: '56px', fontSize: '30px', margin: '0 auto 10px', borderRadius: '16px' } }, '♞'), h('h2', 'Welcome to Chess Coach'), h('p.muted', 'Play, analyze and learn with Stockfish — and a coach that studies your own games to build a personal training plan.')),
    h('div', h('label.field', 'What should we call you?'), input), h('div', h('label.field', 'Pick an avatar'), h('div.onboard-avatars', grid)),
    h('div.card.flat.small', h('b', 'Your road starts at 600 (Beginner). '), 'Ten opponents, each with their own personality, take you from 600 to 2600 — and your coach helps with every step.'),
    h('button.btn.primary.big.block', { onclick: () => { store.update((st) => { st.onboarded = true; st.profile.name = name.trim() || 'Player'; st.profile.avatar = av; }); store.flush(); m.close(); refreshChrome(); } }, 'Start playing')),
    { dismissible: false });
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
