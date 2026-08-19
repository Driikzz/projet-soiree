import type { ClientToServerEvents, ServerToClientEvents } from "@songfest/shared";
import { io, type Socket } from "socket.io-client";

export type RotateSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const realtimeSocket: RotateSocket = io({
  autoConnect: false,
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Number.POSITIVE_INFINITY,
  reconnectionDelay: 500,
  reconnectionDelayMax: 5_000,
  timeout: 8_000,
});
