// Compositor: scene + transitions + lyric layer + HUD + grading. Exposes window.MV for the renderer.
import { W, H, TAU, P, clamp, lerp, inv, smooth, E, hexA, makeCanvas } from './util.js';
import { T, loadTiming, beatF, pulse } from './timing.js';
import * as fx from './fx.js';
import { F, font, label } from './text.js';
import { drawLyrics } from './lyrics.js';
import { SCENES, A } from './scenes.js';

const FONT_FILES = [
  ['Shippori', 'ShipporiMinchoB1-Medium.ttf', '500'], ['Shippori', 'ShipporiMinchoB1-Bold.ttf', '700'], ['Shippori', 'ShipporiMinchoB1-ExtraBold.ttf', '800'],
  ['ZenOld', 'ZenOldMincho-Regular.ttf', '400'], ['ZenOld', 'ZenOldMincho-Black.ttf', '900'],
  ['ZenKaku', 'ZenKakuGothicNew-Medium.ttf', '500'], ['ZenKaku', 'ZenKakuGothicNew-Bold.ttf', '700'],
  ['Playfair', 'PlayfairDisplay.ttf', '400 900'], ['Playfair', 'PlayfairDisplay-Italic.ttf', '400 900', 'italic'],
  ['Cormorant', 'CormorantGaramond.ttf', '300 700'], ['Cormorant', 'CormorantGaramond-Italic.ttf', '300 700', 'italic'],
  ['Bodoni', 'BodoniModa-Italic.ttf', '400 900', 'italic'], ['Pinyon', 'PinyonScript-Regular.ttf', '400'], ['Cinzel', 'Cinzel.ttf', '400 900'],
];
const IMAGES = { cover: 'cover', ynight: 'yoshino_night', ycut: 'yoshino_cut', ncut: 'nagi_cut', alham: 'nagi_shin_alhambra' };

function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
async function loadImage(name) {
  // prefer the 2x waifu2x-upscaled version when present
  for (const src of [`assets/img/up/${name}.png`, `assets/img/up/${name}.jpg`, `assets/img/${name}.png`, `assets/img/${name}.jpg`]) {
    try { return await loadImg(src); } catch (e) { /* try next */ }
  }
  throw new Error('missing image ' + name);
}
function fadeBottom(img, frac = 0.15, side = 0) {
  const c = makeCanvas(img.width, img.height), g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  const gr = g.createLinearGradient(0, img.height * (1 - frac), 0, img.height);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  if (side) {
    const gs = g.createLinearGradient(img.width * (1 - side), 0, img.width, 0);
    gs.addColorStop(0, 'rgba(0,0,0,0)'); gs.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = gs; g.fillRect(0, 0, c.width, c.height);
  }
  c.src = img.src + '#fade'; return c;
}
function softCopy(img, px) {
  const c = makeCanvas(img.width, img.height), g = c.getContext('2d');
  g.filter = `blur(${px}px)`; g.drawImage(img, 0, 0); c.src = img.src + '#soft'; return c;
}

let cv, ctx, buf, bctx;
async function init() {
  cv = document.getElementById('c'); ctx = cv.getContext('2d');
  buf = makeCanvas(W, H); bctx = buf.getContext('2d');
  await Promise.all(FONT_FILES.map(async ([fam, file, weight, style]) => {
    const f = new FontFace(fam, `url(assets/fonts/${file})`, { weight, style: style || 'normal' });
    await f.load(); document.fonts.add(f);
  }));
  await loadTiming('data/timing.json');
  for (const [k, n] of Object.entries(IMAGES)) A[k] = await loadImage(n);
  const yc = fadeBottom(A.ycut, 0.2, 0.08), nc = fadeBottom(A.ncut, 0.1, 0.06);
  A.ycutO = fx.outlined(yc, 'rgba(255,240,220,0.95)', Math.round(A.ycut.width / 180));
  A.ncutO = fx.outlined(nc, '#fbf3e4', Math.round(A.ncut.width / 160));
  A.ncutS = fx.silhouette(nc, '#b3122e');
  A.coverSoft = softCopy(A.cover, 8);
  // warm the glyph / sprite caches a little
  render(0.01);
  return true;
}

function sceneAt(t) {
  for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].a) return i;
  return 0;
}
const ZOOMY = new Set(['chorus1', 'chorus2', 'final']);
function drawScene(c, s, t) {
  c.save();
  if (ZOOMY.has(s.id)) {
    const z = 1 + 0.012 * pulse(t, 7);
    c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
  }
  s.draw(c, t);
  c.restore();
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
}

function transition(kind, p) {
  const e = E.inOutCubic(clamp(p));
  ctx.save();
  if (kind === 'fade') { ctx.globalAlpha = e; ctx.drawImage(buf, 0, 0); }
  else if (kind === 'iris') {
    const r = e * 1180;
    ctx.beginPath(); ctx.arc(960, 540, r, 0, TAU); ctx.save(); ctx.clip(); ctx.drawImage(buf, 0, 0); ctx.restore();
    ctx.strokeStyle = hexA(P.gold2, 0.9 * (1 - e)); ctx.lineWidth = 3; ctx.stroke();
  } else if (kind === 'fan') {
    const a0 = Math.PI, span = Math.PI * e, cx = 960, cy = 1250, R = 1800;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a0 + span); ctx.closePath();
    ctx.save(); ctx.clip(); ctx.drawImage(buf, 0, 0);
    // pleat shading + ribs over the incoming scene while it unfolds
    const n = 17;
    for (let k = 0; k < n; k++) {
      const s0 = a0 + (span * k) / n, s1 = a0 + (span * (k + 1)) / n;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, (s0 + s1) / 2, s1); ctx.closePath();
      ctx.fillStyle = `rgba(0,0,0,${0.18 * (1 - e)})`; ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = hexA(P.gold2, 0.95); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0 + span) * R, cy + Math.sin(a0 + span) * R); ctx.stroke();
  }
  ctx.restore();
}

function hud(t, s) {
  const hide = ['open', 'chant', 'title'].includes(s.id) || (s.id === 'outro' && t > 249.5);
  let a = hide ? 0 : 0.8;
  a *= smooth(s.a, s.a + 0.6, t);
  if (a <= 0.01) return;
  const col = s.light ? 'rgba(40,8,16,0.85)' : 'rgba(251,241,222,0.82)';
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1.4;
  const m = 40, L = 26;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
  }
  ctx.restore();
  const w = label(ctx, '熱情エナモラル', 76, 66, { size: 15, weight: 700, color: col, track: 0.3, alpha: a });
  label(ctx, 'Enamorar', 76 + w + 16, 66, { fam: F.corm, size: 19, italic: true, weight: 500, color: col, track: 0.05, alpha: a * 0.9 });
  label(ctx, s.label || '', W - 76, 66, { fam: F.cinzel, size: 14, weight: 700, color: col, track: 0.35, align: 'right', alpha: a });
  label(ctx, 'PASSION JEWELRIES! 004', 76, H - 64, { fam: F.cinzel, size: 12, weight: 700, color: col, track: 0.35, alpha: a * 0.85 });
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  label(ctx, `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, W - 76, H - 64, { fam: F.cinzel, size: 14, weight: 600, color: col, track: 0.2, align: 'right', alpha: a });
  const bi = Math.floor(beatF(t)) % 4;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col;
  for (let k = 0; k < 4; k++) {
    const on = k === (bi + 4) % 4;
    ctx.beginPath(); ctx.arc(W - 170 + k * 14, H - 64, on ? 3.6 : 1.8, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

export function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  const i = sceneAt(t), s = SCENES[i], n = SCENES[i + 1];
  drawScene(ctx, s, t);
  if (n && n.tin && t >= n.a - n.tin) {
    bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalAlpha = 1; bctx.clearRect(0, 0, W, H);
    drawScene(bctx, n, t);
    transition(n.trans || 'fade', (t - (n.a - n.tin)) / n.tin);
  }
  drawLyrics(ctx, t);
  const shown = n && n.tin && t >= n.a - n.tin && (t - (n.a - n.tin)) / n.tin > 0.5 ? n : s;
  hud(t, shown);
  // grade
  ctx.save(); ctx.globalAlpha = shown.light ? 0.45 : 0.75; ctx.drawImage(fx.vignette(0.7), 0, 0); ctx.restore();
  fx.applyGrain(ctx, Math.floor(t * 15) / 15, 0.05);
  const fadeIn = 1 - smooth(0, 0.35, t), fadeOut = smooth(263.0, 265.6, t);
  const blk = Math.max(fadeIn, fadeOut);
  if (blk > 0) { ctx.save(); ctx.globalAlpha = blk; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

window.MV = {
  ready: init(),
  render,
  grab(t, q = 0.93) { render(t); return cv.toDataURL('image/jpeg', q); },
  duration: 266,
};

// preview: index.html?t=12.3 (still) or ?play (real-time with audio)
const qs = new URLSearchParams(location.search);
window.MV.ready.then(() => {
  if (qs.has('t')) render(parseFloat(qs.get('t')));
  if (qs.has('play')) {
    const au = new Audio('assets/audio/song.mp3');
    au.currentTime = parseFloat(qs.get('play') || '0') || 0;
    document.body.addEventListener('click', () => au.paused ? au.play() : au.pause());
    const loop = () => { render(au.currentTime); requestAnimationFrame(loop); };
    loop();
  }
});
