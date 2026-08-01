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
              activePlaylistId: null,
              scheduledPlaylistId: null,
              stateVersion: 1,
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
    expect(screen.getByLabelText("Ton pseudo")).toBeInTheDocument();
    expect(screen.getByText(/Pas de compte à créer/)).toBeInTheDocument();
  });
});
