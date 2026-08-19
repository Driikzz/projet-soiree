import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { JoinPartyPage } from "./join-party-page";

describe("JoinPartyPage", () => {
  it("explains the party and asks only for a nickname", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            party: {
              id: "b2619a1d-f9f3-4b68-8943-9ff1e50f350c",
              code: "ABC234",
              name: "Anniversaire de Léa",
              status: "OPEN",
              createdAt: "2026-08-19T18:00:00.000Z",
              activePlaylistId: null,
              scheduledPlaylistId: null,
              stateVersion: 1,
              activeParticipantCount: 3,
              participantPreview: [
                { nickname: "Mina", avatarSeed: "mina" },
                { nickname: "Jo", avatarSeed: "jo" },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <MemoryRouter initialEntries={["/join/ABC234"]}>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/join/:partyCode" element={<JoinPartyPage />} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Anniversaire de Léa" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Comment on t’appelle/i })).toBeInTheDocument();
    expect(screen.getByText(/3 people already in/i)).toBeInTheDocument();
    expect(screen.getByText(/Your mark/i)).toBeInTheDocument();
  });
});
