import { ArrowLeft, Disc, MusicNotes, SlidersHorizontal, UsersThree } from "@phosphor-icons/react";
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
          <MusicNotes aria-hidden="true" />
          Music
        </NavLink>
        <NavLink className={getNavClassName} to={`/organizer/parties/${partyId}/spotify`}>
          <SlidersHorizontal aria-hidden="true" />
          Control
        </NavLink>
        <NavLink className={getNavClassName} to={`/organizer/parties/${partyId}/share`}>
          <UsersThree aria-hidden="true" />
          Join
        </NavLink>
      </nav>
    </header>
  );
}
