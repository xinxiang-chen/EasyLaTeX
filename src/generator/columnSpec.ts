import type { CellGrid } from '../types';

function alignChar(align: 'left' | 'center' | 'right' | null): string {
  if (align === 'center') return 'c';
  if (align === 'right') return 'r';
  return 'l';
}

export function deriveColumnSpec(grid: CellGrid, colCount: number): string {
  const cols: string[] = [];

  for (let c = 0; c < colCount; c++) {
    const tally = { left: 0, center: 0, right: 0 };
    for (const row of grid) {
      const cell = row[c];
      if (cell.isOrigin && cell.sourceCell) {
        const a = cell.sourceCell.format.align;
        if (a === 'center') tally.center++;
        else if (a === 'right') tally.right++;
        else if (a === 'left') tally.left++;
      }
    }
    const dominant =
      tally.center >= tally.right && tally.center >= tally.left ? 'center' :
      tally.right > tally.left ? 'right' : 'left';

    const hasAny = tally.left + tally.center + tally.right > 0;
    cols.push(alignChar(hasAny ? dominant : null));
  }

  return '|' + cols.join('|') + '|';
}
