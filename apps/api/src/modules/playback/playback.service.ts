import {
  calculateRequiredSkipVotes,
  selectNextTrack,
  type PartyPlayback,
  type SelectionReason,
} from "@songfest/shared";

import { AppError } from "../../errors/app-error.js";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import {
  publishAdminNotification,
  publishPartyResync,
  publishPlaybackUpdated,
  publishPlaylistActivated,
  publishPlaylistScheduled,
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
import { closeParty } from "../parties/party-lifecycle.service.js";
import {
  didObservedTrackChange,
  selectPlaybackTargetPlaylist,
  shouldPrepareNextTrack,
} from "./playback-policy.js";

const activeSynchronizations = new Set<string>();

const waitForPlaybackAvailability = async (partyId: string) => {
  const deadline = Date.now() + 5_000;
  while (activeSynchronizations.has(partyId) && Date.now() < deadline) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
  }
};

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

export const resolvePlaybackTargetParty = async (partyId: string) => {
  const party = await prisma.party.findFirst({
    where: { id: partyId, status: "ACTIVE" },
    select: {
      id: true,
      adminId: true,
      activePlaylistId: true,
      scheduledPlaylistId: true,
      selectedDeviceId: true,
      playlists: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          createdAt: true,
          _count: {
            select: {
              tracks: {
                where: { status: "PENDING", isBannedForParty: false },
              },
            },
          },
        },
      },
    },
  });
  if (party === null || party.activePlaylistId === null) {
    return party;
  }

  const targetPlaylistId = selectPlaybackTargetPlaylist({
    activePlaylistId: party.activePlaylistId,
    scheduledPlaylistId: party.scheduledPlaylistId,
    playlists: party.playlists.map((playlist) => ({
      id: playlist.id,
      createdAtMs: playlist.createdAt.getTime(),
      pendingTrackCount: playlist._count.tracks,
    })),
  });
  const nextScheduledPlaylistId =
    targetPlaylistId === null || targetPlaylistId === party.activePlaylistId
      ? null
      : targetPlaylistId;
  if (nextScheduledPlaylistId === party.scheduledPlaylistId) {
    return party;
  }

  const updated = await prisma.party.updateMany({
    where: {
      id: party.id,
      scheduledPlaylistId: party.scheduledPlaylistId,
    },
    data: {
      scheduledPlaylistId: nextScheduledPlaylistId,
      stateVersion: { increment: 1 },
    },
  });
  if (updated.count === 0) {
    return getAutomationParty(party.id);
  }

  if (nextScheduledPlaylistId !== null) {
    await prisma.auditLog.create({
      data: {
        partyId: party.id,
        actorType: "SYSTEM",
        action: "playlist.auto-scheduled-after-empty",
        entityType: "PartyPlaylist",
        entityId: nextScheduledPlaylistId,
        metadata: { previousPlaylistId: party.activePlaylistId },
      },
    });
    void publishPlaylistScheduled(nextScheduledPlaylistId);
    void publishAdminNotification(
      party.id,
      "PLAYLIST_AUTO_SCHEDULED",
      "La playlist active est épuisée. La prochaine ambiance prendra automatiquement le relais.",
    );
  }
  void publishPartyResync(party.id, ["party", "playlists", "playback"]);

  return {
    id: party.id,
    adminId: party.adminId,
    activePlaylistId: party.activePlaylistId,
    scheduledPlaylistId: nextScheduledPlaylistId,
    selectedDeviceId: party.selectedDeviceId,
  };
};

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
              playlistId: true,
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
      await transaction.trackSkipVote.deleteMany({
        where: { trackId: completedTrackId },
      });
    }

    const hasNoCurrentPlayback =
      playbackState.spotifyTrackId === null && observed.spotifyTrackId === null;
    const scheduledTrackStarted =
      observedTrack !== null && observedTrack.playlistId === party.scheduledPlaylistId;
    let activatedPlaylistId: string | null = null;
    if (
      (trackChanged || hasNoCurrentPlayback || scheduledTrackStarted) &&
      party.scheduledPlaylistId !== null
    ) {
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
        ...(observed.isPlaying ? { lastPlaybackActivityAt: now } : {}),
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
        spotifyTrackId: true,
        durationMs: true,
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
        spotifyTrackId: track.spotifyTrackId,
        durationMs: track.durationMs,
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

interface ImmediatePlaybackTarget {
  id: string;
  spotifyUri: string;
  spotifyTrackId: string;
  durationMs: number;
  status: "PENDING" | "SELECTED" | "QUEUED";
}

interface ImmediatePlaybackActor {
  action: "flash.playback-started" | "playback.skipped" | "playback.skipped-by-vote";
  actorType: "ADMIN" | "PARTICIPANT" | "SYSTEM";
  adminActorId?: string;
  participantActorId?: string;
}

const getPreparedOrReserveNextTrack = async (
  partyId: string,
  activePlaylistId: string,
  scheduledPlaylistId: string | null,
): Promise<ImmediatePlaybackTarget | null> => {
  const prepared = await prisma.playbackState.findUnique({
    where: { partyId },
    select: {
      queuedTrack: {
        select: {
          id: true,
          spotifyUri: true,
          spotifyTrackId: true,
          durationMs: true,
          status: true,
        },
      },
    },
  });
  if (prepared?.queuedTrack?.status === "QUEUED") {
    return { ...prepared.queuedTrack, status: "QUEUED" };
  }

  const reserved = await reserveNextTrack(partyId, activePlaylistId, scheduledPlaylistId);
  return reserved === null ? null : { ...reserved, status: "SELECTED" };
};

const startTrackImmediately = async (
  partyId: string,
  trackId: string,
  actor: ImmediatePlaybackActor,
  expectedCurrentTrackId?: string,
) => {
  await waitForPlaybackAvailability(partyId);
  if (activeSynchronizations.has(partyId)) {
    throw new AppError(
      409,
      "PLAYBACK_COMMAND_IN_PROGRESS",
      "La lecture est en cours de synchronisation. Réessaie dans un instant.",
    );
  }
  activeSynchronizations.add(partyId);

  try {
    const [party, track] = await Promise.all([
      prisma.party.findUnique({
        where: { id: partyId },
        select: {
          adminId: true,
          status: true,
          selectedDeviceId: true,
          playbackState: {
            select: { currentTrackId: true },
          },
        },
      }),
      prisma.playlistTrack.findFirst({
        where: {
          id: trackId,
          playlist: { partyId },
          status: { in: ["PENDING", "SELECTED", "QUEUED"] },
          isBannedForParty: false,
        },
        select: {
          id: true,
          spotifyUri: true,
          spotifyTrackId: true,
          durationMs: true,
          status: true,
        },
      }),
    ]);
    if (party === null) {
      throw new AppError(404, "PARTY_NOT_FOUND", "Cette soirée n’existe pas.");
    }
    if (party.status !== "ACTIVE" || party.selectedDeviceId === null) {
      throw new AppError(409, "PLAYBACK_NOT_READY", "La lecture Spotify n’est pas prête.");
    }
    if (
      expectedCurrentTrackId !== undefined &&
      party.playbackState?.currentTrackId !== expectedCurrentTrackId
    ) {
      return false;
    }
    if (track === null) {
      throw new AppError(409, "TRACK_NOT_FOUND", "Ce morceau ne peut plus être lancé.");
    }

    try {
      await startSpotifyTrack(party.adminId, party.selectedDeviceId, track.spotifyUri);
    } catch (error) {
      if (track.status === "SELECTED") {
        await releaseTrackReservation(track.id);
      }
      throw error;
    }

    const now = new Date();
    const previousTrackId = await prisma.$transaction(async (transaction) => {
      const playback = await transaction.playbackState.findUniqueOrThrow({
        where: { partyId },
        select: {
          currentTrackId: true,
          queuedTrackId: true,
          lockedNextTrackId: true,
        },
      });

      if (playback.queuedTrackId !== null && playback.queuedTrackId !== track.id) {
        await transaction.playlistTrack.updateMany({
          where: { id: playback.queuedTrackId, status: "QUEUED" },
          data: { status: "PENDING", queuedAt: null },
        });
      }
      if (playback.currentTrackId !== null && playback.currentTrackId !== track.id) {
        await transaction.playlistTrack.updateMany({
          where: { id: playback.currentTrackId, status: "PLAYING" },
          data: { status: "SKIPPED", playedAt: now },
        });
        await transaction.trackSkipVote.deleteMany({
          where: { trackId: playback.currentTrackId },
        });
      }

      await transaction.playlistTrack.update({
        where: { id: track.id },
        data: {
          status: "PLAYING",
          playingAt: now,
        },
      });
      await transaction.playbackState.update({
        where: { partyId },
        data: {
          currentTrackId: track.id,
          queuedTrackId: null,
          ...(playback.lockedNextTrackId === track.id ? { lockedNextTrackId: null } : {}),
          spotifyTrackId: track.spotifyTrackId,
          progressMs: 0,
          durationMs: track.durationMs,
          isPlaying: true,
          lastSpotifySyncAt: now,
          lastPlaybackActivityAt: now,
        },
      });
      await transaction.party.update({
        where: { id: partyId },
        data: {
          stateVersion: { increment: 1 },
          auditLogs: {
            create: {
              actorType: actor.actorType,
              ...(actor.adminActorId === undefined ? {} : { adminActorId: actor.adminActorId }),
              ...(actor.participantActorId === undefined
                ? {}
                : { participantActorId: actor.participantActorId }),
              action: actor.action,
              entityType: "PlaylistTrack",
              entityId: track.id,
              metadata: {
                skippedTrackId: playback.currentTrackId,
              },
            },
          },
        },
      });

      return playback.currentTrackId;
    });

    void publishTrackPlaying(track.id);
    void publishPlaybackUpdated(partyId, {
      trackId: track.id,
      progressMs: 0,
      durationMs: track.durationMs,
      isPlaying: true,
      serverTimestamp: now.getTime(),
    });
    void publishPartyResync(partyId, ["party", "playlists", "tracks", "playback", "flash"]);
    if (previousTrackId !== null) {
      void publishAdminNotification(
        partyId,
        actor.action === "flash.playback-started" ? "FLASH_TRACK_STARTED" : "TRACK_SKIPPED",
        actor.action === "flash.playback-started"
          ? "La Musique Flash a démarré immédiatement."
          : "Le morceau en cours a été passé.",
      );
    }
    return true;
  } finally {
    activeSynchronizations.delete(partyId);
  }
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

    const currentParty = await resolvePlaybackTargetParty(party.id);
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

const loadPlaybackSnapshot = async (
  partyId: string,
  participantId?: string,
): Promise<PartyPlayback> => {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: {
      status: true,
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

  const currentTrackId = party.playbackState.currentTrack?.id ?? null;
  const [activeParticipantCount, skipVoteCount, participantSkipVote] = await Promise.all([
    prisma.participant.count({
      where: { partyId, isActive: true, isBlocked: false },
    }),
    currentTrackId === null
      ? Promise.resolve(0)
      : prisma.trackSkipVote.count({
          where: {
            partyId,
            trackId: currentTrackId,
            participant: { isActive: true, isBlocked: false },
          },
        }),
    currentTrackId === null || participantId === undefined
      ? Promise.resolve(null)
      : prisma.trackSkipVote.findUnique({
          where: {
            trackId_participantId: {
              trackId: currentTrackId,
              participantId,
            },
          },
          select: { id: true },
        }),
  ]);

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
    skipVote: {
      voteCount: skipVoteCount,
      requiredVotes: calculateRequiredSkipVotes(activeParticipantCount),
      participantHasVoted: participantSkipVote !== null,
      isAvailable:
        participantId !== undefined && party.status === "ACTIVE" && currentTrackId !== null,
    },
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

  return loadPlaybackSnapshot(partyId, participantId);
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

interface StartPartyPlaybackOptions {
  closeExistingParty: boolean;
}

const throwActivePartyConflict = async (adminId: string, partyId: string): Promise<never> => {
  const activeParty = await prisma.party.findFirst({
    where: { adminId, status: "ACTIVE", id: { not: partyId } },
    select: { id: true, name: true },
  });

  throw new AppError(
    409,
    "ACTIVE_PARTY_CONFLICT",
    activeParty === null
      ? "Une autre soirée vient d’être lancée. Réessaie."
      : `La soirée « ${activeParty.name} » est encore active.`,
    activeParty === null
      ? undefined
      : { activePartyId: activeParty.id, activePartyName: activeParty.name },
  );
};

export const startPartyPlayback = async (
  adminId: string,
  partyId: string,
  { closeExistingParty }: StartPartyPlaybackOptions = { closeExistingParty: false },
) => {
  const party = await getControllableParty(adminId, partyId);
  if (party.status === "ENDED") {
    throw new AppError(409, "PLAYBACK_NOT_READY", "Cette soirée est terminée.");
  }
  if (party.status === "DRAFT") {
    throw new AppError(409, "PLAYBACK_NOT_READY", "Ouvre d’abord les entrées de la soirée.");
  }

  if (party.status !== "ACTIVE") {
    const activeParty = await prisma.party.findFirst({
      where: { adminId, status: "ACTIVE", id: { not: partyId } },
      select: { id: true, name: true },
    });
    if (activeParty !== null && !closeExistingParty) {
      throw new AppError(
        409,
        "ACTIVE_PARTY_CONFLICT",
        `La soirée « ${activeParty.name} » est encore active.`,
        { activePartyId: activeParty.id, activePartyName: activeParty.name },
      );
    }
    if (activeParty !== null) {
      await closeParty(activeParty.id, {
        actorType: "SYSTEM",
        reason: "REPLACED_BY_NEW_PARTY",
      });
    }

    try {
      await prisma.party.update({
        where: { id: partyId },
        data: {
          status: "ACTIVE",
          startedAt: new Date(),
          endedAt: null,
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
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        await throwActivePartyConflict(adminId, partyId);
      }
      throw error;
    }
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
  const now = new Date();
  await prisma.playbackState.update({
    where: { partyId },
    data: { isPlaying: true, lastSpotifySyncAt: now, lastPlaybackActivityAt: now },
  });
  return loadPlaybackSnapshot(partyId);
};

const skipToNextApplicationTrack = async (
  partyId: string,
  actor: ImmediatePlaybackActor,
  expectedCurrentTrackId?: string,
) => {
  const party = await resolvePlaybackTargetParty(partyId);
  if (party === null || party.activePlaylistId === null || party.selectedDeviceId === null) {
    throw new AppError(409, "PLAYBACK_NOT_READY", "La lecture Spotify n’est pas prête.");
  }

  const nextTrack = await getPreparedOrReserveNextTrack(
    party.id,
    party.activePlaylistId,
    party.scheduledPlaylistId,
  );
  if (nextTrack !== null) {
    return startTrackImmediately(party.id, nextTrack.id, actor, expectedCurrentTrackId);
  }

  const playback = await prisma.playbackState.findUniqueOrThrow({
    where: { partyId },
    select: { currentTrackId: true },
  });
  if (expectedCurrentTrackId !== undefined && playback.currentTrackId !== expectedCurrentTrackId) {
    return false;
  }

  await skipSpotifyPlayback(party.adminId, party.selectedDeviceId);
  if (playback.currentTrackId !== null) {
    const now = new Date();
    await prisma.$transaction([
      prisma.playlistTrack.updateMany({
        where: { id: playback.currentTrackId, status: "PLAYING" },
        data: { status: "SKIPPED", playedAt: now },
      }),
      prisma.trackSkipVote.deleteMany({ where: { trackId: playback.currentTrackId } }),
      prisma.playbackState.update({
        where: { partyId },
        data: {
          currentTrackId: null,
          spotifyTrackId: null,
          progressMs: 0,
          durationMs: 0,
          isPlaying: true,
          lastSpotifySyncAt: now,
          lastPlaybackActivityAt: now,
        },
      }),
      prisma.party.update({
        where: { id: partyId },
        data: {
          stateVersion: { increment: 1 },
          auditLogs: {
            create: {
              actorType: actor.actorType,
              ...(actor.adminActorId === undefined ? {} : { adminActorId: actor.adminActorId }),
              ...(actor.participantActorId === undefined
                ? {}
                : { participantActorId: actor.participantActorId }),
              action: actor.action,
              entityType: "PlaylistTrack",
              entityId: playback.currentTrackId,
            },
          },
        },
      }),
    ]);
  }
  void publishPartyResync(partyId, ["party", "tracks", "playback", "flash"]);
  return true;
};

export const startFlashTrackImmediately = (partyId: string, trackId: string) =>
  startTrackImmediately(partyId, trackId, {
    action: "flash.playback-started",
    actorType: "SYSTEM",
  });

export const skipPartyPlaybackAfterVote = (
  partyId: string,
  currentTrackId: string,
  participantId: string,
) =>
  skipToNextApplicationTrack(
    partyId,
    {
      action: "playback.skipped-by-vote",
      actorType: "PARTICIPANT",
      participantActorId: participantId,
    },
    currentTrackId,
  );

export const skipPartyPlayback = async (adminId: string, partyId: string) => {
  const party = await getControllableParty(adminId, partyId);
  if (party.status !== "ACTIVE") {
    throw new AppError(409, "PLAYBACK_NOT_READY", "La soirée n’est pas encore lancée.");
  }
  await skipToNextApplicationTrack(partyId, {
    action: "playback.skipped",
    actorType: "ADMIN",
    adminActorId: adminId,
  });

  return loadPlaybackSnapshot(partyId);
};
