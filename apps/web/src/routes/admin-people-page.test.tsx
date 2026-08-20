import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/realtime/use-party-realtime", () => ({
  usePartyRealtime: () => "connected",
}));

import { AdminPeoplePage } from "./admin-people-page";

describe("AdminPeoplePage", () => {
  it("shows participants in a dedicated host destination", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        const body = url.endsWith("/dashboard")
          ? {
              participants: [
                {
                  id: "11111111-1111-4111-8111-111111111111",
                  nickname: "Mina",
                  avatarSeed: "mina",
                  isActive: true,
                  isBlocked: false,
                  joinedAt: "2026-08-20T20:12:00.000Z",
                  contributionCount: 3,
                  rewards: [],
                },
              ],
              recentTracks: [],
              nextTrackId: null,
            }
          : {
              party: {
                id: "22222222-2222-4222-8222-222222222222",
                code: "AA84K2",
                name: "Lucas’ Place",
                status: "ACTIVE",
                activePlaylistId: null,
                scheduledPlaylistId: null,
                stateVersion: 2,
                createdAt: "2026-08-20T19:00:00.000Z",
                location: null,
                scheduledFor: null,
                activeParticipantCount: 1,
                selectedDeviceId: null,
              },
            };

        return Promise.resolve(
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <MemoryRouter
        initialEntries={["/organizer/parties/22222222-2222-4222-8222-222222222222/people"]}
      >
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/organizer/parties/:partyId/people" element={<AdminPeoplePage />} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "La soirée, c’est eux." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Mina" })).toBeVisible();
    expect(screen.getByText(/3 tracks · entré à/)).toBeVisible();
    expect(screen.getByRole("link", { name: "People" })).toHaveAttribute("aria-current", "page");
  });
});
