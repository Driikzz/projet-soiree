import type {
  FlashTurn,
  PartySettings,
  PlaybackUpdate,
  PlaybackSkipVoteUpdate,
  RealtimeResource,
  Reward,
} from "@songfest/shared";

import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { getPartyRoom } from "./party-room.js";
import type { SongFestSocketServer } from "./socket.types.js";

interface PartyEventContext {
  partyId: string;
  version: number;
}

let socketServer: SongFestSocketServer | undefined;

export const registerRealtimePublisher = (io: SongFestSocketServer) => {
  socketServer = io;
};

const getPartyContext = async (partyId: string): Promise<PartyEventContext | null> => {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { id: true, stateVersion: true },
  });

  return party === null ? null : { partyId: party.id, version: party.stateVersion };
};

const getPlaylistContext = async (playlistId: string): Promise<PartyEventContext | null> => {
  const playlist = await prisma.partyPlaylist.findUnique({
    where: { id: playlistId },
    select: {
      party: {
        select: { id: true, stateVersion: true },
      },
    },
  });

  return playlist === null
    ? null
    : { partyId: playlist.party.id, version: playlist.party.stateVersion };
};

const getTrackContext = async (trackId: string): Promise<PartyEventContext | null> => {
  const track = await prisma.playlistTrack.findUnique({
    where: { id: trackId },
    select: {
      playlist: {
        select: {
          party: {
            select: { id: true, stateVersion: true },
          },
        },
      },
    },
  });

  return track === null
    ? null
    : { partyId: track.playlist.party.id, version: track.playlist.party.stateVersion };
};

const createEnvelope = <T>(context: PartyEventContext, data: T) => ({
  partyId: context.partyId,
  version: context.version,
  occurredAt: Date.now(),
  data,
});

const runPublish = async (
  action: () => Promise<void>,
  details: Record<string, string>,
): Promise<void> => {
  if (socketServer === undefined) {
    return;
  }

  try {
    await action();
  } catch (error) {
    logger.warn({ error, ...details }, "Realtime notification failed");
  }
};

export const publishPartyResync = (
  partyId: string,
  resources: readonly RealtimeResource[],
): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPartyContext(partyId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(partyId))
        .emit("state:resync-required", createEnvelope(context, { resources }));
    },
    { partyId, event: "state:resync-required" },
  );

export const publishParticipantJoined = (partyId: string, participantId: string): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPartyContext(partyId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(partyId))
        .emit("party:participant-joined", createEnvelope(context, { id: participantId }));
    },
    { partyId, participantId, event: "party:participant-joined" },
  );

export const publishParticipantLeft = (partyId: string, participantId: string): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPartyContext(partyId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(partyId))
        .emit("party:participant-left", createEnvelope(context, { id: participantId }));
    },
    { partyId, participantId, event: "party:participant-left" },
  );

export const publishPlaylistCreated = (partyId: string, playlistId: string): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPartyContext(partyId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(partyId))
        .emit("playlist:created", createEnvelope(context, { id: playlistId }));
    },
    { partyId, playlistId, event: "playlist:created" },
  );

export const publishPlaylistUpdated = (playlistId: string): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPlaylistContext(playlistId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(context.partyId))
        .emit("playlist:updated", createEnvelope(context, { id: playlistId }));
    },
    { playlistId, event: "playlist:updated" },
  );

export const publishPlaylistActivated = (playlistId: string): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPlaylistContext(playlistId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(context.partyId))
        .emit("playlist:activated", createEnvelope(context, { id: playlistId }));
    },
    { playlistId, event: "playlist:activated" },
  );

export const publishTrackAdded = (playlistId: string, trackId: string): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPlaylistContext(playlistId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(context.partyId))
        .emit("track:added", createEnvelope(context, { id: trackId }));
    },
    { playlistId, trackId, event: "track:added" },
  );

export const publishTrackVoteUpdated = (trackId: string, voteCount: number): Promise<void> =>
  runPublish(
    async () => {
      const context = await getTrackContext(trackId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(context.partyId))
        .emit("track:vote-updated", createEnvelope(context, { id: trackId, voteCount }));
    },
    { trackId, event: "track:vote-updated" },
  );

export const publishPlaylistVoteUpdated = (
  playlistId: string,
  voteCount: number,
  scheduled: boolean,
): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPlaylistContext(playlistId);
      if (context === null || socketServer === undefined) {
        return;
      }

      const room = getPartyRoom(context.partyId);
      socketServer
        .to(room)
        .emit("playlist:vote-updated", createEnvelope(context, { id: playlistId, voteCount }));
      if (scheduled) {
        socketServer
          .to(room)
          .emit("playlist:scheduled", createEnvelope(context, { id: playlistId }));
      }
    },
    { playlistId, event: "playlist:vote-updated" },
  );

export const publishPlaylistScheduled = (playlistId: string): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPlaylistContext(playlistId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(context.partyId))
        .emit("playlist:scheduled", createEnvelope(context, { id: playlistId }));
    },
    { playlistId, event: "playlist:scheduled" },
  );

export const publishTrackSelected = (trackId: string): Promise<void> =>
  runPublish(
    async () => {
      const context = await getTrackContext(trackId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(context.partyId))
        .emit("track:selected", createEnvelope(context, { id: trackId }));
    },
    { trackId, event: "track:selected" },
  );

export const publishTrackPlaying = (trackId: string): Promise<void> =>
  runPublish(
    async () => {
      const context = await getTrackContext(trackId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(context.partyId))
        .emit("track:playing", createEnvelope(context, { id: trackId }));
    },
    { trackId, event: "track:playing" },
  );

export const publishTrackPlayed = (trackId: string): Promise<void> =>
  runPublish(
    async () => {
      const context = await getTrackContext(trackId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(context.partyId))
        .emit("track:played", createEnvelope(context, { id: trackId }));
    },
    { trackId, event: "track:played" },
  );

export const publishPlaybackUpdated = (partyId: string, playback: PlaybackUpdate): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPartyContext(partyId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(partyId))
        .emit("playback:updated", createEnvelope(context, playback));
    },
    { partyId, event: "playback:updated" },
  );

export const publishPlaybackSkipVoteUpdated = (
  partyId: string,
  vote: PlaybackSkipVoteUpdate,
): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPartyContext(partyId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(partyId))
        .emit("playback:skip-vote-updated", createEnvelope(context, vote));
    },
    { partyId, trackId: vote.trackId, event: "playback:skip-vote-updated" },
  );

export const publishAdminNotification = (
  partyId: string,
  code: string,
  message: string,
): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPartyContext(partyId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(partyId))
        .emit("admin:notification", createEnvelope(context, { code, message }));
    },
    { partyId, event: "admin:notification" },
  );

export const publishTrackRemoved = (trackId: string): Promise<void> =>
  runPublish(
    async () => {
      const context = await getTrackContext(trackId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(context.partyId))
        .emit("track:removed", createEnvelope(context, { id: trackId }));
    },
    { trackId, event: "track:removed" },
  );

export const publishPartySettingsUpdated = (
  partyId: string,
  settings: PartySettings,
): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPartyContext(partyId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(partyId))
        .emit("party:settings-updated", createEnvelope(context, settings));
    },
    { partyId, event: "party:settings-updated" },
  );

export const publishRewardAssigned = (reward: Reward): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPartyContext(reward.partyId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer.to(getPartyRoom(reward.partyId)).emit(
        "reward:assigned",
        createEnvelope(context, {
          id: reward.id,
          participantId: reward.participantId,
        }),
      );
    },
    { partyId: reward.partyId, rewardId: reward.id, event: "reward:assigned" },
  );

export const publishRewardUsed = (partyId: string, rewardId: string): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPartyContext(partyId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(partyId))
        .emit("reward:used", createEnvelope(context, { id: rewardId }));
    },
    { partyId, rewardId, event: "reward:used" },
  );

const publishFlashTurn = (
  event: "flash:started" | "flash:submitted",
  turn: FlashTurn,
): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPartyContext(turn.partyId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer.to(getPartyRoom(turn.partyId)).emit(event, createEnvelope(context, turn));
    },
    { partyId: turn.partyId, flashTurnId: turn.id, event },
  );

export const publishFlashStarted = (turn: FlashTurn): Promise<void> =>
  publishFlashTurn("flash:started", turn);

export const publishFlashSubmitted = (turn: FlashTurn): Promise<void> =>
  publishFlashTurn("flash:submitted", turn);

const publishFlashReference = (
  event: "flash:expired" | "flash:cancelled" | "flash:played",
  partyId: string,
  flashTurnId: string,
): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPartyContext(partyId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(partyId))
        .emit(event, createEnvelope(context, { id: flashTurnId }));
    },
    { partyId, flashTurnId, event },
  );

export const publishFlashExpired = (partyId: string, flashTurnId: string): Promise<void> =>
  publishFlashReference("flash:expired", partyId, flashTurnId);

export const publishFlashCancelled = (partyId: string, flashTurnId: string): Promise<void> =>
  publishFlashReference("flash:cancelled", partyId, flashTurnId);

export const publishFlashPlayed = (partyId: string, flashTurnId: string): Promise<void> =>
  publishFlashReference("flash:played", partyId, flashTurnId);

export const publishPartyEnded = (partyId: string, endedAt: Date): Promise<void> =>
  runPublish(
    async () => {
      const context = await getPartyContext(partyId);
      if (context === null || socketServer === undefined) {
        return;
      }

      socketServer
        .to(getPartyRoom(partyId))
        .emit("party:ended", createEnvelope(context, { endedAt: endedAt.getTime() }));
    },
    { partyId, event: "party:ended" },
  );

export const disconnectParticipantSockets = (participantId: string) => {
  if (socketServer === undefined) {
    return;
  }

  for (const socket of socketServer.sockets.sockets.values()) {
    if (socket.data.identity.participant?.id === participantId) {
      socket.disconnect(true);
    }
  }
};

export const disconnectPartyParticipantSockets = (partyId: string) => {
  if (socketServer === undefined) {
    return;
  }

  for (const socket of socketServer.sockets.sockets.values()) {
    if (socket.data.identity.participant?.partyId === partyId) {
      socket.disconnect(true);
    }
  }
};
