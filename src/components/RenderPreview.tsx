import { useEffect, useState } from 'react';
import type { TableStyle, FontSize } from '../generator/generateLatex';
import type { TableSettings } from '../tableSettings';

interface RenderPreviewProps {
  latex: string;
  settings: TableSettings;
  onChange: (patch: Partial<TableSettings>) => void;
}

const STYLE_OPTIONS: { value: TableStyle; label: string }[] = [
  { value: 'grid', label: 'Grid (full borders)' },
  { value: 'booktabs', label: 'Booktabs (three-line)' },
  { value: 'plain', label: 'Plain (no rules)' },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'small', label: 'small' },
  { value: 'footnotesize', label: 'footnotesize' },
  { value: 'scriptsize', label: 'scriptsize' },
  { value: 'tiny', label: 'tiny' },
];

const DEBOUNCE_MS = 600;

// Render backend URL: an explicit VITE_RENDER_API (e.g. a hosted TeX service),
// else the Vite dev middleware in `npm run dev`, else none (static deploy).
const RENDER_API =
  import.meta.env.VITE_RENDER_API || (import.meta.env.DEV ? '/api/render' : '');
const RENDER_AVAILABLE = RENDER_API !== '';

type Status = 'idle' | 'loading' | 'done' | 'error';

export function RenderPreview({ latex, settings, onChange }: RenderPreviewProps) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus('loading');
      setErrorMsg(null);
      try {
        const res = await fetch(RENDER_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latex }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const info = await res.json().catch(() => ({}));
          throw new Error(info.detail ? `${info.error}\n${info.detail}` : (info.error ?? `Render failed (${res.status})`));
        }

        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setSvgUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setStatus('done');
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === 'AbortError')) return;
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [latex, enabled]);

  // Revoke the last object URL on unmount.
  useEffect(() => () => {
    setSvgUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  return (
    <section className="section">
      <div className="section__header">
        <h3 className="section__title">Rendered Preview</h3>
        {status === 'loading' && <span className="render-status">Rendering…</span>}
      </div>

      <div className="render-layout">
        <div className="render-main">
          <div className={`render-box${enabled && svgUrl && status !== 'error' ? ' render-box--paper' : ''}`}>
            {!RENDER_AVAILABLE && (
              <p className="render-hint">
                Live preview isn't available in this deployment. The generated LaTeX below works
                everywhere — configure a render backend (<code>VITE_RENDER_API</code>) to compile
                and preview the table here.
              </p>
            )}

            {RENDER_AVAILABLE && !enabled && (
              <p className="render-hint">Enable live rendering in the panel to see the output.</p>
            )}
            {RENDER_AVAILABLE && enabled && status === 'error' && <pre className="render-error">{errorMsg}</pre>}
            {RENDER_AVAILABLE && enabled && svgUrl && status !== 'error' && (
              <img src={svgUrl} alt="Rendered LaTeX table" className="render-svg" />
            )}
          </div>
        </div>

        <aside className="render-controls">
          {RENDER_AVAILABLE && (
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => setEnabled(v => !v)}
                className="toggle-checkbox"
              />
              Live render
            </label>
          )}

          <label className="select-label">
            Style
            <select
              className="style-select"
              value={settings.style}
              onChange={e => onChange({ style: e.target.value as TableStyle })}
            >
              {STYLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label className="select-label">
            Font size
            <select
              className="style-select"
              value={settings.fontSize}
              onChange={e => onChange({ fontSize: e.target.value as FontSize })}
            >
              {FONT_SIZE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings.wideTable}
              onChange={() => onChange({ wideTable: !settings.wideTable })}
              className="toggle-checkbox"
            />
            <code className="toggle-env">table*</code>
          </label>

          <div className="field-stacked">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.captionEnabled}
                onChange={() => onChange({ captionEnabled: !settings.captionEnabled })}
                className="toggle-checkbox"
              />
              <code className="toggle-env">\caption</code>
            </label>
            <input
              type="text"
              className="field-input"
              value={settings.caption}
              placeholder="Table caption"
              disabled={!settings.captionEnabled}
              onChange={e => onChange({ caption: e.target.value })}
            />
          </div>

          <div className="field-stacked">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.labelEnabled}
                onChange={() => onChange({ labelEnabled: !settings.labelEnabled })}
                className="toggle-checkbox"
              />
              <code className="toggle-env">\label</code>
            </label>
            <input
              type="text"
              className="field-input"
              value={settings.label}
              placeholder="tab:label"
              disabled={!settings.labelEnabled}
              onChange={e => onChange({ label: e.target.value })}
            />
          </div>

          <div className="field-stacked">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.tabcolsepEnabled}
                onChange={() => onChange({ tabcolsepEnabled: !settings.tabcolsepEnabled })}
                className="toggle-checkbox"
              />
              <code className="toggle-env">\tabcolsep</code>
            </label>
            <input
              type="text"
              className="field-input"
              value={settings.tabcolsep}
              placeholder="6pt"
              disabled={!settings.tabcolsepEnabled}
              onChange={e => onChange({ tabcolsep: e.target.value })}
            />
          </div>

          <div className="field-stacked">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.arraystretchEnabled}
                onChange={() => onChange({ arraystretchEnabled: !settings.arraystretchEnabled })}
                className="toggle-checkbox"
              />
              <code className="toggle-env">\arraystretch</code>
            </label>
            <input
              type="text"
              className="field-input"
              value={settings.arraystretch}
              placeholder="1.2"
              disabled={!settings.arraystretchEnabled}
              onChange={e => onChange({ arraystretch: e.target.value })}
            />
          </div>
        </aside>
      </div>
    </section>
  );
}
