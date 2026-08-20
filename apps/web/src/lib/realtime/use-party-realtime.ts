import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { bindRealtimeListeners } from "./realtime-listeners";
import { getQueryKeysForResources } from "./query-resources";
import { realtimeSocket } from "./socket";

export type RealtimeStatus = "connecting" | "connected" | "offline";

const RESYNC_INTERVAL_MS = 60_000;
const SUBSCRIBE_RETRY_MS = 2_000;
const SUBSCRIBE_ACK_TIMEOUT_MS = 5_000;

export const usePartyRealtime = (partyId: string): RealtimeStatus => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  useEffect(() => {
    if (partyId === "") {
      return;
    }

    let isActive = true;
    let retryTimer: number | undefined;
    let acknowledgeTimer: number | undefined;

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

    const clearSubscriptionTimers = () => {
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      if (acknowledgeTimer !== undefined) window.clearTimeout(acknowledgeTimer);
      retryTimer = undefined;
      acknowledgeTimer = undefined;
    };
    const scheduleSubscriptionRetry = () => {
      if (!isActive || retryTimer !== undefined) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        if (!isActive) return;
        if (realtimeSocket.connected) subscribe();
        else realtimeSocket.connect();
      }, SUBSCRIBE_RETRY_MS);
    };
    const subscribe = () => {
      clearSubscriptionTimers();
      if (!realtimeSocket.connected) return;

      setStatus("connecting");
      acknowledgeTimer = window.setTimeout(() => {
        acknowledgeTimer = undefined;
        if (!isActive) return;
        setStatus("offline");
        scheduleSubscriptionRetry();
      }, SUBSCRIBE_ACK_TIMEOUT_MS);
      realtimeSocket.emit("party:subscribe", { partyId }, (result) => {
        if (acknowledgeTimer !== undefined) window.clearTimeout(acknowledgeTimer);
        acknowledgeTimer = undefined;
        if (!isActive) return;

        if (result.ok) {
          setStatus("connected");
          return;
        }

        setStatus("offline");
        scheduleSubscriptionRetry();
      });
    };
    const handleDisconnect = () => {
      clearSubscriptionTimers();
      setStatus("offline");
    };
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
      isActive = false;
      window.clearInterval(resyncTimer);
      clearSubscriptionTimers();
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
