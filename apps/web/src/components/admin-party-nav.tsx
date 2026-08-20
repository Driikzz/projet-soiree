import { ArrowLeft, Disc, QrCode, Record, UsersThree } from "@phosphor-icons/react";
import { Link, NavLink } from "react-router-dom";

import { RotateBrand } from "./rotate-brand";

const getNavClassName = ({ isActive }: { isActive: boolean }) =>
  `admin-party-nav-link${isActive ? " active" : ""}`;

export function AdminPartyNav({ partyId, partyName }: { partyId: string; partyName: string }) {
  return (
    <header className="admin-toolbar">
      <div className="admin-toolbar-brand">
        <Link className="admin-party-back" to="/parties">
          <ArrowLeft aria-hidden="true" weight="bold" />
          Your records
        </Link>
        <div className="admin-toolbar-context">
          <RotateBrand compact />
          <span title={partyName}>{partyName}</span>
        </div>
      </div>
      <nav className="admin-party-nav" aria-label="Navigation organisateur">
        <NavLink className={getNavClassName} to={`/organizer/parties/${partyId}/dashboard`}>
          <Disc aria-hidden="true" />
          Live
        </NavLink>
        <NavLink className={getNavClassName} to={`/organizer/parties/${partyId}/playlists`}>
          <Record aria-hidden="true" />
          Ambiances
        </NavLink>
        <NavLink className={getNavClassName} to={`/organizer/parties/${partyId}/people`}>
          <UsersThree aria-hidden="true" />
          People
        </NavLink>
        <NavLink className={getNavClassName} to={`/organizer/parties/${partyId}/share`}>
          <QrCode aria-hidden="true" />
          Inviter
        </NavLink>
      </nav>
    </header>
  );
}
