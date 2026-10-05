// Per-line typographic direction. Every line has its own placement / animation so the
// lyric layer reads like a designed title sequence rather than karaoke subtitles.
import { W, H, P, clamp, E, inv, hexA, lerp, TAU } from './util.js';
import { T } from './timing.js';
import { F, font, drawText, label, measure, layout } from './text.js';
import { glowSprite } from './fx.js';

const IVORY = '#fbf1de';
const GOLD_GRAD = { grad: ['#fff4cf', '#f6d58e', '#d9a548', '#9a6418'] };
const ROSE_GOLD = { grad: ['#fff1e6', '#ffc9a6', '#e88a6a', '#a2402e'] };

const minV = (s, w = 700) => font(F.mincho, s, w);
const BASE_V = { vertical: true, anim: 'blur', track: 0.06, glowBlur: 16 };

// gloss (small Japanese translation shown under Spanish phrases)
const GLOSS = { 'Enamorar!!': '恋　に　落　と　し　て', 'Especial!!': 'と　く　べ　つ', 'Amanecer!!': '夜　明　け', 'Lleno de amor': '愛 に 満 ち て', 'Canción de amor': '愛 の 歌' };

// style presets per section
function cfg(i) {
  const l = T.lines[i];
  const c = { exit: l.next - 0.12 };
  switch (l.sec) {
    case 'A1': {
      const k = i - 4;
      Object.assign(c, BASE_V, { x: 1640 - k * 112, y: 170, size: 62, fontStr: minV(62, 700), fill: IVORY, glow: 'rgba(255,205,140,0.55)', exit: 30.15 - (3 - k) * 0.06 });
      if (i === 7) c.accent = { from: 6, to: 9, fill: '#ffc09a', glow: 'rgba(255,70,50,0.9)' };
      c.dim = true;
      break;
    }
    case 'B1':
      if (i === 8) Object.assign(c, { x: 170, y: 770, size: 78, fontStr: minV(78, 800), fill: IVORY, anim: 'blur', shadow: 'rgba(20,0,10,0.6)', exit: 31.72 });
      if (i === 9) Object.assign(c, { x: 170, y: 770, size: 66, fontStr: minV(66, 700), fill: IVORY, anim: 'ink', dur: 0.32, shadow: 'rgba(20,0,10,0.6)', exit: 34.72, echo: { x: 1010, y: 640, rot: -0.12 } });
      if (i === 10) Object.assign(c, { x: 820, y: 190, vertical: true, size: 156, fontStr: font(F.old, 156, 900), fill: IVORY, shadow: 'rgba(60,0,10,0.8)', anim: 'stamp', dur: 0.4, exit: 36.38, exitAnim: 'up' });
      if (i === 11) Object.assign(c, { x: 960, y: 930, align: 'center', size: 64, fontStr: minV(64, 700), fill: IVORY, glow: 'rgba(120,150,255,0.55)', anim: 'wave', exitAnim: 'wind', exit: 38.42, echo: { x: 1480, y: 800, rot: 0.08 } });
      break;
    case 'P1':
      if (i === 12) Object.assign(c, { x: 960, y: 520, align: 'center', size: 84, fontStr: minV(84, 800), fill: IVORY, shadow: 'rgba(40,0,10,0.7)', anim: 'blur', accent: { from: 3, to: 10, fill: P.gold2, glow: 'rgba(255,150,60,0.8)' }, exit: 42.25 });
      if (i === 13) Object.assign(c, { x: 960, y: 540, align: 'center', size: 96, fontStr: minV(96, 800), fill: IVORY, glow: 'rgba(255,120,40,0.7)', anim: 'rise', exitAnim: 'scatter', exit: 47.95 });
      break;
    case 'C1': case 'C2': case 'C3': chorusCfg(i, l, c); break;
    case 'A2':
      Object.assign(c, { x: 960, y: 935, align: 'center', size: 50, fontStr: minV(50, 700), track: 0.16, fill: IVORY, glow: 'rgba(190,160,255,0.7)', anim: 'blur', exitAnim: 'fade' });
      if (i === 25) c.accent = { from: 2, to: 6, fill: P.gold2, glow: 'rgba(255,200,120,0.9)' };
      break;
    case 'B2':
      Object.assign(c, BASE_V, { size: 54, fontStr: minV(54, 700), fill: '#ffeef0', glow: 'rgba(255,90,120,0.6)', maxPer: 10, lineGap: 1.3, y: 180, exit: 102.4 });
      if (i === 27) Object.assign(c, { x: 1650, echo: { x: 980, y: 300, rot: -0.1 } });
      if (i === 28) Object.assign(c, { x: 1450, echo: { x: 1000, y: 820, rot: 0.1 } });
      c.dim = true;
      break;
    case 'P2':
      Object.assign(c, { x: 960, y: 660, align: 'center', size: 70, fontStr: minV(70, 700), track: 0.1, fill: IVORY, glow: 'rgba(170,150,255,0.6)', anim: 'blur' });
      if (i === 30) Object.assign(c, { exitAnim: 'up', exit: 111.6 });
      break;
    case 'D': {
      const col = { 40: 0, 41: 1, 42: 2, 43: 3, 44: 0, 45: 1, 46: 2 }[i];
      Object.assign(c, BASE_V, { x: 760 - col * 118, y: 170, size: 64, fontStr: minV(64, 700), fill: '#fffaf0', glow: 'rgba(255,140,90,0.75)', exit: i <= 43 ? 180.75 - (3 - col) * 0.05 : 189.85 - (2 - col) * 0.04, dim: true });
      if (i === 44) c.maxPer = 9;
      if (i === 45) c.x = 760 - 2 * 118;
      if (i === 46) Object.assign(c, { x: 760 - 3 * 118 - 20, size: 84, fontStr: minV(84, 800), fill: '#fff4e8', glow: 'rgba(255,90,90,0.9)', anim: 'zoom' });
      break;
    }
    case 'E':
      if (i === 47 || i === 50) Object.assign(c, hero(l, 960, 470, -0.06, i === 47 ? 194.7 : 201.6));
      else Object.assign(c, { x: 960, y: 900, align: 'center', size: 66, fontStr: minV(66, 800), fill: IVORY, shadow: 'rgba(0,0,0,0.8)', anim: 'slide', band: '#1a0a10' });
      if (i === 49) c.accent = { from: 2, to: 4, fill: P.gold2, glow: 'rgba(255,80,40,0.9)' };
      if (i === 52) Object.assign(c, { exit: 208.6, exitAnim: 'scatter' });
      break;
  }
  return c;
}
function hero(l, x, y, rot, exit, size = 230) {
  return { type: 'hero', x, y, rot, align: 'center', size, fontStr: font(F.play, size, 900, true), fill: GOLD_GRAD,
    shadow: 'rgba(90,0,20,0.85)', stroke: '#5a0614', strokeW: 5, anim: 'stamp', dur: 0.32, exit, exitAnim: 'up', exitDur: 0.6, track: -0.01 };
}
function chorusCfg(i, l, c) {
  const BAND = l.sec === 'C2' ? '#3a1458' : l.sec === 'C3' ? '#9a1028' : P.crimson;
  const side = (x, y, align) => Object.assign(c, { x, y, align, size: 72, fontStr: minV(72, 800), fill: IVORY, shadow: 'rgba(20,0,8,0.85)', anim: 'slide', band: BAND });
  const t = l.text;
  if (/^(Enamorar|Amanecer)/.test(t)) {
    const nx = T.lines[i + 1];
    Object.assign(c, hero(l, 960, 420, -0.07, nx.next - 0.6 > nx.start + 1.2 ? nx.start + 1.25 : nx.start + 1.0));
    return;
  }
  if (/^(Lleno|Canción)/.test(t)) {
    Object.assign(c, { type: 'script', x: 960, y: 500, align: 'center', size: 176, fontStr: font(F.script, 176, 400), fill: GOLD_GRAD,
      shadow: 'rgba(60,0,10,0.8)', anim: 'blur', dur: 0.7, exit: i === 64 ? 238.9 : i === 22 ? 69.15 : 133.4, exitAnim: 'up', exitDur: 0.9 });
    return;
  }
  if (t.startsWith('このまま')) {
    Object.assign(c, { x: l.sec === 'C2' ? 560 : 960, y: 560, align: 'center', size: 104, fontStr: minV(104, 800), fill: IVORY, shadow: 'rgba(30,0,10,0.85)', glow: 'rgba(255,120,60,0.5)', anim: 'stamp', dur: 0.3, exitAnim: 'scatter', backdrop: true });
    return;
  }
  const order = { 15: 'L', 16: 'L', 18: 'R', 20: 'L', 21: 'R', 32: 'L', 33: 'L', 35: 'R', 37: 'L', 38: 'R', 54: 'L', 55: 'L', 57: 'R', 59: 'L', 62: 'R' }[i];
  if (order === 'L') side(150, i % 2 ? 830 : 830, 'start');
  else if (order === 'R') side(1770, 880, 'end');
  if (i === 21) c.accent = { from: 5, to: 8, fill: '#ffcf8a', glow: 'rgba(255,90,20,0.95)' };
  if (i === 16) c.accent = { from: 3, to: 5, fill: P.gold2 };
  if (i === 33) c.accent = { from: 4, to: 5, fill: '#e9dcff', glow: 'rgba(200,170,255,0.9)' };
  if (i === 60) Object.assign(c, { backdrop: true, x: 960, y: 560, align: 'center', size: 90, fontStr: minV(90, 800), fill: IVORY, shadow: 'rgba(40,0,10,0.85)', glow: 'rgba(255,170,90,0.6)', anim: 'blur', band: null, accent: { from: 8, to: 15, fill: '#ffd4c4', glow: 'rgba(255,60,90,0.9)' } });
  if (i === 63) Object.assign(c, { x: 960, y: 560, align: 'center', size: 80, fontStr: minV(80, 700), track: 0.12, fill: '#4a1c3c', glow: 'rgba(255,250,245,0.95)', anim: 'blur', dur: 0.8, band: null, exitAnim: 'up', exitDur: 0.9, exit: 235.0 });
}

const CFG = new Map();
export function lineCfg(i) { if (!CFG.has(i)) CFG.set(i, cfg(i)); return CFG.get(i); }

// translucent parallelogram band that wipes in behind a lyric
function band(ctx, t, l, c, len) {
  const pIn = E.outExpo(clamp((t - (l.start - 0.25)) / 0.45));
  const pOut = E.inCubic(clamp((t - c.exit) / 0.4));
  if (pIn <= 0 || pOut >= 1) return;
  const padX = c.size * 0.45, h = c.size * 1.32;
  let x0 = c.align === 'end' ? c.x - len - padX : c.align === 'center' ? c.x - len / 2 - padX : c.x - padX;
  const w = len + padX * 2, sk = h * 0.35;
  ctx.save();
  ctx.globalAlpha = 0.86;
  const wx = w * pIn, ox = x0 + w * pOut;
  const ww = Math.max(0, wx - w * pOut);
  ctx.fillStyle = c.band;
  ctx.beginPath();
  ctx.moveTo(ox + sk, c.y - h / 2); ctx.lineTo(ox + ww + sk, c.y - h / 2); ctx.lineTo(ox + ww - sk, c.y + h / 2); ctx.lineTo(ox - sk, c.y + h / 2);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1; ctx.strokeStyle = hexA(P.gold, 0.9); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ox - sk, c.y + h / 2 + 8); ctx.lineTo(ox + ww - sk, c.y + h / 2 + 8); ctx.stroke();
  ctx.restore();
}

export function drawLyrics(ctx, t) {
  T.lines.forEach((l, i) => {
    if (i < 4) return; // intro chants are part of the opening scene
    const c = lineCfg(i);
    if (t < l.start - 0.6 || t > c.exit + (c.exitDur || 0.45) + 0.7) return;
    let alpha = 1;
    if (c.dim && t > l.next - 0.05) alpha = lerp(1, 0.42, clamp((t - l.next) / 0.5));
    const times = l.chars.map(x => x);
    if (c.type === 'hero') {
      drawText(ctx, t, l.text, { ...c, times, lead: 0.06, alpha });
      const g = GLOSS[l.text];
      if (g) label(ctx, g, c.x, c.y + c.size * 0.62, { size: 22, color: hexA(IVORY, 0.9), track: 0.2, align: 'center', alpha: clamp((t - l.start - 0.2) / 0.4) * (1 - clamp((t - c.exit) / 0.5)) });
      return;
    }
    if (c.type === 'script') {
      // flourish lines either side + gloss
      const a = clamp((t - l.start) / 0.6) * (1 - clamp((t - c.exit) / 0.8));
      const len = measure(c.fontStr, l.text);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = hexA(P.gold2, 0.9); ctx.lineWidth = 1.5;
      const ex = E.outExpo(clamp((t - l.start) / 1.2));
      ctx.beginPath(); ctx.moveTo(c.x - len / 2 - 40, c.y + 40); ctx.lineTo(c.x - len / 2 - 40 - 240 * ex, c.y + 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.x + len / 2 + 40, c.y + 40); ctx.lineTo(c.x + len / 2 + 40 + 240 * ex, c.y + 40); ctx.stroke();
      ctx.restore();
      drawText(ctx, t, l.text, { ...c, times, lead: 0.15, stagger: 0.05 });
      label(ctx, GLOSS[l.text], c.x, c.y + 130, { size: 24, color: hexA(IVORY, 0.92), track: 0.3, align: 'center', alpha: a });
      return;
    }
    if (c.band) band(ctx, t, l, c, layout(l.text, c.fontStr, c.size, { track: c.track || 0 }).len);
    if (c.backdrop) {
      const len = layout(l.text, c.fontStr, c.size, { track: c.track || 0 }).len;
      const a = clamp((t - l.start + 0.3) / 0.4) * (1 - clamp((t - c.exit) / 0.5));
      ctx.save(); ctx.globalAlpha = 0.92 * a; ctx.translate(c.x, c.y); ctx.scale((len + c.size * 4) / 512, (c.size * 3.6) / 512);
      ctx.drawImage(glowSprite('#1a0006', 512), -256, -256); ctx.restore();
    }
    drawText(ctx, t, l.text, { ...c, times, alpha });
    if (l.echo && c.echo) {
      const ts = l.end - 0.1, a = clamp((t - ts) / 0.4) * (1 - clamp((t - ts - 1.6) / 0.6));
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a; ctx.translate(c.echo.x, c.echo.y); ctx.rotate(c.echo.rot);
        drawText(ctx, t, '（' + l.echo + '）', { x: 0, y: (1 - E.outExpo(clamp((t - ts) / 0.8))) * 30, size: 44, fontStr: font(F.mincho, 44, 500), fill: P.gold2, glow: 'rgba(255,170,90,0.7)', start: ts, stagger: 0.07, anim: 'blur', track: 0.25 });
        ctx.restore();
      }
    }
  });
}

// the four opening chants, used by the opening scene
export function drawChant(ctx, t, i, x, y, o = {}) {
  const l = T.lines[i];
  const size = o.size || 190;
  drawText(ctx, t, l.text, { x, y, align: o.align || 'center', size, fontStr: o.fontStr || font(F.play, size, 900, true), fill: o.fill || IVORY,
    shadow: o.shadow ?? 'rgba(40,0,10,0.6)', anim: o.anim || 'stamp', dur: 0.3, times: l.chars, lead: 0.05, exit: o.exit ?? 1e9, exitAnim: 'cut', rot: o.rot || 0, glow: o.glow || null, glowBlur: 24 });
}
