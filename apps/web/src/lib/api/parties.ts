import type {
  CreatePartyRequest,
  JoinPartyRequest,
  ParticipantSession,
  PartySummary,
  PublicParty,
} from "@songfest/shared";

import { apiRequest } from "./client";

interface AdminPartyResponse {
  party: PartySummary;
}

interface OwnedPartiesResponse {
  parties: PartySummary[];
}

interface PublicPartyResponse {
  party: PublicParty;
}

export const createParty = (input: CreatePartyRequest) =>
  apiRequest<AdminPartyResponse>("/api/organizer/parties", {
    method: "POST",
    body: input,
    csrfCookie: "songfest_admin_csrf",
  });

export const getAdminParty = (partyId: string, signal?: AbortSignal) =>
  apiRequest<AdminPartyResponse>(`/api/organizer/parties/${partyId}`, {
    ...(signal === undefined ? {} : { signal }),
  });

export const openParty = (partyId: string) =>
  apiRequest<AdminPartyResponse>(`/api/organizer/parties/${partyId}/open`, {
    method: "POST",
    csrfCookie: "songfest_admin_csrf",
  });

export const listOwnedParties = (signal?: AbortSignal) =>
  apiRequest<OwnedPartiesResponse>("/api/organizer/parties", {
    ...(signal === undefined ? {} : { signal }),
  });

export const getPublicParty = (partyCode: string, signal?: AbortSignal) =>
  apiRequest<PublicPartyResponse>(`/api/parties/${partyCode}`, {
    ...(signal === undefined ? {} : { signal }),
  });

export const joinParty = (partyCode: string, input: JoinPartyRequest) =>
  apiRequest<ParticipantSession>(`/api/parties/${partyCode}/join`, {
    method: "POST",
    body: input,
  });

export const getParticipantSession = (signal?: AbortSignal) =>
  apiRequest<ParticipantSession>("/api/participant/me", {
    ...(signal === undefined ? {} : { signal }),
  });

export const leaveParty = () =>
  apiRequest<void>("/api/participant/leave", {
    method: "POST",
    csrfCookie: "songfest_guest_csrf",
  });
