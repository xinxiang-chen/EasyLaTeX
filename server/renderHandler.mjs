// Server-side LaTeX → SVG rendering for the live table preview.
//
// Pipeline: latex (DVI) → dvisvgm (vector SVG). Using the DVI route (not pdflatex)
// lets dvisvgm emit a true vector, infinitely-scalable figure cropped tightly to
// the table via the `preview` package's bounding box.
//
// Treat the input as HOSTILE: TeX can read/write files and (with shell-escape) run
// commands. Hardening: shell-escape disabled, file I/O restricted to the temp dir
// (openin_any/openout_any=p), HOME redirected, a hard timeout with SIGKILL, an
// input size cap, and a throwaway temp dir removed after every request. If you
// expose this beyond localhost, run it inside a container/jail as well.

import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';

const MAX_LATEX_BYTES = 100_000;
const TIMEOUT_MS = 12_000;

// The `preview` package with `tightpage` crops the output to a tight bounding box,
// so the SVG is exactly the table (caption included) with a small border. The
// `floats` option makes preview auto-capture float environments (table/table*);
// we must NOT also declare \PreviewEnvironment{table} or it double-processes the
// float and errors with "Not in outer par mode".
const PREAMBLE = String.raw`\documentclass{article}
\usepackage{booktabs,multirow,array,caption}
\usepackage[dvisvgm]{xcolor}
\usepackage[active,tightpage,floats]{preview}
\setlength\PreviewBorder{6pt}
\begin{document}
`;
const POSTAMBLE = '\n\\end{document}\n';

export class RenderError extends Error {
  constructor(status, message, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

// Pull the most useful line(s) out of a latex log so the client can show something
// actionable. Handles both the default `! LaTeX Error: ...` format and the
// `-file-line-error` format (`./main.tex:9: LaTeX Error: ...`).
function extractLatexError(log) {
  const lines = log.split('\n');
  const idx = lines.findIndex(l => l.startsWith('!') || /:\d+:\s/.test(l));
  if (idx === -1) return undefined;
  const slice = lines.slice(idx, idx + 6).filter(Boolean);
  return slice.join('\n').slice(0, 800);
}

// Run a command in the temp dir with the TeX hardening env + timeout. Rejects with
// a RenderError. `onFail` maps a non-timeout/non-missing failure to a RenderError.
function run(cmd, args, dir, onFail) {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      {
        cwd: dir,
        timeout: TIMEOUT_MS,
        killSignal: 'SIGKILL',
        maxBuffer: 16 * 1024 * 1024,
        env: {
          ...process.env,
          openin_any: 'p',
          openout_any: 'p',
          HOME: dir,
          TEXMFHOME: join(dir, 'texmf'),
          TEXMFVAR: join(dir, 'texmf-var'),
          SOURCE_DATE_EPOCH: '0',
        },
      },
      (err, stdout, stderr) => {
        if (err) {
          if (err.killed) return reject(new RenderError(504, `${cmd} timed out`));
          if (err.code === 'ENOENT') {
            return reject(new RenderError(503, `${cmd} not found on the server`));
          }
          return reject(onFail(stdout || '', stderr || '', err));
        }
        resolve(stdout);
      }
    );
  });
}

// Compile a LaTeX fragment (the generated `\begin{table}…` code) to a tightly
// cropped vector SVG. Returns the SVG markup as a string. Throws RenderError.
export async function renderLatexToSvg(latex) {
  if (typeof latex !== 'string' || latex.trim() === '') {
    throw new RenderError(400, 'Request body must be JSON: { "latex": "<string>" }');
  }
  if (Buffer.byteLength(latex, 'utf8') > MAX_LATEX_BYTES) {
    throw new RenderError(413, 'LaTeX source is too large to render');
  }

  const dir = await mkdtemp(join(tmpdir(), 'easylatex-'));
  try {
    await writeFile(join(dir, 'main.tex'), PREAMBLE + latex + POSTAMBLE, 'utf8');

    // 1. latex → DVI
    await run(
      'latex',
      ['-no-shell-escape', '-interaction=nonstopmode', '-halt-on-error', '-file-line-error', 'main.tex'],
      dir,
      stdout => new RenderError(422, 'LaTeX compilation failed', extractLatexError(stdout))
    );

    // 2. dvisvgm → SVG. --bbox=preview honours the preview tightpage box; --no-fonts
    //    traces glyphs as vector paths so the SVG is self-contained (renders
    //    identically anywhere, safe inside an <img>).
    await run(
      'dvisvgm',
      ['--no-fonts', '--bbox=preview', '--relative', '--optimize', 'main.dvi', '-o', 'main.svg'],
      dir,
      (stdout, stderr) => new RenderError(422, 'SVG conversion failed', (stderr || stdout).slice(0, 800))
    );

    return await readFile(join(dir, 'main.svg'), 'utf8');
  } catch (e) {
    if (e instanceof RenderError) throw e;
    throw new RenderError(500, 'Unexpected render error', String(e?.message ?? e));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(new RenderError(413, 'Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Node http/connect-style handler. Works as a Vite dev middleware and in the
// standalone server. Responds with image/svg+xml on success or JSON on error.
export async function handleRenderRequest(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }
  try {
    const raw = await readBody(req, MAX_LATEX_BYTES + 4096);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new RenderError(400, 'Invalid JSON body');
    }
    const svg = await renderLatexToSvg(parsed?.latex);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store');
    res.end(svg);
  } catch (e) {
    const status = e instanceof RenderError ? e.status : 500;
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: e.message, detail: e.detail }));
  }
}
