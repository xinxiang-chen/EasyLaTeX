import type { TableData } from '../types';

interface TablePreviewProps {
  data: TableData;
}

export function TablePreview({ data }: TablePreviewProps) {
  return (
    <section className="section">
      <h3 className="section__title">
        Preview
        {!data.isFromSheets && (
          <span className="warning-badge"> ⚠ Non-Sheets HTML — formatting may be incomplete</span>
        )}
      </h3>
      <div className="table-preview-scroll">
        <table className="table-preview">
          <tbody>
            {data.rows.map((row, ri) => (
              <tr key={ri}>
                {row.cells.map((cell, ci) => {
                  const style: React.CSSProperties = {
                    fontWeight: cell.format.bold ? 'bold' : undefined,
                    fontStyle: cell.format.italic ? 'italic' : undefined,
                    textDecoration: cell.format.underline ? 'underline' : undefined,
                    textAlign: cell.format.align ?? undefined,
                    color: cell.format.color ?? undefined,
                    backgroundColor: cell.format.backgroundColor ?? undefined,
                  };
                  return (
                    <td
                      key={ci}
                      colSpan={cell.colspan}
                      rowSpan={cell.rowspan}
                      style={style}
                    >
                      {cell.text || ' '}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
