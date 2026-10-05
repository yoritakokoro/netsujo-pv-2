// v3 storyboard. Main language: layered motion graphics driven by who is singing — each member
// has a colour, her stage costume art and a halftone "echo" of herself. Collage is used only for
// three memory-like passages: the vanity (B1), the summer interlude/verse 2, and the end credits.
import { W, H, TAU, clamp, lerp, inv, smooth, E, hash, noise1, makeCanvas } from './util.js';
import { T, barT, beatT, beatF, barF, pulse } from './timing.js';
import { IMG, MEM, ORDER, buf, fill, vgrad, lgrad, rgrad, rgba, cover, place, tinted, duo, character, withMask, fanPath, archPath,
  circlePath, rectPath, sunburst, rings, lattice, dots, ink, glow, sparkle, stars, embers, petals, bokeh, leak, softDot } from './gfx.js';
import { paper, piece, sticker, slap, tape, polaroid, scribble, doodle, step, boil } from './collage.js';
import { F, font, drawText, label } from './text.js';
import { chant, plate } from './lyrics3.js';

const Ls = i => T.lines[i].start;
const ch = (i, j) => T.lines[i].chars[j];
const IV = '#fbf4e8', GOLD = '#f2d9a6';
const FACE = { na: [0.2, 0.34], shi: [0.39, 0.19], yo: [0.63, 0.27], ri: [0.8, 0.33], to: [0.49, 0.46] };
const COS = { yo: 'yo_cos', na: 'na_cos', shi: 'shi_cos', to: 'to_cos', ri: 'ri_cos' };
const PLAIN = k => IMG[k + '_plain'];

/* ------------------------------------------------------------ composition helpers */
// standing art anchored to the bottom edge (all card cut-outs are cropped at the bottom)
function stand(ctx, t, key, x, h, o = {}) {
  const img = PLAIN(key); if (!img) return;
  const t0 = o.t0 ?? -1e9, u = E.outCubic(clamp((t - t0) / (o.inDur || 0.7)));
  const breathe = 1 + Math.sin(t * 1.1 + x) * 0.004;
  if (o.face && FA[key]) { const w = img.width * h / img.height; x = o.flip ? x + (FA[key][0] - 0.5) * w : x - (FA[key][0] - 0.5) * w; }
  const y = H + (o.drop ?? 0.04) * h - (h * breathe) / 2 + (1 - u) * (o.rise ?? 120) + (o.dy || 0);
  character(ctx, img, x + (1 - u) * (o.slide || 0) + (o.drift ? (t - (o.t0 || 0)) * o.drift : 0), y, h * breathe, {
    a: (o.a ?? 1) * clamp(u * 1.6), flip: o.flip, rot: o.rot || 0,
    shadow: o.shadow === false ? null : { dx: 18, dy: 10, blur: 22, a: 0.45 },
    wrap: o.rim ? { color: o.rim, a: o.rimA ?? 0.75, side: o.rimSide ?? 1 } : null,
    glow: o.glow ? { color: o.glow, blur: 30, a: o.glowA ?? 0.6 } : null,
    grade: o.grade ? { color: o.grade, a: o.gradeA ?? 0.3, op: o.gradeOp || 'multiply' } : null,
  });
}
// big halftone "echo" of a member in her colour: her silhouette printed through a fine dot screen
let dotTile = null;
function dotPat(g) {
  if (!dotTile) { dotTile = makeCanvas(14, 14); const d = dotTile.getContext('2d'); d.fillStyle = '#fff'; d.beginPath(); d.arc(7, 7, 3.6, 0, TAU); d.fill(); }
  const p = g.createPattern(dotTile, 'repeat'); p.setTransform(new DOMMatrix().rotate(30)); return p;
}
function echo(ctx, t, key, x, y, h, color, a = 0.5, flip = false) {
  const img = PLAIN(key); if (!img || a <= 0.003) return;
  const [c, g] = buf('echo');
  place(g, tinted(img, color), x, y, h, { flip });
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = dotPat(g); g.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(c, 0, 0); ctx.restore();
}
// face anchors of the stage-costume / private-clothes standing art (relative to the image)
export const FA = { yo_cos: [0.42, 0.28], na_cos: [0.33, 0.33], to_cos: [0.2, 0.12], shi_cos: [0.27, 0.2], ri_cos: [0.55, 0.2],
  na_casual: [0.43, 0.27], yo_swim: [0.17, 0.25], shi_swim: [0.33, 0.3], to_white: [0.48, 0.3], ri_resort: [0.53, 0.25] };
// draw a standing art so that her face lands on (cx, cy); h = image height on screen
function faceAt(ctx, key, cx, cy, h, o = {}) {
  const img = PLAIN(key); if (!img) return;
  const [fx, fy] = FA[key], w = img.width * h / img.height;
  const x = o.flip ? cx + (fx - 0.5) * w : cx - (fx - 0.5) * w, y = cy - (fy - 0.5) * h;
  character(ctx, img, x, y, h, o);
}
function hud(ctx, t, who, a = 1) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a * 0.85;
  label(ctx, '熱情エナモラル', 70, 56, { size: 14, weight: 700, color: IV, track: 0.35 });
  ORDER.forEach((w, k) => {
    const on = who && who.includes(w), x = W - 70 - (4 - k) * 22, y = 56;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU);
    if (on) { ctx.fillStyle = MEM[w].ink; ctx.fill(); } else { ctx.strokeStyle = 'rgba(251,244,232,0.6)'; ctx.lineWidth = 1.2; ctx.stroke(); }
  });
  ctx.restore();
}
const singersAt = t => { let w = null; for (const l of T.lines) { if (t >= l.start - 0.3 && t <= (l.hold || l.end) + 0.2) { w = l.parts[0].who; for (const p of l.parts) if (t >= (l.chars[p.from] ?? l.start) - 0.25) w = p.who; } } return w; };
function grain(ctx, amt = 0.05) { /* film grain is applied by main3 */ }

function memberBG(ctx, t, who, o = {}) {
  const m = MEM[who];
  vgrad(ctx, [[0, o.top || m.deep], [0.65, o.mid || rgba(m.ink, 1)], [1, o.bot || m.deep]]);
  rgrad(ctx, o.gx ?? 1300, o.gy ?? 420, 1100, [[0, rgba(m.light, 0.35)], [1, rgba(m.light, 0)]], 1, 'screen');
}
// split call-and-response: left singer panel, right singer panel slides in when she starts
function split(ctx, t, s, L, R, tR, o = {}) {
  const k = E.inOutExpo(clamp((t - (tR - 0.25)) / 0.45));
  const cut = lerp(W + 200, W * 0.52, k), sk = 140;
  // left
  vgrad(ctx, [[0, MEM[L.who].deep], [1, rgba(MEM[L.who].ink, 1)]]);
  if (o.night) vgrad(ctx, [[0, 'rgba(10,12,40,0.65)'], [1, 'rgba(10,12,40,0.2)']]);
  lattice(ctx, t, rgba(MEM[L.who].light, 1), 0.08, 150, 0.2, t * 6, 0);
  echo(ctx, t, L.key, 520, 470, 1100, MEM[L.who].light, 0.22);
  stand(ctx, t, L.key, L.x ?? 520, L.h ?? 980, { face: true, t0: s.a, rim: MEM[L.who].light, grade: o.grade, gradeA: o.gradeA, flip: L.flip });
  // right panel (diagonal)
  if (k > 0) withMask(ctx, rectPath(cut, -10, W, H + 20, -sk), g => {
    vgrad(g, [[0, MEM[R.who].deep], [1, rgba(MEM[R.who].ink, 1)]]);
    if (o.night) vgrad(g, [[0, 'rgba(10,12,40,0.65)'], [1, 'rgba(10,12,40,0.2)']]);
    lattice(g, t, rgba(MEM[R.who].light, 1), 0.08, 150, -0.2, -t * 6, 0);
    echo(g, t, R.key, 1450, 470, 1100, MEM[R.who].light, 0.22, true);
    stand(g, t, R.key, (R.x ?? 1440) + (1 - k) * 300, R.h ?? 980, { face: true, rim: MEM[R.who].light, rimSide: -1, grade: o.grade, gradeA: o.gradeA, flip: R.flip });
  });
  if (k > 0) { ctx.save(); ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cut + sk, -10); ctx.lineTo(cut - sk, H + 10); ctx.stroke(); ctx.restore(); }
}
// five member panels (line-up)
function lineup(ctx, t, s, keys, o = {}) {
  const n = keys.length, pw = W / n;
  keys.forEach(([who, key], k) => {
    const t0 = s.a + k * (o.stagger ?? 0.12), u = E.outExpo(clamp((t - t0) / 0.6));
    withMask(ctx, rectPath(k * pw, -10 + (1 - u) * (k % 2 ? -H : H), pw + 1, H + 20), g => {
      vgrad(g, [[0, MEM[who].deep], [1, rgba(MEM[who].ink, 1)]]);
      if (o.dawn) vgrad(g, [[0, 'rgba(255,230,200,0.35)'], [1, 'rgba(255,200,160,0)']], 1, 'screen');
      faceAt(g, key, k * pw + pw / 2, 360 + (1 - u) * 30, key === 'to_cos' ? 1400 : 1150, { wrap: { color: MEM[who].light, a: 0.5 } });
    });
    ctx.save(); ctx.fillStyle = 'rgba(242,217,166,0.9)'; ctx.fillRect(k * pw - 1, 0, 2, H); ctx.restore();
  });
}
// cover art inside a big circle "sun" with gold rings
function coverSun(ctx, t, s, cx, cy, R, z, f, o = {}) {
  const u = E.outExpo(clamp((t - s.a) / 0.9));
  const r = R * (0.7 + 0.3 * u) * (1 + pulse(t, 7) * 0.01);
  withMask(ctx, circlePath(cx, cy, r), g => cover(g, IMG.cover, [cx - r, cy - r, r * 2, r * 2], z, f[0], f[1]));
  rings(ctx, cx, cy, [r + 10, r + 26], GOLD, 2, 0.9);
  rings(ctx, cx, cy, [r + 60], GOLD, 1, 0.5, [4, 10]);
}
function heat(ctx, t, a) { embers(ctx, t, 50, 33, { a, speed: 120 }); }

/* ------------------------------------------------------------ transitions */
function trans(ctx, kind, p, drawNext, o = {}) {
  p = clamp(p); if (p <= 0) return;
  if (p >= 1 || kind === 'cut') { drawNext(ctx); return; }
  const [c, g] = buf('tr'); drawNext(g);
  const e = E.inOutCubic(p);
  ctx.save();
  if (kind === 'dissolve') { ctx.globalAlpha = e; ctx.drawImage(c, 0, 0); }
  else if (kind === 'slats') { // five member-colour slats sweep across and reveal the next shot
    const n = 5;
    for (let k = 0; k < n; k++) {
      const pk = E.inOutExpo(clamp(p * 1.6 - k * 0.12)), x = (W / n) * k, w = W / n + 1;
      const y0 = (1 - pk) * (k % 2 ? -H : H);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y0, w, H); ctx.clip(); ctx.drawImage(c, 0, 0); ctx.restore();
      const band = Math.sin(pk * Math.PI);
      ctx.fillStyle = MEM[ORDER[k]].ink; ctx.globalAlpha = band; ctx.fillRect(x, y0 + (k % 2 ? H - 14 : 0), w, 14); ctx.globalAlpha = 1;
    }
  } else if (kind === 'fan') { // folding-fan sweep in the singer's colour
    const col = o.color || '#d0213f', cx = W / 2, cy = H + 220, R = 2300, a0 = Math.PI, span = Math.PI * e;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a0 + span); ctx.closePath(); ctx.save(); ctx.clip(); ctx.drawImage(c, 0, 0); ctx.restore();
    ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0 + span) * R, cy + Math.sin(a0 + span) * R); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.stroke();
  } else if (kind === 'iris') {
    const r = e * 1250; ctx.beginPath(); ctx.arc(o.x ?? 960, o.y ?? 540, r, 0, TAU); ctx.save(); ctx.clip(); ctx.drawImage(c, 0, 0); ctx.restore();
    ctx.strokeStyle = o.color || GOLD; ctx.lineWidth = 4 * (1 - e) + 1; ctx.stroke();
  } else if (kind === 'flash') {
    if (p > 0.45) ctx.drawImage(c, 0, 0);
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.pow(Math.sin(p * Math.PI), 1.4) * (o.amount ?? 0.9); ctx.fillStyle = o.color || '#fff1e0'; ctx.fillRect(0, 0, W, H);
  } else if (kind === 'sheet') { // collage: a new sheet of paper slides over (with shadow)
    const dir = o.dir || 1, x = (1 - E.outCubic(p)) * W * dir;
    ctx.shadowColor = 'rgba(20,10,10,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetX = -10 * dir;
    ctx.translate(x, (1 - E.outCubic(p)) * 40); ctx.rotate((1 - p) * 0.04 * dir); ctx.drawImage(c, 0, 0);
  } else if (kind === 'whip') {
    const [c2, g2] = buf('whip', W / 4, H / 4); const sh = Math.sin(p * Math.PI);
    g2.filter = `blur(${sh * 14}px)`; g2.drawImage(p < 0.5 ? ctx.canvas : c, 0, 0, W / 4, H / 4);
    if (p >= 0.5) ctx.drawImage(c, 0, 0);
    ctx.globalAlpha = sh; ctx.drawImage(c2, (p < 0.5 ? -p : 1 - p) * (o.dir || 1) * W * 0.35, 0, W, H);
  } else { ctx.globalAlpha = e; ctx.drawImage(c, 0, 0); }
  ctx.restore();
}
export function runShots(ctx, t, shots) {
  let i = 0; for (let k = 0; k < shots.length; k++) if (t >= shots[k].a) i = k;
  const s = shots[i], n = shots[i + 1];
  ctx.save(); s.draw(ctx, t, s); ctx.restore();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  if (n && n.tr && n.tr !== 'cut' && n.td) {
    const p = (t - (n.a - n.td)) / n.td;
    if (p > 0 && p < 1) trans(ctx, n.tr, p, g => n.draw(g, t, n), n.tro || {});
  }
  if (s.kick) { const k = Math.exp(-(t - s.a) * 10) * s.kick; if (k > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = k * 0.5; ctx.fillStyle = '#fff1dc'; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
  return s;
}

/* ------------------------------------------------------------ shots */
function sOpen(ctx, t) {
  fill(ctx, '#0a0608');
  const p = E.inOutCubic(inv(0.2, 1.5, t));
  ORDER.forEach((w, k) => {
    const a0 = Math.PI * (1.1 + k * 0.16), a1 = a0 + Math.PI * 0.16 * p;
    ctx.save(); ctx.strokeStyle = MEM[w].ink; ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(960, 760, 360, a0, a1); ctx.stroke(); ctx.restore();
  });
  ctx.save(); ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.globalAlpha = p * 0.8;
  for (let k = 0; k <= 10; k++) { const a = Math.PI * (1.1 + k * 0.08); ctx.beginPath(); ctx.moveTo(960 + Math.cos(a) * 120, 760 + Math.sin(a) * 120); ctx.lineTo(960 + Math.cos(a) * 345 * p, 760 + Math.sin(a) * 345 * p); ctx.stroke(); }
  ctx.restore();
  label(ctx, 'THE IDOLM@STER CINDERELLA GIRLS', 960, 830, { fam: F.cinzel, size: 16, weight: 600, color: IV, track: 0.5, align: 'center', alpha: smooth(0.5, 1.1, t) * 0.85 });
  label(ctx, 'Passion jewelries! 004', 960, 868, { fam: F.corm, size: 26, italic: true, weight: 500, color: GOLD, align: 'center', alpha: smooth(0.7, 1.3, t) });
}
const chantShot = (who, i, side) => (ctx, t, s) => {
  const m = MEM[who], R = side === 'R';
  memberBG(ctx, t, who, { gx: R ? 1350 : 560 });
  lattice(ctx, t, rgba(m.light, 1), 0.07, 170, 0.3, t * 10, 0);
  echo(ctx, t, COS[who], R ? 1300 : 620, 520 + (t - s.a) * -10, 1300, m.light, 0.3, R);
  stand(ctx, t, COS[who], R ? 1380 : 560, 940, { t0: s.a - 0.1, slide: R ? 160 : -160, rim: m.light, rimSide: R ? -1 : 1 });
  chant(ctx, t, i, R ? 620 : 1300, 560, { size: 150, exit: s.b - 0.15 });
};
function oleShot(ctx, t, s) {
  fill(ctx, '#140608');
  ORDER.forEach((w, k) => {
    const t0 = s.a + k * 0.07, u = E.outExpo(clamp((t - t0) / 0.5)), pw = W / 5;
    withMask(ctx, rectPath(k * pw, (1 - u) * (k % 2 ? -H : H), pw + 1, H), g => {
      vgrad(g, [[0, MEM[w].deep], [1, rgba(MEM[w].ink, 1)]]);
      faceAt(g, COS[w], k * pw + pw / 2, 330 + (1 - u) * 40, w === 'to' ? 1500 : 1250, { wrap: { color: MEM[w].light, a: 0.5 } });
    });
    ctx.save(); ctx.fillStyle = GOLD; ctx.globalAlpha = 0.8; ctx.fillRect(k * pw - 1, 0, 2, H); ctx.restore();
  });
  vgrad(ctx, [[0, 'rgba(0,0,0,0)'], [0.5, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.6)']]);
  chant(ctx, t, 3, 960, 560, { size: 260, exit: s.b - 0.2, fill: { grad: ['#fffaf0', '#ffe2b0', '#f2b866'] } });
  embers(ctx, t, 50, 5, { a: smooth(7.8, 8.2, t), speed: 160 });
}
function titleShot(ctx, t, s) {
  vgrad(ctx, [[0, '#1a0508'], [0.6, '#3a0812'], [1, '#12040a']]);
  lattice(ctx, t, GOLD, 0.06, 180, 0, 0, 0);
  rgrad(ctx, 1400, 480, 900, [[0, 'rgba(255,120,80,0.25)'], [1, 'rgba(255,120,80,0)']], 1, 'screen');
  const ap = E.outExpo(inv(9.8, 10.9, t)), ax = 1400, bot = 1000, aw = 600, ah = 860 * ap;
  withMask(ctx, archPath(ax, bot, aw, Math.max(aw * 0.55, ah)), g => cover(g, IMG.cover, [ax - aw / 2, bot - 860, aw, 860], lerp(1.5, 1.4, inv(9.75, 15.9, t)), 0.5, 0.33));
  ctx.save(); ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.globalAlpha = ap; ctx.beginPath(); archPath(ax, bot, aw, Math.max(aw * 0.55, ah))(ctx); ctx.stroke();
  ctx.lineWidth = 1; ctx.beginPath(); archPath(ax, bot + 18, aw + 36, Math.max(aw * 0.55, ah) + 36)(ctx); ctx.stroke(); ctx.restore();
  place(ctx, IMG.obj_d_rose, 1700, 930, 380, { a: smooth(10.3, 10.9, t), rot: -0.3 + t * 0.01, filter: 'blur(3px)' });
  place(ctx, IMG.obj_fi_r7, 1110, 1000, 230, { a: smooth(10.6, 11.2, t), rot: 0.4 });
  petals(ctx, t, 8, 3, { a: 0.9, speed: 50, size: 0.8 });
  const out = 1 - smooth(15.2, 15.9, t);
  label(ctx, 'THE IDOLM@STER CINDERELLA GIRLS', 220, 350, { fam: F.cinzel, size: 16, weight: 600, color: IV, track: 0.5, alpha: smooth(10.1, 10.7, t) * out * 0.85 });
  drawText(ctx, t, '熱情エナモラル', { x: 220, y: 460, size: 104, fontStr: font(F.mincho, 104, 800), fill: IV, glow: 'rgba(255,170,90,0.3)', glowBlur: 18, track: 0.06, anim: 'blur', start: 10.1, stagger: 0.09, dur: 0.7, exit: 15.3, exitDur: 0.6, shadow: 'rgba(0,0,0,0.5)' });
  drawText(ctx, t, 'Enamorar', { x: 520, y: 590, size: 120, fontStr: font(F.script, 120, 400), fill: GOLD, glow: 'rgba(255,170,90,0.5)', glowBlur: 22, anim: 'ink', start: 11.0, stagger: 0.08, dur: 0.35, exit: 15.3, exitDur: 0.6 });
  ORDER.forEach((w, k) => {
    const a = smooth(12.0 + k * 0.15, 12.5 + k * 0.15, t) * out;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = MEM[w].ink; ctx.fillRect(220 + k * 136, 680, 120, 3); ctx.restore();
    label(ctx, MEM[w].jp, 220 + k * 136, 712, { size: 20, weight: 700, color: IV, track: 0.1, alpha: a });
  });
}
// A1 night
function nightBG(ctx, t, warm = 0) {
  vgrad(ctx, [[0, '#04061a'], [0.55, '#0e1440'], [1, warm > 0 ? `rgba(${lerp(40, 120, warm) | 0},${lerp(30, 30, warm) | 0},${lerp(80, 60, warm) | 0},1)` : '#281e52']]);
  stars(ctx, t, 140, 11, [0, 0, W, 700], 0.9);
  ink(ctx, IMG.ht_v1_stars, '#9fb4ff', [0, 0, W, H], 1.1, 0.5, 0.4, 0.12, 'screen');
}
function tomoeNight(ctx, t, s) {
  nightBG(ctx, t);
  place(ctx, IMG.obj_v2_crescent, 1240, 230, 260, { a: smooth(s.a, s.a + 1, t), rot: -0.2 });
  glow(ctx, 1240, 230, 380, '#c8d4ff', 0.35);
  echo(ctx, t, 'to_cos', 520, 500, 1250, '#2a3c90', 0.5);
  stand(ctx, t, 'to_cos', 560, 900, { t0: s.a, rim: MEM.to.ink, rimA: 0.55, grade: '#3040a0', gradeA: 0.32 });
  const k = smooth(Ls(5) - 0.3, Ls(5) + 0.6, t);
  // "重なる手と手": two warm lights drift together
  for (const sd of [-1, 1]) glow(ctx, 1000 + sd * lerp(220, 26, E.inOutSine(inv(Ls(5) + 1.5, 23.2, t))), 600, 90, sd < 0 ? '#ffb070' : '#ff8a5a', k * 0.8);
}
function riamuNight(ctx, t, s) {
  const warm = smooth(Ls(7) - 0.3, 29.8, t);
  nightBG(ctx, t, warm);
  rgrad(ctx, 600, 700, 900, [[0, rgba('#1fb8b8', 0.35 * (1 - warm))], [1, 'rgba(0,0,0,0)']], 1, 'screen');
  rgrad(ctx, 960, 1000, 1100, [[0, `rgba(255,120,60,${0.55 * warm})`], [1, 'rgba(255,90,40,0)']], 1, 'screen');
  echo(ctx, t, 'ri_cos', 560, 520, 1250, warm > 0.5 ? '#a0283c' : '#1d6f8a', 0.45);
  stand(ctx, t, 'ri_cos', 600, 900, { t0: s.a, rim: lerp(0, 1, warm) > 0.5 ? '#ff9a5a' : MEM.ri.light, grade: warm > 0.5 ? '#ff7040' : '#2a6aa0', gradeA: 0.25, gradeOp: warm > 0.5 ? 'soft-light' : 'multiply' });
  place(ctx, IMG.obj_slim_candle, 1180, 860, 360, { a: warm });
  glow(ctx, 1180, 710, 260, '#ffb060', warm * 0.8);
  embers(ctx, t, 20, 7, { a: warm * 0.7, speed: 50 });
}
// B1 collage vanity (Shin)
function vanity(ctx, t, s) {
  const ts = step(t);
  paper(ctx, 'paper_cream');
  dots(ctx, rgba(MEM.shi.ink, 0.5), 26, (x, y) => (x / W) * 0.6 - 0.1, 0.5, [1100, 0, 820, H]);
  const b = (sd) => boil(t, sd);
  const p1 = slap(t, s.a), p2 = slap(t, s.a + 0.25), p3 = slap(t, s.a + 0.5), p4 = slap(t, Ls(9) - 0.2);
  place(ctx, IMG.obj_fi_r7, 1500 + b(1)[0], 260 + b(1)[1], 330 * p1.s, { a: p1.a, rot: -0.4 + p1.r + b(1)[2] });
  piece(ctx, 640 + b(2)[0], 420 + b(2)[1], 620 * p2.s, 440 * p2.s, { img: IMG.photo_b1_letter, z: 1.4, fx: 0.42, fy: 0.42, rot: -0.06 + p2.r, seed: 7, a: p2.a, filter: 'sepia(0.35) contrast(1.05)' });
  tape(ctx, 420, 220, 160, -0.5, undefined, p2.a); tape(ctx, 900, 640, 150, 0.4, undefined, p2.a);
  place(ctx, IMG.obj_b1_lipstick, 1020 + b(3)[0], 560 + b(3)[1], 520 * p3.s, { a: p3.a, rot: 0.55 + p3.r });
  // kiss print doodle + handwriting
  doodle(ctx, 'heart', 300, 760, 2.2, clamp((t - Ls(8) - 0.6) / 0.6), MEM.shi.ink, 5);
  scribble(ctx, t, Ls(9) - 0.1, 'à la madame…', 250, 640, 54, '#7a1f3a', -0.08, 1.0);
  const st = IMG.shi_cos;
  sticker(ctx, st, 1480 + b(4)[0], 650 + b(4)[1], 820 * p4.s, { a: p4.a, rot: 0.04 + p4.r });
  tape(ctx, 1480, 260, 180, 0.15, 'rgba(255,170,200,0.7)', p4.a);
}
function deepRed(ctx, t, s) { // 纏う深紅 (Yoshino) — red velvet sheet with her card torn in
  paper(ctx, 'paper_red');
  ink(ctx, IMG.ht_b1_curtain, '#5a0614', [0, 0, W, H], 1.1, 0.5, 0.5, 0.65, 'multiply');
  const p = slap(t, s.a + 0.05);
  piece(ctx, 820, 520, 980 * p.s, 640 * p.s, { img: IMG.card_yo, z: 1.55, fx: 0.62, fy: 0.42, rot: -0.04 + p.r, seed: 21, a: p.a });
  place(ctx, IMG.obj_d_rose, 330, 860, 430, { a: slap(t, s.a + 0.3).a, rot: 0.2 });
  tape(ctx, 420, 230, 170, -0.4, 'rgba(250,236,210,0.8)', p.a);
}
function navyEve(ctx, t, s) { // 濃紺の宵に靡いてく
  paper(ctx, 'paper_navy');
  stars(ctx, t, 60, 41, [0, 0, W, 600], 0.7);
  const u = E.outCubic(clamp((step(t) - s.a) / 0.5));
  piece(ctx, 960 + (1 - u) * -900, 470, 1500, 560, { img: IMG.card_yo, z: 1.25, fx: 0.42, fy: 0.55, rot: 0.03, seed: 33, paper: '#e8e2f0' });
  doodle(ctx, 'star', 1500, 170, 2.0, clamp((t - s.a - 0.5) / 0.5), GOLD, 4);
  doodle(ctx, 'star', 1640, 240, 1.2, clamp((t - s.a - 0.7) / 0.5), GOLD, 3);
  scribble(ctx, t, s.a + 0.6, 'noche azul', 1390, 330, 56, '#e8d8b8', -0.06, 0.8);
}
// P1
function nagiMirror(ctx, t, s) {
  vgrad(ctx, [[0, '#1a0e06'], [0.7, '#3a2208'], [1, '#120804']]);
  lattice(ctx, t, GOLD, 0.05, 160, 0, 0, 0);
  rgrad(ctx, 1350, 500, 800, [[0, 'rgba(255,190,90,0.35)'], [1, 'rgba(0,0,0,0)']], 1, 'screen');
  const mp = E.inOutSine(inv(s.a, s.a + 1.6, t));
  ctx.save(); ctx.globalAlpha = mp; ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(960, 80); ctx.lineTo(960, 1000); ctx.stroke(); ctx.restore();
  echo(ctx, t, 'na_cos', 560 - (1 - mp) * 120, 560, 1150, MEM.na.ink, 0.55 * mp, true);
  stand(ctx, t, 'na_cos', 1380, 960, { t0: s.a, rim: MEM.na.light, rimSide: -1, glow: '#ffb040', glowA: 0.25 });
}
function warmUp(ctx, t, s) { // ほら今すぐに あたためて — all five lights gather on a single candle
  const p = inv(s.a, 48.46, t);
  vgrad(ctx, [[0, `rgb(${lerp(20, 120, p) | 0},${lerp(8, 18, p) | 0},${lerp(14, 20, p) | 0})`], [1, `rgb(${lerp(40, 230, p) | 0},${lerp(10, 80, p) | 0},${lerp(20, 30, p) | 0})`]]);
  sunburst(ctx, 960, 620, t * (0.05 + p * 0.4), 32, 'rgba(255,190,120,0.08)', 'rgba(255,190,120,0)', smooth(45.0, 47.5, t));
  ORDER.forEach((w, k) => {
    const x = lerp(260 + k * 350, 960, E.inOutCubic(inv(45.5, 48.2, t)));
    const a = smooth(s.a + 0.2 + k * 0.35, s.a + 0.7 + k * 0.35, t);
    lgrad(ctx, x - 90, 0, x + 90, 0, [[0, 'rgba(0,0,0,0)'], [0.5, rgba(MEM[w].ink, 0.55)], [1, 'rgba(0,0,0,0)']], a, 'screen');
  });
  place(ctx, IMG.obj_fi_candle, 960, 900, 420, { a: 1 });
  glow(ctx, 960, 760, 300 + p * 500, '#ffb060', 0.6 + p * 0.4);
  heat(ctx, t, 0.3 + p * 0.7);
  fill(ctx, '#fff3e0', Math.pow(smooth(47.7, 48.46, t), 2) * 0.85, 'screen');
}
// C1
function chorusSun(ctx, t, s, o = {}) {
  const cx = o.cx ?? 1300, cy = o.cy ?? 520;
  vgrad(ctx, [[0, o.top || '#5a0612'], [0.6, o.c1 || '#a8102a'], [1, o.bot || '#3a040c']]);
  sunburst(ctx, cx, cy, t * 0.04, 48, 'rgba(255,200,140,0.07)', 'rgba(255,200,140,0)');
  rgrad(ctx, cx, cy, 1100, [[0, rgba(o.c2 || '#ffb060', 0.55)], [0.5, rgba(o.c2 || '#ffb060', 0.12)], [1, 'rgba(0,0,0,0)']], 1, 'screen');
  lattice(ctx, t, GOLD, 0.05, 170, 0, 0, 0);
  coverSun(ctx, t, s, cx, cy, o.R ?? 400, o.z ?? 1.45, o.f || [0.47, 0.35]);
  petals(ctx, t, 16, 9, { a: 0.9, speed: 110, wind: 80 });
  heat(ctx, t, 0.7);
}
function slats3(ctx, t, s, whos) {
  fill(ctx, '#1a0507');
  const n = whos.length, pw = W / n;
  whos.forEach((w, k) => {
    const dir = k % 2 ? -1 : 1, off = ((t - s.a) * 22 * dir);
    withMask(ctx, rectPath(k * pw + 14, 40, pw - 28, H - 80), g => {
      cover(g, IMG.cover, [k * pw, -60 + off, pw, H + 120], 2.4, FACE[w][0], FACE[w][1] + 0.04);
      vgrad(g, [[0, 'rgba(0,0,0,0)'], [1, rgba(MEM[w].deep, 0.7)]]);
    });
    ctx.save(); ctx.strokeStyle = MEM[w].ink; ctx.lineWidth = 4; ctx.strokeRect(k * pw + 14, 40, pw - 28, H - 80); ctx.restore();
  });
  embers(ctx, t, 40, 15, { a: 0.8, speed: 140 });
}
function nagiCardDance(ctx, t, s) {
  cover(ctx, IMG.card_na, [0, 0, W, H], lerp(1.12, 1.24, inv(s.a, s.b, t)), 0.55, 0.4);
  vgrad(ctx, [[0, 'rgba(0,0,0,0)'], [0.7, 'rgba(60,8,8,0.2)'], [1, 'rgba(40,4,8,0.6)']]);
  petals(ctx, t, 18, 21, { a: 1, speed: 120, wind: 140 });
  leak(ctx, t, '#ff9a50', 1500, 200, 700, 0.35);
}
function shinFire(ctx, t, s) {
  vgrad(ctx, [[0, '#2a0414'], [1, '#6a0a2a']]);
  ink(ctx, IMG.ink_c1_blaze, '#ff6a2a', [0, 200, W, 880], 1.1, 0.5, 0.6, 0.9, 'screen');
  ink(ctx, IMG.ht_ch_fire, '#ffb050', [0, 380, W, 700], 1.2, 0.5, 0.5, 0.35, 'screen');
  echo(ctx, t, 'shi_cos', 960, 500, 1250, MEM.shi.ink, 0.35);
  stand(ctx, t, 'shi_cos', 960, 980, { t0: s.a, glow: '#ff5c9d', glowA: 0.5, rim: '#ffb070' });
  place(ctx, IMG.obj_fi_r3, 230, 980, 420, { rot: 0.3, a: smooth(s.a, s.a + 0.5, t) });
  place(ctx, IMG.obj_d_rose, 1720, 1000, 460, { rot: -0.2, a: smooth(s.a + 0.2, s.a + 0.7, t) });
  heat(ctx, t, 1);
}
function coverFull(ctx, t, s, z0, z1, f, tintC) {
  cover(ctx, IMG.cover, [0, 0, W, H], lerp(z0, z1, E.inOutSine(inv(s.a, s.b, t))), f[0], f[1]);
  if (tintC) fill(ctx, tintC, 0.25, 'soft-light');
  vgrad(ctx, [[0, 'rgba(0,0,0,0.05)'], [0.7, 'rgba(0,0,0,0.05)'], [1, 'rgba(30,4,8,0.55)']]);
}
// Interlude + verse 2 collage (summer memories)
function guitarChibis(ctx, t, s) {
  paper(ctx, 'paper_kraft');
  const ts = step(t);
  place(ctx, IMG.obj_c2_guitar, 960, 640, 640, { rot: -0.18 });
  const chib = ['c_yo', 'c_na', 'c_shi', 'c_to', 'c_ri'];
  chib.forEach((k, j) => {
    const t0 = 69.95 + j * T.bar * 0.75, p = slap(t, t0);
    const hop = Math.abs(Math.sin((beatF(ts) + j * 0.5) * Math.PI)) * 22;
    sticker(ctx, IMG[k], 290 + j * 335, 330 - hop + (j % 2) * 50, 400 * p.s, { a: p.a, rot: (j % 2 ? 0.08 : -0.08) + p.r });
  });
  scribble(ctx, t, 70.6, '¡olé! ♪', 1500, 860, 80, '#7a1f2a', -0.1, 0.9);
  doodle(ctx, 'swoosh', 520, 940, 4, clamp((t - 71.2) / 0.6), '#7a1f2a', 5);
  tape(ctx, 200, 120, 200, -0.3, undefined, 1); tape(ctx, 1750, 1000, 200, 0.4, undefined, 1);
}
function seaMemory(ctx, t, s) {
  paper(ctx, 'paper_cream');
  const b = sd => boil(t, sd);
  const p1 = slap(t, s.a), p2 = slap(t, s.a + 0.3), p3 = slap(t, Ls(24) - 0.2);
  polaroid(ctx, IMG.photo_v2_moonbeach, 640 + b(1)[0], 470 + b(1)[1], 640 * p1.s, { a: p1.a, rot: -0.07 + p1.r, z: 1.3, fx: 0.55, fy: 0.5, caption: 'summer night', filter: 'brightness(1.7) contrast(1.05) saturate(1.2)' });
  tape(ctx, 640, 90, 170, 0.05, undefined, p1.a);
  sticker(ctx, IMG.na_casual, 1400 + b(2)[0], 600 + b(2)[1], 820 * p2.s, { a: p2.a, rot: 0.05 + p2.r });
  // far away, laughing voices: tiny swimsuit chibis on a strip of beach
  piece(ctx, 1230, 150, 1100 * p3.s, 200 * p3.s, { img: IMG.photo_fi_sail, z: 1.6, fx: 0.5, fy: 0.62, rot: 0.015, seed: 55, a: p3.a });
  ['c_shi_swim', 'c_to_white', 'c_ri_resort'].forEach((k, j) => {
    const hop = Math.abs(Math.sin((beatF(step(t)) + j * 0.33) * Math.PI)) * 12;
    sticker(ctx, IMG[k], 1020 + j * 170, 150 - hop, 150, { a: p3.a, rot: (j - 1) * 0.08, shadow: 0.25, lift: 0.5 });
  });
  scribble(ctx, t, Ls(24) + 0.6, 'ha ha ♪', 1560, 110, 44, '#3a5aa0', -0.05, 0.6);
}
function earrings(ctx, t, s) {
  paper(ctx, 'paper_peach');
  const b = sd => boil(t, sd);
  const p1 = slap(t, s.a), p2 = slap(t, s.a + 0.3), p3 = slap(t, Ls(26) - 0.2);
  polaroid(ctx, IMG.photo_br_palms, 1350 + b(1)[0], 430 + b(1)[1], 600 * p1.s, { a: p1.a, rot: 0.06 + p1.r, z: 1.2, caption: 'la playa' });
  sticker(ctx, IMG.yo_swim, 560 + b(2)[0], 600 + b(2)[1], 820 * p2.s, { a: p2.a, rot: -0.04 + p2.r });
  // matching earrings swinging in the wind
  for (const [x, y, ph] of [[940, 230, 0], [1040, 270, 0.7]]) {
    const ang = Math.sin(t * 3 + ph) * 0.35;
    ctx.save(); ctx.globalAlpha = p1.a; ctx.translate(x, y); ctx.rotate(ang); ctx.strokeStyle = '#b08a3a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 50); ctx.stroke();
    ctx.fillStyle = MEM.yo.ink; ctx.beginPath(); ctx.moveTo(0, 50); ctx.lineTo(13, 72); ctx.lineTo(0, 94); ctx.lineTo(-13, 72); ctx.closePath(); ctx.fill();
    ctx.restore(); sparkle(ctx, x + Math.sin(ang) * -72, y + 72, 0.6, p1.a);
  }
  // じゃれる: two chibis playing
  if (p3.a) {
    const ts = step(t), bob = k => Math.abs(Math.sin((beatF(ts) + k) * Math.PI)) * 26;
    sticker(ctx, IMG.c_yo_swim, 960, 640 - bob(0), 280 * p3.s, { rot: -0.12 + Math.sin(ts * 6) * 0.06 });
    sticker(ctx, IMG.c_na_casual, 1140, 650 - bob(0.5), 280 * p3.s, { rot: 0.12 - Math.sin(ts * 6) * 0.06 });
    doodle(ctx, 'heart', 1050, 470, 1.6, clamp((t - Ls(26) - 0.2) / 0.5), MEM.yo.ink, 4);
  }
}
// B2
function tomoeKiss(ctx, t, s) {
  vgrad(ctx, [[0, '#2a1030'], [0.6, '#6a2a50'], [1, '#2a0c20']]);
  bokeh(ctx, t, 18, 61, ['#ffb0c8', '#ffd0a0', '#e8a0ff'], 1, 1.1);
  echo(ctx, t, 'to_white', 640, 520, 1150, '#ff9ab8', 0.25);
  stand(ctx, t, 'to_white', 640, 920, { t0: s.a, rim: '#ffc0d0', glow: '#ff9ab8', glowA: 0.35 });
  place(ctx, IMG.obj_fi_r3, 1700, 940, 520, { filter: 'blur(6px)', a: 0.9, rot: 0.2 });
  petals(ctx, t, 14, 63, { a: 0.9, speed: 45, wind: 25, size: 0.9 });
}
function shinAway(ctx, t, s) {
  vgrad(ctx, [[0, '#120818'], [1, '#2a1030']]);
  // a corridor of arches receding ("take me away")
  for (let k = 7; k >= 0; k--) {
    const d = ((k + (t - s.a) * 0.35) % 8) / 8, sc = lerp(1.6, 0.18, d), a = (1 - d) * smooth(0, 0.15, d);
    const w = 900 * sc, hh = 1250 * sc;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5 * sc + 0.5; ctx.beginPath(); archPath(760, 540 + hh * 0.42, w, hh)(ctx); ctx.stroke(); ctx.restore();
  }
  glow(ctx, 760, 520, 260, '#ffd8a0', 0.6);
  stand(ctx, t, 'shi_swim', 1450, 1000, { t0: s.a, drop: -0.02, rim: MEM.shi.light, rimSide: -1, glow: MEM.shi.ink, glowA: 0.3 });
}
// P2
function riamuBells(ctx, t, s) {
  vgrad(ctx, [[0, '#1a1036'], [0.7, '#3a2050'], [1, '#160c24']]);
  stars(ctx, t, 60, 71, [0, 0, W, 500], 0.6);
  const hits = []; for (let k = Math.ceil(beatF(s.a) / 2) * 2; beatT(k) < 106.3; k += 2) hits.push(beatT(k));
  hits.forEach(h => { const u = (t - h) / 2.4; if (u > 0 && u < 1) rings(ctx, 470, 560, [E.outCubic(u) * 1300], GOLD, 2 * (1 - u) + 0.5, 1 - u); });
  place(ctx, tinted(IMG.obj_p2_bells, '#0c0818'), 470, 780, 640, { a: 1 });
  echo(ctx, t, 'ri_cos', 1360, 520, 1150, MEM.ri.ink, 0.3, true);
  stand(ctx, t, 'ri_cos', 1380, 920, { t0: s.a, rim: MEM.ri.light, rimSide: -1, grade: '#4a3080', gradeA: 0.2 });
}
function silence(ctx, t, s) {
  const p = inv(s.a, 112.33, t);
  fill(ctx, '#07050c');
  stars(ctx, t, 80, 81, [0, 0, W, H], 0.4 * (1 - smooth(110, 112, t)));
  const q = E.inOutSine(inv(s.a + 0.4, 110.4, t));
  for (const sd of [-1, 1]) { glow(ctx, 960 + sd * lerp(420, 30, q), 520, 120, sd < 0 ? '#ffd0a0' : '#ffb0d0', 0.9); sparkle(ctx, 960 + sd * lerp(420, 30, q), 520, 0.8, 1); }
  ORDER.forEach((w, k) => lgrad(ctx, 0, 0, W, 0, [[0, 'rgba(0,0,0,0)'], [(k + 0.5) / 5, rgba(MEM[w].ink, 0.5)], [1, 'rgba(0,0,0,0)']], smooth(110.4 + k * 0.25, 111.4 + k * 0.25, t), 'screen'));
  fill(ctx, '#fff0ff', Math.pow(smooth(111.7, 112.33, t), 2) * 0.85, 'screen');
}
// C2 midnight
function morningStar(ctx, t, s) {
  cover(ctx, IMG.card_na, [0, 0, W, H], lerp(1.25, 1.12, inv(s.a, s.b, t)), 0.45, 0.4);
  vgrad(ctx, [[0, 'rgba(20,10,60,0.35)'], [0.6, 'rgba(20,10,60,0.05)'], [1, 'rgba(10,6,30,0.6)']]);
  sparkle(ctx, 1640, 150, 2.6 + pulse(t, 4) * 0.4, 1);
  glow(ctx, 1640, 150, 260, '#e8d8ff', 0.6);
  embers(ctx, t, 30, 91, { a: 0.6, speed: 90 });
}
function moonWish(ctx, t, s) {
  vgrad(ctx, [[0, '#05040e'], [0.7, '#141038'], [1, '#2a1838']]);
  stars(ctx, t, 120, 93, [0, 0, W, H], 0.7);
  const u = E.inOutSine(inv(s.a, s.b, t));
  place(ctx, IMG.obj_c2_moon, 1380, lerp(260, 470, u), 560, { a: 1 });
  glow(ctx, 1380, lerp(260, 470, u), 520, '#ffd8a0', 0.3);
  const ax = 560, bot = 1000, aw = 560, ah = 820;
  withMask(ctx, archPath(ax, bot, aw, ah), g => { cover(g, IMG.cover, [ax - aw / 2, bot - ah, aw, ah], 1.45, 0.48, 0.34); vgrad(g, [[0, 'rgba(20,10,60,0.35)'], [1, 'rgba(10,6,30,0.5)']]); });
  ctx.save(); ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); archPath(ax, bot, aw, ah)(ctx); ctx.stroke(); ctx.restore();
  lattice(ctx, t, GOLD, 0.06, 140, 0, 0, 0);
}
function timeTicks(ctx, t, s) {
  vgrad(ctx, [[0, '#0a0818'], [1, '#1c1430']]);
  const k = Math.floor(beatF(t)), fr = E.outExpo(clamp((beatF(t) - k) * 3)), rot = (k + fr) * (TAU / 24);
  place(ctx, IMG.obj_ou_astrolabe, 960, 560, 860, { rot: rot * 0.25, a: 1 });
  rings(ctx, 960, 560, [470, 500], GOLD, 1.2, 0.6);
  for (let j = 0; j < 60; j++) { const a = (j / 60) * TAU - rot; ctx.save(); ctx.strokeStyle = GOLD; ctx.globalAlpha = 0.5; ctx.lineWidth = j % 5 ? 1 : 3; ctx.beginPath(); ctx.moveTo(960 + Math.cos(a) * 520, 560 + Math.sin(a) * 520); ctx.lineTo(960 + Math.cos(a) * (j % 5 ? 540 : 560), 560 + Math.sin(a) * (j % 5 ? 540 : 560)); ctx.stroke(); ctx.restore(); }
  ORDER.forEach((w, j) => { const a = (j / 5) * TAU + t * 0.3; withMask(ctx, circlePath(960 + Math.cos(a) * 700, 560 + Math.sin(a) * 380, 90), g => cover(g, IMG.cover, [960 + Math.cos(a) * 700 - 90, 560 + Math.sin(a) * 380 - 90, 180, 180], 4.2, FACE[w][0], FACE[w][1])); rings(ctx, 960 + Math.cos(a) * 700, 560 + Math.sin(a) * 380, [94], MEM[w].ink, 4, 1); });
}
function bubbles(ctx, t, s) {
  cover(ctx, IMG.card_yo, [0, 0, W, H], lerp(1.15, 1.06, inv(s.a, s.b, t)), 0.55, 0.42);
  vgrad(ctx, [[0, 'rgba(30,10,50,0.3)'], [1, 'rgba(20,6,30,0.5)']]);
  for (let i = 0; i < 9; i++) {
    const sp = 60 + hash(i, 5) * 60, life = (H + 400) / sp, ph = hash(i, 6) * life, u = ((t + ph) % life) / life;
    const x = 200 + hash(i, 7) * 1500 + Math.sin(t + i) * 30, y = H + 200 - u * (H + 400), r = 50 + hash(i, 8) * 110;
    withMask(ctx, circlePath(x, y, r), g => cover(g, IMG.card_yo, [x - r, y - r, r * 2, r * 2], 3.2, 0.62, 0.3));
    const ir = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    ir.addColorStop(0, '#ffd0f0'); ir.addColorStop(0.4, '#b0e0ff'); ir.addColorStop(0.75, '#fff2b0'); ir.addColorStop(1, '#ff9ad0');
    ctx.save(); ctx.strokeStyle = ir; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r * 0.85, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke(); ctx.restore();
  }
}
function guitarGold(ctx, t, s) {
  vgrad(ctx, [[0, '#0e0806'], [1, '#2a1408']]);
  glow(ctx, 900, 560, 700, '#ffb060', 0.35);
  place(ctx, IMG.obj_c2_guitar, 1180, 800, 460, { rot: -0.12 + (t - s.a) * 0.01 });
  embers(ctx, t, 30, 101, { a: 0.6, speed: 60 });
}
// dance break
function danceWall(ctx, t, s) {
  fill(ctx, '#080304');
  const src = IMG.photo_d_tile;
  ctx.save(); ctx.globalAlpha = 1;
  for (let k = 0; k < 8; k++) { // kaleidoscopic tile wall
    const wedge = TAU / 8; ctx.save(); ctx.translate(960, 620); ctx.rotate(t * 0.05 + k * wedge); if (k % 2) ctx.scale(1, -1);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1400, -wedge / 2 - 0.004, wedge / 2 + 0.004); ctx.closePath(); ctx.clip();
    const sc = 1400 / src.width * 1.3; ctx.drawImage(src, 0, -src.height * sc / 2, src.width * sc, src.height * sc); ctx.restore();
  }
  ctx.restore();
  fill(ctx, '#ff8a40', 0.35, 'soft-light');
  rgrad(ctx, 960, 1150, 1300, [[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0.92)']]);
  const sway = Math.sin((t - 133.62) * Math.PI / T.beat / 4) * 0.035, fl = 0.85 + 0.15 * noise1(t * 5, 9);
  const img = PLAIN('na_cos');
  ctx.save(); ctx.filter = 'blur(14px)'; ctx.globalAlpha = 0.7 * fl; place(ctx, tinted(img, '#0a0204'), 1260, 470, 1650, { rot: sway * 1.8 }); ctx.restore();
  ink(ctx, IMG.ink_c1_blaze, '#ff7a2a', [0, 620, W, 460], 1.05, 0.5, 0.7, 0.85, 'screen');
  stand(ctx, t, 'na_cos', 860, 980, { t0: s.a, glow: '#ff7a3c', glowA: 0.45, rim: '#ffb070', rot: sway * 0.3 });
  embers(ctx, t, 40, 41, { a: 0.85, speed: 130 });
}
const rollCall = (who, key) => (ctx, t, s) => {
  const m = MEM[who], u = t - s.a;
  memberBG(ctx, t, who, { gx: 1300 });
  // giant outlined name scrolling behind
  ctx.save(); ctx.font = font(F.anton, 420, 400); ctx.textBaseline = 'middle'; ctx.strokeStyle = rgba(m.light, 0.5); ctx.lineWidth = 3;
  const nw = ctx.measureText(m.name + ' ').width;
  for (let x = -((u * 260) % nw); x < W; x += nw) ctx.strokeText(m.name + ' ', x, 560);
  ctx.restore();
  echo(ctx, t, key, 1250, 520, 1300, m.light, 0.3);
  stand(ctx, t, key, 1250, 980, { t0: s.a, slide: 200, inDur: 0.45, rim: m.light, rimSide: -1 });
  const p = E.outExpo(clamp(u / 0.5));
  label(ctx, m.name, 160 - (1 - p) * 200, 760, { fam: F.anton, size: 120, color: IV, track: 0.06, alpha: p });
  label(ctx, `${m.jp}　CV.${m.cv}`, 166, 850, { size: 30, weight: 700, color: IV, track: 0.12, alpha: smooth(s.a + 0.2, s.a + 0.6, t) });
  const ck = { yo: 'c_yo', na: 'c_na', shi: 'c_shi', to: 'c_to', ri: 'c_ri' }[who];
  const hop = Math.abs(Math.sin(beatF(t) * Math.PI)) * 24;
  if (IMG[ck + '_plain']) place(ctx, IMG[ck + '_plain'], 260, 500 - hop, 300, { a: p, rot: Math.sin(beatF(t) * Math.PI) * 0.06 });
};
function chibiStage(ctx, t, s) {
  vgrad(ctx, [[0, '#0c0610'], [1, '#2a0c14']]);
  ORDER.forEach((w, k) => {
    const x = 260 + k * 350, on = Math.floor(beatF(t)) % 5 === k;
    lgrad(ctx, x - 160, 0, x + 160, 0, [[0, 'rgba(0,0,0,0)'], [0.5, rgba(MEM[w].ink, on ? 0.6 : 0.3)], [1, 'rgba(0,0,0,0)']], 1, 'screen');
    const hop = Math.abs(Math.sin((beatF(t) + k * 0.5) * Math.PI)) * 40;
    const img = IMG['c_' + w + '_plain'];
    if (img) character(ctx, img, x, 700 - hop, 420, { shadow: { dx: 0, dy: 30, blur: 18, a: 0.5 } });
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, 925, 110 - hop, 16, 0, 0, TAU); ctx.fill(); ctx.restore();
  });
  ctx.save(); ctx.fillStyle = '#1a0a08'; ctx.fillRect(0, 920, W, 160); ctx.restore();
  dots(ctx, 'rgba(255,200,120,0.25)', 22, (x, y) => (y - 900) / 200, 1, [0, 920, W, 160]);
  embers(ctx, t, 40, 51, { a: 0.7, speed: 120, color: '#ffd080' });
  drawText(ctx, t, '¡BAILE!', { x: 960, y: 190, align: 'center', size: 150, fontStr: font(F.anton, 150, 400), fill: GOLD, track: 0.1, anim: 'zoom', start: s.a + 0.2, stagger: 0.08, dur: 0.35 });
}
function buildCuts(ctx, t, s) {
  const k = Math.floor((t - barT(82) + 0.01) / (T.bar / 2)), w = ORDER[k % 5];
  memberBG(ctx, t, w, { gx: 960 });
  sunburst(ctx, 960, 540, t * 0.3, 48, rgba(MEM[w].light, 0.06), 'rgba(0,0,0,0)');
  lattice(ctx, t, rgba(MEM[w].light, 1), 0.08, 160, t * 0.1, 0, 0);
  withMask(ctx, circlePath(960, 540, 400 + (t - s.a) * 6), g => cover(g, IMG.cover, [560, 140, 800, 800], 2.6, FACE[w][0], FACE[w][1]));
  rings(ctx, 960, 540, [410 + (t - s.a) * 6], GOLD, 3, 1);
  fill(ctx, '#fff3e0', Math.pow(smooth(165.6, 166.53, t), 2) * 0.9, 'screen');
}
// bridge — dawn
function dawnBG(ctx, t, p = 0) {
  vgrad(ctx, [[0, lerpC('#4a3a7a', '#7a5a9a', p)], [0.45, lerpC('#e08a8a', '#f4a88a', p)], [0.62, lerpC('#ffd0a0', '#ffe2b8', p)], [0.63, '#f2b89a'], [1, '#5a3048']]);
  glow(ctx, 960, lerp(700, 600, p), 900, '#fff0d0', 0.7);
  ctx.save(); ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(960, lerp(700, 600, p), 80, 0, TAU); ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let k = 0; k < 40; k++) { const y = 690 + Math.pow(k / 40, 1.6) * 390, w = 30 + k * 18; ctx.globalAlpha = 0.25 * (0.6 + 0.4 * Math.sin(t * 2 + k)); ctx.fillStyle = '#fff2d8'; ctx.fillRect(960 - w / 2 + Math.sin(t + k) * 20, y, w, 2 + k * 0.08); }
  ctx.restore();
}
function lerpC(a, b, t) { const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; const x = p(a), y = p(b); return `rgb(${lerp(x[0], y[0], t) | 0},${lerp(x[1], y[1], t) | 0},${lerp(x[2], y[2], t) | 0})`; }
function profiles(ctx, t, s) {
  dawnBG(ctx, t, inv(166.5, 190, t));
  stand(ctx, t, 'na_casual', 520, 900, { t0: s.a + 0.2, rim: '#ffe0b0', rimSide: 1, grade: '#ffb080', gradeA: 0.18, gradeOp: 'soft-light' });
  stand(ctx, t, 'yo_cos', 1430, 900, { t0: Ls(41) - 0.2, flip: true, rim: '#ffe0b0', rimSide: -1, grade: '#ffb080', gradeA: 0.18, gradeOp: 'soft-light' });
}
function cufflink(ctx, t, s) {
  dawnBG(ctx, t, inv(166.5, 190, t));
  const img = PLAIN('yo_cos');
  character(ctx, img, 1150, 560, 1600, { wrap: { color: '#ffe0b0', a: 0.6, side: -1 }, shadow: { dx: 20, dy: 10, blur: 30, a: 0.35 } });
  const gx = 1090, gy = 640;
  ctx.save(); const gr = ctx.createRadialGradient(gx - 6, gy - 6, 2, gx, gy, 26); gr.addColorStop(0, '#fff6d0'); gr.addColorStop(0.6, '#e2b25a'); gr.addColorStop(1, '#8a5a18');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(gx, gy, 24, 0, TAU); ctx.fill(); ctx.restore();
  sparkle(ctx, gx + 6, gy - 8, 1.2 + 0.3 * Math.sin(t * 5), smooth(Ls(42) + 1, Ls(42) + 1.6, t));
}
function mist(ctx, t, s) {
  vgrad(ctx, [[0, '#cbb8e0'], [0.6, '#f0d0d8'], [1, '#f8e0d0']]);
  for (let k = 0; k < 6; k++) glow(ctx, ((k * 400 + t * 30) % 2400) - 240, 600 + Math.sin(k) * 200, 500, '#ffffff', 0.25);
  stand(ctx, t, 'to_white', 1180, 920, { t0: s.a, rot: Math.sin(t * 1.4) * 0.015, rim: '#ffffff', glow: '#ffffff', glowA: 0.35 });
  for (let k = 0; k < 4; k++) glow(ctx, ((k * 600 - t * 50) % 2600 + 2600) % 2600 - 300, 900, 600, '#ffffff', 0.3);
}
function embrace(ctx, t, s) {
  dawnBG(ctx, t, inv(166.5, 190, t));
  const hug = smooth(Ls(46) - 0.2, Ls(46) + 0.8, t);
  stand(ctx, t, 'shi_cos', 960, 980, { t0: s.a, glow: '#ffd0a0', glowA: 0.3 + hug * 0.5, rim: '#ffe0c0' });
  rings(ctx, 960, 560, [lerp(900, 420, hug), lerp(940, 450, hug)], '#fff0d8', 2, hug * 0.8);
  glow(ctx, 960, 560, 600 + hug * 300, '#fff4e0', hug * 0.55);
}
// Especial — editorial
const ESP = { 191.3: ['yo', 'card_yo', [0.6, 0.38]], 198.7: ['na', 'card_na', [0.4, 0.36]], 202.2: ['shi', 'cover', FACE.shi] };
function especial(ctx, t, s) {
  let cur = ESP[191.3]; for (const [k, v] of Object.entries(ESP)) if (t >= +k) cur = v;
  const [who, img, f] = cur, m = MEM[who];
  fill(ctx, '#0c0507');
  vgrad(ctx, [[0, 'rgba(0,0,0,0)'], [1, rgba(m.deep, 0.9)]]);
  ctx.save(); ctx.font = font(F.anton, 300, 400); ctx.textBaseline = 'middle'; ctx.fillStyle = rgba(m.ink, 0.9);
  ctx.translate(140, 540); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('ESPECIAL', 0, 0); ctx.restore();
  const fx = 1120, fy = 110, fw = 600, fh = 820, kk = Object.keys(ESP).map(Number).filter(k => t >= k).pop(), a = E.outCubic(clamp((t - kk) / 0.45));
  ctx.save(); ctx.beginPath(); ctx.rect(fx, fy + fh * (1 - a), fw, fh * a); ctx.clip();
  cover(ctx, IMG[img], [fx, fy, fw, fh], img === 'cover' ? 2.2 : 2.0, f[0], f[1]); ctx.restore();
  ctx.save(); ctx.strokeStyle = m.ink; ctx.lineWidth = 6; ctx.strokeRect(fx - 16, fy - 16, fw + 32, fh + 32); ctx.restore();
  label(ctx, m.name, fx + fw, fy + fh + 50, { fam: F.anton, size: 34, color: IV, track: 0.2, align: 'right', alpha: a });
  // 熱情
  if (t > 194.9 && t < 199) {
    const p = smooth(194.9, 195.4, t) * (1 - smooth(198.4, 198.9, t));
    drawText(ctx, t, '熱情', { x: 640, y: 110, vertical: true, size: 380, fontStr: font(F.dela, 380, 400), fill: m.ink, glow: 'rgba(255,40,60,0.45)', glowBlur: 36, anim: 'zoom', start: 195.0, stagger: 0.14, dur: 0.4, alpha: p });
  }
  fill(ctx, '#ffe8c8', Math.pow(smooth(207.8, 209.11, t), 2) * 0.7, 'screen');
}
// final chorus — dawn bloom
function bloomRoses(ctx, t, s) {
  vgrad(ctx, [[0, '#a8401a'], [0.6, '#e8782a'], [1, '#7a2410']]);
  sunburst(ctx, 960, 520, t * 0.04, 48, 'rgba(255,230,180,0.07)', 'rgba(255,230,180,0)');
  rgrad(ctx, 960, 520, 1100, [[0, 'rgba(255,240,200,0.6)'], [1, 'rgba(255,200,120,0)']], 1, 'screen');
  lattice(ctx, t, GOLD, 0.05, 170, 0, 0, 0);
  coverSun(ctx, t, s, 960, 520, 360, 1.45, [0.47, 0.35]);
  const roses = [IMG.obj_d_rose, IMG.obj_fi_r3, IMG.obj_fi_r7];
  for (let i = 0; i < 16; i++) {
    const at = s.a + (i / 16) * 2.4, p = E.outBack(clamp((t - at) / 0.5));
    if (p <= 0) continue;
    const a = (i / 16) * TAU + 0.3, r = 520 + (i % 3) * 120;
    place(ctx, roses[i % 3], 960 + Math.cos(a) * r * 1.4, 540 + Math.sin(a) * r * 0.8, (150 + (i % 4) * 40) * p, { rot: a + t * 0.1 });
  }
  petals(ctx, t, 20, 17, { a: 1, speed: 120, wind: 70 });
}
function candleOut(ctx, t, s) {
  vgrad(ctx, [[0, '#2a2038'], [1, '#4a3048']]);
  const out = smooth(233.3, 233.75, t);
  ctx.save(); ctx.globalAlpha = 0.35 * (1 - out * 0.5); cover(ctx, IMG.cover, [0, 0, W, H], 1.35, 0.5, 0.36); ctx.restore();
  fill(ctx, '#2a2040', 0.35, 'multiply');
  place(ctx, IMG.obj_fi_candle, 960, 820, 520, { a: 1, filter: `brightness(${1 - out * 0.45})` });
  glow(ctx, 958, 640, 300, '#ffb060', 0.8 * (1 - out));
  // smoke
  const u = t - 233.45;
  if (u > 0) { ctx.save(); ctx.globalCompositeOperation = 'screen'; for (let i = 0; i < 60; i++) { const age = u - i * 0.05; if (age <= 0 || age > 3) continue; const y = 650 - age * 150, x = 958 + noise1(age * 0.9 + i * 0.1, 7) * age * 60; const r = 6 + age * 30; ctx.globalAlpha = 0.18 * (1 - age / 3); ctx.drawImage(softDot('#e8e0f0', 64), x - r, y - r, r * 2, r * 2); } ctx.restore(); }
  fill(ctx, '#c8b8e8', out * 0.25, 'screen');
}
// outro — collage polaroids of the five in their own clothes
const OFF = [['yo', 'yo_swim', 'c_yo_swim', 'buenos días'], ['na', 'na_casual', 'c_na_casual', 'see you ♪'], ['shi', 'shi_swim', 'c_shi_swim', 'sweet ♡'], ['to', 'to_white', 'c_to_white', 'gracias'], ['ri', 'ri_resort', 'c_ri_resort', 'yay!']];
function credits(ctx, t, s) {
  paper(ctx, 'paper_cream');
  scribble(ctx, t, s.a + 0.5, 'después de la noche…', 120, 120, 60, '#7a1f2a', -0.03, 1.2);
  doodle(ctx, 'swoosh', 330, 175, 4.2, clamp((t - s.a - 1.6) / 0.6), '#7a1f2a', 4);
  doodle(ctx, 'heart', 1760, 140, 2.0, clamp((t - s.a - 2.0) / 0.6), MEM.shi.ink, 5);
  const per = (249.75 - 238.14) / 5;
  OFF.forEach(([w, big, small, note], k) => {
    const t0 = s.a + k * per, p = slap(t, t0 + 0.1);
    if (!p.a) return;
    const x = 250 + k * 355, y = 430 + (k % 2) * 50, bo = boil(t, k);
    polaroid(ctx, null, x + bo[0], y + bo[1], 340 * p.s, { rot: (k % 2 ? 0.05 : -0.05) + p.r, caption: note, capColor: MEM[w].deep,
      draw: (g, px, py, pw, ph) => { g.fillStyle = MEM[w].light; g.fillRect(px, py, pw, ph); const im = IMG[big + '_plain']; if (im) { const hh = ph * 1.25; g.drawImage(im, px + pw / 2 - im.width * hh / im.height / 2, py + ph - hh * 0.92, im.width * hh / im.height, hh); } } });
    tape(ctx, x, y - 200, 120, (k % 2 ? 0.2 : -0.2), undefined, p.a);
    sticker(ctx, IMG[small], x + 120, y + 250, 190, { a: p.a, rot: 0.1 });
    label(ctx, MEM[w].jp, x - 140, y + 240, { size: 26, weight: 700, color: '#2a1a1a', alpha: smooth(t0 + 0.3, t0 + 0.7, t) });
    label(ctx, 'CV.' + MEM[w].cv, x - 140, y + 274, { fam: F.klee, size: 20, color: MEM[w].deep, alpha: smooth(t0 + 0.4, t0 + 0.8, t) });
  });
}
function endCard(ctx, t, s) {
  vgrad(ctx, [[0, '#1a0508'], [0.6, '#3a0812'], [1, '#12040a']]);
  lattice(ctx, t, GOLD, 0.06, 180, 0, 0, 0);
  ORDER.forEach((w, k) => {
    const x = 560 + k * 200, hop = Math.abs(Math.sin((beatF(t) + k * 0.3) * Math.PI)) * 10 * (t < 262 ? 1 : 0);
    const img = IMG['c_' + w + '_plain'];
    if (img) character(ctx, img, x, 800 - hop, 260, { a: smooth(250.3 + k * 0.15, 250.8 + k * 0.15, t), shadow: { dx: 0, dy: 16, blur: 12, a: 0.5 } });
  });
  drawText(ctx, t, '熱情エナモラル', { x: 960, y: 330, align: 'center', size: 96, fontStr: font(F.mincho, 96, 800), fill: IV, glow: 'rgba(255,170,90,0.35)', glowBlur: 20, track: 0.08, anim: 'blur', start: 250.2, stagger: 0.08, dur: 0.9 });
  drawText(ctx, t, 'Fin', { x: 960, y: 470, align: 'center', size: 110, fontStr: font(F.script, 110, 400), fill: GOLD, glow: 'rgba(255,170,90,0.5)', glowBlur: 22, anim: 'ink', start: 251.3, stagger: 0.15, dur: 0.5 });
  label(ctx, 'THE IDOLM@STER CINDERELLA MASTER  Passion jewelries! 004', 960, 980, { fam: F.cinzel, size: 15, weight: 600, color: IV, track: 0.3, align: 'center', alpha: smooth(252, 252.8, t) * 0.85 });
  label(ctx, 'fan-made lyric video  ·  photo elements: Open Images Dataset (CC BY 2.0), see CREDITS', 960, 1020, { fam: F.corm, size: 19, italic: true, color: GOLD, align: 'center', alpha: smooth(253, 253.8, t) * 0.7 });
}

/* ------------------------------------------------------------ timeline */
export let SHOTS = [];
export function build() {
  const S = [], add = (a, draw, tr = 'cut', td = 0, x = {}) => S.push({ a, draw, tr, td, ...x });
  add(0, sOpen);
  add(Ls(0) - 0.26, chantShot('yo', 0, 'R'), 'fan', 0.3, { tro: { color: MEM.yo.ink } });
  add(Ls(1) - 0.24, chantShot('na', 1, 'L'), 'fan', 0.3, { tro: { color: MEM.na.ink } });
  add(Ls(2) - 0.24, chantShot('shi', 2, 'R'), 'fan', 0.3, { tro: { color: MEM.shi.ink } });
  add(Ls(3) - 0.26, oleShot);
  add(9.75, titleShot, 'flash', 0.5);
  add(15.9, tomoeNight, 'dissolve', 0.9);
  add(23.45, riamuNight, 'slats', 0.5);
  add(30.3, vanity, 'sheet', 0.4);
  add(34.75, deepRed, 'sheet', 0.3, { tro: { dir: -1 } });
  add(36.4, navyEve, 'sheet', 0.3);
  add(38.45, nagiMirror, 'iris', 0.6, { tro: { color: MEM.na.ink } });
  add(42.3, warmUp, 'dissolve', 0.6);
  add(48.46, (c, t, s) => chorusSun(c, t, s), 'cut', 0, { kick: 0.8 });
  add(Ls(16) - 0.1, (c, t, s) => slats3(c, t, s, ['na', 'shi', 'yo', 'to', 'ri']), 'slats', 0.4);
  add(Ls(17) - 0.1, (c, t, s) => chorusSun(c, t, s, { R: 360, f: [0.6, 0.3], c1: '#b8142a', c2: '#ff7a3a' }), 'cut', 0, { kick: 0.6 });
  add(Ls(18) - 0.1, nagiCardDance, 'whip', 0.3);
  add(Ls(19) - 0.1, (c, t, s) => split(c, t, s, { who: 'to', key: 'to_cos' }, { who: 'na', key: 'na_cos' }, ch(19, 5)), 'cut', 0, { kick: 0.4 });
  add(Ls(20) - 0.1, (c, t, s) => split(c, t, s, { who: 'ri', key: 'ri_cos' }, { who: 'yo', key: 'yo_cos' }, ch(20, 5)), 'cut', 0, { kick: 0.4 });
  add(Ls(21) - 0.1, shinFire, 'fan', 0.35, { tro: { color: MEM.shi.ink } });
  add(Ls(22) - 0.15, (c, t, s) => { coverFull(c, t, s, 1.6, 1.3, [0.47, 0.36]); petals(c, t, 18, 31, { a: 1, speed: 90 }); }, 'dissolve', 0.5);
  add(69.75, guitarChibis, 'sheet', 0.45);
  add(79.43, seaMemory, 'sheet', 0.4, { tro: { dir: -1 } });
  add(87.5, earrings, 'sheet', 0.4);
  add(94.37, tomoeKiss, 'dissolve', 0.6);
  add(98.3, shinAway, 'dissolve', 0.5);
  add(102.62, riamuBells, 'slats', 0.4);
  add(106.25, silence, 'dissolve', 0.6);
  add(112.33, morningStar, 'flash', 0.5, { tro: { color: '#f0e0ff' } });
  add(Ls(33) - 0.1, moonWish, 'dissolve', 0.4);
  add(Ls(34) - 0.1, (c, t, s) => slats3(c, t, s, ['yo', 'na', 'shi', 'to', 'ri']), 'slats', 0.35);
  add(Ls(35) - 0.1, timeTicks, 'iris', 0.4);
  add(Ls(36) - 0.1, (c, t, s) => split(c, t, s, { who: 'shi', key: 'shi_cos' }, { who: 'to', key: 'to_cos' }, ch(36, 5), { night: true }), 'cut', 0, { kick: 0.4 });
  add(Ls(37) - 0.1, (c, t, s) => split(c, t, s, { who: 'na', key: 'na_cos' }, { who: 'ri', key: 'ri_cos' }, ch(37, 5), { night: true }), 'cut', 0, { kick: 0.4 });
  add(Ls(38) - 0.1, bubbles, 'dissolve', 0.4);
  add(Ls(39) - 0.15, guitarGold, 'dissolve', 0.5);
  add(133.62, danceWall, 'fan', 0.5, { tro: { color: MEM.na.ink } });
  [['yo', 'yo_cos'], ['na', 'na_cos'], ['shi', 'shi_cos'], ['to', 'to_cos'], ['ri', 'ri_cos']].forEach(([w, k], j) => add(barT(73 + j), rollCall(w, k), 'slats', 0.35));
  add(barT(78), chibiStage, 'iris', 0.4);
  add(barT(82), buildCuts, 'cut', 0, { kick: 0.6 });
  for (let j = 1; j < 8; j++) add(barT(82) + j * T.bar / 2, buildCuts, 'cut', 0, { kick: 0.4 });
  add(166.53, profiles, 'flash', 0.8, { tro: { color: '#fff4e0' } });
  add(174.35, cufflink, 'dissolve', 0.6);
  add(180.85, mist, 'dissolve', 0.7);
  add(185.8, embrace, 'dissolve', 0.6);
  add(191.3, especial, 'cut', 0, { kick: 0.5 });
  add(209.11, (c, t, s) => chorusSun(c, t, s, { top: '#a8401a', c1: '#e8782a', bot: '#7a2410', c2: '#ffe0a0' }), 'flash', 0.6);
  add(Ls(55) - 0.1, (c, t, s) => lineup(c, t, s, ORDER.map(w => [w, COS[w]]), { dawn: true }), 'slats', 0.4);
  add(Ls(56) - 0.1, (c, t, s) => chorusSun(c, t, s, { R: 340, f: [0.55, 0.3], top: '#a8401a', c1: '#e8782a', bot: '#7a2410', c2: '#ffe0a0' }), 'cut', 0, { kick: 0.6 });
  add(Ls(57) - 0.1, bloomRoses, 'iris', 0.35, { tro: { color: MEM.yo.ink } });
  add(Ls(58) - 0.1, (c, t, s) => split(c, t, s, { who: 'to', key: 'to_cos' }, { who: 'ri', key: 'ri_cos' }, ch(58, 5), { grade: '#ffb080', gradeA: 0.15 }), 'cut', 0, { kick: 0.4 });
  add(Ls(59) - 0.1, (c, t, s) => split(c, t, s, { who: 'to', key: 'to_cos', flip: true, x: 640 }, { who: 'ri', key: 'ri_cos', flip: true }, ch(59, 5), { grade: '#ffb080', gradeA: 0.15 }), 'whip', 0.3);
  add(Ls(60) - 0.1, (c, t, s) => { cover(c, IMG.card_na, [0, 0, W, H], lerp(1.9, 1.7, inv(s.a, s.b, t)), 0.62, 0.36); fill(c, '#ffb088', 0.2, 'soft-light'); petals(c, t, 16, 71, { a: 1, speed: 70 }); }, 'dissolve', 0.4);
  add(Ls(61) - 0.1, (c, t, s) => duoGroups(c, t, s), 'slats', 0.35);
  add(Ls(63) - 0.1, candleOut, 'dissolve', 0.6);
  add(Ls(64) - 0.1, (c, t, s) => { coverFull(c, t, s, 1.25, 1.12, [0.5, 0.4], '#c8a8e8'); fill(c, '#f0d8f0', 0.25, 'screen'); petals(c, t, 12, 81, { a: 0.8, speed: 40, tint: '#f8c8d8' }); }, 'dissolve', 0.9);
  add(238.14, credits, 'sheet', 0.6);
  add(249.75, endCard, 'dissolve', 0.9);
  S.forEach((s, i) => (s.b = S[i + 1] ? S[i + 1].a : 999));
  SHOTS = S; return S;
}
function duoGroups(ctx, t, s) { // (to+ri) / (yo+na+shi)
  const k = E.inOutExpo(clamp((t - (ch(61, 5) - 0.3)) / 0.5));
  fill(ctx, '#1a0508');
  withMask(ctx, rectPath(-10, -10, W * 0.46, H + 20, 80), g => {
    lgrad(g, 0, 0, W * 0.5, 0, [[0, MEM.to.ink], [1, MEM.ri.ink]]);
    stand(g, t, 'to_cos', 250, 860, { face: true, t0: s.a, shadow: false }); stand(g, t, 'ri_cos', 640, 860, { face: true, t0: s.a + 0.1, shadow: false });
  });
  withMask(ctx, rectPath(W * 0.46 + (1 - k) * W * 0.6, -10, W, H + 20, 80), g => {
    lgrad(g, W * 0.45, 0, W, 0, [[0, MEM.yo.ink], [0.5, MEM.na.ink], [1, MEM.shi.ink]]);
    [['yo_cos', 1110], ['na_cos', 1420], ['shi_cos', 1730]].forEach(([key, x], j) => stand(g, t, key, x + (1 - k) * 200, 820, { face: true, shadow: false }));
  });
  fill(ctx, '#ffd0a0', 0.12, 'soft-light');
}
export { hud, singersAt };
