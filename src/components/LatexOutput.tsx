import { useState } from 'react';

interface LatexOutputProps {
  latex: string;
}

export function LatexOutput({ latex }: LatexOutputProps) {
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
      <pre className="latex-output"><code>{latex}</code></pre>
    </section>
  );
}
