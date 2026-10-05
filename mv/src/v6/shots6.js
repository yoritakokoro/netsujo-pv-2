// v6 storyboard (see docs/PLAN_v6.md). Plates are drawn in world space; the runner moves the camera.
import { W, H, TAU, clamp, lerp, inv, smooth, E, hash, noise1 } from '../util.js';
import { T, barT, beatT, beatF, barF } from '../timing.js';
import { IMG, buf, cover, place, tinted, duo, rgba, withMask, archPath, circlePath, rectPath, rings, lattice, ink, glow, sparkle,
  stars, embers, petals, bokeh, softDot } from '../gfx.js';
import { piece, sticker, slap, pop, hop, tape, polaroid, scribble, doodle, boil } from '../collage.js';
import { F, font, drawText, label } from '../text.js';
import { MEM, ORDER, GOLD, IV, FACE, framing, figure, lerpFr, CF, kaleido, fanOpen, obj, halo, earrings, develop, fgBlur, lightRays,
  neon, neonStroke, horseshoe, scallops, mono, laceBorder } from '../kit4.js';
import { energy, pulse } from './core6.js';
import { sing, slam, addFace } from './type6.js';

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
function archWall(g, t, o = {}) {
  fillBig(g, o.base || '#0c0405'); tiles(g, M('tile_187938'), 220, o.tileA ?? 0.17);
  radialW(g, 960, 600, 1300, [[0, o.glowC || 'rgba(130,16,30,0.35)'], [1, 'rgba(0,0,0,0)']]);
  ORDER.forEach((w, k) => {
    const x = AX(k), path = archPath(x, 1000, 344, 820), l = o.lit ? o.lit(t, w) : 1;
    withMask(g, path, h => {
      h.fillStyle = MEM[w].deep; h.fillRect(x - 200, 150, 400, 900);
      kaleido(h, M(o.kale || 'tile_187924'), { n: 8, rot: t * 0.05 + k, R: 620, cx: x, cy: 560, zoom: 1 });
      h.save(); h.globalCompositeOperation = 'multiply'; h.globalAlpha = 0.55; h.fillStyle = MEM[w].deep; h.fillRect(x - 200, 150, 400, 900); h.restore();
      if (o.warm) { h.save(); h.globalCompositeOperation = 'soft-light'; h.globalAlpha = o.warm; h.fillStyle = '#ffb070'; h.fillRect(x - 200, 150, 400, 900); h.restore(); }
      const fr = framing(COS[w], 'face', (k + 0.5) / 5, { k: 0.7, y: 470 });
      figure(h, COS[w], fr, { rim: MEM[w].light, shadow: false });
      if (l > 0.3) face(h, COS[w], fr);
      if (l < 1) { h.fillStyle = `rgba(8,2,4,${0.9 * (1 - l)})`; h.fillRect(x - 200, 150, 400, 900); }
    });
    g.save(); g.strokeStyle = GOLD; g.globalAlpha *= 0.3 + 0.7 * l; g.lineWidth = 3; g.shadowColor = '#ffcf8a'; g.shadowBlur = 18 * l; g.beginPath(); path(g); g.stroke(); g.restore();
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
  over(g, t) { stripText(g, t, 8, 120, 900, -0.025, { exit: 31.75 }); stripText(g, t, 9, 120, 900, 0.015, { exit: 34.6 }); },
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
  },
  over(g, t, s) {
    const roll = 1 - 0.55 * smooth(Ls(11) - 0.3, Ls(11) + 0.3, t);
    L(g, t, 10, { x: 1600, y: 180, vertical: true, size: 180, kana: 0.46, fill: '#fbf0e6', glow: 'rgba(255,60,70,0.55)', alpha: roll, exit: s.b + 0.2, drift: [0, 20] });
    L(g, t, 11, { x: 1400, y: 300, vertical: true, size: 100, kana: 0.56, fill: '#ece6ff', glow: 'rgba(170,160,255,0.55)', exit: s.b + 0.2, drift: [0, 16] });
  },
  cam: [[34.75, { y: 380, z: 1.12 }, 'o'], [38.45, { y: 600, z: 1.0 }]], hh: 0.5, pulse: 0.7,
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
  over(g, t) { L(g, t, 12, { x: 150, y: 950, size: 74, kana: 0.62, fill: '#fff4e6', glow: 'rgba(255,190,110,0.45)', drift: [24, 0] }); },
  cam: [[38.45, { x: 640, y: 540, z: 1.2 }, 'io'], [42.3, { x: 1150, y: 540, z: 1.04 }]], hh: 0.5, pulse: 0.7,
};
const fans5 = {
  plate(g, t, s) {
    const p = inv(s.a, 48.2, t);
    kaleW(g, t, 'textile_461355', { tint: '#3a0408', tintA: 0.55 - p * 0.25, spin: 0.03 + p * 0.08 });
    lightRays(g, 960, 790, 1600, t * 0.06, 30, '#ffd08a', smooth(44.5, 47.8, t) * 0.7);
    const fans = ['fan_169859', 'fan_120720', 'fan_156754', 'fan_118755', 'fan_107571'], t0 = barT(Math.ceil(barF(s.a + 0.2)));
    [2, 1, 3, 0, 4].forEach((k, j) => fanOpen(g, M(fans[k]), 960 + (k - 2) * 360, 820 - Math.abs(k - 2) * 40, 430, E.outCubic(clamp((t - (t0 + j * T.bar * 0.5)) / 0.55)), { rot: (k - 2) * 0.12 }));
    obj(g, IMG.obj_fi_candle, 960, 930, 360, {}); glow(g, 960, 790, 260 + p * 560, '#ffb060', 0.6 + p * 0.4);
    embers(g, t, Math.round(20 + 60 * p), 13, { a: 0.9, speed: 90 + 100 * p, rect: [-300, -300, W + 600, H + 600] });
  },
  over(g, t) { L(g, t, 13, { x: 960, y: 520, align: 'center', size: 110, kana: 0.55, fill: '#fff4e6', glow: 'rgba(255,170,90,0.6)', exit: 48.0 }); },
  cam: [[42.3, { y: 600, z: 1.0 }, 'i'], [48.2, { y: 790, z: 2.3 }]], hh: 0.4, pulse: 0.8,
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
  cam: [[52.0, { y: 860, z: 1.14 }, 'o4'], [53.1, { y: 560, z: 1.0 }, 'io'], [55.7, { y: 540, z: 1.05 }]], hh: 0.6, pulse: 1.3,
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
  const side = (who, key, flip, xFace, nk) => h => {
    const m = MEM[who], fr = framing(key, 'bust', xFace, { k: 1.25 });
    fillBig(h, '#06030a'); radialW(h, xFace * W, 420, 900, [[0, rgba(m.deep, 0.95)], [1, 'rgba(0,0,0,0)']]);
    neonStroke(h, m.ink, 2.5, q => { for (let j = -2; j < 5; j++) horseshoe(q, xFace * W + (j - 1.5) * 300, H + 40, 230, 760); }, 0.35);
    neon(h, nk, fr.x, fr.y - 10, fr.fh * 2.7, m.ink, { a: 0.85, rot: t * 0.06 * (flip ? -1 : 1) });
    figure(h, key, fr, { img: mono(IMG[key], m.deep, m.light), flip: !!flip, glow: m.ink, glowA: 0.8, glowBlur: 24, shadow: false }); face(h, key, fr);
  };
  side(L0.who, L0.key, false, 0.27, neonKeys[0])(g);
  const k = E.outExpo(clamp((t - (tR - 0.12)) / 0.4)), cut = lerp(W + 300, W * 0.52, k), sk = 150;
  if (k > 0) { withMask(g, rectPath(cut, BIG[1], W * 3, BIG[3], -sk * 3), side(R0.who, R0.key, true, 0.75, neonKeys[1]));
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
    earrings(g, M('jewel_141739'), 3000, 900, 260, t, 1); tape(g, 2250, 520, 160, 0.2); tape(g, 3300, 280, 180, -0.2);
    scribble(g, t, 70.6, 'esta noche ♪', 1160, 160, 70, '#7a1f2a', -0.08, 1.0); doodle(g, 'swoosh', 1300, 230, 4, clamp((t - 71.3) / 0.7), '#7a1f2a', 5);
  },
  cam: [[69.75, { x: 960, y: 540, z: 1.06 }, 'io'], [79.43, { x: 2860, y: 540, z: 1.0 }]], hh: 0.6, pulse: 0.8,
};
const black = { plate(g) { fillBig(g, '#000'); }, mblur: false };

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
  S(34.75, mantle, 'whip', { dir: [1, 0] });
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
  S(79.43, black, 'dip');
  SHOTS6.forEach((s, i) => (s.b = SHOTS6[i + 1] ? SHOTS6[i + 1].a : 999));
  return SHOTS6;
}
