// Minimal static server for the mv/ directory (ES modules need http, not file://).
const http = require('http'), fs = require('fs'), path = require('path');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.css': 'text/css' };
module.exports = function serve(root, port = 0) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      fs.readFile(p.endsWith('/') ? p + 'index.html' : p, (err, data) => {
        if (err) { rsp.writeHead(404); rsp.end('404'); return; }
        rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        rsp.end(data);
      });
    });
    srv.listen(port, '127.0.0.1', () => res(srv));
  });
};
