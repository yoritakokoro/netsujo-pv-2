// Background scenes, one per musical section. Each draw(ctx, t) is a pure function of time.
import { W, H, TAU, P, clamp, lerp, inv, smooth, win, E, ease, hash, noise1, hexA, mixHex, makeCanvas } from './util.js';
import { T, barT, beatT, beatF, barF, pulse, tresillo } from './timing.js';
import * as fx from './fx.js';
import { F, font, drawText, label, measure } from './text.js';
import { drawChant } from './lyrics.js';

export const A = {}; // images, filled in by main.js

/* ------------------------------------------------------------------ helpers */
function fill(ctx, c) { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }
function vgrad(ctx, stops, y0 = 0, y1 = H, rect = [0, 0, W, H]) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g; ctx.fillRect(...rect);
}
function rgrad(ctx, cx, cy, r, stops) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function flash(ctx, a, color = '#fff6e8') { if (a > 0.003) { ctx.save(); ctx.globalAlpha = clamp(a); fill(ctx, color); ctx.restore(); } }
const hitFlash = (t, at, dur = 0.35) => (t >= at ? Math.exp(-(t - at) / dur * 4) * (t - at < dur * 2 ? 1 : 0) : 0);
function beatsIn(a, b, every = 1) { const out = []; for (let k = Math.ceil(beatF(a) / every) * every; beatT(k) < b; k += every) out.push(beatT(k)); return out; }

// image clipped to a circle with gold ring + rotating polka-dot halo
function coverDisc(ctx, t, img, cx, cy, R, zoom, fxp, fyp, alpha = 1, ring = P.gold2) {
  if (alpha <= 0.003 || R <= 1) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  fx.coverImage(ctx, img, [cx - R, cy - R, R * 2, R * 2], zoom, fxp, fyp);
  ctx.restore();
  ctx.strokeStyle = ring; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, R + 10, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R + 22, 0, TAU); ctx.stroke();
  ctx.fillStyle = ring;
  const n = 48, rot = t * 0.15;
  for (let k = 0; k < n; k++) {
    const a = rot + (k / n) * TAU, rr = R + 44, s = k % 2 ? 4 : 7;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, s, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// image inside a horseshoe arch, with Cordoba voussoirs
function archImage(ctx, t, img, x, bottom, w, h, prog, zoom, fxp, fyp, o = {}) {
  if (prog <= 0) return;
  const { band = 44, ca = P.crimson, cb = P.ivory, vprog = prog, line = P.gold2, beta = 0.42 } = o;
  const hh = h * E.outExpo(prog);
  ctx.save();
  ctx.beginPath(); const { cy, r } = fx.archPath(ctx, x, bottom, w, Math.max(w * 0.55, hh), beta);
  ctx.save(); ctx.clip();
  ctx.beginPath(); ctx.rect(x - w, bottom - hh, w * 2, hh); ctx.clip();
  fx.coverImage(ctx, img, [x - w / 2, bottom - h, w, h], zoom, fxp, fyp);
  ctx.restore();
  if (vprog > 0) {
    ctx.save(); ctx.globalAlpha *= clamp(vprog * 1.5);
    fx.voussoirs(ctx, x, cy, r, band, beta, 19, ca, cb, vprog);
    ctx.strokeStyle = line; ctx.lineWidth = 2;
    ctx.beginPath(); fx.archPath(ctx, x, bottom, w, Math.max(w * 0.55, hh), beta); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, cy, r + band + 10, Math.PI - beta, TAU + beta); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
// parallelogram panel with image crop
function skewPanel(ctx, img, x, y, w, h, sk, zoom, fxp, fyp, alpha = 1, stroke = P.gold2) {
  if (alpha <= 0.003) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.beginPath(); ctx.moveTo(x + sk, y); ctx.lineTo(x + w + sk, y); ctx.lineTo(x + w - sk, y + h); ctx.lineTo(x - sk, y + h); ctx.closePath();
  ctx.save(); ctx.clip(); fx.coverImage(ctx, img, [x - Math.abs(sk), y, w + Math.abs(sk) * 2, h], zoom, fxp, fyp); ctx.restore();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
  ctx.restore();
}
function cutout(ctx, img, x, y, hgt, alpha = 1, flip = false, rot = 0) {
  if (alpha <= 0.003) return;
  const s = hgt / img.height;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(flip ? -s : s, s);
  ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
}
// silk waves flood (crimson fabric)
function silk(ctx, t, edge, cols, alpha = 1, dir = 1) {
  if (alpha <= 0.003) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let k = 0; k < cols.length; k++) {
    const y0 = edge + k * 70 * dir;
    ctx.beginPath(); ctx.moveTo(0, dir > 0 ? H + 10 : -10);
    for (let x = 0; x <= W + 40; x += 40) {
      const y = y0 + Math.sin(x * 0.0035 + t * 1.4 + k * 0.9) * 46 + Math.sin(x * 0.009 - t * 0.9 + k) * 14;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W + 40, dir > 0 ? H + 10 : -10); ctx.closePath();
    ctx.fillStyle = cols[k]; ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = 'rgba(255,170,170,0.18)'; ctx.lineWidth = 10; ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
function marquee(ctx, t, s, y, size, speed, color, fam = F.cinzel, weight = 700, outline = true, alpha = 1) {
  if (alpha <= 0.003) return;
  const fs = font(fam, size, weight), w = measure(fs, s) + size;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = fs; ctx.textBaseline = 'middle';
  let x = -(((t * speed) % w) + w) % w;
  for (; x < W; x += w) {
    if (outline) { ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeText(s, x, y); } else { ctx.fillStyle = color; ctx.fillText(s, x, y); }
  }
  ctx.restore();
}
function strings(ctx, t, y0, gap, color, amp, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color;
  for (let s = 0; s < 6; s++) {
    ctx.lineWidth = 1 + s * 0.35;
    const a = amp * tresillo(t + s * 0.02, 5) * (0.6 + s * 0.1);
    ctx.beginPath();
    for (let x = 0; x <= W; x += 16) {
      const y = y0 + s * gap + Math.sin((x / W) * Math.PI) * Math.sin(x * 0.05 + t * 40 + s) * a;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}
function tickRing(ctx, t, cx, cy, R, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.translate(cx, cy);
  const step = Math.floor(beatF(t));
  ctx.rotate((step * TAU) / 60 + E.outExpo(beatF(t) - step) * (TAU / 60));
  for (let k = 0; k < 60; k++) {
    ctx.lineWidth = k % 5 ? 1.5 : 4;
    const a = (k / 60) * TAU, r0 = k % 5 ? R - 14 : R - 34;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke();
  }
  ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, R + 16, 0, TAU); ctx.stroke();
  ctx.restore();
}
function bell(ctx, x, y, s, rot, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-8, -110); ctx.lineTo(8, -110); ctx.lineTo(8, -95);
  ctx.bezierCurveTo(50, -92, 58, -40, 62, 10); ctx.bezierCurveTo(66, 40, 80, 52, 92, 60);
  ctx.lineTo(-92, 60); ctx.bezierCurveTo(-80, 52, -66, 40, -62, 10); ctx.bezierCurveTo(-58, -40, -50, -92, -8, -95); ctx.closePath();
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-70, 30); ctx.lineTo(70, 30); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 78, 14, 0, TAU); ctx.stroke();
  ctx.restore();
}
function sunRays(ctx, cx, cy, R, rot, n, color, alpha) {
  if (alpha <= 0.003) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= alpha;
  for (let k = 0; k < n; k++) {
    const a = rot + (k / n) * TAU + (hash(k, 9) - 0.5) * 0.12, w = 0.012 + 0.05 * hash(k, 5) * hash(k, 6);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, hexA(color, 0.5)); g.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a - w, a + w); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// blooming roses scattered in a field
function roseField(ctx, t, t0, n, seed, pals, alpha = 1, sizeMul = 1) {
  for (let i = 0; i < n; i++) {
    const at = t0 + hash(i, seed) * 3.5;
    const p = clamp((t - at) / 1.2);
    if (p <= 0) continue;
    const x = 60 + hash(i, seed + 1) * (W - 120), y = 60 + hash(i, seed + 2) * (H - 120);
    const R = (40 + hash(i, seed + 3) * 90) * sizeMul;
    const spr = fx.roseSprite(pals[i % pals.length], (i % 4) + 1);
    fx.draw(ctx, spr, x, y, (R * 2.4 / spr.width) * E.outBack(p), t * 0.1 + hash(i, seed + 4) * TAU, alpha * clamp(p * 3));
  }
}
const FACES = { nagi: [0.2, 0.33], shin: [0.39, 0.17], yoshino: [0.63, 0.25], riamu: [0.82, 0.34], tomoe: [0.49, 0.45] };

/* ------------------------------------------------------------------ scenes */
function sOpen(ctx, t) {
  fill(ctx, P.ink);
  rgrad(ctx, W / 2, H / 2, 900, [[0, '#1c0f1c'], [1, P.ink]]);
  fx.stars(ctx, t, 90, 41, [0, 0, W, H], 0.5 * smooth(0, 0.8, t), 0.02, '#ffe2a8');
  const p = E.outExpo(inv(0.15, 1.3, t));
  ctx.save(); ctx.strokeStyle = hexA(P.gold2, 0.9); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(960 - 640 * p, 540); ctx.lineTo(960 + 640 * p, 540); ctx.stroke();
  ctx.fillStyle = P.gold2; ctx.translate(960, 540); ctx.rotate(Math.PI / 4); ctx.fillRect(-5 * p, -5 * p, 10 * p, 10 * p); ctx.restore();
  label(ctx, 'THE IDOLM@STER CINDERELLA GIRLS', 960, 500, { fam: F.cinzel, size: 20, weight: 600, color: hexA(P.champagne, 0.9), track: 0.42, align: 'center', alpha: smooth(0.35, 0.9, t) });
  label(ctx, 'Passion jewelries! 004', 960, 584, { fam: F.corm, size: 32, weight: 500, italic: true, color: hexA(P.gold2, 0.95), track: 0.08, align: 'center', alpha: smooth(0.55, 1.1, t) });
}

const CHANT = [
  { s: 1.62, bg: [P.crimson, P.carmine] },
  { s: 3.58, bg: ['#120a14', '#0b0710'] },
  { s: 5.50, bg: ['#f3e3c8', '#e9d3b0'] },
  { s: 7.48, bg: [P.flame, '#d8401a'] },
];
function chantBlock(ctx, t, k) {
  const b = CHANT[k];
  if (k === 0) {
    fill(ctx, b.bg[0]); rgrad(ctx, 960, 540, 1100, [[0, hexA('#d41a3a', 1)], [1, hexA(P.carmine, 1)]]);
    fx.fillPattern(ctx, fx.dotTile(P.champagne, 90, 11), 0.14, 1, 0, t * 40, t * 18);
    fx.drawFan(ctx, { cx: 1700, cy: 1080, R: 420, a0: Math.PI * 1.02, span: Math.PI * 0.62 * E.outBack(inv(2.0, 2.6, t)), c1: '#1a0a10', c2: '#2c0f18', dot: P.crimson, lace: '#1a0a10', alpha: 0.9 });
    drawChant(ctx, t, 0, 960, 530, { fill: P.ivory });
    label(ctx, 'さ あ 、 踊 り ま し ょ う', 960, 690, { size: 26, color: hexA(P.ivory, 0.85), track: 0.3, align: 'center', alpha: smooth(2.1, 2.5, t) });
  } else if (k === 1) {
    fill(ctx, b.bg[0]);
    rgrad(ctx, 960, 540, 900, [[0, '#2a0f1e'], [1, '#0b0710']]);
    fx.stars(ctx, t, 80, 7, [0, 0, W, H], 0.6, 0.05, '#ffd7a0');
    fx.lineRose(ctx, 360, 540, 120, inv(3.75, 5.2, t), hexA(P.gold, 0.9), 2, -0.3);
    fx.lineRose(ctx, 1560, 540, 120, inv(3.9, 5.4, t), hexA(P.gold, 0.9), 2, 0.4);
    drawChant(ctx, t, 1, 960, 520, { fontStr: font(F.script, 210, 400), size: 210, fill: { grad: ['#fff4cf', '#f6d58e', '#c98f2c'] }, anim: 'blur', shadow: null, glow: 'rgba(255,170,80,0.6)' });
    label(ctx, '心 か ら 愛 し て る', 960, 690, { size: 26, color: hexA(P.champagne, 0.85), track: 0.3, align: 'center', alpha: smooth(4.0, 4.4, t) });
  } else if (k === 2) {
    fill(ctx, b.bg[0]);
    fx.fillPattern(ctx, fx.dotTile(P.crimson, 90, 11), 0.9, 1, 0, -t * 40, t * 18);
    ctx.save(); ctx.globalAlpha = 0.92; rgrad(ctx, 960, 540, 760, [[0, 'rgba(246,234,214,1)'], [0.55, 'rgba(246,234,214,0.92)'], [1, 'rgba(246,234,214,0)']]); ctx.restore();
    fx.drawRose(ctx, 1560, 300, 150 * E.outBack(inv(5.6, 6.3, t)), t * 0.2, 1, 'crimson', 3);
    fx.drawRose(ctx, 330, 820, 110 * E.outBack(inv(5.8, 6.5, t)), -t * 0.2, 1, 'scarlet', 5);
    drawChant(ctx, t, 2, 960, 530, { fill: P.crimson, shadow: 'rgba(90,0,20,0.25)' });
    label(ctx, 'さ あ 、 踊 り ま し ょ う', 960, 690, { size: 26, color: hexA(P.carmine, 0.9), track: 0.3, align: 'center', alpha: smooth(5.9, 6.3, t) });
  } else {
    fill(ctx, b.bg[0]);
    fx.drawSun(ctx, 960, 560, 1500, t * 0.25, 28, hexA('#ffb04a', 0.55), hexA('#e3361a', 0.0));
    rgrad(ctx, 960, 560, 900, [[0, 'rgba(255,220,140,0.55)'], [1, 'rgba(200,40,20,0)']]);
    const u = t - 7.74;
    for (let i = 0; i < 46 && u > 0; i++) {
      const a = hash(i, 3) * TAU, sp = 500 + hash(i, 4) * 900, d = sp * (1 - Math.exp(-u * 2.2)) / 2.2;
      const img = fx.petalSprite(['crimson', 'scarlet', 'gold'][i % 3], i % 5);
      fx.draw(ctx, img, 960 + Math.cos(a) * d, 560 + Math.sin(a) * d + u * u * 60, 0.5 + hash(i, 6) * 0.6, u * (2 + hash(i, 7) * 3) + i, clamp(2.2 - u));
    }
    drawChant(ctx, t, 3, 960, 540, { size: 330, fill: { grad: ['#fffbe8', '#ffe2a0', '#f5b54a'] }, shadow: 'rgba(120,10,0,0.55)' });
    label(ctx, 'O L É !', 960, 760, { fam: F.cinzel, size: 24, weight: 700, color: hexA(P.ivory, 0.9), track: 0.6, align: 'center', alpha: smooth(8.0, 8.4, t) });
  }
}
function sChant(ctx, t) {
  let k = 0; for (let i = 0; i < CHANT.length; i++) if (t >= CHANT[i].s) k = i;
  const wipe = 0.32, p = (t - CHANT[k].s) / wipe;
  if (p < 1 && (k > 0 || t >= CHANT[0].s)) {
    if (k > 0) chantBlock(ctx, t, k - 1); else sOpen(ctx, t);
    // fan wipe in the next block's colours
    const b = CHANT[k], e = E.inOutCubic(clamp(p));
    fx.drawFan(ctx, { cx: 960, cy: 1250, R: 1760, a0: Math.PI, span: Math.PI * e, ribs: 17, c1: b.bg[0], c2: b.bg[1], dot: k === 2 ? P.crimson : P.champagne, lace: P.ivory, stick: '#140608', rin: 0.12 });
    return;
  }
  chantBlock(ctx, t, k);
  flash(ctx, hitFlash(t, 7.74, 0.3) * 0.7);
}

function sTitle(ctx, t) {
  vgrad(ctx, [[0, '#0b0a1a'], [0.6, '#170d26'], [1, '#2a0d1c']]);
  fx.fillPattern(ctx, fx.zelligeTile(P.gold, 220, 1.4), 0.08, 1.1, t * 0.02, 0, 0);
  fx.leaks(ctx, t, ['#b3122e', '#5b2a86', '#e2b25a'], 3, 5, 0.35, 1100);
  const ap = inv(9.75, 10.7, t);
  ctx.save();
  ctx.translate(0, (1 - E.outExpo(ap)) * 40);
  archImage(ctx, t, A.cover, 1440, 1010, 560, 860, ap, lerp(1.62, 1.45, inv(9.75, 16.3, t)), 0.5, 0.34, { vprog: inv(10.1, 11.3, t) });
  ctx.restore();
  fx.lineRose(ctx, 1060, 190, 60, inv(10.6, 12.6, t), hexA(P.gold2, 0.85), 1.6, 0.3);
  fx.stars(ctx, t, 50, 77, [0, 0, W, 600], 0.7, 0.12, '#ffe7b8');
  // title block
  const x0 = 160;
  label(ctx, 'THE IDOLM@STER CINDERELLA GIRLS', x0, 312, { fam: F.cinzel, size: 19, weight: 600, color: hexA(P.champagne, 0.85), track: 0.38, alpha: smooth(10.0, 10.5, t) });
  drawText(ctx, t, '熱情エナモラル', { x: x0, y: 450, size: 112, fontStr: font(F.mincho, 112, 800), fill: P.ivory, shadow: 'rgba(80,0,20,0.8)', anim: 'stamp', start: 10.05, stagger: 0.085, dur: 0.35 });
  ctx.save(); ctx.translate(x0 + 330, 590); ctx.rotate(-0.06);
  drawText(ctx, t, 'Enamorar', { x: 0, y: 0, size: 150, fontStr: font(F.script, 150, 400), fill: { grad: ['#fff4cf', '#f6d58e', '#c98f2c'] }, glow: 'rgba(255,160,60,0.45)', anim: 'ink', start: 10.7, stagger: 0.07, dur: 0.3 });
  ctx.restore();
  const lp = E.outExpo(inv(11.2, 12.2, t));
  ctx.save(); ctx.strokeStyle = hexA(P.gold2, 0.9); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, 690); ctx.lineTo(x0 + 700 * lp, 690); ctx.stroke(); ctx.restore();
  label(ctx, '依田芳乃　村上巴　佐藤心　夢見りあむ　久川凪', x0, 742, { size: 24, weight: 500, color: hexA(P.ivory, 0.9), track: 0.18, alpha: smooth(11.6, 12.2, t) });
  label(ctx, 'Passion jewelries! 004', x0, 800, { fam: F.corm, size: 34, weight: 500, italic: true, color: hexA(P.gold2, 0.95), track: 0.05, alpha: smooth(12.0, 12.6, t) });
  fx.petals(ctx, t, 10, 9, { pal: ['crimson', 'scarlet'], speed: 70, alpha: smooth(11, 12.5, t) * 0.9, size: 0.8 });
  flash(ctx, hitFlash(t, 9.75, 0.3) * 0.8);
}

function arcade(ctx, t, top, warm) {
  ctx.save();
  ctx.fillStyle = '#05061a'; ctx.fillRect(0, top, W, H - top);
  // cornice with a small star frieze
  ctx.fillStyle = hexA(P.gold, 0.5); ctx.fillRect(0, top, W, 1.5); ctx.fillRect(0, top + 34, W, 1);
  ctx.fillStyle = hexA(P.gold, 0.32);
  for (let x = 12; x < W; x += 36) { ctx.save(); ctx.translate(x, top + 17); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore(); }
  const n = 7, aw = 176, pitch = W / n;
  for (let k = 0; k < n; k++) {
    const x = pitch * (k + 0.5), bottom = H + 10, h = H - top - 70;
    ctx.beginPath(); const { cy, r } = fx.archPath(ctx, x, bottom, aw, h, 0.5);
    const g = ctx.createLinearGradient(0, top + 70, 0, H);
    g.addColorStop(0, mixHex('#140c26', '#3a1416', warm)); g.addColorStop(0.55, mixHex('#3a1a2a', '#8a3216', warm)); g.addColorStop(1, mixHex('#52222a', '#d2681e', warm));
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    fx.fillPattern(ctx, fx.zelligeTile('#ffcf8a', 120, 1), 0.08 + warm * 0.08, 1, 0, 0, 0, null, [x - aw, top, aw * 2, H - top]);
    const fl = 0.75 + 0.25 * noise1(t * 3 + k * 1.7, 4);
    const ly = cy + 40 + Math.sin(t * 0.9 + k) * 3;
    fx.draw(ctx, fx.glowSprite('#ffae4a', 256), x, ly + 30, 1.25, 0, (0.5 + warm * 0.5) * fl, 'lighter');
    ctx.restore();
    // lantern on a chain
    ctx.strokeStyle = hexA('#d9a55a', 0.7); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, cy - r); ctx.lineTo(x, ly + 12); ctx.stroke();
    ctx.fillStyle = hexA('#ffd28a', 0.95 * fl);
    ctx.beginPath(); ctx.moveTo(x, ly + 12); ctx.lineTo(x + 10, ly + 24); ctx.lineTo(x + 8, ly + 44); ctx.lineTo(x, ly + 52); ctx.lineTo(x - 8, ly + 44); ctx.lineTo(x - 10, ly + 24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexA(P.gold, 0.6); ctx.lineWidth = 1.5;
    ctx.beginPath(); fx.archPath(ctx, x, bottom, aw, h, 0.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, cy, r + 9, Math.PI - 0.5, TAU + 0.5); ctx.stroke();
  }
  ctx.restore();
}
const CONST = [[300, 210], [470, 150], [640, 260], [560, 420], [380, 380], [760, 120], [900, 300]];
function sNight(ctx, t) {
  const drift = (t - 16.3) * 6;
  vgrad(ctx, [[0, '#04061a'], [0.45, '#0d1440'], [0.75, '#26204f'], [1, '#3a1d3e']]);
  fx.leaks(ctx, t, ['#2a3a8a', '#5b2a86'], 2, 21, 0.4, 1200);
  ctx.save(); ctx.translate(0, drift * 0.3);
  fx.stars(ctx, t, 280, 13, [0, -40, W, 760], 1, 0.05);
  // constellation drawn as the verse unfolds
  ctx.strokeStyle = hexA(P.gold2, 0.7); ctx.lineWidth = 1.2;
  for (let k = 0; k < CONST.length - 1; k++) {
    const p = E.inOutCubic(inv(16.8 + k * 1.9, 18.4 + k * 1.9, t));
    if (p <= 0) continue;
    const [x0, y0] = CONST[k], [x1, y1] = CONST[k + 1];
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, p), lerp(y0, y1, p)); ctx.stroke();
  }
  CONST.forEach(([x, y], k) => fx.draw(ctx, fx.sparkleSprite('#ffe9c0', 128), x, y, 0.5 + 0.15 * Math.sin(t * 2 + k), t * 0.2, smooth(16.6 + k * 1.9, 17.4 + k * 1.9, t), 'lighter'));
  ctx.restore();
  // Andalusian arcade: dark facade, horseshoe arches lit from within, hanging lanterns
  const warm = smooth(26.5, 29.5, t);
  const top = 760 - drift * 0.5;
  arcade(ctx, t, top, warm);
  ctx.save(); ctx.globalAlpha = 0.5 * warm; vgrad(ctx, [[0, 'rgba(255,90,40,0)'], [1, 'rgba(255,90,40,0.6)']], 500, H); ctx.restore();
  fx.embers(ctx, t, 26, 5, { alpha: 0.5 * warm + 0.12, speed: 50, size: 0.6 });
}

function sRouge(ctx, t) {
  vgrad(ctx, [[0, '#090c26'], [1, '#1d1036']]);
  fx.leaks(ctx, t, ['#2a3a8a', '#8a0b22'], 2, 31, 0.5, 1200);
  // right panel: night card revealed by blinds
  const blinds = 9, px = 1060, pw = 740, py = 90, ph = 900;
  const flood = inv(34.55, 35.15, t), recede = inv(36.35, 36.95, t);
  if (recede <= 0) {
    ctx.save();
    for (let k = 0; k < blinds; k++) {
      const p = E.outExpo(inv(30.45 + k * 0.05, 31.1 + k * 0.05, t));
      if (p <= 0) continue;
      const sw = pw / blinds, sx = px + k * sw;
      ctx.save(); ctx.beginPath(); ctx.rect(sx + (sw * (1 - p)) / 2, py, sw * p + 1, ph); ctx.clip();
      fx.coverImage(ctx, A.ynight, [px, py, pw, ph], lerp(1.32, 1.2, inv(30.4, 36.4, t)), 0.6, 0.45);
      ctx.restore();
    }
    ctx.strokeStyle = hexA(P.gold2, 0.8 * smooth(30.9, 31.4, t)); ctx.lineWidth = 1.5; ctx.strokeRect(px - 14, py - 14, pw + 28, ph + 28);
    ctx.restore();
    label(ctx, 'carmín', px - 40, py + ph + 40, { fam: F.corm, size: 30, italic: true, color: hexA(P.gold2, 0.9), track: 0.1, align: 'right', alpha: smooth(31, 31.6, t) });
    // rouge strokes behind the left text
    fx.drawBrush(ctx, 80, 770, 1050, 170, E.outCubic(inv(30.45, 31.0, t)), '#c3132f', -0.04, 0.95, 3);
    fx.drawBrush(ctx, 120, 850, 820, 70, E.outCubic(inv(31.85, 33.6, t)), '#e2384b', -0.02, 0.7, 8);
    fx.lineRose(ctx, 860, 300, 70, inv(31.9, 34.0, t), hexA(P.gold2, 0.8), 1.4, 0.2);
  }
  // crimson silk flood for 纏う深紅, then it slides away upward revealing the navy evening
  if (flood > 0) {
    if (recede > 0) {
      fx.coverImage(ctx, A.ynight, [0, 0, W, H], lerp(1.18, 1.06, inv(36.4, 38.6, t)), 0.52, 0.4);
      vgrad(ctx, [[0, 'rgba(8,10,40,0.0)'], [0.6, 'rgba(8,10,40,0.12)'], [1, 'rgba(8,10,40,0.85)']]);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(200,210,255,0.3)'; ctx.lineWidth = 1.2;
      for (let k = 0; k < 14; k++) {
        const y = 140 + hash(k, 2) * 700, sp = 900 + hash(k, 3) * 700, x = ((t * sp + hash(k, 4) * 3000) % 3200) - 600;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 150, y - 30, x + 300, y + 30, x + 460, y - 10); ctx.stroke();
      }
      ctx.restore();
    }
    const top = lerp(H + 140, -160, E.inOutCubic(flood)) - E.inOutCubic(recede) * (H + 500);
    fx.drawSilk(ctx, t, top, top + H + 420);
    if (recede <= 0 && flood >= 1) fx.lineRose(ctx, 1450, 600, 200, inv(35.0, 36.3, t), hexA(P.gold2, 0.55), 1.6, t * 0.05);
  }
}

function sHeat(ctx, t) {
  const p = inv(38.5, 48.4, t);
  const top = p < 0.5 ? mixHex('#0d1033', '#5a0614', p * 2) : mixHex('#5a0614', '#a8141c', (p - 0.5) * 2);
  const bot = p < 0.5 ? mixHex('#3a0a26', '#b3122e', p * 2) : mixHex('#b3122e', '#f2661c', (p - 0.5) * 2);
  vgrad(ctx, [[0, top], [1, bot]]);
  fx.fillPattern(ctx, fx.zelligeTile(P.gold, 240, 1.5), 0.05 + 0.08 * p, 1.2 + p * 0.3, t * 0.04, 0, 0, 'screen');
  const pu = pulse(t, 5);
  fx.draw(ctx, fx.glowSprite('#ff7a3a', 512), 960, 540, 2.2 + pu * 0.35 * (0.3 + p), 0, 0.25 + 0.35 * p, 'lighter');
  const fo = E.inOutSine(p);
  fx.drawFan(ctx, { cx: 960, cy: 1180, R: 980, a0: Math.PI * 1.5 - Math.PI * 0.5 * fo, span: Math.PI * fo + 0.01, ribs: 19, c1: hexA('#5a0614', 0.55), c2: hexA('#3a0410', 0.55), dot: hexA(P.gold2, 0.35), lace: hexA(P.gold2, 0.45), stick: hexA('#e2b25a', 0.5), rin: 0.3, alpha: 0.9 });
  fx.rings(ctx, t, 960, 540, beatsIn(38.5, 48.5, 4), hexA(P.gold2, 1), 0.35 + 0.3 * p, 1100, 1.9, 1.5);
  sunRays(ctx, 960, 540, 1400, t * (0.1 + p * 0.6), 18, '#ffd08a', smooth(44.5, 48.4, t) * 0.45);
  fx.embers(ctx, t, Math.round(20 + 110 * p), 9, { alpha: 0.4 + 0.6 * p, speed: 110 + 200 * p });
  // last bar: white bloom building into the chorus
  flash(ctx, Math.pow(smooth(47.6, 48.46, t), 2) * 0.85);
}

/* -- chorus building blocks -- */
function fieryBG(ctx, t, pal) {
  vgrad(ctx, [[0, pal[0]], [0.55, pal[1]], [1, pal[2]]]);
}
function chorusSun(ctx, t, t0, pal, cx, cy, img, focus, zoom = 1.25) {
  fieryBG(ctx, t, pal.bg);
  fx.drawSun(ctx, cx, cy, 1700, t * 0.08, 32, hexA(pal.ray, 0.26), hexA(pal.ray, 0.0));
  rgrad(ctx, cx, cy, 760, [[0, hexA(pal.glow, 0.75)], [1, hexA(pal.glow, 0)]]);
  fx.fillPattern(ctx, fx.dotTile(pal.dot, 80, 6), 0.12, 1, t * 0.03, t * 20, 0, null);
  const rise = E.outExpo(inv(t0, t0 + 1.1, t));
  const R = 360 + pulse(t, 7) * 8;
  coverDisc(ctx, t, img, cx, lerp(cy + 900, cy, rise), R, zoom, focus[0], focus[1], 1, pal.ring);
  fx.embers(ctx, t, 60, 17, { colors: pal.embers, alpha: 0.85, speed: 160 });
}
function stripsShot(ctx, t, t0, crops, pal, img) {
  fill(ctx, pal.bg[1]);
  fx.fillPattern(ctx, fx.dotTile(pal.dot, 96, 12), 0.25, 1, 0, t * 30, -t * 12);
  const n = crops.length, w = 500, gap = 70, total = n * w + (n - 1) * gap, x0 = (W - total) / 2;
  crops.forEach(([fxp, fyp, z], k) => {
    const p = E.outExpo(inv(t0 + k * 0.09, t0 + 0.7 + k * 0.09, t));
    const y = lerp(H + 100, 100, p) + Math.sin(t * 2 + k) * 6;
    skewPanel(ctx, img, x0 + k * (w + gap), y, w, 860, 60, z, fxp, fyp, 1, pal.ring);
  });
  fx.petals(ctx, t, 18, 23, { pal: ['crimson', 'orange', 'gold'], alpha: 0.9, speed: 140, wind: 120 });
}
function fullArt(ctx, t, img, a, b, z0, z1, f0, f1, tint) {
  const u = inv(a, b, t);
  fx.coverImage(ctx, img, [0, 0, W, H], lerp(z0, z1, E.inOutSine(u)), lerp(f0[0], f1[0], u), lerp(f0[1], f1[1], u));
  if (tint) vgrad(ctx, tint);
}
const PAL1 = { bg: ['#7a0818', '#c8221c', '#f28a24'], ray: '#ffb347', glow: '#ffd27a', dot: '#ffe7b8', ring: '#ffe2a0', embers: ['#ffb347', '#ff6a2a', '#ffd27a'] };
const PAL2 = { bg: ['#140a2e', '#3a1458', '#8a1a4a'], ray: '#c69cff', glow: '#ff9ac0', dot: '#e8d8ff', ring: '#f1dcff', embers: ['#ffb0d0', '#c69cff', '#ffd27a'] };
const PAL3 = { bg: ['#f6c46a', '#f28a44', '#c8221c'], ray: '#fff2c0', glow: '#fffbe0', dot: '#fff6dc', ring: '#fff4cf', embers: ['#fff2c0', '#ffd27a', '#ffb347'] };

function sChorus1(ctx, t) {
  if (t < 55.6) chorusSun(ctx, t, 48.46, PAL1, 1280, 520, A.cover, [0.5, 0.38], 1.38);
  else if (t < 61.45) {
    const sw = t >= 59.3;
    stripsShot(ctx, t, sw ? 59.3 : 55.6, sw ? [[...FACES.shin, 2.4], [...FACES.yoshino, 2.4], [...FACES.riamu, 2.4]] : [[...FACES.nagi, 2.4], [...FACES.tomoe, 2.2], [...FACES.riamu, 2.0]], PAL1, A.cover);
    flash(ctx, hitFlash(t, 59.3, 0.2) * 0.5);
  } else {
    fullArt(ctx, t, A.cover, 61.45, 69.8, 1.55, 1.28, [0.45, 0.33], [0.5, 0.4], [[0, 'rgba(90,6,20,0)'], [0.6, 'rgba(90,6,20,0.15)'], [1, 'rgba(110,8,24,0.8)']]);
    fx.embers(ctx, t, 70, 31, { alpha: 0.9, speed: 180 });
    fx.petals(ctx, t, 26, 41, { pal: ['crimson', 'scarlet', 'orange'], speed: 120, wind: 80 });
    ctx.save(); ctx.globalAlpha = 0.55 * smooth(66.3, 66.9, t) * (1 - smooth(69.3, 69.8, t)); fill(ctx, '#1a0208'); ctx.restore();
    flash(ctx, hitFlash(t, 61.45, 0.25) * 0.5);
  }
  flash(ctx, hitFlash(t, 48.46, 0.5) * 0.95);
  flash(ctx, hitFlash(t, 55.6, 0.25) * 0.6);
}

function sInter(ctx, t) {
  // "cartel" poster: ivory paper, crimson & gold ornament, dancer cut-out
  fill(ctx, '#f1e2c6');
  rgrad(ctx, 960, 480, 1100, [[0, 'rgba(255,248,232,0.9)'], [1, 'rgba(200,160,110,0.35)']]);
  fx.fillPattern(ctx, fx.dotTile(P.crimson, 120, 5), 0.22, 1, 0, t * 10, 0);
  const op = inv(69.7, 70.8, t);
  fx.ornamentFrame(ctx, 70, 60, W - 140, H - 120, hexA(P.crimson, 0.9), op, 2);
  const fanOpen = k => Math.PI * 0.5 * E.outBack(inv(70.2 + k * 0.48, 70.7 + k * 0.48, t));
  fx.drawFan(ctx, { cx: 92, cy: 92, R: 170, a0: 0, span: fanOpen(0), alpha: 1 });
  fx.drawFan(ctx, { cx: W - 110, cy: H - 100, R: 250, a0: Math.PI, span: fanOpen(1), alpha: 1 });
  // sun-burst disc behind dancer
  const cx = 1340, cy = 520;
  fx.drawSun(ctx, cx, cy, 470 * E.outExpo(inv(70.0, 71.0, t)), t * 0.12, 24, hexA(P.crimson, 0.95), hexA('#e2384b', 0.9));
  ctx.save(); ctx.strokeStyle = P.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 480 * E.outExpo(inv(70.0, 71.0, t)), 0, TAU); ctx.stroke(); ctx.restore();
  const sway = Math.sin(t * 1.6) * 0.02;
  cutout(ctx, A.ncutO, cx + 10, cy + 40 + (1 - E.outExpo(inv(70.3, 71.2, t))) * 600, 860, 1, false, sway);
  // typography
  const x0 = 170;
  label(ctx, 'GRAN NOCHE DE PASIÓN', x0, 285, { fam: F.cinzel, size: 26, weight: 700, color: P.carmine, track: 0.4, alpha: smooth(70.4, 70.9, t) });
  drawText(ctx, t, 'Enamorar', { x: x0 - 10, y: 410, size: 176, fontStr: font(F.play, 176, 900, true), fill: P.crimson, anim: 'slide', start: 70.6, stagger: 0.05, shadow: 'rgba(90,0,20,0.25)' });
  drawText(ctx, t, '熱情', { x: x0 + 20, y: 585, size: 150, fontStr: font(F.old, 150, 900), fill: '#1a0a10', anim: 'stamp', start: 71.7, stagger: 0.12 });
  label(ctx, '― 5 ESTRELLAS ―', x0 + 340, 585, { fam: F.cinzel, size: 22, weight: 700, color: P.carmine, track: 0.3, alpha: smooth(72.2, 72.8, t) });
  const names = ['依田芳乃', '村上巴', '佐藤心', '夢見りあむ', '久川凪'];
  names.forEach((nm, k) => label(ctx, nm, x0 + 10 + (k % 3) * 230, 720 + Math.floor(k / 3) * 56, { size: 32, weight: 700, color: '#1a0a10', track: 0.12, alpha: smooth(73 + k * 0.25, 73.5 + k * 0.25, t) }));
  label(ctx, 'Passion jewelries! 004', x0 + 10, 870, { fam: F.corm, size: 38, italic: true, weight: 600, color: P.crimson, alpha: smooth(74.5, 75.2, t) });
}

function sSea(ctx, t) {
  const sw = smooth(87.2, 88.0, t);
  if (sw < 1) {
    vgrad(ctx, [[0, '#0a0a2a'], [0.5, '#2a1c5a'], [0.64, '#6a3a8a'], [1, '#120c30']]);
    fx.stars(ctx, t, 200, 51, [0, 0, W, 600], 0.9, 0.04);
    const my = lerp(330, 250, inv(79.4, 88, t));
    fx.drawMoon(ctx, 1240, my, 110, 1, '#e9c9ff');
    fx.drawSea(ctx, t, 690, 1240, '#2a1c5a', '#07061c', '#fff0ff', 1, 1);
    ctx.save(); ctx.fillStyle = hexA('#f6d9ff', 0.6); ctx.fillRect(0, 689, W, 1.5); ctx.restore();
  }
  if (sw > 0) {
    ctx.save(); ctx.globalAlpha = sw;
    fullArt(ctx, t, A.ynight, 87.2, 94.6, 1.16, 1.04, [0.42, 0.4], [0.5, 0.45], [[0, 'rgba(20,10,60,0.15)'], [0.65, 'rgba(20,10,60,0.1)'], [1, 'rgba(10,6,40,0.75)']]);
    fx.stars(ctx, t, 70, 52, [0, 0, W, 400], 0.6, 0.06);
    ctx.restore();
  }
  // twin earrings swinging near the lyric
  const ep = win(t, 87.6, 94.2, 0.6, 0.6);
  for (const s of [-1, 1]) {
    const ax = 960 + s * 470, ay = 820, ang = Math.sin(t * 2.4 + (s > 0 ? 0.6 : 0)) * 0.35;
    ctx.save(); ctx.globalAlpha = ep; ctx.translate(ax, ay); ctx.rotate(ang);
    ctx.strokeStyle = P.gold2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 46); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.stroke();
    fx.draw(ctx, fx.sparkleSprite('#fff0d0', 96), 0, 60, 0.5 + 0.1 * Math.sin(t * 5), t, 1, 'lighter');
    ctx.fillStyle = P.gold2; ctx.beginPath(); ctx.moveTo(0, 46); ctx.lineTo(9, 62); ctx.lineTo(0, 78); ctx.lineTo(-9, 62); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function sKiss(ctx, t) {
  vgrad(ctx, [[0, '#1e0410'], [0.6, '#3a0818'], [1, '#14020a']]);
  fx.leaks(ctx, t, ['#b3122e', '#e8566a', '#5b2a86'], 3, 61, 0.55, 1100);
  const bloom = E.inOutSine(inv(94.4, 101.5, t));
  fx.draw(ctx, fx.glowSprite('#ff3a5a', 512), 640, 560, 2.4, 0, 0.35, 'lighter');
  fx.drawRose(ctx, 640, 560, 330, t * 0.06, 0.25 + 0.75 * bloom, 'crimson', 11);
  fx.lineRose(ctx, 640, 560, 420, inv(94.6, 98.5, t), hexA(P.gold2, 0.4), 1.2, -t * 0.03);
  fx.petals(ctx, t, 30, 71, { pal: ['crimson', 'blush', 'scarlet'], speed: 60, wind: 30, alpha: 0.95 });
  fx.stars(ctx, t, 50, 72, [0, 0, W, H], 0.4, 0.1, '#ffd0d8');
}

function sBell(ctx, t) {
  const p = inv(102.5, 112.3, t);
  vgrad(ctx, [[0, mixHex('#1a0f3a', '#0a0718', p)], [1, mixHex('#4a1a4a', '#160a24', p)]]);
  const quiet = smooth(106.0, 106.8, t);
  const hits = beatsIn(102.5, 106.4, 2);
  fx.rings(ctx, t, 960, 230, hits, hexA(P.gold2, 1), 0.7, 1400, 2.6, 1.6);
  const swing = Math.sin((t - 102.66) * Math.PI / (T.beat * 2)) * 0.28 * (1 - quiet);
  bell(ctx, 960, 210, 1.1, swing, hexA(P.gold2, 0.95), 1 - quiet * 0.75);
  fx.stars(ctx, t, 120, 81, [0, 0, W, H], 0.35 + 0.4 * quiet, 0.03);
  // two lights drawing closer: ふたり
  const q = E.inOutSine(inv(106.3, 110.6, t));
  for (const s of [-1, 1]) fx.draw(ctx, fx.sparkleSprite(s < 0 ? '#ffd7a0' : '#ffc0d8', 128), 960 + s * lerp(420, 34, q), 420, 0.7 + 0.1 * Math.sin(t * 4 + s), t * 0.3 * s, quiet, 'lighter');
  // final bar build into chorus 2
  sunRays(ctx, 960, 540, 1300, t * 0.5, 20, '#e7c6ff', smooth(110.4, 112.3, t) * 0.5);
  flash(ctx, Math.pow(smooth(111.7, 112.33, t), 2) * 0.8, '#fff0ff');
}

function sChorus2(ctx, t) {
  if (t < 119.5) {
    fullArt(ctx, t, A.alham, 112.33, 119.6, 1.18, 1.04, [0.62, 0.4], [0.55, 0.45], [[0, 'rgba(40,10,80,0.25)'], [0.7, 'rgba(40,10,80,0.1)'], [1, 'rgba(30,6,50,0.75)']]);
    fx.embers(ctx, t, 60, 91, { alpha: 0.8, speed: 140 });
    const mp = inv(115.5, 119.6, t);
    fx.drawMoon(ctx, 260, lerp(150, 330, E.inOutSine(mp)), 70, 0.85 * smooth(115.3, 116, t), '#e9c9ff');
    fx.draw(ctx, fx.sparkleSprite('#fff4ff', 128), 1620, 150, 1.2 + 0.25 * pulse(t, 4), t * 0.2, 0.95, 'lighter');
    flash(ctx, hitFlash(t, 112.33, 0.5) * 0.9, '#fff0ff');
  } else if (t < 127.6) {
    fieryBG(ctx, t, ['#0c0620', '#2a0f48', '#5a1240']);
    fx.fillPattern(ctx, fx.zelligeTile('#c9a8ff', 220, 1.2), 0.08, 1.2, -t * 0.03, 0, 0);
    const crop = t < 123.3 ? FACES.shin : t < 125.45 ? FACES.riamu : FACES.yoshino;
    tickRing(ctx, t, 1300, 520, 470, hexA(P.gold2, 0.9));
    coverDisc(ctx, t, A.cover, 1300, 520, 380, 2.1, crop[0], crop[1], 1, '#f1dcff');
    fx.stars(ctx, t, 90, 93, [0, 0, W, H], 0.6, 0.06);
    flash(ctx, (hitFlash(t, 119.55, 0.25) + hitFlash(t, 123.3, 0.2) + hitFlash(t, 125.45, 0.2)) * 0.45, '#fff0ff');
  } else {
    vgrad(ctx, [[0, '#120418'], [1, '#3a0a28']]);
    fx.leaks(ctx, t, ['#ff6aa0', '#9a5aff', '#ffb347'], 3, 95, 0.5, 1000);
    fx.bubbles(ctx, t, 46, 97, 0.9);
    const bp = E.outCubic(inv(127.6, 128.6, t)), bx = 1240 + Math.sin(t * 0.8) * 20, by = lerp(620, 470, inv(127.6, 133.6, t));
    const ba = bp * (1 - 0.6 * smooth(130.4, 131.2, t));
    if (ba > 0) {
      ctx.save(); ctx.globalAlpha = ba;
      ctx.save(); ctx.beginPath(); ctx.arc(bx, by, 330 * bp, 0, TAU); ctx.clip();
      fx.coverImage(ctx, A.cover, [bx - 330, by - 330, 660, 660], 2.1, 0.72, 0.33);
      rgrad(ctx, bx - 90, by - 120, 420, [[0, 'rgba(255,255,255,0.18)'], [0.6, 'rgba(255,200,240,0.05)'], [1, 'rgba(120,60,200,0.35)']]);
      ctx.restore();
      ctx.lineWidth = 3; const ir = ctx.createLinearGradient(bx - 330, by - 330, bx + 330, by + 330);
      ir.addColorStop(0, '#ffd0f0'); ir.addColorStop(0.35, '#b0e0ff'); ir.addColorStop(0.7, '#fff2b0'); ir.addColorStop(1, '#ff9ad0');
      ctx.strokeStyle = ir; ctx.beginPath(); ctx.arc(bx, by, 330 * bp, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(bx, by, 290 * bp, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
      ctx.restore();
    }
    strings(ctx, t, 760, 22, hexA(P.gold2, 0.8), 18, smooth(130.3, 130.9, t));
    flash(ctx, hitFlash(t, 127.6, 0.2) * 0.4, '#fff0ff');
  }
}

function sDance(ctx, t) {
  if (t < 149.1) {
    fill(ctx, '#0a0608');
    const op = E.outExpo(inv(133.6, 134.6, t));
    ctx.save(); ctx.beginPath(); ctx.arc(960, 560, 620 * op, 0, TAU); ctx.clip();
    rgrad(ctx, 960, 560, 640, [[0, '#3a0a18'], [1, '#12060a']]);
    fx.fillPattern(ctx, fx.zelligeTile(P.gold, 200, 1.6), 0.55, 1.0, t * 0.08, 0, 0, 'lighter');
    fx.fillPattern(ctx, fx.zelligeTile(P.crimson, 300, 2), 0.6, 1.0, -t * 0.05, 0, 0, 'lighter');
    ctx.restore();
    ctx.save(); ctx.strokeStyle = hexA(P.gold2, 0.9); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(960, 560, 630 * op, 0, TAU); ctx.stroke(); ctx.restore();
    marquee(ctx, t, 'BAILE  ✦  PASIÓN  ✦  ENAMORAR  ✦  OLÉ  ✦  ', 110, 70, 120, hexA(P.gold2, 0.7));
    marquee(ctx, t, 'TE QUIERO MUCHO  ✦  LLENO DE AMOR  ✦  ', 990, 70, -120, hexA(P.crimson, 0.9));
    const sway = Math.sin(t * Math.PI / T.beat / 2) * 0.03;
    const fcy = (barF(t) % 2) / 2, fopen = Math.PI * 0.55 * E.outBack(clamp(Math.min(fcy, 1 - fcy) * 4));
    fx.drawFan(ctx, { cx: 300, cy: 980, R: 520, a0: Math.PI * 1.5 - fopen, span: fopen, alpha: 0.6, c1: '#2a0a12', c2: '#1a060c', dot: P.crimson, lace: hexA(P.gold2, 0.7) });
    fx.drawFan(ctx, { cx: W - 300, cy: 980, R: 520, a0: Math.PI * 1.5, span: fopen, alpha: 0.6, c1: '#2a0a12', c2: '#1a060c', dot: P.crimson, lace: hexA(P.gold2, 0.7) });
    cutout(ctx, A.ncutO, 960, 610 + (1 - op) * 300 - pulse(t, 6) * 6, 900 * (1 + pulse(t, 6) * 0.012), 1, false, sway);
    strings(ctx, t, 850, 18, hexA(P.gold2, 0.35), 10, 1);
    flash(ctx, hitFlash(t, 133.62, 0.4) * 0.6);
    return;
  }
  // build: a different composition every bar
  const k = Math.floor(barF(t) - barF(149.1) + 0.001), u = t - barT(Math.round(barF(149.1)) + k);
  const shot = k % 6;
  if (shot === 0) fullArt(ctx, t, A.alham, 149.1, 167, 1.3, 1.1, [0.7, 0.4], [0.3, 0.45]);
  else if (shot === 1) {
    fill(ctx, P.crimson); fx.fillPattern(ctx, fx.dotTile(P.champagne, 100, 12), 0.25, 1, 0, t * 50, 0);
    fx.drawFan(ctx, { cx: 960, cy: 1160, R: 1000, a0: Math.PI, span: Math.PI * E.outBack(clamp(u / 0.5)), c1: '#1a0a10', c2: '#2c0f18', dot: P.crimson, alpha: 0.95 });
    cutout(ctx, A.ncutO, 960, 600, 880, 1, k % 4 === 1);
  } else if (shot === 2) stripsShot(ctx, t, t - u, [[...FACES.nagi, 2.6], [...FACES.shin, 2.6], [...FACES.tomoe, 2.4]], PAL1, A.cover);
  else if (shot === 3) {
    fill(ctx, '#f3e3c8'); fx.fillPattern(ctx, fx.dotTile(P.crimson, 90, 11), 0.9, 1, 0, -t * 40, 0);
    ctx.save(); ctx.globalAlpha = 0.94; rgrad(ctx, 960, 540, 820, [[0, 'rgba(246,234,214,1)'], [0.55, 'rgba(246,234,214,0.92)'], [1, 'rgba(246,234,214,0)']]); ctx.restore();
    drawText(ctx, t, '¡Olé!', { x: 960, y: 540, align: 'center', size: 300, fontStr: font(F.play, 300, 900, true), fill: P.crimson, shadow: 'rgba(60,0,10,0.3)', anim: 'stamp', start: t - u, stagger: 0.04 });
  } else if (shot === 4) chorusSun(ctx, t, t - u, PAL1, 960, 540, A.cover, FACES.yoshino, 2.3);
  else {
    fill(ctx, '#0b0610');
    archImage(ctx, t, A.alham, 960, 1040, 640, 900, clamp(u / 0.6), 1.25, 0.5, 0.4, { vprog: clamp(u / 0.8) });
  }
  // accelerating flashes into the dawn
  const fl = t > 162.6 ? hitFlash(t, beatT(Math.floor(beatF(t))), 0.15) * 0.5 : hitFlash(t, t - u, 0.18) * 0.45;
  flash(ctx, fl);
}

function sDawn(ctx, t) {
  const p = inv(166.5, 189.8, t);
  vgrad(ctx, [[0, mixHex('#3a2a6a', '#6a4a8a', p)], [0.45, mixHex('#c86a8a', '#f2a08a', p)], [0.64, mixHex('#ffc39a', '#ffe0b0', p)], [0.65, '#f8c8a0'], [1, '#4a2a4a']]);
  const sy = lerp(760, 560, E.inOutSine(p));
  sunRays(ctx, 960, sy, 1500, t * 0.03, 40, '#fff0c8', 0.22);
  fx.draw(ctx, fx.glowSprite('#fff4d0', 512), 960, sy, 3.2, 0, 0.9, 'lighter');
  ctx.save(); ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(960, sy, 90, 0, TAU); ctx.fill(); ctx.restore();
  // cloud streaks
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let k = 0; k < 9; k++) {
    const y = 150 + k * 52 + hash(k, 3) * 30, x = ((hash(k, 4) * W + t * (10 + k * 3)) % (W + 800)) - 400;
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#ffd8e0';
    ctx.beginPath(); ctx.ellipse(x, y, 260 + hash(k, 5) * 200, 6 + hash(k, 6) * 8, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  fx.drawSea(ctx, t, 702, 960, '#e89a8a', '#3a1a3a', '#fff6d8', 1, 1.3);
  ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = '#fff2d8'; ctx.fillRect(0, 701, W, 2); ctx.restore();
  // cufflink glint
  fx.draw(ctx, fx.sparkleSprite('#fff4d0', 128), 820, 330, 0.9, t, win(t, 176.0, 181.0, 0.3, 0.6), 'lighter');
  // Yoshino appears for 不安に揺れてる私を…抱きしめて
  const yp = E.outCubic(inv(180.8, 182.2, t));
  if (yp > 0) {
    ctx.save(); ctx.globalAlpha = yp;
    cutout(ctx, A.ycutO, 1470 + (1 - yp) * 120, 640, 880, 1);
    ctx.restore();
  }
  fx.petals(ctx, t, 14, 101, { pal: ['blush', 'gold'], speed: 50, wind: 40, alpha: 0.8, size: 0.8 });
  flash(ctx, hitFlash(t, 166.53, 0.6) * 0.9, '#fff6e0');
}

function sEsp(ctx, t) {
  // diagonal split: crimson | ivory, dots inverted on each side
  const sp = E.inOutExpo(inv(190.15, 190.9, t));
  const cut = x => 780 + (x === 0 ? 260 : -260);
  fill(ctx, '#f3e3c8');
  fx.fillPattern(ctx, fx.dotTile(P.crimson, 96, 10), 0.9, 1, 0, t * 25, 0);
  ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cut(0) * sp, 0); ctx.lineTo(cut(1) * sp, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
  fill(ctx, P.crimson); fx.fillPattern(ctx, fx.dotTile(P.champagne, 96, 10), 0.35, 1, 0, -t * 25, 0);
  ctx.restore();
  // big 熱情 stamp
  const kp = inv(195.05, 195.5, t);
  if (kp > 0) {
    ctx.save(); ctx.globalAlpha = 0.95 * (1 - smooth(198.55, 199.0, t));
    drawText(ctx, t, '熱情', { x: 560, y: 120, vertical: true, size: 360, fontStr: font(F.old, 360, 900), fill: '#1a0a10', anim: 'stamp', start: 195.05, stagger: 0.1, dur: 0.35 });
    ctx.restore();
  }
  // member portraits in circles on the ivory side
  const port = [[192.3, 195.0, FACES.riamu], [195.0, 200.0, FACES.tomoe], [200.0, 202.4, FACES.shin], [202.4, 208.9, FACES.nagi]];
  port.forEach(([a, b, f], k) => {
    const pin = E.outBack(inv(a, a + 0.6, t)), pout = smooth(b - 0.3, b, t);
    if (pin <= 0 || pout >= 1) return;
    coverDisc(ctx, t, A.cover, 1400, 470, 330 * pin * (1 - pout * 0.3), 2.3, f[0], f[1], 1 - pout, P.carmine);
  });
  // build into the final chorus
  sunRays(ctx, 960, 540, 1400, t * 0.6, 24, '#ffe2a0', smooth(207.0, 209.0, t) * 0.6);
  flash(ctx, Math.pow(smooth(208.2, 209.11, t), 2) * 0.9);
}

function sFinal(ctx, t) {
  if (t < 216.3) {
    chorusSun(ctx, t, 209.11, PAL3, 960, 640, A.cover, [0.5, 0.38], 1.38);
    flash(ctx, hitFlash(t, 209.11, 0.6), '#fffaf0');
  } else if (t < 224.15) {
    fill(ctx, '#6a0616');
    rgrad(ctx, 960, 540, 1100, [[0, '#c8162f'], [1, '#4a0410']]);
    roseField(ctx, t, 216.3, 26, 7, ['crimson', 'scarlet', 'orange', 'gold'], 1, 1);
    const sw = t >= 220.1;
    const crops = sw ? [FACES.riamu, FACES.yoshino, FACES.shin] : [FACES.nagi, FACES.tomoe, FACES.yoshino];
    crops.forEach((f, k) => {
      const t0 = (sw ? 220.1 : 216.3) + k * 0.1;
      archImage(ctx, t, A.cover, 420 + k * 540, 1000, 420, 700, inv(t0, t0 + 0.7, t), 2.2, f[0], f[1], { vprog: inv(t0, t0 + 0.9, t), band: 34 });
    });
    fx.petals(ctx, t, 24, 111, { pal: ['crimson', 'orange', 'gold'], speed: 150, wind: 120 });
    flash(ctx, (hitFlash(t, 216.3, 0.25) + hitFlash(t, 220.1, 0.2)) * 0.5);
  } else if (t < 232.0) {
    fullArt(ctx, t, A.cover, 224.15, 232.1, 1.3, 1.55, [0.5, 0.4], [0.55, 0.32], [[0, 'rgba(255,200,120,0.12)'], [0.65, 'rgba(120,8,24,0.1)'], [1, 'rgba(120,8,24,0.75)']]);
    fx.leaks(ctx, t, ['#ffd27a', '#ff6a2a', '#fff2c0'], 3, 121, 0.45, 1000);
    fx.petals(ctx, t, 44, 123, { pal: ['crimson', 'scarlet', 'orange', 'gold'], speed: 170, wind: 140, size: 1.1 });
    fx.embers(ctx, t, 60, 125, { alpha: 0.8, speed: 200 });
    flash(ctx, (hitFlash(t, 224.15, 0.35) * 0.7 + hitFlash(t, 228.2, 0.2) * 0.4));
  } else {
    const p = inv(232.0, 238.2, t);
    vgrad(ctx, [[0, '#b9a6d8'], [0.55, '#f2c6c0'], [1, '#ffe2bc']]);
    ctx.save(); ctx.globalAlpha = 0.24 * (1 - p * 0.5);
    fx.coverImage(ctx, A.coverSoft, [0, 0, W, H], 1.4 + p * 0.06, 0.5, 0.4);
    ctx.restore();
    fx.draw(ctx, fx.glowSprite('#fffaf0', 512), 960, 520, 3, 0, 0.6, 'lighter');
    fx.petals(ctx, t, 18, 131, { pal: ['blush', 'gold'], speed: 40, wind: 20, alpha: 0.9, size: 0.9 });
    ctx.save(); ctx.globalAlpha = 0.72 * smooth(235.0, 235.6, t); fill(ctx, '#2a1024'); ctx.restore();
  }
}

function sOutro(ctx, t) {
  if (t < 249.75) {
    fill(ctx, P.crimson);
    rgrad(ctx, 960, 540, 1100, [[0, '#c8162f'], [1, '#5a0614']]);
    fx.fillPattern(ctx, fx.dotTile(P.champagne, 110, 8), 0.16, 1, 0, -t * 20, 0);
    const cards = [[A.cover, 0.42, 0.35, 'Pasión'], [A.ynight, 0.55, 0.45, 'Noche'], [A.alham, 0.6, 0.45, 'Alhambra'], [A.cover, 0.55, 0.35, 'Amanecer'], [A.ynight, 0.62, 0.5, 'Luna'], [A.alham, 0.35, 0.42, 'Baile']];
    const speed = 210, pw = 560, ph = 700, gap = 120;
    cards.forEach(([img, fxp, fyp, cap], k) => {
      const x = W + 120 + k * (pw + gap) - (t - 238.14) * speed * 1.6;
      if (x < -pw - 200 || x > W + 100) return;
      const y = 170 + (k % 2) * 60 + pulse(t, 8) * 6;
      ctx.save(); ctx.fillStyle = '#fbf3e4'; ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 30; ctx.fillRect(x - 18, y - 18, pw + 36, ph + 110); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, pw, ph); ctx.clip(); fx.coverImage(ctx, img, [x, y, pw, ph], img === A.cover && cap === 'Amanecer' ? 1.6 : 1.25, fxp, fyp); ctx.restore();
      label(ctx, cap, x + pw / 2, y + ph + 48, { fam: F.corm, size: 40, italic: true, weight: 600, color: P.carmine, align: 'center' });
    });
    fx.petals(ctx, t, 20, 141, { pal: ['gold', 'orange'], speed: 90, wind: 60, alpha: 0.85 });
    flash(ctx, hitFlash(t, 238.14, 0.4) * 0.5);
    return;
  }
  // end card (bookend of the title)
  vgrad(ctx, [[0, '#0b0a1a'], [0.6, '#170d26'], [1, '#2a0d1c']]);
  fx.fillPattern(ctx, fx.zelligeTile(P.gold, 220, 1.4), 0.07, 1.1, t * 0.02, 0, 0);
  fx.leaks(ctx, t, ['#b3122e', '#5b2a86', '#e2b25a'], 3, 5, 0.35, 1100);
  archImage(ctx, t, A.cover, 1440, 1010, 560, 860, inv(249.75, 250.65, t), lerp(1.55, 1.42, inv(249.75, 264, t)), 0.5, 0.36, { vprog: inv(250.05, 251.15, t) });
  fx.stars(ctx, t, 50, 177, [0, 0, W, 600], 0.7, 0.12, '#ffe7b8');
  const x0 = 160;
  drawText(ctx, t, '熱情エナモラル', { x: x0, y: 430, size: 104, fontStr: font(F.mincho, 104, 800), fill: P.ivory, shadow: 'rgba(80,0,20,0.8)', anim: 'blur', start: 250.6, stagger: 0.08 });
  ctx.save(); ctx.translate(x0 + 300, 560); ctx.rotate(-0.06);
  drawText(ctx, t, 'Fin', { x: 0, y: 0, size: 140, fontStr: font(F.script, 140, 400), fill: { grad: ['#fff4cf', '#f6d58e', '#c98f2c'] }, anim: 'ink', start: 251.4, stagger: 0.15, dur: 0.4 });
  ctx.restore();
  const cr = [['依田芳乃', 'CV.高田憂希'], ['村上巴', 'CV.花井美春'], ['佐藤心', 'CV.花守ゆみり'], ['夢見りあむ', 'CV.星希成奏'], ['久川凪', 'CV.立花日菜']];
  cr.forEach(([nm, cv], k) => {
    const y = 660 + k * 46, a = smooth(252 + k * 0.2, 252.6 + k * 0.2, t);
    label(ctx, nm, x0, y, { size: 26, weight: 700, color: hexA(P.ivory, 0.95), track: 0.12, alpha: a });
    label(ctx, cv, x0 + 230, y, { size: 20, weight: 500, color: hexA(P.champagne, 0.75), track: 0.1, alpha: a });
  });
  label(ctx, 'THE IDOLM@STER CINDERELLA MASTER  Passion jewelries! 004', x0, 920, { fam: F.cinzel, size: 16, weight: 600, color: hexA(P.gold2, 0.85), track: 0.2, alpha: smooth(253.4, 254, t) });
  label(ctx, 'fan-made lyric video', x0, 958, { fam: F.corm, size: 22, italic: true, color: hexA(P.champagne, 0.6), track: 0.08, alpha: smooth(253.8, 254.4, t) });
  fx.petals(ctx, t, 12, 9, { pal: ['crimson', 'scarlet'], speed: 60, alpha: 0.8, size: 0.8 });
  flash(ctx, hitFlash(t, 249.75, 0.4) * 0.6);
}

/* ------------------------------------------------------------------ list */
// a: start, b: end; tin: transition length into this scene; trans: kind of transition
export const SCENES = [
  { id: 'open', a: 0, b: 1.62, draw: sOpen, label: 'PRÓLOGO' },
  { id: 'chant', a: 1.62, b: 9.75, draw: sChant, label: 'PRÓLOGO' },
  { id: 'title', a: 9.75, b: 16.3, draw: sTitle, label: '' },
  { id: 'night', a: 16.3, b: 30.45, draw: sNight, tin: 0.9, trans: 'fade', label: 'I — NOCHE ESTRELLADA' },
  { id: 'rouge', a: 30.45, b: 38.5, draw: sRouge, tin: 0.35, trans: 'fade', label: 'II — CARMÍN' },
  { id: 'heat', a: 38.5, b: 48.46, draw: sHeat, tin: 0.6, trans: 'fade', label: 'III — CALOR' },
  { id: 'chorus1', a: 48.46, b: 69.75, draw: sChorus1, label: 'IV — ENAMORAR' },
  { id: 'inter', a: 69.75, b: 79.43, draw: sInter, tin: 0.45, trans: 'fan', label: 'INTERLUDIO', light: true },
  { id: 'sea', a: 79.43, b: 94.3, draw: sSea, tin: 1.0, trans: 'iris', label: 'V — MAR DE LUNA' },
  { id: 'kiss', a: 94.3, b: 102.5, draw: sKiss, tin: 0.7, trans: 'fade', label: 'VI — BESO' },
  { id: 'bell', a: 102.5, b: 112.33, draw: sBell, tin: 0.5, trans: 'fade', label: 'VII — CAMPANAS' },
  { id: 'chorus2', a: 112.33, b: 133.62, draw: sChorus2, label: 'VIII — LUCERO DEL ALBA' },
  { id: 'dance', a: 133.62, b: 166.53, draw: sDance, tin: 0.4, trans: 'fan', label: 'IX — BAILE' },
  { id: 'dawn', a: 166.53, b: 190.15, draw: sDawn, label: 'X — AURORA' },
  { id: 'esp', a: 190.15, b: 209.11, draw: sEsp, tin: 0.0, label: 'XI — ESPECIAL', light: true },
  { id: 'final', a: 209.11, b: 238.14, draw: sFinal, label: 'XII — AMANECER' },
  { id: 'outro', a: 238.14, b: 999, draw: sOutro, tin: 0.6, trans: 'fan', label: 'FIN' },
];
