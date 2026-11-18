import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}

describe("application shell (no backend)", () => {
  it("renders the sidebar, header and overview", async () => {
    renderAt("#/");
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByText("Recovery Wizard")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Interface mode" })).toBeInTheDocument();
  });

  it("shows an explicit backend notice instead of fake numbers", async () => {
    renderAt("#/");
    expect(await screen.findByText("Desktop backend not connected")).toBeInTheDocument();
    expect(screen.getByText("Detection arrives in Stage 2")).toBeInTheDocument();
  });

  it("planned modules state they are not implemented and offer no controls", async () => {
    renderAt("#/quick");
    expect(await screen.findByText("Not available in this build")).toBeInTheDocument();
    expect(screen.getByText(/Planned · Stage 4/)).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(within(main).queryAllByRole("button")).toHaveLength(0);
  });

  it("easy mode (default) redirects professional-only routes to the overview", async () => {
    renderAt("#/imaging");
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Main" })).queryByText("Disk Imaging")).toBeNull();
  });
});
