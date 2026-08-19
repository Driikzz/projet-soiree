import type {
  AddTrackRequest,
  ParticipantPlaylistTrack,
  ParticipantTrackQuota,
  TrackFlameBudget,
  TrackVoteResult,
} from "@songfest/shared";

import { apiRequest } from "./client";

export interface TrackListResponse {
  tracks: ParticipantPlaylistTrack[];
  flameBudget: TrackFlameBudget;
}

export const applyTrackVoteResult = (
  current: TrackListResponse | undefined,
  vote: TrackVoteResult,
): TrackListResponse | undefined => {
  if (current === undefined) return undefined;

  return {
    flameBudget: vote.flameBudget,
    tracks: current.tracks.map((track) =>
      track.id === vote.trackId
        ? {
            ...track,
            voteCount: vote.voteCount,
            participantHasVoted: vote.participantHasVoted,
            participantFlameCount: vote.participantFlameCount,
            voteSupporterCount: vote.voteSupporterCount,
            voteScore: vote.voteScore,
          }
        : track,
    ),
  };
};

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
