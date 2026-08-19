import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SpotifySearch } from "./spotify-search";

const partyId = "b2619a1d-f9f3-4b68-8943-9ff1e50f350c";
const playlistId = "4b84ae73-a07f-4ed1-b15f-10b807972c62";
const spotifyTrack = {
  spotifyTrackId: "11dFghVXANMlKmJXsNCbNl",
  spotifyUri: "spotify:track:11dFghVXANMlKmJXsNCbNl",
  spotifyUrl: "https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl",
  title: "Around the World",
  artistNames: ["Daft Punk"],
  spotifyArtistIds: ["4tZwfgrHOc3mvqYlEYSvVi"],
  coverUrl: null,
  durationMs: 429_533,
  isExplicit: false,
};

describe("SpotifySearch", () => {
  it("searches then adds only the selected Spotify identifier", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ tracks: [spotifyTrack] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            track: {
              ...spotifyTrack,
              id: "dff44091-e434-4fee-8cd7-3d6eb47aa915",
              playlistId,
              proposedBy: {
                id: "376c52b1-d45d-4f40-87a8-c0c05bfdf0bb",
                nickname: "Camille",
                avatarSeed: "camille",
              },
              voteCount: 0,
              status: "PENDING",
              createdAt: "2026-07-27T00:00:00.000Z",
            },
            quota: {
              baseQuota: 5,
              extraTrackUses: 0,
              used: 1,
              remaining: 4,
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <SpotifySearch
          partyId={partyId}
          playlistId={playlistId}
          remainingQuota={5}
          explicitContentAllowed
          existingTrackIds={new Set()}
        />
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText("Rechercher un titre ou un artiste"), "Daft Punk");
    await user.click(
      await screen.findByRole("button", { name: "Ajouter : Around the World" }, { timeout: 2_000 }),
    );

    expect(await screen.findByText("Around the World — added to rotation.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/playlists/${playlistId}/tracks`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ spotifyTrackId: spotifyTrack.spotifyTrackId }),
      }),
    );
  });
});
