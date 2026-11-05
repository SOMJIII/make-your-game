const http = require('http');
const fs   = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8080;
const ROOT = __dirname;

const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg',
  '.ogg':'audio/ogg','.wav':'audio/wav','.ico':'image/x-icon',
  '.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // ALL routes serve index.html — routing handled in JS
  if (urlPath === '/' || urlPath === '' || !urlPath.includes('.')) {
    urlPath = '/index.html';
  }

  const filePath = path.join(ROOT, urlPath);

  // Security: don't serve files outside ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback to index.html for any missing file that looks like a route
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(ROOT, 'index.html'), (e2, d2) => {
          if (e2) { res.writeHead(404); res.end('404'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(d2);
        });
        return;
      }
      res.writeHead(500); res.end('Server error'); return;
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Accept-Ranges': 'bytes' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║   FIVE NIGHTS AT FREDDY\'S            ║');
  console.log('  ╚══════════════════════════════════════╝\n');
  console.log(`  → http://localhost:${PORT}\n`);
  console.log('  Press Ctrl+C to stop.\n');
  exec(`start http://localhost:${PORT}`);
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE')
    console.error(`Port ${PORT} in use. Close it and retry.`);
  else console.error(err.message);
  process.exit(1);
});
