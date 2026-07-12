interface PasteZoneProps {
  hasPasted: boolean;
}

export function PasteZone({ hasPasted }: PasteZoneProps) {
  if (hasPasted) {
    return (
      <div className="paste-zone paste-zone--compact">
        Paste again to replace ⌘V
      </div>
    );
  }

  return (
    <div className="paste-zone">
      <div className="paste-zone__icon">⊞</div>
      <h2 className="paste-zone__title">Paste your Google Sheets table</h2>
      <p className="paste-zone__hint">
        Select cells in Google Sheets → Copy (⌘C) → Press ⌘V anywhere on this page
      </p>
    </div>
  );
}
