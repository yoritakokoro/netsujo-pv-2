// list the images and fonts the current MV actually draws: node render/assets_used.cjs [step]
const { chromium } = require('playwright'); const path = require('path');
const serve = require('./server.cjs');
(async () => {
  const step = +(process.argv[2] || 0.2);
  const srv = await serve(path.join(__dirname, '..', 'mv')); const port = srv.address().port;
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1920, height: 1080 } });
  pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto(`http://127.0.0.1:${port}/index.html`); await pg.evaluate(() => window.MV.ready);
  await pg.evaluate(async () => {
    const g = await import('./src/gfx.js'); window.__used = {};
    Object.keys(g.IMG).forEach(k => { const v = g.IMG[k]; Object.defineProperty(g.IMG, k, { get() { window.__used[k] = (window.__used[k] || 0) + 1; return v; } }); });
    window.__fonts = {}; const proto = CanvasRenderingContext2D.prototype, d = Object.getOwnPropertyDescriptor(proto, 'font');
    Object.defineProperty(proto, 'font', { get() { return d.get.call(this); }, set(v) { window.__fonts[v.replace(/^.*?\d+(\.\d+)?px\s*/, '')] = 1; d.set.call(this, v); } });
  });
  for (let t = 0; t < 264.5; t += step) await pg.evaluate(t => window.MV.render(t), t);
  const r = await pg.evaluate(() => ({ used: window.__used, fonts: Object.keys(window.__fonts) }));
  console.log(JSON.stringify(r)); await br.close(); srv.close();
})();
