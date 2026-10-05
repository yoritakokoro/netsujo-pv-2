// Collage toolkit (used only in a few sections): paper sheets, torn pieces, stickers, tape,
// polaroids, stop-motion timing and hand-written notes.
import { W, H, TAU, clamp, lerp, E, hash, noise1, makeCanvas, rng } from './util.js';
import { IMG, cover, memo, rgba } from './gfx.js';
import { font, F } from './text.js';

// stop-motion: animate on twos (15 fps) and add a tiny per-step "boil"
export const step = t => Math.floor(t * 15) / 15;
export function boil(t, seed, amt = 1) { // v5: no jitter, just a slow paper "breathing" drift
  return [Math.sin(t * 0.45 + seed * 1.7) * 2.5 * amt, Math.cos(t * 0.38 + seed * 2.3) * 2 * amt, 0];
}
export function paper(ctx, key = 'paper_cream', a = 1) {
  const img = IMG[key]; if (!img) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(img, 0, 0, W, H); ctx.restore();
}
// irregular torn polygon around a rectangle (deterministic per seed)
function tornPath(w, h, seed, rough = 1) {
  const r = rng(seed), pts = [];
  const edge = (x0, y0, x1, y1, n, nx, ny) => {
    for (let i = 0; i < n; i++) {
      const u = i / n, j = (r() - 0.5) * 9 * rough + (r() < 0.12 ? (r() - 0.5) * 16 * rough : 0);
      pts.push([lerp(x0, x1, u) + nx * j, lerp(y0, y1, u) + ny * j]);
    }
  };
  const nx = Math.max(8, Math.round(w / 18)), ny = Math.max(8, Math.round(h / 18));
  edge(0, 0, w, 0, nx, 0, 1); edge(w, 0, w, h, ny, -1, 0); edge(w, h, 0, h, nx, 0, -1); edge(0, h, 0, 0, ny, 1, 0);
  return pts;
}
// a torn piece of paper holding an image (or a solid colour) with a white torn fringe and a shadow
// o: {img, color, z, fx, fy, rot, a, seed, fringe, shadow, filter}
export function piece(ctx, cx, cy, w, h, o = {}) {
  const { a = 1, rot = 0, seed = 1, fringe = 5, shadow = 0.35 } = o;
  if (a <= 0.003) return;
  const pts = tornPath(w, h, seed, o.rough ?? 1), pts2 = tornPath(w + fringe * 2, h + fringe * 2, seed + 99, (o.rough ?? 1) * 1.2);
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(rot);
  const path = (p, off) => { ctx.beginPath(); p.forEach(([x, y], i) => (i ? ctx.lineTo(x - off[0], y - off[1]) : ctx.moveTo(x - off[0], y - off[1]))); ctx.closePath(); };
  // shadow + paper fringe
  ctx.save(); ctx.shadowColor = `rgba(20,10,10,${shadow})`; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8; ctx.shadowOffsetX = 4;
  path(pts2, [w / 2 + fringe, h / 2 + fringe]); ctx.fillStyle = o.paper || '#f7f1e4'; ctx.fill(); ctx.restore();
  // content
  ctx.save(); path(pts, [w / 2, h / 2]); ctx.clip();
  if (o.color) { ctx.fillStyle = o.color; ctx.fillRect(-w / 2, -h / 2, w, h); }
  if (o.img) { if (o.filter) ctx.filter = o.filter; cover(ctx, o.img, [-w / 2, -h / 2, w, h], o.z || 1, o.fx ?? 0.5, o.fy ?? 0.5); ctx.filter = 'none'; }
  if (o.draw) o.draw(ctx, w, h);
  // paper grain on top
  if (IMG.paper_cream) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.25; ctx.drawImage(IMG.paper_cream, -w / 2, -h / 2, w, h); }
  ctx.restore();
  ctx.restore();
}
// sticker (pre-bordered PNG) with drop shadow; slap-in animation handled by caller
export function sticker(ctx, img, cx, cy, h, o = {}) {
  const { a = 1, rot = 0, flip = false, shadow = 0.4, lift = 1 } = o;
  if (!img || a <= 0.003) return;
  const s = h / img.height, w = img.width * s;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
  ctx.shadowColor = `rgba(25,12,10,${shadow})`; ctx.shadowBlur = 14 * lift; ctx.shadowOffsetX = 5 * lift; ctx.shadowOffsetY = 9 * lift;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}
// entrance of a collage piece: v5 = a calm "laid down" — fades in while settling from slightly above/larger
export function slap(t, t0, dur = 0.6) {
  const u = clamp((t - t0) / dur), e = E.outCubic(u);
  return { a: u > 0 ? E.inOutSine(clamp(u * 1.4)) : 0, s: 1 + (1 - e) * 0.04, r: (1 - e) * 0.02, u };
}
export function tape(ctx, x, y, w, rot, color = 'rgba(248,236,200,0.78)', a = 1) {
  if (a <= 0.003) return;
  const h = w * 0.28;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  for (let i = 0; i <= 6; i++) ctx.lineTo(-w / 2 + (w * i) / 6, -h / 2 + (i % 2 ? 2 : -1));
  for (let i = 0; i <= 5; i++) ctx.lineTo(w / 2 + (i % 2 ? 3 : -2), -h / 2 + (h * i) / 5);
  for (let i = 6; i >= 0; i--) ctx.lineTo(-w / 2 + (w * i) / 6, h / 2 + (i % 2 ? -2 : 1));
  for (let i = 5; i >= 0; i--) ctx.lineTo(-w / 2 + (i % 2 ? -3 : 2), -h / 2 + (h * i) / 5);
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  ctx.restore();
}
// polaroid frame with an image inside
export function polaroid(ctx, img, cx, cy, w, o = {}) {
  const { a = 1, rot = 0, z = 1, fx = 0.5, fy = 0.5, caption = '', capColor = '#3a2a2a', draw = null, filter = null } = o;
  if (a <= 0.003) return;
  const h = w * 1.18, pad = w * 0.06, ih = w - pad * 2;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.save(); ctx.shadowColor = 'rgba(20,10,10,0.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#fbf8f1'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(-w / 2 + pad, -h / 2 + pad, ih, ih); ctx.clip();
  if (filter) ctx.filter = filter;
  if (img) cover(ctx, img, [-w / 2 + pad, -h / 2 + pad, ih, ih], z, fx, fy);
  ctx.filter = 'none';
  if (draw) draw(ctx, -w / 2 + pad, -h / 2 + pad, ih, ih);
  ctx.restore();
  if (caption) {
    ctx.font = font(F.hand, w * 0.075, 600); ctx.fillStyle = capColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(caption, 0, h / 2 - (h - w) / 2 + pad * 0.2);
  }
  ctx.restore();
}
// handwritten note that writes itself in (left-to-right reveal)
export function scribble(ctx, t, t0, s, x, y, size, color, rot = 0, dur = 0.8, fam = null) {
  const p = clamp((t - t0) / dur);
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = font(fam || F.hand, size, 600); ctx.fillStyle = color; ctx.textBaseline = 'middle';
  const w = ctx.measureText(s).width;
  ctx.beginPath(); ctx.rect(-10, -size, (w + 20) * E.inOutSine(p), size * 2); ctx.clip();
  ctx.fillText(s, 0, 0); ctx.restore();
}
// marker doodles: heart, star, underline swoosh, arrow — drawn progressively
export function doodle(ctx, kind, x, y, s, p, color, lw = 4) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = color; ctx.lineWidth = lw / s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const N = 60, pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    if (kind === 'heart') { const a = u * TAU; pts.push([16 * Math.pow(Math.sin(a), 3), -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))]); }
    else if (kind === 'star') { const k = Math.floor(u * 10), f = u * 10 - k; const p0 = sp(k), p1 = sp(k + 1); pts.push([lerp(p0[0], p1[0], f), lerp(p0[1], p1[1], f)]); }
    else if (kind === 'swoosh') pts.push([u * 100 - 50, Math.sin(u * Math.PI) * -6 + u * 4]);
    else if (kind === 'circle') { const a = u * TAU * 1.08 - 0.3; pts.push([Math.cos(a) * 50 * (1 + 0.04 * Math.sin(a * 3)), Math.sin(a) * 30]); }
  }
  function sp(k) { const a = -Math.PI / 2 + (k * TAU * 2) / 5; return [Math.cos(a) * 18, Math.sin(a) * 18]; }
  const n = Math.max(1, Math.floor(N * clamp(p)));
  ctx.beginPath(); pts.slice(0, n + 1).forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
  ctx.restore();
}
