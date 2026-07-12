// Standalone render server for production (dev is handled by the Vite plugin).
// Serves POST /api/render. Point the built frontend at this origin, or reverse-
// proxy /api to it so requests are same-origin.
import { createServer } from 'node:http';
import { handleRenderRequest } from './renderHandler.mjs';

const port = Number(process.env.PORT) || 3001;

createServer((req, res) => {
  const url = (req.url || '').split('?')[0];
  if (url === '/api/render') {
    handleRenderRequest(req, res);
    return;
  }
  res.statusCode = 404;
  res.end('Not found');
}).listen(port, () => {
  console.log(`EasyLaTeX render server listening on http://localhost:${port}`);
});
