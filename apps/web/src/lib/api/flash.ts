import type { FlashState, SubmitFlashTrackRequest } from "@songfest/shared";

import { apiRequest } from "./client";

export const getParticipantFlashState = (partyId: string, signal?: AbortSignal) =>
  apiRequest<{ flash: FlashState }>(`/api/parties/${partyId}/flash`, {
    ...(signal === undefined ? {} : { signal }),
  });

export const submitParticipantFlashTrack = (partyId: string, input: SubmitFlashTrackRequest) =>
  apiRequest<{ flash: FlashState; track: { id: string; title: string } }>(
    `/api/parties/${partyId}/flash/submit`,
    {
      method: "POST",
      body: input,
      csrfCookie: "songfest_guest_csrf",
    },
  );

export const triggerAdminFlashTurn = (partyId: string) =>
  apiRequest<{ flash: FlashState }>(`/api/admin/parties/${partyId}/flash/trigger`, {
    method: "POST",
    csrfCookie: "songfest_admin_csrf",
  });

export const cancelAdminFlashTurn = (partyId: string) =>
  apiRequest<{ flash: FlashState }>(`/api/admin/parties/${partyId}/flash/cancel`, {
    method: "POST",
    csrfCookie: "songfest_admin_csrf",
  });
