import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const socketMock = vi.hoisted(() => {
  type Listener = (...arguments_: unknown[]) => void;

  const listeners = new Map<string, Set<Listener>>();
  let subscriptionAttempts = 0;

  return {
    socket: {
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn((event: string, ...arguments_: unknown[]) => {
        const acknowledge = arguments_.at(-1);
        if (event === "party:subscribe" && typeof acknowledge === "function") {
          subscriptionAttempts += 1;
          acknowledge({ ok: subscriptionAttempts > 1 });
        }
      }),
      on: vi.fn((event: string, listener: Listener) => {
        const eventListeners = listeners.get(event) ?? new Set<Listener>();
        eventListeners.add(listener);
        listeners.set(event, eventListeners);
      }),
      off: vi.fn((event: string, listener: Listener) => {
        listeners.get(event)?.delete(listener);
      }),
    },
    reset: () => {
      subscriptionAttempts = 0;
      listeners.clear();
    },
    getSubscriptionAttempts: () => subscriptionAttempts,
  };
});

vi.mock("./socket", () => ({ realtimeSocket: socketMock.socket }));

import { usePartyRealtime } from "./use-party-realtime";

describe("usePartyRealtime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    socketMock.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries a refused subscription and returns online after a successful acknowledgement", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePartyRealtime("party-1"), { wrapper });

    expect(result.current).toBe("offline");
    expect(socketMock.getSubscriptionAttempts()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(socketMock.getSubscriptionAttempts()).toBe(2);
    expect(result.current).toBe("connected");
  });
});
