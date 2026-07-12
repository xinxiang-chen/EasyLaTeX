import { useState } from 'react';
import type { TableStyle } from '../generator/generateLatex';

interface LatexOutputProps {
  latex: string;
  wideTable: boolean;
  onToggleWideTable: () => void;
  style: TableStyle;
  onChangeStyle: (style: TableStyle) => void;
  captionEnabled: boolean;
  caption: string;
  onToggleCaption: () => void;
  onChangeCaption: (value: string) => void;
  labelEnabled: boolean;
  label: string;
  onToggleLabel: () => void;
  onChangeLabel: (value: string) => void;
}

const STYLE_OPTIONS: { value: TableStyle; label: string }[] = [
  { value: 'grid', label: 'Grid (full borders)' },
  { value: 'booktabs', label: 'Booktabs (three-line)' },
  { value: 'plain', label: 'Plain (no rules)' },
];

export function LatexOutput({
  latex,
  wideTable,
  onToggleWideTable,
  style,
  onChangeStyle,
  captionEnabled,
  caption,
  onToggleCaption,
  onChangeCaption,
  labelEnabled,
  label,
  onToggleLabel,
  onChangeLabel,
}: LatexOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="section">
      <div className="section__header">
        <h3 className="section__title">LaTeX Output</h3>
        <div className="section__controls">
          <label className="select-label">
            Style
            <select
              className="style-select"
              value={style}
              onChange={e => onChangeStyle(e.target.value as TableStyle)}
            >
              {STYLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={wideTable}
              onChange={onToggleWideTable}
              className="toggle-checkbox"
            />
            <code className="toggle-env">table*</code>
          </label>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="section__options">
        <div className="field">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={captionEnabled}
              onChange={onToggleCaption}
              className="toggle-checkbox"
            />
            <code className="toggle-env">\caption</code>
          </label>
          <input
            type="text"
            className="field-input"
            value={caption}
            placeholder="Table caption"
            disabled={!captionEnabled}
            onChange={e => onChangeCaption(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={labelEnabled}
              onChange={onToggleLabel}
              className="toggle-checkbox"
            />
            <code className="toggle-env">\label</code>
          </label>
          <input
            type="text"
            className="field-input"
            value={label}
            placeholder="tab:label"
            disabled={!labelEnabled}
            onChange={e => onChangeLabel(e.target.value)}
          />
        </div>
      </div>

      <pre className="latex-output"><code>{latex}</code></pre>
    </section>
  );
}
