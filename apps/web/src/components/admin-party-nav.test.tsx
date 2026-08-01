import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AdminPartyNav } from "./admin-party-nav";

describe("AdminPartyNav", () => {
  it("identifies the current administration section", () => {
    render(
      <MemoryRouter initialEntries={["/admin/parties/party-id/playlists"]}>
        <AdminPartyNav partyId="party-id" partyName="Anniversaire de Léa" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "Navigation organisateur" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Playlists" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Anniversaire de Léa")).toBeInTheDocument();
  });
});
