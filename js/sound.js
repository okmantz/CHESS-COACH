// Tiny synthesised sound effects (no audio files needed).
let ctx = null;
let enabled = true;
export function setSoundEnabled(v) { enabled = v; }
function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ctx.state === 'suspended') ctx.resume(); return ctx; }
function tone(freq, dur, { type = 'sine', gain = 0.12, delay = 0, slide = 0 } = {}) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
function thud(freq = 160, dur = 0.07, gain = 0.25) { tone(freq, dur, { type: 'triangle', gain, slide: -60 }); }
export function play(name) {
  if (!enabled) return;
  switch (name) {
    case 'move': thud(180, 0.06, 0.22); break;
    case 'capture': thud(130, 0.09, 0.3); tone(520, 0.05, { type: 'square', gain: 0.04 }); break;
    case 'check': thud(170, 0.07, 0.22); tone(880, 0.12, { gain: 0.07, delay: 0.04 }); break;
    case 'castle': thud(180, 0.06, 0.2); thud(150, 0.06, 0.2); break;
    case 'good': tone(660, 0.09, { gain: 0.07 }); tone(880, 0.12, { gain: 0.07, delay: 0.08 }); break;
    case 'bad': tone(220, 0.18, { type: 'sawtooth', gain: 0.06, slide: -60 }); break;
    case 'start': tone(520, 0.1, { gain: 0.07 }); tone(780, 0.14, { gain: 0.07, delay: 0.1 }); break;
    case 'end': tone(660, 0.14, { gain: 0.08 }); tone(520, 0.14, { gain: 0.08, delay: 0.14 }); tone(390, 0.3, { gain: 0.08, delay: 0.28 }); break;
    case 'win': tone(523, 0.12, { gain: 0.08 }); tone(659, 0.12, { gain: 0.08, delay: 0.12 }); tone(784, 0.28, { gain: 0.08, delay: 0.24 }); break;
    case 'tick': tone(1200, 0.03, { gain: 0.05 }); break;
    default: break;
  }
}
export function playForMove(mv, inCheck) {
  if (inCheck) return play('check');
  if (mv.flags && (mv.flags.includes('k') || mv.flags.includes('q'))) return play('castle');
  if (mv.captured) return play('capture');
  return play('move');
}
