import type { ParseResult, TableData, ParsedRow, ParsedCell } from '../types';
import { parseCellStyle } from './parseCellStyle';

export function parseClipboardHtml(html: string): ParseResult {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) {
    return { error: 'No table found in clipboard HTML. Make sure you copied cells from Google Sheets.' };
  }

  const isFromSheets = html.includes('google-sheets-html-origin') || html.includes('data-sheets-value');

  const rows: ParsedRow[] = [];
  let colCount = 0;

  for (const tr of Array.from(table.querySelectorAll('tr'))) {
    const cells: ParsedCell[] = [];
    let rowColSpan = 0;

    for (const td of Array.from(tr.querySelectorAll('td, th'))) {
      const el = td as HTMLTableCellElement;
      const colspan = el.colSpan || 1;
      const rowspan = el.rowSpan || 1;
      const text = (el.innerText ?? el.textContent ?? '').replace(/ /g, ' ').trim();
      const style = el.getAttribute('style') ?? '';
      const format = parseCellStyle(style);

      // <th> elements are implicitly bold
      if (el.tagName === 'TH' && !format.bold) format.bold = true;

      cells.push({ text, format, colspan, rowspan });
      rowColSpan += colspan;
    }

    if (rowColSpan > colCount) colCount = rowColSpan;
    if (cells.length > 0) rows.push({ cells });
  }

  if (rows.length === 0) {
    return { error: 'Table appears to be empty.' };
  }

  const tableData: TableData = { rows, colCount, isFromSheets };
  return tableData;
}
