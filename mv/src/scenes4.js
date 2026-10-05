// v4 storyboard. A flamenco night told in shot sizes: wide establishing shots, medium two-shots,
// close-ups and object inserts, carried by a moving camera with parallax layers. Spanish decorative
// art from The Met (azulejos, lustreware, fans, mantillas, lace, earrings, guitars, watches, ironwork,
// Alhambra photographs) builds the backgrounds, kaleidoscopes and collages. Polaroids carry memory.
import { W, H, TAU, clamp, lerp, inv, smooth, E, hash, noise1, makeCanvas } from './util.js';
import { T, barT, beatT, beatF, barF, pulse } from './timing.js';
import { IMG, buf, cover, place, tinted, duo, rgba, withMask, archPath, circlePath, rectPath, rings, lattice, dots, ink, glow, sparkle,
  stars, embers, petals, bokeh, softDot } from './gfx.js';
import { piece, sticker, slap, tape, polaroid, scribble, doodle, step, boil } from './collage.js';
import { F, font, drawText, label } from './text.js';
import { chant } from './lyrics4.js';
import { MEM, ORDER, GOLD, IV, setCam, layer, OS, bg, bgGrad, wash, radial, FACE, framing, figure, lerpFr, CF, kaleido, tileWall,
  laceBorder, fringe, fanOpen, obj, halo, earrings, develop, fgBlur, lightRays } from './kit4.js';

const Ls = i => T.lines[i].start;
const ch = (i, j) => T.lines[i].chars[j];
const M = k => IMG['m_' + k];
const COS = { yo: 'yo_cos', na: 'na_cos', shi: 'shi_cos', to: 'to_cos', ri: 'ri_cos' };
const PRIV = { yo: 'yo_swim', na: 'na_casual', shi: 'shi_swim', to: 'to_white', ri: 'ri_resort' };
const uOf = (t, s) => clamp((t - s.a) / Math.max(0.01, s.b - s.a));
const paperBG = (ctx, key) => { const p = IMG[key]; if (p) ctx.drawImage(p, ...OS); };

/* ------------------------------------------------------------ backgrounds */
function kaleBG(ctx, t, key, o = {}) {
  layer(ctx, o.depth ?? 0.35, g => {
    bg(g, o.base || '#120607');
    kaleido(g, M(key), { n: o.n || 12, rot: t * (o.spin ?? 0.04) + (o.rot0 || 0), zoom: o.zoom || 1.1, fx: 0.5 + 0.12 * Math.sin(t * 0.13 + (o.ph || 0)), fy: 0.5 + 0.12 * Math.cos(t * 0.11), R: 1500, cx: o.cx ?? W / 2, cy: o.cy ?? H / 2 });
    if (o.tint) wash(g, o.tint, o.tintA ?? 0.45, o.tintOp || 'multiply');
    radial(g, o.cx ?? W / 2, o.cy ?? H / 2, 1250, [[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(0,0,0,0.18)'], [1, `rgba(0,0,0,${o.vig ?? 0.8})`]]);
  });
}
function textileBG(ctx, key, o = {}) {
  layer(ctx, o.depth ?? 0.3, g => { bg(g, '#100506'); const im = M(key); if (im) cover(g, im, OS, o.z || 1.05, o.fx ?? 0.5, o.fy ?? 0.5); if (o.tint) wash(g, o.tint, o.tintA ?? 0.4, o.tintOp || 'multiply'); });
}
function photoBG(ctx, key, dark, light, o = {}) {
  layer(ctx, o.depth ?? 0.3, g => { const im = M(key); bg(g, dark); if (im) cover(g, duo(im, dark, light), OS, o.z || 1.05, o.fx ?? 0.5, o.fy ?? 0.5); });
}
function frameDeco(ctx, t, o = {}) { // flamenco proscenium: fringe on top, lace at the bottom
  layer(ctx, o.depth ?? 1.15, g => {
    if (o.fringe !== false) fringe(g, -14, o.fh || 150, o.a ?? 1, t * 6, Math.sin(t * 1.4) * 0.6);
    if (o.lace) laceBorder(g, o.lace, H + 6, o.lh || 110, o.laceColor || IV, o.laceA ?? 0.85, true, -t * 8);
  });
}

/* ------------------------------------------------------------ transitions & runner */
function trans(ctx, kind, p, drawNext, o = {}) {
  p = clamp(p); if (p <= 0) return;
  if (p >= 1 || kind === 'cut') { drawNext(ctx); return; }
  const [c, g] = buf('tr'); drawNext(g);
  const e = E.inOutCubic(p);
  ctx.save();
  if (kind === 'dissolve') { ctx.globalAlpha = e; ctx.drawImage(c, 0, 0); }
  else if (kind === 'fan') {
    const cx = o.x ?? W / 2, cy = o.y ?? H + 200, R = 2400, a0 = Math.PI, span = Math.PI * e;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a0 + span); ctx.closePath(); ctx.save(); ctx.clip(); ctx.drawImage(c, 0, 0); ctx.restore();
    ctx.strokeStyle = o.color || '#9a1028'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0 + span) * R, cy + Math.sin(a0 + span) * R); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.stroke();
  } else if (kind === 'iris') {
    const r = e * 1300; ctx.beginPath(); ctx.arc(o.x ?? 960, o.y ?? 540, r, 0, TAU); ctx.save(); ctx.clip(); ctx.drawImage(c, 0, 0); ctx.restore();
    ctx.strokeStyle = o.color || GOLD; ctx.lineWidth = 4 * (1 - e) + 1.5; ctx.stroke();
  } else if (kind === 'flash') {
    if (p > 0.45) ctx.drawImage(c, 0, 0);
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.pow(Math.sin(p * Math.PI), 1.4) * (o.amount ?? 0.9); ctx.fillStyle = o.color || '#fff1e0'; ctx.fillRect(0, 0, W, H);
  } else if (kind === 'sheet') {
    const dir = o.dir || 1, x = (1 - E.outCubic(p)) * W * dir;
    ctx.shadowColor = 'rgba(20,10,10,0.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetX = -10 * dir;
    ctx.translate(x, (1 - E.outCubic(p)) * 40); ctx.rotate((1 - p) * 0.05 * dir); ctx.drawImage(c, 0, 0);
  } else if (kind === 'whip') {
    const [c2, g2] = buf('whip', W / 4, H / 4); const sh = Math.sin(p * Math.PI);
    g2.filter = `blur(${sh * 14}px)`; g2.drawImage(p < 0.5 ? ctx.canvas : c, 0, 0, W / 4, H / 4);
    if (p >= 0.5) ctx.drawImage(c, 0, 0);
    ctx.globalAlpha = sh; ctx.drawImage(c2, (p < 0.5 ? -p : 1 - p) * (o.dir || 1) * W * 0.35, 0, W, H);
  } else if (kind === 'lace') { // a lace curtain sweeps across, revealing the next shot behind it
    const x = lerp(-W * 0.2, W * 1.2, e);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, H); ctx.clip(); ctx.drawImage(c, 0, 0); ctx.restore();
    const m = IMG.m_lace_227682_mask;
    if (m) { const tl = tinted(m, IV), w = 520; ctx.globalAlpha = Math.sin(p * Math.PI); ctx.drawImage(tl, x - w / 2, -40, w, H + 80); }
  } else if (kind === 'slats') {
    const n = 6;
    for (let k = 0; k < n; k++) {
      const pk = E.inOutExpo(clamp(p * 1.6 - k * 0.11)), x = (W / n) * k, w = W / n + 1, y0 = (1 - pk) * (k % 2 ? -H : H);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y0, w, H); ctx.clip(); ctx.drawImage(c, 0, 0); ctx.restore();
      ctx.fillStyle = k % 2 ? '#9a1028' : GOLD; ctx.globalAlpha = Math.sin(pk * Math.PI); ctx.fillRect(x, y0 + (k % 2 ? H - 10 : 0), w, 10); ctx.globalAlpha = 1;
    }
  } else { ctx.globalAlpha = e; ctx.drawImage(c, 0, 0); }
  ctx.restore();
}
export function runShots(ctx, t, shots) {
  let i = 0; for (let k = 0; k < shots.length; k++) if (t >= shots[k].a) i = k;
  const s = shots[i], n = shots[i + 1];
  setCam(s, t); ctx.save(); s.draw(ctx, t, s); ctx.restore();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  if (n && n.tr && n.tr !== 'cut' && n.td) {
    const p = (t - (n.a - n.td)) / n.td;
    if (p > 0 && p < 1) trans(ctx, n.tr, p, g => { setCam(n, t); n.draw(g, t, n); }, n.tro || {});
  }
  if (s.kick) { const k = Math.exp(-(t - s.a) * 10) * s.kick; if (k > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = k * 0.5; ctx.fillStyle = '#fff1dc'; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
  return s;
}

/* ------------------------------------------------------------ reusable shot types */
// face / bust shot of one member: kaleidoscope or textile behind, dish halo, framing push
const memberShot = (who, key, o = {}) => (ctx, t, s) => {
  const u = uOf(t, s), m = MEM[who];
  if (o.textile) textileBG(ctx, o.textile, { tint: o.tint || m.deep, tintA: o.tintA ?? 0.35 });
  else kaleBG(ctx, t, o.kale || 'tile_477238', { tint: o.tint || m.deep, tintA: o.tintA ?? 0.4, spin: o.spin ?? 0.04, ph: hash(who.length, 3) * 6 });
  if (o.lattice !== false) layer(ctx, 0.5, g => lattice(g, t, rgba(m.light, 1), 0.06, 170, 0.2, 0, 0));
  const f0 = framing(key, o.from || 'bust', o.side ?? 0.62, o), f1 = framing(key, o.to || 'face', o.side ?? 0.62, o);
  const fr = lerpFr(f0, f1, (o.ease || E.inOutSine)(u));
  if (o.halo) layer(ctx, 0.85, g => halo(g, M(o.halo), fr.x + (o.flip ? -1 : 1) * fr.fh * 0.25, fr.y - fr.fh * 0.05, fr.fh * (o.haloK || 1.25), t, 0.95));
  layer(ctx, 1, g => figure(g, key, fr, { flip: o.flip, rim: m.light, rimSide: o.flip ? -1 : 1, grade: o.grade, gradeA: o.gradeA, gradeOp: o.gradeOp }));
  if (o.fg) layer(ctx, 1.4, g => fgBlur(g, M(o.fg) || IMG[o.fg], o.fgx ?? 1700, o.fgy ?? 900, o.fgh ?? 600, 12, 0.9, 0.3));
  if (o.deco !== false) frameDeco(ctx, t, { lace: o.lace, fringe: o.fringe });
};
// call-and-response: two members of the same outfit set, diagonal split
const splitShot = (L, R, tR, o = {}) => (ctx, t, s) => {
  const k = E.inOutExpo(clamp((t - (tR - 0.25)) / 0.45)), cut = lerp(W + 260, W * 0.52, k), sk = 150;
  const side = (who, key, kale, flip, xFace) => g => {
    kaleBG(g, t, kale, { tint: MEM[who].deep, tintA: 0.42, spin: flip ? -0.05 : 0.05 });
    layer(g, 0.5, h => lattice(h, t, rgba(MEM[who].light, 1), 0.06, 160, 0.2, 0, 0));
    const fr = lerpFr(framing(key, 'bust', xFace), framing(key, 'face', xFace), E.inOutSine(uOf(t, s)) * 0.6);
    if (o.halo) layer(g, 0.85, h => halo(h, M(o.halo[flip ? 1 : 0]), fr.x, fr.y - 20, fr.fh * 1.2, t, 0.9));
    layer(g, 1, h => figure(h, key, fr, { flip: !!flip, rim: MEM[who].light, rimSide: flip ? -1 : 1, grade: o.grade, gradeA: o.gradeA, gradeOp: o.gradeOp }));
  };
  side(L.who, L.key, L.kale || 'tile_187924', L.flip, L.x ?? 0.28)(ctx);
  if (k > 0) withMask(ctx, rectPath(cut, -10, W + 300, H + 20, -sk), side(R.who, R.key, R.kale || 'tile_187938', !R.flip, (R.x ?? 0.74) + (1 - k) * 0.15));
  if (k > 0) { ctx.save(); ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cut + sk, -10); ctx.lineTo(cut - sk, H + 10); ctx.stroke(); ctx.restore(); }
  frameDeco(ctx, t, { fh: 120 });
};
// cover art in a circle framed by a turning lustre dish (wide group shot)
function coverMedallion(ctx, t, s, o = {}) {
  const u = E.outExpo(clamp((t - s.a) / 1.0)), cx = o.cx ?? W / 2, cy = o.cy ?? 540, R = (o.R ?? 380) * (0.75 + 0.25 * u);
  layer(ctx, 0.85, g => {
    halo(g, M(o.dish || 'dish_471762'), cx, cy, R * 1.55, t, 1, 0.03);
    withMask(g, circlePath(cx, cy, R), h => cover(h, IMG.cover, [cx - R, cy - R, R * 2, R * 2], o.z ?? 1.35, o.f?.[0] ?? 0.47, o.f?.[1] ?? 0.36));
    rings(g, cx, cy, [R + 6], GOLD, 3, 0.95);
  });
}

/* ------------------------------------------------------------ PROLOGUE */
function overture(ctx, t, s) {
  layer(ctx, 0.3, g => { bg(g, '#070304'); radial(g, W / 2, 620, 900, [[0, 'rgba(90,10,20,0.55)'], [1, 'rgba(0,0,0,0)']]); });
  layer(ctx, 1, g => fanOpen(g, M('fan_170045'), W / 2, 760, 560, E.inOutCubic(inv(0.25, 1.55, t))));
  layer(ctx, 1.2, g => embers(g, t, 26, 3, { a: 0.6, speed: 40, color: '#ffcf8a' }));
  label(ctx, 'THE IDOLM@STER CINDERELLA GIRLS', 960, 880, { fam: F.cinzel, size: 16, weight: 600, color: IV, track: 0.5, align: 'center', alpha: smooth(0.5, 1.1, t) * 0.85 });
  label(ctx, 'Passion jewelries! 004', 960, 918, { fam: F.corm, size: 26, italic: true, weight: 500, color: GOLD, align: 'center', alpha: smooth(0.7, 1.3, t) });
}
const chantShot = (who, i, side, kale, dish, fan, sz) => (ctx, t, s) => {
  const R = side === 'R';
  memberShot(who, COS[who], { kale, side: R ? 0.72 : 0.28, flip: !R, from: sz[0], to: sz[1], halo: dish, deco: false })(ctx, t, s);
  if (fan) layer(ctx, 1.2, g => fanOpen(g, M(fan), R ? 300 : 1620, 1080, 480, E.outBack(clamp((t - s.a) / 0.5)), { rot: R ? 0.25 : -0.25 }));
  frameDeco(ctx, t, { fh: 130 });
  chant(ctx, t, i, R ? 560 : 1360, 560, { size: 128, exit: s.b - 0.12 });
};
function oleShot(ctx, t, s) {
  kaleBG(ctx, t, 'tile_187933', { tint: '#5a0612', tintA: 0.5, spin: 0.2 });
  const pw = W / 5;
  ORDER.forEach((w, k) => {
    const u = E.outExpo(clamp((t - s.a - k * 0.07) / 0.5));
    withMask(ctx, rectPath(k * pw + 8, 120 + (1 - u) * (k % 2 ? -H : H), pw - 16, H - 240), g => {
      bg(g, MEM[w].deep); kaleido(g, M('tile_187924'), { n: 8, rot: t * 0.1 + k, R: 600, cx: k * pw + pw / 2, cy: 540, zoom: 1 }); wash(g, MEM[w].deep, 0.55, 'multiply');
      figure(g, COS[w], framing(COS[w], 'face', (k + 0.5) / 5, { k: 0.75, y: 470 }), { rim: MEM[w].light, shadow: false });
    });
    ctx.save(); ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.strokeRect(k * pw + 8, 120, pw - 16, H - 240); ctx.restore();
  });
  frameDeco(ctx, t, { fh: 140, lace: 'm_lace_214828_mask', lh: 90 });
  chant(ctx, t, 3, 960, 560, { size: 260, exit: s.b - 0.15, fill: { grad: ['#fffaf0', '#ffe2b0', '#f2b866'] } });
  embers(ctx, t, 50, 5, { a: smooth(7.8, 8.2, t), speed: 160 });
}
// Title: collage on crimson velvet
function titleCollage(ctx, t, s) {
  const b = sd => boil(t, sd);
  layer(ctx, 0.3, g => { textileBG(g, 'textile_222561', { z: 1.2, depth: 0 }); wash(g, '#2a0408', 0.25, 'multiply'); });
  layer(ctx, 0.6, g => {
    const p1 = slap(t, 9.95), p2 = slap(t, 10.25), p3 = slap(t, 10.6), p4 = slap(t, 11.0), p5 = slap(t, 11.4);
    piece(g, 1460 + b(1)[0], 520, 900 * p1.s, 560 * p1.s, { img: M('textile_230357'), z: 1.2, rot: 0.05 + p1.r, seed: 3, a: p1.a });
    polaroid(g, IMG.cover, 1420 + b(2)[0], 480 + b(2)[1], 560 * p2.s, { a: p2.a, rot: -0.06 + p2.r, z: 1.15, fx: 0.5, fy: 0.42, caption: 'Passion jewelries! 004', filter: develop((t - 10.3) / 2.5) });
    tape(g, 1420, 140, 190, 0.1, undefined, p2.a);
    fanOpen(g, M('fan_169859'), 1780, 980, 360, E.outBack(clamp((t - 10.6) / 0.6)), { rot: -0.35 });
    earrings(g, M('jewel_206850'), 1080, 380, 230, t, p4.a);
    obj(g, IMG.obj_d_rose, 1100 + b(5)[0], 930, 300 * p5.s, { a: p5.a, rot: 0.3 });
    obj(g, M('watch_195645'), 210, 940, 200 * p3.s, { a: p3.a, rot: -0.2 });
  });
  layer(ctx, 0.8, g => {
    const p = slap(t, 10.05);
    piece(g, 560, 520, 900 * p.s, 420 * p.s, { color: '#f6efe0', rot: -0.03 + p.r, seed: 9, a: p.a });
    const out = 1 - smooth(15.3, 15.9, t);
    label(g, 'THE IDOLM@STER CINDERELLA GIRLS', 190, 380, { fam: F.cinzel, size: 15, weight: 700, color: '#6a1020', track: 0.45, alpha: smooth(10.3, 10.7, t) * out });
    drawText(g, t, '熱情エナモラル', { x: 190, y: 480, size: 96, fontStr: font(F.mincho, 96, 800), fill: '#1f1514', track: 0.06, anim: 'ink', start: 10.3, stagger: 0.08, dur: 0.3, exit: 15.4, exitDur: 0.5 });
    drawText(g, t, 'Enamorar', { x: 480, y: 610, size: 110, fontStr: font(F.script, 110, 400), fill: '#9a1028', anim: 'ink', start: 11.0, stagger: 0.08, dur: 0.3, exit: 15.4, exitDur: 0.5 });
    ORDER.forEach((w, k) => { const a = smooth(12 + k * 0.15, 12.4 + k * 0.15, t) * out; g.save(); g.globalAlpha = a; g.fillStyle = MEM[w].ink; g.fillRect(190 + k * 132, 690, 118, 5); g.restore(); label(g, MEM[w].jp, 190 + k * 132, 718, { size: 19, weight: 700, color: '#1f1514', track: 0.06, alpha: a }); });
  });
  frameDeco(ctx, t, { fh: 140, lace: 'm_lace_220632_mask', lh: 120 });
  petals(ctx, t, 8, 3, { a: 0.9, speed: 50, size: 0.8 });
}

/* ------------------------------------------------------------ VERSE 1 (night) */
function tomoeWide(ctx, t, s) { // wide: the Court of the Lions at night, Tomoe on the right third
  photoBG(ctx, 'alhambra_288043', '#05071c', '#9aa8e8', { z: 1.08, fx: 0.5, fy: 0.55, depth: 0.25 });
  layer(ctx, 0.15, g => { stars(g, t, 120, 11, [0, -100, W, 520], 0.8); glow(g, 1500, 160, 260, '#c8d4ff', 0.25); obj(g, IMG.obj_v2_crescent, 1500, 160, 200, { shadow: false, rot: -0.2 }); });
  layer(ctx, 0.6, g => radial(g, 600, 900, 900, [[0, 'rgba(255,150,80,0.18)'], [1, 'rgba(0,0,0,0)']], 'screen'));
  layer(ctx, 1, g => figure(g, 'to_cos', framing('to_cos', 'wide', 0.44, { h: 860 }), { rim: '#aab8ff', rimA: 0.5, grade: '#2a3080', gradeA: 0.32 }));
  layer(ctx, 1.4, g => fgBlur(g, M('iron_194614'), W + 60, 560, 1500, 8, 0.85));
}
function tomoeClose(ctx, t, s) { // close-up; two warm lights meet (重なる手と手)
  photoBG(ctx, 'alhambra_288043', '#04061a', '#5a68b0', { z: 1.6, fx: 0.4, fy: 0.5 });
  layer(ctx, 0.2, g => stars(g, t, 80, 12, [0, 0, W, 700], 0.6));
  const u = uOf(t, s);
  layer(ctx, 1, g => figure(g, 'to_cos', lerpFr(framing('to_cos', 'bust', 0.4), framing('to_cos', 'face', 0.42), E.inOutSine(u)), { rim: '#c0c8ff', rimA: 0.45, grade: '#2a3080', gradeA: 0.28 }));
  const q = E.inOutSine(inv(Ls(5) + 1.2, 23.2, t));
  layer(ctx, 1.2, g => { for (const sd of [-1, 1]) { glow(g, 1300 + sd * lerp(260, 24, q), 760, 110, sd < 0 ? '#ffb070' : '#ff8a6a', 0.85); sparkle(g, 1300 + sd * lerp(260, 24, q), 760, 0.8, 0.9); } });
}
function riamuCold(ctx, t, s) {
  kaleBG(ctx, t, 'tile_187929', { tint: '#0a1440', tintA: 0.62, spin: 0.02, base: '#060a20' });
  layer(ctx, 0.6, g => { glow(g, 1300, 400, 700, '#9ab8ff', 0.25); });
  const u = uOf(t, s);
  layer(ctx, 1, g => figure(g, 'ri_cos', lerpFr(framing('ri_cos', 'knee', 0.46), framing('ri_cos', 'bust', 0.45), E.inOutSine(u)), { rim: '#b8d0ff', rimA: 0.55, grade: '#2850a0', gradeA: 0.3 }));
  layer(ctx, 1.3, g => { for (let k = 0; k < 40; k++) { const x = (hash(k, 3) * W + t * 20) % W, y = (hash(k, 4) * H + t * (30 + hash(k, 5) * 40)) % H; g.globalAlpha = 0.5; g.drawImage(softDot('#e8f0ff', 16), x, y, 6 + hash(k, 6) * 8, 6 + hash(k, 6) * 8); } g.globalAlpha = 1; });
}
function riamuWarm(ctx, t, s) { // 熱帯夜: the room warms to candle light
  const w = smooth(s.a, s.a + 1.8, t);
  kaleBG(ctx, t, 'tile_187929', { tint: w > 0.5 ? '#3a0a08' : '#0a1440', tintA: 0.58, spin: 0.03 });
  layer(ctx, 0.5, g => radial(g, 600, 900, 1200, [[0, `rgba(255,120,50,${0.55 * w})`], [1, 'rgba(0,0,0,0)']], 'screen'));
  layer(ctx, 0.9, g => { obj(g, M('iron_198932'), 230, 760, 620, { a: 1 }); obj(g, IMG.obj_slim_candle, 230, 520, 230, { shadow: false, a: w }); glow(g, 230, 450, 220, '#ffb060', w * 0.9); });
  const u = uOf(t, s);
  layer(ctx, 1, g => figure(g, 'ri_cos', lerpFr(framing('ri_cos', 'bust', 0.42), framing('ri_cos', 'face', 0.42), E.inOutSine(u)), { rim: '#ffb070', rimA: 0.6, rimSide: -1, grade: '#ff7040', gradeA: 0.22 * w, gradeOp: 'soft-light' }));
  embers(ctx, t, 26, 7, { a: w * 0.7, speed: 50 });
}

/* ------------------------------------------------------------ B1 (vanity collage) */
function vanity(ctx, t, s) {
  const b = sd => boil(t, sd);
  layer(ctx, 0.5, g => { paperBG(g, 'paper_cream'); dots(g, rgba(MEM.shi.ink, 0.5), 26, (x) => (x / W) * 0.6 - 0.1, 0.4, [1100, -100, 1100, H + 200]); });
  layer(ctx, 0.8, g => {
    const p1 = slap(t, s.a), p2 = slap(t, s.a + 0.25), p3 = slap(t, s.a + 0.5), p4 = slap(t, Ls(9) - 0.2), p5 = slap(t, s.a + 0.8);
    piece(g, 620 + b(2)[0], 380 + b(2)[1], 620 * p2.s, 430 * p2.s, { img: IMG.photo_b1_letter, z: 1.35, fx: 0.42, fy: 0.42, rot: -0.06 + p2.r, seed: 7, a: p2.a, filter: 'sepia(0.35)' });
    tape(g, 400, 180, 160, -0.5, undefined, p2.a);
    obj(g, IMG.obj_b1_lipstick, 980 + b(3)[0], 520 + b(3)[1], 480 * p3.s, { a: p3.a, rot: 0.55 + p3.r });
    earrings(g, M('jewel_206855'), 290, 640, 300, t, p1.a);
    fanOpen(g, M('fan_120449'), 1700, 1040, 520, E.outBack(clamp((t - s.a - 0.8) / 0.6)), { rot: -0.4 });
    obj(g, M('iron_468836'), 760, 820, 140 * p5.s, { a: p5.a, rot: -0.3 });
    polaroid(g, null, 1430 + b(4)[0], 470 + b(4)[1], 470 * p4.s, { a: p4.a, rot: 0.06 + p4.r, caption: '♡ madame', capColor: '#9a1f4a',
      draw: (h, px, py, pw, ph) => { h.fillStyle = MEM.shi.light; h.fillRect(px, py, pw, ph); h.filter = develop((t - Ls(9)) / 1.8); figure(h, 'shi_cos', { x: px + pw * 0.5, y: py + ph * 0.4, fh: ph * 0.4 }, { shadow: false, floor: py + ph + 4 }); h.filter = 'none'; } });
    tape(g, 1430, 210, 170, 0.15, 'rgba(255,170,200,0.7)', p4.a);
    doodle(g, 'heart', 300, 860, 2.0, clamp((t - Ls(8) - 0.6) / 0.6), MEM.shi.ink, 5);
    scribble(g, t, Ls(9) - 0.1, 'à la madame…', 200, 120, 54, '#7a1f3a', -0.05, 1.0);
  });
}
function deepRed(ctx, t, s) { // 纏う深紅
  textileBG(ctx, 'textile_222561', { z: 1.15 });
  layer(ctx, 0.7, g => { const p = slap(t, s.a + 0.05); piece(g, 800, 520, 1000 * p.s, 640 * p.s, { img: IMG.card_yo, z: 1.9, fx: CF.cardYo.yo[0], fy: CF.cardYo.yo[1] + 0.04, rot: -0.04 + p.r, seed: 21, a: p.a }); tape(g, 380, 230, 170, -0.4, 'rgba(250,236,210,0.8)', p.a); });
  layer(ctx, 1.1, g => { obj(g, M('shawl_157896'), 1540, 260, 520, { rot: 0.5, a: 0.92 }); obj(g, IMG.obj_d_rose, 330, 900, 380, { rot: 0.2, a: slap(t, s.a + 0.3).a }); });
}
function navyEve(ctx, t, s) { // 濃紺の宵に靡いてく — the whole card as a wide torn strip (hair in the wind)
  layer(ctx, 0.4, g => { paperBG(g, 'paper_navy'); stars(g, t, 60, 41, [0, 0, W, 600], 0.7); });
  const u = E.outCubic(clamp((step(t) - s.a) / 0.5));
  layer(ctx, 0.85, g => piece(g, 960 + (1 - u) * -900, 470, 1560, 600, { img: IMG.card_yo, z: 1.18, fx: 0.42, fy: 0.5, rot: 0.03, seed: 33, paper: '#e8e2f0' }));
  layer(ctx, 1.1, g => { doodle(g, 'star', 1520, 150, 2.0, clamp((t - s.a - 0.5) / 0.5), GOLD, 4); scribble(g, t, s.a + 0.6, 'noche azul', 1420, 300, 56, '#e8d8b8', -0.06, 0.8); laceBorder(g, 'm_lace_221112_mask', H + 4, 80, '#d8d0f0', 0.8, true, t * 10); });
}

/* ------------------------------------------------------------ PRE-CHORUS */
function nagiMirror(ctx, t, s) { // 「らしくない」私: Nagi and her reflection in a Moorish arch mirror
  const u = uOf(t, s);
  layer(ctx, 0.3, g => { bg(g, '#1a0e06'); const m = IMG.m_lace_223050_mask; if (m) cover(g, tinted(m, '#5a3a18'), OS, 1.1, 0.5, 0.5, 0.8); });
  layer(ctx, 0.7, g => {
    withMask(g, archPath(560, 1000, 640, 900), h => {
      cover(h, duo(M('alhambra_263839'), '#140a04', '#b08a5a'), [240, 100, 640, 900], 1.1, 0.5, 0.5);
      h.save(); h.globalAlpha = 0.55; h.filter = 'saturate(0.2) brightness(0.85)';
      figure(h, 'na_cos', lerpFr(framing('na_cos', 'face', 0.3), framing('na_cos', 'eyes', 0.3), u * 0.4), { flip: true, shadow: false }); h.restore();
    });
    g.save(); g.strokeStyle = GOLD; g.lineWidth = 3; g.beginPath(); archPath(560, 1000, 640, 900)(g); g.stroke(); g.lineWidth = 1.2; g.beginPath(); archPath(560, 1018, 676, 936)(g); g.stroke(); g.restore();
  });
  layer(ctx, 1, g => figure(g, 'na_cos', lerpFr(framing('na_cos', 'knee', 0.76), framing('na_cos', 'bust', 0.74), E.inOutSine(u)), { rim: '#ffd0a0', rimSide: -1, glow: '#ffb040', glowA: 0.2 }));
  frameDeco(ctx, t, { fh: 120 });
}
function fivesFans(ctx, t, s) { // ほら今すぐに あたためて — five fans open on the beat around one candle
  const p = inv(s.a, 48.46, t);
  kaleBG(ctx, t, 'textile_461355', { tint: '#3a0408', tintA: 0.55 - p * 0.25, spin: 0.05 + p * 0.3 });
  layer(ctx, 0.6, g => lightRays(g, 960, 620, 1400, t * 0.2, 28, '#ffd08a', smooth(45, 47.8, t) * 0.6));
  const fans = ['fan_169859', 'fan_120720', 'fan_156754', 'fan_118755', 'fan_107571'];
  layer(ctx, 0.9, g => fans.forEach((f, k) => {
    const t0 = barT(Math.ceil(barF(s.a + 0.2))) + k * T.beat;
    fanOpen(g, M(f), 960 + (k - 2) * 360, 820 - Math.abs(k - 2) * 40, 430, E.outBack(clamp((t - t0) / 0.45)), { rot: (k - 2) * 0.12 });
  }));
  layer(ctx, 1, g => { obj(g, IMG.obj_fi_candle, 960, 930, 360, {}); glow(g, 960, 790, 260 + p * 520, '#ffb060', 0.6 + p * 0.4); });
  embers(ctx, t, Math.round(20 + 70 * p), 13, { a: 0.9, speed: 120 + 140 * p });
  frameDeco(ctx, t, { fh: 130 });
  wash(ctx, '#fff3e0', Math.pow(smooth(47.7, 48.46, t), 2) * 0.85, 'screen');
}

/* ------------------------------------------------------------ CHORUS 1 */
function chorusOpen(ctx, t, s) { // wide group medallion inside a turning lustre dish
  kaleBG(ctx, t, 'tile_477238', { tint: '#5a0612', tintA: 0.5, spin: 0.06 });
  layer(ctx, 0.5, g => lightRays(g, 1300, 520, 1500, t * 0.05, 30, '#ffd08a', 0.35));
  coverMedallion(ctx, t, s, { cx: 1300, cy: 520, R: 360, dish: 'dish_471762' });
  frameDeco(ctx, t, { fh: 130 });
  petals(ctx, t, 14, 9, { a: 0.9, speed: 110, wind: 80 });
}
function faceSlats(whos, src = 'cover') { return (ctx, t, s) => {
  layer(ctx, 0.3, g => { bg(g, '#1a0507'); tileWall(g, M('tile_187938'), 220, 0, t * 10, 0, 0.35); });
  const n = whos.length, pw = W / n;
  whos.forEach((w, k) => {
    const dir = k % 2 ? -1 : 1, off = (t - s.a) * 22 * dir;
    layer(ctx, 1, g => {
      withMask(g, rectPath(k * pw + 14, 50, pw - 28, H - 100), h => { cover(h, IMG.cover, [k * pw, -60 + off, pw, H + 120], 2.5, CF.cover[w][0], CF.cover[w][1] + 0.04); });
      g.save(); g.strokeStyle = GOLD; g.lineWidth = 3; g.strokeRect(k * pw + 14, 50, pw - 28, H - 100); g.restore();
    });
  });
  frameDeco(ctx, t, { fh: 110 });
}; }
function nagiCard(o = {}) { return (ctx, t, s) => {
  const u = uOf(t, s);
  layer(ctx, 0.9, g => cover(g, IMG.card_na, OS, lerp(o.z0 || 1.15, o.z1 || 1.3, E.inOutSine(u)), o.fx ?? 0.5, o.fy ?? 0.42));
  layer(ctx, 1, g => { radial(g, 960, 540, 1200, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(30,6,8,0.55)']]); });
  petals(ctx, t, 18, 21, { a: 1, speed: 120, wind: 140 });
  frameDeco(ctx, t, { fh: 120, fringe: o.fringe });
}; }
function fanCarousel(ctx, t, s) { // 今宵夢舞う 大胆に — fans whirl around the five faces
  kaleBG(ctx, t, 'dish_471807', { tint: '#4a0610', tintA: 0.45, spin: 0.25, zoom: 0.9 });
  const fans = ['fan_120720', 'fan_169859', 'fan_156754', 'fan_118755', 'fan_120731'];
  layer(ctx, 0.9, g => ORDER.forEach((w, k) => {
    const a = t * 0.6 + (k / 5) * TAU, x = 960 + Math.cos(a) * 640, y = 540 + Math.sin(a) * 300;
    fanOpen(g, M(fans[k]), x, y + 90, 300, 1, { rot: a + Math.PI / 2, shadow: false });
    withMask(g, circlePath(x, y, 88), h => cover(h, IMG.cover, [x - 88, y - 88, 176, 176], 4.6, CF.cover[w][0], CF.cover[w][1]));
    rings(g, x, y, [92], MEM[w].ink, 5, 1);
  }));
  layer(ctx, 1, g => withMask(g, circlePath(960, 540, 210), h => cover(h, IMG.cover, [750, 330, 420, 420], 1.6, 0.47, 0.36)));
  rings(ctx, 960, 540, [216, 232], GOLD, 2, 0.9);
  frameDeco(ctx, t, { fh: 120 });
}
function shinFire(ctx, t, s) {
  memberShot('shi', 'shi_cos', { textile: 'textile_216625', tint: '#4a0418', tintA: 0.45, from: 'bust', to: 'face', side: 0.56, halo: 'dish_201905', deco: false })(ctx, t, s);
  layer(ctx, 0.95, g => ink(g, IMG.ink_c1_blaze, '#ff6a2a', [0, 520, W, 560], 1.1, 0.5, 0.6, 0.55, 'screen'));
  layer(ctx, 1.3, g => { obj(g, IMG.obj_fi_r3, 200, 960, 420, { rot: 0.3 }); obj(g, IMG.obj_d_rose, 1760, 980, 440, { rot: -0.2 }); });
  embers(ctx, t, 50, 33, { a: 1, speed: 120 });
  frameDeco(ctx, t, { fh: 120 });
}
function coverWide(ctx, t, s, o = {}) { // pull-back reveal of the whole jacket in a gilded frame on a tile wall
  layer(ctx, 0.3, g => { bg(g, '#1a0507'); tileWall(g, M(o.tile || 'tile_187924'), 260, 0, 0, 0, 0.9); wash(g, '#2a0408', 0.45, 'multiply'); });
  layer(ctx, 0.9, g => {
    const fw = 700, fh = 700, x = 1330 - fw / 2, y = 540 - fh / 2;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 50; g.fillStyle = '#c8a05a'; g.fillRect(x - 34, y - 34, fw + 68, fh + 68); g.restore();
    g.fillStyle = '#2a1408'; g.fillRect(x - 12, y - 12, fw + 24, fh + 24);
    cover(g, IMG.cover, [x, y, fw, fh], 1.0, 0.5, 0.5);
    g.save(); g.strokeStyle = '#f2d9a6'; g.lineWidth = 2; g.strokeRect(x - 24, y - 24, fw + 48, fh + 48); g.restore();
  });
  petals(ctx, t, 16, 31, { a: 1, speed: 80 });
  frameDeco(ctx, t, { fh: 130, lace: 'm_lace_220632_mask', lh: 110 });
}

/* ------------------------------------------------------------ INTERLUDE: collage table, camera tracks across */
function guitarTable(ctx, t, s) {
  layer(ctx, 1, g => {
    g.save(); g.translate(-lerp(0, 1900, E.inOutSine(uOf(t, s))), 0);
    const kraft = IMG.paper_kraft; if (kraft) { g.drawImage(kraft, -200, -200, 2300, 1480); g.drawImage(kraft, 2100, -200, 2300, 1480); }
    const b = sd => boil(t, sd);
    obj(g, M('guitar_503385'), 820, 600, 900, { rot: -0.9 });
    obj(g, M('guitar_505283'), 2600, 560, 780, { rot: 0.35 });
    fanOpen(g, M('fan_120766'), 1480, 1060, 420, 1, { rot: 0.1 });
    obj(g, M('dish_468516'), 1900, 300, 380, { rot: t * 0.05 });
    piece(g, 3300, 520, 700, 460, { img: M('tile_187894'), z: 1.1, rot: 0.04, seed: 61 });
    ['c_yo', 'c_na', 'c_shi', 'c_to', 'c_ri'].forEach((k, j) => {
      const p = slap(t, 69.95 + j * T.bar * 0.75), hop = Math.abs(Math.sin((beatF(step(t)) + j * 0.5) * Math.PI)) * 22;
      sticker(g, IMG[k], 300 + j * 760, 260 - hop + (j % 2) * 520, 330 * p.s, { a: p.a, rot: (j % 2 ? 0.1 : -0.08) + p.r });
    });
    polaroid(g, IMG.cover, 2250, 760, 420, { rot: -0.08, z: 1.1, caption: '¡olé!', capColor: '#7a1f2a' });
    earrings(g, M('jewel_141739'), 3000, 900, 260, t, 1);
    tape(g, 2250, 520, 160, 0.2); tape(g, 3300, 280, 180, -0.2);
    scribble(g, t, 70.6, 'esta noche ♪', 1160, 160, 70, '#7a1f2a', -0.08, 0.9);
    doodle(g, 'swoosh', 1300, 230, 4, clamp((t - 71.2) / 0.6), '#7a1f2a', 5);
    g.restore();
  });
  frameDeco(ctx, t, { fh: 120, fringe: true });
}

/* ------------------------------------------------------------ VERSE 2: summer memories (private clothes, polaroids) */
function summerNagi(ctx, t, s) {
  const b = sd => boil(t, sd);
  layer(ctx, 0.5, g => { paperBG(g, 'paper_cream'); });
  layer(ctx, 0.8, g => {
    const p1 = slap(t, s.a), p2 = slap(t, s.a + 0.35), p3 = slap(t, Ls(24) - 0.2);
    polaroid(g, IMG.photo_v2_moonbeach, 520 + b(1)[0], 430 + b(1)[1], 560 * p1.s, { a: p1.a, rot: -0.08 + p1.r, z: 1.3, fx: 0.55, caption: 'summer night', filter: `${develop((t - s.a) / 2)} brightness(1.6)` });
    polaroid(g, null, 1250 + b(2)[0], 470 + b(2)[1], 640 * p2.s, { a: p2.a, rot: 0.05 + p2.r, caption: 'nagi', capColor: '#8a3a58',
      draw: (h, px, py, pw, ph) => { h.fillStyle = MEM.na.light; h.fillRect(px, py, pw, ph); h.filter = develop((t - s.a - 0.35) / 2.2); figure(h, 'na_casual', { x: px + pw * 0.5, y: py + ph * 0.42, fh: ph * 0.36 }, { shadow: false, floor: py + ph + 4 }); h.filter = 'none'; } });
    tape(g, 520, 130, 170, 0.05, undefined, p1.a); tape(g, 1250, 120, 170, -0.1, 'rgba(255,200,215,0.7)', p2.a);
    piece(g, 1500, 960, 900 * p3.s, 180 * p3.s, { img: IMG.photo_fi_sail, z: 1.6, fx: 0.5, fy: 0.62, rot: -0.02, seed: 55, a: p3.a });
    ['c_shi_swim', 'c_to_white', 'c_ri_resort'].forEach((k, j) => { const hop = Math.abs(Math.sin((beatF(step(t)) + j * 0.33) * Math.PI)) * 12; sticker(g, IMG[k], 1320 + j * 160, 950 - hop, 150, { a: p3.a, rot: (j - 1) * 0.08, shadow: 0.25, lift: 0.5 }); });
    scribble(g, t, Ls(24) + 0.6, 'ha ha ♪', 1700, 830, 46, '#3a5aa0', -0.05, 0.6);
  });
}
function summerYoshino(ctx, t, s) {
  const b = sd => boil(t, sd);
  layer(ctx, 0.5, g => paperBG(g, 'paper_peach'));
  layer(ctx, 0.8, g => {
    const p1 = slap(t, s.a), p2 = slap(t, s.a + 0.3), p3 = slap(t, Ls(26) - 0.2);
    polaroid(g, null, 600 + b(1)[0], 480 + b(1)[1], 640 * p1.s, { a: p1.a, rot: -0.05 + p1.r, caption: 'yoshino', capColor: '#7a5a50',
      draw: (h, px, py, pw, ph) => { h.fillStyle = MEM.yo.light; h.fillRect(px, py, pw, ph); h.filter = develop((t - s.a) / 2.2); figure(h, 'yo_swim', { x: px + pw * 0.42, y: py + ph * 0.4, fh: ph * 0.36 }, { shadow: false, floor: py + ph + 4 }); h.filter = 'none'; } });
    polaroid(g, IMG.photo_br_palms, 1380 + b(2)[0], 360 + b(2)[1], 480 * p2.s, { a: p2.a, rot: 0.07 + p2.r, z: 1.2, caption: 'la playa', filter: develop((t - s.a - 0.3) / 2) });
    earrings(g, M('jewel_206850'), 1040, 300, 300, t, p2.a);   // 揃いのピアス
    if (p3.a) { const ts = step(t), bob = k => Math.abs(Math.sin((beatF(ts) + k) * Math.PI)) * 26;
      sticker(g, IMG.c_yo_swim, 1520, 900 - bob(0), 250 * p3.s, { rot: -0.12 + Math.sin(ts * 6) * 0.06 });
      sticker(g, IMG.c_na_casual, 1700, 910 - bob(0.5), 250 * p3.s, { rot: 0.12 - Math.sin(ts * 6) * 0.06 });
      doodle(g, 'heart', 1610, 740, 1.5, clamp((t - Ls(26) - 0.2) / 0.5), MEM.na.ink, 4); }
  });
}

/* ------------------------------------------------------------ B2 (private pair) */
function tomoeKiss(ctx, t, s) {
  layer(ctx, 0.4, g => { bgGrad(g, [[0, '#2a1030'], [0.6, '#6a2a50'], [1, '#2a0c20']]); bokeh(g, t, 18, 61, ['#ffb0c8', '#ffd0a0', '#e8a0ff'], 1, 1.1); });
  const u = uOf(t, s);
  layer(ctx, 1, g => figure(g, 'to_white', lerpFr(framing('to_white', 'bust', 0.4), framing('to_white', 'face', 0.42), E.inOutSine(u)), { rim: '#ffd0e0', glow: '#ffb0c8', glowA: 0.3 }));
  layer(ctx, 1.5, g => fgBlur(g, IMG.obj_fi_r3, 1600, 820, 720, lerp(4, 16, u), 0.95, 0.2));
  petals(ctx, t, 12, 63, { a: 0.9, speed: 45, wind: 25, size: 0.9 });
}
function shinAway(ctx, t, s) { // 「連れ去って」: dolly down an Alhambra corridor
  const u = uOf(t, s);
  layer(ctx, 0, g => cover(g, duo(M('alhambra_263839'), '#140818', '#e8c0e8'), OS, lerp(1.05, 1.9, E.inQuad(u)), 0.5, 0.52));
  layer(ctx, 0.2, g => glow(g, 960, 560, 300 + u * 300, '#ffe0c8', 0.6));
  layer(ctx, 1, g => figure(g, 'shi_swim', framing('shi_swim', 'knee', 0.76), { rim: MEM.shi.light, rimSide: -1, glow: MEM.shi.ink, glowA: 0.25 }));
}

/* ------------------------------------------------------------ PRE-CHORUS 2 */
function riamuBells(ctx, t, s) { // wide: bell tower silhouette, camera tilts down
  layer(ctx, 0.3, g => { bgGrad(g, [[0, '#1a1036'], [0.7, '#3a2050'], [1, '#160c24']]); stars(g, t, 60, 71, [0, -200, W, 600], 0.6); });
  const hits = []; for (let k = Math.ceil(beatF(s.a) / 2) * 2; beatT(k) < 106.3; k += 2) hits.push(beatT(k));
  layer(ctx, 0.6, g => { hits.forEach(h => { const v = (t - h) / 2.4; if (v > 0 && v < 1) rings(g, 470, 520, [E.outCubic(v) * 1300], GOLD, 2 * (1 - v) + 0.5, 1 - v); }); place(g, tinted(IMG.obj_p2_bells, '#0c0818'), 470, 760, 700, {}); });
  layer(ctx, 1, g => figure(g, 'ri_cos', framing('ri_cos', 'knee', 0.72), { rim: MEM.ri.light, rimSide: -1, grade: '#4a3080', gradeA: 0.2 }));
}
function silence(ctx, t, s) {
  photoBG(ctx, 'alhambra_288043', '#06040c', '#4a3a6a', { z: 1.2, depth: 0.4 });
  layer(ctx, 0.5, g => stars(g, t, 60, 81, [0, 0, W, 500], 0.4 * (1 - smooth(110, 112, t))));
  const q = E.inOutSine(inv(s.a + 0.4, 110.4, t));
  layer(ctx, 1, g => { for (const sd of [-1, 1]) { glow(g, 960 + sd * lerp(420, 30, q), 520, 120, sd < 0 ? '#ffd0a0' : '#ffb0d0', 0.9); sparkle(g, 960 + sd * lerp(420, 30, q), 520, 0.8, 1); } });
  wash(ctx, '#fff0ff', Math.pow(smooth(111.7, 112.33, t), 2) * 0.85, 'screen');
}

/* ------------------------------------------------------------ CHORUS 2 (midnight) */
function morningStar(ctx, t, s) { nagiCard({ z0: 1.35, z1: 1.15, fx: 0.42, fy: 0.45, fringe: false })(ctx, t, s); layer(ctx, 0.9, g => { sparkle(g, 1640, 150, 2.6 + pulse(t, 4) * 0.4, 1); glow(g, 1640, 150, 260, '#e8d8ff', 0.6); }); }
function moonPavilion(ctx, t, s) {
  const u = uOf(t, s);
  layer(ctx, 0.2, g => { bgGrad(g, [[0, '#05040e'], [0.7, '#141038'], [1, '#2a1838']]); stars(g, t, 120, 93, [0, -100, W, H], 0.7); });
  layer(ctx, 0.5, g => { obj(g, IMG.obj_c2_moon, 1320, lerp(260, 470, E.inOutSine(u)), 440, { shadow: false }); glow(g, 1320, lerp(260, 470, u), 500, '#ffd8a0', 0.3); });
  layer(ctx, 1, g => { const im = M('alhambra_263835'); if (im) { const [c, b] = buf('moonpav'); cover(b, duo(im, '#06040e', '#7a6aa8'), [0, 300, W, 800], 1.0, 0.5, 0.78);
    b.globalCompositeOperation = 'destination-in'; const gr = b.createLinearGradient(0, 300, 0, 620); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); b.fillStyle = gr; b.fillRect(0, 0, W, H); g.drawImage(c, 0, 0); } });
}
function watches(ctx, t, s) { // 時は過ぎ行く 冷淡に — watches orbit and tick on the beat
  kaleBG(ctx, t, 'tile_187912', { tint: '#0a0818', tintA: 0.65, spin: 0 });
  const k = Math.floor(beatF(t)), fr = E.outExpo(clamp((beatF(t) - k) * 3)), rot = (k + fr) * (TAU / 24);
  const W5 = ['watch_207363', 'watch_195645', 'watch_187195', 'watch_194040', 'watch_194033'];
  layer(ctx, 0.9, g => W5.forEach((w, j) => { const a = (j / 5) * TAU + rot * 0.5; obj(g, M(w), 960 + Math.cos(a) * 560, 540 + Math.sin(a) * 300, 260, { rot: Math.sin(t + j) * 0.2 }); }));
  layer(ctx, 1, g => { withMask(g, circlePath(960, 540, 240), h => cover(h, IMG.card_na, [720, 300, 480, 480], 2.3, CF.cardNa.na[0], CF.cardNa.na[1] - 0.04)); rings(g, 960, 540, [246, 262], GOLD, 2, 0.9);
    for (let j = 0; j < 60; j++) { const a = (j / 60) * TAU - rot; g.save(); g.strokeStyle = GOLD; g.globalAlpha = 0.6; g.lineWidth = j % 5 ? 1 : 3; g.beginPath(); g.moveTo(960 + Math.cos(a) * 280, 540 + Math.sin(a) * 280); g.lineTo(960 + Math.cos(a) * (j % 5 ? 296 : 312), 540 + Math.sin(a) * (j % 5 ? 296 : 312)); g.stroke(); g.restore(); } });
}
function bubbles(ctx, t, s) {
  layer(ctx, 0.8, g => { cover(g, IMG.card_yo, OS, lerp(1.2, 1.08, uOf(t, s)), 0.55, 0.42); wash(g, '#1e0a32', 0.3, 'multiply'); });
  layer(ctx, 1.1, g => { for (let i = 0; i < 9; i++) {
    const sp = 60 + hash(i, 5) * 60, life = (H + 400) / sp, ph = hash(i, 6) * life, v = ((t + ph) % life) / life;
    const x = 200 + hash(i, 7) * 1500 + Math.sin(t + i) * 30, y = H + 200 - v * (H + 400), r = 50 + hash(i, 8) * 110;
    withMask(g, circlePath(x, y, r), h => cover(h, IMG.card_yo, [x - r, y - r, r * 2, r * 2], 3.2, CF.cardYo.yo[0], CF.cardYo.yo[1]));
    const ir = g.createLinearGradient(x - r, y - r, x + r, y + r); ir.addColorStop(0, '#ffd0f0'); ir.addColorStop(0.4, '#b0e0ff'); ir.addColorStop(0.75, '#fff2b0'); ir.addColorStop(1, '#ff9ad0');
    g.save(); g.strokeStyle = ir; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, r * 0.85, Math.PI * 1.1, Math.PI * 1.45); g.stroke(); g.restore(); } });
}
function guitarMacro(ctx, t, s) { // Canción de amor: the camera glides along an inlaid Baroque guitar
  layer(ctx, 0.3, g => { bg(g, '#0c0604'); glow(g, 900, 560, 800, '#ffb060', 0.3); });
  layer(ctx, 1, g => obj(g, M('guitar_503932'), lerp(1300, 700, uOf(t, s)), 560, 1700, { rot: -1.25, shadow: false }));
  embers(ctx, t, 30, 101, { a: 0.6, speed: 60 });
}

/* ------------------------------------------------------------ DANCE BREAK */
function danceWall(ctx, t, s) { // wide, intentional full figure: shadow thrown across a fire-lit tile wall
  layer(ctx, 0.3, g => { bg(g, '#080304'); kaleido(g, M('tile_187924'), { n: 8, rot: t * 0.05, R: 1500, cy: 620, zoom: 1.2 }); wash(g, '#ff8a40', 0.35, 'soft-light');
    radial(g, 960, 1150, 1300, [[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0.92)']]); });
  const sway = Math.sin((t - 133.62) * Math.PI / T.beat / 4) * 0.035, fl = 0.85 + 0.15 * noise1(t * 5, 9);
  layer(ctx, 0.5, g => { g.save(); g.filter = 'blur(14px)'; g.globalAlpha = 0.7 * fl; place(g, tinted(IMG.na_cos, '#0a0204'), 1260, 470, 1650, { rot: sway * 1.8 }); g.restore(); });
  layer(ctx, 0.9, g => ink(g, IMG.ink_c1_blaze, '#ff7a2a', [0, 620, W, 460], 1.05, 0.5, 0.7, 0.85, 'screen'));
  layer(ctx, 1, g => figure(g, 'na_cos', framing('na_cos', 'wide', 0.45, { h: 1000 }), { glow: '#ff7a3c', glowA: 0.45, rim: '#ffb070', rot: sway * 0.3 }));
  embers(ctx, t, 40, 41, { a: 0.85, speed: 130 });
}
const KALE = { yo: 'tile_477238', na: 'textile_461355', shi: 'textile_230357', to: 'tile_187927', ri: 'tile_187929' };
const rollCall = (who, size) => (ctx, t, s) => {
  const m = MEM[who], u = t - s.a;
  kaleBG(ctx, t, KALE[who], { tint: m.deep, tintA: 0.5, spin: 0.15 });
  layer(ctx, 0.6, g => { g.save(); g.font = font(F.anton, 420, 400); g.textBaseline = 'middle'; g.strokeStyle = rgba(m.light, 0.45); g.lineWidth = 3; const nw = g.measureText(m.name + ' ').width; for (let x = -((u * 260) % nw) - 200; x < W + 200; x += nw) g.strokeText(m.name + ' ', x, 560); g.restore(); });
  const fr = lerpFr(framing(COS[who], size[0], 0.66), framing(COS[who], size[1], 0.66), E.outCubic(clamp(u / T.bar)));
  layer(ctx, 0.85, g => halo(g, M(['dish_471811', 'dish_471739', 'dish_468516', 'dish_201662', 'dish_471790'][ORDER.indexOf(who)]), fr.x, fr.y, fr.fh * 1.3, t, 0.9, 0.2));
  layer(ctx, 1, g => figure(g, COS[who], fr, { rim: m.light, rimSide: -1 }));
  const p = E.outExpo(clamp(u / 0.5));
  label(ctx, m.name, 150 - (1 - p) * 200, 780, { fam: F.anton, size: 110, color: IV, track: 0.06, alpha: p });
  label(ctx, `${m.jp}　CV.${m.cv}`, 156, 866, { size: 28, weight: 700, color: IV, track: 0.12, alpha: smooth(s.a + 0.2, s.a + 0.6, t) });
  frameDeco(ctx, t, { fh: 120 });
};
function chibiStage(ctx, t, s) {
  layer(ctx, 0.3, g => { bgGrad(g, [[0, '#0c0610'], [1, '#2a0c14']]); tileWall(g, M('tile_187938'), 200, 0, 0, 0, 0.25); });
  layer(ctx, 1, g => {
    ORDER.forEach((w, k) => {
      const x = 260 + k * 350, on = Math.floor(beatF(t)) % 5 === k;
      const lg = g.createLinearGradient(x - 160, 0, x + 160, 0); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.5, rgba(MEM[w].ink, on ? 0.6 : 0.3)); lg.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = lg; g.fillRect(x - 160, -200, 320, H + 400); g.restore();
      const hop = Math.abs(Math.sin((beatF(t) + k * 0.5) * Math.PI)) * 40, img = IMG['c_' + w + '_plain'];
      if (img) place(g, img, x, 700 - hop, 420, {});
      fanOpen(g, M(['fan_169859', 'fan_120720', 'fan_120449', 'fan_156754', 'fan_120731'][k]), x + 100, 820 - hop, 170, 0.5 + 0.5 * Math.abs(Math.sin((beatF(t) + k) * Math.PI / 2)), { rot: 0.3, shadow: false });
    });
    g.fillStyle = '#1a0a08'; g.fillRect(-200, 920, W + 400, 360);
  });
  frameDeco(ctx, t, { fh: 140 });
  drawText(ctx, t, '¡BAILE!', { x: 960, y: 200, align: 'center', size: 140, fontStr: font(F.anton, 140, 400), fill: GOLD, track: 0.1, anim: 'zoom', start: s.a + 0.2, stagger: 0.08, dur: 0.35 });
}
function buildCuts(ctx, t, s) {
  const k = Math.floor((t - barT(82) + 0.01) / (T.bar / 2)), w = ORDER[k % 5];
  kaleBG(ctx, t, ['tile_187933', 'tile_187916', 'dish_471810', 'tile_477238', 'textile_446534'][k % 5], { tint: MEM[w].deep, tintA: 0.45, spin: 0.5 });
  layer(ctx, 1, g => { withMask(g, circlePath(960, 540, 400 + (t - s.a) * 6), h => cover(h, IMG.cover, [560, 140, 800, 800], 2.6, CF.cover[w][0], CF.cover[w][1])); rings(g, 960, 540, [410 + (t - s.a) * 6], GOLD, 3, 1); });
  wash(ctx, '#fff3e0', Math.pow(smooth(165.6, 166.53, t), 2) * 0.9, 'screen');
}

/* ------------------------------------------------------------ BRIDGE (dawn, private clothes) */
function dawnSky(ctx, t, p = 0) {
  layer(ctx, 0.2, g => {
    const c = (a, b) => { const q = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], x = q(a), y = q(b); return `rgb(${lerp(x[0], y[0], p) | 0},${lerp(x[1], y[1], p) | 0},${lerp(x[2], y[2], p) | 0})`; };
    bgGrad(g, [[0, c('#4a3a7a', '#7a5a9a')], [0.45, c('#e08a8a', '#f4a88a')], [0.62, c('#ffd0a0', '#ffe2b8')], [0.63, '#f2b89a'], [1, '#5a3048']]);
    glow(g, 960, lerp(700, 600, p), 900, '#fff0d0', 0.7); g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(960, lerp(700, 600, p), 80, 0, TAU); g.fill();
    g.save(); g.globalCompositeOperation = 'screen'; for (let k = 0; k < 40; k++) { const y = 690 + Math.pow(k / 40, 1.6) * 390, w = 30 + k * 18; g.globalAlpha = 0.25 * (0.6 + 0.4 * Math.sin(t * 2 + k)); g.fillStyle = '#fff2d8'; g.fillRect(960 - w / 2 + Math.sin(t + k) * 20, y, w, 2 + k * 0.08); } g.restore();
  });
}
function profiles(ctx, t, s) { // ふたりの横顔: two-shot, private clothes, medium
  dawnSky(ctx, t, inv(166.5, 191, t));
  layer(ctx, 1, g => {
    figure(g, 'na_casual', framing('na_casual', 'bust', 0.3, { k: 0.85 }), { rim: '#ffe0b0', grade: '#ffb080', gradeA: 0.16, gradeOp: 'soft-light', a: smooth(s.a, s.a + 0.8, t) });
    figure(g, 'yo_swim', framing('yo_swim', 'bust', 0.72, { k: 0.85 }), { flip: true, rim: '#ffe0b0', rimSide: -1, grade: '#ffb080', gradeA: 0.16, gradeOp: 'soft-light', a: smooth(Ls(41) - 0.3, Ls(41) + 0.5, t) });
  });
}
function cufflink(ctx, t, s) { // extreme close-up on her hands holding on, then tilt up to her face
  const u = E.inOutSine(uOf(t, s));
  layer(ctx, 1, g => cover(g, IMG.card_yo, OS, lerp(3.0, 2.2, u), lerp(CF.cardYo.hands[0], CF.cardYo.yo[0] - 0.03, u), lerp(CF.cardYo.hands[1], CF.cardYo.yo[1], u)));
  wash(ctx, '#ffb080', 0.25, 'soft-light'); wash(ctx, '#fff0e0', 0.12, 'screen');
  layer(ctx, 1.2, g => sparkle(g, 900, 640, 1.3 + 0.3 * Math.sin(t * 5), 1 - u));
}
function mist(ctx, t, s) {
  layer(ctx, 0.3, g => { bgGrad(g, [[0, '#cbb8e0'], [0.6, '#f0d0d8'], [1, '#f8e0d0']]); for (let k = 0; k < 6; k++) glow(g, ((k * 400 + t * 30) % 2400) - 240, 600 + Math.sin(k) * 200, 500, '#ffffff', 0.25); });
  layer(ctx, 1, g => figure(g, 'to_white', lerpFr(framing('to_white', 'knee', 0.46), framing('to_white', 'bust', 0.45), E.inOutSine(uOf(t, s))), { rim: '#ffffff', glow: '#ffffff', glowA: 0.35 }));
  const gr = ctx.createLinearGradient(1300, 0, W, 0); gr.addColorStop(0, 'rgba(60,30,60,0)'); gr.addColorStop(1, 'rgba(60,30,60,0.55)'); ctx.fillStyle = gr; ctx.fillRect(1300, 0, W - 1300, H);
  layer(ctx, 1.4, g => { for (let k = 0; k < 4; k++) glow(g, ((k * 600 - t * 50) % 2600 + 2600) % 2600 - 300, 900, 600, '#ffffff', 0.3); });
}
function embrace(ctx, t, s) {
  dawnSky(ctx, t, inv(166.5, 191, t));
  const hug = smooth(Ls(46) - 0.2, Ls(46) + 0.8, t);
  layer(ctx, 1, g => { figure(g, 'shi_swim', lerpFr(framing('shi_swim', 'bust', 0.5), framing('shi_swim', 'face', 0.5), E.inOutSine(uOf(t, s))), { glow: '#ffd0a0', glowA: 0.3 + hug * 0.5, rim: '#ffe0c0' });
    rings(g, 960, 520, [lerp(900, 430, hug), lerp(940, 460, hug)], '#fff0d8', 2, hug * 0.8); glow(g, 960, 520, 600 + hug * 300, '#fff4e0', hug * 0.5); });
}

/* ------------------------------------------------------------ ESPECIAL (editorial) */
const ESP = [[191.3, 'card_yo', CF.cardYo.yo, 'yo'], [198.7, 'card_na', CF.cardNa.na, 'na'], [202.2, 'cover', CF.cover.shi, 'shi']];
function especial(ctx, t, s) {
  let cur = ESP[0]; for (const e of ESP) if (t >= e[0]) cur = e;
  const [t0, img, f, who] = cur, m = MEM[who], a = E.outCubic(clamp((t - t0) / 0.45));
  textileBG(ctx, 'textile_222561', { z: 1.1, tint: '#1a0206', tintA: 0.35 });
  layer(ctx, 0.5, g => { obj(g, M('shawl_157896'), 330, 230, 640, { rot: -0.1, a: 0.95 }); g.save(); g.font = font(F.anton, 300, 400); g.textBaseline = 'middle'; g.fillStyle = rgba('#f2d9a6', 0.85); g.translate(110, 560); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('ESPECIAL', 0, 0); g.restore(); });
  layer(ctx, 0.9, g => {
    const fx = 1110, fy = 120, fw = 620, fh = 820;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 40; g.fillStyle = '#f6efe0'; g.fillRect(fx - 26, fy - 26, fw + 52, fh + 110); g.restore();
    g.save(); g.beginPath(); g.rect(fx, fy + fh * (1 - a), fw, fh * a); g.clip(); cover(g, IMG[img], [fx, fy, fw, fh], img === 'cover' ? 2.4 : 2.1, f[0], f[1]); g.restore();
    label(g, m.name, fx + fw, fy + fh + 48, { fam: F.anton, size: 32, color: '#2a1414', track: 0.2, align: 'right', alpha: a });
    g.fillStyle = m.ink; g.fillRect(fx, fy + fh + 34, 90 * a, 8);
    earrings(g, M('jewel_206840'), fx - 60, fy + 120, 240, t, a);
  });
  if (t > 194.9 && t < 199) { const p = smooth(194.9, 195.4, t) * (1 - smooth(198.4, 198.9, t));
    layer(ctx, 1.1, g => drawText(g, t, '熱情', { x: 640, y: 110, vertical: true, size: 380, fontStr: font(F.dela, 380, 400), fill: '#f6efe0', glow: 'rgba(255,40,60,0.45)', glowBlur: 36, anim: 'zoom', start: 195.0, stagger: 0.14, dur: 0.4, alpha: p })); }
  frameDeco(ctx, t, { fh: 130 });
  wash(ctx, '#ffe8c8', Math.pow(smooth(207.8, 209.11, t), 2) * 0.7, 'screen');
}

/* ------------------------------------------------------------ FINAL CHORUS (dawn bloom) */
function amanecer(ctx, t, s) { // look up into a painted sky dome at dawn
  layer(ctx, 0.4, g => { g.save(); g.translate(960, 540); g.rotate(t * 0.03); g.translate(-960, -540); cover(g, M('ceiling_386262'), [-300, -500, W + 600, H + 1000], 1.0, 0.5, 0.5); g.restore(); wash(g, '#ffb070', 0.2, 'soft-light'); });
  coverMedallion(ctx, t, s, { cx: 960, cy: 560, R: 330, dish: 'dish_468513' });
  layer(ctx, 0.7, g => lightRays(g, 960, 560, 1500, t * 0.06, 30, '#fff0c8', 0.4));
  petals(ctx, t, 14, 19, { a: 1, speed: 100 });
}
function lineup(ctx, t, s) { // five faces in Moorish arches
  layer(ctx, 0.3, g => { bg(g, '#3a1408'); tileWall(g, M('tile_187924'), 240, 0, 0, 0, 0.6); wash(g, '#ffb070', 0.2, 'soft-light'); });
  const pw = W / 5;
  ORDER.forEach((w, k) => { const u = E.outExpo(clamp((t - s.a - k * 0.1) / 0.6)), x = k * pw + pw / 2;
    layer(ctx, 1, g => { withMask(g, archPath(x, 1000 + (1 - u) * 600, pw - 40, 820), h => { bg(h, MEM[w].deep); figure(h, COS[w], framing(COS[w], 'face', (k + 0.5) / 5, { k: 0.7, y: 470 + (1 - u) * 600 }), { rim: MEM[w].light, shadow: false }); });
      g.save(); g.strokeStyle = GOLD; g.lineWidth = 3; g.beginPath(); archPath(x, 1000 + (1 - u) * 600, pw - 40, 820)(g); g.stroke(); g.restore(); }); });
  frameDeco(ctx, t, { fh: 120 });
}
function bloom(ctx, t, s) { // 繚乱: painted roses and real roses bloom on a collage
  layer(ctx, 0.4, g => { paperBG(g, 'paper_peach'); cover(g, M('rose_337713'), OS, 1.1, 0.5, 0.5, 0.5); });
  const roses = [IMG.obj_d_rose, IMG.obj_fi_r3, IMG.obj_fi_r7];
  layer(ctx, 0.9, g => { const p = slap(t, s.a + 0.1); piece(g, 960, 520, 620 * p.s, 620 * p.s, { img: IMG.cover, z: 1.25, fx: 0.48, fy: 0.38, rot: -0.03, seed: 77, a: p.a }); });
  layer(ctx, 1.1, g => { for (let i = 0; i < 16; i++) { const at = s.a + (i / 16) * 2.4, p = E.outBack(clamp((t - at) / 0.5)); if (p <= 0) continue; const a = (i / 16) * TAU + 0.3, r = 470 + (i % 3) * 110; obj(g, roses[i % 3], 960 + Math.cos(a) * r * 1.4, 540 + Math.sin(a) * r * 0.8, (150 + (i % 4) * 40) * p, { rot: a + t * 0.1 }); } });
  petals(ctx, t, 20, 17, { a: 1, speed: 120, wind: 70 });
}
function duoGroups(ctx, t, s) { // (to+ri) | (yo+na+shi) — costume set, faces
  const k = E.inOutExpo(clamp((t - (ch(61, 5) - 0.3)) / 0.5));
  layer(ctx, 0.3, g => bg(g, '#1a0508'));
  const panel = (keys, x0, w0) => g => { kaleido(g, M('tile_187927'), { n: 10, rot: t * 0.1, R: 900, cx: x0 + w0 / 2, cy: 540 }); wash(g, '#3a0610', 0.45, 'multiply');
    keys.forEach((key, j) => figure(g, key, framing(key, 'bust', (x0 + w0 * (j + 0.5) / keys.length) / W, { k: 0.85 }), { shadow: false, rim: IV, rimA: 0.4 })); };
  layer(ctx, 1, g => {
    withMask(g, rectPath(-10, -10, W * 0.42, H + 20, 80), panel(['to_cos', 'ri_cos'], 0, W * 0.42));
    withMask(g, rectPath(W * 0.42 + (1 - k) * W * 0.6, -10, W, H + 20, 80), panel(['yo_cos', 'na_cos', 'shi_cos'], W * 0.42, W * 0.58));
  });
  frameDeco(ctx, t, { fh: 120 });
}
function candleOut(ctx, t, s) {
  const out = smooth(233.3, 233.75, t);
  layer(ctx, 0.3, g => { bgGrad(g, [[0, '#2a2038'], [1, '#4a3048']]); g.save(); g.globalAlpha = 0.3 * (1 - out * 0.5); cover(g, IMG.cover, OS, 1.35, 0.5, 0.36); g.restore(); wash(g, '#2a2040', 0.35, 'multiply'); });
  layer(ctx, 1, g => { obj(g, IMG.obj_fi_candle, 960, 820, 520, { filter: `brightness(${1 - out * 0.45})` }); glow(g, 958, 640, 300, '#ffb060', 0.8 * (1 - out));
    const u = t - 233.45; if (u > 0) { g.save(); g.globalCompositeOperation = 'screen'; for (let i = 0; i < 60; i++) { const age = u - i * 0.05; if (age <= 0 || age > 3) continue; const y = 650 - age * 150, x = 958 + noise1(age * 0.9 + i * 0.1, 7) * age * 60, r = 6 + age * 30; g.globalAlpha = 0.18 * (1 - age / 3); g.drawImage(softDot('#e8e0f0', 64), x - r, y - r, r * 2, r * 2); } g.restore(); } });
  wash(ctx, '#c8b8e8', out * 0.25, 'screen');
}
function finalPale(ctx, t, s) { // morning: the night becomes a photograph — the jacket develops as a polaroid on lace
  layer(ctx, 0.4, g => { paperBG(g, 'paper_peach'); const m = IMG.m_lace_223050_mask; if (m) cover(g, tinted(m, '#fffaf2'), OS, 1.0, 0.5, 0.5, 0.75); wash(g, '#f6d8e8', 0.25, 'screen'); });
  layer(ctx, 0.8, g => { fanOpen(g, M('fan_209646'), 260, 1000, 420, 1, { rot: -0.3 }); obj(g, IMG.obj_d_rose, 1780, 930, 300, { rot: 0.4 }); earrings(g, M('jewel_206855'), 900, 300, 260, t, 1); });
  layer(ctx, 1, g => { polaroid(g, IMG.cover, 1360, 500, 600, { rot: 0.05, z: 1.05, fx: 0.5, fy: 0.45, caption: 'Lleno de amor', capColor: '#7a1f2a', filter: develop((t - s.a) / 2.6) }); tape(g, 1360, 140, 200, 0.06); });
  wash(ctx, '#fff4e8', 0.12, 'screen');
}

/* ------------------------------------------------------------ OUTRO (polaroid wall) */
function credits(ctx, t, s) {
  layer(ctx, 0.5, g => paperBG(g, 'paper_cream'));
  const per = (249.75 - 238.14) / 5;
  layer(ctx, 0.85, g => {
    scribble(g, t, s.a + 0.5, 'después de la noche…', 120, 110, 60, '#7a1f2a', -0.03, 1.2);
    doodle(g, 'swoosh', 330, 165, 4.2, clamp((t - s.a - 1.6) / 0.6), '#7a1f2a', 4);
    ORDER.forEach((w, k) => {
      const t0 = s.a + k * per, p = slap(t, t0 + 0.1); if (!p.a) return;
      const x = 250 + k * 355, y = 450 + (k % 2) * 50, bo = boil(t, k), key = PRIV[w];
      polaroid(g, null, x + bo[0], y + bo[1], 340 * p.s, { rot: (k % 2 ? 0.05 : -0.05) + p.r, caption: ['buenos días', 'see you ♪', 'sweet ♡', 'gracias', 'yay!'][k], capColor: MEM[w].deep,
        draw: (h, px, py, pw, ph) => { h.fillStyle = MEM[w].light; h.fillRect(px, py, pw, ph); h.filter = develop((t - t0) / 2); figure(h, key, { x: px + pw * 0.5, y: py + ph * 0.42, fh: ph * 0.36 }, { shadow: false, floor: py + ph + 4 }); h.filter = 'none'; } });
      tape(g, x, y - 210, 120, (k % 2 ? 0.2 : -0.2), undefined, p.a);
      sticker(g, IMG[{ yo: 'c_yo_swim', na: 'c_na_casual', shi: 'c_shi_swim', to: 'c_to_white', ri: 'c_ri_resort' }[w]], x + 125, y + 250, 180, { a: p.a, rot: 0.1 });
      label(g, MEM[w].jp, x - 145, y + 240, { size: 26, weight: 700, color: '#2a1a1a', alpha: smooth(t0 + 0.3, t0 + 0.7, t) });
      label(g, 'CV.' + MEM[w].cv, x - 145, y + 274, { fam: F.klee, size: 20, color: MEM[w].deep, alpha: smooth(t0 + 0.4, t0 + 0.8, t) });
    });
  });
  frameDeco(ctx, t, { fh: 110, fringe: false, lace: 'm_lace_220632_mask', lh: 100, laceColor: '#fbf4e8' });
}
function endCard(ctx, t, s) {
  textileBG(ctx, 'textile_222561', { z: 1.1, tint: '#1a0206', tintA: 0.5 });
  layer(ctx, 0.6, g => fanOpen(g, M('fan_170045'), 960, 760, 520, E.inOutCubic(inv(250.0, 251.2, t)), { a: 0.9 }));
  layer(ctx, 1, g => ORDER.forEach((w, k) => { const x = 560 + k * 200, hop = Math.abs(Math.sin((beatF(t) + k * 0.3) * Math.PI)) * 10 * (t < 262 ? 1 : 0), img = IMG['c_' + w + '_plain'];
    if (img) place(g, img, x, 840 - hop, 250, { a: smooth(250.3 + k * 0.15, 250.8 + k * 0.15, t) }); }));
  drawText(ctx, t, '熱情エナモラル', { x: 960, y: 300, align: 'center', size: 96, fontStr: font(F.mincho, 96, 800), fill: IV, glow: 'rgba(255,170,90,0.35)', glowBlur: 20, track: 0.08, anim: 'blur', start: 250.2, stagger: 0.08, dur: 0.9 });
  drawText(ctx, t, 'Fin', { x: 960, y: 430, align: 'center', size: 110, fontStr: font(F.script, 110, 400), fill: GOLD, glow: 'rgba(255,170,90,0.5)', glowBlur: 22, anim: 'ink', start: 251.3, stagger: 0.15, dur: 0.5 });
  frameDeco(ctx, t, { fh: 130 });
  label(ctx, 'THE IDOLM@STER CINDERELLA MASTER  Passion jewelries! 004', 960, 990, { fam: F.cinzel, size: 15, weight: 600, color: IV, track: 0.3, align: 'center', alpha: smooth(252, 252.8, t) * 0.85 });
  label(ctx, 'fan-made lyric video  ·  decorative art: The Metropolitan Museum of Art (Open Access, CC0)  ·  photos: Open Images (CC BY 2.0) — see CREDITS', 960, 1030, { fam: F.corm, size: 18, italic: true, color: GOLD, align: 'center', alpha: smooth(253, 253.8, t) * 0.75 });
}

/* ------------------------------------------------------------ timeline */
export let SHOTS = [];
export function build() {
  const S = [], add = (a, draw, cam = {}, tr = 'cut', td = 0, x = {}) => S.push({ a, draw, cam, tr, td, ...x });
  add(0, overture, { z: [1.0, 1.08] });
  add(Ls(0) - 0.26, chantShot('yo', 0, 'R', 'tile_477238', 'dish_471811', 'fan_169733', ['knee', 'bust']), { z: [1.04, 1.1], x: [20, -20] }, 'fan', 0.3, { tro: { color: '#7a6e68' } });
  add(Ls(1) - 0.24, chantShot('na', 1, 'L', 'textile_461355', 'dish_471807', 'fan_120720', ['face', 'face']), { z: [1.1, 1.04], r: [0.02, -0.01] }, 'fan', 0.3, { tro: { color: MEM.na.ink } });
  add(Ls(2) - 0.24, chantShot('shi', 2, 'R', 'textile_230357', 'dish_201905', 'fan_120449', ['bust', 'bust']), { z: [1.04, 1.1], y: [20, -10] }, 'fan', 0.3, { tro: { color: MEM.shi.ink } });
  add(Ls(3) - 0.26, oleShot, { z: [1.18, 1.0], ease: E.outExpo, dur: 0.6 });
  add(9.75, titleCollage, { z: [1.02, 1.1], x: [30, -50], r: [0.01, -0.01] }, 'flash', 0.5);
  add(15.9, tomoeWide, { z: [1.06, 1.14], y: [-40, 30] }, 'dissolve', 0.9);
  add(19.95, tomoeClose, { z: [1.04, 1.1], x: [-10, 20] }, 'dissolve', 0.5);
  add(23.45, riamuCold, { z: [1.05, 1.1], r: [-0.015, 0.015] }, 'lace', 0.6);
  add(27.45, riamuWarm, { z: [1.04, 1.12] }, 'dissolve', 0.6);
  add(30.3, vanity, { z: [1.06, 1.12], x: [60, -60] }, 'sheet', 0.4);
  add(34.75, deepRed, { z: [1.12, 1.04], ease: E.outCubic }, 'sheet', 0.3, { tro: { dir: -1 } });
  add(36.4, navyEve, { z: [1.04, 1.08], x: [40, -40] }, 'sheet', 0.3);
  add(38.45, nagiMirror, { z: [1.04, 1.1], x: [-30, 30] }, 'iris', 0.6, { tro: { color: GOLD } });
  add(42.3, fivesFans, { z: [1.02, 1.25], ease: E.inQuad }, 'dissolve', 0.6);
  add(48.46, chorusOpen, { z: [1.3, 1.04], ease: E.outExpo, dur: 1.4 }, 'cut', 0, { kick: 0.8 });
  add(Ls(16) - 0.1, faceSlats(['na', 'shi', 'yo', 'to', 'ri']), { y: [-30, 30], z: [1.06, 1.06] }, 'slats', 0.4);
  add(Ls(17) - 0.1, nagiCard({ z0: 1.6, z1: 1.35, fx: CF.cardNa.na[0], fy: CF.cardNa.na[1] - 0.05 }), { r: [0.02, -0.01] }, 'whip', 0.3);
  add(Ls(18) - 0.1, fanCarousel, { r: [-0.03, 0.03], z: [1.04, 1.1] }, 'iris', 0.35);
  add(Ls(19) - 0.1, splitShot({ who: 'to', key: 'to_cos', kale: 'tile_187927' }, { who: 'na', key: 'na_cos', kale: 'textile_461355' }, ch(19, 5), { halo: ['dish_471790', 'dish_471807'] }), { z: [1.04, 1.08] }, 'cut', 0, { kick: 0.4 });
  add(Ls(20) - 0.1, splitShot({ who: 'ri', key: 'ri_cos', kale: 'tile_187929' }, { who: 'yo', key: 'yo_cos', kale: 'tile_477238' }, ch(20, 5), { halo: ['dish_471739', 'dish_471811'] }), { z: [1.04, 1.08] }, 'cut', 0, { kick: 0.4 });
  add(Ls(21) - 0.1, shinFire, { z: [1.04, 1.12] }, 'fan', 0.35, { tro: { color: MEM.shi.ink } });
  add(Ls(22) - 0.15, coverWide, { z: [1.35, 1.0], ease: E.outCubic }, 'dissolve', 0.5);
  add(69.75, guitarTable, { z: [1.04, 1.04] }, 'sheet', 0.45);
  add(79.43, summerNagi, { z: [1.04, 1.1], x: [40, -40] }, 'sheet', 0.4, { tro: { dir: -1 } });
  add(87.5, summerYoshino, { z: [1.04, 1.1], x: [-40, 40] }, 'sheet', 0.4);
  add(94.37, tomoeKiss, { z: [1.02, 1.08] }, 'dissolve', 0.6);
  add(98.3, shinAway, { z: [1.02, 1.06] }, 'dissolve', 0.5);
  add(102.62, riamuBells, { y: [-120, 40], z: [1.1, 1.06] }, 'lace', 0.5);
  add(106.25, silence, { z: [1.04, 1.18] }, 'dissolve', 0.6);
  add(112.33, morningStar, { z: [1.08, 1.02] }, 'flash', 0.5, { tro: { color: '#f0e0ff' } });
  add(Ls(33) - 0.1, moonPavilion, { y: [-60, 40] }, 'dissolve', 0.4);
  add(Ls(34) - 0.1, faceSlats(['yo', 'na', 'shi', 'to', 'ri']), { y: [30, -30] }, 'slats', 0.35);
  add(Ls(35) - 0.1, watches, { r: [0, -0.06], z: [1.04, 1.1] }, 'iris', 0.4);
  add(Ls(36) - 0.1, splitShot({ who: 'shi', key: 'shi_cos', kale: 'textile_230357' }, { who: 'to', key: 'to_cos', kale: 'tile_187927' }, ch(36, 5), { grade: '#2a3080', gradeA: 0.15 }), {}, 'cut', 0, { kick: 0.4 });
  add(Ls(37) - 0.1, splitShot({ who: 'na', key: 'na_cos', kale: 'textile_461355' }, { who: 'ri', key: 'ri_cos', kale: 'tile_187929' }, ch(37, 5), { grade: '#2a3080', gradeA: 0.15 }), {}, 'cut', 0, { kick: 0.4 });
  add(Ls(38) - 0.1, bubbles, { z: [1.02, 1.1] }, 'dissolve', 0.4);
  add(Ls(39) - 0.15, guitarMacro, { z: [1.04, 1.04] }, 'dissolve', 0.5);
  add(133.62, danceWall, { z: [1.12, 1.02], ease: E.outCubic }, 'fan', 0.5, { tro: { color: MEM.na.ink } });
  const sizes = [['bust', 'face'], ['bust', 'face'], ['knee', 'bust'], ['face', 'face'], ['bust', 'face']];
  const cams = [{ z: [1.04, 1.12] }, { x: [60, -60] }, { r: [0.03, -0.03] }, { y: [40, -40] }, { z: [1.12, 1.02] }];
  ORDER.forEach((w, j) => add(barT(73 + j), rollCall(w, sizes[j]), cams[j], 'slats', 0.35));
  add(barT(78), chibiStage, { z: [1.02, 1.08] }, 'iris', 0.4);
  add(barT(82), buildCuts, { z: [1.04, 1.04] }, 'cut', 0, { kick: 0.6 });
  for (let j = 1; j < 8; j++) add(barT(82) + j * T.bar / 2, buildCuts, { z: [1.04 + j * 0.02, 1.06 + j * 0.02] }, 'cut', 0, { kick: 0.4 });
  add(166.53, profiles, { x: [40, -40], z: [1.04, 1.08] }, 'flash', 0.8, { tro: { color: '#fff4e0' } });
  add(174.35, cufflink, {}, 'dissolve', 0.6);
  add(180.85, mist, { z: [1.02, 1.08] }, 'dissolve', 0.7);
  add(185.8, embrace, { z: [1.02, 1.06] }, 'dissolve', 0.6);
  add(191.3, especial, { z: [1.06, 1.02], x: [-20, 20] }, 'cut', 0, { kick: 0.5 });
  add(209.11, amanecer, { z: [1.2, 1.04], ease: E.outCubic }, 'flash', 0.6);
  add(Ls(55) - 0.1, lineup, { x: [-40, 40] }, 'slats', 0.4);
  add(Ls(56) - 0.1, (c, t, s) => { kaleBG(c, t, 'dish_468513', { tint: '#7a2410', tintA: 0.35, spin: 0.1 }); coverMedallion(c, t, s, { R: 340, dish: 'dish_201662', f: [0.55, 0.3], z: 1.5 }); frameDeco(c, t, {}); }, { z: [1.1, 1.02] }, 'cut', 0, { kick: 0.6 });
  add(Ls(57) - 0.1, bloom, { z: [1.02, 1.1] }, 'iris', 0.35, { tro: { color: MEM.to.ink } });
  add(Ls(58) - 0.1, splitShot({ who: 'to', key: 'to_cos', kale: 'tile_187927' }, { who: 'ri', key: 'ri_cos', kale: 'tile_187929' }, ch(58, 5), { grade: '#ffb080', gradeA: 0.15, gradeOp: 'soft-light' }), {}, 'cut', 0, { kick: 0.4 });
  add(Ls(59) - 0.1, splitShot({ who: 'to', key: 'to_cos', kale: 'tile_187933', x: 0.3 }, { who: 'ri', key: 'ri_cos', kale: 'tile_187916' }, ch(59, 5), { grade: '#ffb080', gradeA: 0.15, gradeOp: 'soft-light' }), { r: [0.01, -0.01] }, 'whip', 0.3);
  add(Ls(60) - 0.1, nagiCard({ z0: 2.0, z1: 1.7, fx: CF.cardNa.na[0] + 0.02, fy: CF.cardNa.na[1] - 0.06 }), {}, 'dissolve', 0.4);
  add(Ls(61) - 0.1, duoGroups, { z: [1.04, 1.08] }, 'slats', 0.35);
  add(Ls(63) - 0.1, candleOut, { z: [1.02, 1.1] }, 'dissolve', 0.6);
  add(Ls(64) - 0.1, finalPale, { z: [1.2, 1.0], ease: E.outCubic }, 'dissolve', 0.9);
  add(238.14, credits, { x: [30, -30] }, 'sheet', 0.6);
  add(249.75, endCard, { z: [1.08, 1.02] }, 'dissolve', 0.9);
  S.forEach((s, i) => (s.b = S[i + 1] ? S[i + 1].a : 999));
  SHOTS = S; return S;
}
