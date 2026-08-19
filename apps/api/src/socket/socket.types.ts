import type { ClientToServerEvents, ServerToClientEvents } from "@songfest/shared";
import type { Server } from "socket.io";

export interface SocketIdentity {
  adminId: string | null;
  participant: {
    id: string;
    partyId: string;
  } | null;
}

export interface SocketData {
  identity: SocketIdentity;
  actionTimestamps: number[];
}

export type RotateSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
