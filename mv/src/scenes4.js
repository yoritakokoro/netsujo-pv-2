// v5 storyboard — the calm cut. A flamenco night told the way an MV should hold it: shots that last
// a phrase, framings that stay put, a tripod camera with at most a slow uniform push, and dissolves
// instead of wipes. Motion lives inside the picture (candle light, smoke, petals, a fan opening, the
// moon setting, a polaroid developing), not in the camera. Spanish decorative art from The Met builds
// the backgrounds and kaleidoscopes; collage pages and polaroids carry the memories.
import { W, H, TAU, clamp, lerp, inv, smooth, E, hash, noise1, makeCanvas } from './util.js';
import { T, barT, beatT, beatF, barF, pulse } from './timing.js';
import { IMG, buf, cover, place, tinted, duo, rgba, withMask, archPath, circlePath, rectPath, rings, lattice, dots, ink, glow, sparkle,
  stars, embers, petals, bokeh, softDot } from './gfx.js';
import { piece, sticker, slap, pop, hop, tape, polaroid, scribble, doodle, boil } from './collage.js';
import { F, font, drawText, label, kinetic } from './text.js';
import { chant } from './lyrics4.js';
import { MEM, ORDER, GOLD, IV, setCam, layer, OS, bg, bgGrad, wash, radial, FACE, framing, figure, lerpFr, CF, kaleido, tileWall,
  laceBorder, fringe, fanOpen, obj, halo, earrings, develop, fgBlur, lightRays, neon, neonStroke, horseshoe, scallops, mono } from './kit4.js';

const Ls = i => T.lines[i].start;
const ch = (i, j) => T.lines[i].chars[j];
const M = k => IMG['m_' + k];
const COS = { yo: 'yo_cos', na: 'na_cos', shi: 'shi_cos', to: 'to_cos', ri: 'ri_cos' };
const PRIV = { yo: 'yo_swim', na: 'na_casual', shi: 'shi_swim', to: 'to_white', ri: 'ri_resort' };
const uOf = (t, s) => clamp((t - s.a) / Math.max(0.01, s.b - s.a));
const paperBG = (ctx, key) => { const p = IMG[key]; if (p) ctx.drawImage(p, ...OS); };
const opens = (t, t0, d = 0.9) => E.inOutCubic(clamp((t - t0) / d)); // a fan opening by hand, no overshoot

/* ------------------------------------------------------------ backgrounds */
function kaleBG(ctx, t, key, o = {}) {
  layer(ctx, 1, g => {
    bg(g, o.base || '#120607');
    kaleido(g, M(key), { n: o.n || 12, rot: t * (o.spin ?? 0.025) + (o.rot0 || 0), zoom: o.zoom || 1.1, fx: 0.5 + 0.1 * Math.sin(t * 0.08 + (o.ph || 0)), fy: 0.5 + 0.1 * Math.cos(t * 0.07), R: 1500, cx: o.cx ?? W / 2, cy: o.cy ?? H / 2 });
    if (o.tint) wash(g, o.tint, o.tintA ?? 0.45, o.tintOp || 'multiply');
    radial(g, o.cx ?? W / 2, o.cy ?? H / 2, 1250, [[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(0,0,0,0.18)'], [1, `rgba(0,0,0,${o.vig ?? 0.8})`]]);
  });
}
function textileBG(ctx, key, o = {}) {
  layer(ctx, 1, g => { bg(g, '#100506'); const im = M(key); if (im) cover(g, im, OS, o.z || 1.05, o.fx ?? 0.5, o.fy ?? 0.5); if (o.tint) wash(g, o.tint, o.tintA ?? 0.4, o.tintOp || 'multiply'); });
}
function photoBG(ctx, key, dark, light, o = {}) {
  layer(ctx, 1, g => { const im = M(key); bg(g, dark); if (im) cover(g, duo(im, dark, light), OS, o.z || 1.05, o.fx ?? 0.5, o.fy ?? 0.5); });
}
function frameDeco(ctx, t, o = {}) { // flamenco proscenium, locked to the screen: fringe on top, lace at the bottom
  if (o.fringe !== false) fringe(ctx, -14, o.fh || 150, o.a ?? 1, 0, Math.sin(t * 1.1) * 0.3);
  if (o.lace) laceBorder(ctx, o.lace, H + 6, o.lh || 110, o.laceColor || IV, o.laceA ?? 0.85, true, 0);
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

/* ------------------------------------------------------------ lyric typography for the type-led shots */
// Not every part needs a standing art: in these shots the line itself is the picture. The scene sets it
// as a designed block, glyphs arriving as they are sung (lyrics4 skips these lines), with a small Latin
// caption and hairline, over a motif from the lyric.
const seg = (i, a = 0, b) => { const l = T.lines[i], cs = [...l.text]; b = b ?? cs.length; return { text: cs.slice(a, b).join(''), times: l.chars.slice(a, b) }; };
function kin(ctx, t, i, o = {}) { // mixed-size kinetic setting of (a segment of) line i
  const l = T.lines[i], q = seg(i, o.from || 0, o.to);
  kinetic(ctx, t, q.text, q.times, { exit: (l.hold || l.end) + 0.45, shadow: 'rgba(10,2,4,0.55)', ...o });
}
function caption(ctx, t, text, x, y, t0, o = {}) {
  const ex = o.exit ?? 1e9, a = smooth(t0, t0 + 0.8, t) * (1 - smooth(ex, ex + 0.6, t));
  if (a <= 0.003) return;
  label(ctx, text, x, y, { fam: F.corm, size: o.size || 30, italic: true, weight: 500, color: o.color || GOLD, track: 0.12, align: o.align || 'start', alpha: a * 0.95 });
  if (o.rule) { const [rx, ry, rw, rh] = o.rule; ctx.save(); ctx.globalAlpha = a * 0.8; ctx.fillStyle = o.color || GOLD; ctx.fillRect(rx, ry, rw * E.outCubic(smooth(t0, t0 + 1.2, t)), rh); ctx.restore(); }
}

/* ------------------------------------------------------------ reusable shot types */
// call-and-response: two members of the same outfit set; the answering half fades in on its cue
const splitShot = (L, R, tR, o = {}) => (ctx, t, s) => {
  const k = E.inOutSine(clamp((t - (tR - 0.25)) / 0.45)), cut = W * 0.52, sk = 150;
  const side = (who, key, kale, flip, xFace) => g => {
    const m = MEM[who], fr = framing(key, 'bust', xFace, { k: 1.25 });
    if (o.neon) { // the reference idiom: the art flattened to one colour, neon ornament behind it
      layer(g, 1, h => { bg(h, '#06030a'); radial(h, xFace * W, 420, 900, [[0, rgba(m.deep, 0.95)], [1, 'rgba(0,0,0,0)']]);
        neonStroke(h, m.ink, 2.5, q => { for (let j = -1; j < 4; j++) horseshoe(q, xFace * W + (j - 1.5) * 300, H + 40, 230, 760); }, 0.32);
        neon(h, o.neon[flip ? 1 : 0], fr.x, fr.y - 10, fr.fh * 2.7, m.ink, { a: 0.8, rot: t * 0.04 * (flip ? -1 : 1) }); });
      layer(g, 1, h => figure(h, key, fr, { img: mono(IMG[key], m.deep, m.light), flip: !!flip, glow: m.ink, glowA: 0.75, glowBlur: 24, shadow: false }));
      return;
    }
    kaleBG(g, t, kale, { tint: m.deep, tintA: 0.42, spin: flip ? -0.02 : 0.02 });
    layer(g, 1, h => lattice(h, t, rgba(m.light, 1), 0.06, 160, 0.2, 0, 0));
    if (o.halo) layer(g, 1, h => halo(h, M(o.halo[flip ? 1 : 0]), fr.x, fr.y - 20, fr.fh * 1.2, t, 0.9, 0.03));
    layer(g, 1, h => figure(h, key, fr, { flip: !!flip, rim: m.light, rimSide: flip ? -1 : 1, grade: o.grade, gradeA: o.gradeA, gradeOp: o.gradeOp }));
  };
  side(L.who, L.key, L.kale || 'tile_187924', L.flip, L.x ?? 0.28)(ctx);
  if (k > 0) {
    const [c, g] = buf('split');
    withMask(g, rectPath(cut, -10, W + 300, H + 20, -sk), side(R.who, R.key, R.kale || 'tile_187938', !R.flip, R.x ?? 0.74));
    g.strokeStyle = GOLD; g.lineWidth = 4; g.beginPath(); g.moveTo(cut + sk, -10); g.lineTo(cut - sk, H + 10); g.stroke();
    ctx.save(); ctx.globalAlpha = k; ctx.drawImage(c, 0, 0); ctx.restore();
  }
  frameDeco(ctx, t, { fh: 120 });
};
// cover art in a circle framed by a slowly turning lustre dish (wide group shot)
function coverMedallion(ctx, t, s, o = {}) {
  const u = E.outCubic(clamp((t - s.a) / 1.6)), cx = o.cx ?? W / 2, cy = o.cy ?? 540, R = (o.R ?? 380) * (0.96 + 0.04 * u);
  layer(ctx, 1, g => {
    halo(g, M(o.dish || 'dish_471762'), cx, cy, R * 1.55, t, 1, 0.02);
    withMask(g, circlePath(cx, cy, R), h => cover(h, IMG.cover, [cx - R, cy - R, R * 2, R * 2], o.z ?? 1.35, o.f?.[0] ?? 0.47, o.f?.[1] ?? 0.36));
    rings(g, cx, cy, [R + 6], GOLD, 3, 0.95);
  });
}
// five Moorish arches, one member each (stage costume); lit(w) 0..1 brightens an arch, a(w) fades it in
function archRow(ctx, t, lit, a = () => 1, o = {}) {
  const pw = W / 5;
  ORDER.forEach((w, k) => {
    const x = k * pw + pw / 2, path = archPath(x, 1000, pw - 40, 820), l = lit(w), al = a(w, k);
    if (al <= 0.003) return;
    layer(ctx, 1, g => {
      g.save(); g.globalAlpha *= al;
      withMask(g, path, h => {
        bg(h, MEM[w].deep);
        kaleido(h, M(o.kale || 'tile_187924'), { n: 8, rot: t * 0.02 + k, R: 600, cx: x, cy: 540, zoom: 1 }); wash(h, MEM[w].deep, 0.55, 'multiply');
        if (o.warm) wash(h, '#ffb070', o.warm, 'soft-light');
        figure(h, COS[w], framing(COS[w], 'face', (k + 0.5) / 5, { k: 0.7, y: 470 }), { rim: MEM[w].light, shadow: false });
        if (l < 1) { h.fillStyle = `rgba(8,2,4,${0.82 * (1 - l)})`; h.fillRect(x - pw, 0, pw * 2, H); }
      });
      g.strokeStyle = GOLD; g.globalAlpha *= 0.3 + 0.7 * l; g.lineWidth = 3; g.beginPath(); path(g); g.stroke();
      g.restore();
    });
  });
}

/* ------------------------------------------------------------ PROLOGUE */
function overture(ctx, t, s) {
  layer(ctx, 1, g => { bg(g, '#070304'); radial(g, W / 2, 620, 900, [[0, 'rgba(90,10,20,0.55)'], [1, 'rgba(0,0,0,0)']]); });
  layer(ctx, 1, g => fanOpen(g, M('fan_170045'), W / 2, 760, 560, E.inOutCubic(inv(0.25, 1.55, t))));
  embers(ctx, t, 26, 3, { a: 0.6, speed: 40, color: '#ffcf8a' });
  label(ctx, 'THE IDOLM@STER CINDERELLA GIRLS', 960, 880, { fam: F.cinzel, size: 16, weight: 600, color: IV, track: 0.5, align: 'center', alpha: smooth(0.5, 1.1, t) * 0.85 });
  label(ctx, 'Passion jewelries! 004', 960, 918, { fam: F.corm, size: 26, italic: true, weight: 500, color: GOLD, align: 'center', alpha: smooth(0.7, 1.3, t) });
}
// one held shot for the chants: each "Vamos a bailar / Te quiero mucho" lights its singer's arch,
// ¡Olé! lights all five.
function introArches(ctx, t, s) {
  layer(ctx, 1, g => { bg(g, '#0c0405'); tileWall(g, M('tile_187938'), 220, 0, 0, 0, 0.16); radial(g, W / 2, 620, 1100, [[0, 'rgba(120,14,28,0.35)'], [1, 'rgba(0,0,0,0)']]); });
  const ev = [[Ls(0) - 0.25, ['yo']], [Ls(1) - 0.25, ['na']], [Ls(2) - 0.25, ['shi']], [Ls(3) - 0.2, ORDER]];
  const lit = w => {
    let v = 0;
    ev.forEach(([t0, who], j) => {
      if (!who.includes(w)) return;
      let later = 0; ev.slice(j + 1).forEach(([t1, w1]) => { if (!w1.includes(w)) later = Math.max(later, smooth(t1, t1 + 0.5, t)); });
      v = Math.max(v, smooth(t0, t0 + 0.5, t) * (1 - 0.45 * later));
    });
    return v;
  };
  archRow(ctx, t, lit, (w, k) => smooth(s.a + k * 0.08, s.a + 0.6 + k * 0.08, t));
  const ole = smooth(Ls(3) - 0.2, Ls(3) + 0.3, t);
  layer(ctx, 1, g => { const gr = g.createLinearGradient(0, 700, 0, H); gr.addColorStop(0, 'rgba(10,2,4,0)'); gr.addColorStop(1, `rgba(10,2,4,${0.75 * (1 - ole)})`); g.fillStyle = gr; g.fillRect(...OS); });
  frameDeco(ctx, t, { fh: 130 });
  const X = [520, 640, 960];
  for (let i = 0; i < 3; i++) chant(ctx, t, i, X[i], 930, { size: 112, exit: Ls(i + 1) - 0.35 });
  layer(ctx, 1, g => radial(g, W / 2, 560, 900, [[0, `rgba(10,2,4,${0.55 * ole})`], [1, 'rgba(10,2,4,0)']]));
  chant(ctx, t, 3, 960, 560, { size: 240, exit: s.b - 0.2, fill: { grad: ['#fffaf0', '#ffe2b0', '#f2b866'] } });
  embers(ctx, t, 50, 5, { a: smooth(7.8, 8.4, t), speed: 90 });
}
// Title: collage on crimson velvet
function titleCollage(ctx, t, s) {
  const b = sd => boil(t, sd);
  textileBG(ctx, 'textile_222561', { z: 1.2 }); wash(ctx, '#2a0408', 0.25, 'multiply');
  layer(ctx, 1, g => {
    const p1 = slap(t, 9.95), p2 = slap(t, 10.35), p3 = slap(t, 10.9), p4 = slap(t, 11.4), p5 = slap(t, 11.9);
    piece(g, 1460 + b(1)[0], 520, 900 * p1.s, 560 * p1.s, { img: M('textile_230357'), z: 1.2, rot: 0.05 + p1.r, seed: 3, a: p1.a });
    polaroid(g, IMG.cover, 1420 + b(2)[0], 480 + b(2)[1], 560 * p2.s, { a: p2.a, rot: -0.06 + p2.r, z: 1.15, fx: 0.5, fy: 0.42, caption: 'Passion jewelries! 004', filter: develop((t - 10.4) / 2.5) });
    tape(g, 1420, 140, 190, 0.1, undefined, p2.a);
    fanOpen(g, M('fan_169859'), 1780, 980, 360, opens(t, 11.0), { rot: -0.35 });
    earrings(g, M('jewel_206850'), 1080, 380, 230, t, p4.a);
    obj(g, IMG.obj_d_rose, 1100 + b(5)[0], 930, 300 * p5.s, { a: p5.a, rot: 0.3 });
    obj(g, M('watch_195645'), 210, 940, 200 * p3.s, { a: p3.a, rot: -0.2 });
  });
  layer(ctx, 1, g => {
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
function nightStars(ctx, t, s) { // 瞬く星が綺麗な夜に — the Court of the Lions under the stars; a star lights on every sung syllable
  photoBG(ctx, 'alhambra_288043', '#04061a', '#8a98d8', { z: 1.1, fx: 0.45, fy: 0.62 });
  layer(ctx, 1, g => {
    const gr = g.createLinearGradient(0, 0, 0, 700); gr.addColorStop(0, 'rgba(3,4,18,0.94)'); gr.addColorStop(1, 'rgba(3,4,18,0)'); g.fillStyle = gr; g.fillRect(...OS);
    stars(g, t, 170, 11, [0, -100, W, 600], 1); glow(g, 420, 190, 280, '#c8d4ff', 0.25); obj(g, IMG.obj_v2_crescent, 420, 190, 190, { shadow: false, rot: -0.25 });
    T.lines[4].chars.forEach((ct, k) => { const a = smooth(ct - 0.05, ct + 0.3, t); if (a > 0) sparkle(g, 160 + hash(k, 71) * 1100, 90 + hash(k, 72) * 420, 0.7 + hash(k, 73) * 0.8, a * (0.75 + 0.25 * Math.sin(t * 3 + k)), '#f4f0ff'); });
  });
  layer(ctx, 1, g => fgBlur(g, M('iron_194614'), -60, 560, 1500, 8, 0.7));
  const starInk = { fill: '#f4f2ff', glow: 'rgba(170,190,255,0.55)', size: 132, vertical: true, kana: 0.55 };
  kin(ctx, t, 4, { ...starInk, to: 4, x: 1660, y: 200 });
  kin(ctx, t, 4, { ...starInk, from: 4, x: 1500, y: 330 });
  caption(ctx, t, 'una noche de estrellas', 1790, 1000, Ls(4) + 1.0, { align: 'end', color: '#c8d0f0', exit: Ls(5) - 0.3, rule: [1530, 1030, 260, 2] });
}
function tomoeClose(ctx, t, s) { // close-up; two warm lights drift together (重なる手と手)
  photoBG(ctx, 'alhambra_288043', '#04061a', '#5a68b0', { z: 1.6, fx: 0.4, fy: 0.5 });
  layer(ctx, 1, g => stars(g, t, 80, 12, [0, 0, W, 700], 0.6));
  layer(ctx, 1, g => figure(g, 'to_cos', lerpFr(framing('to_cos', 'bust', 0.4), framing('to_cos', 'face', 0.42), 0.55), { rim: '#c0c8ff', rimA: 0.45, grade: '#2a3080', gradeA: 0.28 }));
  const q = E.inOutSine(inv(Ls(5) + 1.0, 23.2, t));
  layer(ctx, 1, g => { for (const sd of [-1, 1]) { glow(g, 1300 + sd * lerp(260, 24, q), 760, 110, sd < 0 ? '#ffb070' : '#ff8a6a', 0.85); sparkle(g, 1300 + sd * lerp(260, 24, q), 760, 0.8, 0.9); } });
}
function riamuNight(ctx, t, s) { // 凍える身体 → 熱帯夜: one held shot; the cold blue room warms to candle light
  const w = smooth(Ls(7) - 0.5, Ls(7) + 1.8, t);
  kaleBG(ctx, t, 'tile_187929', { tint: '#0a1440', tintA: 0.62 * (1 - w), spin: 0.015, base: '#060a20' });
  wash(ctx, '#3a0a08', 0.58 * w, 'multiply');
  layer(ctx, 1, g => { glow(g, 1300, 400, 700, '#9ab8ff', 0.25 * (1 - w)); radial(g, 600, 900, 1200, [[0, `rgba(255,120,50,${0.55 * w})`], [1, 'rgba(0,0,0,0)']], 'screen'); });
  layer(ctx, 1, g => { obj(g, M('iron_198932'), 230, 760, 620, { filter: `brightness(${0.55 + 0.45 * w})` }); obj(g, IMG.obj_slim_candle, 230, 520, 230, { shadow: false, a: w }); glow(g, 230, 450, 220, '#ffb060', w * 0.9); });
  const fr = framing('ri_cos', 'bust', 0.46), app = smooth(Ls(7) - 0.4, Ls(7) + 1.2, t);  // あなたを乞う: she appears with the warmth
  if (app > 0.003) layer(ctx, 1, g => figure(g, 'ri_cos', fr, { a: app, rim: '#ffb070', rimA: 0.6, rimSide: -1, grade: '#ff7040', gradeA: 0.22 * w, gradeOp: 'soft-light' }));
  const frost = { fill: '#eef4ff', glow: 'rgba(150,185,255,0.55)', exit: Ls(7) - 0.35, align: 'center' };
  kin(ctx, t, 6, { ...frost, to: 5, x: 960, y: 450, size: 170, kana: 0.5 });
  kin(ctx, t, 6, { ...frost, from: 5, x: 960, y: 640, size: 120, kana: 0.62 });
  caption(ctx, t, 'calma este cuerpo helado', 960, 755, Ls(6) + 1.2, { align: 'center', color: '#b8c8f0', exit: Ls(7) - 0.4 });
  if (w < 1) layer(ctx, 1, g => { for (let k = 0; k < 40; k++) { const x = (hash(k, 3) * W + t * 14) % W, y = (hash(k, 4) * H + t * (24 + hash(k, 5) * 30)) % H; g.globalAlpha = 0.45 * (1 - w); g.drawImage(softDot('#e8f0ff', 16), x, y, 6 + hash(k, 6) * 8, 6 + hash(k, 6) * 8); } g.globalAlpha = 1; });
  embers(ctx, t, 26, 7, { a: w * 0.7, speed: 45 });
}

/* ------------------------------------------------------------ B1 (vanity collage) */
function vanity(ctx, t, s) {
  const b = sd => boil(t, sd);
  layer(ctx, 1, g => { paperBG(g, 'paper_cream'); dots(g, rgba(MEM.shi.ink, 0.5), 26, (x) => (x / W) * 0.6 - 0.1, 0.4, [1100, -100, 1100, H + 200]); });
  layer(ctx, 1, g => {
    const p1 = slap(t, s.a), p2 = slap(t, s.a + 0.35), p3 = slap(t, s.a + 0.8), p4 = slap(t, Ls(9) - 0.3), p5 = slap(t, s.a + 1.2);
    piece(g, 620 + b(2)[0], 380 + b(2)[1], 620 * p2.s, 430 * p2.s, { img: IMG.photo_b1_letter, z: 1.35, fx: 0.42, fy: 0.42, rot: -0.06 + p2.r, seed: 7, a: p2.a, filter: 'sepia(0.35)' });
    tape(g, 400, 180, 160, -0.5, undefined, p2.a);
    obj(g, IMG.obj_b1_lipstick, 980 + b(3)[0], 520 + b(3)[1], 480 * p3.s, { a: p3.a, rot: 0.55 + p3.r });
    earrings(g, M('jewel_206855'), 290, 640, 300, t, p1.a);
    fanOpen(g, M('fan_120449'), 1700, 1040, 520, opens(t, s.a + 1.0), { rot: -0.4 });
    obj(g, M('iron_468836'), 760, 820, 140 * p5.s, { a: p5.a, rot: -0.3 });
    polaroid(g, null, 1430 + b(4)[0], 470 + b(4)[1], 470 * p4.s, { a: p4.a, rot: 0.06 + p4.r, caption: '♡ madame', capColor: '#9a1f4a',
      draw: (h, px, py, pw, ph) => { h.fillStyle = MEM.shi.light; h.fillRect(px, py, pw, ph); h.filter = develop((t - Ls(9)) / 1.8); figure(h, 'shi_cos', { x: px + pw * 0.5, y: py + ph * 0.4, fh: ph * 0.4 }, { shadow: false, floor: py + ph + 4 }); h.filter = 'none'; } });
    tape(g, 1430, 210, 170, 0.15, 'rgba(255,170,200,0.7)', p4.a);
    doodle(g, 'heart', 300, 860, 2.0, clamp((t - Ls(8) - 0.6) / 0.8), MEM.shi.ink, 5);
    scribble(g, t, Ls(9) - 0.1, 'à la madame…', 200, 120, 54, '#7a1f3a', -0.05, 1.2);
  });
}
function mantle(ctx, t, s) { // 纏う深紅 → 濃紺の宵に靡いてく: a red silk mantón; the velvet behind it turns to night and it sways
  const n = smooth(Ls(11) - 0.45, Ls(11) + 0.6, t);
  textileBG(ctx, 'textile_222561', { z: 1.15 }); wash(ctx, '#2a0206', 0.3, 'multiply');
  if (n > 0) layer(ctx, 1, g => { const [c, b] = buf('navy'); paperBG(b, 'paper_navy'); stars(b, t, 70, 41, [0, 0, W, 700], 0.8); g.save(); g.globalAlpha = n; g.drawImage(c, 0, 0); g.restore(); });
  const im = M('shawl_168327');
  if (im) layer(ctx, 1, g => { // upper body of the shawl only (the museum mannequin stays out of frame), fading into the dark
    const sx = im.width * 0.1, sw = im.width * 0.795, sh = im.height * 0.62, dw = 1150, dh = dw * sh / sw;
    const [c, b] = buf('mantle'); b.drawImage(im, sx, 0, sw, sh, 0, 0, dw, dh);
    b.globalCompositeOperation = 'destination-in'; const gr = b.createLinearGradient(0, dh * 0.55, 0, dh); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); b.fillStyle = gr; b.fillRect(0, 0, dw, dh);
    const sway = Math.sin((t - Ls(11)) * 1.7) * 0.035 * n;
    g.save(); g.translate(60 + dw / 2, -70); g.transform(1, 0, sway, 1, 0, 0); g.shadowColor = 'rgba(8,0,2,0.6)'; g.shadowBlur = 40; g.shadowOffsetY = 24;
    g.globalAlpha = smooth(s.a - 0.2, s.a + 0.6, t); g.drawImage(c, 0, 0, dw, dh, -dw / 2, 0, dw, dh); g.restore();
  });
  const roll = 1 - 0.55 * smooth(Ls(11) - 0.3, Ls(11) + 0.3, t);
  kin(ctx, t, 10, { x: 1590, y: 190, vertical: true, size: 180, kana: 0.45, fill: '#fbf0e6', glow: 'rgba(255,60,70,0.5)', alpha: roll, exit: s.b - 0.1 });
  kin(ctx, t, 11, { x: 1390, y: 300, vertical: true, size: 104, kana: 0.55, fill: '#ece6ff', glow: 'rgba(170,160,255,0.55)', exit: s.b - 0.1 });
  caption(ctx, t, 'carmesí', 1640, 880, Ls(10) + 0.6, { color: '#f2c8b0', exit: s.b - 0.3 });
  caption(ctx, t, 'azul de noche', 1400, 1010, Ls(11) + 0.8, { color: '#c8c0f0', exit: s.b - 0.3, rule: [1400, 1036, 220, 2] });
}

/* ------------------------------------------------------------ PRE-CHORUS */
function nagiMirror(ctx, t, s) { // 「らしくない」私: Nagi and her reflection in a Moorish arch mirror
  layer(ctx, 1, g => { bg(g, '#1a0e06'); const m = IMG.m_lace_223050_mask; if (m) cover(g, tinted(m, '#5a3a18'), OS, 1.1, 0.5, 0.5, 0.8); });
  layer(ctx, 1, g => {
    withMask(g, archPath(560, 1000, 640, 900), h => {
      cover(h, duo(M('alhambra_263839'), '#140a04', '#b08a5a'), [240, 100, 640, 900], 1.1, 0.5, 0.5);
      h.save(); h.globalAlpha = 0.55; h.filter = 'saturate(0.2) brightness(0.85)';
      figure(h, 'na_cos', lerpFr(framing('na_cos', 'face', 0.3), framing('na_cos', 'eyes', 0.3), 0.2), { flip: true, shadow: false }); h.restore();
    });
    g.save(); g.strokeStyle = GOLD; g.lineWidth = 3; g.beginPath(); archPath(560, 1000, 640, 900)(g); g.stroke(); g.lineWidth = 1.2; g.beginPath(); archPath(560, 1018, 676, 936)(g); g.stroke(); g.restore();
  });
  layer(ctx, 1, g => figure(g, 'na_cos', lerpFr(framing('na_cos', 'knee', 0.76), framing('na_cos', 'bust', 0.74), 0.5), { rim: '#ffd0a0', rimSide: -1, glow: '#ffb040', glowA: 0.2 }));
  frameDeco(ctx, t, { fh: 120 });
}
function fivesFans(ctx, t, s) { // ほら今すぐに あたためて — five fans open one by one around one candle
  const p = inv(s.a, 48.46, t);
  kaleBG(ctx, t, 'textile_461355', { tint: '#3a0408', tintA: 0.55 - p * 0.25, spin: 0.02 + p * 0.04 });
  layer(ctx, 1, g => lightRays(g, 960, 620, 1400, t * 0.04, 28, '#ffd08a', smooth(45, 47.8, t) * 0.6));
  const fans = ['fan_169859', 'fan_120720', 'fan_156754', 'fan_118755', 'fan_107571'], t0 = barT(Math.ceil(barF(s.a + 0.2)));
  layer(ctx, 1, g => [2, 1, 3, 0, 4].forEach((k, j) => fanOpen(g, M(fans[k]), 960 + (k - 2) * 360, 820 - Math.abs(k - 2) * 40, 430, opens(t, t0 + j * T.bar * 0.5, 1.0), { rot: (k - 2) * 0.12 })));
  layer(ctx, 1, g => { obj(g, IMG.obj_fi_candle, 960, 930, 360, {}); glow(g, 960, 790, 260 + p * 520, '#ffb060', 0.6 + p * 0.4); });
  embers(ctx, t, Math.round(20 + 50 * p), 13, { a: 0.9, speed: 90 + 80 * p });
  frameDeco(ctx, t, { fh: 130 });
  wash(ctx, '#fff3e0', Math.pow(smooth(47.6, 48.46, t), 2) * 0.85, 'screen');
}

/* ------------------------------------------------------------ CHORUS 1 */
function chorusOpen(ctx, t, s) { // wide group medallion inside a turning lustre dish
  kaleBG(ctx, t, 'tile_477238', { tint: '#5a0612', tintA: 0.5, spin: 0.03 });
  layer(ctx, 1, g => lightRays(g, 1300, 520, 1500, t * 0.03, 30, '#ffd08a', 0.35));
  coverMedallion(ctx, t, s, { cx: 1300, cy: 520, R: 360, dish: 'dish_471762' });
  frameDeco(ctx, t, { fh: 130 });
  petals(ctx, t, 14, 9, { a: 0.9, speed: 90, wind: 60 });
}
function faceSlats(whos) { return (ctx, t, s) => { // five portrait strips cut from the jacket
  layer(ctx, 1, g => { bg(g, '#1a0507'); tileWall(g, M('tile_187938'), 220, 0, 0, 0, 0.35); });
  const n = whos.length, pw = W / n;
  layer(ctx, 1, g => whos.forEach((w, k) => {
    withMask(g, rectPath(k * pw + 14, 50, pw - 28, H - 100), h => cover(h, IMG.cover, [k * pw, -60, pw, H + 120], 2.5, CF.cover[w][0], CF.cover[w][1] + 0.04));
    g.save(); g.strokeStyle = GOLD; g.lineWidth = 3; g.strokeRect(k * pw + 14, 50, pw - 28, H - 100); g.restore();
  }));
  frameDeco(ctx, t, { fh: 110 });
}; }
function sunPoster(ctx, t, s) { // 昇った太陽は 眠らないまま — a flamenco poster: the five as silhouettes under a sun that will not set
  const u = uOf(t, s), sy = 610 - 40 * E.inOutSine(u);
  layer(ctx, 1, g => {
    bgGrad(g, [[0, '#2a0208'], [0.38, '#8a0a1a'], [0.62, '#e0401c'], [0.74, '#ffb04a'], [0.745, '#2a0508'], [1, '#0e0204']]);
    ['#ffd98a', '#ff9a4a', '#ff5a5a', '#d81e4a', '#7a0a2a'].forEach((c, k) => { const r = 300 + k * 70 + Math.sin(t * 0.8 - k * 0.6) * 6; rings(g, 960, sy, [r], c, 10 - k, 0.55 - k * 0.07); });
    glow(g, 960, sy, 620, '#ffcf7a', 0.55); g.fillStyle = '#fff1c8'; g.beginPath(); g.arc(960, sy, 250, 0, TAU); g.fill();
    radial(g, 960, sy, 250, [[0, 'rgba(255,255,240,0.6)'], [1, 'rgba(255,190,90,0)']], 'source-over');
    lightRays(g, 960, sy, 1600, t * 0.03, 34, '#ffd08a', 0.3);
    g.fillStyle = '#120205'; g.fillRect(-300, 800, W + 600, 600);   // the stage floor, horizon at 800
    g.save(); g.globalCompositeOperation = 'screen'; for (let k = 0; k < 30; k++) { const y = 806 + Math.pow(k / 30, 1.5) * 260, w = 60 + k * 26; g.globalAlpha = 0.18 * (0.6 + 0.4 * Math.sin(t * 1.6 + k)); g.fillStyle = '#ffb060'; g.fillRect(960 - w / 2, y, w, 2 + k * 0.06); } g.restore();
  });
  layer(ctx, 1, g => ORDER.forEach((w, k) => { const key = COS[w], a = smooth(s.a + 0.1 + k * 0.12, s.a + 0.7 + k * 0.12, t);
    figure(g, key, framing(key, 'wide', 0.13 + k * 0.185, { h: 470, drop: 0.0 }), { img: tinted(IMG[key], '#140306'), a, shadow: false, glow: '#ff9a50', glowA: 0.45, glowBlur: 16, floor: 812 }); }));
  kin(ctx, t, 16, { to: 6, x: 960, y: 175, align: 'center', size: 150, kana: 0.48, fill: '#fff6e6', glow: 'rgba(255,120,60,0.7)', accent: { from: 3, to: 5, fill: { grad: ['#fffaf0', '#ffe2b0', '#f2b866'] } } });
  kin(ctx, t, 16, { from: 7, x: 960, y: 310, align: 'center', size: 96, kana: 0.62, fill: '#fff6e6', glow: 'rgba(255,120,60,0.6)' });
  frameDeco(ctx, t, { fh: 120 });
}
function nagiCard(o = {}) { return (ctx, t, s) => {
  layer(ctx, 1, g => cover(g, IMG.card_na, OS, o.z || 1.3, o.fx ?? 0.5, o.fy ?? 0.42));
  layer(ctx, 1, g => radial(g, 960, 540, 1200, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(30,6,8,0.55)']]));
  petals(ctx, t, 18, 21, { a: 1, speed: 90, wind: 90 });
  frameDeco(ctx, t, { fh: 120, fringe: o.fringe });
}; }
const NEONC = ['#ff3a5c', '#ffc94a', '#ff6fc0'];   // crimson, gold, rose: switched on the bar
function neonFans(ctx, t, s) { // 今宵夢舞う 大胆に — Met fans traced in neon, the colours changing with the bar
  layer(ctx, 1, g => { bg(g, '#06030a'); lattice(g, t, '#4a2050', 0.22, 170, 0, 0, 0); radial(g, 960, 600, 1100, [[0, 'rgba(70,10,40,0.4)'], [1, 'rgba(0,0,0,0.7)']]); });
  const bar = Math.floor(barF(t + 0.02)), c = k => NEONC[(bar + k) % 3];
  layer(ctx, 1, g => {
    neon(g, 'fan_120720', 960, 700, 820, c(0), { a: opens(t, s.a, 0.7) });
    neon(g, 'fan_169859', 330, 860, 600, c(1), { a: opens(t, s.a + T.beat, 0.7), rot: -0.3 });
    neon(g, 'fan_156754', 1590, 860, 600, c(2), { a: opens(t, s.a + 2 * T.beat, 0.7), rot: 0.3 });
    neonStroke(g, c(0), 3, h => scallops(h, -40, W + 40, H - 30, 40), 0.6 * smooth(s.a, s.a + 0.8, t));
  });
  kin(ctx, t, 18, { to: 5, x: 960, y: 560, align: 'center', size: 150, kana: 0.5, glow: 'rgba(255,120,170,0.55)' });
  kin(ctx, t, 18, { from: 6, x: 960, y: 790, align: 'center', size: 230, kana: 0.45, fill: { grad: ['#fffaf0', '#ffe2b0', '#f2b866'] }, glow: 'rgba(255,170,90,0.65)' });
  caption(ctx, t, 'esta noche, sin miedo', 960, 940, Ls(18) + 1.0, { align: 'center', exit: s.b - 0.3 });
}
function fireLove(ctx, t, s) { // とこしえに燃える愛 — the line itself burns
  layer(ctx, 1, g => { bg(g, '#0e0303'); const im = M('textile_227208'); if (im) cover(g, duo(im, '#0e0303', '#6a1810'), OS, 1.25, 0.5, 0.5); radial(g, 960, 1060, 1300, [[0, 'rgba(255,110,40,0.5)'], [1, 'rgba(0,0,0,0)']], 'screen'); });
  layer(ctx, 1, g => ink(g, IMG.ink_c1_blaze, '#ff6a2a', [0, 520, W, 560], 1.1, 0.5, 0.6, 0.7, 'screen'));
  layer(ctx, 1, g => { obj(g, IMG.obj_fi_r3, 190, 940, 460, { rot: 0.3 }); obj(g, IMG.obj_d_rose, 1750, 960, 460, { rot: -0.2 }); });
  kin(ctx, t, 21, { x: 960, y: 500, align: 'center', size: 230, kana: 0.42, fill: { grad: ['#fff6e0', '#ffd08a', '#ff8a3c'] }, glow: 'rgba(255,110,40,0.8)', glowBlur: 34, exit: s.b - 0.05 });
  caption(ctx, t, 'un amor que arde para siempre', 960, 640, Ls(21) + 0.8, { align: 'center', exit: s.b - 0.3 });
  embers(ctx, t, 60, 33, { a: 1, speed: 100 });
  frameDeco(ctx, t, { fh: 120 });
}
function coverWide(ctx, t, s, o = {}) { // the whole jacket in a gilded frame on a tile wall
  layer(ctx, 1, g => { bg(g, '#1a0507'); tileWall(g, M(o.tile || 'tile_187924'), 260, 0, 0, 0, 0.9); wash(g, '#2a0408', 0.45, 'multiply'); });
  layer(ctx, 1, g => {
    const fw = 700, fh = 700, x = 1330 - fw / 2, y = 540 - fh / 2;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 50; g.fillStyle = '#c8a05a'; g.fillRect(x - 34, y - 34, fw + 68, fh + 68); g.restore();
    g.fillStyle = '#2a1408'; g.fillRect(x - 12, y - 12, fw + 24, fh + 24);
    cover(g, IMG.cover, [x, y, fw, fh], 1.0, 0.5, 0.5);
    g.save(); g.strokeStyle = '#f2d9a6'; g.lineWidth = 2; g.strokeRect(x - 24, y - 24, fw + 48, fh + 48); g.restore();
  });
  petals(ctx, t, 16, 31, { a: 1, speed: 70 });
  frameDeco(ctx, t, { fh: 130, lace: 'm_lace_220632_mask', lh: 110 });
}

/* ------------------------------------------------------------ INTERLUDE: the collage table; the five pop in and hop */
function guitarTable(ctx, t, s) {
  layer(ctx, 1, g => {
    g.save(); g.translate(-lerp(0, 1900, E.inOutSine(uOf(t, s))), 0);
    const kraft = IMG.paper_kraft; if (kraft) { g.drawImage(kraft, -300, -200, 2400, 1480); g.drawImage(kraft, 2100, -200, 2400, 1480); }
    obj(g, M('guitar_503385'), 820, 600, 900, { rot: -0.9 });
    obj(g, M('guitar_505283'), 2600, 560, 780, { rot: 0.35 });
    fanOpen(g, M('fan_120766'), 1480, 1060, 420, 1, { rot: 0.1 });
    obj(g, M('dish_468516'), 1900, 300, 380, { rot: t * 0.05 });
    piece(g, 3300, 520, 700, 460, { img: M('tile_187894'), z: 1.1, rot: 0.04, seed: 61 });
    const bp = beatF(t);
    ['c_yo', 'c_na', 'c_shi', 'c_to', 'c_ri'].forEach((k, j) => {
      const p = pop(t, 69.95 + j * T.bar * 0.75);
      sticker(g, IMG[k], 300 + j * 760, 260 - hop(bp, j * 0.5, 22) + (j % 2) * 520, 330 * p.s, { a: p.a, rot: (j % 2 ? 0.1 : -0.08) + p.r });
    });
    polaroid(g, IMG.cover, 2250, 760, 420, { rot: -0.08, z: 1.1, caption: '¡olé!', capColor: '#7a1f2a' });
    earrings(g, M('jewel_141739'), 3000, 900, 260, t, 1);
    tape(g, 2250, 520, 160, 0.2); tape(g, 3300, 280, 180, -0.2);
    scribble(g, t, 70.6, 'esta noche ♪', 1160, 160, 70, '#7a1f2a', -0.08, 1.0);
    doodle(g, 'swoosh', 1300, 230, 4, clamp((t - 71.3) / 0.7), '#7a1f2a', 5);
    g.restore();
  });
  frameDeco(ctx, t, { fh: 120 });
}

/* ------------------------------------------------------------ VERSE 2: summer memories (private clothes, polaroids) */
function summerNagi(ctx, t, s) {
  const b = sd => boil(t, sd);
  layer(ctx, 1, g => paperBG(g, 'paper_cream'));
  layer(ctx, 1, g => {
    const p1 = slap(t, s.a + 0.1), p2 = slap(t, s.a + 0.7), p3 = slap(t, Ls(24) - 0.3);
    polaroid(g, IMG.photo_v2_moonbeach, 520 + b(1)[0], 430 + b(1)[1], 560 * p1.s, { a: p1.a, rot: -0.08 + p1.r, z: 1.3, fx: 0.55, caption: 'summer night', filter: `${develop((t - s.a) / 2.4)} brightness(1.6)` });
    polaroid(g, null, 1250 + b(2)[0], 470 + b(2)[1], 640 * p2.s, { a: p2.a, rot: 0.05 + p2.r, caption: 'nagi', capColor: '#8a3a58',
      draw: (h, px, py, pw, ph) => { h.fillStyle = MEM.na.light; h.fillRect(px, py, pw, ph); h.filter = develop((t - s.a - 0.7) / 2.4); figure(h, 'na_casual', { x: px + pw * 0.5, y: py + ph * 0.42, fh: ph * 0.36 }, { shadow: false, floor: py + ph + 4 }); h.filter = 'none'; } });
    tape(g, 520, 130, 170, 0.05, undefined, p1.a); tape(g, 1250, 120, 170, -0.1, 'rgba(255,200,215,0.7)', p2.a);
    piece(g, 1500, 960, 900 * p3.s, 180 * p3.s, { img: IMG.photo_fi_sail, z: 1.6, fx: 0.5, fy: 0.62, rot: -0.02, seed: 55, a: p3.a });
    const bp = beatF(t);
    ['c_shi_swim', 'c_to_white', 'c_ri_resort'].forEach((k, j) => { const q = pop(t, Ls(24) - 0.1 + j * 0.15); sticker(g, IMG[k], 1320 + j * 160, 950 - hop(bp, j * 0.33, 12), 150 * q.s, { a: q.a, rot: (j - 1) * 0.08 + q.r, shadow: 0.25, lift: 0.5 }); });
    scribble(g, t, Ls(24) + 0.8, 'ha ha ♪', 1700, 830, 46, '#3a5aa0', -0.05, 0.8);
  });
}
function summerYoshino(ctx, t, s) {
  const b = sd => boil(t, sd);
  layer(ctx, 1, g => paperBG(g, 'paper_peach'));
  layer(ctx, 1, g => {
    const p1 = slap(t, s.a + 0.1), p2 = slap(t, s.a + 0.6), p3 = slap(t, Ls(26) - 0.3);
    polaroid(g, null, 610 + b(1)[0], 432 + b(1)[1], 590 * p1.s, { a: p1.a, rot: -0.05 + p1.r, caption: 'yoshino', capColor: '#7a5a50',
      draw: (h, px, py, pw, ph) => { h.fillStyle = MEM.yo.light; h.fillRect(px, py, pw, ph); h.filter = develop((t - s.a) / 2.4); figure(h, 'yo_swim', { x: px + pw * 0.42, y: py + ph * 0.4, fh: ph * 0.36 }, { shadow: false, floor: py + ph + 4 }); h.filter = 'none'; } });
    polaroid(g, IMG.photo_br_palms, 1380 + b(2)[0], 360 + b(2)[1], 480 * p2.s, { a: p2.a, rot: 0.07 + p2.r, z: 1.2, caption: 'la playa', filter: develop((t - s.a - 0.6) / 2.2) });
    earrings(g, M('jewel_206850'), 1040, 300, 300, t, p2.a);   // 揃いのピアス
    const q = pop(t, Ls(26) - 0.2), bp = beatF(t);   // 甘えたようにじゃれる: the two play together
    if (q.a) {
      sticker(g, IMG.c_yo_swim, 1520, 900 - hop(bp, 0, 26), 250 * q.s, { a: q.a, rot: -0.12 + Math.sin(t * 6) * 0.06 + q.r });
      sticker(g, IMG.c_na_casual, 1700, 910 - hop(bp, 0.5, 26), 250 * q.s, { a: q.a, rot: 0.12 - Math.sin(t * 6) * 0.06 - q.r });
    }
    doodle(g, 'heart', 1610, 740, 1.5, clamp((t - Ls(26) - 0.2) / 0.6), MEM.na.ink, 4);
  });
}

/* ------------------------------------------------------------ B2 / PRE 2 (stage costumes, night) */
function roseKiss(ctx, t, s) { // 戸惑っているあなたにそっと口づけて — watercolour roses, the line set vertically in ink
  layer(ctx, 1, g => { paperBG(g, 'paper_peach'); wash(g, '#fbe6ec', 0.25, 'screen');
    const im = M('rose_334302'); if (im) { const h = 930, w = im.width * h / im.height; // the botanical print, whole, laid on the page
      g.save(); g.translate(760, 545); g.rotate(-0.025); g.shadowColor = 'rgba(60,20,30,0.35)'; g.shadowBlur = 30; g.shadowOffsetY = 14; g.fillStyle = '#fffaf4'; g.fillRect(-w / 2 - 22, -h / 2 - 22, w + 44, h + 44); g.restore();
      g.save(); g.translate(760, 545); g.rotate(-0.025); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore(); tape(g, 760, 82, 200, 0.04, 'rgba(255,214,226,0.75)'); }
    bokeh(g, t, 12, 61, ['#ffd0dc', '#fff0e0', '#f0c8ff'], 0.55, 1.0); });
  const inkC = { fill: '#3a1420', glow: 'rgba(255,255,255,0.7)', glowBlur: 14, shadow: null, size: 120, kana: 0.5, vertical: true };
  kin(ctx, t, 27, { ...inkC, to: 10, x: 1720, y: 150 });
  kin(ctx, t, 27, { ...inkC, from: 10, x: 1560, y: 330, accent: { from: 3, to: 7, fill: '#b01e3c' } });
  caption(ctx, t, 'un beso, despacio', 1500, 1000, Ls(27) + 2.0, { align: 'end', color: '#9a3a50', exit: s.b - 0.3, rule: [1290, 1028, 210, 2] });
  petals(ctx, t, 10, 63, { a: 0.8, speed: 35, wind: 20, size: 0.9 });
}
function shinAway(ctx, t, s) { // 「連れ去って」: she turns back from a lamp-lit Moorish corridor
  layer(ctx, 1, g => { cover(g, duo(M('alhambra_263839'), '#140818', '#e8c0e8'), OS, 1.3, 0.5, 0.52); glow(g, 960, 560, 480, '#ffe0c8', 0.55); });
  const fr = lerpFr(framing('shi_cos', 'bust', 0.7), framing('shi_cos', 'face', 0.7), 0.3);
  layer(ctx, 1, g => figure(g, 'shi_cos', fr, { rim: '#ffd8f0', rimSide: -1, glow: MEM.shi.ink, glowA: 0.22, grade: '#4a2a60', gradeA: 0.15 }));
}
function riamuBells(ctx, t, s) { // the bell tower behind her; each toll passes over her as a ring of light
  layer(ctx, 1, g => { bgGrad(g, [[0, '#1a1036'], [0.7, '#3a2050'], [1, '#160c24']]); stars(g, t, 60, 71, [0, -200, W, 600], 0.6); });
  const hits = []; for (let k = Math.ceil(beatF(s.a) / 4) * 4; beatT(k) < 106.3; k += 4) hits.push(beatT(k));
  let toll = 0; hits.forEach(h => { if (t >= h) toll = Math.max(toll, Math.exp(-(t - h) * 3)); });
  layer(ctx, 1, g => { place(g, tinted(IMG.obj_p2_bells, '#0c0818'), 520, 700, 820, {}); glow(g, 520, 380, 260, '#ffd8a0', 0.25 + toll * 0.3); });
  layer(ctx, 1, g => hits.forEach(h => { const v = (t - h) / 3.2; if (v > 0 && v < 1) rings(g, 520, 380, [E.outCubic(v) * 1600], GOLD, 1.5 * (1 - v) + 0.5, 0.7 * (1 - v)); }));
  const fr = lerpFr(framing('ri_cos', 'bust', 0.68), framing('ri_cos', 'face', 0.68), 0.5);
  layer(ctx, 1, g => figure(g, 'ri_cos', fr, { rim: '#f0dcff', rimA: 0.5 + toll * 0.3, rimSide: -1, grade: '#4a3080', gradeA: 0.2 }));
}
function silence(ctx, t, s) {
  photoBG(ctx, 'alhambra_288043', '#06040c', '#4a3a6a', { z: 1.2 });
  layer(ctx, 1, g => stars(g, t, 60, 81, [0, 0, W, 500], 0.4 * (1 - smooth(110, 112, t))));
  const q = E.inOutSine(inv(s.a + 0.4, 110.4, t));
  layer(ctx, 1, g => { for (const sd of [-1, 1]) { glow(g, 960 + sd * lerp(420, 30, q), 520, 120, sd < 0 ? '#ffd0a0' : '#ffb0d0', 0.9); sparkle(g, 960 + sd * lerp(420, 30, q), 520, 0.8, 1); } });
  wash(ctx, '#fff0ff', Math.pow(smooth(111.6, 112.33, t), 2) * 0.85, 'screen');
}

/* ------------------------------------------------------------ CHORUS 2 (midnight) */
function morningStar(ctx, t, s) { nagiCard({ z: 1.3, fx: 0.42, fy: 0.45, fringe: false })(ctx, t, s); layer(ctx, 1, g => { sparkle(g, 1640, 150, 2.6 + pulse(t, 4) * 0.3, 1); glow(g, 1640, 150, 260, '#e8d8ff', 0.6); }); }
function moonPavilion(ctx, t, s) { // 沈んでく月に: the moon sets behind the pavilion
  const u = uOf(t, s);
  layer(ctx, 1, g => { bgGrad(g, [[0, '#05040e'], [0.7, '#141038'], [1, '#2a1838']]); stars(g, t, 120, 93, [0, -100, W, H], 0.7); });
  layer(ctx, 1, g => { obj(g, IMG.obj_c2_moon, 1320, lerp(260, 470, E.inOutSine(u)), 440, { shadow: false }); glow(g, 1320, lerp(260, 470, u), 500, '#ffd8a0', 0.3); });
  layer(ctx, 1, g => { const im = M('alhambra_263835'); if (im) { const [c, b] = buf('moonpav'); cover(b, duo(im, '#06040e', '#7a6aa8'), [0, 300, W, 800], 1.0, 0.5, 0.78);
    b.globalCompositeOperation = 'destination-in'; const gr = b.createLinearGradient(0, 300, 0, 620); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); b.fillStyle = gr; b.fillRect(0, 0, W, H); g.drawImage(c, 0, 0); } });
}
function watches(ctx, t, s) { // 時は過ぎ行く 冷淡に — five watches around her; the dial ticks on the beat
  kaleBG(ctx, t, 'tile_187912', { tint: '#0a0818', tintA: 0.65, spin: 0 });
  const k = Math.floor(beatF(t)), fr = E.outCubic(clamp((beatF(t) - k) * 4)), rot = (k + fr) * (TAU / 60);
  const W5 = ['watch_207363', 'watch_195645', 'watch_187195', 'watch_194040', 'watch_194033'];
  layer(ctx, 1, g => W5.forEach((w, j) => { const a = (j / 5) * TAU - Math.PI / 2 + 0.3; obj(g, M(w), 960 + Math.cos(a) * 560, 540 + Math.sin(a) * 320, 250, { rot: Math.sin(t * 0.8 + j) * 0.05 }); }));
  layer(ctx, 1, g => { withMask(g, circlePath(960, 540, 240), h => { bg(h, '#0a0814'); obj(h, M('watch_194208'), 960, 590, 560, { shadow: false, a: 0.28 }); radial(h, 960, 540, 260, [[0, 'rgba(10,8,20,0.2)'], [1, 'rgba(10,8,20,0.85)']]); }); rings(g, 960, 540, [246, 262], GOLD, 2, 0.9);
    for (let j = 0; j < 60; j++) { const a = (j / 60) * TAU - Math.PI / 2; g.save(); g.strokeStyle = GOLD; g.globalAlpha = 0.6; g.lineWidth = j % 5 ? 1 : 3; g.beginPath(); g.moveTo(960 + Math.cos(a) * 280, 540 + Math.sin(a) * 280); g.lineTo(960 + Math.cos(a) * (j % 5 ? 296 : 312), 540 + Math.sin(a) * (j % 5 ? 296 : 312)); g.stroke(); g.restore(); }
    const ha = rot - Math.PI / 2; g.save(); g.strokeStyle = GOLD; g.lineWidth = 3; g.beginPath(); g.moveTo(960 + Math.cos(ha) * 262, 540 + Math.sin(ha) * 262); g.lineTo(960 + Math.cos(ha) * 318, 540 + Math.sin(ha) * 318); g.stroke(); g.restore(); });
  kin(ctx, t, 35, { to: 6, x: 960, y: 490, align: 'center', size: 96, kana: 0.5, fill: '#e8e4f4', glow: 'rgba(170,170,255,0.4)', exit: s.b - 0.05 });
  kin(ctx, t, 35, { from: 7, x: 960, y: 625, align: 'center', size: 120, kana: 0.55, fill: { grad: ['#fffaf0', '#f2d9a6', '#c8a05a'] }, exit: s.b - 0.05 });
}
// うたかたに紡ぐ愛 — a rack focus through a glass of rising bubbles: the foam is sharp first,
// then it melts into bokeh as Yoshino's face behind it comes into focus.
function blurInto(g, px, draw) { // draw something defocused via a half-res buffer
  if (px < 0.6) { draw(g); return; }
  const [c, b] = buf('rack', W / 2, H / 2);
  b.filter = `blur(${px / 2}px)`; b.save(); b.scale(0.5, 0.5); draw(b); b.restore(); b.filter = 'none';
  g.drawImage(c, 0, 0, W, H);
}
function bubbles(ctx, t, s) {
  const u = uOf(t, s), rack = E.inOutSine(clamp((u - 0.28) / 0.42));
  const face = CF.cardYo.yo;
  layer(ctx, 1, g => {
    bg(g, '#120608');
    blurInto(g, lerp(22, 0, rack), b => { cover(b, IMG.card_yo, [0, 0, W, H], 2.2, face[0] + 0.03, face[1] - 0.01); });
    wash(g, '#3a1020', lerp(0.35, 0.12, rack), 'multiply');
  });
  layer(ctx, 1, g => { // the glass of bubbles in front (screen-blended: only the light of the bubbles stays)
    g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = lerp(0.95, 0.6, rack);
    blurInto(g, lerp(0, 26, rack), b => { b.filter = 'contrast(1.5) brightness(0.85) saturate(0.7) sepia(0.35)'; cover(b, M('c2_fizz') || IMG.photo_c2_fizz, [0, 0, W, H], 2.3, 0.6, lerp(0.62, 0.48, u)); b.filter = 'none'; });
    g.restore();
  });
  layer(ctx, 1, g => { for (let i = 0; i < 7; i++) { const a = smooth(0.55 + i * 0.05, 0.7 + i * 0.05, u) * (0.6 + 0.4 * Math.sin(t * 3 + i));
    sparkle(g, 300 + hash(i, 41) * 1300, lerp(900, 120, (u * 0.6 + hash(i, 42)) % 1), 0.5 + hash(i, 43) * 0.5, a, '#fff0f4'); } });
  layer(ctx, 1, g => radial(g, W / 2, H / 2, 1200, [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(20,4,10,0.1)'], [1, 'rgba(20,4,10,0.65)']]));
}
function guitarMacro(ctx, t, s) { // Canción de amor: an inlaid Baroque guitar in candle light
  layer(ctx, 1, g => { bg(g, '#0c0604'); glow(g, 900, 560, 800, '#ffb060', 0.3); });
  layer(ctx, 1, g => obj(g, M('guitar_503932'), lerp(1120, 980, E.inOutSine(uOf(t, s))), 560, 1700, { rot: -1.25, shadow: false }));
  embers(ctx, t, 30, 101, { a: 0.6, speed: 50 });
}

/* ------------------------------------------------------------ DANCE BREAK */
function danceWall(ctx, t, s) { // wide, intentional full figure: her shadow thrown across a fire-lit tile wall
  layer(ctx, 1, g => { bg(g, '#080304'); kaleido(g, M('tile_187924'), { n: 8, rot: t * 0.02, R: 1500, cy: 620, zoom: 1.2 }); wash(g, '#ff8a40', 0.35, 'soft-light');
    radial(g, 960, 1150, 1300, [[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0.92)']]); });
  const sway = Math.sin((t - 133.62) * Math.PI / T.beat / 4) * 0.02, fl = 0.85 + 0.15 * noise1(t * 3, 9);
  layer(ctx, 1, g => { g.save(); g.filter = 'blur(14px)'; g.globalAlpha = 0.7 * fl; place(g, tinted(IMG.na_cos, '#0a0204'), 1260, 470, 1650, { rot: sway }); g.restore(); });
  layer(ctx, 1, g => ink(g, IMG.ink_c1_blaze, '#ff7a2a', [0, 620, W, 460], 1.05, 0.5, 0.7, 0.85, 'screen'));
  layer(ctx, 1, g => figure(g, 'na_cos', framing('na_cos', 'wide', 0.45, { h: 1000 }), { glow: '#ff7a3c', glowA: 0.45, rim: '#ffb070' }));
  embers(ctx, t, 40, 41, { a: 0.85, speed: 100 });
}
const KALE = { yo: 'tile_477238', na: 'textile_461355', shi: 'textile_230357', to: 'tile_187927', ri: 'tile_187929' };
const DISH = { yo: 'dish_471811', na: 'dish_471739', shi: 'dish_468516', to: 'dish_201662', ri: 'dish_471790' };
const NDISH = { yo: 'iron_466304', na: 'dish_471762', shi: 'dish_468516', to: 'iron_466304', ri: 'dish_471762' };
const rollCall = (who, size, k = 1) => (ctx, t, s) => { // member introductions: neon arches in her colour, one held portrait
  const m = MEM[who], fr = framing(COS[who], size, 0.66, { k });
  layer(ctx, 1, g => { bg(g, '#06030a'); radial(g, fr.x, 520, 1200, [[0, rgba(m.deep, 1)], [0.6, rgba(m.deep, 0.4)], [1, 'rgba(0,0,0,0)']]);
    neonStroke(g, m.ink, 3, q => { for (let j = 0; j < 7; j++) horseshoe(q, 120 + j * 290, H + 60, 220, 820); }, 0.75);
    g.save(); g.font = font(F.anton, 420, 400); g.textBaseline = 'middle'; g.textAlign = 'center'; g.strokeStyle = rgba(m.light, 0.28); g.lineWidth = 3; g.strokeText(m.name, 700, 560); g.restore(); });
  layer(ctx, 1, g => neon(g, NDISH[who], fr.x, fr.y, fr.fh * 2.6, m.ink, { a: 0.75, rot: t * 0.04 }));
  layer(ctx, 1, g => figure(g, COS[who], fr, { rim: m.light, rimSide: -1 }));
  const p = E.outCubic(clamp((t - s.a - 0.15) / 0.7));
  label(ctx, m.name, 150, 780 + (1 - p) * 12, { fam: F.anton, size: 110, color: IV, track: 0.06, alpha: p });
  ctx.save(); ctx.globalAlpha = p; ctx.fillStyle = m.ink; ctx.fillRect(156, 812, 260 * p, 6); ctx.restore();
  label(ctx, `${m.jp}　CV.${m.cv}`, 156, 870, { size: 28, weight: 700, color: IV, track: 0.12, alpha: smooth(s.a + 0.4, s.a + 1.0, t) });
};
function jewels(ctx, t, s) { // Passion jewelries: the five gather as jewels on one chain, then the light floods in
  const p = inv(s.a, 166.53, t);
  kaleBG(ctx, t, 'tile_187933', { tint: '#4a0610', tintA: 0.5, spin: 0.02 + 0.05 * p });
  layer(ctx, 1, g => lightRays(g, 960, 540, 1500, t * 0.04, 30, '#ffd08a', 0.15 + 0.45 * smooth(163.5, 166.3, t)));
  const xs = ORDER.map((w, k) => 960 + (k - 2) * 340), y = k => 540 + Math.abs(k - 2) * 26;
  layer(ctx, 1, g => {
    const chain = smooth(s.a, s.a + 1.2, t);
    g.save(); g.strokeStyle = GOLD; g.globalAlpha = 0.8 * chain; g.lineWidth = 2; g.setLineDash([2, 8]); g.beginPath(); g.moveTo(-40, 470); xs.forEach((x, k) => g.lineTo(x, y(k) - 150)); g.lineTo(W + 40, 470); g.stroke(); g.restore();
    ORDER.forEach((w, k) => {
      const a = smooth(s.a + 0.3 + k * T.bar * 0.5, s.a + 0.9 + k * T.bar * 0.5, t); if (a <= 0) return;
      g.save(); g.globalAlpha = a;
      glow(g, xs[k], y(k), 230, MEM[w].ink, 0.45);
      withMask(g, circlePath(xs[k], y(k), 142), h => cover(h, IMG.cover, [xs[k] - 142, y(k) - 142, 284, 284], 4.2, CF.cover[w][0], CF.cover[w][1]));
      rings(g, xs[k], y(k), [146], GOLD, 4, 1); rings(g, xs[k], y(k), [156], MEM[w].ink, 3, 0.9);
      g.restore();
    });
  });
  frameDeco(ctx, t, { fh: 130 });
  embers(ctx, t, Math.round(24 + 40 * p), 77, { a: 0.85, speed: 90 + 60 * p });
  wash(ctx, '#fff3e0', Math.pow(smooth(165.4, 166.53, t), 2) * 0.9, 'screen');
}

/* ------------------------------------------------------------ BRIDGE (dawn, private clothes) */
function dawnSky(ctx, t, p = 0, sx = 960) {
  layer(ctx, 1, g => {
    const c = (a, b) => { const q = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], x = q(a), y = q(b); return `rgb(${lerp(x[0], y[0], p) | 0},${lerp(x[1], y[1], p) | 0},${lerp(x[2], y[2], p) | 0})`; };
    bgGrad(g, [[0, c('#4a3a7a', '#7a5a9a')], [0.45, c('#e08a8a', '#f4a88a')], [0.62, c('#ffd0a0', '#ffe2b8')], [0.63, '#f2b89a'], [1, '#5a3048']]);
    glow(g, sx, lerp(700, 600, p), 900, '#fff0d0', 0.7); g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(sx, lerp(700, 600, p), 80, 0, TAU); g.fill();
    g.save(); g.globalCompositeOperation = 'screen'; for (let k = 0; k < 40; k++) { const y = 690 + Math.pow(k / 40, 1.6) * 390, w = 30 + k * 18; g.globalAlpha = 0.25 * (0.6 + 0.4 * Math.sin(t * 1.5 + k)); g.fillStyle = '#fff2d8'; g.fillRect(sx - w / 2 + Math.sin(t * 0.7 + k) * 14, y, w, 2 + k * 0.08); } g.restore();
  });
}
function profiles(ctx, t, s) { // 朝日が照らした ふたりの横顔を: Nagi alone, stage costume, lit by the rising sun
  dawnSky(ctx, t, inv(166.5, 191, t), 560);
  layer(ctx, 1, g => figure(g, 'na_cos', lerpFr(framing('na_cos', 'knee', 0.68), framing('na_cos', 'bust', 0.67), 0.6),
    { rim: '#fff0c8', rimA: 0.75, rimSide: -1, glow: '#ffd8a0', glowA: 0.28, grade: '#ffb080', gradeA: 0.18, gradeOp: 'soft-light' }));
}
function dawnJewel(ctx, t, s) { // ああ あなたのカフスを — a small gold jewel catching the first light
  dawnSky(ctx, t, inv(166.5, 191, t), 1320);
  layer(ctx, 1, g => { obj(g, M('jewel_206840'), 1320, 500, 560, { rot: 0.06, shadowA: 0.3 }); sparkle(g, 1262, 446, 1.4 + 0.25 * Math.sin(t * 2.4), 0.9, '#fffaf0'); sparkle(g, 1385, 610, 0.9 + 0.2 * Math.sin(t * 3.1 + 1), 0.8, '#fffaf0'); });
  const dawnInk = { fill: '#fffaf2', glow: 'rgba(255,170,120,0.55)', shadow: 'rgba(90,30,40,0.45)', exit: s.b - 0.05 };
  kin(ctx, t, 42, { ...dawnInk, to: 2, x: 200, y: 420, size: 120, kana: 0.62 });
  kin(ctx, t, 42, { ...dawnInk, from: 3, x: 200, y: 590, size: 150, kana: 0.72, accent: { from: 4, to: 7, fill: '#fff4d8', glow: 'rgba(255,190,90,0.8)' } });
  caption(ctx, t, 'tus gemelos, al amanecer', 205, 690, Ls(42) + 1.0, { color: '#fff0dc', exit: s.b - 0.3, rule: [205, 718, 280, 2] });
}
function cufflinkHands(ctx, t, s) { // 握りしめたまま: insert on the hands holding on
  layer(ctx, 1, g => cover(g, IMG.card_yo, OS, 2.9, CF.cardYo.hands[0], CF.cardYo.hands[1]));
  wash(ctx, '#ffb080', 0.25, 'soft-light'); wash(ctx, '#fff0e0', 0.12, 'screen');
  layer(ctx, 1, g => sparkle(g, 900, 640, 1.3 + 0.2 * Math.sin(t * 3), 0.9));
}
function mist(ctx, t, s) {
  layer(ctx, 1, g => { bgGrad(g, [[0, '#cbb8e0'], [0.6, '#f0d0d8'], [1, '#f8e0d0']]); for (let k = 0; k < 6; k++) glow(g, ((k * 400 + t * 24) % 2400) - 240, 600 + Math.sin(k) * 200, 500, '#ffffff', 0.25); });
  layer(ctx, 1, g => figure(g, 'to_white', lerpFr(framing('to_white', 'knee', 0.46), framing('to_white', 'bust', 0.45), 0.5), { rim: '#ffffff', glow: '#ffffff', glowA: 0.35 }));
  const gr = ctx.createLinearGradient(1300, 0, W, 0); gr.addColorStop(0, 'rgba(60,30,60,0)'); gr.addColorStop(1, 'rgba(60,30,60,0.55)'); ctx.fillStyle = gr; ctx.fillRect(1300, 0, W - 1300, H);
  layer(ctx, 1, g => { for (let k = 0; k < 4; k++) glow(g, ((k * 600 - t * 36) % 2600 + 2600) % 2600 - 300, 900, 600, '#ffffff', 0.3); });
}
function embrace(ctx, t, s) {
  dawnSky(ctx, t, inv(166.5, 191, t));
  const hug = smooth(Ls(46) - 0.2, Ls(46) + 1.0, t);
  layer(ctx, 1, g => { figure(g, 'shi_swim', lerpFr(framing('shi_swim', 'bust', 0.5), framing('shi_swim', 'face', 0.5), 0.45), { glow: '#ffd0a0', glowA: 0.3 + hug * 0.5, rim: '#ffe0c0' });
    rings(g, 960, 520, [lerp(900, 430, hug), lerp(940, 460, hug)], '#fff0d8', 2, hug * 0.8); glow(g, 960, 520, 600 + hug * 300, '#fff4e0', hug * 0.5); });
}

/* ------------------------------------------------------------ ESPECIAL (editorial) */
const ESP = [[191.3, 'card_yo', CF.cardYo.yo, 'yo'], [198.7, 'card_na', CF.cardNa.na, 'na'], [202.2, 'cover', CF.cover.shi, 'shi']];
function especial(ctx, t, s) {
  let cur = ESP[0], prev = null; for (const e of ESP) if (t >= e[0]) { prev = cur === e ? prev : cur; cur = e; }
  const [t0, img, f, who] = cur, m = MEM[who], a = E.inOutSine(clamp((t - t0) / 0.8));
  textileBG(ctx, 'textile_222561', { z: 1.1, tint: '#1a0206', tintA: 0.35 });
  layer(ctx, 1, g => { obj(g, M('shawl_157896'), 330, 230, 640, { rot: -0.1, a: 0.95 }); g.save(); g.font = font(F.anton, 300, 400); g.textBaseline = 'middle'; g.fillStyle = rgba('#f2d9a6', 0.85); g.translate(110, 560); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('ESPECIAL', 0, 0); g.restore(); });
  layer(ctx, 1, g => {
    const fx = 1110, fy = 120, fw = 620, fh = 820;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 40; g.fillStyle = '#f6efe0'; g.fillRect(fx - 26, fy - 26, fw + 52, fh + 110); g.restore();
    if (prev && a < 1) cover(g, IMG[prev[1]], [fx, fy, fw, fh], prev[1] === 'cover' ? 2.4 : 2.1, prev[2][0], prev[2][1]);
    g.save(); g.globalAlpha = prev ? a : 1; cover(g, IMG[img], [fx, fy, fw, fh], img === 'cover' ? 2.4 : 2.1, f[0], f[1]); g.restore();
    label(g, m.name, fx + fw, fy + fh + 48, { fam: F.anton, size: 32, color: '#2a1414', track: 0.2, align: 'right' });
    g.fillStyle = m.ink; g.fillRect(fx, fy + fh + 34, 90, 8);
    earrings(g, M('jewel_206840'), fx - 60, fy + 120, 240, t, 1);
  });
  if (t > 194.9 && t < 199) { const p = smooth(194.9, 195.5, t) * (1 - smooth(198.3, 198.9, t));
    layer(ctx, 1, g => drawText(g, t, '熱情', { x: 640, y: 110, vertical: true, size: 380, fontStr: font(F.dela, 380, 400), fill: '#f6efe0', glow: 'rgba(255,40,60,0.45)', glowBlur: 36, anim: 'blur', start: 195.0, stagger: 0.2, dur: 0.7, alpha: p })); }
  frameDeco(ctx, t, { fh: 130 });
  wash(ctx, '#ffe8c8', Math.pow(smooth(207.8, 209.11, t), 2) * 0.7, 'screen');
}

/* ------------------------------------------------------------ FINAL CHORUS (dawn bloom) */
function amanecer(ctx, t, s) { // look up into a painted sky dome at dawn
  layer(ctx, 1, g => { cover(g, M('ceiling_386262'), [-300, -500, W + 600, H + 1000], 1.0, 0.5, 0.5); wash(g, '#ffb070', 0.2, 'soft-light'); });
  coverMedallion(ctx, t, s, { cx: 960, cy: 560, R: 330, dish: 'dish_468513' });
  layer(ctx, 1, g => lightRays(g, 960, 560, 1500, t * 0.03, 30, '#fff0c8', 0.4));
  petals(ctx, t, 14, 19, { a: 1, speed: 80 });
}
function dawnArches(ctx, t, s) { // the five arches of the opening, now all lit in the morning
  layer(ctx, 1, g => { bg(g, '#3a1408'); tileWall(g, M('tile_187924'), 240, 0, 0, 0, 0.6); wash(g, '#ffb070', 0.2, 'soft-light'); });
  archRow(ctx, t, () => 1, (w, k) => smooth(s.a + k * 0.1, s.a + 0.7 + k * 0.1, t), { warm: 0.25 });
  frameDeco(ctx, t, { fh: 120 });
}
function bloom(ctx, t, s) { // 繚乱: roses open around the jacket on a collage
  layer(ctx, 1, g => { paperBG(g, 'paper_peach'); cover(g, M('rose_337713'), OS, 1.1, 0.5, 0.5, 0.5); });
  const roses = [IMG.obj_d_rose, IMG.obj_fi_r3, IMG.obj_fi_r7];
  layer(ctx, 1, g => { const p = slap(t, s.a + 0.1); piece(g, 960, 520, 620 * p.s, 620 * p.s, { img: IMG.cover, z: 1.25, fx: 0.48, fy: 0.38, rot: -0.03, seed: 77, a: p.a }); });
  layer(ctx, 1, g => { for (let i = 0; i < 16; i++) { const at = s.a + 0.3 + (i / 16) * 2.6, p = E.outCubic(clamp((t - at) / 0.9)); if (p <= 0) continue; const a = (i / 16) * TAU + 0.3, r = 470 + (i % 3) * 110;
    obj(g, roses[i % 3], 960 + Math.cos(a) * r * 1.4, 540 + Math.sin(a) * r * 0.8, (150 + (i % 4) * 40) * (0.7 + 0.3 * p), { rot: a, a: p }); } });
  petals(ctx, t, 20, 17, { a: 1, speed: 90, wind: 50 });
}
function duoGroups(ctx, t, s) { // (to+ri) | (yo+na+shi) — stage costumes, faces; the trio answers on its cue
  const k = E.inOutSine(clamp((t - (ch(61, 5) - 0.3)) / 0.5));
  layer(ctx, 1, g => bg(g, '#1a0508'));
  const panel = (keys, x0, w0) => g => { kaleido(g, M('tile_187927'), { n: 10, rot: t * 0.03, R: 900, cx: x0 + w0 / 2, cy: 540 }); wash(g, '#3a0610', 0.45, 'multiply');
    keys.forEach((key, j) => figure(g, key, framing(key, 'bust', (x0 + w0 * (j + 0.5) / keys.length) / W, { k: 0.85 }), { shadow: false, rim: IV, rimA: 0.4 })); };
  layer(ctx, 1, g => {
    withMask(g, rectPath(-10, -10, W * 0.42, H + 20, 80), panel(['to_cos', 'ri_cos'], 0, W * 0.42));
    if (k > 0) { const [c, b] = buf('duo'); withMask(b, rectPath(W * 0.42, -10, W, H + 20, 80), panel(['yo_cos', 'na_cos', 'shi_cos'], W * 0.42, W * 0.58)); g.save(); g.globalAlpha = k; g.drawImage(c, 0, 0); g.restore(); }
  });
  frameDeco(ctx, t, { fh: 120 });
}
function candleOut(ctx, t, s) {
  const out = smooth(233.3, 233.75, t);
  layer(ctx, 1, g => { bgGrad(g, [[0, '#2a2038'], [1, '#4a3048']]); g.save(); g.globalAlpha = 0.3 * (1 - out * 0.5); cover(g, IMG.cover, OS, 1.35, 0.5, 0.36); g.restore(); wash(g, '#2a2040', 0.35, 'multiply'); });
  layer(ctx, 1, g => { obj(g, IMG.obj_fi_candle, 960, 820, 520, { filter: `brightness(${1 - out * 0.45})` }); glow(g, 958, 640, 300, '#ffb060', 0.8 * (1 - out));
    if (out > 0) { g.save(); g.translate(962, 640); g.scale(0.45, 1); const fl = g.createRadialGradient(0, 0, 0, 0, 0, 120); fl.addColorStop(0, `rgba(40,30,44,${out})`); fl.addColorStop(0.6, `rgba(40,30,44,${0.85 * out})`); fl.addColorStop(1, 'rgba(40,30,44,0)'); g.globalCompositeOperation = 'multiply'; g.fillStyle = fl; g.fillRect(-140, -140, 280, 280); g.restore(); }
    const u = t - 233.45; if (u > 0) { g.save(); g.globalCompositeOperation = 'screen'; for (let i = 0; i < 60; i++) { const age = u - i * 0.05; if (age <= 0 || age > 3) continue; const y = 650 - age * 150, x = 958 + noise1(age * 0.9 + i * 0.1, 7) * age * 60, r = 6 + age * 30; g.globalAlpha = 0.18 * (1 - age / 3); g.drawImage(softDot('#e8e0f0', 64), x - r, y - r, r * 2, r * 2); } g.restore(); } });
  wash(ctx, '#c8b8e8', out * 0.25, 'screen');
}
function finalPale(ctx, t, s) { // morning: the night becomes a photograph — the jacket develops as a polaroid on lace
  layer(ctx, 1, g => { paperBG(g, 'paper_peach'); const m = IMG.m_lace_223050_mask; if (m) cover(g, tinted(m, '#fffaf2'), OS, 1.0, 0.5, 0.5, 0.75); wash(g, '#f6d8e8', 0.25, 'screen'); });
  layer(ctx, 1, g => { fanOpen(g, M('fan_209646'), 260, 1000, 420, 1, { rot: -0.3 }); obj(g, IMG.obj_d_rose, 1780, 930, 300, { rot: 0.4 }); earrings(g, M('jewel_206855'), 900, 300, 260, t, 1); });
  layer(ctx, 1, g => { polaroid(g, IMG.cover, 1360, 500, 600, { rot: 0.05, z: 1.05, fx: 0.5, fy: 0.45, caption: 'Lleno de amor', capColor: '#7a1f2a', filter: develop((t - s.a) / 2.6) }); tape(g, 1360, 140, 200, 0.06); });
  wash(ctx, '#fff4e8', 0.12, 'screen');
}

/* ------------------------------------------------------------ OUTRO (polaroid wall) */
function credits(ctx, t, s) {
  layer(ctx, 1, g => paperBG(g, 'paper_cream'));
  const per = (249.75 - 238.14) / 5;
  layer(ctx, 1, g => {
    scribble(g, t, s.a + 0.5, 'después de la noche…', 120, 110, 60, '#7a1f2a', -0.03, 1.4);
    doodle(g, 'swoosh', 330, 165, 4.2, clamp((t - s.a - 1.8) / 0.8), '#7a1f2a', 4);
    ORDER.forEach((w, k) => {
      const t0 = s.a + k * per, p = slap(t, t0 + 0.1); if (!p.a) return;
      const x = 250 + k * 355, y = 450 + (k % 2) * 50, bo = boil(t, k), key = PRIV[w];
      polaroid(g, null, x + bo[0], y + bo[1], 340 * p.s, { a: p.a, rot: (k % 2 ? 0.05 : -0.05) + p.r, caption: ['buenos días', 'see you ♪', 'sweet ♡', 'gracias', 'yay!'][k], capColor: MEM[w].deep,
        draw: (h, px, py, pw, ph) => { h.fillStyle = MEM[w].light; h.fillRect(px, py, pw, ph); h.filter = develop((t - t0) / 2); figure(h, key, { x: px + pw * 0.5, y: py + ph * 0.42, fh: ph * 0.36 }, { shadow: false, floor: py + ph + 4 }); h.filter = 'none'; } });
      tape(g, x, y - 210, 120, (k % 2 ? 0.2 : -0.2), undefined, p.a);
      sticker(g, IMG[{ yo: 'c_yo_swim', na: 'c_na_casual', shi: 'c_shi_swim', to: 'c_to_white', ri: 'c_ri_resort' }[w]], x + 125, y + 250, 180, { a: smooth(t0 + 0.6, t0 + 1.1, t), rot: 0.1 });
      label(g, MEM[w].jp, x - 145, y + 240, { size: 26, weight: 700, color: '#2a1a1a', alpha: smooth(t0 + 0.3, t0 + 0.8, t) });
      label(g, 'CV.' + MEM[w].cv, x - 145, y + 274, { fam: F.klee, size: 20, color: MEM[w].deep, alpha: smooth(t0 + 0.4, t0 + 0.9, t) });
    });
  });
  frameDeco(ctx, t, { fh: 110, fringe: false, lace: 'm_lace_220632_mask', lh: 100, laceColor: '#fbf4e8' });
}
function endCard(ctx, t, s) {
  textileBG(ctx, 'textile_222561', { z: 1.1, tint: '#1a0206', tintA: 0.5 });
  layer(ctx, 1, g => fanOpen(g, M('fan_170045'), 960, 760, 520, E.inOutCubic(inv(250.0, 251.4, t)), { a: 0.9 }));
  layer(ctx, 1, g => ORDER.forEach((w, k) => { const img = IMG['c_' + w + '_plain']; if (img) place(g, img, 560 + k * 200, 840, 250, { a: smooth(250.6 + k * 0.2, 251.3 + k * 0.2, t) }); }));
  drawText(ctx, t, '熱情エナモラル', { x: 960, y: 300, align: 'center', size: 96, fontStr: font(F.mincho, 96, 800), fill: IV, glow: 'rgba(255,170,90,0.35)', glowBlur: 20, track: 0.08, anim: 'blur', start: 250.2, stagger: 0.08, dur: 0.9 });
  drawText(ctx, t, 'Fin', { x: 960, y: 430, align: 'center', size: 110, fontStr: font(F.script, 110, 400), fill: GOLD, glow: 'rgba(255,170,90,0.5)', glowBlur: 22, anim: 'ink', start: 251.3, stagger: 0.15, dur: 0.6 });
  frameDeco(ctx, t, { fh: 130 });
  label(ctx, 'THE IDOLM@STER CINDERELLA MASTER  Passion jewelries! 004', 960, 990, { fam: F.cinzel, size: 15, weight: 600, color: IV, track: 0.3, align: 'center', alpha: smooth(252, 252.8, t) * 0.85 });
  label(ctx, 'fan-made lyric video  ·  decorative art: The Metropolitan Museum of Art (Open Access, CC0)  ·  photos: Open Images (CC BY 2.0) — see CREDITS', 960, 1030, { fam: F.corm, size: 18, italic: true, color: GOLD, align: 'center', alpha: smooth(253, 253.8, t) * 0.75 });
}

/* ------------------------------------------------------------ timeline */
// Cutting rule for v5: verses hold one shot per line (or longer), the chorus cuts on the downbeat of a
// phrase, call-and-response gets its own two-shot. Dissolves everywhere except where the music hits.
// Camera: PUSH = slow uniform push-in over the shot; STILL = locked off.
const PUSH = { z: [1.0, 1.035] }, PUSHL = { z: [1.0, 1.05] }, PULL = { z: [1.04, 1.0] }, STILL = {};
export let SHOTS = [];
export function build() {
  const S = [], add = (a, draw, cam = STILL, tr = 'cut', td = 0, x = {}) => S.push({ a, draw, cam, tr, td, ...x });
  // prologue
  add(0, overture, PUSH);
  add(1.62, introArches, PUSH, 'dissolve', 0.6);
  add(9.75, titleCollage, PUSH, 'flash', 0.5, { tro: { amount: 0.55 } });
  // verse 1 — night
  add(15.9, nightStars, PUSH, 'dissolve', 0.9);
  add(19.85, tomoeClose, PUSH, 'dissolve', 0.6);
  add(23.45, riamuNight, PUSHL, 'dissolve', 0.7);
  // B1 — collage
  add(30.3, vanity, PUSH, 'dissolve', 0.5);
  add(34.75, mantle, PUSH, 'dissolve', 0.5);
  // pre-chorus
  add(38.45, nagiMirror, PUSH, 'dissolve', 0.7);
  add(42.3, fivesFans, PUSHL, 'dissolve', 0.7);
  // chorus 1
  add(48.46, chorusOpen, PULL, 'cut', 0, { kick: 0.7 });
  add(52.0, sunPoster, PUSH, 'dissolve', 0.3);
  add(55.6, neonFans, PUSH, 'dissolve', 0.3);
  add(59.25, splitShot({ who: 'to', key: 'to_cos', kale: 'tile_187927' }, { who: 'na', key: 'na_cos', kale: 'textile_461355' }, ch(19, 5), { neon: ['iron_466304', 'dish_471762'] }));
  add(61.45, splitShot({ who: 'ri', key: 'ri_cos', kale: 'tile_187929' }, { who: 'yo', key: 'yo_cos', kale: 'tile_477238' }, ch(20, 5), { neon: ['dish_468516', 'iron_466304'] }));
  add(63.4, fireLove, PUSH, 'dissolve', 0.3);
  add(66.9, coverWide, PULL, 'dissolve', 0.6);
  // interlude
  add(69.75, guitarTable, STILL, 'dissolve', 0.8);
  // verse 2 — summer memories
  add(79.43, summerNagi, PUSH, 'dissolve', 0.8);
  add(87.5, summerYoshino, PUSH, 'dissolve', 0.6);
  // B2 / pre-chorus 2
  add(94.37, roseKiss, PUSH, 'dissolve', 0.8);
  add(98.3, shinAway, PUSH, 'dissolve', 0.6);
  add(102.62, riamuBells, PUSH, 'dissolve', 0.6);
  add(106.25, silence, PUSHL, 'dissolve', 0.8);
  // chorus 2 — midnight
  add(112.33, morningStar, PULL, 'cut', 0, { kick: 0.7 });
  add(115.4, moonPavilion, STILL, 'dissolve', 0.5);
  add(119.45, watches, PUSH, 'dissolve', 0.3);
  add(123.2, splitShot({ who: 'shi', key: 'shi_cos', kale: 'textile_230357' }, { who: 'to', key: 'to_cos', kale: 'tile_187927' }, ch(36, 5), { neon: ['dish_471762', 'iron_466304'] }));
  add(125.35, splitShot({ who: 'na', key: 'na_cos', kale: 'textile_461355' }, { who: 'ri', key: 'ri_cos', kale: 'tile_187929' }, ch(37, 5), { neon: ['iron_466304', 'dish_468516'] }));
  add(127.55, bubbles, STILL, 'dissolve', 0.4);
  add(130.55, guitarMacro, STILL, 'dissolve', 0.5);
  // dance break
  add(133.62, danceWall, PUSH, 'flash', 0.4, { tro: { amount: 0.5 } });
  const sizes = [['bust', 1.3], ['bust', 1.3], ['knee', 1.25], ['bust', 1.45], ['bust', 1.3]];
  ORDER.forEach((w, j) => add(barT(73 + 2 * j), rollCall(w, sizes[j][0], sizes[j][1]), PUSH, 'dissolve', 0.35));
  add(barT(83), jewels, PUSH, 'dissolve', 0.4);
  // bridge — dawn
  add(166.53, profiles, PUSH, 'cut', 0, { kick: 0.8 });
  add(174.35, dawnJewel, PUSH, 'dissolve', 0.8);
  add(178.5, cufflinkHands, PUSH, 'dissolve', 0.5);
  add(180.85, mist, PUSH, 'dissolve', 0.8);
  add(185.8, embrace, PUSH, 'dissolve', 0.7);
  // especial
  add(191.3, especial, PUSH, 'cut', 0, { kick: 0.4 });
  // final chorus — morning
  add(209.11, amanecer, PULL, 'cut', 0, { kick: 0.6 });
  add(212.35, dawnArches, PUSH, 'dissolve', 0.4);
  add(216.25, bloom, PUSH, 'dissolve', 0.3);
  add(220.0, splitShot({ who: 'to', key: 'to_cos', kale: 'tile_187927' }, { who: 'ri', key: 'ri_cos', kale: 'tile_187929' }, ch(58, 5), { grade: '#ffb080', gradeA: 0.15, gradeOp: 'soft-light' }));
  add(224.1, nagiCard({ z: 1.85, fx: CF.cardNa.na[0] + 0.02, fy: CF.cardNa.na[1] - 0.06 }), PUSH, 'dissolve', 0.4);
  add(228.1, duoGroups, STILL, 'dissolve', 0.3);
  add(231.95, candleOut, PUSH, 'dissolve', 0.6);
  add(235.32, finalPale, PULL, 'cut', 0);
  // outro
  add(238.14, credits, STILL, 'dissolve', 0.8);
  add(249.75, endCard, STILL, 'dissolve', 0.9);
  S.forEach((s, i) => (s.b = S[i + 1] ? S[i + 1].a : 999));
  SHOTS = S; return S;
}
