import { describe, it, expect } from 'vitest';
import { generateLatex } from '../generateLatex';
import { escapeLatex } from '../cellContent';
import type { TableData, ParsedCell } from '../../types';

function makeCell(text: string, opts: Partial<ParsedCell> = {}): ParsedCell {
  return {
    text,
    format: { bold: false, italic: false, underline: false, align: null, color: null, backgroundColor: null },
    colspan: 1,
    rowspan: 1,
    ...opts,
  };
}

function table(rows: ParsedCell[][]): TableData {
  const colCount = rows.reduce((m, r) => {
    const c = r.reduce((s, cell) => s + cell.colspan, 0);
    return Math.max(m, c);
  }, 0);
  return { rows: rows.map(cells => ({ cells })), colCount, isFromSheets: false };
}

describe('escapeLatex', () => {
  it('escapes backslash first', () => {
    expect(escapeLatex('\\')).toBe('\\textbackslash{}');
  });

  it('escapes & % $ # _ { } ~ ^', () => {
    expect(escapeLatex('50% of $100 & tax')).toBe('50\\% of \\$100 \\& tax');
  });

  it('does not double-escape backslash', () => {
    expect(escapeLatex('a\\b')).toBe('a\\textbackslash{}b');
  });
});

describe('generateLatex', () => {
  it('produces correct output for simple 2×2 table', () => {
    const data = table([
      [makeCell('Name', { format: { bold: true, italic: false, underline: false, align: 'left', color: null, backgroundColor: null } }), makeCell('Score', { format: { bold: false, italic: false, underline: false, align: 'right', color: null, backgroundColor: null } })],
      [makeCell('Alice'), makeCell('95', { format: { bold: false, italic: false, underline: false, align: 'right', color: null, backgroundColor: null } })],
    ]);
    const latex = generateLatex(data);
    expect(latex).toContain('\\begin{tabular}{|l|r|}');
    expect(latex).toContain('\\textbf{Name}');
    expect(latex).toContain('Alice & 95');
    expect(latex).toContain('\\hline');
    expect(latex).toContain('\\end{tabular}');
  });

  it('emits \\multicolumn for colspan', () => {
    const data = table([
      [makeCell('Merged', { colspan: 2 }), makeCell('C')],
      [makeCell('A'), makeCell('B'), makeCell('C')],
    ]);
    const latex = generateLatex(data);
    expect(latex).toContain('\\multicolumn{2}');
    expect(latex).toContain('Merged');
  });

  it('emits \\multirow for rowspan', () => {
    const data = table([
      [makeCell('Tall', { rowspan: 3 }), makeCell('R0C1')],
      [makeCell('R1C1')],
      [makeCell('R2C1')],
    ]);
    const latex = generateLatex(data);
    expect(latex).toContain('\\multirow{3}{*}{Tall}');
    expect(latex).toContain('\\cline');
  });

  it('emits nested \\multicolumn + \\multirow for combined span', () => {
    const data = table([
      [makeCell('Big', { colspan: 2, rowspan: 2 }), makeCell('R0C2')],
      [makeCell('R1C2')],
    ]);
    const latex = generateLatex(data);
    expect(latex).toContain('\\multicolumn{2}');
    expect(latex).toContain('\\multirow{2}');
  });

  it('does not draw hline through intermediate rows of a rowspan', () => {
    // CUB spans 4 rows: hline after rows 0,1,2 must not cross col 0; only after row 3 it should.
    const data = table([
      [makeCell('CUB', { rowspan: 4 }), makeCell('14974'), makeCell('31.1')],
      [makeCell('5105'), makeCell('46.6')],
      [makeCell('3887'), makeCell('45.1')],
      [makeCell('776'), makeCell('49.2')],
    ]);
    const latex = generateLatex(data);
    const lines = latex.split('\n');
    // After row 0: col 0 still spanned → \cline, not \hline
    const firstDataRow = lines.find(l => l.includes('\\multirow{4}') && l.includes('14974'))!;
    const afterRow0 = lines[lines.indexOf(firstDataRow) + 1];
    expect(afterRow0).not.toBe('\\hline');
    expect(afterRow0).toMatch(/\\cline/);
    // After the last row of the span, full \hline
    const lastDataRow = lines.find(l => l.includes('776'))!;
    const afterLastRow = lines[lines.indexOf(lastDataRow) + 1];
    expect(afterLastRow).toBe('\\hline');
  });

  it('emits empty token for rowspan-covered cells to keep column alignment', () => {
    // Row 0: [Method rowspan=2] | [CUB colspan=3] | [Stanford Cars colspan=3]
    // Row 1: (covered)         | [All] [Old] [New] | [All] [Old] [New]
    // Row 1 must start with an empty & for the Method column, otherwise headers shift left.
    const data = table([
      [
        makeCell('Method', { rowspan: 2 }),
        makeCell('CUB', { colspan: 3 }),
        makeCell('Stanford Cars', { colspan: 3 }),
      ],
      [makeCell('All'), makeCell('Old'), makeCell('New'), makeCell('All'), makeCell('Old'), makeCell('New')],
    ]);
    const latex = generateLatex(data);
    const lines = latex.split('\n');
    const row1Line = lines.find(l => l.includes('All') && l.includes('Old') && l.includes('New') && !l.includes('CUB'));
    expect(row1Line).toBeDefined();
    // Must have 6 ampersands (7 columns), not 5 (which would mean the first cell was dropped)
    expect((row1Line!.match(/&/g) ?? []).length).toBe(6);
    expect(row1Line!.trimStart()).toMatch(/^&/);
  });

  it('includes preamble comment', () => {
    const data = table([[makeCell('A')]]);
    expect(generateLatex(data)).toContain('% requires: \\usepackage{multirow}');
  });

  it('escapes special chars in cell text', () => {
    const data = table([[makeCell('50% & $100')]]);
    const latex = generateLatex(data);
    expect(latex).toContain('50\\%');
    expect(latex).toContain('\\&');
    expect(latex).toContain('\\$100');
  });
});
