import { Link } from "react-router-dom";

interface RotateBrandProps {
  compact?: boolean;
  to?: string;
}

export function RotateBrand({ compact = false, to = "/" }: RotateBrandProps) {
  return (
    <Link className={`rotate-brand${compact ? " rotate-brand-compact" : ""}`} to={to}>
      <span>
        ROTATE
        <i aria-hidden="true" />
      </span>
      {!compact && <small>Record Culture</small>}
    </Link>
  );
}
