// v6 storyboard (see docs/PLAN_v6.md). Plates are drawn in world space; the runner moves the camera.
import { W, H, TAU, clamp, lerp, inv, smooth, E, hash, noise1 } from '../util.js';
import { T, barT, beatT, beatF, barF } from '../timing.js';
import { IMG, buf, cover, place, tinted, duo, rgba, withMask, archPath, circlePath, rectPath, rings, lattice, ink, glow, sparkle,
  stars, embers, petals, bokeh, softDot } from '../gfx.js';
import { piece, sticker, slap, pop, hop, tape, polaroid, scribble, doodle, boil } from '../collage.js';
import { F, font, drawText, label } from '../text.js';
import { MEM, ORDER, GOLD, IV, FACE, framing, figure, lerpFr, CF, kaleido, fanOpen, obj, halo, earrings, develop, fgBlur, lightRays,
  neon, neonStroke, horseshoe, scallops, mono, laceBorder } from '../kit4.js';
import { energy, pulse, keyed } from './core6.js';
import { sing, slam, addFace } from './type6.js';
import { dawnSky, sunElev, starBurst, godRays, dust, lensFlare, relit, lightFront } from './dawn6.js';

const M = k => IMG['m_' + k];
const Ls = i => T.lines[i].start;
const COS = { yo: 'yo_cos', na: 'na_cos', shi: 'shi_cos', to: 'to_cos', ri: 'ri_cos' };
const BIG = [-2400, -1800, W + 4800, H + 3600];
const fillBig = (g, c) => { g.fillStyle = c; g.fillRect(...BIG); };
function gradBig(g, stops, y0 = -700, y1 = H + 700) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(...BIG); }
function radialW(g, cx, cy, r, stops, op = 'source-over', a = 1) {
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); stops.forEach(([o, c]) => gr.addColorStop(o, c));
  g.save(); g.globalCompositeOperation = op; g.globalAlpha *= a; g.fillStyle = gr; g.fillRect(...BIG); g.restore();
}
function washW(g, c, a, op = 'source-over') { if (a <= 0.003) return; g.save(); g.globalCompositeOperation = op; g.globalAlpha *= a; g.fillStyle = c; g.fillRect(...BIG); g.restore(); }
function tiles(g, img, size, a = 1) {
  if (!img) return; const k = `t6|${img._k}|${size}`; let c = img[k];
  if (!c) { c = document.createElement('canvas'); c.width = size; c.height = Math.round(size * img.height / img.width); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); img[k] = c; }
  g.save(); g.globalAlpha *= a; g.fillStyle = g.createPattern(c, 'repeat'); g.fillRect(...BIG); g.restore();
}
function kaleW(g, t, key, o = {}) { // kaleidoscope background in world space
  fillBig(g, o.base || '#120607');
  kaleido(g, M(key), { n: o.n || 12, rot: t * (o.spin ?? 0.03) + (o.rot0 || 0), zoom: o.zoom || 1.15, fx: 0.5 + 0.1 * Math.sin(t * 0.09 + (o.ph || 0)), fy: 0.5 + 0.1 * Math.cos(t * 0.07), R: o.R || 1900, cx: o.cx ?? W / 2, cy: o.cy ?? H / 2 });
  if (o.tint) washW(g, o.tint, o.tintA ?? 0.45, o.tintOp || 'multiply');
  radialW(g, o.cx ?? W / 2, o.cy ?? H / 2, o.vr || 1400, [[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(0,0,0,0.15)'], [1, `rgba(0,0,0,${o.vig ?? 0.85})`]]);
}
// sung line i (or a segment of it)
function L(g, t, i, o = {}) {
  const l = T.lines[i], cs = [...l.text], a = o.from || 0, b = o.to ?? cs.length;
  sing(g, t, cs.slice(a, b).join(''), l.chars.slice(a, b), { exit: (l.hold || l.end) + 0.35, tag: `L${i}`, ...o });
}
// a piece flying into place: starts off-frame along dir, decelerates (outExpo), small rotation settles
function fly(t, t0, dir = [0, -1], dist = 900, rot = 0.25, dur = 0.6) {
  const u = clamp((t - t0) / dur), e = E.outExpo(u);
  return { a: u > 0 ? 1 : 0, dx: dir[0] * dist * (1 - e), dy: dir[1] * dist * (1 - e), r: rot * (1 - e), u };
}
function face(g, key, fr) { const [fx, fy] = FACE[key]; void fx; void fy; addFace(g, fr.x, fr.y, fr.fh); }

/* ================================================================ PROLOGUE */
const overture = {
  plate(g, t) {
    fillBig(g, '#060203'); radialW(g, 960, 640, 900, [[0, 'rgba(110,12,26,0.6)'], [1, 'rgba(0,0,0,0)']]);
    fanOpen(g, M('fan_170045'), 960, 760, 560, E.inOutCubic(inv(0.15, 1.45, t)));
    glow(g, 960, 720, 420, '#ffcf8a', 0.18 + 0.2 * smooth(0.8, 1.7, t));
    embers(g, t, 30, 3, { a: 0.7, speed: 40, color: '#ffcf8a' });
  },
  over(g, t) {
    const a = smooth(0.35, 0.9, t) * (1 - smooth(1.35, 1.65, t));
    label(g, 'THE IDOLM@STER CINDERELLA GIRLS', 960, 900, { fam: F.cinzel, size: 16, weight: 600, color: IV, track: 0.5, align: 'center', alpha: a * 0.85 });
    label(g, 'Passion jewelries! 004', 960, 940, { fam: F.corm, size: 26, italic: true, weight: 500, color: GOLD, align: 'center', alpha: a });
  },
  cam: [[0, { z: 1.0 }, 'iq'], [1.75, { z: 1.32, y: 640 }]], hh: 0.3,
};

// one continuous camera along the five Moorish arches: Yoshino -> whip -> Nagi -> whip -> Shin -> ¡Olé! pull back
const AX = k => 192 + 384 * k;
const LIT = [[1.6, ['yo']], [3.62, ['na']], [5.56, ['shi']], [7.62, ORDER]];
function litLevel(t, w) {
  let v = 0;
  LIT.forEach(([t0, who], j) => { if (!who.includes(w)) return; let later = 0; LIT.slice(j + 1).forEach(([t1, w1]) => { if (!w1.includes(w)) later = Math.max(later, smooth(t1, t1 + 0.4, t)); });
    v = Math.max(v, smooth(t0, t0 + 0.35, t) * (1 - 0.82 * later)); });
  return v;
}
// the face anchors of the costume arts sit off the visual centre of some faces: centre each face in its arch
const ARCH_DX = { yo: 0.1, na: 0.13, shi: 0.25, to: 0, ri: -0.34 };
function archWall(g, t, o = {}) {
  fillBig(g, o.base || '#0c0405'); tiles(g, M('tile_187938'), 220, o.tileA ?? 0.17);
  radialW(g, 960, 600, 1300, [[0, o.glowC || 'rgba(130,16,30,0.35)'], [1, 'rgba(0,0,0,0)']]);
  ORDER.forEach((w, k) => {
    const x = AX(k), path = archPath(x, 1000, 344, 820), l = o.lit ? o.lit(t, w) : 1, ch = o.chase ? o.chase(t, k) : 0;
    withMask(g, path, h => {
      h.fillStyle = MEM[w].deep; h.fillRect(x - 200, 150, 400, 900);
      kaleido(h, M(o.kale || 'tile_187924'), { n: 8, rot: t * 0.05 + k, R: 620, cx: x, cy: 560, zoom: 1 });
      h.save(); h.globalCompositeOperation = 'multiply'; h.globalAlpha = 0.55; h.fillStyle = MEM[w].deep; h.fillRect(x - 200, 150, 400, 900); h.restore();
      if (o.warm) { h.save(); h.globalCompositeOperation = 'soft-light'; h.globalAlpha = o.warm; h.fillStyle = '#ffb070'; h.fillRect(x - 200, 150, 400, 900); h.restore(); }
      const fr0 = framing(COS[w], 'face', (k + 0.5) / 5, { k: 0.64, y: 480 }), fr = { ...fr0, x: fr0.x + ARCH_DX[w] * fr0.fh };
      figure(h, COS[w], fr, { rim: MEM[w].light, shadow: false });
      if (l > 0.3) face(h, COS[w], fr);
      if (l < 1) { h.fillStyle = `rgba(8,2,4,${0.9 * (1 - l)})`; h.fillRect(x - 200, 150, 400, 900); }
      if (ch > 0.01) { h.save(); h.globalCompositeOperation = 'screen'; h.globalAlpha = 0.2 * ch; h.fillStyle = MEM[w].light; h.fillRect(x - 200, 150, 400, 900); h.restore(); }
    });
    g.save(); g.strokeStyle = GOLD; g.globalAlpha *= 0.3 + 0.7 * l; g.lineWidth = 3; g.shadowColor = '#ffcf8a'; g.shadowBlur = 18 * l; g.beginPath(); path(g); g.stroke(); g.restore();
    if (ch > 0.01) { g.save(); g.strokeStyle = '#fff4d8'; g.globalAlpha *= ch; g.lineWidth = 7; g.shadowColor = MEM[w].light; g.shadowBlur = 46; g.beginPath(); path(g); g.stroke(); g.restore(); }
  });
  const gr = g.createLinearGradient(0, 760, 0, 1100); gr.addColorStop(0, 'rgba(8,2,3,0)'); gr.addColorStop(1, 'rgba(8,2,3,0.85)'); g.fillStyle = gr; g.fillRect(BIG[0], 760, BIG[2], 2000);
}
const arches = {
  plate(g, t) { archWall(g, t, { lit: litLevel }); embers(g, t, 40, 5, { a: smooth(7.7, 8.2, t), speed: 120, rect: [-400, -200, W + 800, H + 400] }); },
  over(g, t) {
    const chant = (i, x, y, size) => slam(g, t, T.lines[i].text, T.lines[i].chars, { x, y, size, exit: T.lines[i].end + 0.12, rule: false, fam: F.dmserif });
    chant(0, 520, 560, 124); chant(1, 1420, 560, 124); chant(2, 1420, 560, 124);
    slam(g, t, '¡Olé!', [Ls(3), Ls(3) + 0.08, Ls(3) + 0.16, Ls(3) + 0.24, Ls(3) + 0.32], { x: 960, y: 905, size: 220, exit: 9.55, fam: F.dmserif, gloss: '' });
  },
  cam: [[1.75, { x: -30, y: 520, z: 2.2 }, 'o'], [3.44, { x: -12, y: 508, z: 2.08 }, 'io3'], [3.76, { x: 800, y: 512, z: 2.14 }, 'o'], [5.38, { x: 782, y: 503, z: 2.06 }, 'io3'],
    [5.7, { x: 1184, y: 508, z: 2.14 }, 'o'], [7.6, { x: 1166, y: 500, z: 2.06 }, 'ox'], [8.35, { x: 960, y: 560, z: 1.0 }, 'io'], [9.75, { x: 960, y: 548, z: 1.07 }]],
  hh: 0.5, pulse: 1.2,
};

// Title: collage on crimson velvet, every piece flies in on the beat
const title = {
  plate(g, t) {
    fillBig(g, '#3a0610'); const tx = M('textile_222561'); if (tx) cover(g, tx, [-700, -500, W + 1400, H + 1000], 1.0);
    washW(g, '#2a0408', 0.28, 'multiply');
    const b0 = 9.75, bt = T.beat;
    let f = fly(t, b0 + 0.05, [1, 0], 1200, 0.2); if (f.a) { g.save(); g.translate(f.dx, f.dy); piece(g, 1460, 520, 900, 560, { img: M('textile_230357'), z: 1.2, rot: 0.05 + f.r, seed: 3 }); g.restore(); }
    f = fly(t, b0 + bt, [0, -1], 900, -0.3); if (f.a) { g.save(); g.translate(f.dx, f.dy); polaroid(g, IMG.cover, 1420, 480, 560, { rot: -0.06 + f.r, z: 1.15, fx: 0.5, fy: 0.42, caption: 'Passion jewelries! 004', filter: develop((t - b0 - bt) / 2.4) }); tape(g, 1420, 140, 190, 0.1); g.restore(); }
    f = fly(t, b0 + 2 * bt, [0, 1], 700, 0.4); if (f.a) { g.save(); g.translate(f.dx, f.dy); obj(g, M('watch_195645'), 210, 940, 200, { rot: -0.2 + f.r }); g.restore(); }
    fanOpen(g, M('fan_169859'), 1780, 980, 360, E.outCubic(clamp((t - b0 - 3 * bt) / 0.7)), { rot: -0.35 });
    earrings(g, M('jewel_206850'), 1080, 380 - (1 - E.outExpo(clamp((t - b0 - 4 * bt) / 0.6))) * 500, 230, t, clamp((t - b0 - 4 * bt) * 5));
    f = fly(t, b0 + 5 * bt, [1, 1], 800, 0.6); if (f.a) { g.save(); g.translate(f.dx, f.dy); obj(g, IMG.obj_d_rose, 1100, 930, 300, { rot: 0.3 + f.r }); g.restore(); }
    f = fly(t, b0 + 0.02, [-1, 0], 1300, -0.15); if (f.a) { g.save(); g.translate(f.dx, f.dy); piece(g, 560, 520, 900, 420, { color: '#f6efe0', rot: -0.03 + f.r, seed: 9 }); g.restore(); }
    const out = 1 - smooth(15.3, 15.8, t);
    label(g, 'THE IDOLM@STER CINDERELLA GIRLS', 190, 380, { fam: F.cinzel, size: 15, weight: 700, color: '#6a1020', track: 0.45, alpha: smooth(10.4, 10.8, t) * out });
    drawText(g, t, '熱情エナモラル', { x: 190, y: 480, size: 96, fontStr: font(F.mincho, 96, 800), fill: '#1f1514', track: 0.06, anim: 'ink', start: 10.35, stagger: 0.09, dur: 0.32, exit: 1e9 });
    drawText(g, t, 'Enamorar', { x: 480, y: 610, size: 110, fontStr: font(F.script, 110, 400), fill: '#9a1028', anim: 'ink', start: 11.2, stagger: 0.09, dur: 0.32, exit: 1e9 });
    ORDER.forEach((w, k) => { const a = smooth(12.2 + k * 0.15, 12.6 + k * 0.15, t); g.save(); g.globalAlpha = a; g.fillStyle = MEM[w].ink; g.fillRect(190 + k * 132, 690, 118 * a, 5); g.restore(); label(g, MEM[w].jp, 190 + k * 132, 718, { size: 19, weight: 700, color: '#1f1514', track: 0.06, alpha: a }); });
    laceBorder(g, 'm_lace_220632_mask', H + 6, 120, IV, 0.85, true, 0);
    petals(g, t, 10, 3, { a: 0.9, speed: 60, size: 0.8 });
  },
  cam: [[9.75, { x: 880, y: 560, z: 1.14 }, 'o'], [15.15, { x: 1030, y: 530, z: 1.0 }, 'iq'], [15.9, { x: 1420, y: 470, z: 2.1 }]], hh: 0.5,
};

/* ================================================================ VERSE 1 */
function nightSky(g, t) {
  gradBig(g, [[0, '#010210'], [0.45, '#050824'], [0.62, '#0b1236']], -1400, 700);
  stars(g, t, 240, 11, [-400, -1300, W + 800, 1300], 1);
  glow(g, 430, -300, 300, '#c8d4ff', 0.28); obj(g, IMG.obj_v2_crescent, 430, -300, 230, { shadow: false, rot: -0.2 });
}
const night = {
  plate(g, t) {
    nightSky(g, t);
    const im = M('alhambra_288043');
    if (im) { const [c, b] = buf('night6', W + 400, 1200); cover(b, duo(im, '#04061a', '#8a98d8'), [0, 0, W + 400, 1200], 1.05, 0.5, 0.62);
      b.globalCompositeOperation = 'destination-in'; const gr = b.createLinearGradient(0, 0, 0, 380); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); b.fillStyle = gr; b.fillRect(0, 0, W + 400, 1200);
      g.drawImage(c, -200, -60); }
    T.lines[4].chars.forEach((ct, k) => { const a = smooth(ct - 0.05, ct + 0.3, t); if (a > 0) sparkle(g, 160 + hash(k, 71) * 1300, -900 + hash(k, 72) * 900, 0.8 + hash(k, 73) * 0.9, a * (0.75 + 0.25 * Math.sin(t * 3 + k)), '#f4f0ff'); });
    fgBlur(g, M('iron_194614'), -60, 560, 1500, 8, 0.7);
  },
  over(g, t) {
    const st = { fill: '#f4f2ff', glow: 'rgba(170,190,255,0.6)', size: 124, vertical: true, kana: 0.56 };
    L(g, t, 4, { ...st, to: 4, x: 1670, y: 190, drift: [0, 18] }); L(g, t, 4, { ...st, from: 4, x: 1515, y: 320, drift: [0, 18] });
  },
  cam: [[15.9, { y: -330, z: 1.12 }, 'i'], [19.85, { y: 420, z: 1.0 }]], hh: 0.5, pulse: 0.5,
};
const tomoe = {
  plate(g, t) {
    fillBig(g, '#04061a'); const im = M('alhambra_288043'); if (im) cover(g, duo(im, '#04061a', '#5a68b0'), [-500, -300, W + 1000, H + 600], 1.25, 0.4, 0.5);
    stars(g, t, 90, 12, [-300, -300, W + 600, 700], 0.6);
    const fr = lerpFr(framing('to_cos', 'bust', 0.36), framing('to_cos', 'face', 0.38), 0.55);
    figure(g, 'to_cos', fr, { rim: '#c0c8ff', rimA: 0.45, grade: '#2a3080', gradeA: 0.28 }); face(g, 'to_cos', fr);
    const q = E.inOutSine(inv(Ls(5) + 0.8, 23.2, t));
    for (const sd of [-1, 1]) { glow(g, 1180 + sd * lerp(300, 26, q), 800, 120, sd < 0 ? '#ffb070' : '#ff8a6a', 0.9); sparkle(g, 1180 + sd * lerp(300, 26, q), 800, 0.9, 0.9); }
    if (q > 0.97) glow(g, 1180, 800, 260, '#ffd0a0', (q - 0.97) * 20);
  },
  over(g, t) { const st = { fill: '#f0f2ff', glow: 'rgba(170,190,255,0.5)', size: 92, vertical: true, kana: 0.58 };
    L(g, t, 5, { ...st, to: 5, x: 1720, y: 170, drift: [0, 14] }); L(g, t, 5, { ...st, from: 6, x: 1590, y: 290, drift: [0, 14] }); },
  cam: [[19.85, { y: 330, z: 1.04 }, 'o'], [21.6, { y: 520, z: 1.08 }, 'io'], [23.45, { y: 545, z: 1.15 }]], hh: 0.6, pulse: 0.5,
};
function coldRoom(g, t, w) {
  kaleW(g, t, 'tile_187929', { tint: '#0a1440', tintA: 0.62 * (1 - w), spin: 0.035, base: '#060a20' });
  washW(g, '#3a0a08', 0.58 * w, 'multiply');
  glow(g, 1300, 400, 700, '#9ab8ff', 0.25 * (1 - w)); radialW(g, 600, 900, 1200, [[0, `rgba(255,120,50,${0.55 * w})`], [1, 'rgba(0,0,0,0)']], 'screen');
  obj(g, M('iron_198932'), 230, 760, 620, { filter: `brightness(${0.55 + 0.45 * w})` }); obj(g, IMG.obj_slim_candle, 230, 520, 230, { shadow: false, a: w }); glow(g, 230, 450, 240, '#ffb060', w * 0.95);
  if (w < 1) for (let k = 0; k < 60; k++) { const x = ((hash(k, 3) * (W + 600) + t * 18) % (W + 600)) - 300, y = ((hash(k, 4) * (H + 400) + t * (26 + hash(k, 5) * 30)) % (H + 400)) - 200; g.globalAlpha = 0.5 * (1 - w); g.drawImage(softDot('#e8f0ff', 16), x, y, 6 + hash(k, 6) * 9, 6 + hash(k, 6) * 9); }
  g.globalAlpha = 1;
}
const frost = {
  plate(g, t) { coldRoom(g, t, 0); },
  over(g, t) { const fr = { fill: '#eef4ff', glow: 'rgba(150,185,255,0.6)', align: 'center', exit: 27.3 };
    L(g, t, 6, { ...fr, to: 5, x: 960, y: 450, size: 176, kana: 0.5, drift: [-20, 0] }); L(g, t, 6, { ...fr, from: 5, x: 960, y: 650, size: 118, kana: 0.62, drift: [20, 0] }); },
  cam: [[23.45, { z: 1.0, x: 980 }, 'l'], [27.4, { z: 1.14, x: 940 }]], hh: 0.4, pulse: 0.6,
};
const riamu = {
  plate(g, t) {
    coldRoom(g, t, smooth(27.3, 28.6, t));
    const fr = framing('ri_cos', 'bust', 0.47);
    figure(g, 'ri_cos', fr, { rim: '#ffb070', rimA: 0.6, rimSide: -1, grade: '#ff7040', gradeA: 0.2, gradeOp: 'soft-light' }); face(g, 'ri_cos', fr);
    embers(g, t, 30, 7, { a: 0.7, speed: 45, rect: [-200, -200, W + 400, H + 400] });
  },
  over(g, t) { L(g, t, 7, { fill: '#fff2e6', glow: 'rgba(255,150,80,0.55)', size: 92, vertical: true, kana: 0.6, x: 1700, y: 170, drift: [0, 16] }); },
  cam: [[27.4, { x: 880, y: 560, z: 1.0 }, 'o'], [30.3, { x: 960, y: 520, z: 1.12 }]], hh: 0.6, pulse: 0.6,
};

/* ================================================================ B1 */
function stripText(g, t, i, x, y, rot, o = {}) {
  const l = T.lines[i], a = smooth(l.start - 0.4, l.start - 0.1, t) * (1 - smooth((o.exit ?? l.end + 0.5), (o.exit ?? l.end + 0.5) + 0.3, t));
  if (a <= 0.003) return;
  const S = o.size || 60, w = [...l.text].length * S * 0.88 + S * 1.2;
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = a;
  piece(g, w / 2 - S * 0.4, 0, w, S * 1.7, { color: '#f6efe0', seed: (l.start * 10) | 0, shadow: 0.4 }); g.fillStyle = '#9a1028'; g.fillRect(-S * 0.4 - 4, -S * 0.85, 10, S * 1.7);
  g.restore();
  g.save(); g.translate(x, y); g.rotate(rot);
  sing(g, t, l.text, l.chars, { x: S * 0.2, y: 2, size: S, kana: 0.72, fill: '#1f1514', glow: null, shadow: null, hot: '#9a1028', exit: o.exit ?? l.end + 0.5, alpha: a, tag: `L${i}` });
  g.restore();
}
const vanity = {
  plate(g, t, s) {
    fillBig(g, '#efe4d0'); const p = IMG.paper_cream; if (p) { g.drawImage(p, -500, -300, W + 1000, H + 600); }
    const at = k => s.a + 0.15 + k * T.beat;
    let f = fly(t, at(0), [-1, 0], 1100, -0.3); if (f.a) { g.save(); g.translate(f.dx, f.dy); piece(g, 620, 380, 620, 430, { img: IMG.photo_b1_letter, z: 1.35, fx: 0.42, fy: 0.42, rot: -0.06 + f.r, seed: 7, filter: 'sepia(0.35)' }); tape(g, 400, 180, 160, -0.5); g.restore(); }
    f = fly(t, at(1), [0, -1], 900, 0.7); if (f.a) { g.save(); g.translate(f.dx, f.dy); obj(g, IMG.obj_b1_lipstick, 1000, 520, 480, { rot: 0.55 + f.r }); g.restore(); }
    earrings(g, M('jewel_206855'), 290, 640 - (1 - E.outExpo(clamp((t - at(2)) / 0.6))) * 700, 300, t, clamp((t - at(2)) * 5));
    fanOpen(g, M('fan_120449'), 2050, 1040, 560, E.outCubic(clamp((t - at(3)) / 0.8)), { rot: -0.4 });
    f = fly(t, Ls(9) - 0.25, [1, -0.3], 1100, 0.4); if (f.a) { g.save(); g.translate(f.dx, f.dy);
      polaroid(g, null, 1560, 470, 480, { rot: 0.06 + f.r, caption: '♡ madame', capColor: '#9a1f4a',
        draw: (h, px, py, pw, ph) => { h.fillStyle = MEM.shi.light; h.fillRect(px, py, pw, ph); h.filter = develop((t - Ls(9)) / 1.8); const fr = { x: px + pw * 0.5, y: py + ph * 0.4, fh: ph * 0.4 }; figure(h, 'shi_cos', fr, { shadow: false, floor: py + ph + 4 }); face(h, 'shi_cos', fr); h.filter = 'none'; } });
      tape(g, 1560, 210, 170, 0.15, 'rgba(255,170,200,0.7)'); g.restore(); }
    doodle(g, 'heart', 380, 870, 2.0, clamp((t - Ls(8) - 0.6) / 0.8), MEM.shi.ink, 5);
    scribble(g, t, Ls(9) - 0.1, 'à la madame…', 200, 120, 54, '#7a1f3a', -0.05, 1.2);
  },
  over(g, t) { stripText(g, t, 8, 120, 900, -0.025, { exit: 31.75 }); stripText(g, t, 9, 120, 900, 0.015, { exit: 34.6 }); echo(g, t, 9, 1460, 900, -0.08); },
  cam: [[30.3, { x: 760, y: 560, z: 1.08 }, 'l'], [34.75, { x: 1250, y: 540, z: 1.0 }]], hh: 0.5, pulse: 0.6,
};
const mantle = {
  plate(g, t) {
    const n = smooth(Ls(11) - 0.4, Ls(11) + 0.6, t);
    fillBig(g, '#3a0610'); const tx = M('textile_222561'); if (tx) cover(g, tx, [-600, -600, W + 1200, H + 1200], 1.0);
    washW(g, '#2a0206', 0.3, 'multiply');
    if (n > 0) { g.save(); g.globalAlpha = n; gradBig(g, [[0, '#0b0f2e'], [1, '#1a1640']]); stars(g, t, 90, 41, [-300, -500, W + 600, 900], 0.8); g.restore(); }
    const im = M('shawl_168327');
    if (im) { const sx = im.width * 0.1, sw = im.width * 0.795, sh = im.height * 0.62, dw = 1250, dh = dw * sh / sw;
      const [c, b] = buf('mantle6', Math.ceil(dw), Math.ceil(dh)); b.drawImage(im, sx, 0, sw, sh, 0, 0, dw, dh);
      b.globalCompositeOperation = 'destination-in'; const gr = b.createLinearGradient(0, dh * 0.55, 0, dh); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); b.fillStyle = gr; b.fillRect(0, 0, dw, dh);
      const sway = Math.sin((t - Ls(11)) * 1.7) * 0.04 * n;
      g.save(); g.translate(40 + dw / 2, -160); g.transform(1, 0, sway, 1, 0, 0); g.shadowColor = 'rgba(8,0,2,0.6)'; g.shadowBlur = 40; g.shadowOffsetY = 24; g.drawImage(c, -dw / 2, 0); g.restore(); }
    // Yoshino in her stage costume in front of the mantón; the light on her turns from crimson to night lavender
    const fr = lerpFr(framing('yo_cos', 'bust', 0.4), framing('yo_cos', 'face', 0.42), 0.35);
    figure(g, 'yo_cos', fr, { rim: n > 0.5 ? '#d8d0ff' : '#ffb0a0', rimA: 0.65, grade: n > 0.5 ? '#3a3080' : '#a01828', gradeA: 0.16, gradeOp: 'soft-light' }); face(g, 'yo_cos', fr);
    if (n > 0 && n < 1) { g.save(); g.globalAlpha = n; figure(g, 'yo_cos', fr, { shadow: false, rim: '#d8d0ff', rimA: 0.65, grade: '#3a3080', gradeA: 0.16, gradeOp: 'soft-light' }); g.restore(); }
  },
  over(g, t, s) {
    const roll = 1 - 0.55 * smooth(Ls(11) - 0.3, Ls(11) + 0.3, t);
    L(g, t, 10, { x: 1600, y: 180, vertical: true, size: 180, kana: 0.46, fill: '#fbf0e6', glow: 'rgba(255,60,70,0.55)', alpha: roll, exit: s.b + 0.2, drift: [0, 20] });
    L(g, t, 11, { x: 1400, y: 300, vertical: true, size: 100, kana: 0.56, fill: '#ece6ff', glow: 'rgba(170,160,255,0.55)', exit: s.b + 0.2, drift: [0, 16] });
  },
  cam: [[34.75, { x: 900, y: 600, z: 1.0 }, 'o'], [38.45, { x: 940, y: 520, z: 1.1 }]], hh: 0.5, pulse: 0.7,
};

/* ================================================================ PRE-CHORUS */
const mirror = {
  plate(g, t) {
    fillBig(g, '#1a0e06'); const m = IMG.m_lace_223050_mask; if (m) cover(g, tinted(m, '#5a3a18'), [-500, -400, W + 1000, H + 800], 1.0, 0.5, 0.5, 0.8);
    withMask(g, archPath(560, 1000, 640, 900), h => {
      cover(h, duo(M('alhambra_263839'), '#140a04', '#b08a5a'), [240, 100, 640, 900], 1.1, 0.5, 0.5);
      h.save(); h.globalAlpha = 0.55; h.filter = 'saturate(0.2) brightness(0.85)';
      const rf = lerpFr(framing('na_cos', 'face', 0.3), framing('na_cos', 'eyes', 0.3), 0.2); figure(h, 'na_cos', rf, { flip: true, shadow: false }); face(h, 'na_cos', rf); h.restore();
    });
    g.save(); g.strokeStyle = GOLD; g.lineWidth = 3; g.beginPath(); archPath(560, 1000, 640, 900)(g); g.stroke(); g.lineWidth = 1.2; g.beginPath(); archPath(560, 1018, 676, 936)(g); g.stroke(); g.restore();
    const fr = lerpFr(framing('na_cos', 'knee', 0.76), framing('na_cos', 'bust', 0.74), 0.5);
    figure(g, 'na_cos', fr, { rim: '#ffd0a0', rimSide: -1, glow: '#ffb040', glowA: 0.2 }); face(g, 'na_cos', fr);
  },
  over(g, t) { L(g, t, 12, { x: 150, y: 950, size: 74, kana: 0.62, fill: '#fff4e6', glow: 'rgba(255,190,110,0.45)', drift: [24, 0] }); echo(g, t, 11, 1480, 760, 0.06); },
  cam: [[38.45, { x: 640, y: 540, z: 1.2 }, 'io'], [42.3, { x: 1150, y: 540, z: 1.04 }]], hh: 0.5, pulse: 0.7,
};
const fans5 = {
  plate(g, t, s) {
    const p = inv(s.a, 48.2, t);
    kaleW(g, t, 'textile_461355', { tint: '#3a0408', tintA: 0.55 - p * 0.25, spin: 0.03 + p * 0.08 });
    lightRays(g, 960, 875, 1600, t * 0.06, 30, '#ffd08a', smooth(44.5, 47.8, t) * 0.7);
    const fans = ['fan_169859', 'fan_120720', 'fan_156754', 'fan_118755', 'fan_107571'], t0 = barT(Math.ceil(barF(s.a + 0.2)));
    [2, 1, 3, 0, 4].forEach((k, j) => fanOpen(g, M(fans[k]), 960 + (k - 2) * 360, 820 - Math.abs(k - 2) * 40, 430, E.outCubic(clamp((t - (t0 + j * T.bar * 0.5)) / 0.55)), { rot: (k - 2) * 0.12 }));
    // the candle's cut-out ends in a straight edge: it sits low enough that the edge never enters the frame
    obj(g, IMG.obj_fi_candle, 960, 1000, 360, {}); glow(g, 960, 875, 260 + p * 560, '#ffb060', 0.6 + p * 0.4);
    embers(g, t, Math.round(20 + 60 * p), 13, { a: 0.9, speed: 90 + 100 * p, rect: [-300, -300, W + 600, H + 600] });
  },
  over(g, t) { L(g, t, 13, { x: 960, y: 520, align: 'center', size: 110, kana: 0.55, fill: '#fff4e6', glow: 'rgba(255,170,90,0.6)', exit: 48.0 }); },
  cam: [[42.3, { y: 585, z: 1.0 }, 'i'], [48.2, { y: 820, z: 2.3 }]], hh: 0.4, pulse: 0.8,
};

/* ================================================================ CHORUS 1 */
function medallion(g, t, cx, cy, R, dish, f = [0.47, 0.36], z = 1.35) {
  halo(g, M(dish), cx, cy, R * 1.55, t, 1, 0.05);
  withMask(g, circlePath(cx, cy, R), h => cover(h, IMG.cover, [cx - R, cy - R, R * 2, R * 2], z, f[0], f[1]));
  rings(g, cx, cy, [R + 6], GOLD, 3, 0.95);
}
const chorus1 = {
  plate(g, t) {
    kaleW(g, t, 'tile_477238', { tint: '#5a0612', tintA: 0.5, spin: 0.05 });
    lightRays(g, 1430, 520, 1700, t * 0.06, 30, '#ffd08a', 0.4);
    medallion(g, t, 1430, 520, 330, 'dish_471762');
    petals(g, t, 18, 9, { a: 0.95, speed: 140, wind: 90, rect: [-300, -300, W + 600, H + 600] });
  },
  over(g, t) {
    slam(g, t, 'Enamorar!!', T.lines[14].chars.concat([49.0, 49.05]), { x: 480, y: 440, size: 150, exit: 50.1, gloss: '恋　に　落　ち　て' });
    L(g, t, 15, { x: 140, y: 940, size: 70, kana: 0.62, fill: '#fff4e6', glow: 'rgba(255,170,90,0.5)', drift: [20, 0] });
  },
  cam: [[48.2, { x: 1430, y: 520, z: 2.5 }, 'ox'], [49.4, { x: 1140, y: 540, z: 1.0 }, 'io'], [52.0, { x: 1110, y: 545, z: 1.07 }]], hh: 0.6, pulse: 1.4,
};
const sun = {
  plate(g, t, s) {
    const sy = 740 - 150 * E.outCubic(clamp((t - s.a) / 1.8));
    gradBig(g, [[0, '#2a0208'], [0.38, '#8a0a1a'], [0.62, '#e0401c'], [0.74, '#ffb04a'], [0.745, '#2a0508'], [1, '#0e0204']], -60, 1140);
    ['#ffd98a', '#ff9a4a', '#ff5a5a', '#d81e4a', '#7a0a2a'].forEach((c, k) => rings(g, 960, sy, [300 + k * 70 + Math.sin(t * 1.2 - k * 0.6) * 6 + pulse(t) * 10], c, 10 - k, 0.55 - k * 0.07));
    glow(g, 960, sy, 640, '#ffcf7a', 0.55); g.fillStyle = '#fff1c8'; g.beginPath(); g.arc(960, sy, 250, 0, TAU); g.fill();
    lightRays(g, 960, sy, 1900, t * 0.05, 34, '#ffd08a', 0.32);
    g.fillStyle = '#120205'; g.fillRect(BIG[0], 800, BIG[2], 2000);
    ORDER.forEach((w, k) => { const key = COS[w], a = smooth(s.a + 0.15 + k * 0.1, s.a + 0.6 + k * 0.1, t);
      figure(g, key, framing(key, 'wide', 0.13 + k * 0.185, { h: 470, drop: 0.0 }), { img: tinted(IMG[key], '#140306'), a, shadow: false, glow: '#ff9a50', glowA: 0.5, glowBlur: 16, floor: 812 }); });
  },
  over(g, t) {
    L(g, t, 16, { to: 6, x: 960, y: 170, align: 'center', size: 150, kana: 0.48, fill: '#fff6e6', glow: 'rgba(255,120,60,0.7)', accent: { from: 3, to: 5, fill: { grad: ['#fffaf0', '#ffe2b0', '#f2b866'] } } });
    L(g, t, 16, { from: 7, x: 960, y: 310, align: 'center', size: 96, kana: 0.62, fill: '#fff6e6', glow: 'rgba(255,120,60,0.6)' });
  },
  cam: [[52.0, { y: 640, z: 1.1 }, 'o4'], [53.0, { y: 560, z: 1.0 }, 'io'], [55.7, { y: 540, z: 1.05 }]], hh: 0.6, pulse: 1.3,
};
const NEONC = ['#ff3a5c', '#ffc94a', '#ff6fc0'];
const neonFans = {
  plate(g, t, s) {
    fillBig(g, '#06030a'); lattice(g, t, '#4a2050', 0.22, 170, 0, 0, 0); radialW(g, 960, 600, 1200, [[0, 'rgba(70,10,40,0.45)'], [1, 'rgba(0,0,0,0.7)']]);
    const bar = Math.floor(barF(t + 0.02)), c = k => NEONC[(bar + k) % 3];
    neon(g, 'fan_120720', 960, 700, 820, c(0), { a: E.outCubic(clamp((t - s.a) / 0.5)) });
    neon(g, 'fan_169859', 330, 860, 600, c(1), { a: E.outCubic(clamp((t - s.a - T.beat) / 0.5)), rot: -0.3 });
    neon(g, 'fan_156754', 1590, 860, 600, c(2), { a: E.outCubic(clamp((t - s.a - 2 * T.beat) / 0.5)), rot: 0.3 });
    neonStroke(g, c(0), 3, h => scallops(h, -400, W + 400, H - 30, 40), 0.6);
  },
  over(g, t) {
    slam(g, t, 'Enamorar!!', T.lines[17].chars.concat([56.6, 56.65]), { x: 960, y: 300, size: 160, exit: 57.2, gloss: '恋　に　落　ち　て' });
    L(g, t, 18, { to: 5, x: 960, y: 590, align: 'center', size: 150, kana: 0.5, glow: 'rgba(255,120,170,0.6)' });
    L(g, t, 18, { from: 6, x: 960, y: 820, align: 'center', size: 230, kana: 0.45, fill: { grad: ['#fffaf0', '#ffe2b0', '#f2b866'] }, glow: 'rgba(255,170,90,0.7)' });
  },
  cam: [[55.7, { z: 1.12 }, 'o'], [59.35, { z: 1.0 }]], hh: 0.6, pulse: 1.5,
};
function monoSplit(g, t, L0, R0, tR, neonKeys) {
  const side = (who, key, flip, xFace, nk, t0) => h => {
    const m = MEM[who], fr = framing(key, 'bust', xFace, { k: 1.25 }), on = ignite(t, t0, flip ? 31 : 37);
    fillBig(h, '#06030a'); radialW(h, xFace * W, 420, 900, [[0, rgba(m.deep, 0.95)], [1, 'rgba(0,0,0,0)']]);
    neonStroke(h, m.ink, 2.5, q => { for (let j = -2; j < 5; j++) horseshoe(q, xFace * W + (j - 1.5) * 300, H + 40, 230, 760); }, 0.45 * on);
    neon(h, nk, fr.x, fr.y - 10, fr.fh * 2.7, m.ink, { a: 0.95 * on, rot: t * 0.06 * (flip ? -1 : 1) });
    figure(h, key, fr, { img: mono(IMG[key], m.deep, m.light), flip: !!flip, glow: m.ink, glowA: 0.8, glowBlur: 24, shadow: false }); face(h, key, fr);
  };
  side(L0.who, L0.key, false, 0.27, neonKeys[0], -1)(g);
  const k = E.outExpo(clamp((t - (tR - 0.12)) / 0.4)), cut = lerp(W + 300, W * 0.52, k), sk = 150;
  if (k > 0) { withMask(g, rectPath(cut, BIG[1], W * 3, BIG[3], -sk * 3), side(R0.who, R0.key, true, 0.75, neonKeys[1], tR - 0.1));
    g.save(); g.strokeStyle = GOLD; g.lineWidth = 4; g.shadowColor = '#ffe0a0'; g.shadowBlur = 20; g.beginPath(); g.moveTo(cut + sk, -400); g.lineTo(cut - sk, H + 400); g.stroke(); g.restore(); }
}
const split1 = {
  plate(g, t) { monoSplit(g, t, { who: 'to', key: 'to_cos' }, { who: 'na', key: 'na_cos' }, T.lines[19].chars[5], ['iron_466304', 'dish_471762']); },
  over(g, t) { L(g, t, 19, { to: 4, x: 140, y: 880, size: 76, kana: 0.7 }); L(g, t, 19, { from: 5, x: 1780, y: 960, align: 'end', size: 76, kana: 0.7 }); },
  cam: [[59.35, { z: 1.0 }, 'l'], [61.55, { z: 1.05 }]], hh: 0.6, pulse: 1.3,
};
const split2 = {
  plate(g, t) { monoSplit(g, t, { who: 'ri', key: 'ri_cos' }, { who: 'yo', key: 'yo_cos' }, T.lines[20].chars[5], ['dish_468516', 'iron_466304']); },
  over(g, t) { L(g, t, 20, { to: 4, x: 140, y: 880, size: 76, kana: 0.7 }); L(g, t, 20, { from: 5, x: 1780, y: 960, align: 'end', size: 76, kana: 0.7 }); },
  cam: [[61.55, { z: 1.0 }, 'l'], [63.5, { z: 1.05 }]], hh: 0.6, pulse: 1.3,
};
const fire = {
  plate(g, t) {
    fillBig(g, '#0e0303'); const im = M('textile_227208'); if (im) cover(g, duo(im, '#0e0303', '#6a1810'), [-500, -400, W + 1000, H + 800], 1.0);
    radialW(g, 960, 1060, 1400, [[0, `rgba(255,110,40,${0.45 + 0.2 * pulse(t)})`], [1, 'rgba(0,0,0,0)']], 'screen');
    ink(g, IMG.ink_c1_blaze, '#ff6a2a', [-200, 500, W + 400, 640], 1.1, 0.5, 0.6, 0.75, 'screen');
    obj(g, IMG.obj_fi_r3, 190, 940, 470, { rot: 0.3 }); obj(g, IMG.obj_d_rose, 1750, 960, 470, { rot: -0.2 });
    embers(g, t, 70, 33, { a: 1, speed: 110, rect: [-300, -300, W + 600, H + 600] });
  },
  over(g, t, s) { L(g, t, 21, { x: 960, y: 500, align: 'center', size: 230, kana: 0.42, fill: { grad: ['#fff6e0', '#ffd08a', '#ff8a3c'] }, glow: 'rgba(255,110,40,0.85)', glowBlur: 34, exit: s.b + 0.3 }); },
  cam: [[63.5, { z: 1.0, y: 560 }, 'l'], [66.9, { z: 1.12, y: 520 }]], hh: 0.7, pulse: 1.3,
};
const lleno = {
  plate(g, t) {
    fillBig(g, '#1a0507'); tiles(g, M('tile_187924'), 260, 0.9); washW(g, '#2a0408', 0.45, 'multiply');
    const fw = 700, fh = 700, x = 1330 - fw / 2, y = 540 - fh / 2;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 50; g.fillStyle = '#c8a05a'; g.fillRect(x - 34, y - 34, fw + 68, fh + 68); g.restore();
    g.fillStyle = '#2a1408'; g.fillRect(x - 12, y - 12, fw + 24, fh + 24); cover(g, IMG.cover, [x, y, fw, fh], 1.0, 0.5, 0.5);
    g.save(); g.strokeStyle = GOLD; g.lineWidth = 2; g.strokeRect(x - 24, y - 24, fw + 48, fh + 48); g.restore();
    petals(g, t, 18, 31, { a: 1, speed: 80, rect: [-300, -300, W + 600, H + 600] });
  },
  over(g, t) { const l = T.lines[22];
    drawText(g, t, l.text, { x: 470, y: 520, align: 'center', size: 140, fontStr: font(F.script, 150, 400), fill: { grad: ['#fff6e0', '#f6d58e', '#d9a548'] }, glow: 'rgba(255,190,120,0.6)', glowBlur: 24, start: l.start - 0.15, stagger: 0.07, dur: 0.8, anim: 'blur', exit: 69.9, exitAnim: 'up', exitDur: 0.6 }); },
  cam: [[66.9, { x: 1330, y: 540, z: 1.9 }, 'o4'], [68.4, { x: 1090, y: 540, z: 1.0 }, 'io'], [69.75, { x: 1070, y: 545, z: 1.03 }]], hh: 0.5, pulse: 1.0,
};

/* ================================================================ INTERLUDE (v4 table, chibis pop and hop) */
const table = {
  plate(g, t) {
    fillBig(g, '#b8925e'); const kraft = IMG.paper_kraft; if (kraft) { g.drawImage(kraft, -700, -400, 2600, 1880); g.drawImage(kraft, 1900, -400, 2600, 1880); }
    obj(g, M('guitar_503385'), 820, 600, 900, { rot: -0.9 }); obj(g, M('guitar_505283'), 2600, 560, 780, { rot: 0.35 });
    fanOpen(g, M('fan_120766'), 1480, 1060, 420, 1, { rot: 0.1 }); obj(g, M('dish_468516'), 1900, 300, 380, { rot: t * 0.05 });
    piece(g, 3300, 520, 700, 460, { img: M('tile_187894'), z: 1.1, rot: 0.04, seed: 61 });
    const bp = beatF(t);
    ['c_yo', 'c_na', 'c_shi', 'c_to', 'c_ri'].forEach((k, j) => { const p = pop(t, 69.95 + j * T.bar * 0.75);
      sticker(g, IMG[k], 300 + j * 760, 260 - hop(bp, j * 0.5, 22) + (j % 2) * 520, 330 * p.s, { a: p.a, rot: (j % 2 ? 0.1 : -0.08) + p.r }); });
    polaroid(g, IMG.cover, 2250, 760, 420, { rot: -0.08, z: 1.1, caption: '¡olé!', capColor: '#7a1f2a' });
    earrings(g, M('jewel_141739'), 3000, 900, 260, t, 1); tape(g, 2250, 520, 160, 0.2); tape(g, 3610, 300, 170, 0.45);
    scribble(g, t, 70.6, 'esta noche ♪', 1160, 160, 70, '#7a1f2a', -0.08, 1.0); doodle(g, 'swoosh', 1300, 230, 4, clamp((t - 71.3) / 0.7), '#7a1f2a', 5);
  },
  cam: [[69.75, { x: 960, y: 540, z: 1.06 }, 'io'], [79.43, { x: 2860, y: 540, z: 1.0 }]], hh: 0.6, pulse: 0.8,
};
/* ================================================================ shared: echo words, low lines, colour split */
// the whispered answer that follows a line (くらり / 誘う / ゆらり / 試す)
function echo(g, t, i, x, y, rot = 0) {
  const l = T.lines[i]; if (!l.echo) return;
  const ts = l.end - 0.05, a = smooth(ts, ts + 0.3, t) * (1 - smooth(ts + 1.5, ts + 2.0, t)); if (a <= 0.01) return;
  g.save(); g.translate(x, y - (t - ts) * 10); g.rotate(rot);
  drawText(g, t, '（' + l.echo + '）', { x: 0, y: 0, size: 46, fontStr: font(F.yusei, 46, 400), fill: '#fbe6c8', glow: 'rgba(255,170,90,0.8)', glowBlur: 16, start: ts, stagger: 0.08, anim: 'blur', track: 0.2, alpha: a });
  g.restore();
}
const low = (g, t, i, side, y = 950, o = {}) => L(g, t, i, { x: side === 'R' ? 1780 : 140, y, align: side === 'R' ? 'end' : 'start', size: 68, kana: 0.64, drift: [side === 'R' ? -18 : 18, 0], ...o });
// under water: drifting patches of light and rising bubbles
function caustics(g, t, cx, seed) { for (let k = 0; k < 6; k++) glow(g, cx - 700 + ((k * 260 + t * 90) % 1400), 200 + 700 * hash(k, seed + 81) + Math.sin(t * 1.3 + k) * 60, 260 + 120 * hash(k, seed + 82), '#b8d8ff', 0.3); }
function rising(g, t, cx, seed) {
  g.save(); g.globalCompositeOperation = 'screen'; g.strokeStyle = '#f0f4ff'; g.lineWidth = 2;
  for (let i = 0; i < 16; i++) { const sp = 120 + hash(i, seed) * 160, life = 1500 / sp, u = ((t + hash(i, seed + 1) * life) % life) / life;
    const x = cx - 420 + hash(i, seed + 2) * 840 + Math.sin(t * 2 + i) * 14, y = 1250 - u * 1500, r = 4 + hash(i, seed + 3) * 14;
    g.globalAlpha = 0.55 * Math.sin(u * Math.PI); g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }
  g.restore();
}
function colourSplit(g, t, L0, R0, tR, o = {}) {
  const side = (who, key, flip, xFace, kale, dy = 0) => h => {
    const m = MEM[who], fr0 = framing(key, o.size || 'bust', xFace, { k: o.k ?? 1.25 }), fr = { ...fr0, y: fr0.y + dy }, dir = flip ? -1 : 1;
    kaleW(h, t, kale, { tint: m.deep, tintA: 0.4, spin: 0.03 * dir, cx: xFace * W, R: 1500 });
    if (o.warm) washW(h, '#ffb080', 0.18, 'soft-light');
    if (o.sea) { washW(h, '#3a5ad0', 0.6, 'color'); washW(h, '#203070', 0.2, 'multiply'); caustics(h, t, xFace * W, flip ? 5 : 1); }
    figure(h, key, fr, { flip: !!flip, rim: m.light, rimSide: flip ? -1 : 1, grade: o.grade, gradeA: o.gradeA, gradeOp: o.gradeOp }); face(h, key, fr);
    if (o.sea) rising(h, t, xFace * W, flip ? 7 : 3);
  };
  const sh = o.shift || [0, 0];
  side(L0.who, L0.key, false, 0.27, L0.kale, sh[0])(g);
  const k = E.outExpo(clamp((t - (tR - 0.12)) / 0.4)), cut = lerp(W + 300, W * 0.52, k), sk = 150;
  if (k > 0) { withMask(g, rectPath(cut, BIG[1], W * 3, BIG[3], -sk * 3), side(R0.who, R0.key, true, 0.75, R0.kale, sh[1]));
    g.save(); g.strokeStyle = GOLD; g.lineWidth = 4; g.shadowColor = '#ffe0a0'; g.shadowBlur = 20; g.beginPath(); g.moveTo(cut + sk, -400); g.lineTo(cut - sk, H + 400); g.stroke(); g.restore(); }
}
const splitText = (g, t, i) => { L(g, t, i, { to: 4, x: 140, y: 880, size: 76, kana: 0.7 }); L(g, t, i, { from: 5, x: 1780, y: 960, align: 'end', size: 76, kana: 0.7 }); };

/* ================================================================ VERSE 2: summer polaroids (private clothes) */
const summerNagi = {
  plate(g, t, s) {
    fillBig(g, '#efe4d0'); const p = IMG.paper_cream; if (p) g.drawImage(p, -600, -400, W + 1600, H + 800);
    let f = fly(t, s.a + 0.1, [-0.4, -1], 900, -0.4); if (f.a) { g.save(); g.translate(f.dx, f.dy);
      polaroid(g, IMG.photo_v2_moonbeach, 520, 430, 560, { rot: -0.08 + f.r, z: 1.3, fx: 0.55, caption: 'summer night', filter: `${develop((t - s.a) / 2.4)} brightness(1.6)` }); tape(g, 520, 130, 170, 0.05); g.restore(); }
    f = fly(t, s.a + 0.1 + 2 * T.beat, [0.5, -1], 900, 0.35); if (f.a) { g.save(); g.translate(f.dx, f.dy);
      polaroid(g, null, 1250, 470, 640, { rot: 0.05 + f.r, caption: 'nagi', capColor: '#8a3a58',
        draw: (h, px, py, pw, ph) => { h.fillStyle = MEM.na.light; h.fillRect(px, py, pw, ph); h.filter = develop((t - s.a - 0.9) / 2.4); const fr = { x: px + pw * 0.5, y: py + ph * 0.42, fh: ph * 0.36 }; figure(h, 'na_casual', fr, { shadow: false, floor: py + ph + 4 }); face(h, 'na_casual', fr); h.filter = 'none'; } });
      tape(g, 1250, 120, 170, -0.1, 'rgba(255,200,215,0.7)'); g.restore(); }
    f = fly(t, Ls(24) - 0.3, [1, 0], 1200, 0.1); if (f.a) { g.save(); g.translate(f.dx, f.dy); piece(g, 1600, 960, 1000, 180, { img: IMG.photo_fi_sail, z: 1.6, fx: 0.5, fy: 0.62, rot: -0.02, seed: 55 }); g.restore(); }
    const bp = beatF(t);
    ['c_shi_swim', 'c_to_white', 'c_ri_resort'].forEach((k, j) => { const q = pop(t, Ls(24) - 0.05 + j * 0.15); sticker(g, IMG[k], 1400 + j * 170, 950 - hop(bp, j * 0.33, 14), 150 * q.s, { a: q.a, rot: (j - 1) * 0.08 + q.r, shadow: 0.25, lift: 0.5 }); });
    scribble(g, t, Ls(24) + 0.8, 'ha ha ♪', 1820, 830, 46, '#3a5aa0', -0.05, 0.8);
  },
  over(g, t) { stripText(g, t, 23, 110, 860, -0.02, { exit: 87.2 }); stripText(g, t, 24, 110, 960, 0.015, { exit: 87.3 }); },
  cam: [[79.43, { x: 840, y: 540, z: 1.07 }, 'l'], [87.5, { x: 1140, y: 540, z: 1.0 }]], hh: 0.5, pulse: 0.5,
};
const summerYoshino = {
  plate(g, t, s) {
    fillBig(g, '#f2dccf'); const p = IMG.paper_peach; if (p) g.drawImage(p, -600, -400, W + 1600, H + 800);
    let f = fly(t, s.a + 0.05, [-1, -0.3], 1000, -0.3); if (f.a) { g.save(); g.translate(f.dx, f.dy);
      polaroid(g, null, 610, 432, 590, { rot: -0.05 + f.r, caption: 'yoshino', capColor: '#7a5a50',
        draw: (h, px, py, pw, ph) => { h.fillStyle = MEM.yo.light; h.fillRect(px, py, pw, ph); h.filter = develop((t - s.a) / 2.4); const fr = { x: px + pw * 0.42, y: py + ph * 0.4, fh: ph * 0.36 }; figure(h, 'yo_swim', fr, { shadow: false, floor: py + ph + 4 }); face(h, 'yo_swim', fr); h.filter = 'none'; } }); g.restore(); }
    f = fly(t, s.a + 0.05 + 2 * T.beat, [1, -0.5], 1000, 0.4); if (f.a) { g.save(); g.translate(f.dx, f.dy);
      polaroid(g, IMG.photo_br_palms, 1380, 360, 480, { rot: 0.07 + f.r, z: 1.2, caption: 'la playa', filter: develop((t - s.a - 1) / 2.2) }); g.restore(); }
    earrings(g, M('jewel_206850'), 1040, 300 - (1 - E.outExpo(clamp((t - Ls(25) - 0.4) / 0.6))) * 600, 300, t, clamp((t - Ls(25) - 0.4) * 5));
    const q = pop(t, Ls(26) - 0.2), bp = beatF(t);
    if (q.a) { sticker(g, IMG.c_yo_swim, 1520, 900 - hop(bp, 0, 26), 250 * q.s, { a: q.a, rot: -0.12 + Math.sin(t * 6) * 0.06 + q.r });
      sticker(g, IMG.c_na_casual, 1700, 910 - hop(bp, 0.5, 26), 250 * q.s, { a: q.a, rot: 0.12 - Math.sin(t * 6) * 0.06 - q.r }); }
    doodle(g, 'heart', 1610, 740, 1.5, clamp((t - Ls(26) - 0.2) / 0.6), MEM.na.ink, 4);
  },
  over(g, t) { stripText(g, t, 25, 110, 905, 0.015, { exit: 94.2 }); stripText(g, t, 26, 110, 995, -0.012, { exit: 94.25 }); },
  cam: [[87.5, { x: 830, y: 540, z: 1.06 }, 'l'], [94.37, { x: 1090, y: 540, z: 1.0 }]], hh: 0.5, pulse: 0.5,
};

/* ================================================================ B2 / PRE 2 */
const roseKiss = {
  plate(g, t) {
    fillBig(g, '#f2dccf'); const p = IMG.paper_peach; if (p) g.drawImage(p, -600, -400, W + 1200, H + 800);
    const im = M('rose_334302'); if (im) { const h = 930, w = im.width * h / im.height;
      g.save(); g.translate(760, 545); g.rotate(-0.025); g.shadowColor = 'rgba(60,20,30,0.35)'; g.shadowBlur = 30; g.shadowOffsetY = 14; g.fillStyle = '#fffaf4'; g.fillRect(-w / 2 - 22, -h / 2 - 22, w + 44, h + 44); g.restore();
      g.save(); g.translate(760, 545); g.rotate(-0.025); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore(); tape(g, 760, 82, 200, 0.04, 'rgba(255,214,226,0.75)'); }
    bokeh(g, t, 14, 61, ['#ffd0dc', '#fff0e0', '#f0c8ff'], 0.55, 1.0);
    petals(g, t, 12, 63, { a: 0.8, speed: 35, wind: 20, size: 0.9, rect: [-300, -300, W + 600, H + 600] });
  },
  over(g, t) { const st = { fill: '#3a1420', glow: 'rgba(255,255,255,0.75)', glowBlur: 14, shadow: null, hot: '#b01e3c', size: 118, kana: 0.5, vertical: true };
    L(g, t, 27, { ...st, to: 10, x: 1720, y: 150, drift: [0, 14] }); L(g, t, 27, { ...st, from: 10, x: 1560, y: 330, drift: [0, 14], accent: { from: 3, to: 7, fill: '#b01e3c' } }); },
  cam: [[94.37, { x: 880, y: 560, z: 1.12 }, 'io'], [98.3, { x: 980, y: 530, z: 1.0 }]], hh: 0.5, pulse: 0.6,
};
const shinAway = {
  plate(g, t) {
    fillBig(g, '#140818'); const im = M('alhambra_263839'); if (im) cover(g, duo(im, '#140818', '#e8c0e8'), [-500, -400, W + 1000, H + 800], 1.15, 0.5, 0.52);
    glow(g, 960, 560, 520, '#ffe0c8', 0.55);
    const fr = lerpFr(framing('shi_cos', 'bust', 0.7), framing('shi_cos', 'face', 0.7), 0.3);
    figure(g, 'shi_cos', fr, { rim: '#ffd8f0', rimSide: -1, glow: MEM.shi.ink, glowA: 0.22, grade: '#4a2a60', gradeA: 0.15 }); face(g, 'shi_cos', fr);
  },
  over(g, t) { const st = { fill: '#fbeefa', glow: 'rgba(255,170,230,0.5)', size: 82, kana: 0.6, vertical: true };
    L(g, t, 28, { ...st, to: 8, x: 340, y: 150, drift: [0, 14] }); L(g, t, 28, { ...st, from: 8, x: 210, y: 230, drift: [0, 14] }); echo(g, t, 27, 760, 560, -0.05); },
  cam: [[98.3, { x: 1080, y: 560, z: 1.0 }, 'io'], [102.62, { x: 1180, y: 520, z: 1.14 }]], hh: 0.6, pulse: 0.7,
};
const bellHits = s => { const h = []; for (let k = Math.ceil(beatF(s.a) / 4) * 4; beatT(k) < 106.3; k += 4) h.push(beatT(k)); return h; };
const riamuBells = {
  plate(g, t, s) {
    gradBig(g, [[0, '#120a28'], [0.6, '#3a2050'], [1, '#160c24']]); stars(g, t, 80, 71, [-300, -400, W + 600, 900], 0.6);
    const hits = bellHits(s); let toll = 0; hits.forEach(h => { if (t >= h) toll = Math.max(toll, Math.exp(-(t - h) * 3)); });
    place(g, tinted(IMG.obj_p2_bells, '#0c0818'), 520, 700, 820, {}); glow(g, 520, 380, 280, '#ffd8a0', 0.25 + toll * 0.35);
    hits.forEach(h => { const v = (t - h) / 3.2; if (v > 0 && v < 1) rings(g, 520, 380, [E.outCubic(v) * 1700], GOLD, 2 * (1 - v) + 0.5, 0.75 * (1 - v)); });
    const fr = lerpFr(framing('ri_cos', 'bust', 0.68), framing('ri_cos', 'face', 0.68), 0.5);
    figure(g, 'ri_cos', fr, { rim: '#f0dcff', rimA: 0.5 + toll * 0.3, rimSide: -1, grade: '#4a3080', gradeA: 0.2 }); face(g, 'ri_cos', fr);
  },
  over(g, t) { low(g, t, 29, 'L', 950, { fill: '#f6eeff', glow: 'rgba(200,170,255,0.5)' }); echo(g, t, 28, 900, 230, 0.05); },
  cam: [[102.62, { x: 900, y: 640, z: 1.1 }, 'o'], [106.25, { x: 980, y: 540, z: 1.0 }]], hh: 0.6, pulse: 0.8,
};
const silence = {
  plate(g, t, s) {
    fillBig(g, '#06040c'); const im = M('alhambra_288043'); if (im) cover(g, duo(im, '#06040c', '#4a3a6a'), [-500, -400, W + 1000, H + 800], 1.1);
    stars(g, t, 80, 81, [-300, -300, W + 600, 800], 0.4 * (1 - smooth(110, 112, t)));
    const q = E.inOutSine(inv(s.a + 0.4, 110.4, t));
    for (const sd of [-1, 1]) { glow(g, 960 + sd * lerp(440, 30, q), 520, 130, sd < 0 ? '#ffd0a0' : '#ffb0d0', 0.9); sparkle(g, 960 + sd * lerp(440, 30, q), 520, 0.9, 1); }
    if (q > 0.96) glow(g, 960, 520, 400 + (t - 110.4) * 300, '#fff0f8', Math.min(1, (q - 0.96) * 25));
  },
  over(g, t) { L(g, t, 30, { x: 960, y: 760, align: 'center', size: 80, kana: 0.62, fill: '#f8f0ff', glow: 'rgba(220,190,255,0.6)', exit: 111.9 }); },
  cam: [[106.25, { z: 1.0 }, 'iq'], [112.33, { z: 1.22 }]], hh: 0.4, pulse: 0.6,
};

/* ================================================================ CHORUS 2 (midnight) — v6.4: every hook lands on a camera punch;
   the moon sinks and becomes the watch dial (a circle-for-circle match cut); the splits ignite like neon */
// a neon tube switching on: a few uneven blinks, then steady (and breathing with the beat)
function ignite(t, t0, seed) {
  const u = t - t0; if (u < 0) return 0.06; if (u > 0.32) return 0.8 + 0.2 * pulse(t);
  return hash(Math.floor(u * 30), seed) > 0.45 ? 0.9 : 0.15;
}
const morningStar = {
  plate(g, t, s) {
    fillBig(g, '#0c0818'); cover(g, IMG.card_na, [-300, -200, W + 600, H + 400], 1.2, 0.42, 0.45);
    radialW(g, 960, 540, 1300, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(20,6,30,0.55)']]);
    stars(g, t, 70, 33, [-300, -300, W + 600, 700], 0.6);
    shock(g, t, 1660, 140, 60, '#e8dcff', 0.7);
    glow(g, 1660, 140, 340, '#e8d8ff', 0.6 + 0.2 * pulse(t, 4, 4)); starBurst(g, 1660, 140, t, 0.55 + 0.45 * Math.exp(-Math.max(0, t - s.a) * 1.5), 0.8);
    petals(g, t, 16, 21, { a: 0.9, speed: 90, wind: 80, rect: [-300, -300, W + 600, H + 600] });
    addFace(g, 1111, 579, 290); addFace(g, 620, 750, 245);
  },
  over(g, t) { slam(g, t, 'Enamorar!!', T.lines[31].chars.concat([112.85, 112.9]), { x: 960, y: 190, size: 150, exit: 113.7, gloss: '恋　に　落　ち　て' }); low(g, t, 32, 'R', 955); },
  // snap out with a roll on Enamorar!!, then drift up towards the morning star (ゆかないで)
  cam: [[112.33, { x: 960, y: 540, z: 1.5, r: -0.1 }, 'ox'], [113.25, { x: 960, y: 560, z: 1.0, r: 0 }, 'io'], [115.4, { x: 1060, y: 560, z: 1.12, r: 0.015 }]], hh: 0.6, pulse: 1.4,
};
// the moon sinks; the camera follows it down and ends centred on it, the size of the watch dial that replaces it
const WISH = () => T.lines[33].chars[7]; // 願
function shootingStar(g, t, t0, x0, y0, dx, dy) {
  const u = (t - t0) / 0.7; if (u < 0 || u > 1) return;
  const e = E.outCubic(u), x = x0 + dx * e, y = y0 + dy * e, a = Math.sin(Math.PI * u);
  g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(x - dx * 0.35, y - dy * 0.35, x, y);
  gr.addColorStop(0, 'rgba(220,210,255,0)'); gr.addColorStop(1, `rgba(255,250,240,${0.9 * a})`); g.strokeStyle = gr; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - dx * 0.35, y - dy * 0.35); g.lineTo(x, y); g.stroke(); g.restore(); sparkle(g, x, y, 0.8, a, '#fffaf0');
}
const moonSet = {
  plate(g, t, s) {
    const u = clamp((t - s.a) / (s.b - s.a));
    gradBig(g, [[0, '#04030c'], [0.65, '#141038'], [1, '#2a1838']], -500, 1200); stars(g, t, 180, 93, [-300, -500, W + 900, 1400], 0.75);
    const wt = WISH(); shootingStar(g, t, wt - 0.05, 300, 120, 700, 260); shootingStar(g, t, wt + 0.85, 1900, 60, -600, 240);
    const my = lerp(250, 520, E.inOutSine(u)); glow(g, 1320, my, 620, '#ffd8a0', 0.3 + 0.08 * Math.sin(t * 1.3)); obj(g, IMG.obj_c2_moon, 1320, my, 460, { shadow: false });
    const im = M('alhambra_263835'); if (im) { const [c, b] = buf('moon6', W + 1400, 900); cover(b, duo(im, '#06040e', '#7a6aa8'), [0, 0, W + 1400, 900], 1.0, 0.5, 0.78);
      b.globalCompositeOperation = 'destination-in'; const gr = b.createLinearGradient(0, 0, 0, 320); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); b.fillStyle = gr; b.fillRect(0, 0, W + 1400, 900); g.drawImage(c, -400, 330); }
  },
  over(g, t) { low(g, t, 33, 'R', 950, { fill: '#f0eaff', glow: 'rgba(200,190,255,0.5)' }); },
  cam: [[115.4, { x: 1080, y: 330, z: 1.0 }, 'io'], [119.45, { x: 1320, y: 520, z: 1.2 }]], hh: 0.5, pulse: 1.0,
};
const watchDial = {
  plate(g, t) {
    kaleW(g, t, 'tile_187912', { tint: '#0a0818', tintA: 0.65, spin: 0.01 });
    shock(g, t, 960, 540, 330, GOLD, 0.5);
    const k = Math.floor(beatF(t)), fr = E.outCubic(clamp((beatF(t) - k) * 4)), rot = (k + fr) * (TAU / 60);
    ['watch_207363', 'watch_195645', 'watch_187195', 'watch_194040', 'watch_194033'].forEach((w, j) => { const a = (j / 5) * TAU - Math.PI / 2 + 0.3 + t * 0.06; obj(g, M(w), 960 + Math.cos(a) * 600, 540 + Math.sin(a) * 340, 250 * (1 + 0.05 * pulse(t, 1, 8)), { rot: Math.sin(t * 0.8 + j) * 0.05 }); });
    withMask(g, circlePath(960, 540, 240), h => { fillBig(h, '#0a0814'); obj(h, M('watch_194208'), 960, 590, 560, { shadow: false, a: 0.28 }); radialW(h, 960, 540, 260, [[0, 'rgba(10,8,20,0.2)'], [1, 'rgba(10,8,20,0.85)']]); });
    rings(g, 960, 540, [246, 262], GOLD, 2, 0.9);
    for (let j = 0; j < 60; j++) { const a = (j / 60) * TAU - Math.PI / 2; g.save(); g.strokeStyle = GOLD; g.globalAlpha = 0.6; g.lineWidth = j % 5 ? 1 : 3; g.beginPath(); g.moveTo(960 + Math.cos(a) * 280, 540 + Math.sin(a) * 280); g.lineTo(960 + Math.cos(a) * (j % 5 ? 296 : 312), 540 + Math.sin(a) * (j % 5 ? 296 : 312)); g.stroke(); g.restore(); }
    const ha = rot - Math.PI / 2; g.save(); g.strokeStyle = GOLD; g.lineWidth = 3; g.beginPath(); g.moveTo(960 + Math.cos(ha) * 262, 540 + Math.sin(ha) * 262); g.lineTo(960 + Math.cos(ha) * 318, 540 + Math.sin(ha) * 318); g.stroke(); g.restore();
  },
  over(g, t, s, c) {
    slam(g, t, 'Enamorar!!', T.lines[34].chars.concat([120.45, 120.5]), { x: 960, y: 150, size: 140, exit: 120.4, gloss: '' });
    const [cx, cy] = [W / 2 + (960 - c.x) * c.z, H / 2 + (540 - c.y) * c.z];
    L(g, t, 35, { to: 6, x: cx, y: cy - 50 * c.z, align: 'center', size: 96 * c.z, kana: 0.5, fill: '#e8e4f4', glow: 'rgba(170,170,255,0.4)', exit: 123.25 });
    L(g, t, 35, { from: 7, x: cx, y: cy + 85 * c.z, align: 'center', size: 120 * c.z, kana: 0.55, fill: { grad: ['#fffaf0', '#f2d9a6', '#c8a05a'] }, exit: 123.25 });
  },
  // snap out of the dial with a turn, then the whole clock face slowly turns back (time slipping by)
  cam: [[119.45, { z: 1.3, r: 0.16 }, 'ox'], [120.4, { z: 1.0, r: 0 }, 'io'], [123.2, { z: 1.1, r: -0.05 }]], hh: 0.5, pulse: 1.3,
};
// the right half ignites as its singer comes in; the camera punches in on that moment
const splitCam = i => (t, s) => { const tR = T.lines[i].chars[5];
  return keyed(t, [[s.a, { z: 1.08, x: 900 }, 'ox'], [s.a + 0.45, { z: 1.0, x: 960 }, 'l'], [tR - 0.08, { z: 1.02, x: 960 }, 'ox'], [tR + 0.35, { z: 1.1, x: 980, r: 0.015 }, 'l'], [s.b, { z: 1.13, x: 990, r: 0.02 }]]); };
const split3 = { plate(g, t) { monoSplit(g, t, { who: 'shi', key: 'shi_cos' }, { who: 'to', key: 'to_cos' }, T.lines[36].chars[5], ['dish_471762', 'iron_466304']); },
  over(g, t) { splitText(g, t, 36); }, cam: splitCam(36), hh: 0.6, pulse: 1.3 };
const split4 = { plate(g, t) { monoSplit(g, t, { who: 'na', key: 'na_cos' }, { who: 'ri', key: 'ri_cos' }, T.lines[37].chars[5], ['iron_466304', 'dish_468516']); },
  over(g, t) { splitText(g, t, 37); }, cam: splitCam(37), hh: 0.6, pulse: 1.3 };
function blurInto(g, px, draw) {
  if (px < 0.6) { draw(g); return; }
  const m = g.getTransform(); const [c, b] = buf('rack6', W / 2, H / 2);
  b.filter = `blur(${px / 2}px)`; b.save(); b.setTransform(m.a / 2, m.b / 2, m.c / 2, m.d / 2, m.e / 2, m.f / 2); draw(b); b.restore(); b.filter = 'none';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, 0, 0, W, H); g.restore();
}
// うたかた: a rack focus through rising fizz, the camera rising with the bubbles
const bubbles = {
  plate(g, t, s) {
    const u = clamp((t - s.a) / (s.b - s.a)), rack = E.inOutSine(clamp((u - 0.25) / 0.45)), f = CF.cardYo.yo;
    fillBig(g, '#120608');
    blurInto(g, lerp(22, 0, rack), b => cover(b, IMG.card_yo, [-200, -150, W + 400, H + 300], 2.0, f[0] + 0.03, f[1] - 0.01));
    if (rack > 0.5) addFace(g, 682, 510, 538);
    washW(g, '#3a1020', lerp(0.35, 0.12, rack), 'multiply');
    g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = lerp(0.95, 0.6, rack);
    blurInto(g, lerp(0, 26, rack), b => { b.filter = 'contrast(1.5) brightness(0.85) saturate(0.7) sepia(0.35)'; cover(b, IMG.photo_c2_fizz, [-200, -150, W + 400, H + 300], 2.1, 0.6, lerp(0.62, 0.4, u)); b.filter = 'none'; });
    g.restore();
    rising(g, t * 1.6, 1300, 17); rising(g, t * 1.3, 500, 19);
    for (let i = 0; i < 9; i++) { const a = smooth(0.5 + i * 0.04, 0.65 + i * 0.04, u) * (0.6 + 0.4 * Math.sin(t * 3 + i)); sparkle(g, 300 + hash(i, 41) * 1300, lerp(900, 120, (u * 0.7 + hash(i, 42)) % 1), 0.5 + hash(i, 43) * 0.5, a, '#fff0f4'); }
  },
  over(g, t) { low(g, t, 38, 'R', 950, { fill: '#fff0f4', glow: 'rgba(255,190,210,0.55)' }); },
  cam: [[127.55, { y: 615, z: 1.0, r: 0.012 }, 'io'], [130.55, { y: 480, z: 1.14, r: -0.01 }]], hh: 0.4, pulse: 0.8,
};
// Canción de amor: the camera glides along the strings; a glint runs along them on every beat
const guitarMacro = {
  plate(g, t) { fillBig(g, '#0c0604'); glow(g, 900, 560, 1000, '#ffb060', 0.3 + 0.12 * pulse(t, 4, 3)); obj(g, M('guitar_503932'), 1050, 560, 1700, { rot: -1.25, shadow: false });
    const b = beatF(t), fr = b - Math.floor(b), gx = lerp(1700, 300, E.inOutSine(fr)), gy = 560 + (gx - 1050) * Math.tan(-1.25 + Math.PI / 2) * 0;
    g.save(); g.globalCompositeOperation = 'screen'; g.translate(gx, gy); g.rotate(0.32); const gr = g.createLinearGradient(-90, 0, 90, 0);
    gr.addColorStop(0, 'rgba(255,214,150,0)'); gr.addColorStop(0.5, `rgba(255,236,190,${0.45 * Math.sin(Math.PI * fr)})`); gr.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = gr; g.fillRect(-90, -400, 180, 800); g.restore();
    embers(g, t, 40, 101, { a: 0.7, speed: 50, rect: [-300, -300, W + 600, H + 600] }); },
  over(g, t) { const l = T.lines[39];
    drawText(g, t, l.text, { x: 960, y: 520, align: 'center', size: 150, fontStr: font(F.script, 150, 400), fill: { grad: ['#fff6e0', '#f6d58e', '#d9a548'] }, glow: 'rgba(255,190,120,0.6)', glowBlur: 24, shadow: 'rgba(16,6,2,0.9)', start: l.start - 0.15, stagger: 0.06, dur: 0.8, anim: 'blur', exit: 133.7, exitAnim: 'up', exitDur: 0.5 }); },
  cam: [[130.55, { x: 1350, y: 590, z: 1.45, r: 0.05 }, 'io'], [133.62, { x: 640, y: 530, z: 1.22, r: -0.02 }]], hh: 0.5, pulse: 0.9,
};

/* ================================================================ DANCE BREAK — v6.4: a tablao. One spotlight on Nagi, a Moorish
   lattice thrown on the wall behind her, her shadow dancing on it, two coloured beams sweeping across; then the roll call
   (neon arches igniting) and the five jewels converging into the dawn */
const danceWall = {
  plate(g, t) {
    const b = beatF(t), fl = 0.92 + 0.08 * noise1(t * 3, 9) + 0.08 * pulse(t, 1, 8), SX = 860;
    fillBig(g, '#0a0406'); tiles(g, M('tile_187938'), 240, 0.1);
    // the gobo: a turning lattice of light on the wall around her
    g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.5 * fl;
    withMask(g, circlePath(SX, 420, 760), h => { kaleido(h, M('tile_187938'), { n: 8, rot: t * 0.04, R: 800, cx: SX, cy: 420, zoom: 1.1 }); });
    g.restore();
    radialW(g, SX, 420, 820, [[0, 'rgba(255,170,90,0.0)'], [0.6, 'rgba(10,4,6,0.35)'], [1, 'rgba(10,4,6,0.96)']]);
    glow(g, SX + 180, 430, 820, '#ffb070', 0.42 * fl);
    // her shadow on the wall, larger and swaying with the music
    const sway = Math.sin((t - 133.62) * Math.PI / (T.beat * 2)) * 0.05;
    g.save(); g.filter = 'blur(10px)'; g.globalAlpha = 0.72; place(g, tinted(IMG.na_cos, '#140406'), 1180, 400, 1500, { rot: sway }); g.restore();
    // the spotlight cone and two coloured beams crossing on the downbeats
    cone(g, SX, -160, 70, 640, 1250, '#ffd9a8', 0.24 * fl);
    const sw = Math.sin(b * Math.PI / 4);
    beam(g, -150, -120, 0.75 + 0.28 * sw, '#ff2a4a', 0.16); beam(g, W + 150, -120, Math.PI - 0.75 - 0.28 * sw, '#ffb040', 0.14);
    const fr = framing('na_cos', 'wide', 0.45, { h: 1000 });
    figure(g, 'na_cos', fr, { shadow: false, glow: '#ff9a50', glowA: 0.3, rim: '#ffc890', rimA: 0.85, rimSide: 1 }); face(g, 'na_cos', fr);
    dust(g, t, 60, 17, [SX - 520, -100, 1040, 1250], 0.55 * fl, '#ffe8c8');
    embers(g, t, 26, 41, { a: 0.6, speed: 70, rect: [-300, -300, W + 600, H + 600] });
  },
  // from the whole tablao, slowly into her face, ready to whip into the roll call (never below the art's edge)
  cam: [[133.62, { x: 860, y: 555, z: 1.0 }, 'io'], [139.4, { x: 740, y: 470, z: 1.45, r: -0.02 }, 'io'], [141.36, { x: 690, y: 445, z: 1.9, r: -0.03 }]], hh: 0.6, pulse: 1.0,
};
// a cone of light from (x, y) downwards: top half-width w0, bottom half-width w1 at length L
function cone(g, x, y, w0, w1, L, color, a) {
  g.save(); g.globalCompositeOperation = 'screen'; const gr = g.createLinearGradient(0, y, 0, y + L);
  gr.addColorStop(0, rgba(color, a * 1.4)); gr.addColorStop(0.6, rgba(color, a * 0.6)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.beginPath(); g.moveTo(x - w0, y); g.lineTo(x + w0, y); g.lineTo(x + w1, y + L); g.lineTo(x - w1, y + L); g.closePath(); g.fill();
  glow(g, x, y + 40, 260, color, a * 2); g.restore();
}
// a stage beam from (x, y) along angle an
function beam(g, x, y, an, color, a) {
  g.save(); g.globalCompositeOperation = 'screen'; g.translate(x, y); g.rotate(an); const L = 2600, gr = g.createLinearGradient(0, 0, L, 0);
  gr.addColorStop(0, rgba(color, a * 1.6)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr;
  g.beginPath(); g.moveTo(0, -30); g.lineTo(L, -260); g.lineTo(L, 260); g.lineTo(0, 30); g.closePath(); g.fill(); g.restore();
}
const NDISH = { yo: 'iron_466304', na: 'dish_471762', shi: 'dish_468516', to: 'iron_466304', ri: 'dish_471762' };
const rollCall = (who, size, k = 1) => ({
  plate(g, t, s) {
    const m = MEM[who], fr = framing(COS[who], size, 0.66, { k });
    fillBig(g, '#06030a'); radialW(g, fr.x, 520, 1300, [[0, rgba(m.deep, 1)], [0.6, rgba(m.deep, 0.4)], [1, 'rgba(0,0,0,0)']]);
    // the arches ignite from the middle outwards, each with a few blinks
    for (let j = -2; j < 9; j++) { const x = 120 + j * 290; neonStroke(g, m.ink, 3, q => horseshoe(q, x, H + 60, 220, 820), ignite(t, s.a + 0.04 + Math.abs(x - fr.x) / 2600, 70 + j)); }
    neon(g, NDISH[who], fr.x, fr.y, fr.fh * 2.6, m.ink, { a: 0.75 * ignite(t, s.a + 0.15, 90), rot: t * 0.06 });
    figure(g, COS[who], fr, { rim: m.light, rimSide: -1 }); face(g, COS[who], fr);
    lightFront(g, lerp(-300, 2400, E.inOutSine(inv(s.a + 0.05, s.a + 0.75, t))), Math.sin(Math.PI * inv(s.a + 0.05, s.a + 0.75, t)), m.light);
  },
  over(g, t, s) {
    const m = MEM[who], p = E.outExpo(clamp((t - s.a - 0.1) / 0.6));
    g.save(); g.globalAlpha = 0.3 * p; g.font = font(F.anton, 420, 400); g.textBaseline = 'middle'; g.textAlign = 'center'; g.strokeStyle = m.light; g.lineWidth = 3; g.strokeText(m.name, 640 - (1 - p) * 320 + (t - s.a) * 22, 560); g.restore();
    label(g, m.name, 150 - (1 - p) * 80, 780, { fam: F.anton, size: 110, color: IV, track: 0.06, alpha: p });
    g.save(); g.globalAlpha = p; g.fillStyle = m.ink; g.fillRect(156, 812, 260 * p, 6); g.restore();
    label(g, `${m.jp}　CV.${m.cv}`, 156, 870, { size: 28, weight: 700, color: IV, track: 0.12, alpha: smooth(s.a + 0.35, s.a + 0.9, t) });
  },
  cam: [[0, { x: 1010, z: 1.08 }, 'l'], [1, { x: 930, z: 1.0 }]], hh: 0.6, pulse: 1.0,
});
// five pendants drop in on the beat and swing; on the build they gather into a turning ring round the light, which takes over
const JDROP = k => 160.72 + 0.25 + k * T.beat * 2;
const jewels = {
  plate(g, t, s) {
    const p = inv(s.a, 166.53, t), conv = E.inCubic(inv(164.9, 166.45, t));
    fillBig(g, '#2a0408'); const tx = M('textile_222561'); if (tx) cover(g, tx, [-500, -400, W + 1000, H + 800], 1.0); washW(g, '#1a0206', 0.45, 'multiply');
    lightRays(g, 960, 540, 1800, t * (0.06 + 0.25 * conv), 30, '#ffd08a', 0.18 + 0.55 * smooth(163.5, 166.3, t));
    glow(g, 960, 540, 500 + 700 * conv, '#ffcf8a', 0.25 + 0.6 * conv);
    ORDER.forEach((w, k) => {
      const td = JDROP(k), u = t - td; if (u < -0.05) return;
      const drop = E.outBack(clamp(u / 0.5)), sw = 0.3 * Math.exp(-2.2 * Math.max(0, u)) * Math.sin(Math.max(0, u) * 7.5);
      const bx = 960 + (k - 2) * 340, by = 540 + Math.abs(k - 2) * 26, ra = (k / 5) * TAU - Math.PI / 2 + conv * 1.6, rx = 960 + Math.cos(ra) * 290, ry = 540 + Math.sin(ra) * 290;
      const x = lerp(bx, rx, conv), y = lerp(by, ry, conv) - (1 - drop) * 900;
      g.save(); g.translate(x, y - 330); g.rotate(sw * (1 - conv)); g.translate(-x, -(y - 330));
      g.strokeStyle = GOLD; g.globalAlpha = 0.7 * (1 - conv); g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 1000); g.lineTo(x, y - 156); g.stroke(); g.globalAlpha = 1;
      const sc = 1 + 0.15 * pulse(t, 2, 6) - 0.3 * conv;
      g.translate(x, y); g.scale(sc, sc); g.translate(-x, -y);
      glow(g, x, y, 230, MEM[w].ink, 0.45 + 0.3 * pulse(t));
      withMask(g, circlePath(x, y, 142), h => cover(h, IMG.cover, [x - 142, y - 142, 284, 284], 4.2, CF.cover[w][0], CF.cover[w][1]));
      rings(g, x, y, [146], GOLD, 4, 1); rings(g, x, y, [156], MEM[w].ink, 3, 0.9); g.restore(); });
    embers(g, t, Math.round(24 + 50 * p), 77, { a: 0.85, speed: 90 + 80 * p, rect: [-300, -300, W + 600, H + 600] });
    washW(g, '#fff3e0', Math.pow(smooth(165.4, 166.53, t), 2) * 0.9, 'screen');
  },
  cam: [[160.71, { z: 1.0 }, 'iq'], [166.53, { z: 1.3 }]], hh: 0.6, pulse: 1.4,
};

/* ================================================================ BRIDGE (dawn) — one real sunrise through the whole bridge
   (sky, sun, rays, glitter and flares from dawn6.js). Nagi starts as a back-lit silhouette in the blue hour; the sun
   breaks the horizon on 朝日が and clears it on 照らした, and its light sweeps across her. The cuts are carried by the
   sun itself: a flare sweeping the frame, a zoom through a glint. */
const NAGI_FR = lerpFr(framing('na_cos', 'knee', 0.68), framing('na_cos', 'bust', 0.67), 0.6);
const sunUp = () => T.lines[40].chars[3]; // 照
const nagiDawn = {
  plate(g, t, s, c) {
    const SUNUP = sunUp(), sky = dawnSky(g, t, c, { sx: 600, burst: SUNUP }), fr = NAGI_FR;
    // the art is a card cut-out: a dark, rim-lit silhouette first, then the lit figure where the light front has passed
    figure(g, 'na_cos', fr, { shadow: false, grade: '#1e1c46', gradeA: 0.8, gradeOp: 'multiply', rim: '#ffc89a', rimA: 0.5 + 0.5 * sky.vis, rimSide: -1 });
    const front = lerp(600, 2400, E.inOutCubic(inv(SUNUP - 0.3, SUNUP + 0.9, t)));
    relit(g, b => figure(b, 'na_cos', fr, { shadow: false, rim: '#fff0c8', rimA: 0.9, rimSide: -1, glow: '#ffd8a0', glowA: 0.14, grade: '#ff9a60', gradeA: 0.26, gradeOp: 'soft-light' }), front, 340);
    lightFront(g, front, Math.sin(Math.PI * inv(SUNUP - 0.3, SUNUP + 0.9, t)));
    face(g, 'na_cos', fr);
    dust(g, t, 46, 7, [300, -100, 1800, 1200], 0.25 + 0.55 * sky.vis);
    lensFlare(g, sky.sun[0], sky.sun[1], 0.75 * sky.vis);
  },
  over(g, t) { const st = { fill: '#fffaf2', glow: 'rgba(255,170,120,0.55)', shadow: 'rgba(20,6,20,0.7)' }; low(g, t, 40, 'L', 860, st); low(g, t, 41, 'L', 955, st); },
  // wide on the horizon, crane up with the sun, then a dolly in to her profile for ふたりの横顔を (never below the art's edge)
  cam: [[166.53, { x: 1010, y: 545, z: 1.02 }, 'io'], [168.3, { x: 1000, y: 520, z: 1.05 }, 'io'], [170.1, { x: 1060, y: 470, z: 1.12, r: 0 }, 'io3'], [173.95, { x: 1230, y: 390, z: 1.6, r: -0.03 }]], hh: 0.5, pulse: 0.9,
};
// ああ あなたのカフスを: a macro on a brooch with the sun right behind it — the light breaks round its edges, its stones flash on the beat
const JFACET = [[-58, -54], [65, 110], [-20, 60], [30, -80], [-80, 100], [10, 200], [70, -20]];
const dawnJewel = {
  plate(g, t, s, c) {
    const sky = dawnSky(g, t, c, { sx: 1350, elev: 245 + (t - s.a) * 10, k: 1 });
    const foc = E.outCubic(inv(s.a - 0.1, s.a + 1.0, t));
    blurInto(g, lerp(16, 0, foc), b => obj(b, M('jewel_206840'), 1320, 500, 560, { rot: 0.06, shadow: false }));
    const bp = beatF(t), k = Math.floor(bp), fr = bp - k;
    JFACET.forEach(([dx, dy], j) => { const on = ((k % JFACET.length) + JFACET.length) % JFACET.length === j ? Math.exp(-fr * 3.2) : 0;
      sparkle(g, 1320 + dx, 500 + dy, 0.5 + 1.6 * on + 0.15 * Math.sin(t * 3 + j), (0.35 + 0.65 * on) * foc, '#fffaf0'); });
    starBurst(g, sky.sunW[0], sky.sunW[1], t, 0.55, 0.9);
    prism(g, t, 1320, 500, 0.8 * foc);
    dust(g, t, 34, 9, [300, 0, 1800, 1080], 0.7);
    lensFlare(g, sky.sun[0], sky.sun[1], 0.9);
  },
  over(g, t) { const st = { fill: '#4a1626', glow: 'rgba(255,246,236,0.85)', glowBlur: 18, shadow: null, hot: '#b01e3c' };
    L(g, t, 42, { ...st, to: 2, x: 200, y: 420, size: 120, kana: 0.62, drift: [16, 0] }); L(g, t, 42, { ...st, from: 3, x: 200, y: 590, size: 150, kana: 0.72, drift: [16, 0], accent: { from: 4, to: 7, fill: '#8a1a1a', glow: 'rgba(255,236,200,0.9)' } }); },
  cam: [[174.35, { x: 1180, y: 520, z: 1.0, r: 0.03 }, 'io'], [178.5, { x: 1290, y: 500, z: 1.3, r: -0.01 }]], hh: 0.5, pulse: 0.9,
};
// small spectral dots thrown by the stones, drifting
function prism(g, t, cx, cy, a) {
  if (a <= 0.01) return; const C = ['#ff9a9a', '#ffd88a', '#a8ff9a', '#8ad8ff', '#c8a0ff'];
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 22; i++) { const an = hash(i, 61) * TAU + t * 0.08 * (hash(i, 62) - 0.5), r = 260 + hash(i, 63) * 900, x = cx + Math.cos(an) * r * 1.4, y = cy + Math.sin(an) * r * 0.7, s = 6 + hash(i, 64) * 16;
    g.globalAlpha = a * 0.35 * (0.5 + 0.5 * Math.sin(t * (1 + hash(i, 65) * 2) + i)); g.drawImage(softDot(C[i % 5], 32), x - s, y - s, s * 2, s * 2); }
  g.restore();
}
// 握りしめたまま: the hands in a slanting beam of morning light
const hands = {
  plate(g, t, s, c) { fillBig(g, '#3a1a20'); cover(g, IMG.card_yo, [-300, -200, W + 600, H + 400], 2.5, CF.cardYo.hands[0], CF.cardYo.hands[1]); washW(g, '#ffb080', 0.25, 'soft-light'); washW(g, '#fff0e0', 0.1, 'screen');
    const sw = noise1(t * 0.7, 71) * 0.06, bx = 1350 + (t - s.a) * 40;
    g.save(); g.globalCompositeOperation = 'screen'; g.translate(bx, -300); g.rotate(0.62 + sw); const bg = g.createLinearGradient(-260, 0, 260, 0);
    bg.addColorStop(0, 'rgba(255,214,160,0)'); bg.addColorStop(0.5, `rgba(255,236,200,${0.55 + 0.08 * noise1(t * 3, 72)})`); bg.addColorStop(1, 'rgba(255,214,160,0)'); g.fillStyle = bg; g.fillRect(-260, 0, 520, 2600); g.restore();
    sparkle(g, 900, 640, 1.3 + 0.3 * Math.sin(t * 3) + 0.4 * pulse(t), 0.9);
    dust(g, t, 40, 11, [300, -100, 1600, 1300], 0.8);
    lensFlare(g, 1840 - (t - s.a) * 30, 70, 0.7, { streak: 900 }); },
  over(g, t) { low(g, t, 43, 'R', 955, { fill: '#fffaf2', glow: 'rgba(255,170,120,0.55)' }); },
  cam: [[178.5, { z: 1.02, x: 1000, r: 0.015 }, 'io'], [180.85, { z: 1.16, x: 930, r: -0.01 }]], hh: 0.5, pulse: 0.9,
};
// そっと 不安に揺れてる私を: morning mist with the low sun behind it — shafts of light through the fog, Tomoe back-lit
const mist = {
  plate(g, t, s, c) {
    gradBig(g, [[0, '#d8c0e0'], [0.55, '#f6d6d0'], [1, '#fbe6d2']]);
    const SX = 330, SY = 190; glow(g, SX, SY, 1300, '#fff2d8', 0.55); glow(g, SX, SY, 380, '#ffffff', 0.8); starBurst(g, SX, SY, t, 0.45, 0.8);
    godRays(g, SX, SY, 2800, 0.25 + t * 0.006, 16, '#fff6e6', 0.4);
    for (let k = 0; k < 8; k++) glow(g, ((k * 400 + t * 30) % 3200) - 640, 600 + Math.sin(k) * 220, 520, '#ffffff', 0.25);
    const fr = lerpFr(framing('to_white', 'knee', 0.46), framing('to_white', 'bust', 0.45), 0.5);
    figure(g, 'to_white', fr, { shadow: false, rim: '#fffaf0', rimA: 0.95, rimSide: -1, glow: '#ffffff', glowA: 0.45, grade: '#ffd8b8', gradeA: 0.18, gradeOp: 'soft-light' }); face(g, 'to_white', fr);
    for (let k = 0; k < 5; k++) glow(g, ((k * 640 - t * 46) % 3200 + 3200) % 3200 - 640, 900, 620, '#ffffff', 0.3);
    dust(g, t, 60, 13, [-200, -100, 2300, 1300], 0.85, '#fffaf0');
    lensFlare(g, W / 2 + (SX - c.x) * c.z, H / 2 + (SY - c.y) * c.z, 0.6);
  },
  over(g, t) { const st = { fill: '#4a2a4a', glow: 'rgba(255,255,255,0.8)', glowBlur: 16, shadow: null, hot: '#c060a0', size: 80, kana: 0.6, vertical: true };
    L(g, t, 44, { ...st, to: 3, x: 1730, y: 170, drift: [0, 12] }); L(g, t, 44, { ...st, from: 4, x: 1600, y: 260, drift: [0, 12] }); },
  // a slow drift with a slight, uneasy sway (揺れてる)
  cam: [[180.85, { x: 860, z: 1.04, r: 0.012 }, 'io'], [183.3, { x: 950, z: 1.08, r: -0.008 }, 'io'], [185.8, { x: 1030, z: 1.12, r: 0.008 }]], hh: 0.6, pulse: 0.9,
};
// 誤魔化さないで／抱きしめて: the sun is up behind her; on 抱きしめて the light closes round her like an embrace
const embrace = {
  plate(g, t, s, c) {
    const sky = dawnSky(g, t, c, { sx: 730, elev: 440 + (t - s.a) * 6, k: 0.35 }), hug = smooth(Ls(46) - 0.2, Ls(46) + 1.0, t);
    const fr = lerpFr(framing('shi_swim', 'bust', 0.5), framing('shi_swim', 'face', 0.5), 0.45);
    figure(g, 'shi_swim', fr, { shadow: false, glow: '#ffd0a0', glowA: 0.3 + hug * 0.5, rim: '#fff0d0', rimA: 0.9, grade: '#ffb080', gradeA: 0.18, gradeOp: 'soft-light' }); face(g, 'shi_swim', fr);
    rings(g, 960, 520, [lerp(900, 430, hug), lerp(940, 460, hug)], '#fff0d8', 2, hug * 0.8); glow(g, 960, 520, 600 + hug * 500, '#fff4e0', hug * 0.55);
    // motes of light drawn in towards her
    g.save(); g.globalCompositeOperation = 'lighter'; const d = softDot('#fff2d8', 32);
    for (let i = 0; i < 70; i++) { const an = hash(i, 81) * TAU + t * (0.25 + 0.5 * hug) * (i % 2 ? 1 : -1), r = (380 + hash(i, 82) * 900) * (1 - 0.55 * hug) + 30 * Math.sin(t * 2 + i), sz = 2 + hash(i, 83) * 5;
      g.globalAlpha = 0.25 + 0.55 * hug * (0.5 + 0.5 * Math.sin(t * 3 + i)); g.drawImage(d, 960 + Math.cos(an) * r * 1.4 - sz, 520 + Math.sin(an) * r * 0.9 - sz, sz * 2, sz * 2); }
    g.restore();
    lensFlare(g, sky.sun[0], sky.sun[1], 0.6 + 0.3 * hug, { streakA: 0.25, veil: 0.6 });
  },
  over(g, t) { const st = { fill: '#fffaf2', glow: 'rgba(255,170,120,0.6)', shadow: 'rgba(60,20,30,0.55)' }; low(g, t, 45, 'L', 860, st); low(g, t, 46, 'L', 955, { ...st, size: 80 }); },
  cam: [[185.8, { y: 520, z: 1.0 }, 'io'], [188.3, { y: 480, z: 1.12 }, 'io'], [191.3, { y: 470, z: 1.2 }]], hh: 0.5, pulse: 0.9,
};

/* ================================================================ ESPECIAL */
const ESP = [[191.3, 'card_yo', CF.cardYo.yo, 'yo'], [198.7, 'card_na', CF.cardNa.na, 'na'], [202.2, 'cover', [0.375, 0.228], 'shi']];
const especial = {
  plate(g, t) {
    let cur = ESP[0], prev = null; for (const e of ESP) if (t >= e[0]) { prev = cur === e ? prev : cur; cur = e; }
    const [t0, img, f, who] = cur, m = MEM[who], a = E.outExpo(clamp((t - t0) / 0.5));
    fillBig(g, '#3a0610'); const tx = M('textile_222561'); if (tx) cover(g, tx, [-600, -500, W + 1200, H + 1000], 1.0); washW(g, '#1a0206', 0.35, 'multiply');
    obj(g, M('shawl_157896'), 330, 230, 640, { rot: -0.1, a: 0.95 });
    g.save(); g.font = font(F.anton, 300, 400); g.textBaseline = 'middle'; g.fillStyle = rgba('#f2d9a6', 0.85); g.translate(110, 560); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('ESPECIAL', 0, 0); g.restore();
    const fx = 1110, fy = 120, fw = 620, fh = 820;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 40; g.fillStyle = '#f6efe0'; g.fillRect(fx - 26, fy - 26, fw + 52, fh + 110); g.restore();
    if (prev && a < 1) cover(g, IMG[prev[1]], [fx, fy, fw, fh], prev[1] === 'cover' ? 4.0 : 2.1, prev[2][0], prev[2][1]);
    g.save(); g.beginPath(); g.rect(fx + (prev ? (1 - a) * fw : 0), fy, fw, fh); g.clip(); cover(g, IMG[img], [fx, fy, fw, fh], img === 'cover' ? 4.0 : 2.1, f[0], f[1]); g.restore();
    addFace(g, fx + fw / 2, fy + fh * 0.42, 360);
    label(g, m.name, fx + fw, fy + fh + 48, { fam: F.anton, size: 32, color: '#2a1414', track: 0.2, align: 'right' }); g.fillStyle = m.ink; g.fillRect(fx, fy + fh + 34, 90, 8);
    earrings(g, M('jewel_206840'), fx - 60, fy + 120, 240, t, 1);
  },
  over(g, t) {
    slam(g, t, 'Especial!!', T.lines[47].chars.concat([192.3, 192.35]), { x: 600, y: 300, size: 150, exit: 192.9, gloss: 'と　く　べ　つ' });
    slam(g, t, 'Especial!!', T.lines[50].chars.concat([200.0, 200.05]), { x: 600, y: 300, size: 150, exit: 200.6, gloss: 'と　く　べ　つ' });
    if (t > 194.8 && t < 199.2) { const p = smooth(194.8, 195.4, t) * (1 - smooth(198.4, 198.9, t));
      drawText(g, t, '熱情', { x: 640, y: 110, vertical: true, size: 380, fontStr: font(F.dela, 380, 400), fill: '#f6efe0', glow: 'rgba(255,40,60,0.45)', glowBlur: 36, anim: 'zoom', start: 195.0, stagger: 0.2, dur: 0.5, alpha: p }); }
    low(g, t, 48, 'L', 860); low(g, t, 49, 'L', 955); low(g, t, 51, 'L', 860); low(g, t, 52, 'L', 955);
  },
  cam: [[191.3, { x: 1000, z: 1.08 }, 'io'], [199.0, { x: 960, z: 1.0 }, 'io'], [209.11, { x: 940, z: 1.1 }]], hh: 0.5, pulse: 1.0,
};

/* ================================================================ FINAL CHORUS (dawn)
   The climax: the camera never settles. Momentum is carried across the cuts (rightward whips, a downward
   whip for 溺れたい), every hook lands on a camera punch, and the beat is shown by local light (rings
   thrown out of the medallion, a chase of light along the arches),
   never by shaking the whole frame. */
// petals thrown out from (cx, cy) at t0: fast, decelerating, then drifting down
function burst(g, t, t0, cx, cy, n, seed, o = {}) {
  const u = t - t0, life = o.life || 2.6, base = IMG.obj_b2_drop; if (u < 0 || u > life || !base) return;
  const R = o.R || 900, out = E.outExpo(clamp(u / 1.1));
  g.save();
  for (let i = 0; i < n; i++) {
    const an = hash(i, seed) * TAU, d = R * (0.35 + hash(i, seed + 1) * 0.75) * out;
    const x = cx + Math.cos(an) * d * 1.3, y = cy + Math.sin(an) * d * 0.85 + u * u * 70;
    const sz = (34 + hash(i, seed + 2) * 58) * (o.size || 1), spin = u * (2.5 + hash(i, seed + 3) * 4) + i;
    g.globalAlpha = clamp(u * 10) * (1 - smooth(life * 0.55, life, u));
    g.save(); g.translate(x, y); g.rotate(spin); g.scale(Math.cos(spin * 1.3), 1);
    const s = sz / base.width; g.drawImage(base, -base.width * s / 2, -base.height * s / 2, base.width * s, base.height * s); g.restore();
  }
  g.restore();
}
// a gold ring thrown out on every beat, a wider one on the downbeat
function shock(g, t, cx, cy, r0, color = GOLD, a = 1) {
  const b = beatF(t); if (b < 0) return;
  for (let j = 0; j < 2; j++) {
    const k = Math.floor(b) - j, age = (b - k) * T.beat; if (age > 0.95) continue;
    const down = k % 4 === 0, u = age / 0.95, r = r0 + E.outCubic(u) * (down ? 950 : 480);
    rings(g, cx, cy, [r], color, (down ? 9 : 4) * (1 - u) + 1, (1 - u) * (down ? 0.85 : 0.4) * a);
  }
}
const amanecer = {
  plate(g, t, s) { fillBig(g, '#c08060'); cover(g, M('ceiling_386262'), [-500, -700, W + 1000, H + 1400], 1.0, 0.5, 0.5); washW(g, '#ffb070', 0.2, 'soft-light');
    lightRays(g, 960, 560, 1800, t * 0.12, 30, '#fff0c8', 0.4 + 0.25 * pulse(t, 1, 6));
    medallion(g, t, 960, 560, 330, 'dish_468513'); shock(g, t, 960, 560, 520);
    burst(g, t, s.a, 960, 560, 40, 23, { R: 1000 });
    petals(g, t, 18, 19, { a: 1, speed: 120, wind: 70, rect: [-300, -300, W + 600, H + 600] }); },
  over(g, t) { slam(g, t, 'Amanecer!!', T.lines[53].chars.concat([209.6, 209.65]), { x: 960, y: 130, size: 130, exit: 210.6, gloss: '' }); low(g, t, 54, 'L', 955); },
  // snap out of the medallion with a roll, then lean in and drift right into the whip
  cam: [[209.11, { z: 1.8, r: -0.14 }, 'ox'], [210.1, { z: 1.0, r: 0 }, 'iq'], [212.35, { x: 1120, y: 540, z: 1.28, r: 0.03 }]], hh: 0.6, pulse: 1.4,
};
// light chases along the five arches, one per beat; all five flare on the downbeat after また朝が来るわ
const dawnArches = {
  plate(g, t, s) {
    archWall(g, t, { base: '#3a1408', tileA: 0.6, glowC: 'rgba(255,190,120,0.3)', warm: 0.25,
      lit: (tt, w) => smooth(s.a - 0.15 + ORDER.indexOf(w) * 0.06, s.a + 0.2 + ORDER.indexOf(w) * 0.06, tt),
      chase: (tt, k) => { const b = beatF(tt), k0 = Math.floor(b), d = b - k0; return Math.max(((k0 % 5) + 5) % 5 === k ? Math.exp(-d * 2.6) : 0, k0 === Math.floor(beatF(214.92)) ? Math.exp(-d * 1.4) : 0); } });
    lightRays(g, 960, -260, 2200, 0.3 + Math.sin(t * 0.4) * 0.08, 14, '#ffe6b8', 0.22);
    petals(g, t, 14, 29, { a: 0.9, speed: 110, wind: 120, rect: [-400, -300, W + 800, H + 600] });
  },
  over(g, t) { const st = { fill: '#fffaf2', glow: 'rgba(255,170,120,0.6)' };
    L(g, t, 55, { ...st, to: 7, x: 140, y: 955, size: 68, kana: 0.64, drift: [18, 0] }); L(g, t, 55, { ...st, from: 8, x: 1780, y: 955, align: 'end', size: 68, kana: 0.64, drift: [-18, 0] }); },
  // hold on Yoshino/Nagi, whip-pan to Tomoe/Riamu, pull back to the whole wall on the downbeat, lean into the centre
  cam: [[212.35, { x: 400, y: 520, z: 1.62, r: -0.02 }, 'io'], [213.55, { x: 470, y: 515, z: 1.6, r: -0.01 }, 'io3'], [214.15, { x: 1330, y: 515, z: 1.6, r: 0.02 }, 'io'],
    [214.9, { x: 1400, y: 520, z: 1.58, r: 0.02 }, 'ox'], [215.55, { x: 960, y: 545, z: 1.0, r: 0 }, 'i'], [216.25, { x: 960, y: 520, z: 1.22, r: 0 }]], hh: 0.5, pulse: 1.3,
};
// 繚乱: roses burst open in three rings, on Enamorar!!, 咲(く) and 繚乱
const BLOOMS = [216.35, 218.65, 219.45];
const bloom = {
  plate(g, t, s) {
    fillBig(g, '#f2dccf'); const p = IMG.paper_peach; if (p) g.drawImage(p, -500, -400, W + 1000, H + 800); const rb = M('rose_337713'); if (rb) cover(g, rb, [-500, -400, W + 1000, H + 800], 1.0, 0.5, 0.5, 0.5);
    lightRays(g, 960, 540, 1700, -t * 0.08, 24, '#fff4e0', 0.3 + 0.2 * pulse(t, 1, 6));
    const f = fly(t, s.a + 0.05, [0, 1], 900, 0.2); if (f.a) { g.save(); g.translate(f.dx, f.dy); piece(g, 960, 540, 620, 620, { img: IMG.cover, z: 1.25, fx: 0.48, fy: 0.38, rot: -0.03 + f.r, seed: 77 }); g.restore(); }
    const roses = [IMG.obj_d_rose, IMG.obj_fi_r3, IMG.obj_fi_r7];
    BLOOMS.forEach((tb, j) => { for (let i = 0; i < 10; i++) { const q = E.outBack(clamp((t - tb - i * 0.025) / 0.45)); if (q <= 0) continue;
      const a = (i / 10) * TAU + j * 0.33 + 0.2, r = (470 + j * 170) * (0.55 + 0.45 * E.outExpo(clamp((t - tb) / 0.8)));
      obj(g, roses[(i + j) % 3], 960 + Math.cos(a) * r * 1.6, 540 + Math.sin(a) * r * 0.9, (150 + ((i + j) % 4) * 36) * q * (1 - j * 0.12), { rot: a + t * 0.3 * (j % 2 ? -1 : 1) }); } });
    BLOOMS.forEach((tb, j) => burst(g, t, tb, 960, 540, 26, 31 + j, { R: 1100 }));
    petals(g, t, 26, 17, { a: 1, speed: 110, wind: 60, rect: [-300, -300, W + 600, H + 600] });
  },
  over(g, t) { slam(g, t, 'Enamorar!!', T.lines[56].chars.concat([217.25, 217.3]), { x: 960, y: 120, size: 120, exit: 217.9, gloss: '' }); low(g, t, 57, 'L', 955, { fill: '#3a1420', glow: 'rgba(255,255,255,0.8)', shadow: null, hot: '#b01e3c' }); },
  // snap out with a roll on Enamorar!!, then a slow turn with two punch-ins on 咲 and 繚乱
  cam: [[216.25, { z: 1.25, r: 0.1 }, 'ox'], [216.95, { z: 1.0, r: 0 }, 'l'], [218.62, { z: 1.04, r: -0.012 }, 'ox'], [219.0, { z: 1.12, r: -0.02 }, 'l'],
    [219.42, { z: 1.13, r: -0.022 }, 'ox'], [219.8, { z: 1.24, r: -0.03 }, 'i'], [220.0, { z: 1.27, r: -0.034 }]], hh: 0.6, pulse: 1.4,
};
// このまま／このまま: the two halves drift against each other; あなたと／溺れたい: closer, under water, sinking
const split5a = { plate(g, t, s) { colourSplit(g, t, { who: 'to', key: 'to_cos', kale: 'tile_187927' }, { who: 'ri', key: 'ri_cos', kale: 'tile_187929' }, T.lines[58].chars[5], { warm: true, shift: [-(t - s.a) * 18, (t - s.a) * 18] }); },
  over(g, t) { splitText(g, t, 58); }, cam: [[220.0, { x: 900, z: 1.1 }, 'ox'], [220.6, { x: 960, z: 1.02 }, 'l'], [222.1, { x: 990, z: 1.07 }]], hh: 0.6, pulse: 1.3 };
const split5b = { plate(g, t, s) { colourSplit(g, t, { who: 'to', key: 'to_cos', kale: 'tile_187929' }, { who: 'ri', key: 'ri_cos', kale: 'tile_187927' }, T.lines[59].chars[5], { size: 'face', k: 1.2, sea: true, grade: '#9ab4ff', gradeA: 0.25, gradeOp: 'soft-light', shift: [-(t - s.a) * 14, -(t - s.a) * 22] }); },
  over(g, t) { L(g, t, 59, { to: 4, x: 140, y: 960, size: 76, kana: 0.7 }); L(g, t, 59, { from: 5, x: 1780, y: 960, align: 'end', size: 76, kana: 0.7 }); }, cam: [[222.1, { y: 520, z: 1.0 }, 'l'], [224.1, { y: 640, z: 1.1 }]], hh: 0.6, pulse: 1.3 };
const nagiKiss = {
  plate(g, t, s) { fillBig(g, '#2a1020'); cover(g, IMG.card_na, [-300, -200, W + 600, H + 400], 1.7, CF.cardNa.na[0] + 0.02, CF.cardNa.na[1] - 0.06); radialW(g, 960, 540, 1300, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(30,6,8,0.5)']]);
    addFace(g, 896, 705, 400); addFace(g, 180, 950, 345);
    const u = inv(s.a, s.b, t); glow(g, lerp(-300, 2200, u), 300 + Math.sin(t * 0.8) * 80, 700, '#ffb0c8', 0.35); glow(g, lerp(2300, -200, u), 860, 600, '#ffd8a0', 0.25);
    bokeh(g, t, 14, 51, ['#ffd0e0', '#fff0d8', '#ffb0c8'], 0.6);
    burst(g, t, 226.72, 896, 1150, 30, 61, { R: 1150 });
    petals(g, t, 20, 21, { a: 1, speed: 100, wind: 90, rect: [-300, -300, W + 600, H + 600] }); },
  over(g, t) { low(g, t, 60, 'R', 955); },
  // a steady push towards her face that tightens on キス
  cam: [[224.1, { x: 896, y: 660, z: 1.0, r: 0.02 }, 'io'], [226.65, { x: 896, y: 720, z: 1.3, r: 0 }, 'ox'], [227.1, { x: 896, y: 735, z: 1.42, r: -0.01 }, 'l'], [228.1, { x: 920, y: 750, z: 1.48, r: -0.015 }]], hh: 0.6, pulse: 1.2,
};
// このまま／このまま: Tomoe & Riamu answered by Yoshino, Nagi & Shin; on 焦がれたい all five drop in as tilted strips
const STRIP = ['to', 'ri', 'yo', 'na', 'shi'], STRIP_T = [229.82, 229.94, 230.92, 231.04, 231.16];
const duoGroups = {
  plate(g, t) {
    const k = E.outExpo(clamp((t - (T.lines[61].chars[5] - 0.15)) / 0.45));
    fillBig(g, '#1a0508');
    const panel = (keys, x0, w0, dir) => h => { kaleido(h, M('tile_187927'), { n: 10, rot: t * 0.05 * dir, R: 1200, cx: x0 + w0 / 2, cy: 540 }); washW(h, '#3a0610', 0.45, 'multiply');
      keys.forEach((key, j) => { const fr = framing(key, 'bust', (x0 + w0 * (j + 0.5) / keys.length) / W, { k: 0.85 }); figure(h, key, fr, { shadow: false, rim: IV, rimA: 0.4 }); face(h, key, fr); }); };
    withMask(g, rectPath(-600, -400, W * 0.42 + 600, H + 800, 80), panel(['to_cos', 'ri_cos'], 0, W * 0.42, 1));
    if (k > 0) { const x0 = W * 0.42 + (1 - k) * W * 0.65; withMask(g, rectPath(x0, -400, W + 800, H + 800, 80), panel(['yo_cos', 'na_cos', 'shi_cos'], W * 0.42, W * 0.58, -1));
      g.save(); g.strokeStyle = GOLD; g.lineWidth = 4; g.beginPath(); g.moveTo(x0 + 80, -400); g.lineTo(x0 - 80, H + 400); g.stroke(); g.restore(); }
    const pw = W / 5, sk = 70;
    STRIP.forEach((w, j) => { const u = E.outExpo(clamp((t - STRIP_T[j]) / 0.5)); if (u <= 0) return;
      const x0 = j * pw, m = MEM[w], dy = -(1 - u) * (H + 600);
      g.save(); g.translate(0, dy);
      withMask(g, rectPath(x0 - 1, -400, pw + 2, H + 800, sk), h => {
        fillBig(h, m.deep); kaleido(h, M('tile_187927'), { n: 8, rot: t * 0.06 * (j % 2 ? -1 : 1) + j, R: 760, cx: x0 + pw / 2, cy: 480 }); washW(h, m.deep, 0.55, 'multiply');
        const fr0 = framing(COS[w], 'face', (x0 + pw / 2) / W, { k: 0.64, y: 480 }), fr = { ...fr0, x: fr0.x + ARCH_DX[w] * fr0.fh };
        figure(h, COS[w], fr, { rim: m.light, shadow: false }); face(h, COS[w], fr);
        const gr = h.createLinearGradient(0, 760, 0, 1100); gr.addColorStop(0, 'rgba(8,2,3,0)'); gr.addColorStop(1, 'rgba(8,2,3,0.8)'); h.fillStyle = gr; h.fillRect(x0 - 200, 760, pw + 400, 800);
      });
      g.strokeStyle = GOLD; g.lineWidth = 4; g.shadowColor = '#ffe0a0'; g.shadowBlur = 16; g.beginPath(); g.moveTo(x0 + sk, -400); g.lineTo(x0 - sk, H + 400); g.moveTo(x0 + pw + sk, -400); g.lineTo(x0 + pw - sk, H + 400); g.stroke();
      g.restore(); });
  },
  over(g, t) { const o61 = { size: 70, kana: 0.7, y: 885, exit: 229.82, exitDur: 0.35 };
    L(g, t, 61, { ...o61, to: 4, x: 140 }); L(g, t, 61, { ...o61, from: 5, x: 1780, align: 'end' });
    L(g, t, 62, { to: 4, x: 140, y: 975, size: 70, kana: 0.7 }); L(g, t, 62, { from: 5, x: 1780, y: 975, align: 'end', size: 70, kana: 0.7 }); },
  cam: [[228.1, { x: 900, z: 1.1 }, 'ox'], [228.7, { x: 960, z: 1.0 }, 'l'], [229.8, { x: 960, z: 1.0 }, 'io'], [231.95, { x: 960, z: 1.04 }]], hh: 0.6, pulse: 1.3,
};
const candleOut = {
  plate(g, t) {
    const out = smooth(233.3, 233.75, t);
    gradBig(g, [[0, '#2a2038'], [1, '#4a3048']]); g.save(); g.globalAlpha = 0.3 * (1 - out * 0.5); cover(g, IMG.cover, [-400, -300, W + 800, H + 600], 1.2, 0.5, 0.36); g.restore(); washW(g, '#2a2040', 0.35, 'multiply');
    const FY = 822; // the wick
    obj(g, IMG.obj_fi_candle, 960, 960, 400, { filter: `brightness(${1 - out * 0.45})` }); glow(g, 958, FY, 260, '#ffb060', 0.8 * (1 - out));
    if (out > 0) { g.save(); g.translate(962, FY); g.scale(0.45, 1); const fl = g.createRadialGradient(0, 0, 0, 0, 0, 120); fl.addColorStop(0, `rgba(40,30,44,${out})`); fl.addColorStop(0.6, `rgba(40,30,44,${0.85 * out})`); fl.addColorStop(1, 'rgba(40,30,44,0)'); g.globalCompositeOperation = 'multiply'; g.fillStyle = fl; g.fillRect(-140, -140, 280, 280); g.restore(); }
    const u = t - 233.45; if (u > 0) { g.save(); g.globalCompositeOperation = 'screen'; for (let i = 0; i < 60; i++) { const age = u - i * 0.05; if (age <= 0 || age > 3) continue; const y = FY + 10 - age * 150, x = 958 + noise1(age * 0.9 + i * 0.1, 7) * age * 60, r = 6 + age * 30; g.globalAlpha = 0.18 * (1 - age / 3); g.drawImage(softDot('#e8e0f0', 64), x - r, y - r, r * 2, r * 2); } g.restore(); }
    washW(g, '#c8b8e8', out * 0.25, 'screen');
  },
  over(g, t) { L(g, t, 63, { x: 960, y: 520, align: 'center', size: 76, kana: 0.62, fill: '#f8f0ff', glow: 'rgba(220,190,255,0.6)', exit: 235.1 }); },
  cam: [[231.95, { y: 600, z: 1.0 }, 'iq'], [235.32, { y: 640, z: 1.2 }]], hh: 0.4, pulse: 0.6,
};
const finalPale = {
  plate(g, t, s) { fillBig(g, '#f2dccf'); const p = IMG.paper_peach; if (p) g.drawImage(p, -500, -400, W + 1000, H + 800); const m = IMG.m_lace_223050_mask; if (m) cover(g, tinted(m, '#fffaf2'), [-500, -400, W + 1000, H + 800], 1.0, 0.5, 0.5, 0.75);
    washW(g, '#f6d8e8', 0.25, 'screen'); fanOpen(g, M('fan_209646'), 260, 1000, 420, 1, { rot: -0.3 }); obj(g, IMG.obj_d_rose, 1780, 930, 300, { rot: 0.4 }); earrings(g, M('jewel_206855'), 900, 300, 260, t, 1);
    polaroid(g, IMG.cover, 1360, 500, 600, { rot: 0.05, z: 1.05, fx: 0.5, fy: 0.45, caption: 'Lleno de amor', capColor: '#7a1f2a', filter: develop((t - s.a) / 2.6) }); tape(g, 1360, 140, 200, 0.06); washW(g, '#fff4e8', 0.12, 'screen');
    petals(g, t, 14, 71, { a: 0.85, speed: 70, wind: 40, rect: [-300, -300, W + 600, H + 600] }); },
  over(g, t) { const l = T.lines[64];
    drawText(g, t, l.text, { x: 600, y: 560, align: 'center', size: 150, fontStr: font(F.script, 150, 400), fill: { grad: ['#b8283e', '#8a1428', '#5a0a1a'] }, glow: 'rgba(255,240,230,0.8)', glowBlur: 24, start: l.start - 0.15, stagger: 0.06, dur: 0.8, anim: 'blur', exit: 238.4, exitAnim: 'up', exitDur: 0.6 }); },
  cam: [[235.32, { z: 1.18, r: -0.025 }, 'o'], [238.14, { z: 1.0, r: 0 }]], hh: 0.4, pulse: 0.6,
};

/* ================================================================ OUTRO
   The music plays on to 263s: the wall of polaroids is a tracking shot that ends in a reveal, and the end
   card keeps breathing (the chibis sway and bow, rays turn, a sheen crosses the title) until an iris closes on the last note. */
const PRIV = { yo: 'yo_swim', na: 'na_casual', shi: 'shi_swim', to: 'to_white', ri: 'ri_resort' };
const credits = {
  plate(g, t, s) {
    fillBig(g, '#efe4d0'); const p = IMG.paper_cream; if (p) g.drawImage(p, -600, -400, W + 1600, H + 800);
    glow(g, lerp(-200, 2200, inv(s.a, s.b, t)), 380 + Math.sin(t * 0.7) * 90, 760, '#ffd8b0', 0.28);
    scribble(g, t, s.a + 0.5, 'después de la noche…', 120, 110, 60, '#7a1f2a', -0.03, 1.4); doodle(g, 'swoosh', 330, 165, 4.2, clamp((t - s.a - 1.8) / 0.8), '#7a1f2a', 4);
    const per = (249.75 - 238.14) / 5;
    ORDER.forEach((w, k) => { const t0 = s.a + k * per, f = fly(t, t0 + 0.1, [0, -1], 800, (k % 2 ? 0.3 : -0.3)); if (!f.a) return;
      const x = 250 + k * 355, y = 450 + (k % 2) * 50; g.save(); g.translate(f.dx, f.dy);
      polaroid(g, null, x, y, 340, { rot: (k % 2 ? 0.05 : -0.05) + f.r, caption: ['buenos días', 'see you ♪', 'sweet ♡', 'gracias', 'yay!'][k], capColor: MEM[w].deep,
        draw: (h, px, py, pw, ph) => { h.fillStyle = MEM[w].light; h.fillRect(px, py, pw, ph); h.filter = develop((t - t0) / 2); figure(h, PRIV[w], { x: px + pw * 0.5, y: py + ph * 0.42, fh: ph * 0.36 }, { shadow: false, floor: py + ph + 4 }); h.filter = 'none'; } });
      tape(g, x, y - 210, 120, (k % 2 ? 0.2 : -0.2)); g.restore();
      const q = pop(t, t0 + 0.6); sticker(g, IMG[{ yo: 'c_yo_swim', na: 'c_na_casual', shi: 'c_shi_swim', to: 'c_to_white', ri: 'c_ri_resort' }[w]], x + 125, y + 250 - hop(beatF(t), k * 0.3, 12), 180 * q.s, { a: q.a, rot: 0.1 + q.r });
      label(g, MEM[w].jp, x - 145, y + 240, { size: 26, weight: 700, color: '#2a1a1a', alpha: smooth(t0 + 0.3, t0 + 0.8, t) });
      label(g, 'CV.' + MEM[w].cv, x - 145, y + 274, { fam: F.klee, size: 20, color: MEM[w].deep, alpha: smooth(t0 + 0.4, t0 + 0.9, t) }); });
    petals(g, t, 10, 91, { a: 0.75, speed: 55, wind: 35, rect: [-300, -300, W + 600, H + 600] });
    laceBorder(g, 'm_lace_220632_mask', H + 6, 100, '#fbf4e8', 0.85, true, 0);
  },
  // track along the wall as each polaroid drops in, then pull back to see all five
  cam: [[238.14, { x: 560, y: 500, z: 1.3, r: -0.015 }, 'io'], [247.4, { x: 1360, y: 500, z: 1.3, r: 0.012 }, 'io3'], [249.75, { x: 960, y: 540, z: 0.99, r: 0 }]], hh: 0.4, pulse: 0.5,
};
const endCard = {
  plate(g, t) {
    fillBig(g, '#3a0610'); const tx = M('textile_222561'); if (tx) cover(g, tx, [-500, -400, W + 1000, H + 800], 1.0); washW(g, '#1a0206', 0.5, 'multiply');
    const brk = smooth(258.85, 259.0, t) * (1 - smooth(259.8, 260.0, t)); // the music takes a breath before its last phrase
    const lit = smooth(250.2, 251.4, t) * (1 - 0.7 * brk);
    lightRays(g, 960, 740, 1500, t * 0.035, 24, '#ffcf8a', (0.16 + 0.08 * pulse(t, 4, 3)) * lit); glow(g, 960, 700, 520, '#ffb060', (0.3 + 0.1 * pulse(t, 4, 3)) * lit);
    fanOpen(g, M('fan_170045'), 960, 760, 520, E.inOutCubic(inv(250.0, 251.4, t)), { a: 0.9 });
    // a curtain call, not a jumping game: the five sway together with the music (one swing every two beats, a wave
    // running along the row), hold still in the break, then take a bow together on the last bar
    const bp = beatF(t), live = smooth(251.7, 252.6, t) * (1 - brk);
    ORDER.forEach((w, k) => { const img = IMG['c_' + w + '_plain'], q = pop(t, 250.6 + k * 0.2); if (!img || !q.a) return;
      const sway = Math.sin((bp - k * 0.35) * Math.PI / 2) * 0.075 * live;
      const tb = 261.37 + Math.abs(k - 2) * 0.06, bow = E.inOutCubic(clamp((t - tb) / 0.35)) * (1 - E.inOutCubic(clamp((t - tb - 0.75) / 0.45)));
      const h = 250 * q.s, fx = 560 + k * 200, fy = 840 + 125;
      g.save(); g.translate(fx, fy); g.rotate(sway + q.r); g.scale(1 + 0.03 * bow, 1 - 0.13 * bow);
      place(g, img, 0, -h / 2 + 10 * bow, h, { a: q.a }); g.restore(); });
    petals(g, t, 12, 83, { a: 0.8, speed: 55, wind: 30, rect: [-300, -300, W + 600, H + 600] });
    embers(g, t, 26, 85, { a: 0.6, speed: 50, rect: [-300, -300, W + 600, H + 600] });
  },
  over(g, t) {
    // the title is set in its own layer so a gold sheen can cross it every two bars
    const [c, b] = buf('endTitle6', W, 300);
    drawText(b, t, '熱情エナモラル', { x: 960, y: 150, align: 'center', size: 96, fontStr: font(F.mincho, 96, 800), fill: IV, glow: 'rgba(255,170,90,0.35)', glowBlur: 20, track: 0.08, anim: 'blur', start: 250.2, stagger: 0.08, dur: 0.9 });
    const bf = barF(t), u = (bf - Math.floor(bf / 2) * 2) * T.bar / 1.1;
    if (t > 252 && u < 1) { b.save(); b.globalCompositeOperation = 'source-atop'; const x = lerp(380, 1540, E.inOutSine(u)), gr = b.createLinearGradient(x - 170, 0, x + 170, 0);
      gr.addColorStop(0, 'rgba(255,236,190,0)'); gr.addColorStop(0.5, 'rgba(255,246,222,0.95)'); gr.addColorStop(1, 'rgba(255,236,190,0)'); b.fillStyle = gr; b.fillRect(0, 0, W, 300); b.restore(); }
    g.drawImage(c, 0, 150);
    drawText(g, t, 'Fin', { x: 960, y: 430, align: 'center', size: 110, fontStr: font(F.script, 110, 400), fill: GOLD, glow: 'rgba(255,170,90,0.5)', glowBlur: 22, anim: 'ink', start: 259.95, stagger: 0.15, dur: 0.6 });
    label(g, 'THE IDOLM@STER CINDERELLA MASTER  Passion jewelries! 004', 960, 990, { fam: F.cinzel, size: 15, weight: 600, color: IV, track: 0.3, align: 'center', alpha: smooth(252, 252.8, t) * 0.85 });
    label(g, 'fan-made lyric video  ·  decorative art: The Metropolitan Museum of Art (Open Access, CC0)  ·  photos: Open Images (CC BY 2.0) — see CREDITS', 960, 1030, { fam: F.corm, size: 18, italic: true, color: GOLD, align: 'center', alpha: smooth(253, 253.8, t) * 0.75 });
    // iris out, closing on the last note
    const ir = inv(261.3, 263.06, t);
    if (ir > 0) { const r = Math.max(0.5, lerp(1250, 0, E.inCubic(ir))); g.save(); g.fillStyle = '#000'; g.beginPath(); g.rect(0, 0, W, H); g.arc(960, 600, r, 0, TAU); g.fill('evenodd');
      g.strokeStyle = GOLD; g.globalAlpha = Math.min(1, ir * 4) * (1 - smooth(0.9, 1, ir)); g.lineWidth = 5; g.beginPath(); g.arc(960, 600, r, 0, TAU); g.stroke(); g.lineWidth = 1.5; g.beginPath(); g.arc(960, 600, r + 16, 0, TAU); g.stroke(); g.restore(); }
  },
  // never at rest: a slow pull-back to the break, then a slow lean-in to the last note
  cam: [[249.75, { y: 560, z: 1.14 }, 'io'], [258.9, { y: 540, z: 1.0, r: 0.004 }, 'io'], [263.2, { y: 530, z: 1.07, r: -0.004 }]], hh: 0.45, pulse: 0.4,
};

/* ================================================================ timeline */
export const SHOTS6 = [];
export function build6() {
  const S = (a, s, tr = 'cut', o = {}) => SHOTS6.push({ ...s, a, tr: tr === 'cut' ? null : { type: tr, o } });
  S(0, overture);
  S(1.75, arches, 'zoom', { x: 960, y: 700 });
  S(9.75, title, 'flash');
  S(15.9, night, 'zoom', { x: 960, y: 540 });
  S(19.85, tomoe, 'cut');
  S(23.45, frost, 'bloom', { tint: '#d8e8ff', color: '#eef4ff' });
  S(27.4, riamu, 'flash', { color: '#ffd8a0', tint: '#ffb070' });
  S(30.3, vanity, 'silk');
  S(34.75, mantle, 'bloom', { tint: '#ff9a90' });
  S(38.45, mirror, 'iris', { x: 700, y: 520 });
  S(42.3, fans5, 'bloom', { tint: '#ffc080' });
  S(48.2, chorus1, 'zoom', { x: 960, y: 540 });
  S(52.0, sun, 'whip', { dir: [0, -1] });
  S(55.7, neonFans, 'invert');
  S(59.35, split1, 'panels');
  S(61.55, split2, 'whip', { dir: [-1, 0] });
  S(63.5, fire, 'flash', { color: '#ffd0a0', tint: '#ff9050' });
  S(66.9, lleno, 'fan');
  S(69.75, table, 'ruffle');
  S(79.43, summerNagi, 'bloom', { tint: '#fff0e0' });
  S(87.5, summerYoshino, 'bloom', { tint: '#ffe8d8' });
  S(94.37, roseKiss, 'bloom', { tint: '#ffd0dc' });
  S(98.3, shinAway, 'whip', { dir: [-1, 0] });
  S(102.62, riamuBells, 'iris', { x: 520, y: 420 });
  S(106.25, silence, 'bloom', { tint: '#d0c0ff' });
  S(112.33, morningStar, 'flash', { color: '#f4eaff' });
  S(115.4, moonSet, 'whip', { dir: [0, 1] });
  S(119.45, watchDial, 'zoom', { x: 960, y: 540, color: '#fff2dc' });
  S(123.2, split3, 'invert');
  S(125.35, split4, 'whip', { dir: [1, 0] });
  S(127.55, bubbles, 'bloom', { tint: '#ffd0e0' });
  S(130.55, guitarMacro, 'zoom', { x: 960, y: 540 });
  S(133.62, danceWall, 'invert');
  const RC = [['yo', 'bust', 1.3], ['na', 'bust', 1.3], ['shi', 'knee', 1.25], ['to', 'bust', 1.45], ['ri', 'bust', 1.3]];
  const RT = [['fan', {}], ['whip', { dir: [1, 0] }], ['fan', { from: 0, dirn: -1 }], ['whip', { dir: [-1, 0] }], ['fan', {}]];
  RC.forEach(([w, sz, k], j) => { const a = barT(73 + 2 * j), b = barT(75 + 2 * j); const d = j % 2 ? -1 : 1; // each entrance punches in with a roll, then drifts on (alternating sides)
    S(a, { ...rollCall(w, sz, k), cam: [[a, { x: 1060, z: 1.2, r: 0.035 * d }, 'ox'], [a + 0.7, { x: 1010, z: 1.06, r: 0.006 * d }, 'l'], [b, { x: 930, z: 1.0, r: -0.008 * d }]] }, RT[j][0], RT[j][1]); });
  S(barT(83), jewels, 'zoom', { x: 960, y: 540 });
  S(166.53, nagiDawn, 'flash', { color: '#fff4e0' });
  S(174.35, dawnJewel, 'flare', { dir: 1, y: 470 });
  S(178.5, hands, 'zoom', { x: 1000, y: 540, color: '#fff2e0' });
  S(180.85, mist, 'bloom', { tint: '#ffffff', color: '#ffffff' });
  S(185.8, embrace, 'flare', { dir: -1, y: 380 });
  S(191.3, especial, 'invert');
  S(209.11, amanecer, 'flash', { color: '#fff0d8' });
  S(212.35, dawnArches, 'whip', { dir: [1, 0] });
  S(216.25, bloom, 'zoom', { x: 960, y: 540 });
  S(220.0, split5a, 'whip', { dir: [1, 0] });
  S(222.1, split5b, 'whip', { dir: [0, 1] });
  S(224.1, nagiKiss, 'flash', { color: '#ffe8f0', tint: '#ffb0c8' });
  S(228.1, duoGroups, 'whip', { dir: [1, 0] });
  S(231.95, candleOut, 'bloom', { tint: '#d8c8ff' });
  S(235.32, finalPale, 'cut');
  S(238.14, credits, 'bloom', { tint: '#fff0e0' });
  S(249.75, endCard, 'fan');
  SHOTS6.forEach((s, i) => (s.b = SHOTS6[i + 1] ? SHOTS6[i + 1].a : 999));
  return SHOTS6;
}
