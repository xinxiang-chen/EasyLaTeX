export class CoveredCellSet {
  private covered = new Set<string>();

  mark(row: number, col: number, colspan: number, rowspan: number): void {
    for (let r = row; r < row + rowspan; r++) {
      for (let c = col; c < col + colspan; c++) {
        if (r === row && c === col) continue;
        this.covered.add(`${r},${c}`);
      }
    }
  }

  isCovered(row: number, col: number): boolean {
    return this.covered.has(`${row},${col}`);
  }
}
