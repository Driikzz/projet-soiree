import { toRotReference } from "../lib/rotate-reference";

export function RotReference({ code, live = false }: { code: string; live?: boolean }) {
  return (
    <span className="rot-reference">
      {toRotReference(code)}
      {live && <i aria-label="Live" />}
    </span>
  );
}
