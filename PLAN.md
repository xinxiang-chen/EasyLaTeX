# EasyLaTeX: Google Sheets → LaTeX Table Converter

## Context

User wants a deterministic, LLM-free tool that converts Google Sheets table selections to LaTeX table code. The key insight: copying from Google Sheets puts `text/html` on the clipboard, and that HTML contains full formatting info (inline CSS styles, `colspan`/`rowspan` attributes). We parse that HTML client-side and emit LaTeX. No backend, no server, no LLM.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Build tool | **Vite** | Fast dev server, zero config for TS/React |
| UI | **React + TypeScript** | Reactive state for paste→parse→display; types enforce complex table structures |
| Styling | **Plain CSS** (hand-written) | MVP doesn't need a framework |
| Testing | **Vitest + jsdom** | Co-located with Vite config; `jsdom` lets us run DOMParser in tests |
| Clipboard | Browser `paste` event | `window.addEventListener('paste', ...)` — no focus management needed |
| No backend | Pure client-side | Clipboard API + DOMParser are browser-native |

Bootstrap: `npm create vite@latest . -- --template react-ts`

---

## Project Structure

```
src/
├── main.tsx
├── App.tsx                          # global paste listener, top-level state
├── types.ts                         # all shared interfaces
├── parser/
│   ├── parseClipboardHtml.ts        # entry: DOMParser + orchestration
│   ├── parseCellStyle.ts            # inline CSS string → CellFormat
│   └── buildCellGrid.ts             # expand colspan/rowspan into 2D grid
├── generator/
│   ├── generateLatex.ts             # entry: TableData → LaTeX string
│   ├── columnSpec.ts                # derive |l|c|r| spec from cell alignments
│   ├── cellContent.ts               # escape LaTeX specials + apply \textbf etc.
│   └── mergedCellTracker.ts         # track which grid positions are span-covered
└── components/
    ├── PasteZone.tsx                # instructional area, shrinks after first paste
    ├── TablePreview.tsx             # re-render TableData as real HTML table
    ├── LatexOutput.tsx              # <pre><code> block + Copy button
    └── ErrorBanner.tsx              # dismissible parse error display
```

---

## Key Types (`src/types.ts`)

```typescript
interface CellFormat {
  bold: boolean; italic: boolean; underline: boolean;
  align: 'left' | 'center' | 'right' | null;
  color: string | null; backgroundColor: string | null;
}

interface ParsedCell {
  text: string;       // trimmed innerText
  format: CellFormat;
  colspan: number;    // default 1
  rowspan: number;    // default 1
}

interface ParsedRow { cells: ParsedCell[]; }

interface TableData {
  rows: ParsedRow[];
  colCount: number;
}

// Dense 2D grid after expanding spans
type GridCell = {
  sourceCell: ParsedCell | null;
  coveredBy: { row: number; col: number } | null;
  isOrigin: boolean;
};
type CellGrid = GridCell[][];
```

---

## Core Algorithms

### HTML Parsing (`parseClipboardHtml.ts`)
1. `new DOMParser().parseFromString(html, 'text/html')` — use browser's native parser
2. Find first `<table>`; error if absent
3. For each `<tr>` → each `<td>/<th>`: read `innerText`, `colspan`, `rowspan`, `style`
4. Detect `<google-sheets-html-origin>` wrapper; warn if absent (non-Sheets paste)
5. Return `TableData`

### Style Parsing (`parseCellStyle.ts`)
Split on `;`, then on `:`. Map:
- `font-weight:bold` → `bold: true`
- `font-style:italic` → `italic: true`
- `text-decoration:underline` → `underline: true`
- `text-align:center/right/left` → `align`
- `color`/`background-color` → kept as-is for HTML preview

### Grid Builder (`buildCellGrid.ts`) — hardest piece
Allocate `rows × colCount` grid. Walk rows left-to-right maintaining a **pending spans map** (`colIndex → { originRow, originCol, remainingRows, colspan }`):
1. Before processing HTML cells in row `i`, fill pending-span positions with `{ isOrigin: false, coveredBy: origin }`
2. For each HTML cell: advance `colCursor` past filled slots, place origin, fill `colspan` coverage rightward, register `rowspan > 1` cells in pending map
3. Result: every grid position is either an origin cell or a covered slot

### LaTeX Generation (`generateLatex.ts`)
1. Build `CellGrid`, derive column spec, instantiate `CoveredCellSet`
2. Emit `% requires: \usepackage{multirow}` preamble
3. `\begin{tabular}{|l|c|r|}` + `\hline`
4. For each row, for each column:
   - If covered by tracker → skip
   - If `colspan > 1` AND `rowspan > 1` → `\multicolumn{n}{|c|}{\multirow{m}{*}{content}}`
   - If `colspan > 1` only → `\multicolumn{n}{|c|}{content}`
   - If `rowspan > 1` only → `\multirow{m}{*}{content}`
   - Else → `content`
   - Mark tracker
5. Join tokens with ` & `, append ` \\`
6. After each row: emit `\hline` if no downward spans cross the boundary, else `\cline{a-b}` for non-spanned column ranges

### LaTeX Escaping (order matters — `\` first)
`\` → `\textbackslash{}`, then `& % $ # _ { } ~ ^`

### Text formatting wrappers
Bold → `\textbf{}`, italic → `\textit{}`, underline → `\underline{}`

---

## Clipboard Integration (`App.tsx`)

```typescript
useEffect(() => {
  const handler = (e: ClipboardEvent) => {
    const html = e.clipboardData?.getData('text/html');
    if (!html) { setError("No HTML found — copy from Google Sheets first."); return; }
    const result = parseClipboardHtml(html);
    if ('error' in result) { setError(result.error); return; }
    setTableData(result);
    setLatex(generateLatex(result));
  };
  window.addEventListener('paste', handler);
  return () => window.removeEventListener('paste', handler);
}, []);
```

`window` listener — no focus management required.

---

## Build Order

1. **Scaffold**: `npm create vite@latest . -- --template react-ts` + install vitest/jsdom
2. **Types**: write `types.ts`
3. **Style parser** + unit tests (test bold/italic/underline/align from CSS strings)
4. **HTML parser** + grid builder + tests (fixtures: 2×2, colspan-only, rowspan-only, both, special chars)
5. **LaTeX generator** + tests (assert full LaTeX string for each fixture)
6. **React UI**: PasteZone → App wiring → LatexOutput → TablePreview → ErrorBanner
7. **Manual test**: paste real Sheets data → verify HTML preview matches visually → copy LaTeX → paste into Overleaf → compile

---

## Edge Cases to Handle

- `rowspan + colspan` combined: covers a rectangle, not just a column
- `\` must be escaped before all other special chars (prevent double-escaping)
- Newlines inside cells: normalize to space (MVP)
- `<th>` elements: treat same as `<td>`
- Missing `<colgroup>`: column spec falls back to alignment inference
- Non-Sheets HTML (Excel, web): warn user, attempt parse anyway
- Cells with only whitespace: emit empty LaTeX cell `{}`
- All columns spanned across row boundary: emit no rule (no `\hline`, no `\cline`)

---

## Verification

**Unit tests** (vitest): fixture HTML strings → assert exact LaTeX output for:
- Simple 2×2 with bold header
- `colspan=2` on a 3-column table → `\multicolumn{2}{...}`
- `rowspan=3` in first column → `\multirow{3}{*}{...}` + `\cline` on subsequent rows
- Combined `colspan=2, rowspan=2` block
- Special characters: `50% of $100 & tax` → `50\% of \$100 \& tax`

**Browser test**: `npm run dev` → paste real Sheets selection → compare HTML preview to source → copy LaTeX

**Overleaf smoke test**:
```latex
\documentclass{article}
\usepackage{multirow}
\begin{document}
% paste generated output here
\end{document}
```
Compile → PDF table should match original Sheets layout.
