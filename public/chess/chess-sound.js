
let ctx = null;
let enabled = true;
try { enabled = localStorage.getItem("cx_sound") !== "0"; } catch { /* private mode */ }

function audio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!ctx) ctx = new Ctx();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch { return null; }
}

function tap(pitch = 1, vol = 0.16, at = 0, len = 0.14) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(520 * pitch, t);
  osc.frequency.linearRampToValueAtTime(680 * pitch, t + len * 0.32);
  osc.frequency.linearRampToValueAtTime(340 * pitch, t + len * 0.86);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + len + 0.01);
}

function note(freq, vol, at, len) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + len + 0.02);
}

const play = (fn) => { if (enabled) fn(); };

export const sound = {
  isOn: () => enabled,
  setOn(on) {
    enabled = !!on;
    try { localStorage.setItem("cx_sound", enabled ? "1" : "0"); } catch { /* ignore */ }
  },
  unlock() { audio(); },
  move() { play(() => tap(1, 0.16)); },
  capture() { play(() => { tap(0.78, 0.22, 0, 0.16); tap(0.62, 0.12, 0.07, 0.12); }); },
  check() { play(() => { tap(1.15, 0.2, 0, 0.1); tap(1.15, 0.2, 0.13, 0.1); }); },
  win() { play(() => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, 0.17, i * 0.13, 0.34)); note(1046.5, 0.14, 0.56, 0.7); }); },
  lose() { play(() => { note(392, 0.15, 0, 0.28); note(293.66, 0.14, 0.2, 0.42); note(220, 0.12, 0.42, 0.58); }); },
  draw() { play(() => { note(523.25, 0.12, 0, 0.3); note(392, 0.12, 0.2, 0.45); }); },
  ping() { play(() => { tap(1.3, 0.1, 0, 0.09); tap(1.6, 0.1, 0.1, 0.09); }); },
};
