// Procedural flamenco / Andalusian graphic elements. No photographic material:
// every texture here (roses, petals, fans, tiles, stars, moon, sea, embers, grain)
// is generated in code so the video contains no people other than the provided art.
import { W, H, TAU, P, clamp, lerp, hash, rng, noise1, fbm1, hexA, makeCanvas, E, inv, smooth } from './util.js';

const cache = new Map();
const memo = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };

/* ---------- basic sprites ---------- */
export function glowSprite(hex, size = 256, core = 0.0) {
  return memo(`glow${hex}${size}${core}`, () => {
    const c = makeCanvas(size, size), g = c.getContext('2d'), r = size / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, hexA(hex, 1)); gr.addColorStop(core + 0.12, hexA(hex, 0.55));
    gr.addColorStop(0.45, hexA(hex, 0.16)); gr.addColorStop(1, hexA(hex, 0));
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  });
}
export function sparkleSprite(hex = '#fff6dc', size = 128) {
  return memo(`spark${hex}${size}`, () => {
    const c = makeCanvas(size, size), g = c.getContext('2d'), r = size / 2;
    g.drawImage(glowSprite(hex, size), 0, 0);
    g.globalCompositeOperation = 'lighter';
    for (const [len, wid, rot] of [[r, r * 0.06, 0], [r * 0.55, r * 0.04, Math.PI / 4]]) {
      for (let k = 0; k < 4; k++) {
        g.save(); g.translate(r, r); g.rotate(rot + (k * Math.PI) / 2);
        const gr = g.createLinearGradient(0, 0, len, 0);
        gr.addColorStop(0, hexA('#ffffff', 1)); gr.addColorStop(1, hexA(hex, 0));
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(0, -wid); g.lineTo(len, 0); g.lineTo(0, wid); g.closePath(); g.fill();
        g.restore();
      }
    }
    const cg = g.createRadialGradient(r, r, 0, r, r, r * 0.12);
    cg.addColorStop(0, '#ffffff'); cg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = cg; g.fillRect(0, 0, size, size);
    return c;
  });
}
export function draw(ctx, img, x, y, s = 1, rot = 0, alpha = 1, op = null) {
  if (alpha <= 0.002) return;
  ctx.save();
  if (op) ctx.globalCompositeOperation = op;
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(s, s);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
}

/* ---------- film grain & vignette ---------- */
export function grainTiles() {
  return memo('grain', () => {
    const out = [];
    for (let k = 0; k < 6; k++) {
      const c = makeCanvas(256, 256), g = c.getContext('2d');
      const im = g.createImageData(256, 256), r = rng(100 + k);
      for (let i = 0; i < im.data.length; i += 4) {
        const v = Math.floor(128 + (r() + r() + r() - 1.5) * 120);
        im.data[i] = im.data[i + 1] = im.data[i + 2] = clamp(v, 0, 255); im.data[i + 3] = 255;
      }
      g.putImageData(im, 0, 0); out.push(c);
    }
    return out;
  });
}
export function vignette(strength = 0.75) {
  return memo('vig' + strength, () => {
    const c = makeCanvas(W, H), g = c.getContext('2d');
    g.translate(W / 2, H / 2); g.scale(1, H / W);
    const gr = g.createRadialGradient(0, 0, W * 0.25, 0, 0, W * 0.72);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, `rgba(0,0,0,${strength * 0.35})`);
    gr.addColorStop(1, `rgba(0,0,0,${strength})`);
    g.fillStyle = gr; g.fillRect(-W, -W, W * 2, W * 2);
    return c;
  });
}
export function applyGrain(ctx, t, amt = 0.09) {
  const tiles = grainTiles(), k = Math.floor(t * 24) % tiles.length;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amt;
  const pat = ctx.createPattern(tiles[k], 'repeat');
  const ox = Math.floor(hash(Math.floor(t * 24), 3) * 256), oy = Math.floor(hash(Math.floor(t * 24), 4) * 256);
  pat.setTransform(new DOMMatrix([1.5, 0, 0, 1.5, ox, oy]));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ---------- petals & roses ---------- */
const PETAL_PALETTES = {
  crimson: ['#4d0410', '#a50f27', '#e23a4f', '#ff9aa4'],
  scarlet: ['#6a0a10', '#d0212f', '#ff5a4a', '#ffc0a8'],
  orange: ['#7a2a05', '#e0661a', '#ffa23c', '#ffe0a8'],
  gold: ['#6a4310', '#c98f2c', '#f2cd78', '#fff2c8'],
  blush: ['#8a3a4a', '#e48a96', '#f8c3c3', '#fff0ec'],
};
export function petalSprite(pal = 'crimson', v = 0, size = 96) {
  return memo(`petal${pal}${v}${size}`, () => {
    const c = makeCanvas(size, size), g = c.getContext('2d'), cl = PETAL_PALETTES[pal];
    const r = rng(77 + v * 13), s = size / 2;
    g.translate(s, s); g.rotate(r() * TAU);
    const w = s * (0.55 + r() * 0.2), h = s * (0.85 + r() * 0.1), notch = r() * 0.25;
    g.beginPath();
    g.moveTo(0, h * 0.9);
    g.bezierCurveTo(-w * 1.1, h * 0.3, -w * 0.9, -h * 0.85, -w * 0.15, -h * 0.9);
    g.quadraticCurveTo(0, -h * (0.9 - notch), w * 0.15, -h * 0.9);
    g.bezierCurveTo(w * 0.9, -h * 0.85, w * 1.1, h * 0.3, 0, h * 0.9);
    g.closePath();
    const gr = g.createRadialGradient(0, h * 0.7, 0, 0, 0, h * 1.2);
    gr.addColorStop(0, cl[0]); gr.addColorStop(0.45, cl[1]); gr.addColorStop(0.85, cl[2]); gr.addColorStop(1, cl[3]);
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    g.globalCompositeOperation = 'screen';
    const hl = g.createLinearGradient(-w, -h, w * 0.6, h * 0.4);
    hl.addColorStop(0, 'rgba(255,230,230,0.35)'); hl.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = hl; g.fillRect(-s, -s, size, size);
    g.globalCompositeOperation = 'multiply'; g.strokeStyle = hexA(cl[0], 0.25); g.lineWidth = 1;
    for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(0, h * 0.85); g.quadraticCurveTo(k * w * 0.2, 0, k * w * 0.28, -h * 0.85); g.stroke(); }
    g.restore();
    return c;
  });
}

// Stylised rose seen from above; drawn as spiral layers of cupped petals.
export function drawRose(ctx, x, y, R, rot = 0, bloom = 1, pal = 'crimson', seed = 1, alpha = 1) {
  if (alpha <= 0.003 || R < 1) return;
  const cl = PETAL_PALETTES[pal], r = rng(seed * 31 + 5);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= alpha;
  const layers = 6;
  for (let L = 0; L < layers; L++) {
    const fr = 1 - L / layers;
    const rad = R * (0.18 + 0.82 * fr) * lerp(0.35, 1, clamp(bloom * 1.3 - L * 0.08));
    const cnt = L < 2 ? 5 : L < 4 ? 4 : 3;
    for (let k = 0; k < cnt; k++) {
      const a = (k / cnt) * TAU + L * 0.73 + r() * 0.3;
      ctx.save(); ctx.rotate(a);
      const pw = rad * (0.95 - L * 0.05), ph = rad;
      ctx.beginPath();
      ctx.moveTo(-pw * 0.15, rad * 0.05);
      ctx.bezierCurveTo(-pw * 0.9, rad * 0.25, -pw * 0.75, ph * 1.0, 0, ph * 1.02);
      ctx.bezierCurveTo(pw * 0.75, ph * 1.0, pw * 0.9, rad * 0.25, pw * 0.15, rad * 0.05);
      ctx.closePath();
      const gr = ctx.createLinearGradient(0, 0, 0, ph);
      gr.addColorStop(0, cl[0]); gr.addColorStop(0.55, cl[1]); gr.addColorStop(0.92, cl[2]); gr.addColorStop(1, cl[3]);
      ctx.fillStyle = gr; ctx.fill();
      ctx.strokeStyle = hexA(cl[0], 0.55); ctx.lineWidth = Math.max(0.6, R * 0.012); ctx.stroke();
      ctx.restore();
    }
  }
  // tight centre swirl
  ctx.strokeStyle = hexA(cl[0], 0.8); ctx.lineWidth = Math.max(0.8, R * 0.02);
  ctx.beginPath();
  for (let a = 0; a < TAU * 2.2; a += 0.15) {
    const rr = R * 0.02 + R * 0.075 * (a / TAU);
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}
export function roseSprite(pal = 'crimson', seed = 1, size = 256) {
  return memo(`rose${pal}${seed}${size}`, () => {
    const c = makeCanvas(size, size), g = c.getContext('2d');
    g.save(); g.globalAlpha = 0.5; g.drawImage(glowSprite('#000000', size), 0, size * 0.04); g.restore();
    drawRose(g, size / 2, size / 2, size * 0.42, 0, 1, pal, seed, 1);
    return c;
  });
}

// Gold line-art rose, drawn progressively (prog 0..1)
export function lineRose(ctx, x, y, R, prog, color = P.gold, lw = 2, rot = 0) {
  if (prog <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  const paths = [];
  // spiral heart
  paths.push(a => { const t = a * 3.2 * Math.PI; const rr = R * 0.03 + R * 0.09 * t / Math.PI; return [Math.cos(t) * rr, Math.sin(t) * rr]; });
  // petals: rings of arcs
  const rings = [[0.42, 3, 0.2], [0.62, 4, 1.1], [0.82, 5, 0.4], [1.0, 5, 1.6]];
  rings.forEach(([rf, n, off]) => {
    for (let k = 0; k < n; k++) {
      const a0 = off + (k / n) * TAU, a1 = a0 + (TAU / n) * 1.12;
      paths.push(u => {
        const a = lerp(a0, a1, u);
        const bulge = Math.sin(u * Math.PI);
        const rr = R * rf * (0.82 + 0.18 * bulge);
        return [Math.cos(a) * rr, Math.sin(a) * rr];
      });
    }
  });
  const total = paths.length;
  paths.forEach((fn, i) => {
    const p = clamp(prog * total * 0.9 - i * 0.7);
    if (p <= 0) return;
    ctx.beginPath();
    const steps = 36;
    for (let s = 0; s <= steps * p; s++) {
      const [px, py] = fn(s / steps);
      s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
  });
  // leaves
  const lp = clamp(prog * 1.6 - 0.6);
  if (lp > 0) {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.rotate(Math.PI / 2 + s * 0.6); ctx.translate(0, R * 1.05);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(R * 0.35 * s * lp, R * 0.45 * lp, 0, R * 0.9 * lp);
      ctx.quadraticCurveTo(-R * 0.25 * s * lp, R * 0.45 * lp, 0, 0); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

/* ---------- fan (abanico) ---------- */
export function sectorPath(ctx, cx, cy, r0, r1, a0, a1) {
  ctx.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0);
  ctx.arc(cx, cy, r1, a0, a1, false);
  ctx.arc(cx, cy, r0, a1, a0, true);
  ctx.closePath();
}
export function drawFan(ctx, o) {
  const { cx, cy, R, a0, span, ribs = 15, c1 = P.crimson, c2 = P.carmine, dot = P.champagne, lace = P.ivory,
    stick = '#2a0a10', rin = 0.36, alpha = 1, dots = true, laceOn = true, gold = P.gold } = o;
  if (span < 0.004 || alpha <= 0.003) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  const n = ribs, r0 = R * rin;
  // sticks
  ctx.strokeStyle = stick; ctx.lineCap = 'round';
  for (let k = 0; k <= n; k++) {
    const a = a0 + (span * k) / n;
    ctx.lineWidth = k === 0 || k === n ? R * 0.022 : R * 0.012;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.04, cy + Math.sin(a) * R * 0.04);
    ctx.lineTo(cx + Math.cos(a) * r0 * 1.02, cy + Math.sin(a) * r0 * 1.02); ctx.stroke();
  }
  // pleated paper
  for (let k = 0; k < n; k++) {
    const s0 = a0 + (span * k) / n, s1 = a0 + (span * (k + 1)) / n, sm = (s0 + s1) / 2;
    ctx.beginPath(); sectorPath(ctx, cx, cy, r0, R, s0, sm); ctx.fillStyle = c1; ctx.fill();
    ctx.beginPath(); sectorPath(ctx, cx, cy, r0, R, sm, s1); ctx.fillStyle = c2; ctx.fill();
    if (dots) {
      ctx.fillStyle = dot;
      const rows = 6;
      for (let j = 0; j < rows; j++) {
        const rr = lerp(r0 * 1.12, R * 0.9, (j + 0.5) / rows);
        const f = (j % 2) ? 0.3 : 0.72;
        const a = lerp(s0, s1, f);
        const dr = R * 0.018 * (0.6 + 0.4 * (rr / R));
        ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, dr, dr * 0.85, a, 0, TAU); ctx.fill();
      }
    }
  }
  // gold hairline borders
  ctx.strokeStyle = hexA(gold, 0.85); ctx.lineWidth = R * 0.004;
  ctx.beginPath(); ctx.arc(cx, cy, r0, a0, a0 + span); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.93, a0, a0 + span); ctx.stroke();
  // lace scallops
  if (laceOn) {
    const m = Math.max(3, Math.round(n * 3));
    ctx.fillStyle = lace;
    for (let k = 0; k < m; k++) {
      const a = a0 + (span * (k + 0.5)) / m, half = span / m / 2;
      const rr = R * 1.0, sr = Math.max(1, rr * half);
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, sr, a - Math.PI / 2, a + Math.PI / 2); ctx.fill();
    }
    ctx.beginPath(); sectorPath(ctx, cx, cy, R * 0.965, R * 1.0, a0, a0 + span); ctx.fill();
    ctx.fillStyle = c2;
    for (let k = 0; k < Math.round(n * 3); k++) {
      const a = a0 + (span * (k + 0.5)) / Math.round(n * 3);
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 1.005, cy + Math.sin(a) * R * 1.005, R * 0.006, 0, TAU); ctx.fill();
    }
  }
  // pivot
  ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(cx, cy, R * 0.03, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ---------- Andalusian architecture ---------- */
// Horseshoe arch: total width w, legs reach `bottom`, crown at top.
export function archPath(ctx, x, bottom, w, h, beta = 0.42) {
  const r = w / 2, cy = bottom - h + r;
  ctx.moveTo(x - r * Math.cos(beta), bottom);
  ctx.lineTo(x - r * Math.cos(beta), cy + r * Math.sin(beta));
  ctx.arc(x, cy, r, Math.PI - beta, TAU + beta, false);
  ctx.lineTo(x + r * Math.cos(beta), bottom);
  ctx.closePath();
  return { cy, r };
}
// Cordoba-style alternating voussoirs around a horseshoe arch.
export function voussoirs(ctx, x, cy, r, band, beta, n, ca, cb, prog = 1) {
  const a0 = Math.PI - beta, a1 = TAU + beta, span = (a1 - a0) * prog;
  for (let k = 0; k < n; k++) {
    const s0 = a0 + ((a1 - a0) * k) / n, s1 = a0 + ((a1 - a0) * (k + 1)) / n;
    if (s0 > a0 + span) break;
    ctx.beginPath(); sectorPath(ctx, x, cy, r, r + band, s0, Math.min(s1, a0 + span));
    ctx.fillStyle = k % 2 ? ca : cb; ctx.fill();
  }
}

// Eight-point star tile (Nasrid zellige feel), returned as a canvas.
export function zelligeTile(color = P.gold, size = 200, lw = 2) {
  return memo(`zel${color}${size}${lw}`, () => {
    const c = makeCanvas(size, size), g = c.getContext('2d'), s = size;
    g.strokeStyle = color; g.lineWidth = lw; g.lineJoin = 'miter';
    const star = (x, y, r) => {
      for (const rot of [0, Math.PI / 4]) {
        g.save(); g.translate(x, y); g.rotate(rot);
        g.strokeRect(-r, -r, r * 2, r * 2); g.restore();
      }
      g.beginPath(); g.arc(x, y, r * 0.42, 0, TAU); g.stroke();
      // inner 8-point rosette
      g.beginPath();
      for (let k = 0; k <= 16; k++) {
        const a = (k / 16) * TAU, rr = k % 2 ? r * 0.62 : r * 0.95;
        const px = x + Math.cos(a + Math.PI / 8) * rr * 0.6, py = y + Math.sin(a + Math.PI / 8) * rr * 0.6;
        k ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.stroke();
    };
    const r = s * 0.29;
    for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s], [s / 2, s / 2]]) star(x, y, r);
    // connecting cross bands
    g.beginPath();
    g.moveTo(s / 2, 0); g.lineTo(s / 2, s * 0.08); g.moveTo(s / 2, s); g.lineTo(s / 2, s * 0.92);
    g.moveTo(0, s / 2); g.lineTo(s * 0.08, s / 2); g.moveTo(s, s / 2); g.lineTo(s * 0.92, s / 2);
    g.stroke();
    return c;
  });
}
export function fillPattern(ctx, tile, alpha, scale = 1, rot = 0, ox = 0, oy = 0, op = null, rect = [0, 0, W, H]) {
  if (alpha <= 0.003) return;
  ctx.save(); if (op) ctx.globalCompositeOperation = op; ctx.globalAlpha *= alpha;
  const pat = ctx.createPattern(tile, 'repeat');
  const m = new DOMMatrix().translate(W / 2 + ox, H / 2 + oy).rotate((rot * 180) / Math.PI).scale(scale);
  pat.setTransform(m);
  ctx.fillStyle = pat; ctx.fillRect(...rect);
  ctx.restore();
}

// polka dots (lunares) tile
export function dotTile(color = P.champagne, size = 64, r = 9, bg = null) {
  return memo(`dot${color}${size}${r}${bg}`, () => {
    const c = makeCanvas(size, size), g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, size, size); }
    g.fillStyle = color;
    for (const [x, y] of [[size / 4, size / 4], [(3 * size) / 4, (3 * size) / 4]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    return c;
  });
}
// halftone dots growing toward an edge
export function halftone(ctx, color, spacing, maxR, fn, alpha = 1, rect = [0, 0, W, H]) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
  const [x0, y0, w, h] = rect;
  for (let y = y0; y < y0 + h + spacing; y += spacing) {
    const row = Math.round((y - y0) / spacing);
    for (let x = x0 + (row % 2 ? spacing / 2 : 0); x < x0 + w + spacing; x += spacing) {
      const r = maxR * clamp(fn(x, y));
      if (r > 0.4) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
    }
  }
  ctx.fill(); ctx.restore();
}

/* ---------- lace & ornamental frames ---------- */
export function laceStrip(color = P.ivory, h = 46) {
  return memo(`lace${color}${h}`, () => {
    const w = 96, c = makeCanvas(w, h), g = c.getContext('2d');
    g.fillStyle = color;
    g.fillRect(0, 0, w, h * 0.32);
    for (const x of [0, w / 2, w]) { g.beginPath(); g.arc(x, h * 0.32, w / 4, 0, Math.PI); g.fill(); }
    g.globalCompositeOperation = 'destination-out';
    for (const x of [0, w / 2, w]) {
      g.beginPath(); g.arc(x, h * 0.42, w * 0.07, 0, TAU); g.fill();
      for (let k = 0; k < 5; k++) { const a = Math.PI * (0.15 + k * 0.175); g.beginPath(); g.arc(x + Math.cos(a) * w * 0.17, h * 0.32 + Math.sin(a) * w * 0.17, w * 0.022, 0, TAU); g.fill(); }
    }
    for (let x = 6; x < w; x += 12) { g.beginPath(); g.arc(x, h * 0.16, 2.6, 0, TAU); g.fill(); }
    return c;
  });
}
export function drawLace(ctx, y, color, flip = false, alpha = 1, offset = 0, scale = 1) {
  const tile = laceStrip(color);
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(0, y); if (flip) ctx.scale(1, -1);
  const pat = ctx.createPattern(tile, 'repeat-x');
  pat.setTransform(new DOMMatrix().translate(offset, 0).scale(scale));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, tile.height * scale);
  ctx.restore();
}
export function ornamentFrame(ctx, x, y, w, h, color, prog = 1, lw = 1.5) {
  if (prog <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
  const p = E.inOutCubic(clamp(prog));
  const per = (w + h) * 2;
  ctx.setLineDash([per * p, per]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([per * p * 1.02, per * 1.1]);
  ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);
  ctx.setLineDash([]);
  const ca = clamp(prog * 2 - 1);
  if (ca > 0) {
    ctx.globalAlpha *= ca;
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, sy);
      ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI / 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI / 2); ctx.stroke();
      ctx.save(); ctx.translate(26, 26); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore();
      ctx.restore();
    }
  }
  ctx.restore();
}

/* ---------- sky, stars, moon, sea, sun ---------- */
export function stars(ctx, t, n, seed, rect = [0, 0, W, H], alpha = 1, big = 0.04, color = '#fff6dc') {
  if (alpha <= 0.003) return;
  const [x0, y0, w, h] = rect, sp = sparkleSprite(color, 96), gl = glowSprite(color, 32);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = x0 + hash(i, seed) * w, y = y0 + Math.pow(hash(i, seed + 1), 1.3) * h;
    const tw = 0.55 + 0.45 * Math.sin(t * (1.2 + hash(i, seed + 2) * 3) + hash(i, seed + 3) * TAU);
    const isBig = hash(i, seed + 4) < big;
    const s = isBig ? 0.35 + hash(i, seed + 5) * 0.5 : 0.25 + hash(i, seed + 5) * 0.55;
    ctx.globalAlpha = alpha * tw * (isBig ? 1 : 0.85);
    const img = isBig ? sp : gl, d = img.width * s;
    ctx.drawImage(img, x - d / 2, y - d / 2, d, d);
  }
  ctx.restore();
}
export function moonSprite(size = 420) {
  return memo('moon' + size, () => {
    const c = makeCanvas(size, size), g = c.getContext('2d'), r = size / 2;
    const gr = g.createRadialGradient(r * 0.85, r * 0.8, r * 0.1, r, r, r);
    gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.7, '#f3e6d4'); gr.addColorStop(1, '#d8c3b6');
    g.fillStyle = gr; g.beginPath(); g.arc(r, r, r, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(r, r, r, 0, TAU); g.clip();
    const rn = rng(9);
    g.filter = 'blur(6px)';
    for (let k = 0; k < 14; k++) {
      g.fillStyle = `rgba(170,140,150,${0.04 + rn() * 0.06})`;
      g.beginPath(); g.arc(r + (rn() - 0.5) * size * 0.8, r + (rn() - 0.5) * size * 0.8, size * (0.04 + rn() * 0.14), 0, TAU); g.fill();
    }
    g.filter = 'blur(1px)';
    for (let k = 0; k < 40; k++) {
      g.strokeStyle = `rgba(150,120,130,${0.04 + rn() * 0.06})`; g.lineWidth = 1.2;
      g.beginPath(); g.arc(r + (rn() - 0.5) * size * 0.9, r + (rn() - 0.5) * size * 0.9, size * (0.005 + rn() * 0.03), 0, TAU); g.stroke();
    }
    g.restore();
    return c;
  });
}
export function drawMoon(ctx, x, y, r, alpha = 1, halo = '#f6d9ff') {
  if (alpha <= 0.003) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = 'lighter';
  const g = glowSprite(halo, 512); ctx.globalAlpha *= 0.55;
  ctx.drawImage(g, x - r * 4, y - r * 4, r * 8, r * 8);
  ctx.globalAlpha /= 0.55;
  ctx.globalCompositeOperation = 'source-over';
  const m = moonSprite(); ctx.drawImage(m, x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
export function drawSea(ctx, t, horizon, lightX, colTop, colBot, glint = '#fff0e0', alpha = 1, glintAmt = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  const gr = ctx.createLinearGradient(0, horizon, 0, H);
  gr.addColorStop(0, colTop); gr.addColorStop(1, colBot);
  ctx.fillStyle = gr; ctx.fillRect(0, horizon, W, H - horizon);
  // wave lines
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const depth = i / 70, y = horizon + Math.pow(depth, 1.8) * (H - horizon) + 2;
    const spread = 40 + depth * 520;
    const nseg = 3 + Math.floor(depth * 6);
    for (let k = 0; k < nseg; k++) {
      const ph = hash(i * 7 + k, 11);
      const x = lightX + (ph - 0.5) * spread * 2 + Math.sin(t * (0.6 + ph) + i) * 18 * depth;
      const len = (8 + depth * 90) * (0.4 + hash(i * 7 + k, 12));
      const fl = 0.5 + 0.5 * Math.sin(t * (2 + ph * 3) + ph * 40);
      ctx.globalAlpha = alpha * glintAmt * fl * (1 - Math.abs(x - lightX) / (spread * 1.2 + 1)) * 0.9;
      if (ctx.globalAlpha <= 0.01) continue;
      ctx.fillStyle = glint; ctx.fillRect(x - len / 2, y, len, 1 + depth * 2.5);
    }
  }
  ctx.restore();
}
export function drawSun(ctx, cx, cy, R, rot, rays, ca, cb, alpha = 1) {
  if (alpha <= 0.003) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let k = 0; k < rays; k++) {
    const a0 = rot + (k / rays) * TAU, a1 = a0 + TAU / rays;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
    ctx.fillStyle = k % 2 ? ca : cb; ctx.fill();
  }
  ctx.restore();
}

/* ---------- particles (closed form in t: deterministic) ---------- */
export function embers(ctx, t, n, seed, opts = {}) {
  const { colors = ['#ffb347', '#ff6a2a', '#ffd27a'], speed = 120, alpha = 1, size = 1, rect = [0, 0, W, H], sway = 40 } = opts;
  if (alpha <= 0.003) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const [x0, y0, w, h] = rect;
  for (let i = 0; i < n; i++) {
    const sp = speed * (0.5 + hash(i, seed));
    const life = (h + 200) / sp;
    const ph = hash(i, seed + 1) * life;
    const u = ((t + ph) % life) / life;
    const y = y0 + h + 100 - u * (h + 200);
    const x = x0 + hash(i, seed + 2) * w + Math.sin(t * (0.7 + hash(i, seed + 3)) + i) * sway + noise1(t * 0.5 + i, seed) * sway;
    const fl = 0.55 + 0.45 * Math.sin(t * (5 + hash(i, seed + 4) * 7) + i);
    const s = size * (6 + hash(i, seed + 5) * 18) * (1 - u * 0.6);
    const img = glowSprite(colors[i % colors.length], 64);
    ctx.globalAlpha = alpha * fl * Math.sin(u * Math.PI);
    ctx.drawImage(img, x - s, y - s, s * 2, s * 2);
  }
  ctx.restore();
}
export function petals(ctx, t, n, seed, opts = {}) {
  const { pal = ['crimson', 'scarlet'], speed = 90, alpha = 1, size = 1, wind = 60, rect = [0, 0, W, H], dirY = 1 } = opts;
  if (alpha <= 0.003) return;
  const [x0, y0, w, h] = rect;
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let i = 0; i < n; i++) {
    const sp = speed * (0.6 + hash(i, seed) * 0.8);
    const life = (h + 240) / sp, ph = hash(i, seed + 1) * life;
    const u = ((t + ph) % life) / life;
    let y = y0 - 120 + u * (h + 240); if (dirY < 0) y = y0 + h + 120 - u * (h + 240);
    const x = x0 + ((hash(i, seed + 2) * w + wind * (t + ph) + Math.sin(t * 1.3 + i) * 50) % (w + 200) + w + 200) % (w + 200) - 100;
    const spin = t * (1 + hash(i, seed + 3) * 2) + i;
    const sx = Math.cos(spin * 1.3), s = size * (0.35 + hash(i, seed + 4) * 0.55);
    const img = petalSprite(pal[i % pal.length], i % 5);
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin * 0.7); ctx.scale(s * (0.25 + 0.75 * Math.abs(sx)), s);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }
  ctx.restore();
}
export function bubbles(ctx, t, n, seed, alpha = 1, color = '#ffe9f2') {
  if (alpha <= 0.003) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color;
  for (let i = 0; i < n; i++) {
    const sp = 40 + hash(i, seed) * 70, life = (H + 200) / sp, ph = hash(i, seed + 1) * life;
    const u = ((t + ph) % life) / life;
    const y = H + 100 - u * (H + 200), x = hash(i, seed + 2) * W + Math.sin(t + i) * 30;
    const r = 6 + hash(i, seed + 3) * 34;
    const pop = u > 0.85 ? 1 - inv(0.85, 1, u) : 1;
    ctx.globalAlpha = alpha * 0.7 * pop;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, Math.PI, Math.PI * 1.5); ctx.stroke();
  }
  ctx.restore();
}
export function rings(ctx, t, cx, cy, hits, color, alpha = 1, maxR = 1100, dur = 2.4, lw = 2) {
  ctx.save(); ctx.strokeStyle = color;
  for (const h of hits) {
    const u = (t - h) / dur;
    if (u < 0 || u > 1) continue;
    for (let k = 0; k < 3; k++) {
      const uk = u - k * 0.06; if (uk < 0) continue;
      ctx.globalAlpha = alpha * (1 - uk) * (k ? 0.45 : 0.9);
      ctx.lineWidth = lw * (1 + (1 - uk) * 2);
      ctx.beginPath(); ctx.arc(cx, cy, E.outCubic(uk) * maxR, 0, TAU); ctx.stroke();
    }
  }
  ctx.restore();
}
// big soft drifting colour blobs (light leaks / bokeh)
export function leaks(ctx, t, colors, n, seed, alpha = 1, size = 900) {
  if (alpha <= 0.003) return;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const x = W * (0.5 + 0.55 * noise1(t * 0.07 + i * 3.1, seed + i));
    const y = H * (0.5 + 0.55 * noise1(t * 0.06 + i * 5.7, seed + 50 + i));
    const s = size * (0.6 + 0.6 * hash(i, seed));
    ctx.globalAlpha = alpha * (0.35 + 0.25 * Math.sin(t * 0.5 + i));
    ctx.drawImage(glowSprite(colors[i % colors.length], 256), x - s / 2, y - s / 2, s, s);
  }
  ctx.restore();
}

/* ---------- rouge brush stroke ---------- */
export function brushTexture(color = '#c0142f', w = 1500, h = 190, seed = 3) {
  return memo(`brush${color}${w}${h}${seed}`, () => {
    const c = makeCanvas(w, h), g = c.getContext('2d'), r = rng(seed);
    const base = parseInt(color.slice(1), 16), R = (base >> 16) & 255, G = (base >> 8) & 255, B = base & 255;
    for (let b = 0; b < 140; b++) {
      const y = h * 0.12 + r() * h * 0.76, th = 1 + r() * 5;
      const sh = r() * 0.35;
      g.strokeStyle = `rgba(${Math.round(R * (1 - sh) + 255 * sh * 0.25)},${Math.round(G * (1 - sh))},${Math.round(B * (1 - sh))},${0.25 + r() * 0.6})`;
      g.lineWidth = th; g.lineCap = 'round';
      g.beginPath();
      const startX = r() * w * 0.06, endX = w * (0.82 + r() * 0.18);
      g.moveTo(startX, y);
      for (let x = startX; x < endX; x += 30) {
        const yy = y + Math.sin(x * 0.004 + b) * h * 0.04 + (x / w) * h * -0.08;
        if (r() < 0.04) { g.stroke(); g.beginPath(); g.moveTo(x + 20 + r() * 40, yy); x += 40; continue; }
        g.lineTo(x, yy);
      }
      g.stroke();
    }
    // tapered ends
    g.globalCompositeOperation = 'destination-in';
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0.2)'); gr.addColorStop(0.06, 'rgba(0,0,0,1)');
    gr.addColorStop(0.85, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    return c;
  });
}
export function drawBrush(ctx, x, y, w, h, prog, color, rot = 0, alpha = 1, seed = 3) {
  if (prog <= 0 || alpha <= 0.003) return;
  const tex = brushTexture(color, 1500, 190, seed);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.rect(0, -h, w * prog, h * 2); ctx.clip();
  ctx.drawImage(tex, 0, -h / 2, w, h);
  ctx.restore();
}

/* ---------- image helpers ---------- */
// draw image covering a rect with Ken Burns zoom (z) and focus (fx, fy in 0..1 of image)
export function coverImage(ctx, img, rect, z = 1, fx = 0.5, fy = 0.5, alpha = 1) {
  if (alpha <= 0.003) return;
  const [x, y, w, h] = rect;
  const s = Math.max(w / img.width, h / img.height) * z;
  const dw = img.width * s, dh = img.height * s;
  let dx = x + w / 2 - fx * dw, dy = y + h / 2 - fy * dh;
  dx = clamp(dx, x + w - dw, x); dy = clamp(dy, y + h - dh, y);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(img, dx, dy, dw, dh); ctx.restore();
}
// silhouette (solid-colour version of a transparent cut-out), for outlines/shadows
export function silhouette(img, color) {
  return memo(`sil${img.src || img.width}${color}`, () => {
    const c = makeCanvas(img.width, img.height), g = c.getContext('2d');
    g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  });
}
export function outlined(img, color, px = 6) {
  return memo(`out${img.src || img.width}${color}${px}`, () => {
    const c = makeCanvas(img.width + px * 4, img.height + px * 4), g = c.getContext('2d');
    const sil = silhouette(img, color);
    for (let a = 0; a < TAU; a += TAU / 24) g.drawImage(sil, px * 2 + Math.cos(a) * px, px * 2 + Math.sin(a) * px);
    g.drawImage(img, px * 2, px * 2);
    return c;
  });
}
export function blurred(img, px) {
  return memo(`blur${img.src || img.width}${px}`, () => {
    const pad = px * 3, c = makeCanvas(img.width + pad * 2, img.height + pad * 2), g = c.getContext('2d');
    g.filter = `blur(${px}px)`; g.drawImage(img, pad, pad);
    c.pad = pad; return c;
  });
}
// duotone (maps luminance to a dark->light gradient)
export function duotone(img, dark, light, key = '') {
  return memo(`duo${img.src || img.width}${dark}${light}${key}`, () => {
    const c = makeCanvas(img.width, img.height), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
    const p = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const c0 = p(dark), c1 = p(light);
    for (let i = 0; i < a.length; i += 4) {
      const l = (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11) / 255;
      const u = l * l * (3 - 2 * l);
      a[i] = c0[0] + (c1[0] - c0[0]) * u; a[i + 1] = c0[1] + (c1[1] - c0[1]) * u; a[i + 2] = c0[2] + (c1[2] - c0[2]) * u;
    }
    g.putImageData(d, 0, 0);
    return c;
  });
}

/* ---------- crimson silk (pre-blurred fold texture, animated by offset) ---------- */
export function silkTexture() {
  return memo('silk', () => {
    const w = W + 400, h = H + 400, c = makeCanvas(w, h), g = c.getContext('2d'), r = rng(42);
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#7a0a1e'); gr.addColorStop(0.5, '#b8142c'); gr.addColorStop(1, '#6a0818');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.filter = 'blur(26px)';
    for (let k = 0; k < 26; k++) {
      const y0 = r() * h, amp = 60 + r() * 140, f = 0.002 + r() * 0.003, ph = r() * 6;
      const light = k % 3 === 0;
      g.strokeStyle = light ? `rgba(255,120,120,${0.25 + r() * 0.25})` : `rgba(40,0,8,${0.35 + r() * 0.3})`;
      g.lineWidth = 30 + r() * 90;
      g.beginPath();
      for (let x = -50; x <= w + 50; x += 30) { const y = y0 + Math.sin(x * f + ph) * amp + x * 0.25; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
    }
    g.filter = 'blur(6px)';
    for (let k = 0; k < 18; k++) {
      const y0 = r() * h, amp = 50 + r() * 120, f = 0.002 + r() * 0.004, ph = r() * 6;
      g.strokeStyle = `rgba(255,190,190,${0.12 + r() * 0.15})`; g.lineWidth = 3 + r() * 8;
      g.beginPath();
      for (let x = -50; x <= w + 50; x += 30) { const y = y0 + Math.sin(x * f + ph) * amp + x * 0.25; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
    }
    return c;
  });
}
// silk sheet occupying [top, bottom] with wavy edges
export function drawSilk(ctx, t, top, bottom, alpha = 1) {
  if (alpha <= 0.003 || bottom <= top) return;
  const tex = silkTexture();
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.moveTo(-20, top + Math.sin(t * 1.3) * 40);
  for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, top + Math.sin(x * 0.0035 + t * 1.4) * 46 + Math.sin(x * 0.009 - t) * 14);
  for (let x = W + 40; x >= -40; x -= 40) ctx.lineTo(x, bottom + Math.sin(x * 0.004 - t * 1.2) * 46);
  ctx.closePath();
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.fillStyle = '#6a0818'; ctx.fill(); ctx.restore();
  ctx.clip();
  const ox = -200 + Math.sin(t * 0.6) * 120, oy = -200 + Math.cos(t * 0.45) * 80;
  ctx.drawImage(tex, ox, oy);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= 0.45;
  ctx.drawImage(tex, -200 - Math.sin(t * 0.8) * 160, -200 + Math.sin(t * 0.5) * 100, W + 400, H + 400);
  ctx.restore();
}
