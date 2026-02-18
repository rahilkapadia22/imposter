const http = require('http');
const fs = require('fs');
const path = require('path');

const apiHandler = require('./api/generate-game-data');

const PORT = process.env.PORT || 3000;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/generate-game-data') {
      const body = await readJsonBody(req);
      const wrappedReq = { method: req.method, body };
      const wrappedRes = {
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          const code = this.statusCode || 200;
          res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(payload));
        },
      };
      await apiHandler(wrappedReq, wrappedRes);
      return;
    }

    if (url.pathname === '/') {
      serveFile(res, path.join(__dirname, 'index.html'));
      return;
    }

    const safePath = path.normalize(url.pathname).replace(/^\/+/, '');
    const filePath = path.join(__dirname, safePath);

    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    serveFile(res, filePath);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Server error', detail: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Local server running on http://localhost:${PORT}`);
});
