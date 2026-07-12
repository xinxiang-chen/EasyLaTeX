import { useEffect, useState } from 'react';
import './App.css';
import type { TableData } from './types';
import { isParseError } from './types';
import { parseClipboardHtml } from './parser/parseClipboardHtml';
import { generateLatex } from './generator/generateLatex';
import { PasteZone } from './components/PasteZone';
import { TablePreview } from './components/TablePreview';
import { LatexOutput } from './components/LatexOutput';
import { ErrorBanner } from './components/ErrorBanner';

export default function App() {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [latex, setLatex] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const html = e.clipboardData?.getData('text/html');
      if (!html) {
        setError('No HTML found in clipboard. Copy cells from Google Sheets first.');
        return;
      }
      const result = parseClipboardHtml(html);
      if (isParseError(result)) {
        setError(result.error);
        return;
      }
      setError(null);
      setTableData(result);
      setLatex(generateLatex(result));
    };

    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">EasyLaTeX</h1>
        <p className="app-subtitle">Google Sheets → LaTeX table, no LLM</p>
      </header>

      <main className="app-main">
        <PasteZone hasPasted={tableData !== null} />
        {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
        {tableData && <TablePreview data={tableData} />}
        {latex && <LatexOutput latex={latex} />}
      </main>
    </div>
  );
}
