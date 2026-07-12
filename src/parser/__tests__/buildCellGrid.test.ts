import { describe, it, expect } from 'vitest';
import { buildCellGrid } from '../buildCellGrid';
import type { ParsedRow } from '../../types';

function makeCell(text: string, colspan = 1, rowspan = 1) {
  return {
    text,
    format: { bold: false, italic: false, underline: false, align: null, color: null, backgroundColor: null },
    colspan,
    rowspan,
  };
}

describe('buildCellGrid', () => {
  it('builds a simple 2×2 grid', () => {
    const rows: ParsedRow[] = [
      { cells: [makeCell('A'), makeCell('B')] },
      { cells: [makeCell('C'), makeCell('D')] },
    ];
    const grid = buildCellGrid(rows, 2);
    expect(grid[0][0].isOrigin).toBe(true);
    expect(grid[0][0].sourceCell?.text).toBe('A');
    expect(grid[1][1].sourceCell?.text).toBe('D');
  });

  it('marks colspan coverage', () => {
    const rows: ParsedRow[] = [
      { cells: [makeCell('Merged', 2), makeCell('C')] },
      { cells: [makeCell('A'), makeCell('B'), makeCell('C')] },
    ];
    const grid = buildCellGrid(rows, 3);
    expect(grid[0][0].isOrigin).toBe(true);
    expect(grid[0][0].sourceCell?.text).toBe('Merged');
    expect(grid[0][1].isOrigin).toBe(false);
    expect(grid[0][1].coveredBy).toEqual({ row: 0, col: 0 });
    expect(grid[0][2].sourceCell?.text).toBe('C');
  });

  it('marks rowspan coverage across rows', () => {
    const rows: ParsedRow[] = [
      { cells: [makeCell('Tall', 1, 3), makeCell('R0C1')] },
      { cells: [makeCell('R1C1')] },
      { cells: [makeCell('R2C1')] },
    ];
    const grid = buildCellGrid(rows, 2);
    expect(grid[0][0].isOrigin).toBe(true);
    expect(grid[0][0].sourceCell?.text).toBe('Tall');
    expect(grid[1][0].coveredBy).toEqual({ row: 0, col: 0 });
    expect(grid[2][0].coveredBy).toEqual({ row: 0, col: 0 });
    expect(grid[1][1].sourceCell?.text).toBe('R1C1');
    expect(grid[2][1].sourceCell?.text).toBe('R2C1');
  });

  it('handles combined colspan + rowspan (rectangle)', () => {
    // 2x2 merged block in a 3×3 grid
    const rows: ParsedRow[] = [
      { cells: [makeCell('Big', 2, 2), makeCell('R0C2')] },
      { cells: [makeCell('R1C2')] },
      { cells: [makeCell('R2C0'), makeCell('R2C1'), makeCell('R2C2')] },
    ];
    const grid = buildCellGrid(rows, 3);
    expect(grid[0][0].isOrigin).toBe(true);
    expect(grid[0][1].coveredBy).toEqual({ row: 0, col: 0 });
    expect(grid[1][0].coveredBy).toEqual({ row: 0, col: 0 });
    expect(grid[1][1].coveredBy).toEqual({ row: 0, col: 0 });
    expect(grid[0][2].sourceCell?.text).toBe('R0C2');
    expect(grid[1][2].sourceCell?.text).toBe('R1C2');
    expect(grid[2][0].sourceCell?.text).toBe('R2C0');
  });
});
