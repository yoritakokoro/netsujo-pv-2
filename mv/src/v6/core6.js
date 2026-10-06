// v6 motion core. Everything is a pure function of song time:
//   - an intensity curve (from the measured loudness) that scales every accent
//   - beat pulses on the 124 BPM grid
//   - a keyframed 2D camera with hand-held drift (the whole plate moves as one: no cut-out parallax)
//   - post effects (radial / directional blur, exposure, bloom, negative, colour fringe)
//   - the transition library, all landing on the beat
import { W, H, clamp, lerp, E, noise1, hash, makeCanvas, TAU } from '../util.js';
import { T, beatF, barF } from '../timing.js';
import { IMG, tinted } from '../gfx.js';

/* ---------------------------------------------------------------- intensity */
// [time, energy 0..1] — follows the loudness analysis (tools/drums.py) and the arrangement
const CURVE = [[0, 0.1], [7.7, 0.15], [7.8, 0.7], [9.75, 0.6], [15.9, 0.45], [30.3, 0.55], [36, 0.8], [42.3, 0.85], [48.2, 1], [69.75, 0.85],
  [73.6, 0.35], [77.5, 0.6], [79.43, 0.3], [94.37, 0.6], [102.6, 0.75], [112.33, 1], [133.6, 0.75], [135.5, 0.35], [147, 0.6], [160.7, 0.9],
  [166.53, 0.95], [191.3, 0.25], [199.4, 0.85], [209.11, 1], [238.14, 0.6], [249.75, 0.4], [266, 0.1]];
export function energy(t) {
  for (let i = 0; i < CURVE.length - 1; i++) if (t < CURVE[i + 1][0]) return lerp(CURVE[i][1], CURVE[i + 1][1], clamp((t - CURVE[i][0]) / Math.max(0.05, CURVE[i + 1][0] - CURVE[i][0])) ** 0.5);
  return CURVE[CURVE.length - 1][1];
}
// 1 on the beat, decaying; every = 1 (quarter), 4 (bar), 0.5 (eighth)
export function pulse(t, every = 1, decay = 9) {
  const b = beatF(t) / every; if (b < 0) return 0;
  return Math.exp(-(b - Math.floor(b)) * T.beat * every * decay);
}
// rumba accent pattern (3+3+2 eighths) within a bar
export function tresillo(t, decay = 10) {
  const x = ((barF(t) % 1) + 1) % 1 * 8; let best = 9;
  for (const h of [0, 3, 6]) if (x >= h) best = Math.min(best, x - h);
  return Math.exp(-best * T.beat / 2 * decay);
}

/* ---------------------------------------------------------------- camera */
// x, y: the world point at the centre of the screen (world = 1920x1080 plate coordinates); z: zoom; r: roll
export const C0 = { x: W / 2, y: H / 2, z: 1, r: 0 };
const EASE = { io: E.inOutSine, io3: E.inOutCubic, o: E.outCubic, o4: E.outQuart, ox: E.outExpo, i: E.inCubic, iq: E.inQuad, l: u => u, ix: E.inExpo };
// keys: [[t, {x,y,z,r}, easeName], ...] — the ease applies to the segment starting at that key
export function keyed(t, keys) {
  const k0 = keys[0];
  if (t <= k0[0]) return { ...C0, ...k0[1] };
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, a, e] = keys[i], [tb, b] = keys[i + 1];
    if (t < tb) { const u = (EASE[e] || EASE.io)(clamp((t - ta) / (tb - ta))); const A = { ...C0, ...a }, B = { ...C0, ...b };
      return { x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u), z: A.z * Math.pow(B.z / A.z, u), r: lerp(A.r, B.r, u) }; }
  }
  return { ...C0, ...keys[keys.length - 1][1] };
}
export function handheld(c, t, amp = 1, seed = 0) {
  if (amp <= 0) return c;
  const n = (k, f) => noise1(t * f, seed * 13 + k) - 0.5;
  return { x: c.x + n(1, 0.23) * 16 * amp / c.z, y: c.y + n(2, 0.29) * 10 * amp / c.z, z: c.z * (1 + n(3, 0.17) * 0.008 * amp), r: c.r + n(4, 0.19) * 0.003 * amp };
}
export function applyCam(g, c) { g.translate(W / 2, H / 2); if (c.r) g.rotate(c.r); g.scale(c.z, c.z); g.translate(-c.x, -c.y); }
// world point -> screen point under camera c
export function toScreen(c, x, y) {
  const dx = (x - c.x) * c.z, dy = (y - c.y) * c.z, cs = Math.cos(c.r || 0), sn = Math.sin(c.r || 0);
  return [W / 2 + dx * cs - dy * sn, H / 2 + dx * sn + dy * cs];
}

/* ---------------------------------------------------------------- buffers & post effects */
const pool = {};
export function frame(name) {
  let c = pool[name]; if (!c) c = pool[name] = makeCanvas(W, H);
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return [c, g];
}
// radial (zoom) blur of src onto g: running average of copies scaled about (cx, cy)
export function radialBlur(g, src, amt, cx = W / 2, cy = H / 2, n = 10) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
  for (let k = 0; k < n; k++) { const s = 1 + amt * k / (n - 1); g.globalAlpha = 1 / (k + 1);
    g.setTransform(s, 0, 0, s, cx * (1 - s), cy * (1 - s)); g.drawImage(src, 0, 0); }
  g.restore();
}
// directional (motion) blur along (dx, dy) px
export function dirBlur(g, src, dx, dy, n = 10) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
  for (let k = 0; k < n; k++) { const u = k / (n - 1) - 0.5; g.globalAlpha = 1 / (k + 1); g.drawImage(src, dx * u, dy * u); }
  g.restore();
}
export function expose(g, a, color = '#fff6ec') {
  if (a <= 0.003) return; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'screen'; g.globalAlpha = Math.min(1, a); g.fillStyle = color; g.fillRect(0, 0, W, H); g.restore();
}
export function negative(g, a = 1) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'difference'; g.globalAlpha = a; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore();
}
const small = makeCanvas(480, 270), sg = small.getContext('2d');
export function bloomPass(g, src, a, tint = '#ffd2a8', blur = 7) {
  if (a <= 0.01) return;
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'source-over'; sg.globalAlpha = 1; sg.filter = `brightness(0.85) contrast(2) blur(${blur}px)`;
  sg.drawImage(src, 0, 0, 480, 270); sg.filter = 'none';
  if (tint) { sg.globalCompositeOperation = 'multiply'; sg.fillStyle = tint; sg.fillRect(0, 0, 480, 270); }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'screen'; g.globalAlpha = a; g.drawImage(small, 0, 0, W, H); g.restore();
}
// soft defocus of the whole frame (for blooms and rack focus)
export function soften(g, src, px, a = 1) {
  if (px < 0.5 || a <= 0.01) return;
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'source-over'; sg.globalAlpha = 1; sg.filter = `blur(${px / 4}px)`; sg.drawImage(src, 0, 0, 480, 270); sg.filter = 'none';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.drawImage(small, 0, 0, W, H); g.restore();
}
// red/cyan fringe (lens chroma) for hits
export function fringeRGB(g, src, px, a = 0.5) {
  if (px < 0.5) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'screen'; g.globalAlpha = a;
  g.drawImage(tinted(src, '#ff2030', 'fr'), -px, 0); g.drawImage(tinted(src, '#20d8ff', 'fc'), px, 0); g.restore();
}

/* ---------------------------------------------------------------- transitions */
// Each transition spans [cut - pre, cut + post]. During it the runner may render the previous (P) and
// the current (C) shot; the transition returns per-shot camera modifiers and composites the result.
//   mod(side, u) -> {z: zoom factor, dx, dy}  (side 'P' or 'C', u = 0..1 progress within that side's half)
export const TR = {
  cut: { pre: 0, post: 0 },
  flash: { pre: 0.09, post: 0.32 },
  bloom: { pre: 0.32, post: 0.42 },
  zoom: { pre: 0.3, post: 0.42 },
  whip: { pre: 0.16, post: 0.3 },
  invert: { pre: 0, post: 0.35 },
  fan: { pre: 0.2, post: 0.4 },
  ruffle: { pre: 0.22, post: 0.38 },
  iris: { pre: 0.15, post: 0.45 },
  panels: { pre: 0, post: 0.5 },
  silk: { pre: 0.3, post: 0.35 },
  dip: { pre: 0.35, post: 0.45 },
  flare: { pre: 0.26, post: 0.38 },
};
export function trMod(tr, side, u) {
  const o = tr.o || {};
  switch (tr.type) {
    case 'zoom': return side === 'P' ? { z: 1 + 0.7 * E.inCubic(u) } : { z: 1 + 0.55 * (1 - E.outExpo(u)) };
    case 'whip': { const d = o.dir || [1, 0], m = side === 'P' ? E.inCubic(u) * 0.9 : -(1 - E.outCubic(u)) * 0.7;
      return { dx: d[0] * W * m, dy: d[1] * H * m }; }
    case 'invert': return side === 'C' ? { z: 1 + 0.08 * (1 - E.outExpo(u)) } : {};
    case 'flash': return side === 'P' ? { z: 1 + 0.06 * E.inCubic(u) } : { z: 1 + 0.05 * (1 - E.outCubic(u)) };
    case 'flare': { const d = o.dir ?? 1; return side === 'P' ? { dx: d * 90 * E.inCubic(u) } : { dx: -d * 110 * (1 - E.outCubic(u)) }; }
    default: return {};
  }
}
// composite: P and C are canvases (either may be null), g the output, p = 0..1 over the whole window, cutU = pre/(pre+post)
export function trComposite(tr, g, P, C, p, t) {
  const o = tr.o || {}, d = TR[tr.type], cutU = d.pre / Math.max(0.001, d.pre + d.post);
  const before = p < cutU, uP = cutU > 0 ? clamp(p / cutU) : 1, uC = cutU < 1 ? clamp((p - cutU) / (1 - cutU)) : 1;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  switch (tr.type) {
    case 'flash': {
      if (before) { g.drawImage(P, 0, 0); expose(g, Math.pow(uP, 1.6), o.color); }
      else { g.drawImage(C, 0, 0); bloomPass(g, C, 0.9 * (1 - uC), o.tint ?? '#fff0e0', 9); expose(g, Math.pow(1 - uC, 2.2), o.color); }
      break; }
    case 'bloom': {
      const m = E.inOutSine(p), ex = Math.sin(Math.PI * p);
      g.drawImage(P, 0, 0); g.globalAlpha = m; g.drawImage(C, 0, 0); g.globalAlpha = 1;
      soften(g, m < 0.5 ? P : C, 26 * ex, 0.75 * ex); bloomPass(g, m < 0.5 ? P : C, 0.8 * ex, o.tint ?? '#ffe2c0', 10); expose(g, 0.55 * Math.pow(ex, 1.5), o.color);
      break; }
    case 'dip': { const ex = Math.sin(Math.PI * p); g.drawImage(before ? P : C, 0, 0); g.fillStyle = o.color || '#000'; g.globalAlpha = Math.min(1, ex * 1.25); g.fillRect(0, 0, W, H); break; }
    case 'zoom': {
      if (before) { radialBlur(g, P, 0.22 * E.inCubic(uP), o.x ?? W / 2, o.y ?? H / 2); expose(g, 0.65 * Math.pow(uP, 2.5), o.color); }
      else { radialBlur(g, C, 0.2 * (1 - E.outCubic(uC)), o.x ?? W / 2, o.y ?? H / 2); expose(g, 0.65 * Math.pow(1 - uC, 2.5), o.color); }
      break; }
    case 'whip': {
      const dd = o.dir || [1, 0], v = before ? E.inCubic(uP) : 1 - E.outCubic(uC), L = 260 * Math.sin(Math.PI * Math.min(1, before ? uP : 1 - uC) / 1) * (before ? uP : 1 - uC);
      dirBlur(g, before ? P : C, dd[0] * (60 + 420 * v), dd[1] * (60 + 420 * v)); void L;
      break; }
    case 'invert': {
      g.drawImage(C, 0, 0);
      const fl = 1 - E.outCubic(uC);
      fringeRGB(g, C, 18 * fl, 0.55 * fl);
      if (uC < 0.12) negative(g, 1);
      else if (uC < 0.2) { negative(g, 1 - (uC - 0.12) / 0.08); }
      expose(g, 0.25 * fl, o.color);
      break; }
    case 'fan': {
      g.drawImage(P, 0, 0);
      const e = E.inOutCubic(p), cx = o.x ?? W / 2, cy = o.y ?? H + 140, R = 2600, a0 = Math.PI * (o.from ?? 1), span = Math.PI * e * (o.dirn ?? 1);
      g.save(); g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a0 + span, span < 0); g.closePath(); g.clip(); g.drawImage(C, 0, 0);
      // fan ribs over the opened part
      g.globalAlpha = 0.35 * Math.sin(Math.PI * p); g.strokeStyle = '#f2d9a6'; g.lineWidth = 2;
      for (let k = 1; k < 14; k++) { const an = a0 + span * k / 14; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R); g.stroke(); }
      g.restore();
      const ae = a0 + span; g.strokeStyle = o.color || '#b0102c'; g.lineWidth = 14; g.globalAlpha = Math.sin(Math.PI * p);
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ae) * R, cy + Math.sin(ae) * R); g.stroke();
      g.strokeStyle = '#f2d9a6'; g.lineWidth = 3; g.stroke();
      break; }
    case 'ruffle': {
      g.drawImage(P, 0, 0);
      const e = E.inOutCubic(p), y = lerp(H + 120, -160, e), r = 46, sway = Math.sin(p * 9) * 20;
      const edge = h => { h.beginPath(); h.moveTo(-60, H + 400); h.lineTo(-60, y); for (let x = -60; x < W + 60; x += r * 2) h.arc(x + r + sway, y + Math.sin(x * 0.01 + p * 6) * 14, r, Math.PI, 0, false); h.lineTo(W + 60, H + 400); h.closePath(); };
      g.save(); edge(g); g.clip(); g.drawImage(C, 0, 0); g.restore();
      g.save(); g.translate(0, 0); edge(g); g.lineWidth = 34; g.strokeStyle = o.color || '#9a0f24'; g.globalAlpha = Math.sin(Math.PI * p); g.stroke(); g.lineWidth = 4; g.strokeStyle = '#f2d9a6'; g.stroke(); g.restore();
      break; }
    case 'iris': {
      g.drawImage(P, 0, 0);
      const e = E.inOutCubic(p), r = lerp(0, 1300, e), cx = o.x ?? W / 2, cy = o.y ?? H / 2;
      g.save(); g.beginPath(); g.arc(cx, cy, Math.max(1, r), 0, TAU); g.clip(); g.drawImage(C, 0, 0); g.restore();
      g.strokeStyle = o.color || '#f2d9a6'; g.globalAlpha = Math.sin(Math.PI * p); g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, Math.max(1, r), 0, TAU); g.stroke();
      g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, Math.max(1, r + 16), 0, TAU); g.stroke();
      break; }
    case 'panels': {
      g.drawImage(P, 0, 0);
      const n = o.n || 5, pw = W / n;
      for (let k = 0; k < n; k++) {
        const kk = o.rev ? n - 1 - k : k, uk = E.outCubic(clamp(p * 1.7 - kk * 0.14)), y = (1 - uk) * (k % 2 ? -H : H);
        g.save(); g.beginPath(); g.rect(k * pw - 1, y, pw + 2, H); g.clip(); g.drawImage(C, 0, 0); g.restore();
        if (uk > 0 && uk < 1) { g.fillStyle = k % 2 ? '#f2d9a6' : (o.color || '#b0102c'); g.fillRect(k * pw, k % 2 ? y + H - 6 : y, pw, 6); }
      }
      break; }
    case 'silk': {
      const e = E.inOutCubic(p), x = lerp(-W * 0.9, W * 1.1, e);
      g.drawImage(before ? P : C, 0, 0);
      const im = IMG.m_textile_222561;
      g.save(); g.translate(x, 0); g.rotate(-0.12); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 60;
      g.beginPath(); g.moveTo(-W * 0.8, -400); for (let y = -400; y <= H + 400; y += 40) g.lineTo(W * 0.42 + Math.sin(y * 0.006 + p * 5) * 70, y); g.lineTo(-W * 0.8, H + 400); g.closePath();
      g.clip(); if (im) g.drawImage(im, -W * 0.9, -500, W * 1.5, H + 1000); g.fillStyle = 'rgba(120,0,16,0.45)'; g.fillRect(-W, -500, W * 2, H + 1000); g.restore();
      break; }
    case 'flare': {
      // a sun flare sweeps across the frame; the next shot is revealed behind its bright front
      const d = o.dir ?? 1, e = E.inOutSine(p), xf = d > 0 ? lerp(-0.3 * W, 1.3 * W, e) : lerp(1.3 * W, -0.3 * W, e), y0 = o.y ?? H * 0.42, pk = Math.sin(Math.PI * p);
      g.drawImage(P, 0, 0);
      g.save(); g.beginPath(); if (d > 0) g.rect(0, 0, Math.max(0, xf), H); else g.rect(Math.min(W, xf), 0, W, H); g.clip(); g.drawImage(C, 0, 0); g.restore();
      g.globalCompositeOperation = 'screen';
      const bg = g.createLinearGradient(xf - 520, 0, xf + 520, 0); bg.addColorStop(0, 'rgba(255,200,150,0)'); bg.addColorStop(0.5, `rgba(255,246,228,${0.95 * pk})`); bg.addColorStop(1, 'rgba(255,200,150,0)');
      g.fillStyle = bg; g.fillRect(xf - 520, 0, 1040, H);
      const sg = g.createLinearGradient(0, 0, W, 0); sg.addColorStop(0, 'rgba(255,190,140,0)'); sg.addColorStop(clamp(xf / W, 0.02, 0.98), `rgba(255,240,215,${0.9 * pk})`); sg.addColorStop(1, 'rgba(255,190,140,0)');
      g.fillStyle = sg; g.fillRect(0, y0 - 3, W, 6); g.globalAlpha = 0.4; g.fillRect(0, y0 - 40, W, 80); g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      bloomPass(g, before ? P : C, 0.6 * pk, o.tint ?? '#ffd8b0', 10); expose(g, 0.35 * Math.pow(pk, 2), o.color ?? '#fff2e0');
      break; }
    default: g.drawImage(before ? P : C, 0, 0);
  }
  g.restore();
}
