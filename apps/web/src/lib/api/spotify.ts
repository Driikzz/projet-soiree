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
  apiRequest<SpotifyConnectionStatus>(`/api/admin/parties/${partyId}/spotify/status`, {
    ...(signal === undefined ? {} : { signal }),
  });

export const connectSpotify = (partyId: string) =>
  apiRequest<SpotifyAuthorizationResponse>("/api/admin/spotify/connect", {
    method: "POST",
    body: { partyId },
    csrfCookie: "songfest_admin_csrf",
  });

export const getSpotifyDevices = (partyId: string, signal?: AbortSignal) =>
  apiRequest<SpotifyDevicesResponse>(`/api/admin/parties/${partyId}/spotify/devices`, {
    ...(signal === undefined ? {} : { signal }),
  });

export const selectSpotifyDevice = (partyId: string, deviceId: string) =>
  apiRequest<SpotifyDeviceResponse>(`/api/admin/parties/${partyId}/spotify/device`, {
    method: "PUT",
    body: { deviceId },
    csrfCookie: "songfest_admin_csrf",
  });

export const getSpotifyPlayback = (partyId: string, signal?: AbortSignal) =>
  apiRequest<SpotifyPlayback>(`/api/admin/parties/${partyId}/spotify/playback`, {
    ...(signal === undefined ? {} : { signal }),
  });

export const searchSpotify = (partyId: string, query: string, signal?: AbortSignal) => {
  const search = new URLSearchParams({ partyId, q: query });
  return apiRequest<SpotifySearchResponse>(`/api/spotify/search?${search.toString()}`, {
    ...(signal === undefined ? {} : { signal }),
  });
};
