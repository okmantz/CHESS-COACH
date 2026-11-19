// Daily personalised training plan, derived from the player's recurring mistakes.
import * as store from './store.js';
import { weaknessProfile, buildPlan } from './coach.js';
import './lessons.js';

export function currentProfile() { const s = store.get(); return weaknessProfile(s.mistakes, s.games); }

export function ensureTodayPlan(force = false) {
  const s = store.get();
  const day = store.today();
  if (!force && s.plan.date === day && s.plan.items.length) return s.plan;
  const prof = currentProfile();
  const items = buildPlan(prof, s.puzzles.themes, s.lessons).map((t) => ({ ...t, n: t.n || 1, progress: 0, done: false }));
  store.update((st) => { st.plan.date = day; st.plan.items = items; });
  return store.get().plan;
}

export function trackPlan(ev) {
  const s = store.get();
  if (s.plan.date !== store.today()) return;
  let changed = false;
  store.update((st) => {
    for (const it of st.plan.items) {
      if (it.done) continue;
      const match = it.kind === ev.kind && (it.kind === 'puzzles' ? (ev.themes || []).includes(it.theme) : it.kind === 'mistakes' ? it.tag === ev.tag || !it.tag : it.kind === 'lesson' ? it.track === ev.track && it.id === ev.id : true);
      if (!match) continue;
      it.progress = (it.progress || 0) + 1;
      changed = true;
      if (it.progress >= (it.n || 1)) it.done = true;
    }
    if (changed && st.plan.items.every((i) => i.done) && st.plan.lastCompleted !== store.today()) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yd = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      st.plan.streak = st.plan.lastCompleted === yd ? (st.plan.streak || 0) + 1 : 1;
      st.plan.lastCompleted = store.today();
    }
  });
}
