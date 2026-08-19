export function RecordStamp({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`record-stamp${compact ? " record-stamp-compact" : ""}`} aria-hidden="true">
      <span>The night</span>
      <i />
      <span>Recorded</span>
    </span>
  );
}
