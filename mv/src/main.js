// Compositor v2: shot timeline + lyric layer + film finishing (bloom/halation, gate weave,
// letterbox with captions in the bars, grain, vignette). Exposes window.MV for the renderer.
import { W, H, TAU, P, clamp, lerp, inv, smooth, E, hexA, makeCanvas, noise1 } from './util.js';
import { T, loadTiming } from './timing.js';
import * as fx from './fx.js';
import { F, font, label } from './text.js';
import { drawLyrics } from './lyrics.js';
import { IMG, runShots } from './shots.js';
import { buildTimeline, SHOTS, SECTIONS, letterbox } from './timeline.js';

const FONT_FILES = [
  ['Shippori', 'ShipporiMinchoB1-Medium.ttf', '500'], ['Shippori', 'ShipporiMinchoB1-Bold.ttf', '700'], ['Shippori', 'ShipporiMinchoB1-ExtraBold.ttf', '800'],
  ['ZenOld', 'ZenOldMincho-Regular.ttf', '400'], ['ZenOld', 'ZenOldMincho-Black.ttf', '900'],
  ['ZenKaku', 'ZenKakuGothicNew-Medium.ttf', '500'], ['ZenKaku', 'ZenKakuGothicNew-Bold.ttf', '700'],
  ['Playfair', 'PlayfairDisplay.ttf', '400 900'], ['Playfair', 'PlayfairDisplay-Italic.ttf', '400 900', 'italic'],
  ['Cormorant', 'CormorantGaramond.ttf', '300 700'], ['Cormorant', 'CormorantGaramond-Italic.ttf', '300 700', 'italic'],
  ['Bodoni', 'BodoniModa-Italic.ttf', '400 900', 'italic'], ['Pinyon', 'PinyonScript-Regular.ttf', '400'], ['Cinzel', 'Cinzel.ttf', '400 900'],
];
const CHARS = { cover: 'cover', ynight: 'yoshino_night', ycut: 'yoshino_cut', ncut: 'nagi_cut', alham: 'nagi_shin_alhambra' };

function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
async function loadChar(name) {
  for (const src of [`assets/img/up/${name}.png`, `assets/img/up/${name}.jpg`, `assets/img/${name}.png`, `assets/img/${name}.jpg`]) {
    try { return await loadImg(src); } catch (e) { /* next */ }
  }
  throw new Error('missing image ' + name);
}
function fadeEdges(img, bottom = 0.15, side = 0) {
  const c = makeCanvas(img.width, img.height), g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  const gr = g.createLinearGradient(0, img.height * (1 - bottom), 0, img.height);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  if (side) {
    const gs = g.createLinearGradient(img.width * (1 - side), 0, img.width, 0);
    gs.addColorStop(0, 'rgba(0,0,0,0)'); gs.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = gs; g.fillRect(0, 0, c.width, c.height);
  }
  return c;
}
// brightest point of an image (used to put smoke on a candle's wick)
function brightest(img) {
  const c = makeCanvas(160, Math.round(160 * img.height / img.width)), g = c.getContext('2d');
  g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let best = -1, bx = 0, by = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4, v = d[i] + d[i + 1] + d[i + 2];
    if (v > best) { best = v; bx = x; by = y; }
  }
  return [bx / c.width, by / c.height];
}

let cv, ctx, small, sctx;
async function init() {
  cv = document.getElementById('c'); ctx = cv.getContext('2d');
  small = makeCanvas(480, 270); sctx = small.getContext('2d');
  await Promise.all(FONT_FILES.map(async ([fam, file, weight, style]) => {
    const f = new FontFace(fam, `url(assets/fonts/${file})`, { weight, style: style || 'normal' });
    await f.load(); document.fonts.add(f);
  }));
  await loadTiming('data/timing.json');
  const keys = await (await fetch('data/photos.json')).json();
  await Promise.all(keys.map(async k => { IMG[k] = await loadImg(`assets/photos/${k}.jpg`); }));
  for (const [k, n] of Object.entries(CHARS)) IMG[k] = await loadChar(n);
  IMG.ycutO = fadeEdges(IMG.ycut, 0.22, 0.1);
  IMG.ncutO = fadeEdges(IMG.ncut, 0.12, 0.08);
  IMG.matte_fire = IMG.c1_blaze;
  // candle flame position in screen space for the "blown out" moment (photo drawn at z≈1.4, focus .5/.45)
  const [bx, by] = brightest(IMG.fi_candle);
  const z = 1.4, s = Math.max(W / IMG.fi_candle.width, H / IMG.fi_candle.height) * z;
  const sw = W / s, sh = H / s;
  const sx = clamp(0.5 * IMG.fi_candle.width - sw / 2, 0, IMG.fi_candle.width - sw), sy = clamp(0.45 * IMG.fi_candle.height - sh / 2, 0, IMG.fi_candle.height - sh);
  IMG.fi_candle._fx = (bx * IMG.fi_candle.width - sx) * s; IMG.fi_candle._fy = (by * IMG.fi_candle.height - sy) * s;
  buildTimeline();
  render(0.01);
  return true;
}

function bloom(amount, warm = '#ffb27a') {
  if (amount <= 0.01) return;
  sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.globalCompositeOperation = 'source-over'; sctx.globalAlpha = 1;
  sctx.filter = 'brightness(0.8) contrast(2.4) blur(7px)';
  sctx.drawImage(cv, 0, 0, 480, 270);
  sctx.filter = 'none';
  sctx.globalCompositeOperation = 'multiply'; sctx.fillStyle = warm; sctx.fillRect(0, 0, 480, 270);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = amount; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, W, H); ctx.restore();
}
function bloomAt(t) {
  if (t > 166.5 && t < 190.2) return 0.42;
  if (t > 209 && t < 238.2) return 0.38;
  if ((t > 48.4 && t < 69.8) || (t > 112.3 && t < 166.5)) return 0.32;
  return 0.26;
}
function section(t) { let s = SECTIONS[0][1]; for (const [a, n] of SECTIONS) if (t >= a) s = n; return s; }

function bars(t) {
  const lb = letterbox(t);
  const h = 78 * E.inOutCubic(lb);
  if (h < 0.5) return;
  ctx.fillStyle = '#050304';
  ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
  const a = clamp((h - 50) / 28) * 0.75 * (1 - smooth(249.5, 250.5, t));
  if (a <= 0.01) return;
  const col = 'rgba(244,230,206,0.9)';
  const w = label(ctx, '熱情エナモラル', 80, h / 2, { size: 13, weight: 700, color: col, track: 0.35, alpha: a });
  label(ctx, 'Enamorar', 80 + w + 14, h / 2, { fam: F.corm, size: 17, italic: true, color: col, alpha: a * 0.9 });
  label(ctx, section(t), W - 80, h / 2, { fam: F.cinzel, size: 12, weight: 700, color: col, track: 0.4, align: 'right', alpha: a });
  label(ctx, 'THE IDOLM@STER CINDERELLA GIRLS  ·  Passion jewelries! 004', 80, H - h / 2, { fam: F.cinzel, size: 11, weight: 600, color: col, track: 0.3, alpha: a * 0.8 });
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  label(ctx, `${mm}:${String(ss).padStart(2, '0')}`, W - 80, H - h / 2, { fam: F.corm, size: 17, italic: true, color: col, align: 'right', alpha: a * 0.8 });
}

export function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // gate weave: a sub-pixel drift like film running through a projector
  ctx.save();
  ctx.translate(W / 2 + noise1(t * 2.3, 91) * 0.8, H / 2 + noise1(t * 2.1, 92) * 0.8); ctx.scale(1.004, 1.004); ctx.translate(-W / 2, -H / 2);
  runShots(ctx, t, SHOTS);
  ctx.restore();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  bloom(bloomAt(t));
  drawLyrics(ctx, t);
  bars(t);
  ctx.save(); ctx.globalAlpha = 0.6; ctx.drawImage(fx.vignette(0.75), 0, 0); ctx.restore();
  fx.applyGrain(ctx, Math.floor(t * 12) / 12, 0.06);
  const fadeIn = 1 - smooth(0, 0.6, t), fadeOut = smooth(263.0, 265.6, t);
  const blk = Math.max(fadeIn, fadeOut);
  if (blk > 0) { ctx.save(); ctx.globalAlpha = blk; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

window.MV = {
  ready: init(),
  render,
  grab(t, q = 0.93) { render(t); return cv.toDataURL('image/jpeg', q); },
  duration: 266,
};

const qs = new URLSearchParams(location.search);
window.MV.ready.then(() => {
  if (qs.has('t')) render(parseFloat(qs.get('t')));
  if (qs.has('play')) {
    const au = new Audio('assets/audio/song.mp3');
    au.currentTime = parseFloat(qs.get('play') || '0') || 0;
    document.body.addEventListener('click', () => (au.paused ? au.play() : au.pause()));
    const loop = () => { render(au.currentTime); requestAnimationFrame(loop); };
    loop();
  }
});
