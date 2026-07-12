interface ErrorBannerProps {
  error: string;
  onDismiss: () => void;
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert">
      <span>{error}</span>
      <button className="error-banner__close" onClick={onDismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}
