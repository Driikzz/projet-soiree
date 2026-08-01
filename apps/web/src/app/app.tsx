import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { ProtectedAdminRoute } from "./protected-admin-route";
import { RouteAccessibility } from "./route-accessibility";
import { LoadingPage } from "../components/loading-page";
import { HomePage } from "../routes/home-page";
import { NotFoundPage } from "../routes/not-found-page";

const AdminLoginPage = lazy(() =>
  import("../routes/admin-login-page").then((module) => ({
    default: module.AdminLoginPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import("../routes/admin-dashboard-page").then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const AdminPlaylistsPage = lazy(() =>
  import("../routes/admin-playlists-page").then((module) => ({
    default: module.AdminPlaylistsPage,
  })),
);
const AdminSpotifyPage = lazy(() =>
  import("../routes/admin-spotify-page").then((module) => ({
    default: module.AdminSpotifyPage,
  })),
);
const CreatePartyPage = lazy(() =>
  import("../routes/create-party-page").then((module) => ({
    default: module.CreatePartyPage,
  })),
);
const GuestPartyPage = lazy(() =>
  import("../routes/guest-party-page").then((module) => ({
    default: module.GuestPartyPage,
  })),
);
const JoinPartyPage = lazy(() =>
  import("../routes/join-party-page").then((module) => ({
    default: module.JoinPartyPage,
  })),
);
const PlaylistDetailPage = lazy(() =>
  import("../routes/playlist-detail-page").then((module) => ({
    default: module.PlaylistDetailPage,
  })),
);
const SharePartyPage = lazy(() =>
  import("../routes/share-party-page").then((module) => ({
    default: module.SharePartyPage,
  })),
);

export function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Aller au contenu
      </a>
      <RouteAccessibility />
      <div id="main-content" tabIndex={-1}>
        <Suspense fallback={<LoadingPage />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin/parties/new"
              element={
                <ProtectedAdminRoute>
                  <CreatePartyPage />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/parties/:partyId/dashboard"
              element={
                <ProtectedAdminRoute>
                  <AdminDashboardPage />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/parties/:partyId/playlists"
              element={
                <ProtectedAdminRoute>
                  <AdminPlaylistsPage />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/parties/:partyId/spotify"
              element={
                <ProtectedAdminRoute>
                  <AdminSpotifyPage />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/parties/:partyId/share"
              element={
                <ProtectedAdminRoute>
                  <SharePartyPage />
                </ProtectedAdminRoute>
              }
            />
            <Route path="/join/:partyCode" element={<JoinPartyPage />} />
            <Route path="/party/:partyId" element={<GuestPartyPage />} />
            <Route path="/party/:partyId/playlists/:playlistId" element={<PlaylistDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </>
  );
}
