import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { App } from "./app";

describe("App accessibility", () => {
  it("provides a skip link and a useful not-found route", async () => {
    vi.stubGlobal("scrollTo", vi.fn());

    render(
      <MemoryRouter initialEntries={["/adresse-inconnue"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Aller au contenu" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(document.querySelector("#main-content")).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("heading", { name: "Cette scène n’existe pas." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revenir à l’accueil" })).toHaveAttribute("href", "/");

    await waitFor(() => {
      expect(document.title).toBe("Page introuvable | SongFest");
    });
  });
});
