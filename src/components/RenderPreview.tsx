import { useEffect, useState } from 'react';

interface RenderPreviewProps {
  latex: string;
}

const DEBOUNCE_MS = 600;

type Status = 'idle' | 'loading' | 'done' | 'error';

export function RenderPreview({ latex }: RenderPreviewProps) {
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
        const res = await fetch('/api/render', {
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
        <div className="section__controls">
          {status === 'loading' && <span className="render-status">Rendering…</span>}
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => setEnabled(v => !v)}
              className="toggle-checkbox"
            />
            Live render
          </label>
        </div>
      </div>

      {!enabled && (
        <p className="render-hint">
          Enable to compile the LaTeX with a local <code>latex</code> and preview the actual table as a
          scalable vector. Requires the render server (<code>npm run dev</code>) and TeX tools{' '}
          <code>multirow</code>, <code>preview</code>, <code>dvisvgm</code>.
        </p>
      )}

      {enabled && status === 'error' && <pre className="render-error">{errorMsg}</pre>}

      {enabled && svgUrl && (
        <div className="render-canvas-wrap" data-empty={status !== 'done'}>
          <img src={svgUrl} alt="Rendered LaTeX table" className="render-svg" />
        </div>
      )}
    </section>
  );
}
