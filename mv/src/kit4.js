// v4 toolkit: camera with parallax layers, shot-size framing for the standing art,
// kaleidoscopes, lace / fringe borders, opening fans and other Spanish ornaments from The Met.
import { W, H, TAU, clamp, lerp, inv, smooth, E, hash, noise1, makeCanvas } from './util.js';
import { IMG, buf, cover, place, tinted, duo, blurred, rgba, softDot, glow, character } from './gfx.js';

// official member colours
export const MEM = {
  yo: { name: 'YOSHINO', jp: '依田芳乃', cv: '高田憂希', ink: '#C4BCB7', deep: '#2e2826', mid: '#7a6e68', light: '#f2eeea' },
  na: { name: 'NAGI', jp: '久川凪', cv: '立花日菜', ink: '#F8A4BD', deep: '#4a1828', mid: '#b8607a', light: '#ffe0ea' },
  shi: { name: 'SHIN', jp: '佐藤心', cv: '花守ゆみり', ink: '#F04E98', deep: '#4a0a2a', mid: '#a8205e', light: '#ffc8e0' },
  to: { name: 'TOMOE', jp: '村上巴', cv: '花井美春', ink: '#AB192C', deep: '#2a040a', mid: '#6e0c1a', light: '#f29aa4' },
  ri: { name: 'RIAMU', jp: '夢見りあむ', cv: '星希成奏', ink: '#E89CDC', deep: '#3a1238', mid: '#9a4a90', light: '#fbdcf6' },
};
export const ORDER = ['yo', 'na', 'shi', 'to', 'ri'];
export const GOLD = '#f2d9a6', IV = '#fbf4e8';

/* ---------------------------------------------------------------- camera */
// shot camera: s.cam = { z:[a,b], x:[a,b], y:[a,b], r:[a,b], ease, shake } ; layers have a depth factor.
let CAM = { z: 1, x: 0, y: 0, r: 0 };
export function setCam(s, t) {
  const c = s.cam || {};
  const u = (c.ease || E.inOutSine)(clamp((t - s.a) / Math.max(0.01, (c.dur ?? (s.b - s.a)))));
  const g = (k, d) => (c[k] ? lerp(c[k][0], c[k][1], u) : d);
  CAM = { z: g('z', 1.04), x: g('x', 0), y: g('y', 0), r: g('r', 0) };
  if (c.shake) { CAM.x += noise1(t * 1.7, 11) * c.shake * 10; CAM.y += noise1(t * 1.5, 12) * c.shake * 7; CAM.r += noise1(t * 1.3, 13) * c.shake * 0.004; }
  return CAM;
}
export function layer(ctx, d, fn) {
  const z = 1 + (CAM.z - 1) * d;
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.rotate(CAM.r * d); ctx.translate(-W / 2 + CAM.x * d, -H / 2 + CAM.y * d);
  fn(ctx);
  ctx.restore();
}
// fill helpers that over-scan, safe under camera moves
export const OS = [-260, -200, W + 520, H + 400];
export function bg(ctx, c) { ctx.fillStyle = c; ctx.fillRect(...OS); }
export function bgGrad(ctx, stops) { const g = ctx.createLinearGradient(0, OS[1], 0, OS[1] + OS[3]); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(...OS); }
export function wash(ctx, c, a, op = 'source-over') { if (a <= 0.003) return; ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha *= a; ctx.fillStyle = c; ctx.fillRect(...OS); ctx.restore(); }
export function radial(ctx, cx, cy, r, stops, op = 'source-over', a = 1) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha *= a; ctx.fillStyle = g; ctx.fillRect(...OS); ctx.restore();
}

/* ---------------------------------------------------------------- shot sizes */
// face anchor (fraction of image) and face height (fraction of image height) of each standing art
export const FACE = {
  yo_cos: [0.42, 0.28, 0.24], na_cos: [0.33, 0.33, 0.2], to_cos: [0.2, 0.13, 0.26], shi_cos: [0.27, 0.2, 0.22], ri_cos: [0.55, 0.2, 0.25],
  na_casual: [0.43, 0.27, 0.2], yo_swim: [0.17, 0.25, 0.2], shi_swim: [0.33, 0.3, 0.2], to_white: [0.48, 0.3, 0.19], ri_resort: [0.53, 0.25, 0.18],
};
// framing presets: where the face sits on screen and how tall it is
//   wide: whole art, bottom-anchored ; knee/bust/face/eyes: face-anchored
export function framing(key, size, side = 0.5, o = {}) {
  const [fx, fy, ff] = FACE[key], img = IMG[key];
  if (size === 'wide' || size === 'full') {
    const h = (o.h || 1000), w = img.width * h / img.height;
    const left = side * W - w / 2;
    return { x: left + fx * w, y: H + (o.drop ?? 0.03) * h - h + fy * h, fh: ff * h };
  }
  const FH = { knee: 170, bust: 270, face: 430, eyes: 760 }[size] * (o.k || 1);
  const Y = { knee: 300, bust: 380, face: 470, eyes: 560 }[size];
  return { x: side * W, y: o.y ?? Y, fh: FH };
}
// draw a standing art with a framing (or interpolate between two framings with p)
export function figure(ctx, key, fr, o = {}) {
  const img = IMG[key]; if (!img) return;
  const [fx, fy, ff] = FACE[key];
  const h = fr.fh / ff, w = img.width * h / img.height;
  const flip = !!o.flip;
  const cx = flip ? fr.x + (fx - 0.5) * w : fr.x - (fx - 0.5) * w;
  let cy = fr.y - (fy - 0.5) * h;
  // the card cut-outs are cropped at the bottom: never let that edge float above the frame
  const floor = o.floor ?? H + 12;
  if (!o.free && cy + h / 2 < floor) cy = floor - h / 2;
  character(ctx, img, cx, cy, h, { flip, a: o.a ?? 1, rot: o.rot || 0, shadow: o.shadow === false ? null : (o.shadow || { dx: 22, dy: 14, blur: 26, a: 0.42 }),
    wrap: o.rim ? { color: o.rim, a: o.rimA ?? 0.7, side: o.rimSide ?? 1 } : null, glow: o.glow ? { color: o.glow, blur: o.glowBlur || 34, a: o.glowA ?? 0.6 } : null,
    grade: o.grade ? { color: o.grade, a: o.gradeA ?? 0.3, op: o.gradeOp || 'multiply' } : null });
}
export const lerpFr = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), fh: lerp(a.fh, b.fh, p) });
// crops of the illustrations (cover/cards) by face point; returns [fx, fy] (fractions)
export const CF = { cover: { na: [0.2, 0.34], shi: [0.39, 0.19], yo: [0.63, 0.27], ri: [0.8, 0.33], to: [0.49, 0.46] },
  cardYo: { yo: [0.54, 0.42], hands: [0.45, 0.6] }, cardNa: { na: [0.47, 0.47], shi: [0.29, 0.55] } };

/* ---------------------------------------------------------------- kaleidoscope */
export function kaleido(ctx, img, o = {}) {
  if (!img) return;
  const { cx = W / 2, cy = H / 2, n = 12, rot = 0, zoom = 1, fx = 0.5, fy = 0.5, R = 1500, a = 1 } = o;
  const wedge = TAU / n, s = (R / Math.min(img.width, img.height)) * zoom;
  ctx.save(); ctx.globalAlpha *= a;
  for (let k = 0; k < n; k++) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot + k * wedge); if (k % 2) ctx.scale(1, -1);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, -wedge / 2 - 0.006, wedge / 2 + 0.006); ctx.closePath(); ctx.clip();
    ctx.translate(R * 0.45 - fx * img.width * s, -fy * img.height * s);
    ctx.drawImage(img, 0, 0, img.width * s, img.height * s);
    ctx.restore();
  }
  ctx.restore();
}
// repeating tile wall from a tile image
export function tileWall(ctx, img, size, rot = 0, ox = 0, oy = 0, a = 1) {
  if (!img) return;
  const k = `tilepat|${img._k}|${size}`;
  let c = img[k];
  if (!c) { c = makeCanvas(size, size * img.height / img.width); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); img[k] = c; }
  ctx.save(); ctx.globalAlpha *= a;
  const p = ctx.createPattern(c, 'repeat'); p.setTransform(new DOMMatrix().translate(W / 2 + ox, H / 2 + oy).rotate(rot * 180 / Math.PI));
  ctx.fillStyle = p; ctx.fillRect(...OS); ctx.restore();
}

/* ---------------------------------------------------------------- ornaments */
// lace border (mask image tinted), repeated horizontally along y; flip for bottom edge
export function laceBorder(ctx, key, y, h, color = IV, a = 1, flip = false, ox = 0) {
  const m = IMG[key]; if (!m || a <= 0.003) return;
  const t = tinted(m, color), w = m.width * h / m.height;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, y); if (flip) { ctx.scale(1, -1); }
  for (let x = -((ox % w) + w) % w - w; x < W + w; x += w) ctx.drawImage(t, x, 0, w + 1, h);
  ctx.restore();
}
export function fringe(ctx, y, h, a = 1, ox = 0, sway = 0) {
  const m = IMG.m_fringe; if (!m || a <= 0.003) return;
  const w = m.width * h / m.height;
  ctx.save(); ctx.globalAlpha *= a;
  for (let x = -((ox % w) + w) % w - w; x < W + w; x += w) {
    ctx.save(); ctx.translate(x + w / 2, y); ctx.transform(1, 0, sway * 0.12, 1, 0, 0); ctx.drawImage(m, -w / 2, 0, w + 1, h); ctx.restore();
  }
  ctx.restore();
}
// a Met fan opening around its pivot (bottom centre of the cut-out)
export function fanOpen(ctx, img, cx, cy, h, p, o = {}) {
  if (!img || p <= 0) return;
  const s = h / img.height, w = img.width * s, py = o.pivot ?? 0.94;
  const ang = Math.PI * clamp(p);
  ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.translate(cx, cy); ctx.rotate(o.rot || 0);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, Math.hypot(w, h) * 1.1, Math.PI + (o.from ?? 0), Math.PI + (o.from ?? 0) + ang * (o.span ?? 1)); ctx.closePath(); ctx.clip();
  if (o.shadow !== false) { ctx.shadowColor = 'rgba(20,6,6,0.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12; }
  ctx.drawImage(img, -w / 2, -h * py, w, h);
  ctx.restore();
}
// object sticker (Met cut-out) with soft shadow
export function obj(ctx, img, cx, cy, h, o = {}) {
  if (!img || (o.a ?? 1) <= 0.003) return;
  const s = h / img.height, w = img.width * s;
  ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.translate(cx, cy); ctx.rotate(o.rot || 0); if (o.flip) ctx.scale(-1, 1);
  if (o.filter) ctx.filter = o.filter;
  if (o.shadow !== false) { ctx.shadowColor = `rgba(20,8,6,${o.shadowA ?? 0.45})`; ctx.shadowBlur = o.blur ?? 22; ctx.shadowOffsetX = 8; ctx.shadowOffsetY = 14; }
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}
// dish halo: a lustre dish slowly turning behind a head
export function halo(ctx, img, cx, cy, r, t, a = 1, speed = 0.05) {
  if (!img) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(t * speed);
  const s = (r * 2) / Math.max(img.width, img.height);
  ctx.shadowColor = 'rgba(10,4,4,0.5)'; ctx.shadowBlur = 40;
  ctx.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s);
  ctx.restore();
}
// swinging earrings (pair from a Met cut-out showing two earrings side by side)
export function earrings(ctx, img, cx, cy, h, t, a = 1) {
  if (!img) return;
  const half = img.width / 2, s = h / img.height;
  for (const k of [0, 1]) {
    const ang = Math.sin(t * 2.6 + k * 0.8) * 0.22;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx + (k - 0.5) * half * s * 1.25, cy - h / 2); ctx.rotate(ang);
    ctx.shadowColor = 'rgba(20,8,6,0.4)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 10;
    ctx.drawImage(img, k * half, 0, half, img.height, -half * s / 2, 0, half * s, h);
    ctx.restore();
  }
}
// polaroid that "develops": image starts milky and gains contrast/colour
export function develop(p) { const u = clamp(p); return `brightness(${lerp(1.9, 1, E.outCubic(u))}) contrast(${lerp(0.35, 1, u)}) saturate(${lerp(0.1, 1, u)}) sepia(${lerp(0.5, 0.08, u)})`; }
// shallow-depth-of-field foreground object (out of focus)
export function fgBlur(ctx, img, cx, cy, h, px = 10, a = 1, rot = 0) {
  if (!img) return;
  const b = blurred(img, px);
  const s = h / img.height, k = 1 / b._scale;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.drawImage(b, -img.width * s / 2 - b._pad * s, -h / 2 - b._pad * s, b.width * k * s, b.height * k * s);
  ctx.restore();
}
export function lightRays(ctx, cx, cy, R, rot, n, color, a) {
  if (a <= 0.003) return;
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= a;
  for (let k = 0; k < n; k++) {
    const an = rot + (k / n) * TAU + (hash(k, 9) - 0.5) * 0.2, w = 0.015 + 0.04 * hash(k, 5);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, rgba(color, 0.45)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, an - w, an + w); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
