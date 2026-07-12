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

### Production

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
