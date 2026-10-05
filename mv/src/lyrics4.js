// v4 lyric layer: phrase-level reveal + sung highlight (no singer labels). Split lines (このまま／このまま) show each singer's half
// on its own side. Collage sections print the lyric on torn paper strips instead.
import { W, H, clamp, lerp, E, smooth, makeCanvas } from './util.js';
import { T } from './timing.js';
import { F, font, drawText, label, layout, measure } from './text.js';
import { IMG, rgba, softDot } from './gfx.js';
import { MEM, ORDER } from './kit4.js';
import { piece } from './collage.js';

const IV = '#fbf4e8';
const GLOSS = { 'Enamorar!!': '恋　に　落　ち　て', 'Especial!!': 'と　く　べ　つ', 'Amanecer!!': '夜　明　け', 'Lleno de amor': '愛　に　満　ち　て', 'Canción de amor': '愛　の　歌' };
const M = (s, w = 700) => font(F.mincho, s, w);

// ---------------------------------------------------------------- layout table
const L = {};
const set = (ids, o) => ids.forEach(i => (L[i] = { ...(L[i] || {}), ...o }));
set([4, 5], { slot: 'col', y: 165, until: 23.45 }); L[4].x = 1700; L[5].x = 1590;
set([6, 7], { slot: 'col', y: 165, until: 30.3 }); L[6].x = 1700; L[7].x = 1590;
set([8], { slot: 'strip', x: 130, y: 870, rot: -0.025, until: 31.75 });
set([9], { slot: 'strip', x: 130, y: 870, rot: 0.018, until: 34.75, echo: [1460, 900, -0.08] });
set([10], { slot: 'strip', x: 1730, y: 150, rot: 0.02, vertical: true, size: 70, until: 36.4 });
set([11], { slot: 'strip', x: 960, y: 930, rot: -0.015, align: 'center', until: 38.45, echo: [1500, 820, 0.06] });
set([12], { slot: 'low', side: 'L' }); set([13], { slot: 'center', y: 540, size: 76 });
set([15, 18, 54, 57], { slot: 'low', side: 'L' }); set([16, 55], { slot: 'low', side: 'R' });
set([19, 20, 36, 37, 58, 59, 61, 62], { slot: 'split' });
set([21, 38], { slot: 'low', side: 'R' });
set([23, 24], { slot: 'strip', x: 120, rot: -0.02 }); L[23].y = 840; L[23].until = 87.45; L[24].y = 930; L[24].rot = 0.015; L[24].until = 87.5;
set([25, 26], { slot: 'strip', x: 1800, align: 'end', rot: 0.02 }); L[25].y = 840; L[25].until = 94.3; L[26].y = 930; L[26].rot = -0.012; L[26].until = 94.35;
set([27], { slot: 'col', x: 1700, y: 160, maxPer: 10, echo: [1250, 330, -0.05] });
set([28], { slot: 'col', x: 330, y: 160, maxPer: 10, echo: [700, 800, 0.05] });
set([29], { slot: 'low', side: 'L' }); set([30], { slot: 'center', y: 560, size: 72 });
set([32, 35], { slot: 'low', side: 'L' }); set([33], { slot: 'low', side: 'R' });
set([40, 41], { slot: 'low', side: 'L' }); set([42, 43], { slot: 'low', side: 'R' });
set([44], { slot: 'col', x: 1690, y: 170 });
set([45, 46], { slot: 'low', side: 'L' }); L[46].size = 74;
set([48, 49], { slot: 'low', side: 'L' }); set([51], { slot: 'low', side: 'R' }); set([52], { slot: 'low', side: 'L' });
set([60], { slot: 'low', side: 'L' }); set([63], { slot: 'center', y: 540, size: 68 });
[14, 17, 31, 34, 47, 50, 53, 56].forEach(i => (L[i] = { slot: 'hero' }));
[14, 17, 53, 56].forEach(i => (L[i].x = 600));
L[31].y = 250;
[22, 39, 64].forEach(i => (L[i] = { slot: 'script' }));

function cfg(i) {
  const l = T.lines[i], nx = T.lines[i + 1], c = { size: 56, ...(L[i] || { slot: 'low', side: 'L' }) };
  c.appear = l.start - 0.34;
  const lend = l.hold || l.end, nextStart = nx ? nx.start : l.end + 3;
  c.exit = c.until ?? Math.max(lend + 0.2, Math.min(lend + 0.9, nextStart - 0.05));
  if (c.slot === 'low') { // rolling pair on the same side
    const n1 = T.lines[i + 1], c1 = L[i + 1];
    if (n1 && c1 && c1.slot === 'low' && c1.side === c.side && n1.sec === l.sec) c.exit = Math.min(lend + 2.4, T.lines[i + 2] ? T.lines[i + 2].start - 0.25 : lend + 2);
    else c.exit = Math.min(Math.max(lend + 0.25, c.exit), nx ? Math.max(nx.start + 0.6, lend + 0.2) : lend + 0.8);
  }
  if (c.slot === 'hero') c.exit = Math.min(nextStart + 0.6, T.lines[i + 2] ? T.lines[i + 2].start - 0.35 : l.end + 2);
  if (c.slot === 'script') c.exit = lend + 0.15;
  if (c.slot === 'split') c.exit = Math.max(lend + 0.25, Math.min(lend + 0.7, nextStart - 0.1));
  if (nx && L[i + 1] && L[i + 1].slot === 'hero' && c.slot !== 'script') c.exit = Math.min(c.exit, nx.start - 0.25);
  if (nx && L[i + 1] && L[i + 1].slot === 'center' && c.slot === 'center') c.exit = Math.min(c.exit, nx.start - 0.3);
  c.hl = hlTimes(l);
  return c;
}
function hlTimes(l) {
  const chars = [...l.text];
  const wts = chars.map(c => (/[　 ]/.test(c) ? 0.25 : /[、「」（）!！¡]/.test(c) ? 0.1 : /[A-Za-zñó]/.test(c) ? 0.55 : 1));
  const tot = wts.reduce((a, b) => a + b, 0);
  let acc = 0, prev = l.start - 1;
  const end = l.end - Math.min(0.5, (l.end - l.start) * 0.18);
  return chars.map((c, j) => {
    const u = l.start + (end - l.start) * (acc / tot); acc += wts[j];
    let v = 0.45 * (l.chars[j] ?? u) + 0.55 * u; v = Math.max(v, prev + 0.01); prev = v;
    return clamp(v, l.start, l.end);
  });
}
const CFG = new Map();
export const lineCfg = i => { if (!CFG.has(i)) CFG.set(i, cfg(i)); return CFG.get(i); };

// ---------------------------------------------------------------- singer plate
function chibiFace(who) {
  const key = { yo: 'c_yo', na: 'c_na', shi: 'c_shi', to: 'c_to', ri: 'c_ri' }[who];
  const img = IMG[key + '_plain']; if (!img) return null;
  const k = '_face';
  if (img[k]) return img[k];
  const s = 96, c = makeCanvas(s, s), g = c.getContext('2d');
  g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); g.clip();
  g.fillStyle = MEM[who].light; g.fillRect(0, 0, s, s);
  const fw = img.width * 0.78, fx = (img.width - fw) / 2, fy = img.height * 0.03;
  g.drawImage(img, fx, fy, fw, fw, 0, 0, s, s);
  img[k] = c; return c;
}
export function plate() { /* singer labels intentionally not shown */ }
const inkOf = who => (who.length === 1 ? MEM[who[0]].ink : who.length === 5 ? '#ffd59a' : MEM[who[0]].ink);

// underline that grows under sung characters (horizontal) or beside them (vertical)
function sungLine(ctx, t, text, fs, size, track, x, y, align, times, who, vertical = false) {
  const Lr = layout(text, fs, size, { vertical, track });
  const off = align === 'center' ? -Lr.len / 2 : align === 'end' ? -Lr.len : 0;
  const cols = ['rgba(242,217,166,0.85)'];
  ctx.save(); ctx.lineCap = 'round';
  Lr.items.forEach((it, j) => {
    const ht = times[it.idx]; const p = clamp((t - ht + 0.04) / 0.2);
    if (p <= 0) return;
    ctx.strokeStyle = cols[j % cols.length]; ctx.lineWidth = Math.max(3, size * 0.06); ctx.globalAlpha = 0.95;
    ctx.beginPath();
    if (vertical) { const cx = x + it.x + size * 0.62, cy = y + it.y + off; ctx.moveTo(cx, cy - size * 0.5); ctx.lineTo(cx, cy - size * 0.5 + size * p); }
    else { const w = measure(fs, it.ch) + size * track, cx = x + it.x + off; ctx.moveTo(cx - w / 2, y + size * 0.66); ctx.lineTo(cx - w / 2 + w * p, y + size * 0.66); }
    ctx.stroke();
  });
  ctx.restore();
  return Lr;
}

function lowShade(ctx, a) {
  if (a <= 0.01) return;
  const g = ctx.createLinearGradient(0, 660, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,3,6,0.6)');
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(0, 660, W, H - 660); ctx.restore();
}

export function drawLyrics(ctx, t) {
  let shade = 0;
  T.lines.forEach((l, i) => {
    if (i < 4) return;
    const c = lineCfg(i);
    if (['low', 'split'].includes(c.slot)) shade = Math.max(shade, smooth(c.appear - 0.2, c.appear + 0.3, t) * (1 - smooth(c.exit, c.exit + 0.6, t)));
  });
  lowShade(ctx, shade);
  T.lines.forEach((l, i) => {
    if (i < 4) return;
    const c = lineCfg(i);
    if (t < c.appear - 0.1 || t > c.exit + 1.0) return;
    const who = l.parts[0].who, size = c.size;
    const fs = M(size, c.weight || 700);
    const base = { fontStr: fs, size, fill: IV, track: 0.08, glow: 'rgba(255,220,190,0.25)', glowBlur: 12, shadow: 'rgba(0,0,0,0.6)',
      start: c.appear, stagger: 0.02, dur: 0.5, lead: 0, anim: 'blur', exit: c.exit, exitAnim: 'fade', exitDur: 0.45,
      hl: { times: c.hl, dim: 0.42, dimFill: IV }, maxPer: c.maxPer || 0, lineGap: 1.3 };
    const pa = smooth(c.appear, c.appear + 0.35, t) * (1 - smooth(c.exit, c.exit + 0.4, t));
    if (c.slot === 'col') {
      let alpha = 1; const nx = T.lines[i + 1];
      if (nx && L[i + 1] && L[i + 1].slot === 'col' && t > nx.start - 0.3) alpha = lerp(1, 0.45, clamp((t - nx.start + 0.3) / 0.5));
      plate(ctx, who, c.x + size * 0.5, c.y - 34, pa * alpha, 'right', 0.85);
      drawText(ctx, t, l.text, { ...base, x: c.x, y: c.y, vertical: true, alpha });
      sungLine(ctx, t, l.text, fs, size, 0.08, c.x, c.y, 'start', c.hl, who, true);
    } else if (c.slot === 'low') {
      const nx = T.lines[i + 1]; let dy = 0, alpha = 1;
      if (nx && L[i + 1] && L[i + 1].slot === 'low' && L[i + 1].side === c.side && nx.sec === l.sec) {
        const k = E.inOutCubic(clamp((t - (nx.start - 0.34)) / 0.5)); dy = -k * size * 1.75; alpha = lerp(1, 0.45, k);
      }
      const R = c.side === 'R', x = R ? W - 140 : 140, y = 930 + dy, align = R ? 'end' : 'start';
      plate(ctx, who, x, y - size * 1.0, pa * alpha, R ? 'right' : 'left');
      drawText(ctx, t, l.text, { ...base, x, y, align, alpha });
      ctx.save(); ctx.globalAlpha = alpha; sungLine(ctx, t, l.text, fs, size, 0.08, x, y, align, c.hl, who); ctx.restore();
    } else if (c.slot === 'center') {
      const y = c.y || 540;
      ctx.save(); ctx.globalAlpha = 0.6 * pa; ctx.translate(960, y); ctx.scale(1500 / 256, size * 3.4 / 256); ctx.drawImage(softDot('#0a0306', 256), -128, -128); ctx.restore();
      plate(ctx, who, 960, y - size * 1.05, pa, 'center');
      drawText(ctx, t, l.text, { ...base, x: 960, y, align: 'center' });
      sungLine(ctx, t, l.text, fs, size, 0.08, 960, y, 'center', c.hl, who);
    } else if (c.slot === 'split') {
      const chars = [...l.text], cut = l.parts[1].from;
      const parts = [[chars.slice(0, cut).join('').trim(), l.parts[0].who, 0], [chars.slice(cut).join('').trim(), l.parts[1].who, cut]];
      parts.forEach(([s, w, from], k) => {
        const R = k === 1, x = R ? W - 150 : 150, y = R ? 960 : 870, align = R ? 'end' : 'start';
        const ap = from === 0 ? c.appear : (l.chars[from] ?? l.start) - 0.3;
        const times = c.hl.slice(from, from + [...s].length);
        const a = smooth(ap, ap + 0.3, t) * (1 - smooth(c.exit, c.exit + 0.4, t));
        plate(ctx, w, x, y - size * 1.0, a, R ? 'right' : 'left');
        drawText(ctx, t, s, { ...base, x, y, align, start: ap, hl: { times, dim: 0.42, dimFill: IV } });
        sungLine(ctx, t, s, fs, size, 0.08, x, y, align, times, w);
      });
    } else if (c.slot === 'strip') {
      drawStrip(ctx, t, l, c, who, fs, size, pa);
    } else if (c.slot === 'hero') heroLine(ctx, t, l, c);
    else if (c.slot === 'script') scriptLine(ctx, t, l, c);
    if (c.echo && l.echo) {
      const ts = l.end - 0.05, a = smooth(ts, ts + 0.3, t) * (1 - smooth(ts + 1.5, ts + 2.0, t));
      if (a > 0.01) {
        ctx.save(); ctx.translate(c.echo[0], c.echo[1] - (t - ts) * 10); ctx.rotate(c.echo[2]);
        drawText(ctx, t, '（' + l.echo + '）', { x: 0, y: 0, size: 46, fontStr: font(F.yusei, 46, 400), fill: '#fbe6c8', glow: 'rgba(255,170,90,0.8)', glowBlur: 16, start: ts, stagger: 0.08, anim: 'blur', track: 0.2, alpha: a });
        ctx.restore();
      }
    }
  });
}

// collage: the lyric is typed on a torn paper strip
function drawStrip(ctx, t, l, c, who, fs, size, pa) {
  const vertical = !!c.vertical, s = c.size || 50, f = M(s, 700);
  const Lr = layout(l.text, f, s, { vertical, track: 0.06 });
  const w = vertical ? s * 1.7 : Lr.len + s * 1.3, h = vertical ? Lr.len + s * 1.2 : s * 1.75;
  const align = c.align || 'start';
  const cx = vertical ? c.x : align === 'center' ? c.x : align === 'end' ? c.x - w / 2 : c.x + w / 2;
  const cy = vertical ? c.y + h / 2 : c.y;
  const inP = E.outBack(clamp((t - c.appear) / 0.35)), outP = E.inCubic(clamp((t - c.exit) / 0.35));
  if (inP <= 0 || outP >= 1) return;
  ctx.save();
  ctx.translate(cx + outP * (align === 'end' ? 400 : -400), cy); ctx.rotate(c.rot || 0); ctx.scale(lerp(0.85, 1, inP), lerp(0.85, 1, inP));
  ctx.globalAlpha = clamp(inP * 2) * (1 - outP);
  piece(ctx, 0, 0, w, h, { color: '#f6efe0', seed: l.start * 10 | 0, fringe: 3, shadow: 0.4 });
  ctx.fillStyle = '#9a1028'; // paper tab
  if (vertical) ctx.fillRect(-w / 2, -h / 2 - 4, w, 10); else ctx.fillRect(-w / 2 - 4, -h / 2, 10, h);
  const x0 = vertical ? 0 : -w / 2 + s * 0.65, y0 = vertical ? -h / 2 + s * 0.6 : 2;
  drawText(ctx, t, l.text, { fontStr: f, size: s, fill: '#1f1514', track: 0.06, x: x0, y: y0, vertical, start: c.appear + 0.1, stagger: 0.02, dur: 0.3, anim: 'ink',
    hl: { times: c.hl, dim: 0.35, dimFill: '#1f1514' }, exit: 1e9 });
  ctx.restore();
  const pr = vertical ? [c.x + w / 2 + 8, c.y - 18, 'left'] : align === 'end' ? [c.x, cy - h / 2 - 22, 'right'] : [c.x, cy - h / 2 - 22, 'left'];
  plate(ctx, who, pr[0], pr[1], clamp(inP * 2) * (1 - outP), pr[2], 0.9);
}

function heroLine(ctx, t, l, c) {
  const size = 200, fs = font(F.dmserif, size, 400, true);
  const a = smooth(l.start - 0.12, l.start + 0.2, t) * (1 - smooth(c.exit, c.exit + 0.5, t));
  if (a <= 0.003) return;
  const X = c.x || 960, Y = c.y || 470;
  ctx.save(); ctx.globalAlpha = 0.75 * a; ctx.translate(X, Y); ctx.scale(1700 / 256, 600 / 256); ctx.drawImage(softDot('#0a0306', 256), -128, -128); ctx.restore();
  drawText(ctx, t, l.text, { x: X, y: Y, align: 'center', size, fontStr: fs, fill: { grad: ['#fffaf0', '#ffe2b0', '#f2b866'] }, glow: 'rgba(255,170,90,0.55)', glowBlur: 28,
    track: 0.02, times: l.chars, lead: 0.08, dur: 0.45, anim: 'zoom', exit: c.exit, exitAnim: 'fade', exitDur: 0.5, shadow: 'rgba(40,0,10,0.5)' });
  const len = layout(l.text, fs, size, { track: 0.02 }).len;
  const pr = E.outExpo(clamp((t - l.start) / 0.9)) * a;
  ORDER.forEach((w, k) => { ctx.save(); ctx.globalAlpha = pr; ctx.fillStyle = MEM[w].ink; ctx.fillRect(X - len / 2 + (len / 5) * k * pr, Y + 118, (len / 5) * pr - 4, 4); ctx.restore(); });
  label(ctx, GLOSS[l.text] || '', X, Y + 160, { size: 20, weight: 500, color: IV, track: 0.35, align: 'center', alpha: a * smooth(l.start + 0.15, l.start + 0.6, t) * 0.9 });
}
function scriptLine(ctx, t, l, c) {
  const size = 160, fs = font(F.script, size, 400), last = l.text === 'Lleno de amor' && l.start > 200;
  const left = last || (l.text === 'Lleno de amor' && l.start < 100);
  const X = left ? 600 : 960, Y = last ? 560 : 500;
  const a = smooth(l.start - 0.2, l.start + 0.5, t) * (1 - smooth(c.exit, c.exit + 0.8, t));
  if (a <= 0.003) return;
  if (!last) { ctx.save(); ctx.globalAlpha = 0.5 * a; ctx.translate(X, Y + 20); ctx.scale(1500 / 256, 480 / 256); ctx.drawImage(softDot('#0a0306', 256), -128, -128); ctx.restore(); }
  drawText(ctx, t, l.text, { x: X, y: Y, align: 'center', size, fontStr: fs, fill: last ? { grad: ['#b8283e', '#8a1428', '#5a0a1a'] } : { grad: ['#fff6e0', '#f6d58e', '#d9a548'] },
    glow: last ? 'rgba(255,240,230,0.8)' : 'rgba(255,190,120,0.55)', glowBlur: 24, start: l.start - 0.15, stagger: 0.06, dur: 0.8, anim: 'blur', exit: c.exit, exitAnim: 'up', exitDur: 0.8 });
  label(ctx, GLOSS[l.text] || '', X, Y + 130, { size: 20, weight: 500, color: last ? '#7a1f2a' : IV, track: 0.35, align: 'center', alpha: a * 0.9 });
}
// prologue chants are drawn by the opening scene (singer-specific)
export function chant(ctx, t, i, x, y, o = {}) {
  const l = T.lines[i], size = o.size || 170;
  const fs = o.fontStr || font(F.dmserif, size, 400, true);
  drawText(ctx, t, l.text, { x, y, align: o.align || 'center', size, fontStr: fs, fill: o.fill || IV, glow: o.glow || 'rgba(255,200,150,0.5)', glowBlur: 24,
    track: 0.02, times: l.chars, lead: 0.06, dur: 0.4, anim: 'zoom', exit: o.exit ?? 1e9, exitAnim: 'fade', exitDur: 0.25, shadow: 'rgba(0,0,0,0.45)' });
  plate(ctx, l.parts[0].who, x + (o.plateDx || 0), y - size * 0.75, smooth(l.start - 0.2, l.start + 0.1, t) * (1 - smooth(o.exit ?? 1e9, (o.exit ?? 1e9) + 0.25, t)), o.align === 'start' ? 'left' : o.align === 'end' ? 'right' : 'center', 1.1);
}
