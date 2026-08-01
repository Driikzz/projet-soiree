import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { FlashState } from "@songfest/shared";

import { FlashTurnPanel } from "./flash-turn-panel";

const baseFlash: FlashState = {
  enabled: true,
  intervalMinutes: 60,
  selectionWindowSeconds: 120,
  nextFlashTurnAt: "2026-07-28T23:00:00.000Z",
  isCurrentParticipant: false,
  turn: null,
};

describe("FlashTurnPanel", () => {
  it("announces the next draw when no turn is active", () => {
    render(
      <FlashTurnPanel
        partyId="550e8400-e29b-41d4-a716-446655440000"
        flash={baseFlash}
        explicitContentAllowed={false}
        existingTrackIds={new Set()}
      />,
    );

    expect(screen.getByText("Musique Flash")).toBeInTheDocument();
    expect(screen.getByText(/Prochain tirage vers/)).toBeInTheDocument();
  });

  it("explains that normal playback continues while another participant chooses", () => {
    render(
      <FlashTurnPanel
        partyId="550e8400-e29b-41d4-a716-446655440000"
        flash={{
          ...baseFlash,
          turn: {
            id: "75229c75-8f1c-491c-a96c-03e9d59493f3",
            partyId: "550e8400-e29b-41d4-a716-446655440000",
            participant: {
              id: "a633e19d-86da-4408-a7aa-9ab23de70cf2",
              nickname: "Camille",
              avatarSeed: "camille",
            },
            playlistId: "eea73e91-c1dd-4860-9729-e0dfafdd4587",
            status: "ACTIVE",
            startedAt: "2026-07-28T21:00:00.000Z",
            expiresAt: "2099-07-28T21:02:00.000Z",
            submittedAt: null,
            track: null,
          },
        }}
        explicitContentAllowed={false}
        existingTrackIds={new Set()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Camille choisit le prochain son" })).toBeVisible();
    expect(screen.getByText(/La playlist continue pendant son choix/)).toBeVisible();
  });
});
