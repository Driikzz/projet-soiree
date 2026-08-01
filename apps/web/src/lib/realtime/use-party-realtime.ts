import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { bindRealtimeListeners } from "./realtime-listeners";
import { getQueryKeysForResources } from "./query-resources";
import { realtimeSocket } from "./socket";

export type RealtimeStatus = "connecting" | "connected" | "offline";

const RESYNC_INTERVAL_MS = 60_000;

export const usePartyRealtime = (partyId: string): RealtimeStatus => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  useEffect(() => {
    if (partyId === "") {
      return;
    }

    const invalidateResources = (
      eventPartyId: string,
      resources: Parameters<typeof getQueryKeysForResources>[1],
    ) => {
      if (eventPartyId !== partyId) {
        return;
      }

      for (const queryKey of getQueryKeysForResources(partyId, resources)) {
        void queryClient.invalidateQueries({ queryKey });
      }
    };
    const removeRealtimeListeners = bindRealtimeListeners(realtimeSocket, invalidateResources);

    const subscribe = () => {
      setStatus("connecting");
      realtimeSocket.emit("party:subscribe", { partyId }, (result) => {
        setStatus(result.ok ? "connected" : "offline");
      });
    };
    const handleDisconnect = () => setStatus("offline");
    const handleConnectError = () => setStatus("offline");

    realtimeSocket.on("connect", subscribe);
    realtimeSocket.on("disconnect", handleDisconnect);
    realtimeSocket.on("connect_error", handleConnectError);
    if (realtimeSocket.connected) {
      subscribe();
    } else {
      realtimeSocket.connect();
    }

    const resyncTimer = window.setInterval(() => {
      if (realtimeSocket.connected) {
        realtimeSocket.emit("party:resync-requested", { partyId }, () => undefined);
      }
    }, RESYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(resyncTimer);
      realtimeSocket.emit("party:unsubscribe", { partyId }, () => undefined);
      realtimeSocket.off("connect", subscribe);
      realtimeSocket.off("disconnect", handleDisconnect);
      realtimeSocket.off("connect_error", handleConnectError);
      removeRealtimeListeners();
      realtimeSocket.disconnect();
    };
  }, [partyId, queryClient]);

  return status;
};
