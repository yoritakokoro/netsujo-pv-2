// Photographic shot engine: camera moves over graded photos, defocus, transitions
// (dissolve / defocus / fire-burn / whip / exposure flash) and a few compositing tools
// (kaleidoscope from a real tile photo, double exposure, cut-out characters with rim light).
import { W, H, TAU, P, clamp, lerp, inv, smooth, E, hash, noise1, makeCanvas } from './util.js';

export const IMG = {};
const pool = {};
function buf(name, w = W, h = H) {
  let c = pool[name];
  if (!c || c.width !== w || c.height !== h) { c = pool[name] = makeCanvas(w, h); }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  return [c, g];
}

// source rect for "cover" fit with zoom z and focus point (fx,fy in 0..1 of the image)
function coverRect(img, rect, z, fx, fy) {
  const [x, y, w, h] = rect;
  const s = Math.max(w / img.width, h / img.height) * z;
  const sw = w / s, sh = h / s;
  const sx = clamp(fx * img.width - sw / 2, 0, img.width - sw), sy = clamp(fy * img.height - sh / 2, 0, img.height - sh);
  return [sx, sy, sw, sh];
}
export function drawCover(ctx, img, rect, z = 1, fx = 0.5, fy = 0.5, rot = 0) {
  const [x, y, w, h] = rect;
  const [sx, sy, sw, sh] = coverRect(img, rect, z, fx, fy);
  if (rot) {
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.scale(1.04, 1.04);
    ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h); ctx.restore();
  } else ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
// defocused copy via a quarter-res blurred buffer (cheap, smooth)
export function drawBlur(ctx, img, rect, z, fx, fy, px, alpha = 1, rot = 0) {
  if (alpha <= 0.003) return;
  const [c, g] = buf('blur', W / 4, H / 4);
  g.clearRect(0, 0, c.width, c.height);
  g.filter = `blur(${Math.max(0.5, px / 4)}px)`;
  const [x, y, w, h] = rect;
  g.save(); g.scale(0.25, 0.25);
  // draw slightly larger to avoid dark blurred edges
  drawCover(g, img, [x - 40, y - 40, w + 80, h + 80], z, fx, fy, rot);
  g.restore(); g.filter = 'none';
  ctx.save(); ctx.globalAlpha *= alpha; ctx.imageSmoothingQuality = 'high';
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(c, 0, 0, W, H); ctx.restore();
}
// a photo with camera motion: o.z=[z0,z1], o.f=[[x,y],[x,y]], o.blur=[b0,b1] (0..1), o.rot=[r0,r1]
export function photo(ctx, img, t, a, b, o = {}) {
  const u = clamp((t - a) / Math.max(0.001, b - a));
  const e = (o.ease || E.inOutSine)(u);
  const z = o.z ? lerp(o.z[0], o.z[1], e) : 1.08;
  const f = o.f ? [lerp(o.f[0][0], o.f[1][0], e), lerp(o.f[0][1], o.f[1][1], e)] : [0.5, 0.5];
  const rot = o.rot ? lerp(o.rot[0], o.rot[1], e) : 0;
  let bl = 0;
  if (o.blur) bl = typeof o.blur === 'function' ? o.blur(t, u) : lerp(o.blur[0], o.blur[1], E.outCubic(clamp(u * (o.blurSpeed || 1))));
  const rect = o.rect || [0, 0, W, H];
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (bl < 0.98) drawCover(ctx, img, rect, z, f[0], f[1], rot);
  if (bl > 0.02) drawBlur(ctx, img, rect, z, f[0], f[1], 6 + bl * 60, Math.min(1, bl * 1.6), rot);
  ctx.restore();
}

// full-frame tints
export function tint(ctx, color, alpha, op = 'source-over') {
  if (alpha <= 0.003) return;
  ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore();
}
export function vshade(ctx, stops, op = 'source-over', alpha = 1) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
export function radial(ctx, cx, cy, r, stops, op = 'source-over', alpha = 1) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---------- transitions between two rendered frames (prev already on ctx, next drawn by fn) ----------
export function transition(ctx, kind, p, drawNext, opt = {}) {
  p = clamp(p);
  if (p <= 0) return;
  if (p >= 1 || kind === 'cut') { drawNext(ctx); return; }
  const [c, g] = buf('trans');
  g.clearRect(0, 0, W, H);
  drawNext(g);
  const e = E.inOutCubic(p);
  ctx.save();
  if (kind === 'dissolve') { ctx.globalAlpha = e; ctx.drawImage(c, 0, 0); }
  else if (kind === 'defocus') {
    // outgoing frame blurs out while the incoming frame resolves from blur
    const [c2, g2] = buf('blurA', W / 4, H / 4);
    g2.filter = `blur(${2 + Math.sin(p * Math.PI) * 10}px)`;
    g2.drawImage(ctx.canvas, 0, 0, W / 4, H / 4);
    ctx.globalAlpha = Math.sin(p * Math.PI) * 0.9; ctx.drawImage(c2, 0, 0, W, H);
    ctx.globalAlpha = 1;
    const [c3, g3] = buf('blurB', W / 4, H / 4);
    g3.filter = `blur(${(1 - p) * 10}px)`; g3.drawImage(c, 0, 0, W / 4, H / 4);
    ctx.globalAlpha = e; ctx.drawImage(c3, 0, 0, W, H);
    ctx.globalAlpha = E.inCubic(p); ctx.drawImage(c, 0, 0);
  } else if (kind === 'whip') {
    const dir = opt.dir || 1;
    const [c2, g2] = buf('whip', W / 4, H / 4);
    const sh = Math.sin(p * Math.PI);
    g2.filter = `blur(${sh * 14}px)`;
    g2.drawImage(p < 0.5 ? ctx.canvas : c, 0, 0, W / 4, H / 4);
    const off = (p < 0.5 ? -p : 1 - p) * dir * W * 0.35;
    ctx.globalAlpha = 1;
    if (p >= 0.5) ctx.drawImage(c, 0, 0);
    ctx.globalAlpha = sh; ctx.drawImage(c2, off, 0, W, H);
  } else if (kind === 'flash') {
    if (p > 0.45) { ctx.globalAlpha = 1; ctx.drawImage(c, 0, 0); }
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.pow(Math.sin(p * Math.PI), 1.5) * (opt.amount || 0.85);
    ctx.fillStyle = opt.color || '#ffe8c8'; ctx.fillRect(0, 0, W, H);
  } else if (kind === 'burn') {
    burn(ctx, c, p, opt.matte || IMG.matte_fire);
  } else { ctx.globalAlpha = e; ctx.drawImage(c, 0, 0); }
  ctx.restore();
}

// fire-burn: the incoming frame shows through where a fire photo's luminance exceeds a moving threshold
function burn(ctx, next, p, matteImg) {
  const mw = W / 2, mh = H / 2;
  const [m, mg] = buf('matte', mw, mh);
  // threshold the matte with brightness/contrast (black -> keep old, white -> show new)
  const k = 6; // contrast (edge hardness)
  const bright = 0.15 + p * 1.9;
  mg.filter = `grayscale(1) brightness(${bright}) contrast(${k})`;
  mg.drawImage(matteImg, 0, 0, mw, mh);
  mg.filter = 'none';
  // next * matte
  const [n, ng] = buf('burnN');
  ng.drawImage(next, 0, 0);
  ng.globalCompositeOperation = 'multiply'; ng.drawImage(m, 0, 0, W, H);
  // old * (1 - matte)
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.filter = 'invert(1)'; ctx.drawImage(m, 0, 0, W, H); ctx.filter = 'none';
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(n, 0, 0);
  // glowing burn edge: the fire photo itself, screened in, strongest mid-transition
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = Math.sin(p * Math.PI) * 0.85;
  ctx.drawImage(matteImg, 0, 0, W, H);
  ctx.restore();
}

// ---------- shot list runner ----------
// shots: [{a, b, draw(ctx,t,shot), tr:'cut'|'dissolve'|..., td: seconds (transition ends at a)}]
export function runShots(ctx, t, shots) {
  let i = -1;
  for (let k = 0; k < shots.length; k++) if (t >= shots[k].a) i = k;
  if (i < 0) i = 0;
  const s = shots[i], n = shots[i + 1];
  s.draw(ctx, t, s);
  if (n && n.tr && n.tr !== 'cut' && n.td) {
    const p = (t - (n.a - n.td)) / n.td;
    if (p > 0 && p < 1) transition(ctx, n.tr, p, g => n.draw(g, t, n), n.tro || {});
  }
  // short exposure kick right after a hard cut (feels like a camera flash on the beat)
  if (s.kick) {
    const k = Math.exp(-(t - s.a) * 9) * s.kick;
    tint(ctx, '#fff1dc', k * 0.55, 'screen');
  }
  return { cur: s, idx: i };
}

// ---------- kaleidoscope from a photo ----------
export function kaleido(ctx, img, t, n, cx, cy, R, rot, zoom, fx, fy, alpha = 1) {
  const wedge = TAU / n;
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let k = 0; k < n; k++) {
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot + k * wedge);
    if (k % 2) ctx.scale(1, -1);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, -wedge / 2 - 0.004, wedge / 2 + 0.004); ctx.closePath(); ctx.clip();
    const s = (R / img.width) * zoom;
    ctx.translate(-fx * img.width * s * 0.2, -fy * img.height * s * 0.5);
    ctx.drawImage(img, 0, -img.height * s / 2, img.width * s, img.height * s);
    ctx.restore();
  }
  ctx.restore();
}

// ---------- cut-out character with rim light & optional duotone ----------
export function silhouetteOf(img, color) {
  const key = '_sil' + color;
  if (img[key]) return img[key];
  const c = makeCanvas(img.width, img.height), g = c.getContext('2d');
  g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  img[key] = c; return c;
}
export function cutout(ctx, img, cx, cy, h, o = {}) {
  const s = h / img.height, w = img.width * s;
  const x = cx - w / 2, y = cy - h / 2;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.flip) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
  if (o.glow) { // soft outer glow / rim from behind
    const sil = silhouetteOf(img, o.glow);
    ctx.save(); ctx.filter = `blur(${o.glowBlur || 18}px)`; ctx.globalAlpha *= o.glowAlpha ?? 0.8;
    ctx.drawImage(sil, x - (o.rimDx || 0), y - (o.rimDy || 0), w, h); ctx.restore();
  }
  ctx.drawImage(img, x, y, w, h);
  if (o.tint) { // light wrap: colour only where the character is
    const [c, g] = buf('cut', Math.ceil(w), Math.ceil(h));
    g.clearRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, w, h);
    g.globalCompositeOperation = 'source-atop'; g.globalAlpha = o.tint[1];
    if (o.tint[2]) { // gradient light from one side
      const gr = g.createLinearGradient(o.tint[2] > 0 ? w : 0, 0, o.tint[2] > 0 ? 0 : w, 0);
      gr.addColorStop(0, o.tint[0]); gr.addColorStop(0.6, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
    } else g.fillStyle = o.tint[0];
    g.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = o.tintOp || 'source-over';
    ctx.drawImage(c, x, y);
  }
  ctx.restore();
}

// ---------- particles that read as photographic (soft, few) ----------
let glowCache = {};
export function softDot(color, size = 64) {
  const k = color + size;
  if (glowCache[k]) return glowCache[k];
  const c = makeCanvas(size, size), g = c.getContext('2d'), r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, color); gr.addColorStop(0.35, color.replace(/,\s*[\d.]+\)$/, ',0.35)')); gr.addColorStop(1, color.replace(/,\s*[\d.]+\)$/, ',0)'));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return (glowCache[k] = c);
}
export function embers(ctx, t, n, seed, o = {}) {
  const { alpha = 1, speed = 90, size = 1, rect = [0, 0, W, H], color = 'rgba(255,150,60,1)' } = o;
  if (alpha <= 0.003) return;
  const [x0, y0, w, h] = rect, img = softDot(color);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sp = speed * (0.5 + hash(i, seed)), life = (h + 120) / sp, ph = hash(i, seed + 1) * life;
    const u = ((t + ph) % life) / life;
    const y = y0 + h + 60 - u * (h + 120);
    const x = x0 + hash(i, seed + 2) * w + noise1(t * 0.6 + i * 1.7, seed) * 60 + Math.sin(t * 1.3 + i) * 12;
    const fl = 0.6 + 0.4 * noise1(t * 6 + i, seed + 3);
    const s = size * (3 + hash(i, seed + 4) * 7) * (hash(i, seed + 5) < 0.12 ? 2.5 : 1);
    ctx.globalAlpha = alpha * fl * Math.sin(u * Math.PI);
    ctx.drawImage(img, x - s, y - s, s * 2, s * 2);
  }
  ctx.restore();
}
// floating bokeh discs (out-of-focus lights)
export function bokeh(ctx, t, n, seed, o = {}) {
  const { alpha = 1, colors = ['rgba(255,200,140,1)'], size = 1, drift = 10 } = o;
  if (alpha <= 0.003) return;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const x = (hash(i, seed) * (W + 200) - 100 + t * drift * (hash(i, seed + 9) - 0.5) * 2 + W * 3) % (W + 200) - 100;
    const y = hash(i, seed + 1) * H + Math.sin(t * 0.4 + i) * 20;
    const r = size * (30 + hash(i, seed + 2) * 90);
    const c = colors[i % colors.length];
    ctx.globalAlpha = alpha * (0.15 + 0.25 * hash(i, seed + 3)) * (0.7 + 0.3 * Math.sin(t * 0.7 + i * 2));
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// star glints that twinkle on top of a night photo
export function glints(ctx, t, pts, alpha = 1, beat = null) {
  if (alpha <= 0.003) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  pts.forEach(([x, y, s], i) => {
    const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + (i % 5) * 0.4) + i * 1.9);
    ctx.globalAlpha = alpha * tw;
    const L = 26 * s * (0.6 + tw * 0.6);
    const g = ctx.createLinearGradient(x - L, y, x + L, y);
    g.addColorStop(0, 'rgba(255,240,220,0)'); g.addColorStop(0.5, 'rgba(255,248,235,0.9)'); g.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.fillStyle = g; ctx.fillRect(x - L, y - 0.8, L * 2, 1.6);
    const g2 = ctx.createLinearGradient(x, y - L * 0.7, x, y + L * 0.7);
    g2.addColorStop(0, 'rgba(255,240,220,0)'); g2.addColorStop(0.5, 'rgba(255,248,235,0.8)'); g2.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.fillStyle = g2; ctx.fillRect(x - 0.7, y - L * 0.7, 1.4, L * 1.4);
    ctx.drawImage(softDot('rgba(255,236,210,1)', 32), x - 6 * s, y - 6 * s, 12 * s, 12 * s);
  });
  ctx.restore();
}
// rising smoke from a point (procedural, layered soft blobs drifting with noise)
export function smoke(ctx, t, x, y, t0, alpha = 1, scale = 1) {
  const u = t - t0;
  if (u <= 0 || alpha <= 0.003) return;
  const img = softDot('rgba(235,225,225,1)', 128);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 70; i++) {
    const born = i * 0.05;
    const age = u - born;
    if (age <= 0 || age > 3.4) continue;
    const yy = y - age * 95 * scale;
    const xx = x + noise1(age * 0.9 + i * 0.13, 7) * age * 55 * scale + Math.sin(age * 2.2 + i * 0.5) * 10 * age * scale;
    const r = (6 + age * 26) * scale;
    ctx.globalAlpha = alpha * 0.16 * Math.max(0, 1 - age / 3.4) * Math.min(1, age * 3);
    ctx.drawImage(img, xx - r, yy - r, r * 2, r * 2);
  }
  ctx.restore();
}

// feathered copies (cached) — soft circular or vertical alpha masks
export function feather(img, kind = 'circle', a = 0.32, b = 0.5) {
  const key = '_f' + kind + a + b;
  if (img[key]) return img[key];
  const c = makeCanvas(img.width, img.height), g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  let gr;
  if (kind === 'circle') {
    const r = Math.min(img.width, img.height);
    gr = g.createRadialGradient(img.width / 2, img.height / 2, r * a, img.width / 2, img.height / 2, r * b);
  } else {
    gr = g.createLinearGradient(0, 0, 0, img.height);
  }
  gr.addColorStop(0, 'rgba(0,0,0,' + (kind === 'top' ? 0 : 1) + ')');
  if (kind === 'top') { gr.addColorStop(a, 'rgba(0,0,0,1)'); }
  gr.addColorStop(1, 'rgba(0,0,0,' + (kind === 'circle' ? 0 : 1) + ')');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  img[key] = c; return c;
}

// draw something through a vertical alpha ramp (screen space), e.g. fire rising from the bottom
export function vmask(ctx, y0, y1, draw, op = 'source-over', alpha = 1) {
  const [c, g] = buf('vmask');
  g.clearRect(0, 0, W, H);
  draw(g);
  g.globalCompositeOperation = 'destination-in';
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha; ctx.drawImage(c, 0, 0); ctx.restore();
}
