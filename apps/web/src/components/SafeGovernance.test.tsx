import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SafeGovernance from "./SafeGovernance";

describe("SafeGovernance", () => {
  it("explains that governance is not implemented yet", () => {
    render(<SafeGovernance />);

    expect(screen.getByRole("heading", { name: "Governance" })).toBeInTheDocument();
    expect(screen.getByText("Not available yet")).toBeInTheDocument();
    expect(
      screen.getByText(/not implemented in the dashboard yet/i)
    ).toBeInTheDocument();
    expect(screen.getByText("What it is for")).toBeInTheDocument();
  });
});
