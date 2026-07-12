import { useState } from 'react';

interface LatexOutputProps {
  latex: string;
  onEdit: (value: string) => void;
}

export function LatexOutput({ latex, onEdit }: LatexOutputProps) {
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
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <textarea
        className="latex-editor"
        value={latex}
        onChange={e => onEdit(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap="off"
        aria-label="LaTeX output (editable)"
      />
    </section>
  );
}
