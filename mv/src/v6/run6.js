// v6 shot runner. A shot = { a, b, plate(g, t, s), over(g, t, s, cam), cam: keys | fn, hh, pulse, tr: {type, o} }.
//  - plate is drawn in world space under the shot camera (+ beat pulse + hand-held drift)
//  - fast camera moves get a matching motion blur (pan -> directional, zoom -> radial), so nothing judders
//  - over (lyrics, screen-space graphics) is drawn on top of the blurred plate, inside the shot's own frame,
//    so the transitions carry the words away with the picture
//  - transitions straddle the cut: [a - pre, a + post]
import { W, H, clamp } from '../util.js';
import { keyed, handheld, applyCam, energy, pulse, frame, radialBlur, dirBlur, TR, trMod, trComposite, C0 } from './core6.js';
import { clearFaces } from './type6.js';

const SHUTTER = 1 / 40;
export function camOf(s, t) {
  let c = typeof s.cam === 'function' ? s.cam(t, s) : s.cam ? keyed(t, s.cam) : { ...C0 };
  c = handheld(c, t, s.hh ?? 0.7, s.seed ?? s.a);
  const en = energy(t), pa = (s.pulse ?? 1) * en * en;
  c.z *= 1 + 0.014 * pa * pulse(t, 1, 10) + 0.018 * pa * pulse(t, 4, 6);
  return c;
}
function drawPlate(s, t, g, c) {
  clearFaces();
  g.save(); applyCam(g, c); s.plate(g, t, s, c); g.restore();
}
// render one shot (with optional transition modifier) into a named frame buffer and return the canvas
export function renderShot(s, t, name, mod) {
  let c = camOf(s, t);
  const apply = cc => { if (!mod) return cc; const o = { ...cc }; if (mod.z) o.z *= mod.z; if (mod.dx) o.x += mod.dx / o.z; if (mod.dy) o.y += mod.dy / o.z; return o; };
  c = apply(c);
  const [A, ga] = frame(name + 'A');
  drawPlate(s, t, ga, c);
  // motion blur from the camera velocity over the shutter interval
  const c0 = apply(camOf(s, t - SHUTTER));
  const dx = (c0.x - c.x) * c.z, dy = (c0.y - c.y) * c.z, zr = c.z / c0.z;
  const [B, gb] = frame(name + 'B');
  const pan = Math.hypot(dx, dy), zm = Math.abs(zr - 1);
  if (pan > 3 && s.mblur !== false) dirBlur(gb, A, -dx, -dy, Math.min(14, 4 + Math.round(pan / 30)));
  else gb.drawImage(A, 0, 0);
  if (zm > 0.004 && s.mblur !== false) { const [Z, gz] = frame(name + 'Z'); gz.drawImage(B, 0, 0); gb.fillRect(0, 0, 0, 0); radialBlur(gb, Z, Math.min(0.25, zm * 1.4)); }
  if (s.over) { gb.save(); s.over(gb, t, s, c); gb.restore(); }
  return B;
}

export function runShots(out, t, shots) {
  let i = 0; for (let k = 0; k < shots.length; k++) if (t >= shots[k].a) i = k;
  const cur = shots[i], nxt = shots[i + 1], prv = shots[i - 1];
  let P = null, C = null, tr = null, p = 0;
  const win = s => { const d = TR[(s.tr && s.tr.type) || 'cut']; return [s.a - d.pre, s.a + d.post, d]; };
  if (nxt && nxt.tr) { const [w0, w1] = win(nxt); if (t >= w0) { P = cur; C = nxt; tr = nxt.tr; p = (t - w0) / Math.max(0.001, w1 - w0); } }
  if (!tr && prv && cur.tr) { const [w0, w1] = win(cur); if (t < w1) { P = prv; C = cur; tr = cur.tr; p = (t - w0) / Math.max(0.001, w1 - w0); } }
  out.save(); out.setTransform(1, 0, 0, 1, 0, 0);
  if (!tr || tr.type === 'cut') { out.drawImage(renderShot(cur, t, 'cur'), 0, 0); out.restore(); return cur; }
  const d = TR[tr.type], cutU = d.pre / Math.max(0.001, d.pre + d.post), before = p < cutU;
  const uP = cutU > 0 ? clamp(p / cutU) : 1, uC = cutU < 1 ? clamp((p - cutU) / (1 - cutU)) : 1;
  const overlap = ['bloom', 'fan', 'ruffle', 'iris', 'panels', 'silk'].includes(tr.type);
  const Pc = (overlap || before) ? renderShot(P, t, 'P', trMod(tr, 'P', uP)) : null;
  const Cc = (overlap || !before) ? renderShot(C, t, 'C', trMod(tr, 'C', uC)) : null;
  trComposite(tr, out, Pc, Cc, clamp(p), t);
  out.restore();
  return before ? P : C;
}
