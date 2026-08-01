import type {
  CreatePlaylistRequest,
  PlaylistChangeState,
  PlaylistSummary,
  PlaylistVoteResult,
  UpdatePlaylistRequest,
} from "@songfest/shared";

import { apiRequest } from "./client";

interface PlaylistListResponse {
  playlists: PlaylistSummary[];
  playlistChange?: PlaylistChangeState;
}

interface PlaylistResponse {
  playlist: PlaylistSummary;
}

export const getAdminPlaylists = (partyId: string, signal?: AbortSignal) =>
  apiRequest<PlaylistListResponse>(`/api/admin/parties/${partyId}/playlists`, {
    ...(signal === undefined ? {} : { signal }),
  });

export const createAdminPlaylist = (partyId: string, input: CreatePlaylistRequest) =>
  apiRequest<PlaylistResponse>(`/api/admin/parties/${partyId}/playlists`, {
    method: "POST",
    body: input,
    csrfCookie: "songfest_admin_csrf",
  });

export const updateAdminPlaylist = (playlistId: string, input: UpdatePlaylistRequest) =>
  apiRequest<PlaylistResponse>(`/api/admin/playlists/${playlistId}`, {
    method: "PATCH",
    body: input,
    csrfCookie: "songfest_admin_csrf",
  });

export const activateAdminPlaylist = (playlistId: string) =>
  apiRequest<PlaylistResponse>(`/api/admin/playlists/${playlistId}/activate`, {
    method: "POST",
    csrfCookie: "songfest_admin_csrf",
  });

export const deleteAdminPlaylist = (playlistId: string) =>
  apiRequest<void>(`/api/admin/playlists/${playlistId}`, {
    method: "DELETE",
    csrfCookie: "songfest_admin_csrf",
  });

export const getParticipantPlaylists = (partyId: string, signal?: AbortSignal) =>
  apiRequest<PlaylistListResponse>(`/api/parties/${partyId}/playlists`, {
    ...(signal === undefined ? {} : { signal }),
  });

interface PlaylistVoteResponse {
  vote: PlaylistVoteResult;
}

export const addPlaylistVote = (playlistId: string) =>
  apiRequest<PlaylistVoteResponse>(`/api/playlists/${playlistId}/votes`, {
    method: "POST",
    csrfCookie: "songfest_guest_csrf",
  });

export const removePlaylistVote = (playlistId: string) =>
  apiRequest<PlaylistVoteResponse>(`/api/playlists/${playlistId}/votes`, {
    method: "DELETE",
    csrfCookie: "songfest_guest_csrf",
  });
