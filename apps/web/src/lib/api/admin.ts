import type {
  AdminDashboard,
  AssignRewardRequest,
  Reward,
  UpdatePartySettingsRequest,
  UseRewardRequest,
} from "@songfest/shared";

import { apiRequest } from "./client";

export const getAdminDashboard = (partyId: string, signal?: AbortSignal) =>
  apiRequest<AdminDashboard>(`/api/organizer/parties/${partyId}/dashboard`, {
    ...(signal === undefined ? {} : { signal }),
  });

export const updateAdminPartySettings = (partyId: string, input: UpdatePartySettingsRequest) =>
  apiRequest<{ settings: AdminDashboard["settings"] }>(
    `/api/organizer/parties/${partyId}/settings`,
    {
      method: "PATCH",
      body: input,
      csrfCookie: "songfest_admin_csrf",
    },
  );

export const blockAdminParticipant = (partyId: string, participantId: string) =>
  apiRequest<{ participant: { id: string; isBlocked: boolean } }>(
    `/api/organizer/parties/${partyId}/participants/${participantId}/block`,
    {
      method: "POST",
      csrfCookie: "songfest_admin_csrf",
    },
  );

export const assignAdminReward = (input: AssignRewardRequest) =>
  apiRequest<{ reward: Reward }>("/api/organizer/rewards", {
    method: "POST",
    body: input,
    csrfCookie: "songfest_admin_csrf",
  });

export const removeAdminTrack = (partyId: string, trackId: string, reason?: string) =>
  apiRequest<void>(`/api/organizer/parties/${partyId}/tracks/${trackId}`, {
    method: "DELETE",
    body: reason === undefined ? {} : { reason },
    csrfCookie: "songfest_admin_csrf",
  });

export const forceAdminTrack = (partyId: string, trackId: string) =>
  apiRequest<{ track: { id: string } }>(
    `/api/organizer/parties/${partyId}/tracks/${trackId}/force`,
    {
      method: "POST",
      csrfCookie: "songfest_admin_csrf",
    },
  );

export const endAdminParty = (partyId: string) =>
  apiRequest<{ party: { id: string; endedAt: string } }>(`/api/organizer/parties/${partyId}/end`, {
    method: "POST",
    csrfCookie: "songfest_admin_csrf",
  });

export const getParticipantRewards = (signal?: AbortSignal) =>
  apiRequest<{ rewards: Reward[] }>("/api/participant/rewards", {
    ...(signal === undefined ? {} : { signal }),
  });

export const redeemParticipantReward = (input: UseRewardRequest) =>
  apiRequest<{
    rewardId: string;
    partyId: string;
    trackIds: string[];
    playlistId: string | null;
  }>("/api/participant/rewards/use", {
    method: "POST",
    body: input,
    csrfCookie: "songfest_guest_csrf",
  });
