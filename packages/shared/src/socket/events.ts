import { z } from "zod";

import type { FlashTurn } from "../schemas/flash.js";
import type { PartySettings, PartySummary } from "../schemas/parties.js";
import { uuidSchema } from "../schemas/common.js";

export interface SocketEventEnvelope<T> {
  partyId: string;
  version: number;
  occurredAt: number;
  data: T;
}

export interface PlaybackUpdate {
  trackId: string;
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
  serverTimestamp: number;
}

export interface EntityReference {
  id: string;
}

export interface VoteUpdate extends EntityReference {
  voteCount: number;
}

export interface PlaybackSkipVoteUpdate {
  trackId: string;
  voteCount: number;
  requiredVotes: number;
}

export const realtimeResourceSchema = z.enum([
  "party",
  "participants",
  "playlists",
  "tracks",
  "playback",
  "rewards",
  "flash",
]);

export const partySocketPayloadSchema = z
  .object({
    partyId: uuidSchema,
  })
  .strict();

export type RealtimeResource = z.infer<typeof realtimeResourceSchema>;
export type PartySocketPayload = z.infer<typeof partySocketPayloadSchema>;

export type SocketActionResult =
  | { ok: true }
  | {
      ok: false;
      error: {
        code: "INVALID_PAYLOAD" | "FORBIDDEN" | "RATE_LIMITED";
        message: string;
      };
    };

export interface ServerToClientEvents {
  "party:joined": (event: SocketEventEnvelope<PartySummary>) => void;
  "party:participant-joined": (event: SocketEventEnvelope<EntityReference>) => void;
  "party:participant-left": (event: SocketEventEnvelope<EntityReference>) => void;
  "party:settings-updated": (event: SocketEventEnvelope<PartySettings>) => void;
  "party:ended": (event: SocketEventEnvelope<{ endedAt: number }>) => void;
  "playlist:created": (event: SocketEventEnvelope<EntityReference>) => void;
  "playlist:updated": (event: SocketEventEnvelope<EntityReference>) => void;
  "playlist:activated": (event: SocketEventEnvelope<EntityReference>) => void;
  "playlist:scheduled": (event: SocketEventEnvelope<EntityReference>) => void;
  "playlist:vote-updated": (event: SocketEventEnvelope<VoteUpdate>) => void;
  "track:added": (event: SocketEventEnvelope<EntityReference>) => void;
  "track:removed": (event: SocketEventEnvelope<EntityReference>) => void;
  "track:vote-updated": (event: SocketEventEnvelope<VoteUpdate>) => void;
  "track:selected": (event: SocketEventEnvelope<EntityReference>) => void;
  "track:playing": (event: SocketEventEnvelope<EntityReference>) => void;
  "track:played": (event: SocketEventEnvelope<EntityReference>) => void;
  "playback:updated": (event: SocketEventEnvelope<PlaybackUpdate>) => void;
  "playback:skip-vote-updated": (event: SocketEventEnvelope<PlaybackSkipVoteUpdate>) => void;
  "reward:assigned": (
    event: SocketEventEnvelope<EntityReference & { participantId: string }>,
  ) => void;
  "reward:used": (event: SocketEventEnvelope<EntityReference>) => void;
  "flash:started": (event: SocketEventEnvelope<FlashTurn>) => void;
  "flash:submitted": (event: SocketEventEnvelope<FlashTurn>) => void;
  "flash:expired": (event: SocketEventEnvelope<EntityReference>) => void;
  "flash:cancelled": (event: SocketEventEnvelope<EntityReference>) => void;
  "flash:played": (event: SocketEventEnvelope<EntityReference>) => void;
  "admin:notification": (event: SocketEventEnvelope<{ code: string; message: string }>) => void;
  "state:resync-required": (
    event: SocketEventEnvelope<{ resources: readonly RealtimeResource[] }>,
  ) => void;
}

export interface ClientToServerEvents {
  "party:subscribe": (
    payload: PartySocketPayload,
    acknowledge: (result: SocketActionResult) => void,
  ) => void;
  "party:unsubscribe": (
    payload: PartySocketPayload,
    acknowledge: (result: SocketActionResult) => void,
  ) => void;
  "party:resync-requested": (
    payload: PartySocketPayload,
    acknowledge: (result: SocketActionResult) => void,
  ) => void;
}
