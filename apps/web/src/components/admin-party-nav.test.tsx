import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AdminPartyNav } from "./admin-party-nav";

describe("AdminPartyNav", () => {
  it("identifies the current administration section", () => {
    render(
      <MemoryRouter initialEntries={["/organizer/parties/party-id/playlists"]}>
        <AdminPartyNav partyId="party-id" partyName="Anniversaire de Léa" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "Navigation organisateur" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Your records" })).toHaveAttribute("href", "/parties");
    expect(screen.getByRole("link", { name: "Ambiances" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "People" })).toHaveAttribute(
      "href",
      "/organizer/parties/party-id/people",
    );
    expect(screen.getByRole("link", { name: "Inviter" })).toHaveAttribute(
      "href",
      "/organizer/parties/party-id/share",
    );
    expect(screen.getByText("Anniversaire de Léa")).toBeInTheDocument();
  });
});
