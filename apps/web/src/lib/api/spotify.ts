import type {
  SpotifyConnectionStatus,
  SpotifyDevice,
  SpotifyPlayback,
  SpotifySearchResponse,
} from "@songfest/shared";

import { apiRequest } from "./client";

interface SpotifyAuthorizationResponse {
  authorizationUrl: string;
}

interface SpotifyDevicesResponse {
  devices: SpotifyDevice[];
}

interface SpotifyDeviceResponse {
  device: SpotifyDevice;
}

export const getSpotifyStatus = (partyId: string, signal?: AbortSignal) =>
  apiRequest<SpotifyConnectionStatus>(`/api/organizer/parties/${partyId}/spotify/status`, {
    ...(signal === undefined ? {} : { signal }),
  });

export const connectSpotify = (partyId: string) =>
  apiRequest<SpotifyAuthorizationResponse>("/api/organizer/spotify/connect", {
    method: "POST",
    body: { partyId },
    csrfCookie: "songfest_admin_csrf",
  });

export const getSpotifyDevices = (partyId: string, signal?: AbortSignal) =>
  apiRequest<SpotifyDevicesResponse>(`/api/organizer/parties/${partyId}/spotify/devices`, {
    ...(signal === undefined ? {} : { signal }),
  });

export const selectSpotifyDevice = (partyId: string, deviceId: string) =>
  apiRequest<SpotifyDeviceResponse>(`/api/organizer/parties/${partyId}/spotify/device`, {
    method: "PUT",
    body: { deviceId },
    csrfCookie: "songfest_admin_csrf",
  });

export const getSpotifyPlayback = (partyId: string, signal?: AbortSignal) =>
  apiRequest<SpotifyPlayback>(`/api/organizer/parties/${partyId}/spotify/playback`, {
    ...(signal === undefined ? {} : { signal }),
  });

export const searchSpotify = (partyId: string, query: string, signal?: AbortSignal) => {
  const search = new URLSearchParams({ partyId, q: query });
  return apiRequest<SpotifySearchResponse>(`/api/spotify/search?${search.toString()}`, {
    ...(signal === undefined ? {} : { signal }),
  });
};
