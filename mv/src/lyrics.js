// Lyric layer v2. Each line fades in as a whole phrase just ahead of the vocal, then a quiet
// "sung" highlight follows the aligned singing; lines hold until the vocal ends.
// Slots: vertical columns (tategaki), rolling two-line stack, chorus call-and-response L/R,
// centre statements, Spanish exclamations, script lines, and backing-vocal echoes.
import { W, H, P, clamp, E, lerp, hexA, smooth } from './util.js';
import { T } from './timing.js';
import { F, font, drawText, label, layout, measure } from './text.js';
import { softDot } from './shots.js';

const IV = '#fbf3e6';
const GOLD = '#f2d9a6';
const GLOSS = { 'Enamorar!!': '恋　に　落　ち　て', 'Especial!!': 'と　く　べ　つ', 'Amanecer!!': '夜　明　け', 'Lleno de amor': '愛　に　満　ち　て', 'Canción de amor': '愛　の　歌' };
const mincho = (s, w = 500) => font(F.mincho, s, w);

// smoothed per-character sung times: blend aligned times with a mora-weighted uniform spread
function hlTimes(l) {
  const chars = [...l.text];
  const wts = chars.map(c => (/[　 ]/.test(c) ? 0.25 : /[、「」（）!！¡]/.test(c) ? 0.1 : /[A-Za-zñó]/.test(c) ? 0.55 : 1));
  const tot = wts.reduce((a, b) => a + b, 0);
  let acc = 0;
  const end = l.end - Math.min(0.5, (l.end - l.start) * 0.18);
  let prev = l.start - 1;
  return chars.map((c, j) => {
    const u = l.start + (end - l.start) * (acc / tot);
    acc += wts[j];
    const a = l.chars[j] ?? u;
    let v = 0.45 * a + 0.55 * u;
    v = Math.max(v, prev + 0.01); prev = v;
    return clamp(v, l.start, l.end);
  });
}

// slot of a line without building its whole config (used to look one line ahead)
function cfg_slot(i) {
  const l = T.lines[i]; if (!l) return null;
  if (l.sec === 'A2' || l.sec === 'P2' || (l.sec === 'D' && i <= 43) || (l.sec === 'E' && !/Especial/.test(l.text))) return 'stack';
  return 'other';
}
function cfg(i) {
  const l = T.lines[i], nx = T.lines[i + 1];
  const c = { size: 58, fontStr: mincho(58, 500), fill: IV, track: 0.1, slot: 'lc' };
  const sec = l.sec;
  if (sec === 'A1') Object.assign(c, { slot: 'col', x: 1660 - (i - 4) * 104, y: 175, size: 56, fontStr: mincho(56, 500), until: 30.3, exitDur: 0.3 });
  if (sec === 'B1') {
    if (i === 8) Object.assign(c, { slot: 'free', x: 160, y: 900, align: 'start', size: 64, fontStr: mincho(64, 700) });
    if (i === 9) Object.assign(c, { slot: 'free', x: 160, y: 900, align: 'start', size: 58, anim: 'ink', echo: [1180, 780, -0.06] });
    if (i === 10) Object.assign(c, { slot: 'free', x: 960, y: 210, vertical: true, size: 128, fontStr: mincho(128, 800), track: 0.18, anim: 'blur' });
    if (i === 11) Object.assign(c, { slot: 'free', x: 960, y: 905, align: 'center', size: 58, anim: 'wave', exitAnim: 'wind', echo: [1430, 820, 0.05] });
  }
  if (sec === 'P1') {
    if (i === 12) Object.assign(c, { slot: 'free', x: 150, y: 540, align: 'start', size: 66, fontStr: mincho(66, 700), accent: { from: 3, to: 10, fill: GOLD } });
    if (i === 13) Object.assign(c, { slot: 'free', x: 960, y: 560, align: 'center', size: 76, fontStr: mincho(76, 700), exitAnim: 'up', backdrop: 0.6 });
  }
  if (sec === 'A2' || sec === 'P2' || (sec === 'D' && i <= 43) || (sec === 'E' && !/Especial/.test(l.text))) {
    Object.assign(c, { slot: 'stack', y: sec === 'E' ? 930 : 905, size: sec === 'E' ? 60 : 54, fontStr: mincho(sec === 'E' ? 60 : 54, sec === 'E' ? 700 : 500) });
    if (i === 49) c.accent = { from: 2, to: 4, fill: '#ffcf9a' };
  }
  if (sec === 'B2') Object.assign(c, { slot: 'col', x: i === 27 ? 1660 : 1450, y: 175, size: 52, maxPer: 10, until: 102.45, echo: i === 27 ? [1040, 300, -0.05] : [1060, 780, 0.05] });
  if (sec === 'D' && i >= 44) Object.assign(c, { slot: 'col', x: 560 - (i - 44) * 112, y: 150, size: 54, until: 191.25, fontStr: mincho(54, i === 46 ? 700 : 500) });
  if (/^(Enamorar|Amanecer|Especial)/.test(l.text)) Object.assign(c, { slot: 'hero' });
  else if (/^(Lleno|Canción)/.test(l.text)) Object.assign(c, { slot: 'script' });
  else if (sec === 'C1' || sec === 'C2' || sec === 'C3') {
    const side = { 15: 'L', 16: 'R', 18: 'L', 20: 'R', 21: 'L', 32: 'L', 33: 'R', 35: 'L', 37: 'R', 38: 'L', 54: 'L', 55: 'R', 57: 'L', 59: 'R', 62: 'L' }[i];
    Object.assign(c, { slot: side || 'center', size: 62, fontStr: mincho(62, 700), track: 0.08 });
    if (!side) Object.assign(c, { size: 84, fontStr: mincho(84, 700), backdrop: 0.55 });
    if (i === 60) Object.assign(c, { size: 76, fontStr: mincho(76, 700), cy: 430 });
    if (i === 63) Object.assign(c, { size: 64, fontStr: mincho(64, 500), track: 0.16, backdrop: 0.35, until: 235.05 });
    if (i === 21) c.accent = { from: 5, to: 8, fill: '#ffc890' };
  }
  // timing: appear ahead of the vocal, hold to the end of the sung phrase
  c.appear = l.start - 0.34;
  const nextStart = nx ? nx.start : l.end + 3;
  const lend = l.hold || l.end;   // sustained final notes hold the line on screen
  c.exit = c.until ?? Math.max(lend + 0.2, Math.min(lend + 0.9, nextStart - 0.05));
  if (c.slot === 'stack') {
    const nextIsStack = nx && nx.sec === l.sec && cfg_slot(i + 1) === 'stack';
    c.exit = nextIsStack ? Math.min(l.end + 2.2, T.lines[i + 2] ? T.lines[i + 2].start - 0.3 : l.end + 2) : Math.min(l.end + 0.7, nx ? nx.start - 0.1 : l.end + 0.7);
  }
  if (c.slot === 'hero') c.exit = Math.min(nextStart + 0.55, (T.lines[i + 2] ? T.lines[i + 2].start - 0.4 : l.end + 2));
  if (nx && /^(Enamorar|Amanecer|Especial)/.test(nx.text) && c.slot !== 'script') c.exit = Math.min(c.exit, nx.start - 0.3);
  if (c.slot === 'script') c.exit = lend + 0.1;
  if (i === 13) c.exit = 47.6;
  if (i === 52) c.exit = 208.5;
  if (i === 30) c.exit = 111.9;
  c.hl = { times: hlTimes(l), dim: 0.38, dimFill: c.dimFill || IV };
  return c;
}
const CFG = new Map();
export const lineCfg = i => { if (!CFG.has(i)) CFG.set(i, cfg(i)); return CFG.get(i); };

function backdrop(ctx, x, y, w, h, a) {
  if (a <= 0.003) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(w / 256, h / 256);
  ctx.drawImage(softDot('rgba(8,2,6,1)', 256), -128, -128); ctx.restore();
}

export function drawLyrics(ctx, t, letterbox = 0) {
  // bottom shade so lower-third lines read over bright photos
  let lowVis = 0;
  T.lines.forEach((l, i) => {
    if (i < 4) return;
    const c = lineCfg(i);
    if (['lc', 'L', 'R', 'stack', 'free'].includes(c.slot) && (c.y || 900) > 700) {
      lowVis = Math.max(lowVis, smooth(c.appear - 0.2, c.appear + 0.3, t) * (1 - smooth(c.exit, c.exit + 0.6, t)));
    }
  });
  if (lowVis > 0.01) {
    const g = ctx.createLinearGradient(0, 640, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(6,2,4,0.62)');
    ctx.save(); ctx.globalAlpha = lowVis; ctx.fillStyle = g; ctx.fillRect(0, 640, W, H - 640); ctx.restore();
  }
  T.lines.forEach((l, i) => {
    if (i < 4) return;
    const c = lineCfg(i);
    if (t < c.appear - 0.1 || t > c.exit + 1.2) return;
    const base = {
      fontStr: c.fontStr, size: c.size, fill: c.fill, track: c.track, glow: c.glowCol || 'rgba(255,214,170,0.35)', glowBlur: 14,
      shadow: c.fill === IV ? 'rgba(0,0,0,0.55)' : null, start: c.appear, stagger: 0.022, dur: 0.55, lead: 0, anim: c.anim || 'blur',
      exit: c.exit, exitAnim: c.exitAnim || 'fade', exitDur: c.exitDur || 0.5, hl: c.hl, accent: c.accent, maxPer: c.maxPer || 0, lineGap: 1.32,
    };
    if (c.slot === 'col') {
      let alpha = 1;
      const nx = T.lines[i + 1];
      if (nx && t > nx.start - 0.3 && nx.sec === l.sec) alpha = lerp(1, 0.5, clamp((t - nx.start + 0.3) / 0.6));
      drawText(ctx, t, l.text, { ...base, x: c.x, y: c.y, vertical: true, alpha });
    } else if (c.slot === 'stack') {
      // rolling: when the next line arrives, this one slides up one line and dims
      const nx = T.lines[i + 1];
      let dy = 0, alpha = 1;
      if (nx && nx.sec === l.sec && lineCfg(i + 1).slot === 'stack') {
        const k = E.inOutCubic(clamp((t - (nx.start - 0.34)) / 0.5));
        dy = -k * c.size * 1.55; alpha = lerp(1, 0.45, k);
      }
      drawText(ctx, t, l.text, { ...base, x: 960, y: c.y + dy, align: 'center', alpha });
    } else if (c.slot === 'L' || c.slot === 'R') {
      const L = c.slot === 'L';
      const x = L ? 150 : W - 150, y = L ? 846 : 956;
      // thin gold rule that draws in beside the line
      const len = layout(l.text, c.fontStr, c.size, { track: c.track }).len;
      const pr = E.outExpo(clamp((t - c.appear) / 0.8)) * (1 - E.inCubic(clamp((t - c.exit) / 0.5)));
      ctx.save(); ctx.globalAlpha = 0.85 * pr; ctx.fillStyle = GOLD;
      ctx.fillRect(L ? x : x - len * pr, y + c.size * 0.72, len * pr, 1.5);
      ctx.restore();
      label(ctx, `${String(i - 3).padStart(2, '0')}`, L ? x : x - len, y - c.size * 0.95, { fam: F.corm, size: 22, italic: true, weight: 500, color: GOLD, alpha: 0.8 * pr, align: L ? 'left' : 'left' });
      drawText(ctx, t, l.text, { ...base, x, y, align: L ? 'start' : 'end' });
    } else if (c.slot === 'center') {
      const len = layout(l.text, c.fontStr, c.size, { track: c.track }).len;
      const cy = c.cy || 560;
      backdrop(ctx, 960, cy, len + c.size * 4, c.size * 3.6, (c.backdrop ?? 0.5) * smooth(c.appear, c.appear + 0.4, t) * (1 - smooth(c.exit, c.exit + 0.5, t)));
      drawText(ctx, t, l.text, { ...base, x: 960, y: cy, align: 'center' });
    } else if (c.slot === 'free') {
      if (c.backdrop) {
        const len = layout(l.text, c.fontStr, c.size, { track: c.track }).len;
        backdrop(ctx, c.x, c.y, len + c.size * 4, c.size * 3.6, c.backdrop * smooth(c.appear, c.appear + 0.4, t) * (1 - smooth(c.exit, c.exit + 0.5, t)));
      }
      drawText(ctx, t, l.text, { ...base, x: c.x, y: c.y, vertical: !!c.vertical, align: c.align || 'start' });
    } else if (c.slot === 'hero') {
      drawHero(ctx, t, l, c);
    } else if (c.slot === 'script') {
      drawScript(ctx, t, l, c);
    }
    if (c.echo && l.echo) {
      const ts = l.end - 0.05, a = smooth(ts, ts + 0.4, t) * (1 - smooth(ts + 1.5, ts + 2.1, t));
      if (a > 0.01) {
        ctx.save(); ctx.translate(c.echo[0], c.echo[1] - (t - ts) * 8); ctx.rotate(c.echo[2] + Math.sin((t - ts) * 2.4) * 0.03);
        drawText(ctx, t, '（' + l.echo + '）', { x: 0, y: 0, size: 38, fontStr: font(F.mincho, 38, 500), fill: GOLD, glow: 'rgba(255,190,120,0.5)', start: ts, stagger: 0.08, anim: 'blur', track: 0.3, alpha: a });
        ctx.restore();
      }
    }
  });
}

function drawHero(ctx, t, l, c) {
  const size = 196, fs = font(F.corm, size, 400, true), X = l.sec === 'E' ? 660 : 960;
  const a = smooth(l.start - 0.12, l.start + 0.25, t) * (1 - smooth(c.exit, c.exit + 0.6, t));
  if (a <= 0.003) return;
  backdrop(ctx, X, 470, 1500, 520, 0.6 * a);
  const track = 0.03 + 0.04 * clamp((t - l.start) / 3);
  drawText(ctx, t, l.text, { x: X, y: 455, align: 'center', size, fontStr: fs, fill: IV, glow: 'rgba(255,200,150,0.55)', glowBlur: 26,
    track, start: l.start - 0.12, stagger: 0.035, dur: 0.6, anim: 'blur', exit: c.exit, exitAnim: 'fade', exitDur: 0.6, shadow: 'rgba(0,0,0,0.35)' });
  const len = layout(l.text, fs, size, { track }).len;
  const pr = E.outExpo(clamp((t - l.start) / 1.0)) * a;
  ctx.save(); ctx.globalAlpha = pr * 0.9; ctx.fillStyle = GOLD;
  ctx.fillRect(X - len / 2 - 30, 575, (len + 60) * pr, 1.2);
  ctx.restore();
  label(ctx, GLOSS[l.text] || '', X, 612, { size: 20, weight: 500, color: IV, track: 0.35, align: 'center', alpha: a * smooth(l.start + 0.15, l.start + 0.6, t) * 0.9 });
}
function drawScript(ctx, t, l, c) {
  const size = 150, fs = font(F.script, size, 400);
  const a = smooth(l.start - 0.2, l.start + 0.5, t) * (1 - smooth(c.exit, c.exit + 0.8, t));
  if (a <= 0.003) return;
  drawText(ctx, t, l.text, { x: 960, y: 500, align: 'center', size, fontStr: fs, fill: GOLD, glow: 'rgba(255,190,120,0.55)', glowBlur: 24,
    start: l.start - 0.15, stagger: 0.06, dur: 0.8, anim: 'blur', exit: c.exit, exitAnim: 'up', exitDur: 0.8 });
  label(ctx, GLOSS[l.text] || '', 960, 625, { size: 20, weight: 500, color: IV, track: 0.35, align: 'center', alpha: a * 0.9 });
}

// opening chants (drawn by the prologue scene)
export function drawChant(ctx, t, i, o = {}) {
  const l = T.lines[i];
  const size = o.size || 170, fs = font(F.corm, size, 400, true);
  const exit = o.exit ?? 1e9;
  drawText(ctx, t, l.text, { x: 960, y: o.y || 520, align: 'center', size, fontStr: fs, fill: IV, glow: 'rgba(255,200,150,0.5)', glowBlur: 24,
    track: 0.04, start: l.start - 0.1, stagger: 0.045, dur: 0.5, anim: 'blur', exit, exitAnim: 'fade', exitDur: 0.25, shadow: 'rgba(0,0,0,0.4)' });
  const gl = o.gloss;
  if (gl) label(ctx, gl, 960, (o.y || 520) + size * 0.62, { size: 20, weight: 500, color: IV, track: 0.4, align: 'center', alpha: smooth(l.start + 0.2, l.start + 0.6, t) * (1 - smooth(exit, exit + 0.25, t)) * 0.85 });
}
