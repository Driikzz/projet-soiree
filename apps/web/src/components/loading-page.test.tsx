import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingPage } from "./loading-page";

describe("LoadingPage", () => {
  it("announces loading without exposing decorative skeletons", () => {
    const { container } = render(<LoadingPage />);

    expect(screen.getByRole("status")).toHaveTextContent("On prépare la scène…");
    expect(container.querySelector("main")).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });
});
