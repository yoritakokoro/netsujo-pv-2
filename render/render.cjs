// Full render: N parallel headless Chromium pages -> JPEG frames -> ffmpeg (x264) chunks -> concat + audio.
// usage: node render/render.cjs out.mp4 [--fps 30] [--workers 4] [--from 0] [--to 266] [--crf 19]
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const serve = require('./server.cjs');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const out = path.resolve(args[0] || 'out/netsujo_enamoral_mv.mp4');
const fps = +opt('fps', 30), workers = +opt('workers', 4), from = +opt('from', 0), to = +opt('to', 266), crf = opt('crf', '19');
const root = path.join(__dirname, '..', 'mv');
const tmp = path.join(path.dirname(out), '.chunks');
fs.mkdirSync(tmp, { recursive: true });

async function worker(browser, port, k, f0, f1) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.log(`[w${k}] pageerror`, e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.evaluate(() => window.MV.ready);
  const file = path.join(tmp, `chunk_${String(k).padStart(2, '0')}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-tune', 'film', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-maxrate', '12M', '-bufsize', '24M', '-g', String(fps * 2), '-threads', '1', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const data = await page.evaluate(t => window.MV.grab(t, 0.94), f / fps);
    const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 150 === 0) console.log(`[w${k}] frame ${f - f0}/${f1 - f0}  ${((Date.now() - t0) / Math.max(1, f - f0)).toFixed(0)} ms/f`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await page.close();
  return file;
}

(async () => {
  const srv = await serve(root);
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const F0 = Math.round(from * fps), F1 = Math.round(to * fps), n = F1 - F0;
  const per = Math.ceil(n / workers);
  const t0 = Date.now();
  const files = await Promise.all(Array.from({ length: workers }, (_, k) => worker(browser, port, k, F0 + k * per, Math.min(F1, F0 + (k + 1) * per))));
  await browser.close(); srv.close();
  console.log('frames done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, files.map(f => `file '${f}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
    '-ss', String(from), '-t', String(to - from), '-i', path.join(root, 'assets/audio/song.mp3'),
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', out], { stdio: 'inherit' });
  console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(1), 'MB');
})();
