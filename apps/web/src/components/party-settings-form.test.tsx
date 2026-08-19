import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PartySettings } from "@songfest/shared";

import { PartySettingsForm } from "./party-settings-form";

const settings: PartySettings = {
  defaultTrackQuota: 5,
  flameBudgetPerParticipant: 5,
  maxTrackDurationMs: 480_000,
  replayBlockMinutes: 180,
  minimumPlaylistVotes: 4,
  minimumPlaylistVotePercentage: 40,
  playlistLockMinutes: 15,
  playlistVotesEnabled: true,
  playlistChangeLockedByAdmin: false,
  flashModeEnabled: true,
  flashIntervalMinutes: 60,
  flashSelectionWindowSeconds: 120,
  nextFlashTurnAt: null,
};

describe("PartySettingsForm", () => {
  it("submits typed settings and exposes every switch with a label", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PartySettingsForm settings={settings} isPending={false} onSubmit={onSubmit} />);

    await user.clear(screen.getByRole("spinbutton", { name: "Votes minimum" }));
    await user.type(screen.getByRole("spinbutton", { name: "Votes minimum" }), "6");
    await user.clear(screen.getByRole("spinbutton", { name: "PRESS par participant" }));
    await user.type(screen.getByRole("spinbutton", { name: "PRESS par participant" }), "8");
    await user.click(
      screen.getByRole("checkbox", {
        name: "Autoriser les votes de changement d’ambiance",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Enregistrer les réglages" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          minimumPlaylistVotes: 6,
          flameBudgetPerParticipant: 8,
          playlistVotesEnabled: false,
        }),
        expect.anything(),
      );
    });
  });
});
