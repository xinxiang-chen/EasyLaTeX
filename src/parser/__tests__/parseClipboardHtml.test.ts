import { describe, it, expect } from 'vitest';
import { parseClipboardHtml } from '../parseClipboardHtml';
import { isParseError } from '../../types';

const simpleHtml = `
<google-sheets-html-origin>
<table>
  <tbody>
    <tr>
      <td style="font-weight:bold;text-align:center;">Header 1</td>
      <td style="text-align:right;">Score</td>
    </tr>
    <tr>
      <td>Alice</td>
      <td style="text-align:right;">95</td>
    </tr>
  </tbody>
</table>`;

const colspanHtml = `
<table>
  <tbody>
    <tr>
      <td colspan="2">Merged</td>
      <td>C</td>
    </tr>
    <tr>
      <td>A</td>
      <td>B</td>
      <td>C</td>
    </tr>
  </tbody>
</table>`;

const rowspanHtml = `
<table>
  <tbody>
    <tr>
      <td rowspan="3">Tall</td>
      <td>R0C1</td>
    </tr>
    <tr>
      <td>R1C1</td>
    </tr>
    <tr>
      <td>R2C1</td>
    </tr>
  </tbody>
</table>`;

describe('parseClipboardHtml', () => {
  it('returns error for HTML with no table', () => {
    const result = parseClipboardHtml('<div>hello</div>');
    expect(isParseError(result)).toBe(true);
  });

  it('parses a simple 2×2 table', () => {
    const result = parseClipboardHtml(simpleHtml);
    expect(isParseError(result)).toBe(false);
    if (isParseError(result)) return;
    expect(result.rows.length).toBe(2);
    expect(result.colCount).toBe(2);
    expect(result.rows[0].cells[0].text).toBe('Header 1');
    expect(result.rows[0].cells[0].format.bold).toBe(true);
    expect(result.rows[0].cells[0].format.align).toBe('center');
    expect(result.rows[1].cells[1].text).toBe('95');
    expect(result.isFromSheets).toBe(true);
  });

  it('reads colspan attribute', () => {
    const result = parseClipboardHtml(colspanHtml);
    if (isParseError(result)) throw new Error(result.error);
    expect(result.rows[0].cells[0].colspan).toBe(2);
    expect(result.colCount).toBe(3);
  });

  it('reads rowspan attribute', () => {
    const result = parseClipboardHtml(rowspanHtml);
    if (isParseError(result)) throw new Error(result.error);
    expect(result.rows[0].cells[0].rowspan).toBe(3);
    expect(result.rows[0].cells[0].text).toBe('Tall');
    expect(result.rows[1].cells.length).toBe(1);
  });
});
