import type { TableData } from '../types';
import { buildCellGrid } from '../parser/buildCellGrid';
import { deriveColumnSpec } from './columnSpec';
import { renderCellContent, escapeLatex } from './cellContent';
import { CoveredCellSet } from './mergedCellTracker';

export type TableStyle = 'grid' | 'booktabs' | 'plain';

export interface GenerateOptions {
  wideTable?: boolean;
  style?: TableStyle;
  // When a string is provided, the corresponding command is emitted inside the
  // table environment (undefined = omit). caption text is escaped; label is an
  // identifier and passed through verbatim.
  caption?: string;
  label?: string;
}

interface StyleConfig {
  bars: boolean; // vertical rules in column spec and \multicolumn
  topRule: string; // rule emitted above the first row ('' = none)
  bottomRule: string; // rule emitted below the last row ('' = none)
  interRowRules: 'grid' | 'header-only' | 'none';
  packages: string[];
}

const STYLES: Record<TableStyle, StyleConfig> = {
  grid: {
    bars: true,
    topRule: '\\hline',
    bottomRule: '\\hline',
    interRowRules: 'grid',
    packages: ['multirow'],
  },
  booktabs: {
    bars: false,
    topRule: '\\toprule',
    bottomRule: '\\bottomrule',
    interRowRules: 'header-only',
    packages: ['booktabs', 'multirow'],
  },
  plain: {
    bars: false,
    topRule: '',
    bottomRule: '',
    interRowRules: 'none',
    packages: ['multirow'],
  },
};

function cellAlignChar(align: 'left' | 'center' | 'right' | null): string {
  if (align === 'center') return 'c';
  if (align === 'right') return 'r';
  return 'l';
}

// Returns the border spec string for a \multicolumn cell.
// With bars, includes a left border only if it's the first column.
function multicolBorderSpec(colStart: number, align: string, bars: boolean): string {
  if (!bars) return align;
  return colStart === 0 ? `|${align}|` : `${align}|`;
}

// Returns ranges of columns NOT covered by a downward span crossing row i→i+1.
// Used to decide whether to emit \hline or \cline segments (grid style).
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

// Number of leading rows treated as the header. A row-0 cell with rowspan N
// (e.g. a "Method" label beside grouped column headers) extends the header to
// N rows; otherwise the header is just the first row.
function headerRowCount(grid: ReturnType<typeof buildCellGrid>): number {
  let maxSpan = 1;
  for (const cell of grid[0]) {
    if (cell.isOrigin && cell.sourceCell) {
      maxSpan = Math.max(maxSpan, cell.sourceCell.rowspan);
    }
  }
  return Math.min(maxSpan, grid.length);
}

// \cmidrule segments under each grouped (colspan > 1) header cell in a row.
// Produces the classic booktabs look under spanning column-group headers.
function cmidrulesUnderGroups(
  grid: ReturnType<typeof buildCellGrid>,
  rowIdx: number,
  colCount: number
): string[] {
  const rules: string[] = [];
  for (let c = 0; c < colCount; c++) {
    const cell = grid[rowIdx][c];
    if (cell.isOrigin && cell.sourceCell && cell.sourceCell.colspan > 1) {
      rules.push(`\\cmidrule(lr){${c + 1}-${c + cell.sourceCell.colspan}}`);
    }
  }
  return rules;
}

// Rule(s) emitted between rowIdx and rowIdx+1 (never after the last row —
// the bottom rule is handled separately).
function separatorAfterRow(
  cfg: StyleConfig,
  grid: ReturnType<typeof buildCellGrid>,
  rowIdx: number,
  colCount: number,
  headerRows: number
): string[] {
  if (rowIdx >= grid.length - 1) return [];

  if (cfg.interRowRules === 'grid') {
    const ranges = getHLineRanges(grid, rowIdx, colCount);
    if (ranges.length === 1 && ranges[0].start === 1 && ranges[0].end === colCount) {
      return ['\\hline'];
    }
    return ranges.map(({ start, end }) => `\\cline{${start}-${end}}`);
  }

  if (cfg.interRowRules === 'header-only') {
    if (rowIdx < headerRows - 1) return cmidrulesUnderGroups(grid, rowIdx, colCount);
    if (rowIdx === headerRows - 1) return ['\\midrule'];
    return [];
  }

  return []; // 'none'
}

export function generateLatex(tableData: TableData, options: GenerateOptions = {}): string {
  const { rows, colCount } = tableData;
  const cfg = STYLES[options.style ?? 'grid'];
  const grid = buildCellGrid(rows, colCount);
  const colSpec = deriveColumnSpec(grid, colCount, cfg.bars);
  const headerRows = headerRowCount(grid);
  const tracker = new CoveredCellSet();
  const lines: string[] = [];

  lines.push(`% requires: \\usepackage{${cfg.packages.join(', ')}}`);
  const tableEnv = options.wideTable ? 'table*' : 'table';
  lines.push(`\\begin{${tableEnv}}[h]`);
  lines.push('\\centering');
  // Caption above the table (convention for tables); label after caption so \ref resolves.
  if (options.caption !== undefined) lines.push(`\\caption{${escapeLatex(options.caption)}}`);
  if (options.label !== undefined) lines.push(`\\label{${options.label}}`);
  lines.push(`\\begin{tabular}{${colSpec}}`);
  if (cfg.topRule) lines.push(cfg.topRule);

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
        token = `\\multicolumn{${colspan}}{${multicolBorderSpec(colIdx, alignChar, cfg.bars)}}{${inner}}`;
      } else if (colspan > 1) {
        token = `\\multicolumn{${colspan}}{${multicolBorderSpec(colIdx, alignChar, cfg.bars)}}{${content}}`;
      } else if (rowspan > 1) {
        token = `\\multirow{${rowspan}}{*}{${content}}`;
      } else {
        token = content;
      }

      tracker.mark(rowIdx, colIdx, colspan, rowspan);
      tokens.push(token);
    }

    lines.push(tokens.join(' & ') + ' \\\\');
    lines.push(...separatorAfterRow(cfg, grid, rowIdx, colCount, headerRows));
  }

  if (cfg.bottomRule) lines.push(cfg.bottomRule);
  lines.push('\\end{tabular}');
  lines.push(`\\end{${tableEnv}}`);
  return lines.join('\n');
}
