import { ArrowLeft, Gauge, MusicNotes, SpeakerHigh, UsersThree } from "@phosphor-icons/react";
import { Link, NavLink } from "react-router-dom";

const getNavClassName = ({ isActive }: { isActive: boolean }) =>
  `admin-party-nav-link${isActive ? " active" : ""}`;

export function AdminPartyNav({ partyId, partyName }: { partyId: string; partyName: string }) {
  return (
    <header className="admin-toolbar">
      <div className="admin-toolbar-brand">
        <Link className="admin-party-back" to="/parties">
          <ArrowLeft aria-hidden="true" weight="bold" />
          Toutes mes soirées
        </Link>
        <div className="admin-toolbar-context">
          <Link className="brand-link" to="/">
            SongFest
          </Link>
          <span title={partyName}>{partyName}</span>
        </div>
      </div>
      <nav className="admin-party-nav" aria-label="Navigation organisateur">
        <NavLink className={getNavClassName} to={`/organizer/parties/${partyId}/dashboard`}>
          <Gauge aria-hidden="true" />
          Pilotage
        </NavLink>
        <NavLink className={getNavClassName} to={`/organizer/parties/${partyId}/playlists`}>
          <MusicNotes aria-hidden="true" />
          Playlists
        </NavLink>
        <NavLink className={getNavClassName} to={`/organizer/parties/${partyId}/spotify`}>
          <SpeakerHigh aria-hidden="true" />
          Spotify
        </NavLink>
        <NavLink className={getNavClassName} to={`/organizer/parties/${partyId}/share`}>
          <UsersThree aria-hidden="true" />
          Inviter
        </NavLink>
      </nav>
    </header>
  );
}
