import type { SpotifyDevice, SpotifyTrackSnapshot } from "@songfest/shared";
import type { z } from "zod";

import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { getSpotifyJson, sendSpotifyCommand } from "./spotify-api.client.js";
import {
  spotifyDevicesResponseSchema,
  spotifyPlaybackExternalSchema,
  spotifySearchResponseExternalSchema,
  spotifyTrackSchema,
} from "./spotify.external-schemas.js";

type SpotifyExternalTrack = z.output<typeof spotifyTrackSchema>;

const toTrackSnapshot = (track: SpotifyExternalTrack): SpotifyTrackSnapshot => ({
  spotifyTrackId: track.id,
  spotifyUri: track.uri,
  spotifyUrl: track.external_urls.spotify,
  title: track.name,
  artistNames: track.artists.map((artist) => artist.name),
  spotifyArtistIds: track.artists.map((artist) => artist.id),
  coverUrl: track.album.images[0]?.url ?? null,
  durationMs: track.duration_ms,
  isExplicit: track.explicit,
});

export const getSpotifyTrackSnapshot = async (adminId: string, spotifyTrackId: string) => {
  const track = await getSpotifyJson(
    adminId,
    `/tracks/${encodeURIComponent(spotifyTrackId)}`,
    spotifyTrackSchema,
    {
      notFound: {
        code: "TRACK_NOT_FOUND",
        message: "Ce morceau n’est plus disponible dans Spotify.",
      },
    },
  );

  if (track === null || track.is_local) {
    throw new AppError(404, "TRACK_NOT_FOUND", "Ce morceau n’est plus disponible dans Spotify.");
  }

  return toTrackSnapshot(track);
};

const getOwnedParty = async (adminId: string, partyId: string) => {
  const party = await prisma.party.findFirst({
    where: { id: partyId, adminId },
    select: { id: true, adminId: true, status: true, selectedDeviceId: true },
  });

  if (party === null) {
    throw new AppError(404, "PARTY_NOT_FOUND", "Cette soirée n’existe pas.");
  }

  return party;
};

const getParticipantParty = async (participantId: string, partyId: string) => {
  const participant = await prisma.participant.findFirst({
    where: {
      id: participantId,
      partyId,
      isActive: true,
      isBlocked: false,
      party: { status: { in: ["OPEN", "ACTIVE"] } },
    },
    select: {
      party: {
        select: {
          adminId: true,
        },
      },
    },
  });

  if (participant === null) {
    throw new AppError(403, "FORBIDDEN", "Tu ne peux pas rechercher pour cette soirée.");
  }

  return participant.party;
};

const mapDevice = (
  device: {
    id: string;
    name: string;
    type: string;
    is_active: boolean;
    is_restricted: boolean;
    volume_percent: number | null;
  },
  selectedDeviceId: string | null,
): SpotifyDevice => ({
  id: device.id,
  name: device.name,
  type: device.type,
  isActive: device.is_active,
  isRestricted: device.is_restricted,
  volumePercent: device.volume_percent,
  isSelected: device.id === selectedDeviceId,
});

const loadDevices = async (adminId: string, selectedDeviceId: string | null) => {
  const result = await getSpotifyJson(adminId, "/me/player/devices", spotifyDevicesResponseSchema);

  return (
    result?.devices
      .filter((device): device is typeof device & { id: string } => device.id !== null)
      .map((device) => mapDevice(device, selectedDeviceId)) ?? []
  );
};

export const getSpotifyDevices = async (adminId: string, partyId: string) => {
  const party = await getOwnedParty(adminId, partyId);
  return loadDevices(adminId, party.selectedDeviceId);
};

export const selectSpotifyDevice = async (adminId: string, partyId: string, deviceId: string) => {
  const party = await getOwnedParty(adminId, partyId);
  const devices = await loadDevices(adminId, party.selectedDeviceId);
  const device = devices.find((candidate) => candidate.id === deviceId);

  if (device === undefined || device.isRestricted) {
    throw new AppError(
      409,
      "SPOTIFY_DEVICE_UNAVAILABLE",
      "Cet appareil Spotify n’est pas disponible pour la lecture.",
    );
  }

  await prisma.party.update({
    where: { id: partyId },
    data: {
      selectedDeviceId: device.id,
      stateVersion: { increment: 1 },
      auditLogs: {
        create: {
          actorType: "ADMIN",
          adminActorId: adminId,
          action: "spotify.device-selected",
          entityType: "Party",
          entityId: partyId,
          metadata: {
            deviceType: device.type,
          },
        },
      },
    },
  });

  return {
    ...device,
    isSelected: true,
  };
};

export const getSpotifyPlayback = async (adminId: string, partyId: string) => {
  const party = await getOwnedParty(adminId, partyId);
  const playback = await getSpotifyJson(
    adminId,
    "/me/player?additional_types=track",
    spotifyPlaybackExternalSchema,
  );
  const parsedTrack = spotifyTrackSchema.safeParse(playback?.item);
  const track =
    parsedTrack.success && !parsedTrack.data.is_local ? toTrackSnapshot(parsedTrack.data) : null;
  const playbackDevice = playback?.device;
  const device =
    playbackDevice?.id === null || playbackDevice === undefined
      ? null
      : mapDevice({ ...playbackDevice, id: playbackDevice.id }, party.selectedDeviceId);

  return {
    device,
    track,
    progressMs: playback?.progress_ms ?? 0,
    durationMs: track?.durationMs ?? 0,
    isPlaying: playback?.is_playing ?? false,
    serverTimestamp: Date.now(),
  };
};

export const searchSpotifyTracks = async (
  participantId: string,
  partyId: string,
  query: string,
) => {
  const party = await getParticipantParty(participantId, partyId);
  const search = new URLSearchParams({
    q: query,
    type: "track",
    limit: "10",
  });
  const result = await getSpotifyJson(
    party.adminId,
    `/search?${search.toString()}`,
    spotifySearchResponseExternalSchema,
  );

  const tracks: SpotifyTrackSnapshot[] = [];
  for (const item of result?.tracks.items ?? []) {
    const track = spotifyTrackSchema.safeParse(item);
    if (track.success && !track.data.is_local) {
      tracks.push(toTrackSnapshot(track.data));
    }
  }

  return tracks;
};

const playerCommandPath = (path: string, deviceId: string, parameters?: URLSearchParams) => {
  const search = parameters ?? new URLSearchParams();
  search.set("device_id", deviceId);
  return `${path}?${search.toString()}`;
};

export const addTrackToSpotifyQueue = (adminId: string, deviceId: string, spotifyUri: string) => {
  const parameters = new URLSearchParams({ uri: spotifyUri });
  return sendSpotifyCommand(
    adminId,
    playerCommandPath("/me/player/queue", deviceId, parameters),
    { method: "POST" },
    {
      notFound: {
        code: "SPOTIFY_DEVICE_UNAVAILABLE",
        message: "L’appareil Spotify sélectionné n’est plus disponible.",
      },
    },
  );
};

export const startSpotifyTrack = (adminId: string, deviceId: string, spotifyUri: string) =>
  sendSpotifyCommand(
    adminId,
    playerCommandPath("/me/player/play", deviceId),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris: [spotifyUri], position_ms: 0 }),
    },
    {
      notFound: {
        code: "SPOTIFY_DEVICE_UNAVAILABLE",
        message: "L’appareil Spotify sélectionné n’est plus disponible.",
      },
    },
  );

export const pauseSpotifyPlayback = (adminId: string, deviceId: string) =>
  sendSpotifyCommand(adminId, playerCommandPath("/me/player/pause", deviceId), {
    method: "PUT",
  });

export const resumeSpotifyPlayback = (adminId: string, deviceId: string) =>
  sendSpotifyCommand(adminId, playerCommandPath("/me/player/play", deviceId), {
    method: "PUT",
  });

export const skipSpotifyPlayback = (adminId: string, deviceId: string) =>
  sendSpotifyCommand(adminId, playerCommandPath("/me/player/next", deviceId), {
    method: "POST",
  });
