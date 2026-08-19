export function LiveIndicator({ waiting = false }: { waiting?: boolean }) {
  return (
    <span className={`live-indicator${waiting ? " is-waiting" : ""}`}>
      <i aria-hidden="true" />
      {waiting ? "En attente" : "Live"}
    </span>
  );
}
