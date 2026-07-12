import { describe, it, expect } from 'vitest';
import { parseCellStyle } from '../parseCellStyle';

describe('parseCellStyle', () => {
  it('returns all false/null defaults for empty string', () => {
    const f = parseCellStyle('');
    expect(f.bold).toBe(false);
    expect(f.italic).toBe(false);
    expect(f.underline).toBe(false);
    expect(f.align).toBeNull();
    expect(f.color).toBeNull();
    expect(f.backgroundColor).toBeNull();
  });

  it('parses font-weight:bold', () => {
    expect(parseCellStyle('font-weight:bold').bold).toBe(true);
  });

  it('parses font-weight:700', () => {
    expect(parseCellStyle('font-weight:700').bold).toBe(true);
  });

  it('parses font-style:italic', () => {
    expect(parseCellStyle('font-style:italic').italic).toBe(true);
  });

  it('parses text-decoration:underline', () => {
    expect(parseCellStyle('text-decoration:underline').underline).toBe(true);
  });

  it('parses text-decoration with multiple values', () => {
    expect(parseCellStyle('text-decoration:underline line-through').underline).toBe(true);
  });

  it('parses text-align:center', () => {
    expect(parseCellStyle('text-align:center').align).toBe('center');
  });

  it('parses text-align:right', () => {
    expect(parseCellStyle('text-align:right').align).toBe('right');
  });

  it('parses color', () => {
    expect(parseCellStyle('color:#ff0000').color).toBe('#ff0000');
  });

  it('parses background-color', () => {
    expect(parseCellStyle('background-color:#cccccc').backgroundColor).toBe('#cccccc');
  });

  it('parses multiple properties from Google Sheets style string', () => {
    const style = 'overflow:hidden;padding:2px 3px;vertical-align:bottom;font-weight:bold;text-align:center;';
    const f = parseCellStyle(style);
    expect(f.bold).toBe(true);
    expect(f.align).toBe('center');
    expect(f.italic).toBe(false);
  });
});
