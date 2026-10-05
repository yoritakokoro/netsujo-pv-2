// Render still frames for review: node render/stills.cjs out_dir t1 t2 ...
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const serve = require('./server.cjs');
(async () => {
  const [out, ...ts] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const srv = await serve(path.join(__dirname, '..', 'mv'));
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  const t0 = Date.now();
  await page.evaluate(() => window.MV.ready);
  console.log('ready in', Date.now() - t0, 'ms');
  for (const t of ts) {
    const s = Date.now();
    const data = await page.evaluate(t => window.MV.grab(t, 0.9), parseFloat(t));
    fs.writeFileSync(path.join(out, `f_${String(t).padStart(7, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
    console.log('t=' + t, Date.now() - s, 'ms');
  }
  await browser.close(); srv.close();
})();
