// v4 compositor: loads assets (incl. The Met open-access objects), runs the storyboard, lyrics and film finishing.
import { W, H, clamp, smooth, makeCanvas } from './util.js';
import { T, loadTiming } from './timing.js';
import * as fx from './fx.js';
import { IMG } from './gfx.js';
import { build, SHOTS, runShots } from './scenes4.js';
import { drawLyrics } from './lyrics4.js';

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
const PHOTOS = ['b1_letter', 'v2_moonbeach', 'fi_sail', 'br_palms', 'd_tile'];
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
  HT.forEach(k => { L('ht_' + k, `assets/v3/ht_${k}.png`); L('ink_' + k, `assets/v3/ink_${k}.png`); });
  PHOTOS.forEach(k => L('photo_' + k, `assets/photos/${k}.jpg`));
  PAPERS.forEach(k => L(k, `assets/v3/${k}.jpg`));
  L('cover', 'assets/v4/cover4x.jpg'); L('card_yo', 'assets/img/up/yoshino_night.jpg'); L('card_na', 'assets/img/up/nagi_shin_alhambra.jpg');
  await Promise.all(jobs);
  build();
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
const COLLAGE = [[9.75, 15.9], [30.3, 38.45], [69.75, 94.37], [238.14, 249.75]];
const inCollage = t => COLLAGE.some(([a, b]) => t >= a && t < b);

export function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  runShots(ctx, t, SHOTS);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  const col = inCollage(t);
  bloom(col ? 0.08 : 0.24);
  drawLyrics(ctx, t);
  ctx.save(); ctx.globalAlpha = col ? 0.35 : 0.55; ctx.drawImage(fx.vignette(0.75), 0, 0); ctx.restore();
  fx.applyGrain(ctx, Math.floor(t * 12) / 12, col ? 0.07 : 0.05);
  const blk = Math.max(1 - smooth(0, 0.5, t), smooth(263.0, 265.6, t));
  if (blk > 0) { ctx.save(); ctx.globalAlpha = blk; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

window.MV = { ready: init(), render, grab(t, q = 0.93) { render(t); return cv.toDataURL('image/jpeg', q); }, duration: 266 };
const qs = new URLSearchParams(location.search);
window.MV.ready.then(() => {
  if (qs.has('t')) render(parseFloat(qs.get('t')));
  if (qs.has('play')) {
    const au = new Audio('assets/audio/song.mp3'); au.currentTime = parseFloat(qs.get('play') || '0') || 0;
    document.body.addEventListener('click', () => (au.paused ? au.play() : au.pause()));
    const loop = () => { render(au.currentTime); requestAnimationFrame(loop); }; loop();
  }
});
