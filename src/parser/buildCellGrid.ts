import type { CellGrid, GridCell, ParsedRow } from '../types';

interface PendingSpan {
  originRow: number;
  originCol: number;
  colspan: number;
  remainingRows: number;
}

export function buildCellGrid(rows: ParsedRow[], colCount: number): CellGrid {
  const grid: CellGrid = rows.map(() =>
    Array.from({ length: colCount }, (): GridCell => ({
      sourceCell: null,
      coveredBy: null,
      isOrigin: false,
    }))
  );

  // colIndex → pending span info for rowspan > 1 cells
  const pending = new Map<number, PendingSpan>();

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    // Fill positions covered by spans from previous rows
    for (const [colIdx, span] of pending) {
      for (let c = colIdx; c < colIdx + span.colspan && c < colCount; c++) {
        grid[rowIdx][c] = {
          sourceCell: null,
          coveredBy: { row: span.originRow, col: span.originCol },
          isOrigin: false,
        };
      }
      span.remainingRows--;
      if (span.remainingRows === 0) pending.delete(colIdx);
    }

    let colCursor = 0;
    for (const cell of rows[rowIdx].cells) {
      // Advance past positions already filled (by pending spans)
      while (colCursor < colCount && grid[rowIdx][colCursor].coveredBy !== null) {
        colCursor++;
      }
      if (colCursor >= colCount) break;

      const colspan = Math.min(cell.colspan, colCount - colCursor);
      const rowspan = cell.rowspan;

      // Place origin
      grid[rowIdx][colCursor] = { sourceCell: cell, coveredBy: null, isOrigin: true };

      // Fill colspan coverage in this row
      for (let c = colCursor + 1; c < colCursor + colspan && c < colCount; c++) {
        grid[rowIdx][c] = {
          sourceCell: null,
          coveredBy: { row: rowIdx, col: colCursor },
          isOrigin: false,
        };
      }

      // Register rowspan for subsequent rows
      if (rowspan > 1) {
        pending.set(colCursor, {
          originRow: rowIdx,
          originCol: colCursor,
          colspan,
          remainingRows: rowspan - 1,
        });
      }

      colCursor += colspan;
    }
  }

  return grid;
}
