import { selectNextTrack, type PartyPlayback, type SelectionReason } from "@songfest/shared";

import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import {
  publishAdminNotification,
  publishPlaybackUpdated,
  publishPlaylistActivated,
  publishTrackPlayed,
  publishTrackPlaying,
  publishTrackSelected,
} from "../../socket/realtime-publisher.js";
import {
  addTrackToSpotifyQueue,
  getSpotifyPlayback,
  pauseSpotifyPlayback,
  resumeSpotifyPlayback,
  skipSpotifyPlayback,
  startSpotifyTrack,
} from "../spotify/spotify.service.js";
import { playlistTrackSelect, toPlaylistTrack } from "../tracks/track.service.js";
import { didObservedTrackChange, shouldPrepareNextTrack } from "./playback-policy.js";

const activeSynchronizations = new Set<string>();

const getAutomationParty = (partyId: string) =>
  prisma.party.findFirst({
    where: { id: partyId, status: "ACTIVE" },
    select: {
      id: true,
      adminId: true,
      activePlaylistId: true,
      scheduledPlaylistId: true,
      selectedDeviceId: true,
    },
  });

const getControllableParty = async (adminId: string, partyId: string) => {
  const party = await prisma.party.findFirst({
    where: { id: partyId, adminId },
    select: {
      id: true,
      status: true,
      activePlaylistId: true,
      selectedDeviceId: true,
      playbackState: {
        select: {
          currentTrackId: true,
        },
      },
    },
  });

  if (party === null) {
    throw new AppError(404, "PARTY_NOT_FOUND", "Cette soirée n’existe pas.");
  }
  if (party.activePlaylistId === null) {
    throw new AppError(409, "PLAYBACK_NOT_READY", "Choisis d’abord une playlist active.");
  }
  if (party.selectedDeviceId === null) {
    throw new AppError(409, "SPOTIFY_DEVICE_UNAVAILABLE", "Choisis d’abord un appareil Spotify.");
  }

  return {
    ...party,
    activePlaylistId: party.activePlaylistId,
    selectedDeviceId: party.selectedDeviceId,
  };
};

interface ObservedPlayback {
  spotifyTrackId: string | null;
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
}

const reconcileObservedPlayback = async (partyId: string, observed: ObservedPlayback) => {
  const result = await prisma.$transaction(async (transaction) => {
    const [party, playbackState, observedTrack] = await Promise.all([
      transaction.party.findUniqueOrThrow({
        where: { id: partyId },
        select: {
          activePlaylistId: true,
          scheduledPlaylistId: true,
        },
      }),
      transaction.playbackState.findUniqueOrThrow({
        where: { partyId },
        select: {
          currentTrackId: true,
          queuedTrackId: true,
          lockedNextTrackId: true,
          spotifyTrackId: true,
        },
      }),
      observed.spotifyTrackId === null
        ? null
        : transaction.playlistTrack.findFirst({
            where: {
              spotifyTrackId: observed.spotifyTrackId,
              status: { in: ["SELECTED", "QUEUED", "PLAYING"] },
              playlist: { partyId },
            },
            orderBy: { queuedAt: "desc" },
            select: {
              id: true,
              status: true,
              sequenceGroupId: true,
              sequencePosition: true,
            },
          }),
    ]);

    const now = new Date();
    const trackChanged = didObservedTrackChange(
      playbackState.spotifyTrackId,
      observed.spotifyTrackId,
    );
    const completedTrackId =
      trackChanged && playbackState.currentTrackId !== observedTrack?.id
        ? playbackState.currentTrackId
        : null;

    if (completedTrackId !== null) {
      await transaction.playlistTrack.updateMany({
        where: {
          id: completedTrackId,
          status: "PLAYING",
        },
        data: {
          status: "PLAYED",
          playedAt: now,
        },
      });
    }

    const hasNoCurrentPlayback =
      playbackState.spotifyTrackId === null && observed.spotifyTrackId === null;
    let activatedPlaylistId: string | null = null;
    if ((trackChanged || hasNoCurrentPlayback) && party.scheduledPlaylistId !== null) {
      activatedPlaylistId = party.scheduledPlaylistId;
      await transaction.partyPlaylist.update({
        where: { id: activatedPlaylistId },
        data: { activatedAt: now },
      });
    }

    const startedTrackId =
      observedTrack !== null && observedTrack.status !== "PLAYING" ? observedTrack.id : null;
    if (startedTrackId !== null) {
      await transaction.playlistTrack.update({
        where: { id: startedTrackId },
        data: {
          status: "PLAYING",
          playingAt: now,
        },
      });
    }

    const queuedTrackStarted =
      observedTrack !== null && playbackState.queuedTrackId === observedTrack.id;
    const sequenceCompanion =
      startedTrackId !== null &&
      observedTrack?.sequenceGroupId !== null &&
      observedTrack?.sequencePosition === 1
        ? await transaction.playlistTrack.findFirst({
            where: {
              sequenceGroupId: observedTrack.sequenceGroupId,
              sequencePosition: 2,
              status: "PENDING",
            },
            select: { id: true },
          })
        : null;
    const lockedTrackStarted =
      observedTrack !== null && playbackState.lockedNextTrackId === observedTrack.id;
    await transaction.playbackState.update({
      where: { partyId },
      data: {
        currentTrackId: observedTrack?.id ?? null,
        ...(queuedTrackStarted ? { queuedTrackId: null } : {}),
        ...(sequenceCompanion !== null
          ? { lockedNextTrackId: sequenceCompanion.id }
          : lockedTrackStarted
            ? { lockedNextTrackId: null }
            : {}),
        spotifyTrackId: observed.spotifyTrackId,
        progressMs: observed.progressMs,
        durationMs: observed.durationMs,
        isPlaying: observed.isPlaying,
        lastSpotifySyncAt: now,
      },
    });

    const playbackIdentityChanged = playbackState.currentTrackId !== (observedTrack?.id ?? null);
    if (playbackIdentityChanged || activatedPlaylistId !== null) {
      await transaction.party.update({
        where: { id: partyId },
        data: {
          ...(activatedPlaylistId === null
            ? {}
            : {
                activePlaylistId: activatedPlaylistId,
                scheduledPlaylistId: null,
              }),
          stateVersion: { increment: 1 },
          auditLogs: {
            create: [
              ...(completedTrackId === null
                ? []
                : [
                    {
                      actorType: "SYSTEM" as const,
                      action: "track.played",
                      entityType: "PlaylistTrack",
                      entityId: completedTrackId,
                    },
                  ]),
              ...(startedTrackId === null
                ? []
                : [
                    {
                      actorType: "SYSTEM" as const,
                      action: "track.playing",
                      entityType: "PlaylistTrack",
                      entityId: startedTrackId,
                    },
                  ]),
              ...(activatedPlaylistId === null
                ? []
                : [
                    {
                      actorType: "SYSTEM" as const,
                      action: "playlist.activated-after-track",
                      entityType: "PartyPlaylist",
                      entityId: activatedPlaylistId,
                    },
                  ]),
            ],
          },
        },
      });
    }

    return {
      currentTrackId: observedTrack?.id ?? null,
      queuedTrackId: queuedTrackStarted ? null : playbackState.queuedTrackId,
      completedTrackId,
      startedTrackId,
      activatedPlaylistId,
    };
  });

  if (result.completedTrackId !== null) {
    void publishTrackPlayed(result.completedTrackId);
  }
  if (result.startedTrackId !== null) {
    void publishTrackPlaying(result.startedTrackId);
  }
  if (result.activatedPlaylistId !== null) {
    void publishPlaylistActivated(result.activatedPlaylistId);
  }

  return result;
};

const reserveNextTrack = async (
  partyId: string,
  activePlaylistId: string,
  scheduledPlaylistId: string | null,
) => {
  const playback = await prisma.playbackState.findUniqueOrThrow({
    where: { partyId },
    select: {
      queuedTrackId: true,
      lockedNextTrackId: true,
    },
  });
  if (playback.queuedTrackId !== null) {
    return null;
  }

  const targetPlaylistId = scheduledPlaylistId ?? activePlaylistId;
  const [candidates, recentTracks] = await Promise.all([
    prisma.playlistTrack.findMany({
      where: {
        status: "PENDING",
        isBannedForParty: false,
        playlist: { partyId },
        OR: [
          { playlistId: targetPlaylistId },
          { priorityLevel: { gte: 100 } },
          ...(playback.lockedNextTrackId === null ? [] : [{ id: playback.lockedNextTrackId }]),
        ],
      },
      select: {
        id: true,
        status: true,
        proposedByParticipantId: true,
        spotifyArtistIds: true,
        voteCount: true,
        priorityLevel: true,
        createdAt: true,
        spotifyUri: true,
      },
    }),
    prisma.playlistTrack.findMany({
      where: {
        playlist: { partyId },
        status: { in: ["PLAYING", "PLAYED"] },
      },
      orderBy: [{ playedAt: "desc" }, { playingAt: "desc" }],
      take: 10,
      select: {
        proposedByParticipantId: true,
        spotifyArtistIds: true,
      },
    }),
  ]);

  const selection = selectNextTrack({
    candidates: candidates.map((track) => ({
      id: track.id,
      status: "PENDING",
      proposedByParticipantId: track.proposedByParticipantId,
      spotifyArtistIds: track.spotifyArtistIds,
      voteCount: track.voteCount,
      priorityLevel: track.priorityLevel,
      createdAtMs: track.createdAt.getTime(),
    })),
    recentTracks,
    lockedNextTrackId: playback.lockedNextTrackId,
  });
  if (selection === null) {
    return null;
  }

  const reserved = await prisma.playlistTrack.updateMany({
    where: {
      id: selection.track.id,
      status: "PENDING",
    },
    data: {
      status: "SELECTED",
      selectedAt: new Date(),
    },
  });
  if (reserved.count === 0) {
    return null;
  }

  const track = candidates.find((candidate) => candidate.id === selection.track.id);
  return track === undefined
    ? null
    : {
        id: track.id,
        spotifyUri: track.spotifyUri,
        reason: selection.reason,
      };
};

const confirmQueuedTrack = async (partyId: string, trackId: string, reason: SelectionReason) => {
  const now = new Date();
  await prisma.$transaction([
    prisma.playlistTrack.update({
      where: { id: trackId },
      data: {
        status: "QUEUED",
        queuedAt: now,
      },
    }),
    prisma.playbackState.update({
      where: { partyId },
      data: {
        queuedTrackId: trackId,
        lastQueueCommandAt: now,
      },
    }),
    prisma.party.update({
      where: { id: partyId },
      data: {
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: "SYSTEM",
            action: "track.queued",
            entityType: "PlaylistTrack",
            entityId: trackId,
            metadata: { reason },
          },
        },
      },
    }),
  ]);
};

const releaseTrackReservation = async (trackId: string) => {
  await prisma.playlistTrack.updateMany({
    where: {
      id: trackId,
      status: "SELECTED",
    },
    data: {
      status: "PENDING",
      selectedAt: null,
    },
  });
};

export const synchronizePartyPlayback = async (partyId: string) => {
  if (activeSynchronizations.has(partyId)) {
    return;
  }
  activeSynchronizations.add(partyId);

  try {
    const party = await getAutomationParty(partyId);
    if (party === null || party.activePlaylistId === null || party.selectedDeviceId === null) {
      return;
    }

    const spotifyPlayback = await getSpotifyPlayback(party.adminId, party.id);
    if (spotifyPlayback.device !== null && spotifyPlayback.device.id !== party.selectedDeviceId) {
      void publishAdminNotification(
        party.id,
        "SPOTIFY_DEVICE_UNAVAILABLE",
        "Spotify joue actuellement sur un autre appareil.",
      );
      return;
    }

    const observedTrackId = spotifyPlayback.track?.spotifyTrackId ?? null;
    const reconciliation = await reconcileObservedPlayback(party.id, {
      spotifyTrackId: observedTrackId,
      progressMs: spotifyPlayback.progressMs,
      durationMs: spotifyPlayback.durationMs,
      isPlaying: spotifyPlayback.isPlaying,
    });

    if (reconciliation.currentTrackId !== null) {
      void publishPlaybackUpdated(party.id, {
        trackId: reconciliation.currentTrackId,
        progressMs: spotifyPlayback.progressMs,
        durationMs: spotifyPlayback.durationMs,
        isPlaying: spotifyPlayback.isPlaying,
        serverTimestamp: spotifyPlayback.serverTimestamp,
      });
    }

    if (
      !shouldPrepareNextTrack({
        hasQueuedTrack: reconciliation.queuedTrackId !== null,
        observedTrackId,
        progressMs: spotifyPlayback.progressMs,
        durationMs: spotifyPlayback.durationMs,
        isPlaying: spotifyPlayback.isPlaying,
      })
    ) {
      return;
    }

    const currentParty = await getAutomationParty(party.id);
    if (currentParty === null || currentParty.activePlaylistId === null) {
      return;
    }
    const nextTrack = await reserveNextTrack(
      party.id,
      currentParty.activePlaylistId,
      currentParty.scheduledPlaylistId,
    );
    if (nextTrack === null) {
      return;
    }

    void publishTrackSelected(nextTrack.id);
    try {
      if (observedTrackId === null) {
        await startSpotifyTrack(party.adminId, party.selectedDeviceId, nextTrack.spotifyUri);
      } else {
        await addTrackToSpotifyQueue(party.adminId, party.selectedDeviceId, nextTrack.spotifyUri);
      }
      await confirmQueuedTrack(party.id, nextTrack.id, nextTrack.reason);
    } catch (error) {
      await releaseTrackReservation(nextTrack.id);
      void publishAdminNotification(
        party.id,
        "SPOTIFY_REQUEST_FAILED",
        "Le prochain morceau n’a pas pu être envoyé à Spotify.",
      );
      throw error;
    }
  } finally {
    activeSynchronizations.delete(partyId);
  }
};

const loadPlaybackSnapshot = async (partyId: string): Promise<PartyPlayback> => {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: {
      activePlaylistId: true,
      scheduledPlaylistId: true,
      playbackState: {
        select: {
          currentTrack: { select: playlistTrackSelect },
          queuedTrack: { select: playlistTrackSelect },
          progressMs: true,
          durationMs: true,
          isPlaying: true,
          lastSpotifySyncAt: true,
        },
      },
    },
  });
  if (party?.playbackState === null || party === null) {
    throw new AppError(404, "PARTY_NOT_FOUND", "Cette soirée n’existe pas.");
  }

  return {
    currentTrack:
      party.playbackState.currentTrack === null
        ? null
        : toPlaylistTrack(party.playbackState.currentTrack),
    queuedTrack:
      party.playbackState.queuedTrack === null
        ? null
        : toPlaylistTrack(party.playbackState.queuedTrack),
    activePlaylistId: party.activePlaylistId,
    scheduledPlaylistId: party.scheduledPlaylistId,
    progressMs: party.playbackState.progressMs,
    durationMs: party.playbackState.durationMs,
    isPlaying: party.playbackState.isPlaying,
    lastSyncedAt: party.playbackState.lastSpotifySyncAt?.toISOString() ?? null,
    serverTimestamp: party.playbackState.lastSpotifySyncAt?.getTime() ?? Date.now(),
  };
};

export const getParticipantPlayback = async (participantId: string, partyId: string) => {
  const participant = await prisma.participant.findFirst({
    where: {
      id: participantId,
      partyId,
      isActive: true,
      isBlocked: false,
    },
    select: { id: true },
  });
  if (participant === null) {
    throw new AppError(403, "FORBIDDEN", "Tu n’appartiens pas à cette soirée.");
  }

  return loadPlaybackSnapshot(partyId);
};

export const getAdminPlayback = async (adminId: string, partyId: string) => {
  const party = await prisma.party.findFirst({
    where: { id: partyId, adminId },
    select: { id: true },
  });
  if (party === null) {
    throw new AppError(404, "PARTY_NOT_FOUND", "Cette soirée n’existe pas.");
  }

  return loadPlaybackSnapshot(partyId);
};

export const startPartyPlayback = async (adminId: string, partyId: string) => {
  const party = await getControllableParty(adminId, partyId);
  if (party.status === "ENDED") {
    throw new AppError(409, "PLAYBACK_NOT_READY", "Cette soirée est terminée.");
  }
  if (party.status === "DRAFT") {
    throw new AppError(409, "PLAYBACK_NOT_READY", "Ouvre d’abord les entrées de la soirée.");
  }

  if (party.status !== "ACTIVE") {
    await prisma.party.update({
      where: { id: partyId },
      data: {
        status: "ACTIVE",
        startedAt: new Date(),
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: "ADMIN",
            adminActorId: adminId,
            action: "playback.started",
            entityType: "Party",
            entityId: partyId,
          },
        },
      },
    });
  }

  try {
    await synchronizePartyPlayback(partyId);
  } catch (error) {
    if (party.status !== "ACTIVE") {
      await prisma.party.update({
        where: { id: partyId },
        data: {
          status: party.status,
          startedAt: null,
          stateVersion: { increment: 1 },
        },
      });
    }
    throw error;
  }
  return loadPlaybackSnapshot(partyId);
};

export const pausePartyPlayback = async (adminId: string, partyId: string) => {
  const party = await getControllableParty(adminId, partyId);
  if (party.status !== "ACTIVE") {
    throw new AppError(409, "PLAYBACK_NOT_READY", "La soirée n’est pas encore lancée.");
  }
  await pauseSpotifyPlayback(adminId, party.selectedDeviceId);
  await prisma.playbackState.update({
    where: { partyId },
    data: { isPlaying: false },
  });
  return loadPlaybackSnapshot(partyId);
};

export const resumePartyPlayback = async (adminId: string, partyId: string) => {
  const party = await getControllableParty(adminId, partyId);
  if (party.status !== "ACTIVE") {
    throw new AppError(409, "PLAYBACK_NOT_READY", "La soirée n’est pas encore lancée.");
  }
  await resumeSpotifyPlayback(adminId, party.selectedDeviceId);
  await prisma.playbackState.update({
    where: { partyId },
    data: { isPlaying: true, lastSpotifySyncAt: new Date() },
  });
  return loadPlaybackSnapshot(partyId);
};

export const skipPartyPlayback = async (adminId: string, partyId: string) => {
  const party = await getControllableParty(adminId, partyId);
  if (party.status !== "ACTIVE") {
    throw new AppError(409, "PLAYBACK_NOT_READY", "La soirée n’est pas encore lancée.");
  }
  await skipSpotifyPlayback(adminId, party.selectedDeviceId);

  const currentTrackId = party.playbackState?.currentTrackId;
  if (currentTrackId !== null && currentTrackId !== undefined) {
    const now = new Date();
    await prisma.$transaction([
      prisma.playlistTrack.updateMany({
        where: {
          id: currentTrackId,
          status: "PLAYING",
        },
        data: {
          status: "SKIPPED",
          playedAt: now,
        },
      }),
      prisma.playbackState.update({
        where: { partyId },
        data: {
          currentTrackId: null,
          spotifyTrackId: null,
          progressMs: 0,
          isPlaying: true,
        },
      }),
      prisma.party.update({
        where: { id: partyId },
        data: {
          stateVersion: { increment: 1 },
          auditLogs: {
            create: {
              actorType: "ADMIN",
              adminActorId: adminId,
              action: "playback.skipped",
              entityType: "Party",
              entityId: partyId,
            },
          },
        },
      }),
    ]);
  }

  return loadPlaybackSnapshot(partyId);
};
