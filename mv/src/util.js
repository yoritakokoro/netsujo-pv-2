// Math / easing / deterministic randomness helpers shared by every scene.
export const W = 1920, H = 1080;
export const TAU = Math.PI * 2;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = (a, b, x) => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };
// 0 -> 1 -> 0 window with soft edges (fade in over fi, out over fo)
export const win = (t, a, b, fi = 0.4, fo = 0.4) => Math.min(smooth(a, a + fi, t), 1 - smooth(b - fo, b, t));

export const E = {
  lin: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: t => 1 - Math.pow(1 - t, 4),
  inOutQuart: t => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: t => Math.sin((t * Math.PI) / 2),
};
export const ease = (name, a, b, t) => E[name](inv(a, b, t));

// integer hash -> [0,1)
export function hash(n, s = 0) {
  let x = (Math.imul(n | 0, 0x27d4eb2d) ^ Math.imul(s | 0, 0x165667b1)) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// smooth 1D value noise in [-1,1]
export function noise1(x, s = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, s), hash(i + 1, s), u) * 2 - 1;
}
export function fbm1(x, s = 0) { return noise1(x, s) * 0.6 + noise1(x * 2.1, s + 7) * 0.3 + noise1(x * 4.3, s + 13) * 0.1; }

export function hexA(hex, a = 1) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export function mixHex(h1, h2, t, a = 1) {
  const p = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const c1 = p(h1), c2 = p(h2);
  return `rgba(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))},${a})`;
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

// Palette: carmine / flame / gold / ink-navy / ivory, plus night & dawn accents.
export const P = {
  ink: '#0b0912', navy: '#0e1433', navy2: '#1a2456', indigo: '#2a2160', violet: '#5b2a86',
  crimson: '#b3122e', carmine: '#8a0b22', blood: '#5a0614', scarlet: '#e0283c', rose: '#e8566a',
  flame: '#f2661c', orange: '#f59a2a', gold: '#e2b25a', gold2: '#f6d58e', champagne: '#f7e6c4',
  ivory: '#fbf3e4', peach: '#f7b39a', blush: '#f4c9c0', dawn: '#ffd9a0',
};
