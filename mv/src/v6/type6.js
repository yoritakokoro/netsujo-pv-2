// v6 lyric typography. Every glyph pops in on its syllable: it arrives large and white-hot, then settles
// into place and cools to its colour. Lines drift while they hold and leave with a soft blur upward.
// Kanji are set large and kana small. The current shot registers its faces; any line that overlaps a face
// is reported (console "[face]") so placements can be checked over the whole timeline.
import { W, H, clamp, lerp, E } from '../util.js';
import { F, font, glyph, measure } from '../text.js';

const isKanji = ch => /[一-鿿々]/.test(ch);
const isPunct = ch => /[、。「」『』（）！？!?,.・…]/.test(ch);
const ROT_V = new Set(['「', '」', 'ー', '〜', '（', '）', '—', '…', '『', '』']);

/* ---------------------------------------------------------------- faces */
export const FACES = [];
export function clearFaces() { FACES.length = 0; }
// register a face (world centre x, y, face height fh) under the current transform of g
export function addFace(g, x, y, fh) {
  const m = g.getTransform(), s = Math.hypot(m.a, m.b);
  const sx = m.a * x + m.c * y + m.e, sy = m.b * x + m.d * y + m.f, r = fh * 0.55 * s;
  FACES.push([sx - r * 1.05, sy - r * 1.15, r * 2.1, r * 2.45]);
}
// a local box under the current transform of g -> its screen-space bounding box
function toScreenBox(g, [x, y, w, h]) {
  const m = g.getTransform(), P = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([u, v]) => [m.a * u + m.c * v + m.e, m.b * u + m.d * v + m.f]);
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
}
const hit = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

/* ---------------------------------------------------------------- layout */
function layoutLine(text, o) {
  const S = o.size || 110, kana = o.kana ?? 0.56, track = o.track ?? 0.04, fam = o.fam || F.mincho, weight = o.weight || 800, mixed = o.mixed !== false;
  const items = []; let pos = 0;
  [...text].forEach((ch, idx) => {
    if (ch === '　' || ch === ' ') { pos += S * (o.vertical ? 0.42 : 0.34); return; }
    const s = !mixed ? S : isKanji(ch) ? S : isPunct(ch) ? S * 0.45 : S * kana;
    const adv = o.vertical ? s * (1 + track) : Math.max(measure(font(fam, s, weight, o.italic), ch), s * 0.42) + s * track;
    const lift = o.vertical || !mixed || isKanji(ch) ? 0 : (S - s) * (isPunct(ch) ? 0.36 : 0.24);
    items.push({ ch, idx, s, c: pos + adv / 2, lift, fs: font(fam, s, weight, o.italic) });
    pos += adv;
  });
  return { items, len: pos, S };
}
export function lineBox(text, o) {
  const L = layoutLine(text, o), S = L.S, off = o.align === 'center' ? -L.len / 2 : o.align === 'end' ? -L.len : 0;
  return o.vertical ? [o.x - S * 0.6, o.y + off - S * 0.1, S * 1.2, L.len + S * 0.2] : [o.x + off, o.y - S * 0.62, L.len, S * 1.24];
}

/* ---------------------------------------------------------------- singing a line */
// o: x, y, size, vertical, align, kana, track, fam, weight, italic, fill, glow, glowBlur, stroke, strokeW, shadow,
//    hot (white-hot colour), pop (extra scale), lead, dur, exit, exitDur, drift [dx,dy], alpha, accent {from,to,fill,glow}, tag
export function sing(g, t, text, times, o = {}) {
  const exit = o.exit ?? 1e9, exitDur = o.exitDur ?? 0.5, alpha = o.alpha ?? 1;
  if (alpha <= 0.003 || t > exit + exitDur + 0.4 || !times || !times.length) return;
  const t0 = times[0] - (o.lead ?? 0.08);
  if (t < t0 - 0.05) return;
  const L = layoutLine(text, o), S = L.S, off = o.align === 'center' ? -L.len / 2 : o.align === 'end' ? -L.len : 0;
  const life = clamp((t - t0) / Math.max(0.5, exit - t0)), dr = o.drift || [0, 0];
  const x = o.x + dr[0] * life, y = o.y + dr[1] * life;
  if (o.avoid !== false && FACES.length) { const box = toScreenBox(g, lineBox(text, { ...o, x, y })); if (FACES.some(f => hit(box, f))) console.log(`[face] ${o.tag || text} @${t.toFixed(2)}`); }
  const pop = o.pop ?? 0.55, fill = o.fill || '#fbf4e8', glow = o.glow ?? 'rgba(255,214,170,0.35)', hot = o.hot || '#ffffff';
  g.save(); g.translate(x, y);
  L.items.forEach((it, j) => {
    const ct = times[it.idx] ?? times[times.length - 1];
    const p = clamp((t - (ct - (o.lead ?? 0.08))) / (o.dur ?? 0.5)); if (p <= 0) return;
    const q = clamp((t - (exit + j * 0.022)) / exitDur); if (q >= 1) return;
    const e = E.outExpo(p), a = E.outCubic(clamp(p * 2.2)) * (1 - E.inCubic(q)) * alpha;
    if (a <= 0.004) return;
    const heat = (1 - E.outCubic(clamp((t - ct) / 0.65))) * (o.heat ?? 1);
    let col = fill, gl = glow;
    if (o.accent && it.idx >= o.accent.from && it.idx < o.accent.to) { col = o.accent.fill ?? fill; gl = o.accent.glow ?? glow; }
    const gb = (o.glowBlur ?? 22) * it.s / S + 6;
    const opt = { glow: gl, glowBlur: gb, stroke: o.stroke || null, strokeW: (o.strokeW || 0) * it.s / S, shadow: o.shadow === undefined ? 'rgba(8,2,4,0.55)' : o.shadow };
    const px = o.vertical ? 0 : off + it.c, py = o.vertical ? off + it.c : it.lift;
    const sc = 1 + pop * (1 - e) * (isKanji(it.ch) ? 1 : 0.7), rise = -(1 - e) * it.s * 0.12 - q * it.s * 0.3;
    const blurMix = Math.max((1 - e) * 0.9, q * 0.9);
    g.save(); g.translate(px, py + rise); if (o.vertical && ROT_V.has(it.ch)) g.rotate(Math.PI / 2); g.scale(sc, sc);
    const gN = glyph(it.ch, it.fs, it.s, col, opt);
    if (blurMix > 0.02) { const gB = glyph(it.ch, it.fs, it.s, col, { ...opt, blur: Math.max(2, Math.round(it.s * 0.07)) }); g.globalAlpha = a * blurMix; g.drawImage(gB.c, -gB.w / 2, -gB.h / 2); }
    g.globalAlpha = a * (1 - blurMix * 0.85) * (1 - heat * 0.7); g.drawImage(gN.c, -gN.w / 2, -gN.h / 2);
    if (heat > 0.02) { const gH = glyph(it.ch, it.fs, it.s, hot, { glow: 'rgba(255,236,210,0.95)', glowBlur: gb * 1.6, shadow: null });
      g.globalAlpha = a * heat * (1 - blurMix * 0.6); g.drawImage(gH.c, -gH.w / 2, -gH.h / 2); }
    g.restore();
  });
  g.restore();
}

/* ---------------------------------------------------------------- hooks: Enamorar!! / ¡Olé! / Especial!! */
// letters slam in from large and bright, a hairline sweeps under them, then the word breathes on the beat
export function slam(g, t, text, times, o = {}) {
  const exit = o.exit ?? 1e9;
  if (t < times[0] - 0.1 || t > exit + 0.7) return;
  const S = o.size || 210, fs = font(o.fam || F.dmserif, S, 400, o.italic !== false);
  const chars = [...text]; let len = 0; const adv = chars.map(ch => { const w = measure(fs, ch) + S * (o.track ?? 0.01); len += w; return w; });
  const out = E.inCubic(clamp((t - exit) / 0.55)), X = o.x ?? W / 2, Y = o.y ?? H / 2;
  if (FACES.length && out < 1) { const box = toScreenBox(g, [X - len / 2, Y - S * 0.62, len, S * 1.24]); if (FACES.some(f => hit(box, f))) console.log(`[face] ${o.tag || text} @${t.toFixed(2)}`); }
  g.save(); g.translate(X, Y); g.scale(1 + (o.breathe || 0), 1 + (o.breathe || 0));
  let cx = -len / 2;
  chars.forEach((ch, k) => {
    const ct = times[Math.min(k, times.length - 1)] + (k >= times.length ? (k - times.length + 1) * 0.05 : 0);
    const p = clamp((t - (ct - 0.05)) / 0.42); if (p <= 0) { cx += adv[k]; return; }
    const e = E.outExpo(p), a = clamp(p * 3) * (1 - out), sc = 1 + 1.3 * (1 - e), heat = 1 - E.outCubic(clamp((t - ct) / 0.7));
    g.save(); g.translate(cx + adv[k] / 2, (1 - e) * -S * 0.15 - out * S * 0.2); g.scale(sc, sc);
    const gN = glyph(ch, fs, S, o.fill || { grad: ['#fffaf0', '#ffe2b0', '#f2b866'] }, { glow: o.glow || 'rgba(255,150,80,0.6)', glowBlur: 30, shadow: 'rgba(30,0,8,0.5)' });
    g.globalAlpha = a * (1 - heat * 0.6); g.drawImage(gN.c, -gN.w / 2, -gN.h / 2);
    if (heat > 0.02) { const gH = glyph(ch, fs, S, '#ffffff', { glow: 'rgba(255,240,220,1)', glowBlur: 46 }); g.globalAlpha = a * heat; g.drawImage(gH.c, -gH.w / 2, -gH.h / 2); }
    g.restore(); cx += adv[k];
  });
  const sw = E.outExpo(clamp((t - times[0]) / 0.9)) * (1 - out);
  if (o.rule !== false && sw > 0) { g.globalAlpha = sw; (o.ruleColors || ['#C4BCB7', '#F8A4BD', '#F04E98', '#AB192C', '#E89CDC']).forEach((c, k) => { g.fillStyle = c; g.fillRect(-len / 2 + (len / 5) * k * sw, S * 0.62, (len / 5) * sw - 4, 4); }); }
  if (o.gloss) { g.globalAlpha = sw * 0.9; g.font = font(F.gothic, 20, 500); g.fillStyle = '#fbf4e8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.gloss, 0, S * 0.62 + 34); }
  g.restore();
}
