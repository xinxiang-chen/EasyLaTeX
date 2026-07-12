import type { TableData } from '../types';
import { buildCellGrid } from '../parser/buildCellGrid';
import { deriveColumnSpec } from './columnSpec';
import { renderCellContent } from './cellContent';
import { CoveredCellSet } from './mergedCellTracker';

function cellAlignChar(align: 'left' | 'center' | 'right' | null): string {
  if (align === 'center') return 'c';
  if (align === 'right') return 'r';
  return 'l';
}

// Returns the border spec string for a \multicolumn cell.
// Includes left border only if it's the first column.
function multicolBorderSpec(colStart: number, align: string): string {
  return colStart === 0 ? `|${align}|` : `${align}|`;
}

// Returns ranges of columns NOT covered by a downward span crossing row i→i+1.
// Used to decide whether to emit \hline or \cline segments.
function getHLineRanges(
  grid: ReturnType<typeof buildCellGrid>,
  rowIdx: number,
  colCount: number
): { start: number; end: number }[] {
  if (rowIdx >= grid.length - 1) return [{ start: 1, end: colCount }];

  const blocked = new Set<number>();
  for (let c = 0; c < colCount; c++) {
    const nextCell = grid[rowIdx + 1][c];
    // Block column c if a rowspan crosses the boundary between rowIdx and rowIdx+1.
    // Rowspan coverage: coveredBy.row < rowIdx+1 (origin is in an earlier row).
    // Colspan coverage: coveredBy.row === rowIdx+1 (same row) — those should NOT be blocked.
    if (nextCell.coveredBy !== null && nextCell.coveredBy.row < rowIdx + 1) {
      blocked.add(c);
    }
  }

  if (blocked.size === 0) return [{ start: 1, end: colCount }];
  if (blocked.size === colCount) return [];

  const ranges: { start: number; end: number }[] = [];
  let rangeStart: number | null = null;
  for (let c = 0; c < colCount; c++) {
    if (!blocked.has(c)) {
      if (rangeStart === null) rangeStart = c + 1;
    } else {
      if (rangeStart !== null) {
        ranges.push({ start: rangeStart, end: c });
        rangeStart = null;
      }
    }
  }
  if (rangeStart !== null) ranges.push({ start: rangeStart, end: colCount });
  return ranges;
}

export function generateLatex(tableData: TableData): string {
  const { rows, colCount } = tableData;
  const grid = buildCellGrid(rows, colCount);
  const colSpec = deriveColumnSpec(grid, colCount);
  const tracker = new CoveredCellSet();
  const lines: string[] = [];

  lines.push('% requires: \\usepackage{multirow}');
  lines.push('\\begin{table}[h]');
  lines.push('\\centering');
  lines.push(`\\begin{tabular}{${colSpec}}`);
  lines.push('\\hline');

  for (let rowIdx = 0; rowIdx < grid.length; rowIdx++) {
    const tokens: string[] = [];

    for (let colIdx = 0; colIdx < colCount; colIdx++) {
      if (tracker.isCovered(rowIdx, colIdx)) {
        // Rowspan coverage (origin in a previous row) needs an empty token to keep column alignment.
        // Colspan coverage (origin in this row) is already handled by the \multicolumn command.
        const coveredBy = grid[rowIdx][colIdx].coveredBy;
        if (coveredBy !== null && coveredBy.row < rowIdx) tokens.push('');
        continue;
      }

      const gridCell = grid[rowIdx][colIdx];

      if (!gridCell.isOrigin || !gridCell.sourceCell) {
        tokens.push('');
        continue;
      }

      const cell = gridCell.sourceCell;
      const { colspan, rowspan } = cell;
      const content = renderCellContent(cell);
      const alignChar = cellAlignChar(cell.format.align);

      let token: string;
      if (colspan > 1 && rowspan > 1) {
        const inner = `\\multirow{${rowspan}}{*}{${content}}`;
        token = `\\multicolumn{${colspan}}{${multicolBorderSpec(colIdx, alignChar)}}{${inner}}`;
      } else if (colspan > 1) {
        token = `\\multicolumn{${colspan}}{${multicolBorderSpec(colIdx, alignChar)}}{${content}}`;
      } else if (rowspan > 1) {
        token = `\\multirow{${rowspan}}{*}{${content}}`;
      } else {
        token = content;
      }

      tracker.mark(rowIdx, colIdx, colspan, rowspan);
      tokens.push(token);
    }

    lines.push(tokens.join(' & ') + ' \\\\');

    const hlineRanges = getHLineRanges(grid, rowIdx, colCount);
    if (hlineRanges.length === 1 && hlineRanges[0].start === 1 && hlineRanges[0].end === colCount) {
      lines.push('\\hline');
    } else {
      for (const { start, end } of hlineRanges) {
        lines.push(`\\cline{${start}-${end}}`);
      }
    }
  }

  lines.push('\\end{tabular}');
  lines.push('\\end{table}');
  return lines.join('\n');
}
