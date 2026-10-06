// v6 dawn light: one sunrise that runs through the whole bridge (166.5–191.3).
// The sky is far away, so it is drawn in its own "sky space" that follows the shot camera with parallax
// (a dolly towards a figure grows the figure, not the sun). On top of it: the sun breaking the horizon,
// crepuscular rays, a star burst when it clears, glitter on the sea, haze, floating dust, a lens flare,
// and a light front that sweeps across a figure to relight it.
import { W, H, TAU, clamp, lerp, inv, smooth, E, hash, noise1 } from '../util.js';
import { buf, glow, softDot, rgba } from '../gfx.js';

const HZ = 700; // horizon line in sky space
// how warm the morning is (0 = blue hour, 1 = golden morning)
export const warmth = t => E.outCubic(inv(166.3, 186, t));
// height of the sun's centre above the horizon (sky px)
const ELEV = [[166.0, -90], [167.2, -30], [168.31, 34], [170.2, 80], [174.35, 150], [181, 280], [191.3, 420]];
export function sunElev(t) {
  if (t <= ELEV[0][0]) return ELEV[0][1];
  for (let i = 0; i < ELEV.length - 1; i++) { const [ta, a] = ELEV[i], [tb, b] = ELEV[i + 1]; if (t < tb) return lerp(a, b, E.inOutSine((t - ta) / (tb - ta))); }
  return ELEV[ELEV.length - 1][1];
}
// 0 below the horizon -> 1 once clear of the haze
export const sunVis = t => smooth(-70, 30, sunElev(t));

// three-key colour ramp over warmth p (hex out). rampQ steps p so the glow sprites (cached per colour) stay few.
const hx = v => Math.round(v).toString(16).padStart(2, '0');
function mixH(a, b, u) { const q = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), x = q(a), y = q(b); return '#' + x.map((v, i) => hx(lerp(v, y[i], u))).join(''); }
function ramp(p, a, b, c) { return p < 0.35 ? mixH(a, b, p / 0.35) : mixH(b, c, (p - 0.35) / 0.65); }
const rampQ = (p, a, b, c) => ramp(Math.round(p * 32) / 32, a, b, c);

// the transform of sky space under shot camera c (parallax k: 0 = fixed to the screen, 1 = moves like the plate)
export function skyCam(c, k = 0.3) {
  const z = 1 + (c.z - 1) * k;
  return new DOMMatrix().translate(W / 2, H / 2).rotate((c.r || 0) * 0.5 * 180 / Math.PI).scale(z, z).translate(-W / 2 - (c.x - W / 2) * k, -H / 2 - (c.y - H / 2) * k);
}
export const skyToScreen = (M, x, y) => [M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f];

// sky, sun, rays, sea and haze, drawn in sky space. o: sx (sun x), hz (horizon y), elev (override), sea (bool)
export function dawnSky(g, t, c, o = {}) {
  const p = o.p ?? warmth(t), M = skyCam(c, o.k ?? 0.3), hz = o.hz ?? HZ, sx = o.sx ?? 560;
  const el = o.elev ?? sunElev(t), sy = hz - el, vis = smooth(-70, 30, el);
  g.save(); g.setTransform(M);
  const R = [-1400, -900, W + 2800, H + 1800];
  const gr = g.createLinearGradient(0, hz - 1100, 0, hz);
  gr.addColorStop(0, ramp(p, '#101030', '#26306c', '#5a78c0')); gr.addColorStop(0.45, ramp(p, '#302c66', '#6a5296', '#b8a0cc'));
  gr.addColorStop(0.8, ramp(p, '#8a4a78', '#e07a7a', '#ffcaa6')); gr.addColorStop(1, ramp(p, '#e8805a', '#ffb880', '#ffeccc'));
  g.fillStyle = gr; g.fillRect(R[0], R[1], R[2], hz - R[1]);
  // the glow over the horizon (always there, even before the sun)
  g.save(); g.translate(sx, hz); g.scale(1, 0.16); glow(g, 0, 0, 1700, rampQ(p, '#ff8a5a', '#ffb070', '#fff0c8'), 0.75); g.restore();
  // crepuscular rays
  if (vis > 0.01) godRays(g, sx, sy, 2600, t * 0.012, 20, rampQ(p, '#ffc890', '#ffd8a8', '#fff2d8'), 0.2 * vis);
  // the sun: halo, glow, a disc squashed by the low air, clipped by the horizon
  glow(g, sx, sy, 1150, '#ffb070', 0.5 * vis + 0.12); glow(g, sx, sy, 420, '#ffe6c0', 0.8 * vis); glow(g, sx, sy, 170, '#ffffff', 0.85 * vis);
  g.save(); g.beginPath(); g.rect(R[0], R[1], R[2], hz - R[1]); g.clip();
  const flat = lerp(0.84, 1, smooth(20, 140, el)); g.translate(sx, sy); g.scale(1, flat);
  g.fillStyle = el < 80 ? mixH('#ffd49a', '#fffaf0', clamp(el / 80)) : '#fffaf0'; g.beginPath(); g.arc(0, 0, 72, 0, TAU); g.fill(); g.restore();
  // star burst as the sun clears the horizon (and a quieter one after)
  const kick = o.burst != null ? Math.exp(-Math.max(0, t - o.burst) * 1.6) * (t >= o.burst ? 1 : 0) : 0;
  starBurst(g, sx, sy, t, vis * (0.3 + 0.5 * kick), 1 + kick * 0.45);
  if (o.sea !== false) {
    // the sea: dark under the horizon, a road of glitter under the sun
    const sg = g.createLinearGradient(0, hz, 0, hz + 700); sg.addColorStop(0, ramp(p, '#5a3a5a', '#a0607a', '#e8b8a8')); sg.addColorStop(0.25, ramp(p, '#2a1e40', '#4a3058', '#9a7a8a')); sg.addColorStop(1, ramp(p, '#0c0818', '#1e1630', '#4a3a50'));
    g.fillStyle = sg; g.fillRect(R[0], hz, R[2], R[3]);
    g.save(); g.translate(sx, hz); g.scale(1, 0.35); glow(g, 0, 380, 900, '#ffc890', 0.35 * vis + 0.08); g.restore();
    glitter(g, t, sx, hz, 0.25 + 0.75 * vis);
    // haze line
    g.save(); g.translate(sx, hz); g.scale(1, 0.05); glow(g, 0, 0, 1800, '#fff0d8', 0.6); g.restore();
  }
  g.restore();
  return { M, sun: skyToScreen(M, sx, sy), sunW: [sx, sy], vis, el };
}
// soft shafts of light fanning out from a source (hex colour)
export function godRays(g, cx, cy, R, rot, n, color, a) {
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha *= a;
  for (let k = 0; k < n; k++) {
    const an = rot + (k / n) * TAU + (hash(k, 31) - 0.5) * 0.25, w = 0.012 + 0.035 * hash(k, 32), fl = 0.6 + 0.4 * noise1(rot * 40 + k * 3.1, 33);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, rgba(color, 0.55 * fl)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, an - w, an + w); g.closePath(); g.fill();
  }
  g.restore();
}
// long thin spikes around a bright point (a camera's aperture star)
export function starBurst(g, x, y, t, a, s = 1) {
  if (a <= 0.01) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.rotate(0.21 + t * 0.01);
  for (let k = 0; k < 12; k++) {
    const L = (k % 2 ? 260 : 620) * s * (0.75 + 0.25 * hash(k, 41)), an = (k / 12) * TAU + (hash(k, 42) - 0.5) * 0.06, wd = (k % 2 ? 1.1 : 1.8) * Math.sqrt(s);
    g.save(); g.rotate(an); const gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, `rgba(255,248,232,${0.8 * a})`); gr.addColorStop(0.35, `rgba(255,236,210,${0.35 * a})`); gr.addColorStop(1, 'rgba(255,220,180,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -wd); g.lineTo(L, 0); g.lineTo(0, wd); g.closePath(); g.fill(); g.restore();
  }
  g.restore();
}
// dancing points of light on the water under the sun (perspective: rows get wider towards the viewer)
function glitter(g, t, sx, hz, a) {
  g.save(); g.globalCompositeOperation = 'lighter'; const dot = softDot('#fff2d8', 32);
  for (let i = 0; i < 150; i++) {
    const r = Math.pow(hash(i, 51), 1.6), y = hz + 4 + r * 420, spread = 30 + r * 520;
    const x = sx + (hash(i, 52) - 0.5) * 2 * spread * (0.4 + 0.6 * hash(i, 53)) + noise1(t * 0.6 + i, 54) * 12;
    const on = clamp((noise1(t * (2.5 + hash(i, 55) * 3) + i * 7.1, 56) - 0.15) * 2.2);
    if (on <= 0) continue;
    const len = (6 + r * 46) * (0.6 + 0.4 * hash(i, 57));
    const th = 3 + r * 7; g.globalAlpha = 0.8 * a * on * (1 - 0.6 * Math.abs(x - sx) / (spread + 1)); g.drawImage(dot, x - len / 2, y - th / 2, len, th);
  }
  g.restore();
}
// floating dust lit by the sun, in the current transform
export function dust(g, t, n, seed, rect, a = 1, color = '#fff2d8') {
  if (a <= 0.01) return;
  const [x0, y0, w, h] = rect, d = softDot(color, 32);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = x0 + hash(i, seed) * w + noise1(t * 0.12 + i * 0.7, seed + 1) * 140 + t * 6, y = y0 + hash(i, seed + 2) * h + noise1(t * 0.1 + i * 0.9, seed + 3) * 110 - t * 4;
    const xx = ((x - x0) % w + w) % w + x0, yy = ((y - y0) % h + h) % h + y0, s = 2 + hash(i, seed + 4) * 5;
    g.globalAlpha = a * (0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * (1.5 + hash(i, seed + 5) * 2.5) + i), 2));
    g.drawImage(d, xx - s, yy - s, s * 2, s * 2);
  }
  g.restore();
}
// lens flare for a light at screen (sx, sy): an anamorphic streak through it and ghosts along the line through the centre.
// Draw with an identity transform (screen space).
export function lensFlare(g, sx, sy, a, o = {}) {
  if (a <= 0.01) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'screen';
  // anamorphic streak
  const L = (o.streak ?? 1100), sa = o.streakA ?? 1, sg = g.createLinearGradient(sx - L, 0, sx + L, 0);
  sg.addColorStop(0, 'rgba(255,190,140,0)'); sg.addColorStop(0.5, `rgba(255,236,210,${0.5 * a * sa})`); sg.addColorStop(1, 'rgba(255,190,140,0)');
  if (sa > 0) { g.fillStyle = sg; g.fillRect(sx - L, sy - 1.5, L * 2, 3); g.globalAlpha = 0.3; g.fillRect(sx - L, sy - 18, L * 2, 36); g.globalAlpha = 1; }
  // ghosts
  const cx = W / 2, cy = H / 2, G = [[0.45, 24, '#ffd0a0', 0.26], [0.8, 58, '#9ad0ff', 0.13], [1.2, 104, '#ffb0c8', 0.09], [1.55, 40, '#d8ffd0', 0.18], [2.0, 150, '#ffd2a0', 0.07]];
  for (const [f, r, col, al] of G) {
    const x = sx + (cx - sx) * f, y = sy + (cy - sy) * f;
    g.globalAlpha = 0.8 * al * a * (o.ghosts ?? 1); g.drawImage(softDot(col, 128), x - r, y - r, r * 2, r * 2);
    if (r > 90) { g.strokeStyle = rgba(col, 0.5); g.lineWidth = 2; g.beginPath(); g.arc(x, y, r * 0.8, 0, TAU); g.stroke(); }
  }
  // veiling glare around the source
  g.globalAlpha = 0.28 * a * (o.veil ?? 1); g.drawImage(softDot('#ffe8c8', 256), sx - 700, sy - 700, 1400, 1400);
  g.restore();
}
// draw a lit version of something over its unlit version, but only where a soft light front (world x0) has passed.
// dir 1: the light comes from the left (lit where x < x0).
export function relit(g, drawLit, x0, soft = 320, dir = 1) {
  const [c, b] = buf('relit6', W, H); b.setTransform(g.getTransform()); drawLit(b);
  b.globalCompositeOperation = 'destination-in';
  const gr = b.createLinearGradient(x0 - soft, 0, x0 + soft, 0); gr.addColorStop(0, `rgba(0,0,0,${dir > 0 ? 1 : 0})`); gr.addColorStop(1, `rgba(0,0,0,${dir > 0 ? 0 : 1})`);
  b.fillStyle = gr; b.fillRect(-6000, -4000, 16000, 10000);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, 0, 0); g.restore();
}
// the bright edge of that light front as it crosses (world space)
export function lightFront(g, x0, a, color = '#fff0d0') {
  if (a <= 0.01) return;
  g.save(); g.globalCompositeOperation = 'screen'; const gr = g.createLinearGradient(x0 - 260, 0, x0 + 260, 0);
  gr.addColorStop(0, rgba(color, 0)); gr.addColorStop(0.5, rgba(color, 0.55 * a)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(x0 - 260, -3000, 520, 8000); g.restore();
}
