// scan a time range for lyric/face overlaps: node facescan.cjs from to step
const { chromium } = require('playwright'); const path = require('path');
const serve = require('/home/user/netsujo-pv-2/render/server.cjs');
(async () => {
  const [a, b, st] = process.argv.slice(2).map(Number);
  const srv = await serve('/home/user/netsujo-pv-2/mv'); const port = srv.address().port;
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1920, height: 1080 } });
  const hits = new Set(); pg.on('console', m => { const s = m.text(); if (s.startsWith('[face]')) hits.add(s.replace(/@.*/, '') + ' @' + s.split('@')[1]); });
  pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto(`http://127.0.0.1:${port}/index.html`); await pg.evaluate(() => window.MV.ready);
  for (let t = a; t < b; t += st) await pg.evaluate(t => window.MV.render(t), t);
  console.log([...hits].join('\n') || 'no face overlaps'); await br.close(); srv.close();
})();
