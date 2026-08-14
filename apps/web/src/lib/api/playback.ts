import type { PartyPlayback } from "@songfest/shared";

import { apiRequest } from "./client";

export const getParticipantPlayback = (partyId: string, signal?: AbortSignal) =>
  apiRequest<PartyPlayback>(`/api/parties/${partyId}/playback`, {
    ...(signal === undefined ? {} : { signal }),
  });

export const getAdminPlayback = (partyId: string, signal?: AbortSignal) =>
  apiRequest<PartyPlayback>(`/api/organizer/parties/${partyId}/playback`, {
    ...(signal === undefined ? {} : { signal }),
  });

type PlaybackControl = "start" | "pause" | "resume" | "skip";

export const controlPartyPlayback = (partyId: string, control: PlaybackControl) =>
  apiRequest<PartyPlayback>(`/api/organizer/parties/${partyId}/playback/${control}`, {
    method: "POST",
    csrfCookie: "songfest_admin_csrf",
  });

export const addPlaybackSkipVote = (partyId: string) =>
  apiRequest<PartyPlayback>(`/api/parties/${partyId}/playback/skip-vote`, {
    method: "POST",
    csrfCookie: "songfest_guest_csrf",
  });

export const removePlaybackSkipVote = (partyId: string) =>
  apiRequest<PartyPlayback>(`/api/parties/${partyId}/playback/skip-vote`, {
    method: "DELETE",
    csrfCookie: "songfest_guest_csrf",
  });
