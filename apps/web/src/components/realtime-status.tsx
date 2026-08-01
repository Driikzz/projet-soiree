import type { RealtimeStatus as RealtimeConnectionStatus } from "../lib/realtime/use-party-realtime";

const labels: Record<RealtimeConnectionStatus, string> = {
  connected: "En direct",
  connecting: "Synchronisation…",
  offline: "Hors ligne · nouvelle tentative automatique",
};

export function RealtimeStatus({ status }: { status: RealtimeConnectionStatus }) {
  return (
    <span className={`realtime-status realtime-${status}`} role="status" aria-live="polite">
      <span aria-hidden="true" />
      {labels[status]}
    </span>
  );
}
