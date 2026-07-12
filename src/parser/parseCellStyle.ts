import type { CellFormat } from '../types';

export function parseCellStyle(styleStr: string): CellFormat {
  const format: CellFormat = {
    bold: false,
    italic: false,
    underline: false,
    align: null,
    color: null,
    backgroundColor: null,
  };

  if (!styleStr) return format;

  for (const declaration of styleStr.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;
    const prop = declaration.slice(0, colon).trim().toLowerCase();
    const val = declaration.slice(colon + 1).trim().toLowerCase();

    switch (prop) {
      case 'font-weight':
        if (val === 'bold' || parseInt(val) >= 700) format.bold = true;
        break;
      case 'font-style':
        if (val === 'italic' || val === 'oblique') format.italic = true;
        break;
      case 'text-decoration':
      case 'text-decoration-line':
        if (val.includes('underline')) format.underline = true;
        break;
      case 'text-align':
        if (val === 'center') format.align = 'center';
        else if (val === 'right') format.align = 'right';
        else if (val === 'left') format.align = 'left';
        break;
      case 'color':
        format.color = val;
        break;
      case 'background-color':
        format.backgroundColor = val;
        break;
    }
  }

  return format;
}
