// v2 storyboard: one Andalusian night, from the first star to dawn.
// The candle lit in the prologue is the night's love; it becomes fire in the choruses
// and is blown out at "かわたれに目を閉じて" when the sun takes over.
import { W, H, TAU, clamp, lerp, inv, smooth, E, hash, noise1 } from './util.js';
import { T, barT, beatT, beatF, pulse } from './timing.js';
import { IMG, photo, drawCover, drawBlur, tint, vshade, radial, kaleido, cutout, embers, bokeh, glints, smoke, silhouetteOf, feather, vmask } from './shots.js';
import { F, font, drawText, label } from './text.js';
import { drawChant } from './lyrics.js';

const L = i => T.lines[i].start;
const ch = (i, j) => T.lines[i].chars[j];
const ph = (key, o = {}) => (ctx, t, s) => photo(ctx, IMG[key], t, s.a, s.b, o);
const IV = '#fbf3e6', GOLD = '#f2d9a6';

// cover crops (focus points on the CD jacket)
const FACE = { nagi: [0.2, 0.34], shin: [0.39, 0.19], yoshino: [0.63, 0.27], riamu: [0.8, 0.33], tomoe: [0.49, 0.46] };
const cover = (o = {}) => (ctx, t, s) => photo(ctx, IMG.cover, t, s.a, s.b, { z: [1.4, 1.3], f: [[0.47, 0.36], [0.5, 0.38]], ...o });
const crop = (who, z = [2.2, 2.05], dx = 0.03, img = 'cover') => (ctx, t, s) =>
  photo(ctx, IMG[img], t, s.a, s.b, { z, f: [[FACE[who][0] - dx, FACE[who][1]], [FACE[who][0] + dx, FACE[who][1]]] });

function flicker(ctx, t, amt = 0.06, color = '#ff9a4a') { tint(ctx, color, amt * (0.5 + 0.5 * noise1(t * 7, 3)), 'soft-light'); }
function warmth(ctx, a) { tint(ctx, '#ff8a3a', a, 'soft-light'); }

// ---------------------------------------------------------------- composites
function prologueCandle(ctx, t, s) {
  photo(ctx, IMG.slim_candle, t, s.a, s.b, { z: [1.08, 1.0], f: [[0.5, 0.45], [0.5, 0.45]] });
  flicker(ctx, t, 0.12);
  label(ctx, 'THE IDOLM@STER CINDERELLA GIRLS', 960, 860, { fam: F.cinzel, size: 15, weight: 600, color: IV, track: 0.55, align: 'center', alpha: smooth(0.4, 1.1, t) * (1 - smooth(1.55, 1.8, t)) * 0.85 });
  label(ctx, 'Passion jewelries! 004', 960, 898, { fam: F.corm, size: 26, italic: true, weight: 500, color: GOLD, track: 0.06, align: 'center', alpha: smooth(0.6, 1.2, t) * (1 - smooth(1.55, 1.8, t)) });
}
const chant = (key, i, gloss, o = {}) => (ctx, t, s) => {
  photo(ctx, IMG[key], t, s.a, s.b, o);
  radial(ctx, 960, 520, 820, [[0, 'rgba(0,0,0,0.55)'], [0.55, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]);
  drawChant(ctx, t, i, { gloss, exit: s.b - 0.2, size: i === 3 ? 230 : 160 });
  if (i === 3) {
    const u = t - 7.74;
    if (u > 0) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.exp(-u * 1.4) * 0.9; drawCover(ctx, IMG.ch_sparks, [0, 0, W, H], 1.1 + u * 0.08, 0.5, 0.5); ctx.restore(); }
    embers(ctx, t, 40, 3, { alpha: 0.8, speed: 140 });
  }
};
function title(ctx, t, s) {
  photo(ctx, IMG.ti_fire, t, s.a, s.b, { z: [1.25, 1.12], f: [[0.62, 0.5], [0.58, 0.5]] });
  radial(ctx, 700, 520, 1100, [[0, 'rgba(0,0,0,0.55)'], [0.6, 'rgba(0,0,0,0.2)'], [1, 'rgba(0,0,0,0)']]);
  embers(ctx, t, 26, 11, { alpha: 0.7, speed: 70, size: 0.8 });
  const out = 1 - smooth(15.3, 16.2, t);
  label(ctx, 'THE IDOLM@STER CINDERELLA GIRLS', 300, 368, { fam: F.cinzel, size: 16, weight: 600, color: IV, track: 0.5, alpha: smooth(10.2, 10.8, t) * out * 0.85 });
  drawText(ctx, t, '熱情エナモラル', { x: 300, y: 470, size: 104, fontStr: font(F.mincho, 104, 800), fill: IV, glow: 'rgba(255,170,90,0.35)', glowBlur: 20, track: 0.06,
    anim: 'blur', start: 10.1, stagger: 0.09, dur: 0.8, exit: 15.4, exitAnim: 'fade', exitDur: 0.8, shadow: 'rgba(0,0,0,0.5)' });
  drawText(ctx, t, 'Enamorar', { x: 620, y: 600, size: 120, fontStr: font(F.script, 120, 400), fill: GOLD, glow: 'rgba(255,170,90,0.5)', glowBlur: 22,
    anim: 'ink', start: 11.0, stagger: 0.08, dur: 0.35, exit: 15.4, exitDur: 0.8 });
  ctx.save(); ctx.globalAlpha = out * 0.9; ctx.fillStyle = GOLD; ctx.fillRect(300, 680, 640 * E.outExpo(inv(11.6, 12.8, t)), 1.2); ctx.restore();
  label(ctx, '依田芳乃　村上巴　佐藤心　夢見りあむ　久川凪', 300, 724, { size: 22, weight: 500, color: IV, track: 0.2, alpha: smooth(12.0, 12.7, t) * out * 0.9 });
}
function starsShot(ctx, t, s) {
  photo(ctx, IMG.v1_stars, t, s.a, s.b, { z: [1.3, 1.15], f: [[0.5, 0.3], [0.5, 0.65]] });
  const pts = []; for (let k = 0; k < 9; k++) pts.push([180 + hash(k, 41) * 1300, 120 + hash(k, 42) * 600, 0.6 + hash(k, 43) * 0.8]);
  glints(ctx, t, pts, 0.75);
}
function palms(ctx, t, s) {
  photo(ctx, IMG.v1_palms, t, s.a, s.b, { z: [1.22, 1.1], f: [[0.5, 0.45], [0.5, 0.5]] });
  warmth(ctx, 0.15 + 0.35 * smooth(27.6, 29.8, t));
  embers(ctx, t, 18, 7, { alpha: 0.5 * smooth(27.6, 29.0, t), speed: 40, size: 0.7 });
}
function yoshinoCandle(ctx, t, s) {
  photo(ctx, IMG.p1_votive, t, s.a, s.b, { z: [1.3, 1.2], f: [[0.4, 0.5], [0.45, 0.5]], blur: [0.85, 0.75] });
  tint(ctx, '#140406', 0.45, 'multiply');
  // "らしくない私" — a faint mirrored double of her on the left
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  cutout(ctx, IMG.ycutO, 520, 600, 900, { flip: true, alpha: 0.13 });
  ctx.restore();
  const u = E.outCubic(inv(s.a, s.a + 1.6, t));
  cutout(ctx, IMG.ycutO, 1380 + (1 - u) * 60, 610, 940 + (t - s.a) * 8, { alpha: u, glow: 'rgba(255,150,70,1)', glowBlur: 30, glowAlpha: 0.55, tint: ['rgba(255,140,60,1)', 0.28, -1] });
  flicker(ctx, t, 0.1);
}
function coals(key, z0, z1) {
  return (ctx, t, s) => {
    photo(ctx, IMG[key], t, s.a, s.b, { z: [z0, z1], f: [[0.5, 0.5], [0.52, 0.48]], ease: E.inQuad });
    const build = inv(s.a, s.b, t);
    tint(ctx, '#ffb070', build * 0.18 * (0.6 + 0.4 * pulse(t, 6)), 'screen');
    embers(ctx, t, Math.round(20 + 60 * build), 13, { alpha: 0.9, speed: 120 + 150 * build });
  };
}
function coverFire(ctx, t, s) {
  photo(ctx, IMG.cover, t, s.a, s.b, { z: [1.45, 1.35], f: [[0.5, 0.4], [0.5, 0.36]] });
  warmth(ctx, 0.25);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.85;
  photo(ctx, IMG.c1_blaze, t, s.a, s.b, { z: [1.1, 1.2], f: [[0.5, 0.6], [0.5, 0.5]] });
  ctx.restore();
  tint(ctx, '#2a0604', 0.25, 'multiply');
  embers(ctx, t, 50, 21, { alpha: 0.9, speed: 160 });
}
function coverRipples(ctx, t, s) {
  photo(ctx, IMG.cover, t, s.a, s.b, { z: [1.35, 1.3], f: [[0.55, 0.36], [0.5, 0.38]] });
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.38;
  photo(ctx, IMG.c1_ripples, t, s.a, s.b, { z: [1.2, 1.3], f: [[0.5, 0.5], [0.5, 0.4]] });
  ctx.restore();
  vshade(ctx, [[0, 'rgba(90,10,30,0)'], [0.6, 'rgba(90,10,30,0.15)'], [1, 'rgba(60,4,20,0.55)']]);
  tint(ctx, '#6a0818', 0.18, 'multiply');
}
function chorusOpen(ctx, t, s) {
  photo(ctx, IMG.cover, t, s.a, s.b, { z: [1.55, 1.36], f: [[0.47, 0.35], [0.47, 0.37]], ease: E.outCubic });
  warmth(ctx, 0.22);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.35 * (1 - inv(s.a, s.a + 1.5, t)) + 0.12;
  photo(ctx, IMG.c1_fire2, t, s.a, s.b, { z: [1.2, 1.1] });
  ctx.restore();
  embers(ctx, t, 36, 23, { alpha: 0.8, speed: 150 });
}
function interGuitar(key, f0, f1, blur = 0) {
  return (ctx, t, s) => {
    photo(ctx, IMG[key], t, s.a, s.b, { z: [1.35, 1.3], f: [f0, f1], blur: [blur, blur] });
    tint(ctx, '#140806', 0.25, 'multiply');
  };
}
function jewelShot(ctx, t, s) {
  photo(ctx, IMG.v2_jewel, t, s.a, s.b, { z: [1.6, 1.45], f: [[0.62, 0.42], [0.58, 0.4]] });
  const pts = []; for (let k = 0; k < 7; k++) pts.push([560 + hash(k, 61) * 800, 430 + hash(k, 62) * 260, 0.5 + 0.6 * hash(k, 63)]);
  glints(ctx, t, pts, 0.85);
}
function bells(ctx, t, s) {
  const sh = pulse(t, 9, 2) * 3;
  ctx.save(); ctx.translate(noise1(t * 30, 1) * sh, noise1(t * 30, 2) * sh);
  photo(ctx, IMG.p2_bells, t, s.a, s.b, { z: [1.2, 1.3], f: [[0.45, 0.42], [0.45, 0.38]] });
  ctx.restore();
  radial(ctx, 960, 300, 900, [[0, 'rgba(255,220,180,0.12)'], [1, 'rgba(0,0,0,0)']], 'screen');
}
function alham(o) { return (ctx, t, s) => { photo(ctx, IMG.alham, t, s.a, s.b, o); embers(ctx, t, 30, 31, { alpha: 0.7, speed: 110 }); }; }
function morningStar(ctx, t, s) {
  alham({ z: [1.28, 1.14], f: [[0.42, 0.38], [0.46, 0.4]] })(ctx, t, s);
  glints(ctx, t, [[1640, 150, 2.4]], 0.95);
}
function sinkingMoon(ctx, t, s) {
  // the moon as an object in a dark sky, slowly sinking toward the horizon
  vshade(ctx, [[0, '#05040c'], [0.7, '#140a1e'], [1, '#2a1426']]);
  const u = inv(s.a, s.b, t), img = feather(IMG.c2_moon, 'circle', 0.3, 0.48), h = 760, w = img.width * h / img.height;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(img, 1120 - w / 2, lerp(150, 330, E.inOutSine(u)), w, h);
  ctx.restore();
  radial(ctx, 1120, lerp(150, 330, E.inOutSine(u)) + h / 2, 700, [[0, 'rgba(255,190,120,0.18)'], [1, 'rgba(255,190,120,0)']], 'screen');
  const sky = []; for (let k = 0; k < 6; k++) sky.push([120 + hash(k, 71) * 700, 90 + hash(k, 72) * 400, 0.4 + hash(k, 73) * 0.5]);
  glints(ctx, t, sky, 0.6);
}
function clockTick(ctx, t, s) {
  const k = Math.floor(beatF(t)), fr = E.outExpo(clamp((beatF(t) - k) * 3));
  photo(ctx, IMG.c2_clock, t, s.a, s.b, { z: [1.3, 1.36], f: [[0.5, 0.5], [0.5, 0.5]], rot: [0, 0] });
  tint(ctx, '#d0d8e8', 0.12 * (1 - fr), 'screen');
}
function dance(ctx, t, s) {
  // a tiled Nasrid wall lit by a fire below; her shadow is thrown huge across it
  const src = t < 141.36 ? IMG.d_tile : IMG.d_kaleido;
  ctx.fillStyle = '#080304'; ctx.fillRect(0, 0, W, H);
  kaleido(ctx, src, t, 8, 960, 620, 1400, t * 0.05, 1.3, 0.35, 0.5, 1);
  tint(ctx, '#ff8a40', 0.35, 'soft-light');
  radial(ctx, 960, 1150, 1300, [[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0.92)']]);
  const sway = Math.sin((t - 133.62) * Math.PI / T.beat / 4) * 0.035;
  const fl = 0.85 + 0.15 * noise1(t * 5, 9);
  ctx.save(); ctx.filter = 'blur(14px)'; ctx.globalAlpha = 0.72 * fl;
  const sil = silhouetteOf(IMG.ncutO, '#0a0204');
  const sh = 1650, sw = sil.width * sh / sil.height;
  ctx.translate(1240, 470); ctx.rotate(sway * 1.8); ctx.drawImage(sil, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();
  vmask(ctx, 560, 900, g => drawCover(g, IMG.d_bonfire, [0, 0, W, H], 1.1, 0.5, 0.5), 'screen', 0.85);
  cutout(ctx, IMG.ncutO, 860, 600 - pulse(t, 6) * 4, 960, { glow: 'rgba(255,120,60,1)', glowBlur: 28, glowAlpha: 0.6, tint: ['rgba(255,110,50,1)', 0.3, 1] });
  embers(ctx, t, 40, 41, { alpha: 0.85, speed: 130 });
}
const nagiOver = (bg, z = [1.25, 1.15], f = [0.5, 0.5], cx = 960) => (ctx, t, s) => {
  photo(ctx, IMG[bg], t, s.a, s.b, { z, f: [f, f] });
  tint(ctx, '#100406', 0.35, 'multiply');
  cutout(ctx, IMG.ncutO, cx, 600, 940 * (1 + (t - s.a) * 0.03), { glow: 'rgba(255,170,90,1)', glowBlur: 26, glowAlpha: 0.6 });
};
function dawnYoshino(ctx, t, s) {
  photo(ctx, IMG.br_mist, t, s.a, s.b, { z: [1.18, 1.05], f: [[0.5, 0.5], [0.45, 0.5]] });
  const u = E.outCubic(inv(s.a, s.a + 2, t));
  cutout(ctx, IMG.ycutO, 1430, 620, 900 + (t - s.a) * 9, { alpha: u, glow: 'rgba(255,214,170,1)', glowBlur: 34, glowAlpha: 0.9, tint: ['rgba(255,200,150,1)', 0.35, -1], tintOp: 'source-over' });
  tint(ctx, '#ffd8b0', 0.1 + 0.25 * smooth(188.6, 191.2, t), 'screen');
}
// Especial: an editorial spread on black — portraits change with each line
const ESP = [[192.0, FACE.riamu], [194.8, FACE.tomoe], [198.7, FACE.yoshino], [199.9, FACE.shin], [202.2, FACE.nagi]];
function especial(ctx, t, s) {
  ctx.fillStyle = '#0c0507'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.22; drawCover(ctx, IMG.es_gold, [0, 0, W, H], 1.2, 0.5, 0.5); ctx.restore();
  tint(ctx, '#3a0610', 0.6, 'multiply');
  // crimson satin band
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 300 * E.outExpo(inv(191.3, 192.1, t)), H); ctx.clip();
  photo(ctx, IMG.es_satin, t, s.a, s.b, { z: [1.6, 1.4], f: [[0.4, 0.5], [0.6, 0.5]] }); ctx.restore();
  // portrait frame
  const fx = 1180, fy = 140, fw = 500, fh = 760;
  let k = -1; for (let i = 0; i < ESP.length; i++) if (t >= ESP[i][0]) k = i;
  if (k >= 0) {
    const tin = ESP[k][0], a = E.outCubic(clamp((t - tin) / 0.45));
    if (k > 0) { ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip(); drawCover(ctx, IMG.cover, [fx, fy, fw, fh], 2.3, ESP[k - 1][1][0], ESP[k - 1][1][1]); ctx.restore(); }
    ctx.save(); ctx.beginPath(); ctx.rect(fx, fy + fh * (1 - a), fw, fh * a); ctx.clip();
    drawCover(ctx, IMG.cover, [fx, fy, fw, fh], 2.3 + (t - tin) * 0.02, ESP[k][1][0], ESP[k][1][1]); ctx.restore();
    ctx.save(); ctx.strokeStyle = GOLD; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.2; ctx.strokeRect(fx - 14, fy - 14, fw + 28, fh + 28); ctx.restore();
    label(ctx, ['Riamu', 'Tomoe', 'Yoshino', 'Kokoro', 'Nagi'][k], fx + fw, fy + fh + 44, { fam: F.corm, size: 28, italic: true, weight: 500, color: GOLD, track: 0.1, align: 'right', alpha: a });
  }
  // 熱情 — the word the whole section turns on
  drawText(ctx, t, '熱情', { x: 640, y: 150, vertical: true, size: 300, fontStr: font(F.mincho, 300, 800), fill: '#b3122e', glow: 'rgba(255,60,60,0.35)', glowBlur: 30,
    anim: 'blur', start: 194.9, stagger: 0.12, dur: 0.6, exit: 198.4, exitAnim: 'fade', exitDur: 0.6 });
  tint(ctx, '#ffe2c0', Math.pow(smooth(207.6, 209.1, t), 2) * 0.6, 'screen');
}
function dawnCover(ctx, t, s) {
  photo(ctx, IMG.fi_clouds, t, s.a, s.b, { z: [1.15, 1.05] });
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.62;
  photo(ctx, IMG.cover, t, s.a, s.b, { z: [1.5, 1.38], f: [[0.47, 0.36], [0.47, 0.38]] });
  ctx.restore();
}
function coverDawn(o = {}) {
  return (ctx, t, s) => {
    cover(o)(ctx, t, s);
    tint(ctx, '#ffb88a', 0.22, 'soft-light');
    bokeh(ctx, t, 10, 51, { alpha: 0.5, colors: ['rgba(255,220,180,1)', 'rgba(255,190,200,1)'], size: 1.2, drift: 20 });
  };
}
function climax(ctx, t, s) {
  photo(ctx, IMG.cover, t, s.a, s.b, { z: [1.3, 1.52], f: [[0.5, 0.4], [0.52, 0.34]] });
  tint(ctx, '#ffc28a', 0.25, 'soft-light');
  bokeh(ctx, t, 16, 71, { alpha: 0.7, colors: ['rgba(255,214,160,1)', 'rgba(255,170,190,1)'], size: 1.3, drift: 30 });
  radial(ctx, 1500, 200, 1100, [[0, 'rgba(255,230,190,0.45)'], [1, 'rgba(255,230,190,0)']], 'screen');
}
function candleOut(ctx, t, s) {
  photo(ctx, IMG.fi_candle, t, s.a, s.b, { z: [1.4, 1.4], f: [[0.5, 0.45], [0.5, 0.45]] });
  const out = smooth(233.3, 233.75, t), fx = IMG.fi_candle._fx || 930, fy = IMG.fi_candle._fy || 400;
  // the flame goes out; the room falls into the blue hour and a thread of smoke rises from the wick
  ctx.save(); ctx.translate(fx, fy - 30); ctx.scale(0.42, 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 230);
  g.addColorStop(0, `rgba(30,22,34,${0.97 * out})`); g.addColorStop(0.5, `rgba(30,22,34,${0.8 * out})`); g.addColorStop(1, 'rgba(30,22,34,0)');
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(-300, -300, 600, 600); ctx.restore();
  tint(ctx, '#2c2440', out * 0.55, 'multiply');
  tint(ctx, '#6a6a9a', out * 0.12, 'screen');
  smoke(ctx, t, fx, fy + 60, 233.45, 1.6, 2.0);
}
const outroShot = (key, credit, cv, i) => (ctx, t, s) => {
  photo(ctx, IMG[key], t, s.a, s.b, { z: [1.22, 1.12], f: [[0.5, 0.5], [0.5, 0.48]] });
  tint(ctx, '#ffd0a8', 0.12, 'soft-light');
  if (key === 'ou_window' || key === 'ou_lace_room') tint(ctx, '#8a7468', 0.35, 'multiply');
  if (credit) {
    const a = smooth(s.a + 0.3, s.a + 0.9, t) * (1 - smooth(s.b - 0.3, s.b, t));
    radial(ctx, 260, 930, 560, [[0, `rgba(10,4,6,${0.65 * a})`], [1, 'rgba(10,4,6,0)']]);
    label(ctx, credit, 150, 900, { size: 30, weight: 700, color: IV, track: 0.18, alpha: a });
    label(ctx, cv, 150, 944, { fam: F.corm, size: 24, italic: true, weight: 500, color: GOLD, track: 0.08, alpha: a });
  }
};
function endCard(ctx, t, s) {
  photo(ctx, IMG.ou_calm, t, s.a, s.b, { z: [1.15, 1.05], f: [[0.5, 0.5], [0.5, 0.55]] });
  tint(ctx, '#140a10', 0.45, 'multiply');
  radial(ctx, 960, 520, 1000, [[0, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]);
  drawText(ctx, t, '熱情エナモラル', { x: 960, y: 430, align: 'center', size: 96, fontStr: font(F.mincho, 96, 800), fill: IV, glow: 'rgba(255,170,90,0.35)', glowBlur: 20, track: 0.08, anim: 'blur', start: 250.2, stagger: 0.08, dur: 0.9 });
  drawText(ctx, t, 'Fin', { x: 960, y: 560, align: 'center', size: 110, fontStr: font(F.script, 110, 400), fill: GOLD, glow: 'rgba(255,170,90,0.5)', glowBlur: 22, anim: 'ink', start: 251.3, stagger: 0.15, dur: 0.5 });
  const a = smooth(252.0, 252.8, t);
  label(ctx, 'THE IDOLM@STER CINDERELLA MASTER  Passion jewelries! 004', 960, 668, { fam: F.cinzel, size: 15, weight: 600, color: IV, track: 0.3, align: 'center', alpha: a * 0.85 });
  label(ctx, '依田芳乃　村上巴　佐藤心　夢見りあむ　久川凪', 960, 712, { size: 22, weight: 500, color: IV, track: 0.2, align: 'center', alpha: a * 0.9 });
  label(ctx, 'fan-made lyric video  ·  photographs: Open Images Dataset (CC BY 2.0), see CREDITS', 960, 760, { fam: F.corm, size: 20, italic: true, color: GOLD, track: 0.04, align: 'center', alpha: smooth(253, 253.8, t) * 0.75 });
}

// ---------------------------------------------------------------- timeline
export let SHOTS = [];
export const SECTIONS = [
  [0, 'PRÓLOGO'], [15.9, 'I · NOCHE'], [30.45, 'II · CARMÍN'], [38.5, 'III · CALOR'], [48.46, 'IV · ENAMORAR'], [69.75, 'INTERMEDIO'],
  [79.43, 'V · MAR'], [94.37, 'VI · BESO'], [102.62, 'VII · CAMPANAS'], [112.33, 'VIII · LUCERO'], [133.62, 'IX · BAILE'], [166.53, 'X · AURORA'],
  [191.3, 'XI · ESPECIAL'], [209.11, 'XII · AMANECER'], [238.14, 'FIN'],
];
// letterbox: closed (cinematic bars) in verses, open on choruses
export function letterbox(t) {
  const open = [[48.46, 69.75], [112.33, 166.53], [191.3, 238.14]];
  let v = 1;
  for (const [a, b] of open) v = Math.min(v, 1 - Math.min(smooth(a - 0.5, a, t), 1 - smooth(b - 0.2, b + 0.5, t)));
  return v;
}

export function buildTimeline() {
  const S = [];
  const add = (a, draw, tr = 'cut', td = 0, extra = {}) => S.push({ a, draw, tr, td, ...extra });
  // prologue
  add(0, prologueCandle);
  add(L(0) - 0.08, chant('ch_rose', 0, 'さ あ 、 踊 り ま し ょ う', { z: [1.35, 1.2], f: [[0.5, 0.5], [0.52, 0.48]] }), 'cut', 0, { kick: 0.5 });
  add(L(1) - 0.08, chant('ch_wine', 1, 'あ な た を 愛 し て る', { z: [1.25, 1.12], f: [[0.5, 0.45], [0.5, 0.5]] }), 'cut', 0, { kick: 0.5 });
  add(L(2) - 0.08, chant('ch_guitar', 2, 'さ あ 、 踊 り ま し ょ う', { z: [1.35, 1.2], f: [[0.45, 0.5], [0.55, 0.5]] }), 'cut', 0, { kick: 0.5 });
  add(L(3) - 0.08, chant('ch_fire', 3, '', { z: [1.2, 1.05], f: [[0.5, 0.55], [0.5, 0.5]] }), 'cut', 0, { kick: 0.9 });
  add(9.75, title, 'dissolve', 0.6);
  // verse 1 — stars, two flames, cold sea, warm palms
  add(15.9, starsShot, 'defocus', 1.0);
  add(L(5) - 0.1, ph('v1_candles', { z: [1.18, 1.08], blur: [0.9, 0], blurSpeed: 2.2 }), 'dissolve', 0.7);
  add(L(6) - 0.1, ph('v1_cold', { z: [1.35, 1.25], f: [[0.5, 0.33], [0.56, 0.35]] }), 'dissolve', 0.7);
  add(L(7) - 0.1, palms, 'defocus', 0.7);
  // B1 — rouge, a letter, crimson, her hair in the navy evening
  add(L(8) - 0.05, ph('b1_lipstick', { z: [1.08, 1.0], f: [[0.5, 0.5], [0.5, 0.56]] }), 'cut', 0, { kick: 0.35 });
  add(L(9) - 0.1, ph('b1_letter', { z: [1.5, 1.3], f: [[0.3, 0.45], [0.62, 0.35]], blur: [0.45, 0.3] }), 'dissolve', 0.35);
  add(L(10) - 0.1, ph('b1_curtain', { z: [1.28, 1.12], f: [[0.5, 0.5], [0.5, 0.45]] }), 'cut', 0, { kick: 0.4 });
  add(L(11) - 0.1, (ctx, t, s) => photo(ctx, IMG.ynight, t, s.a, s.b, { z: [1.7, 1.5], f: [[0.4, 0.58], [0.34, 0.62]] }), 'whip', 0.35, { tro: { dir: -1 } });
  // pre-chorus — the unfamiliar self by candlelight, then embers
  add(38.5, yoshinoCandle, 'defocus', 0.7);
  add(L(13) - 0.1, coals('p1_embers', 1.1, 1.3), 'dissolve', 0.5);
  add(45.56, coals('p1_coals', 1.15, 1.5), 'dissolve', 0.4);
  // chorus 1
  add(48.46, chorusOpen, 'burn', 0.6);
  add(L(16) - 0.08, ph('c1_fountain', { z: [1.14, 1.02], f: [[0.5, 0.55], [0.5, 0.5]] }), 'cut', 0, { kick: 0.6 });
  add(L(17) - 0.08, crop('riamu', [2.2, 2.05], 0.04), 'cut', 0, { kick: 0.7 });
  add(L(18) - 0.08, crop('tomoe', [2.35, 2.2], 0.05), 'whip', 0.3);
  add(L(19) - 0.08, ph('c1_rose1', { z: [1.3, 1.42] }), 'cut', 0, { kick: 0.5 });
  add(ch(19, 5) - 0.08, ph('c1_rose2', { z: [1.25, 1.4] }), 'cut', 0, { kick: 0.5 });
  add(L(20) - 0.08, coverRipples, 'dissolve', 0.3);
  add(L(21) - 0.08, coverFire, 'burn', 0.45);
  add(L(22) - 0.1, ph('c1_coals', { z: [1.1, 1.25] }), 'dissolve', 0.8);
  // interlude — guitar
  add(69.75, interGuitar('in_strings', [0.3, 0.5], [0.62, 0.5]), 'defocus', 0.8);
  add(73.62, interGuitar('in_curve', [0.62, 0.5], [0.4, 0.5]), 'dissolve', 0.8);
  add(77.49, interGuitar('in_hole', [0.5, 0.5], [0.5, 0.45], 0.25), 'dissolve', 0.6);
  // verse 2 — the sea at night
  add(79.43, ph('v2_moonbeach', { z: [1.22, 1.1], f: [[0.5, 0.5], [0.55, 0.5]] }), 'defocus', 1.0);
  add(L(24) - 0.1, ph('v2_harbor', { z: [1.4, 1.5], f: [[0.5, 0.45], [0.55, 0.45]], blur: [0.85, 0.3], blurSpeed: 0.6 }), 'dissolve', 0.7);
  add(L(25) - 0.1, jewelShot, 'dissolve', 0.6);
  add(L(26) - 0.1, (ctx, t, s) => photo(ctx, IMG.ynight, t, s.a, s.b, { z: [1.2, 1.06], f: [[0.5, 0.42], [0.5, 0.45]] }), 'defocus', 0.6);
  // B2 — a kiss, then a corridor of light ("take me away")
  add(L(27) - 0.1, ph('b2_drop', { z: [1.2, 1.36], blur: [0.7, 0], blurSpeed: 1.6 }), 'dissolve', 0.6);
  add(L(28) - 0.1, (ctx, t, s) => {
    photo(ctx, IMG.b2_corridor, t, s.a, s.b, { z: [1.0, 1.4], f: [[0.5, 0.56], [0.5, 0.52]], ease: E.inOutQuad });
    const g = ctx.createLinearGradient(1100, 0, W, 0); g.addColorStop(0, 'rgba(10,4,6,0)'); g.addColorStop(1, 'rgba(10,4,6,0.7)');
    ctx.fillStyle = g; ctx.fillRect(1100, 0, W - 1100, H);
  }, 'dissolve', 0.6);
  // pre-chorus 2 — bells, then silence
  add(102.62, bells, 'cut', 0, { kick: 0.4 });
  add(L(30) - 0.1, ph('p2_lights', { z: [1.2, 1.3], blur: [0.3, 0.9], blurSpeed: 0.8 }), 'defocus', 0.8);
  add(110.4, (ctx, t, s) => { photo(ctx, IMG.p2_spires, t, s.a, s.b, { z: [1.1, 1.32], ease: E.inQuad }); tint(ctx, '#ffd6e8', Math.pow(inv(111.4, 112.33, t), 2) * 0.5, 'screen'); }, 'dissolve', 0.5);
  // chorus 2 — morning star, sinking moon, time, bubbles, guitar
  add(112.33, morningStar, 'burn', 0.5);
  add(L(33) - 0.08, sinkingMoon, 'cut', 0, { kick: 0.5 });
  add(L(34) - 0.08, alham({ z: [2.0, 1.9], f: [[0.2, 0.42], [0.24, 0.44]] }), 'cut', 0, { kick: 0.7 });
  add(L(35) - 0.08, clockTick, 'cut', 0, { kick: 0.3 });
  add(L(36) - 0.08, ph('c2_pocket', { z: [1.75, 1.9], f: [[0.74, 0.58], [0.74, 0.6]], blur: [0.12, 0.12] }), 'cut', 0, { kick: 0.4 });
  add(L(37) - 0.08, alham({ z: [1.85, 1.75], f: [[0.56, 0.36], [0.6, 0.38]] }), 'cut', 0, { kick: 0.5 });
  add(L(38) - 0.08, ph('c2_fizz', { z: [1.6, 1.75], f: [[0.78, 0.5], [0.76, 0.48]] }), 'dissolve', 0.4);
  add(L(39) - 0.1, ph('c2_guitar', { z: [1.25, 1.12], f: [[0.42, 0.32], [0.38, 0.3]] }), 'dissolve', 0.6);
  // dance break
  add(133.62, dance, 'burn', 0.6);
  const bar = k => barT(k);
  add(bar(77), ph('d_willow', { z: [1.15, 1.05] }), 'cut', 0, { kick: 0.6 });
  add(bar(78), nagiOver('d_fw_orange'), 'whip', 0.3);
  add(bar(79), ph('d_montjuic', { z: [1.2, 1.1] }), 'cut', 0, { kick: 0.5 });
  add(bar(80), crop('shin', [1.7, 1.55], 0.06), 'whip', 0.3, { tro: { dir: -1 } });
  add(bar(81), ph('d_fountains', { z: [1.15, 1.05] }), 'cut', 0, { kick: 0.5 });
  add(bar(82), ph('d_skylantern', { z: [1.2, 1.35] }), 'dissolve', 0.3);
  add(bar(83), nagiOver('d_lanterns', [1.5, 1.4], [0.4, 0.42]), 'cut', 0, { kick: 0.5 });
  add(bar(84), ph('d_bent', { z: [1.25, 1.15] }), 'whip', 0.3);
  ['d_rose', 'd_lamp', 'd_willow', 'c1_fire2'].forEach((k, j) => add(beatT(Math.round((bar(85) - T.offset) / T.beat) + j), ph(k, { z: [1.25, 1.15] }), 'cut', 0, { kick: 0.4 + j * 0.15 }));
  // bridge — dawn
  add(166.53, ph('br_sun', { z: [1.15, 1.05], f: [[0.5, 0.55], [0.5, 0.5]] }), 'flash', 0.8, { tro: { amount: 0.95, color: '#fff3e0' } });
  add(L(41) - 0.1, ph('br_palms', { z: [1.2, 1.08] }), 'dissolve', 0.8);
  add(L(42) - 0.1, ph('br_gold', { z: [1.5, 1.45], f: [[0.25, 0.5], [0.75, 0.5]], ease: E.lin }), 'dissolve', 0.6);
  add(L(44) - 0.1, dawnYoshino, 'defocus', 0.8);
  // especial
  add(191.3, especial, 'cut');
  // final chorus
  add(209.11, dawnCover, 'flash', 0.6, { tro: { amount: 0.9 } });
  add(L(55) - 0.1, ph('fi_sail', { z: [1.25, 1.12], f: [[0.5, 0.5], [0.55, 0.5]] }), 'dissolve', 0.4);
  add(L(56) - 0.08, crop('shin', [1.9, 1.8], 0.05), 'cut', 0, { kick: 0.6 });
  const b0 = Math.round((L(57) - 0.08 - T.offset) / T.beat);
  ['fi_r1', 'fi_r4', 'fi_r3', 'fi_r7', 'fi_r8', 'fi_r2'].forEach((k, j) => add(j === 0 ? L(57) - 0.08 : beatT(b0 + j), ph(k, { z: [1.35, 1.25] }), 'cut', 0, { kick: 0.35 }));
  add(L(58) - 0.08, crop('riamu', [2.1, 2.0]), 'cut', 0, { kick: 0.5 });
  add(ch(58, 5) - 0.08, crop('tomoe', [2.2, 2.1]), 'cut', 0, { kick: 0.5 });
  add(L(59) - 0.1, (ctx, t, s) => { photo(ctx, IMG.alham, t, s.a, s.b, { z: [1.3, 1.2], f: [[0.45, 0.45], [0.5, 0.42]] }); ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.35; photo(ctx, IMG.fi_ripples, t, s.a, s.b, { z: [1.2, 1.3] }); ctx.restore(); tint(ctx, '#ffb88a', 0.2, 'soft-light'); }, 'dissolve', 0.3);
  add(L(60) - 0.1, climax, 'flash', 0.4, { tro: { amount: 0.6 } });
  add(L(61) - 0.08, (ctx, t, s) => { photo(ctx, IMG.fi_palmfog, t, s.a, s.b, { z: [1.3, 1.2], f: [[0.4, 0.4], [0.45, 0.42]] }); bokeh(ctx, t, 12, 81, { alpha: 0.6, colors: ['rgba(255,220,180,1)'], size: 1.1, drift: 25 }); }, 'cut', 0, { kick: 0.4 });
  add(L(62) - 0.08, crop('yoshino', [2.7, 2.55], 0.02), 'cut', 0, { kick: 0.3 });
  add(L(63) - 0.1, candleOut, 'dissolve', 0.7);
  add(L(64) - 0.1, ph('fi_pale', { z: [1.25, 1.1] }), 'dissolve', 0.9);
  // outro — the morning after, with the credits
  const cr = [['依田芳乃', 'CV. 高田憂希'], ['村上巴', 'CV. 花井美春'], ['佐藤心', 'CV. 花守ゆみり'], ['夢見りあむ', 'CV. 星希成奏'], ['久川凪', 'CV. 立花日菜']];
  ['ou_birds', 'ou_lace_room', 'ou_champ', 'ou_ring', 'ou_astrolabe', 'ou_chandelier'].forEach((k, j) =>
    add(barT(123 + j), outroShot(k, cr[j] ? cr[j][0] : '', cr[j] ? cr[j][1] : '', j), j === 0 ? 'dissolve' : 'dissolve', j === 0 ? 0.9 : 0.4));
  add(249.75, endCard, 'dissolve', 1.0);
  S.forEach((s, i) => { s.b = S[i + 1] ? S[i + 1].a : 999; });
  SHOTS = S;
  return S;
}
