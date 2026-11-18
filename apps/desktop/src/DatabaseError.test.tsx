import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Backend is running, but the database failed to open at startup: every
// command rejects with the startup error (see src-tauri/src/commands.rs).
const STARTUP_ERROR = {
  kind: "internal",
  message: "internal error: the database could not be opened at startup (integrity check failed). Nothing has been changed.",
};
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: vi.fn(() => Promise.reject(STARTUP_ERROR)),
}));

import App from "./App";

describe("database failed to open at startup", () => {
  it("shows the reason and a database-error badge instead of a healthy state", async () => {
    window.location.hash = "#/";
    render(<App />);
    expect(await screen.findByText(/database could not be opened at startup/)).toBeInTheDocument();
    expect(await screen.findByText("Database error")).toBeInTheDocument();
    expect(screen.queryByText("Local backend")).toBeNull();
    // Mode switching is disabled while the database is unavailable.
    for (const b of screen.getAllByRole("radio")) expect(b).toBeDisabled();
  });
});
