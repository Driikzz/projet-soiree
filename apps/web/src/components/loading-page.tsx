export function LoadingPage() {
  return (
    <main className="page-shell compact-shell loading-page" aria-busy="true">
      <p className="sr-only" role="status">
        On prépare la scène…
      </p>
      <div className="loading-brand" aria-hidden="true">
        <span className="skeleton-block skeleton-mark" />
        <span className="skeleton-block skeleton-word" />
      </div>
      <div className="loading-panel" aria-hidden="true">
        <span className="skeleton-block skeleton-title" />
        <span className="skeleton-block skeleton-copy" />
        <span className="skeleton-block skeleton-copy skeleton-copy-short" />
        <span className="skeleton-block skeleton-action" />
      </div>
    </main>
  );
}
