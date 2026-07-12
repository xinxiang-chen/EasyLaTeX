import type { Plugin, Connect } from 'vite';
// @ts-expect-error — .mjs handler has no type declarations
import { handleRenderRequest } from './server/renderHandler.mjs';

// Mounts POST /api/render into the Vite dev and preview servers so `npm run dev`
// serves the LaTeX render endpoint same-origin, with no separate process.
export function latexRenderPlugin(): Plugin {
  const mount = (middlewares: Connect.Server) => {
    middlewares.use('/api/render', (req, res) => {
      handleRenderRequest(req, res);
    });
  };
  return {
    name: 'easylatex-render',
    configureServer(server) {
      mount(server.middlewares);
    },
    configurePreviewServer(server) {
      mount(server.middlewares);
    },
  };
}
