export interface CellFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right' | null;
  color: string | null;
  backgroundColor: string | null;
}

export interface ParsedCell {
  text: string;
  format: CellFormat;
  colspan: number;
  rowspan: number;
}

export interface ParsedRow {
  cells: ParsedCell[];
}

export interface TableData {
  rows: ParsedRow[];
  colCount: number;
  isFromSheets: boolean;
}

export interface GridCell {
  sourceCell: ParsedCell | null;
  coveredBy: { row: number; col: number } | null;
  isOrigin: boolean;
}

export type CellGrid = GridCell[][];

export interface ParseError {
  error: string;
}

export type ParseResult = TableData | ParseError;

export function isParseError(r: ParseResult): r is ParseError {
  return 'error' in r;
}
