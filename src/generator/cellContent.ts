import type { ParsedCell } from '../types';

const BACKSLASH_PLACEHOLDER = '\x00BS\x00';

export function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, BACKSLASH_PLACEHOLDER)
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(new RegExp(BACKSLASH_PLACEHOLDER, 'g'), '\\textbackslash{}');
}

export function renderCellContent(cell: ParsedCell): string {
  let content = escapeLatex(cell.text);
  if (cell.format.underline) content = `\\underline{${content}}`;
  if (cell.format.italic) content = `\\textit{${content}}`;
  if (cell.format.bold) content = `\\textbf{${content}}`;
  return content;
}
