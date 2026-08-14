import type {
  AddTrackRequest,
  ParticipantPlaylistTrack,
  ParticipantTrackQuota,
  TrackFlameBudget,
  TrackVoteResult,
} from "@songfest/shared";

import { apiRequest } from "./client";

interface TrackListResponse {
  tracks: ParticipantPlaylistTrack[];
  flameBudget: TrackFlameBudget;
}

interface AddTrackResponse {
  track: ParticipantPlaylistTrack;
  quota: ParticipantTrackQuota;
}

export const getPlaylistTracks = (playlistId: string, signal?: AbortSignal) =>
  apiRequest<TrackListResponse>(`/api/playlists/${playlistId}/tracks`, {
    ...(signal === undefined ? {} : { signal }),
  });

export const addPlaylistTrack = (playlistId: string, input: AddTrackRequest) =>
  apiRequest<AddTrackResponse>(`/api/playlists/${playlistId}/tracks`, {
    method: "POST",
    body: input,
    csrfCookie: "songfest_guest_csrf",
  });

interface TrackVoteResponse {
  vote: TrackVoteResult;
}

export const addTrackVote = (trackId: string) =>
  apiRequest<TrackVoteResponse>(`/api/tracks/${trackId}/votes`, {
    method: "POST",
    csrfCookie: "songfest_guest_csrf",
  });

export const removeTrackVote = (trackId: string) =>
  apiRequest<TrackVoteResponse>(`/api/tracks/${trackId}/votes`, {
    method: "DELETE",
    csrfCookie: "songfest_guest_csrf",
  });
