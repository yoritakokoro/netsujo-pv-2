// Kinetic typography: cached glyph sprites (with glow), horizontal & vertical (tategaki) layout,
// per-character reveal synced to the aligned vocal timings.
import { clamp, lerp, E, inv, hash, makeCanvas, TAU, noise1 } from './util.js';

export const F = {
  mincho: 'Shippori',      // Shippori Mincho B1 (500/700/800)
  old: 'ZenOld',           // Zen Old Mincho (400/900)
  gothic: 'ZenKaku',       // Zen Kaku Gothic New (500/700)
  play: 'Playfair',        // Playfair Display (var 400-900, italic)
  corm: 'Cormorant',       // Cormorant Garamond (var, italic)
  bodoni: 'Bodoni',        // Bodoni Moda italic
  script: 'Pinyon',        // Pinyon Script
  cinzel: 'Cinzel',
  hand: 'Caveat',          // handwriting (latin)
  yusei: 'YuseiMagic',     // marker handwriting (japanese)
  anton: 'Anton',
  bebas: 'Bebas',
  dela: 'DelaGothic',
  dmserif: 'DMSerif',
  abril: 'Abril',
  typew: 'SpecialElite',
  klee: 'Klee',
};
export const font = (fam, size, weight = 400, italic = false) => `${italic ? 'italic ' : ''}${weight} ${size}px "${fam}"`;

const gcache = new Map();
let measureCtx = null;
export function measure(fontStr, s) {
  if (!measureCtx) measureCtx = makeCanvas(8, 8).getContext('2d');
  measureCtx.font = fontStr;
  return measureCtx.measureText(s).width;
}

// fill: css colour | {grad:[c0,c1,...]} vertical gradient
export function glyph(ch, fontStr, size, fill, o = {}) {
  const { glow = null, glowBlur = 18, stroke = null, strokeW = 0, blur = 0, shadow = null } = o;
  const key = `${ch}|${fontStr}|${JSON.stringify(fill)}|${glow}|${glowBlur}|${stroke}|${strokeW}|${blur}|${shadow}`;
  let g = gcache.get(key);
  if (g) return g;
  const adv = measure(fontStr, ch);
  const pad = Math.ceil(glowBlur * 1.6 + strokeW + blur * 3 + size * 0.15);
  const w = Math.ceil(Math.max(adv, size * 0.3) + pad * 2), h = Math.ceil(size * 1.5 + pad * 2);
  const c = makeCanvas(w, h), x = c.getContext('2d');
  x.font = fontStr; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (blur) x.filter = `blur(${blur}px)`;
  let fs = fill;
  if (fill && fill.grad) {
    const gr = x.createLinearGradient(0, h / 2 - size * 0.55, 0, h / 2 + size * 0.55);
    fill.grad.forEach((col, i) => gr.addColorStop(i / (fill.grad.length - 1), col));
    fs = gr;
  }
  if (shadow) { x.save(); x.shadowColor = shadow; x.shadowBlur = size * 0.25; x.shadowOffsetY = size * 0.06; x.fillStyle = shadow; x.fillText(ch, w / 2, h / 2); x.restore(); }
  if (glow) {
    x.save(); x.shadowColor = glow; x.shadowBlur = glowBlur; x.fillStyle = typeof fs === 'string' ? fs : glow;
    x.fillText(ch, w / 2, h / 2); x.fillText(ch, w / 2, h / 2); x.restore();
  }
  if (stroke && strokeW) { x.lineJoin = 'round'; x.strokeStyle = stroke; x.lineWidth = strokeW; x.strokeText(ch, w / 2, h / 2); }
  x.fillStyle = fs; x.fillText(ch, w / 2, h / 2);
  g = { c, w, h, adv };
  gcache.set(key, g);
  return g;
}

const ROT_V = new Set(['「', '」', 'ー', '〜', '（', '）', '—', '…', '『', '』', '-', '!', '¡']);
const SMALL_V = new Set(['っ', 'ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ッ', 'ャ', 'ュ', 'ョ']);

// returns items [{ch, x, y, rot, idx}] (centre positions relative to anchor) + extent
export function layout(text, fontStr, size, o = {}) {
  const { vertical = false, track = 0, spaceW = 0.45, lineGap = 1.25, maxPer = 0 } = o;
  const items = [];
  let pos = 0, col = 0, inCol = 0;
  const chars = [...text];
  chars.forEach((ch, i) => {
    const isSpace = ch === ' ' || ch === '　';
    if (vertical) {
      const adv = isSpace ? size * spaceW : size * (1 + track);
      if (maxPer && inCol >= maxPer && !isSpace) { col++; pos = 0; inCol = 0; }
      if (!isSpace) {
        let dx = 0, dy = 0;
        if (ch === '、' || ch === '。') { dx = size * 0.55; dy = -size * 0.55; }
        if (SMALL_V.has(ch)) { dx = size * 0.08; dy = -size * 0.1; }
        items.push({ ch, x: -col * size * lineGap + dx, y: pos + size / 2 + dy, rot: ROT_V.has(ch) ? Math.PI / 2 : 0, idx: i });
        inCol++;
      }
      pos += adv;
    } else {
      const adv = isSpace ? size * spaceW : measure(fontStr, ch) + size * track;
      if (!isSpace) items.push({ ch, x: pos + (adv - size * track) / 2, y: 0, rot: 0, idx: i });
      pos += adv;
    }
  });
  const len = pos - (vertical ? 0 : size * track);
  return { items, len, cols: col + 1 };
}

// Draw a lyric (or any string) with per-character timing.
// o: {x,y, vertical, align ('start'|'center'|'end'), font, size, fill, glow, anim, exit, times[], lead, dur, rot, track, accent}
export function drawText(ctx, t, text, o) {
  const {
    x = 0, y = 0, vertical = false, align = 'start', fontStr, size, fill = '#fff', glow = null, glowBlur = 18,
    stroke = null, strokeW = 0, anim = 'blur', exitAnim = 'fade', times = null, start = 0, lead = 0.12, dur = 0.5,
    exit = 1e9, exitDur = 0.45, rot = 0, track = 0, alpha = 1, accent = null, scale = 1, shadow = null,
    spaceW = 0.45, stagger = 0.045, maxPer = 0, lineGap = 1.25, seed = 1, hl = null,
  } = o;
  if (alpha <= 0.003 || t > exit + exitDur + 0.6) return null;
  const L = layout(text, fontStr, size, { vertical, track, spaceW, maxPer, lineGap });
  const off = align === 'center' ? -L.len / 2 : align === 'end' ? -L.len : 0;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (scale !== 1) ctx.scale(scale, scale);
  const n = L.items.length;
  L.items.forEach((it, j) => {
    const ct = times ? (times[it.idx] ?? times[times.length - 1]) : start + j * stagger;
    const p = clamp((t - (ct - lead)) / dur);
    if (p <= 0) return;
    const q = clamp((t - (exit + j * 0.018)) / exitDur);
    if (q >= 1) return;
    let col = fill, gl = glow;
    if (accent && it.idx >= accent.from && it.idx < accent.to) { col = accent.fill ?? fill; gl = accent.glow ?? glow; }
    const gOpt = { glow: gl, glowBlur, stroke, strokeW, shadow };
    let px = vertical ? it.x : it.x + off, py = vertical ? it.y + off : it.y;
    let a = 1, s = 1, r = it.rot, blurMix = 0, clipP = 1;
    const e = E.outExpo(p), ec = E.outCubic(p);
    switch (anim) {
      case 'blur': a = ec; blurMix = 1 - e; py += (1 - e) * size * 0.22; s = 1 + (1 - e) * 0.06; break;
      case 'rise': a = clamp(p * 3); py += (1 - e) * size * 0.9; break;
      case 'stamp': a = clamp(p * 5); s = 1 + (1 - E.outQuart(p)) * 1.2; blurMix = (1 - e) * 0.8; break;
      case 'drop': a = clamp(p * 3); py -= (1 - e) * size * 1.2; r += (1 - e) * (hash(j, seed) - 0.5) * 1.2; break;
      case 'ink': a = 1; clipP = E.inOutCubic(p); break;
      case 'wave': a = ec; blurMix = 1 - e; py += Math.sin(t * 2.4 + j * 0.55) * size * 0.07; px += Math.sin(t * 1.7 + j * 0.4) * size * 0.05; break;
      case 'zoom': a = ec; s = 0.78 + 0.22 * ec; blurMix = (1 - e) * 0.6; break;
      case 'slide': a = ec; px += (1 - e) * size * 1.6 * (vertical ? 0 : 1); py += vertical ? (1 - e) * size * 1.6 : 0; blurMix = (1 - e); break;
      default: a = ec;
    }
    if (q > 0) {
      const eq = E.inCubic(q);
      switch (exitAnim) {
        case 'scatter': {
          const hx = hash(j, seed + 9) - 0.5, hy = hash(j, seed + 11);
          px += eq * hx * size * 3; py -= eq * (0.5 + hy) * size * 3; r += eq * hx * 3; a *= 1 - q; blurMix = Math.max(blurMix, q);
          break;
        }
        case 'wind': px += eq * size * (3 + j * 0.25); py -= eq * size * Math.sin(j) * 0.6; a *= 1 - q; blurMix = Math.max(blurMix, q); break;
        case 'up': py -= eq * size * 0.6; a *= 1 - q; blurMix = Math.max(blurMix, q * 0.8); break;
        case 'cut': a *= q > 0.01 ? 0 : 1; break;
        default: py -= eq * size * 0.18; a *= 1 - E.outCubic(q); blurMix = Math.max(blurMix, q * 0.9);
      }
    }
    a *= alpha;
    if (a <= 0.004) return;
    ctx.save(); ctx.translate(px, py); if (r) ctx.rotate(r); if (s !== 1) ctx.scale(s, s);
    if (clipP < 1) {
      const w = vertical ? size : measure(fontStr, it.ch);
      ctx.beginPath();
      if (vertical) ctx.rect(-size, -size * 0.75, size * 2, size * 1.5 * clipP);
      else ctx.rect(-w / 2 - size * 0.2, -size, (w + size * 0.4) * clipP, size * 2);
      ctx.clip();
    }
    // sung highlight: unsung glyphs are drawn dim, sung ones bright (karaoke-like but quiet)
    let sung = 1;
    if (hl) {
      const ht = hl.times[it.idx] ?? hl.times[hl.times.length - 1];
      sung = clamp((t - (ht - 0.04)) / 0.16);
    }
    const g = glyph(it.ch, fontStr, size, col, gOpt);
    if (blurMix > 0.02) {
      const gb = glyph(it.ch, fontStr, size, hl && sung < 1 ? hl.dimFill : col, { ...gOpt, glow: hl && sung < 1 ? null : gOpt.glow, blur: Math.max(2, Math.round(size * 0.08)) });
      ctx.globalAlpha = a * blurMix * (hl ? lerp(hl.dim, 1, sung) : 1); ctx.drawImage(gb.c, -gb.w / 2, -gb.h / 2);
    }
    if (hl && sung < 1) {
      const gd = glyph(it.ch, fontStr, size, hl.dimFill, { ...gOpt, glow: null });
      ctx.globalAlpha = a * (1 - blurMix * 0.85) * hl.dim * (1 - sung);
      ctx.drawImage(gd.c, -gd.w / 2, -gd.h / 2);
    }
    ctx.globalAlpha = a * (1 - blurMix * 0.85) * sung;
    if (sung > 0.003) {
      if (hl && sung < 1) { const k = 1 + (1 - sung) * 0.04; ctx.scale(k, k); }
      ctx.drawImage(g.c, -g.w / 2, -g.h / 2);
    }
    ctx.restore();
  });
  ctx.restore();
  return L;
}

// simple static label (letter-spaced small caps style)
export function label(ctx, s, x, y, o = {}) {
  const { size = 16, fam = F.gothic, weight = 500, color = 'rgba(255,255,255,0.8)', track = 0.25, align = 'left', italic = false, alpha = 1 } = o;
  if (alpha <= 0.003) return 0;
  const fs = font(fam, size, weight, italic);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = fs; ctx.fillStyle = color; ctx.textBaseline = 'middle';
  let w = 0; const ws = [...s].map(ch => { const m = measure(fs, ch) + size * track; w += m; return m; });
  w -= size * track;
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  [...s].forEach((ch, i) => { ctx.fillText(ch, cx, y); cx += ws[i]; });
  ctx.restore();
  return w;
}
