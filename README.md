# EasyLaTeX

Paste a table copied from Google Sheets (or any HTML table) and get clean LaTeX — no LLM, all local.

- Preserves merged cells (`\multirow` / `\multicolumn`), alignment, bold/italic/underline.
- Table styles: **Grid** (full borders), **Booktabs** (three-line, with auto header detection and `\cmidrule` under grouped column headers), and **Plain**.
- Optional `table*` (two-column span), `\caption`, and `\label`.
- **Live rendered preview** — compiles the generated LaTeX with a local `pdflatex` and shows the actual table.

## Develop

```bash
npm install
npm run dev
```

`npm run dev` also serves the render endpoint (`POST /api/render`) via a Vite middleware plugin, so the live preview works with no separate process.

## Rendered preview (optional)

The **Rendered Preview → Live render** toggle compiles the LaTeX server-side (`latex` → DVI → `dvisvgm` → SVG) and displays the result as a scalable vector figure. It needs a local TeX install with three extra tools:

```bash
# TeX Live / MacTeX usually already have these. On BasicTeX:
sudo tlmgr install multirow preview dvisvgm
```

- `multirow` — used by every generated table with row spans.
- `preview` — crops the output tightly to the table (via `tightpage`).
- `dvisvgm` — converts the DVI to a vector SVG.

No Ghostscript/poppler needed, and no client-side PDF library — the SVG is rendered natively by the browser.

When no render backend is configured, the Live-render toggle is hidden and the app degrades to a pure client-side converter (the LaTeX output still works everywhere).

## Deploy

The converter is a **static** site — `npm run build` outputs `dist/` with no server. The `/api/render` endpoint only exists in dev (Vite middleware); it is **not** in the build.

### Static hosting (Vercel / Netlify / GitHub Pages)

Point the host at this repo — build `npm run build`, output directory `dist`. On Vercel the Vite preset detects both automatically; no config needed. The Live-render preview is hidden (no backend), everything else works.

### Enabling Live render in production

Live render needs a backend with a full TeX install running `POST /api/render` — this cannot run on Vercel serverless functions (TeX Live is too large); use a container host (Google Cloud Run, Fly.io, Render, Railway, or a VPS) built from `server/`. Then set an env var at build time so the client calls it:

```bash
# .env (see .env.example)
VITE_RENDER_API=https://your-render-backend.example.com/api/render
```

If the backend is on a different origin, enable CORS on it (or put it behind the same domain via a rewrite).

### Production (single host)

The static frontend (`npm run build`) plus a small Node render server:

```bash
npm run build        # -> dist/
npm run server       # -> render server on :3001 (POST /api/render)
```

Serve `dist/` behind a web server and reverse-proxy `/api` to the render server so requests are same-origin.

> **Security:** `/api/render` runs `pdflatex` on caller-supplied input. It is hardened (shell-escape off, restricted file I/O, timeout, temp dir, size cap), which is fine for local/trusted use. If you expose it publicly, additionally run it inside a container or sandbox.

## Test

```bash
npm test
```
