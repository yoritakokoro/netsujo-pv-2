// v3 graphics toolkit: member colours, character compositing (shadow / rim / light wrap),
// masks (fan, arch, circle, slats), graphic backgrounds, light, particles.
import { W, H, TAU, clamp, lerp, inv, smooth, E, hash, noise1, makeCanvas } from './util.js';

export const IMG = {};
export const MEM = {
  yo: { name: 'YOSHINO', jp: '依田芳乃', cv: '高田憂希', ink: '#d0213f', deep: '#4a0716', light: '#ffb3c0' },
  na: { name: 'NAGI', jp: '久川凪', cv: '立花日菜', ink: '#f2a516', deep: '#5a3600', light: '#ffe2a0' },
  shi: { name: 'SHIN', jp: '佐藤心', cv: '花守ゆみり', ink: '#ff5c9d', deep: '#5a0f35', light: '#ffc6dd' },
  to: { name: 'TOMOE', jp: '村上巴', cv: '花井美春', ink: '#ff5a26', deep: '#5c1606', light: '#ffc2a6' },
  ri: { name: 'RIAMU', jp: '夢見りあむ', cv: '星希成奏', ink: '#1fb8b8', deep: '#073f45', light: '#a8eeee' },
};
export const ORDER = ['yo', 'na', 'shi', 'to', 'ri'];

const pool = {};
export function buf(name, w = W, h = H) {
  let c = pool[name];
  if (!c || c.width !== w || c.height !== h) c = pool[name] = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.clearRect(0, 0, w, h);
  return [c, g];
}
const cache = new Map();
export const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };

/* ---------- basic drawing ---------- */
export function fill(ctx, c, a = 1, op) { if (a <= 0.003) return; ctx.save(); if (op) ctx.globalCompositeOperation = op; ctx.globalAlpha *= a; ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.restore(); }
export function vgrad(ctx, stops, a = 1, op, rect = [0, 0, W, H]) {
  const g = ctx.createLinearGradient(0, rect[1], 0, rect[1] + rect[3]); stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.save(); if (op) ctx.globalCompositeOperation = op; ctx.globalAlpha *= a; ctx.fillStyle = g; ctx.fillRect(...rect); ctx.restore();
}
export function lgrad(ctx, x0, y0, x1, y1, stops, a = 1, op) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.save(); if (op) ctx.globalCompositeOperation = op; ctx.globalAlpha *= a; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
export function rgrad(ctx, cx, cy, r, stops, a = 1, op) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.save(); if (op) ctx.globalCompositeOperation = op; ctx.globalAlpha *= a; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
export const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

// draw an image so that it covers rect, zoom z, focus fx/fy (0..1 in image space)
export function cover(ctx, img, rect, z = 1, fx = 0.5, fy = 0.5, a = 1) {
  if (a <= 0.003) return;
  const [x, y, w, h] = rect;
  const s = Math.max(w / img.width, h / img.height) * z, sw = w / s, sh = h / s;
  const sx = clamp(fx * img.width - sw / 2, 0, img.width - sw), sy = clamp(fy * img.height - sh / 2, 0, img.height - sh);
  ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h); ctx.restore();
}
// image placed by centre & height (keeps aspect)
export function place(ctx, img, cx, cy, h, o = {}) {
  const { a = 1, rot = 0, flip = false, op = null, filter = null, sx = 1 } = o;
  if (a <= 0.003 || !img) return;
  const s = h / img.height, w = img.width * s;
  ctx.save(); if (op) ctx.globalCompositeOperation = op; if (filter) ctx.filter = filter;
  ctx.globalAlpha *= a; ctx.translate(cx, cy); if (rot) ctx.rotate(rot); ctx.scale((flip ? -1 : 1) * sx, 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
}

/* ---------- tinted copies ---------- */
let uid = 0;
const idOf = img => img._k || img.src || (img._k = 'anon' + ++uid);
export function tinted(img, color, key = '') {
  const k = `tint|${idOf(img)}|${color}|${key}`;
  return memo(k, () => {
    const c = makeCanvas(img.width, img.height), g = c.getContext('2d');
    g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    c._k = k; return c;
  });
}
// duotone: dark->light mapping of an image's luminance (keeps alpha)
export function duo(img, dark, light, key = '') {
  const dk = `duo|${idOf(img)}|${dark}|${light}|${key}`;
  return memo(dk, () => {
    const s = Math.min(1, 1400 / Math.max(img.width, img.height));
    const c = makeCanvas(img.width * s, img.height * s), g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
    const p = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const c0 = p(dark), c1 = p(light);
    for (let i = 0; i < a.length; i += 4) {
      let l = (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11) / 255; l = l * l * (3 - 2 * l);
      a[i] = c0[0] + (c1[0] - c0[0]) * l; a[i + 1] = c0[1] + (c1[1] - c0[1]) * l; a[i + 2] = c0[2] + (c1[2] - c0[2]) * l;
    }
    g.putImageData(d, 0, 0); c._k = dk; return c;
  });
}
export function blurred(img, px, key = '') {
  const bk = `blur|${idOf(img)}|${px}|${key}`;
  return memo(bk, () => {
    const s = Math.min(1, 900 / Math.max(img.width, img.height));
    const pad = Math.ceil(px * 2);
    const c = makeCanvas(img.width * s + pad * 2, img.height * s + pad * 2), g = c.getContext('2d');
    g.filter = `blur(${px}px)`; g.drawImage(img, pad, pad, img.width * s, img.height * s);
    c._pad = pad / s; c._scale = s; c._k = bk; return c;
  });
}
function silhouette(img, color) { return tinted(img, color, 'sil'); }

/* ---------- character compositing ---------- */
// o: {h, a, flip, rot, shadow:{dx,dy,blur,a}, rim:{color,a}, wrap:{color,a,side}, glow:{color,blur,a}}
export function character(ctx, img, cx, cy, h, o = {}) {
  if (!img || (o.a ?? 1) <= 0.003) return;
  const s = h / img.height, w = img.width * s;
  ctx.save();
  ctx.globalAlpha *= o.a ?? 1;
  ctx.translate(cx, cy); if (o.rot) ctx.rotate(o.rot); if (o.flip) ctx.scale(-1, 1);
  if (o.glow) {
    const b = blurred(silhouette(img, o.glow.color), o.glow.blur || 24);
    const k = 1 / b._scale;
    ctx.save(); ctx.globalCompositeOperation = o.glow.op || 'screen'; ctx.globalAlpha *= o.glow.a ?? 0.8;
    ctx.drawImage(b, -w / 2 - b._pad * s, -h / 2 - b._pad * s, b.width * k * s, b.height * k * s); ctx.restore();
  }
  if (o.shadow) {
    const sh = o.shadow, b = blurred(silhouette(img, sh.color || '#000'), sh.blur || 16);
    const k = 1 / b._scale;
    ctx.save(); ctx.globalAlpha *= sh.a ?? 0.45;
    ctx.drawImage(b, -w / 2 - b._pad * s + (sh.dx || 0), -h / 2 - b._pad * s + (sh.dy || 0), b.width * k * s, b.height * k * s); ctx.restore();
  }
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  if (o.wrap) { // light wrap: coloured light from one side, only on the character
    const [c, g] = buf('wrap', Math.ceil(w), Math.ceil(h));
    g.drawImage(img, 0, 0, w, h);
    g.globalCompositeOperation = 'source-atop';
    const side = o.wrap.side ?? 1;
    const gr = g.createLinearGradient(side > 0 ? w : 0, 0, side > 0 ? w * 0.35 : w * 0.65, 0);
    gr.addColorStop(0, o.wrap.color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    ctx.save(); ctx.globalCompositeOperation = o.wrap.op || 'screen'; ctx.globalAlpha *= o.wrap.a ?? 0.6;
    ctx.drawImage(c, -w / 2, -h / 2); ctx.restore();
  }
  if (o.grade) { // colour grade restricted to the character (e.g. night / dawn light)
    const [c, g] = buf('grade', Math.ceil(w), Math.ceil(h));
    g.drawImage(img, 0, 0, w, h); g.globalCompositeOperation = 'source-atop'; g.fillStyle = o.grade.color; g.fillRect(0, 0, w, h);
    ctx.save(); ctx.globalCompositeOperation = o.grade.op || 'multiply'; ctx.globalAlpha *= o.grade.a ?? 0.3;
    ctx.drawImage(c, -w / 2, -h / 2); ctx.restore();
  }
  ctx.restore();
}

/* ---------- masks ---------- */
export function withMask(ctx, path, draw) { ctx.save(); ctx.beginPath(); path(ctx); ctx.clip(); draw(ctx); ctx.restore(); }
export function fanPath(cx, cy, r0, r1, a0, a1) {
  return ctx => { ctx.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0); ctx.arc(cx, cy, r1, a0, a1); ctx.arc(cx, cy, r0, a1, a0, true); ctx.closePath(); };
}
export function archPath(x, bottom, w, h) {
  const r = w / 2, beta = 0.38, cy = bottom - h + r;
  return ctx => { ctx.moveTo(x - r * Math.cos(beta), bottom); ctx.lineTo(x - r * Math.cos(beta), cy + r * Math.sin(beta)); ctx.arc(x, cy, r, Math.PI - beta, TAU + beta); ctx.lineTo(x + r * Math.cos(beta), bottom); ctx.closePath(); };
}
export function circlePath(x, y, r) { return ctx => ctx.arc(x, y, Math.max(0.1, r), 0, TAU); }
export function rectPath(x, y, w, h, sk = 0) { return ctx => { ctx.moveTo(x + sk, y); ctx.lineTo(x + w + sk, y); ctx.lineTo(x + w - sk, y + h); ctx.lineTo(x - sk, y + h); ctx.closePath(); }; }

/* ---------- graphic backgrounds ---------- */
// sunburst of alternating wedges, very subtle by default
export function sunburst(ctx, cx, cy, rot, n, c1, c2, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  for (let k = 0; k < n; k++) {
    const a0 = rot + (k / n) * TAU, a1 = a0 + TAU / n;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 2600, a0, a1); ctx.closePath(); ctx.fillStyle = k % 2 ? c1 : c2; ctx.fill();
  }
  ctx.restore();
}
// fine gold line rings
export function rings(ctx, cx, cy, radii, color, lw = 1.2, a = 1, dash = null) {
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = lw; if (dash) ctx.setLineDash(dash);
  radii.forEach(r => { ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.1, r), 0, TAU); ctx.stroke(); });
  ctx.restore();
}
// Nasrid eight-point star lattice drawn as thin lines
export function lattice(ctx, t, color, a = 0.2, size = 160, rot = 0, ox = 0, oy = 0) {
  const tile = memo(`lat|${color}|${size}`, () => {
    const c = makeCanvas(size, size), g = c.getContext('2d'), s = size; g.strokeStyle = color; g.lineWidth = 1.2;
    const star = (x, y, r) => { for (const ro of [0, Math.PI / 4]) { g.save(); g.translate(x, y); g.rotate(ro); g.strokeRect(-r, -r, r * 2, r * 2); g.restore(); } };
    for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s], [s / 2, s / 2]]) { star(x, y, s * 0.2); g.beginPath(); g.arc(x, y, s * 0.09, 0, TAU); g.stroke(); }
    g.beginPath(); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.globalAlpha = 0.35; g.stroke();
    return c;
  });
  ctx.save(); ctx.globalAlpha *= a;
  const pat = ctx.createPattern(tile, 'repeat');
  pat.setTransform(new DOMMatrix().translate(W / 2 + ox, H / 2 + oy).rotate(rot * 180 / Math.PI));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// halftone dot gradient band (graphic, procedural)
export function dots(ctx, color, spacing, fn, a = 1, rect = [0, 0, W, H]) {
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.beginPath();
  const [x0, y0, w, h] = rect;
  for (let y = y0; y < y0 + h + spacing; y += spacing) {
    const row = Math.round((y - y0) / spacing);
    for (let x = x0 + (row % 2 ? spacing / 2 : 0); x < x0 + w + spacing; x += spacing) {
      const r = spacing * 0.5 * clamp(fn(x, y)); if (r > 0.35) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
    }
  }
  ctx.fill(); ctx.restore();
}
// ink-tinted mask image (white+alpha PNG) drawn in a colour
export function ink(ctx, mask, color, rect, z = 1, fx = 0.5, fy = 0.5, a = 1, op = null) {
  if (a <= 0.003 || !mask) return;
  ctx.save(); if (op) ctx.globalCompositeOperation = op;
  cover(ctx, tinted(mask, color), rect, z, fx, fy, a); ctx.restore();
}

/* ---------- light & particles ---------- */
export function softDot(color, size = 64) {
  return memo(`dot|${color}|${size}`, () => {
    const c = makeCanvas(size, size), g = c.getContext('2d'), r = size / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, rgba(color, 1)); gr.addColorStop(0.3, rgba(color, 0.45)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
  });
}
export function glow(ctx, x, y, r, color, a = 1) { if (a <= 0.003) return; ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= a; ctx.drawImage(softDot(color, 256), x - r, y - r, r * 2, r * 2); ctx.restore(); }
export function sparkle(ctx, x, y, s, a = 1, color = '#fff4e0') {
  if (a <= 0.003) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= a; ctx.translate(x, y);
  const L = 26 * s;
  for (const [lx, ly, w] of [[L, 0, 1.4], [0, L * 0.75, 1.2]]) {
    const g = ctx.createLinearGradient(-lx, -ly, lx, ly);
    g.addColorStop(0, 'rgba(255,240,220,0)'); g.addColorStop(0.5, 'rgba(255,250,240,0.95)'); g.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.strokeStyle = g; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(-lx, -ly); ctx.lineTo(lx, ly); ctx.stroke();
  }
  ctx.drawImage(softDot(color, 48), -7 * s, -7 * s, 14 * s, 14 * s);
  ctx.restore();
}
export function stars(ctx, t, n, seed, rect, a = 1) {
  if (a <= 0.003) return;
  const [x0, y0, w, h] = rect;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const d = softDot('#fff2e0', 16);
  for (let i = 0; i < n; i++) {
    const x = x0 + hash(i, seed) * w, y = y0 + Math.pow(hash(i, seed + 1), 1.4) * h;
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash(i, seed + 2) * 3) + i);
    const s = 1.5 + hash(i, seed + 3) * 3.5;
    ctx.globalAlpha = a * (0.35 + 0.65 * tw);
    ctx.drawImage(d, x - s, y - s, s * 2, s * 2);
  }
  ctx.restore();
  for (let i = 0; i < Math.round(n / 25); i++) sparkle(ctx, x0 + hash(i, seed + 7) * w, y0 + hash(i, seed + 8) * h * 0.8, 0.5 + hash(i, seed + 9) * 0.6, a * (0.5 + 0.5 * Math.sin(t * 2 + i * 2)));
}
export function embers(ctx, t, n, seed, o = {}) {
  const { a = 1, speed = 90, size = 1, rect = [0, 0, W, H], color = '#ff9a3c' } = o;
  if (a <= 0.003) return;
  const [x0, y0, w, h] = rect, img = softDot(color, 32);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sp = speed * (0.5 + hash(i, seed)), life = (h + 120) / sp, ph = hash(i, seed + 1) * life;
    const u = ((t + ph) % life) / life, y = y0 + h + 60 - u * (h + 120);
    const x = x0 + hash(i, seed + 2) * w + noise1(t * 0.6 + i * 1.7, seed) * 50;
    const s = size * (2.5 + hash(i, seed + 4) * 6);
    ctx.globalAlpha = a * Math.sin(u * Math.PI) * (0.6 + 0.4 * noise1(t * 6 + i, seed + 3));
    ctx.drawImage(img, x - s, y - s, s * 2, s * 2);
  }
  ctx.restore();
}
// falling petals using a real petal cut-out, tinted variations
export function petals(ctx, t, n, seed, o = {}) {
  const { a = 1, speed = 70, size = 1, wind = 40, tint: tintCol = null, rect = [0, 0, W, H] } = o;
  if (a <= 0.003 || !IMG.obj_b2_drop) return;
  const base = tintCol ? duo(IMG.obj_b2_drop, '#3a0010', tintCol, 'pet') : IMG.obj_b2_drop;
  const [x0, y0, w, h] = rect;
  ctx.save(); ctx.globalAlpha *= a;
  for (let i = 0; i < n; i++) {
    const sp = speed * (0.6 + hash(i, seed) * 0.8), life = (h + 300) / sp, ph = hash(i, seed + 1) * life;
    const u = ((t + ph) % life) / life, y = y0 - 150 + u * (h + 300);
    const x = x0 + ((hash(i, seed + 2) * w + wind * (t + ph) + Math.sin(t + i) * 40) % (w + 300) + w + 300) % (w + 300) - 150;
    const sz = size * (40 + hash(i, seed + 3) * 60), spin = t * (0.6 + hash(i, seed + 4)) + i;
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin); ctx.scale(Math.cos(spin * 1.3), 1);
    const s = sz / base.width; ctx.drawImage(base, -base.width * s / 2, -base.height * s / 2, base.width * s, base.height * s);
    ctx.restore();
  }
  ctx.restore();
}
export function bokeh(ctx, t, n, seed, colors, a = 1, size = 1) {
  if (a <= 0.003) return;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const x = (hash(i, seed) * (W + 300) - 150 + t * 12 * (hash(i, seed + 9) - 0.5) + W * 4) % (W + 300) - 150;
    const y = hash(i, seed + 1) * H + Math.sin(t * 0.4 + i) * 20, r = size * (25 + hash(i, seed + 2) * 80);
    ctx.globalAlpha = a * (0.12 + 0.2 * hash(i, seed + 3));
    ctx.fillStyle = colors[i % colors.length]; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// light leak sweeps
export function leak(ctx, t, color, x, y, r, a = 1) {
  glow(ctx, x + noise1(t * 0.3, 5) * 120, y + noise1(t * 0.25, 6) * 80, r, color, a);
}
