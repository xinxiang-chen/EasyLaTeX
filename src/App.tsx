import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import './App.css';
import type { TableData } from './types';
import { isParseError } from './types';
import { parseClipboardHtml } from './parser/parseClipboardHtml';
import { generateLatex } from './generator/generateLatex';
import { DEFAULT_SETTINGS, settingsToOptions, type TableSettings } from './tableSettings';
import { PasteZone } from './components/PasteZone';
import { TablePreview } from './components/TablePreview';
import { LatexOutput } from './components/LatexOutput';
import { RenderPreview } from './components/RenderPreview';
import { ErrorBanner } from './components/ErrorBanner';

export default function App() {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<TableSettings>(DEFAULT_SETTINGS);
  // Manual edits to the output. Overrides the generated LaTeX until settings or
  // the pasted table change (see the effect below), which regenerate from scratch.
  const [editedLatex, setEditedLatex] = useState<string | null>(null);

  const updateSettings = (patch: Partial<TableSettings>) =>
    setSettings(prev => ({ ...prev, ...patch }));

  const generatedLatex = tableData ? generateLatex(tableData, settingsToOptions(settings)) : null;

  // Discard manual edits whenever the generated output changes (new paste or a
  // settings tweak), so the controls stay authoritative.
  useEffect(() => {
    setEditedLatex(null);
  }, [generatedLatex]);

  const latex = editedLatex ?? generatedLatex;

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
    };

    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Easy-LaTeX</h1>
        <p className="app-subtitle">Google Sheets → LaTeX table convertor. Generate LaTeX table from Google Sheet, LLM-free, protect your data from LLM tripping!</p>
      </header>

      <main className="app-main">
        <PasteZone hasPasted={tableData !== null} />
        {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
        {tableData && <TablePreview data={tableData} />}
        {latex !== null && (
          <RenderPreview latex={latex} settings={settings} onChange={updateSettings} />
        )}
        {latex !== null && <LatexOutput latex={latex} onEdit={setEditedLatex} />}
      </main>
      <Analytics />
    </div>
  );
}
