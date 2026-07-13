// Standalone render server for production (dev is handled by the Vite plugin).
// Serves POST /api/render and GET /health.
// Set ALLOW_ORIGIN to your Vercel frontend URL (e.g. https://easylatex.vercel.app)
// to restrict CORS. Defaults to * for convenience during initial setup.
import { createServer } from 'node:http';
import { handleRenderRequest } from './renderHandler.mjs';

const port = Number(process.env.PORT) || 3001;
const allowOrigin = process.env.ALLOW_ORIGIN || '*';

function setCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

createServer((req, res) => {
  const url = (req.url || '').split('?')[0];

  // CORS preflight
  if (req.method === 'OPTIONS') {
    setCors(req, res);
    res.statusCode = 204;
    res.end();
    return;
  }

  // Health check — used by Cloud Run readiness probes
  if (url === '/health' && req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (url === '/api/render') {
    setCors(req, res);
    handleRenderRequest(req, res);
    return;
  }

  res.statusCode = 404;
  res.end('Not found');
}).listen(port, () => {
  console.log(`EasyLaTeX render server listening on http://localhost:${port}`);
  console.log(`CORS allow-origin: ${allowOrigin}`);
});
