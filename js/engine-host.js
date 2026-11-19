// One shared Stockfish worker for the whole app (lazy).
import { Engine } from './engine.js';
let engine = null;
let ready = null;
export const engineState = { loading: false, ok: false, error: null };

export function getEngine() {
  if (!ready) {
    engineState.loading = true;
    try { engine = Engine.browser('engine/stockfish-19-lite-single.js'); } catch (e) { engineState.error = e; return Promise.reject(e); }
    ready = engine.init().then(() => { engineState.ok = true; engineState.loading = false; return engine; }).catch((e) => { engineState.error = e; engineState.loading = false; ready = null; throw e; });
  }
  return ready;
}
export function stopEngine() { if (engine) engine.stop(); }
