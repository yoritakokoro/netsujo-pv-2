// v6 compositor: loads assets, runs the v6 storyboard (camera paths, beat-synced transitions, sung typography) and film finishing.
import { W, H, clamp, smooth, lerp, E, makeCanvas } from './util.js';
import { T, loadTiming } from './timing.js';
import * as fx from './fx.js';
import { IMG } from './gfx.js';
import { build6, SHOTS6 } from './v6/shots6.js';
import { runShots } from './v6/run6.js';
import { energy, frame } from './v6/core6.js';
import { NEON } from './kit4.js';

const FONT_FILES = [
  ['Shippori', 'ShipporiMinchoB1-Medium.ttf', '500'], ['Shippori', 'ShipporiMinchoB1-Bold.ttf', '700'], ['Shippori', 'ShipporiMinchoB1-ExtraBold.ttf', '800'],
  ['ZenOld', 'ZenOldMincho-Regular.ttf', '400'], ['ZenOld', 'ZenOldMincho-Black.ttf', '900'],
  ['ZenKaku', 'ZenKakuGothicNew-Medium.ttf', '500'], ['ZenKaku', 'ZenKakuGothicNew-Bold.ttf', '700'],
  ['Playfair', 'PlayfairDisplay.ttf', '400 900'], ['Playfair', 'PlayfairDisplay-Italic.ttf', '400 900', 'italic'],
  ['Cormorant', 'CormorantGaramond.ttf', '300 700'], ['Cormorant', 'CormorantGaramond-Italic.ttf', '300 700', 'italic'],
  ['Bodoni', 'BodoniModa-Italic.ttf', '400 900', 'italic'], ['Pinyon', 'PinyonScript-Regular.ttf', '400'], ['Cinzel', 'Cinzel.ttf', '400 900'],
  ['Caveat', 'Caveat.ttf', '400 700'], ['YuseiMagic', 'YuseiMagic-Regular.ttf', '400'], ['Anton', 'Anton-Regular.ttf', '400'],
  ['Bebas', 'BebasNeue-Regular.ttf', '400'], ['DelaGothic', 'DelaGothicOne-Regular.ttf', '400'], ['DMSerif', 'DMSerifDisplay-Italic.ttf', '400', 'italic'],
  ['Abril', 'AbrilFatface-Regular.ttf', '400'], ['SpecialElite', 'SpecialElite-Regular.ttf', '400'], ['Klee', 'KleeOne-SemiBold.ttf', '600'],
];
const STICKERS = ['yo_cos', 'na_cos', 'to_cos', 'shi_cos', 'ri_cos', 'na_casual', 'yo_swim', 'shi_swim', 'to_white', 'ri_resort',
  'c_yo', 'c_na', 'c_shi', 'c_to', 'c_ri', 'c_yo_swim', 'c_na_casual', 'c_shi_swim', 'c_to_white', 'c_ri_resort'];
const OBJ = ['b1_lipstick', 'b2_drop', 'c1_fountain', 'c2_guitar', 'c2_moon', 'd_rose', 'fi_candle', 'fi_r3', 'fi_r7', 'ou_astrolabe', 'ou_champ',
  'ou_chandelier', 'ou_doily', 'p2_bells', 'slim_candle', 'v2_crescent', 'v2_jewel', 'ch_wine'];
const HT = ['v1_stars', 'b1_curtain', 'ch_fire', 'c1_blaze', 'd_tile'];
const PHOTOS = ['b1_letter', 'v2_moonbeach', 'fi_sail', 'br_palms', 'd_tile', 'c2_fizz'];
const PAPERS = ['paper_cream', 'paper_navy', 'paper_kraft', 'paper_peach', 'paper_red', 'paper_black'];

const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + src)); i.src = src; });
let cv, ctx, small, sctx;
async function init() {
  cv = document.getElementById('c'); ctx = cv.getContext('2d');
  small = makeCanvas(480, 270); sctx = small.getContext('2d');
  await Promise.all(FONT_FILES.map(async ([fam, file, weight, style]) => {
    const f = new FontFace(fam, `url(assets/fonts/${file})`, { weight, style: style || 'normal' }); await f.load(); document.fonts.add(f);
  }));
  await loadTiming('data/timing.json');
  const jobs = [];
  const L = (k, src) => jobs.push(loadImg(src).then(i => { i._k = k; IMG[k] = i; }));
  STICKERS.forEach(k => { const big = !k.startsWith('c_'); L(big ? k + '_st' : k, `assets/v3/${k}.png`); L(big ? k : k + '_plain', big ? `assets/v4/${k}.png` : `assets/v3/${k}_plain.png`); });
  const met = await (await fetch('assets/met/met_manifest.json')).json();
  Object.entries(met).forEach(([k, v]) => L('m_' + k, `assets/met/${k}.${v.cut ? 'png' : 'jpg'}`));
  ['lace_220632', 'lace_221112', 'lace_214828', 'lace_214853', 'lace_227682', 'lace_223050'].forEach(k => L('m_' + k + '_mask', `assets/met/${k}_mask.png`));
  L('m_fringe', 'assets/met/fringe_224903.png');
  OBJ.forEach(k => L('obj_' + k, `assets/v3/obj_${k}.png`));
  NEON.forEach(k => L('neon_' + k, `assets/neon/${k}.png`));
  HT.forEach(k => { L('ht_' + k, `assets/v3/ht_${k}.png`); L('ink_' + k, `assets/v3/ink_${k}.png`); });
  PHOTOS.forEach(k => L('photo_' + k, `assets/photos/${k}.jpg`));
  PAPERS.forEach(k => L(k, `assets/v3/${k}.jpg`));
  L('cover', 'assets/v4/cover4x.jpg'); L('card_yo', 'assets/img/up/yoshino_night.jpg'); L('card_na', 'assets/img/up/nagi_shin_alhambra.jpg');
  await Promise.all(jobs);
  build6();
  render(0.01);
  return true;
}

function bloom(amount) {
  if (amount <= 0.01) return;
  sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.globalCompositeOperation = 'source-over'; sctx.globalAlpha = 1;
  sctx.filter = 'brightness(0.8) contrast(2.2) blur(7px)'; sctx.drawImage(cv, 0, 0, 480, 270); sctx.filter = 'none';
  sctx.globalCompositeOperation = 'multiply'; sctx.fillStyle = '#ffb88a'; sctx.fillRect(0, 0, 480, 270);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = amount; ctx.drawImage(small, 0, 0, W, H); ctx.restore();
}

// かわたれに目を閉じて: the eyes close (lids from top and bottom), then open again on the morning.
let lidBuf = null;
function lidClosure(t) {
  const l = T.lines[63], c = l.chars;
  const tA = c[5] - 0.12, tB = c[6] + 0.2, tC = c[7] - 0.05, tD = 235.12;
  if (t < tA || t > 236.9) return 0;
  if (t < tB) return 0.45 * E.inOutSine(clamp((t - tA) / (tB - tA)));
  if (t < tC) return lerp(0.45, 0.32, E.inOutSine(clamp((t - tB) / (tC - tB))));
  if (t < tD) return lerp(0.32, 1, E.inOutCubic(clamp((t - tC) / (tD - tC))));
  if (t < 235.45) return 1;
  if (t < 235.95) return lerp(1, 0.38, E.outCubic((t - 235.45) / 0.5));
  if (t < 236.12) return lerp(0.38, 0.55, E.inOutSine((t - 235.95) / 0.17));   // a sleepy blink
  return lerp(0.55, 0, E.inOutSine(clamp((t - 236.12) / 0.75)));
}
function eyelids(t) {
  const c = lidClosure(t);
  if (c <= 0.002) return;
  // the world goes soft as the eyes close
  if (c > 0.05) { sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.globalCompositeOperation = 'source-over'; sctx.globalAlpha = 1; sctx.filter = 'blur(3px)'; sctx.drawImage(cv, 0, 0, 480, 270); sctx.filter = 'none';
    ctx.save(); ctx.globalAlpha = Math.min(1, c * 1.2) * 0.85; ctx.drawImage(small, 0, 0, W, H); ctx.restore(); }
  if (!lidBuf) lidBuf = makeCanvas(W / 2, H / 2);
  const g = lidBuf.getContext('2d'), w = W / 2, hh = H / 2;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, hh);
  const open = (620 * (1 - c) + 900 * Math.pow(1 - c, 4)) / 2, R = 1250 / 2, cx = w / 2, cy = 560 / 2;
  const path = (k, up) => { g.beginPath(); g.moveTo(-20, up ? -20 : hh + 20);
    for (let x = -20; x <= w + 20; x += 8) { const dx = (x - cx) / R, e = Math.sqrt(Math.max(0, 1 - dx * dx)); g.lineTo(x, up ? cy - open * k * e : cy + open * 0.82 * k * e); }
    g.lineTo(w + 20, up ? -20 : hh + 20); g.closePath(); g.fill(); };
  // warm light through the eyelids at the rim, black inside
  g.filter = 'blur(14px)'; g.fillStyle = '#240605'; path(0.96, true); path(0.96, false);
  g.filter = 'blur(6px)'; g.fillStyle = '#060103'; path(1.12, true); path(1.12, false); g.filter = 'none';
  ctx.save(); ctx.drawImage(lidBuf, 0, 0, W, H);
  if (c > 0.97) { const k = (c - 0.97) / 0.03; const gr = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 900); gr.addColorStop(0, `rgba(70,16,14,${0.55 * k})`); gr.addColorStop(1, 'rgba(10,2,4,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}

export function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  runShots(ctx, t, SHOTS6);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  bloom(0.1 + 0.14 * energy(t));
  eyelids(t);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.drawImage(fx.vignette(0.75), 0, 0); ctx.restore();
  fx.applyGrain(ctx, Math.floor(t * 24) / 24, 0.05);
  const blk = Math.max(1 - smooth(0, 0.4, t), smooth(263.0, 264.0, t));
  if (blk > 0) { ctx.save(); ctx.globalAlpha = blk; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

window.MV = { ready: init(), render, grab(t, q = 0.93) { render(t); return cv.toDataURL('image/jpeg', q); }, duration: 264.5 };
const qs = new URLSearchParams(location.search);
window.MV.ready.then(() => {
  if (qs.has('t')) render(parseFloat(qs.get('t')));
  if (qs.has('play')) {
    const au = new Audio('assets/audio/song.mp3'); au.currentTime = parseFloat(qs.get('play') || '0') || 0;
    document.body.addEventListener('click', () => (au.paused ? au.play() : au.pause()));
    const loop = () => { render(au.currentTime); requestAnimationFrame(loop); }; loop();
  }
});
