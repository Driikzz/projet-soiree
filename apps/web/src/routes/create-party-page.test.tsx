import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { CreatePartyPage } from "./create-party-page";

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <MemoryRouter initialEntries={["/parties/new"]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/parties/new" element={<CreatePartyPage />} />
          <Route path="/organizer/parties/:partyId/playlists" element={<p>Étape ambiances</p>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CreatePartyPage", () => {
  it("creates the first setup step and continues to moods", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          party: {
            id: "11111111-1111-4111-8111-111111111111",
            code: "AA84K2",
            name: "Chez Jules",
            status: "DRAFT",
            activePlaylistId: null,
            scheduledPlaylistId: null,
            stateVersion: 0,
            createdAt: "2026-08-20T19:00:00.000Z",
            location: "Lyon",
            scheduledFor: null,
            activeParticipantCount: 0,
            selectedDeviceId: null,
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByRole("textbox", { name: /Nom de ta soirée/i }), "Chez Jules");
    await user.type(screen.getByRole("textbox", { name: /Lieu/i }), "Lyon");
    await user.click(screen.getByRole("button", { name: /Suivant/i }));

    expect(await screen.findByText("Étape ambiances")).toBeInTheDocument();
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      name: "Chez Jules",
      location: "Lyon",
    });
  });

  it("reveals the real scheduling field when Programmer is selected", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("radio", { name: "Programmer" }));

    expect(screen.getByLabelText("Date et heure")).toHaveAttribute("type", "datetime-local");
  });
});
