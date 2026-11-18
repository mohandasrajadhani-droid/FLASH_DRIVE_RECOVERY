import { describe, expect, it } from "vitest";
import { MODULES, ROADMAP, visibleModules } from "./modules";
import { validateCaseNumber, validateMultiLine, validateSingleLine } from "./validation";
import { formatRelative, shortHash, statusLabel } from "./format";
import { api, backendAvailable } from "./api";

describe("module registry", () => {
  it("contains all 14 modules from the specification, with unique ids and paths", () => {
    expect(MODULES).toHaveLength(14);
    expect(new Set(MODULES.map((m) => m.id)).size).toBe(14);
    expect(new Set(MODULES.map((m) => m.path)).size).toBe(14);
  });

  it("only marks Stage-1 deliverables as available", () => {
    const available = MODULES.filter((m) => m.status === "available").map((m) => m.id);
    expect(available.sort()).toEqual(["dashboard", "settings"]);
    expect(MODULES.find((m) => m.id === "cases")?.status).toBe("partial");
  });

  it("every planned module documents its scope", () => {
    for (const m of MODULES.filter((x) => x.status === "planned")) {
      expect(m.planned.length, m.id).toBeGreaterThan(0);
      expect(m.stage, m.id).toBeGreaterThan(1);
    }
  });

  it("easy mode hides professional-only modules", () => {
    const easy = visibleModules("easy").map((m) => m.id);
    for (const id of ["partition", "imaging", "diagnostics", "cases", "reports"]) expect(easy).not.toContain(id);
    expect(visibleModules("professional")).toHaveLength(14);
  });

  it("roadmap lists nine stages in order", () => {
    expect(ROADMAP.map((r) => r.stage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe("client-side validation mirrors backend rules", () => {
  it("single line", () => {
    expect(validateSingleLine("Name", "  ", 10, true)).toMatch(/required/);
    expect(validateSingleLine("Name", "ok", 10, true)).toBeNull();
    expect(validateSingleLine("Name", "a\u0000b", 10, true)).toMatch(/invalid/);
    expect(validateSingleLine("Name", "ആശ", 2, true)).toBeNull();
  });
  it("multi line allows newlines and tabs only", () => {
    expect(validateMultiLine("Notes", "a\nb\tc", 100)).toBeNull();
    expect(validateMultiLine("Notes", "bell\u0007", 100)).toMatch(/invalid/);
  });
  it("case number", () => {
    expect(validateCaseNumber("")).toBeNull();
    expect(validateCaseNumber("fr-2026-0001")).toBeNull();
    for (const bad of ["AB", "-ABC", "AB C", "AB_C", "A".repeat(33)]) expect(validateCaseNumber(bad)).not.toBeNull();
  });
});

describe("formatting", () => {
  it("relative times", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(formatRelative("2026-01-01T11:59:50Z", now)).toBe("just now");
    expect(formatRelative("2026-01-01T11:30:00Z", now)).toBe("30 min ago");
    expect(formatRelative("2026-01-01T09:00:00Z", now)).toBe("3 h ago");
  });
  it("labels and hashes", () => {
    expect(statusLabel("awaiting_customer")).toBe("Awaiting customer");
    expect(shortHash("a".repeat(64))).toBe(`${"a".repeat(10)}…${"a".repeat(6)}`);
  });
});

describe("api outside the desktop shell", () => {
  it("rejects with 'unavailable' instead of returning sample data", async () => {
    expect(backendAvailable()).toBe(false);
    await expect(api.dashboardSummary()).rejects.toMatchObject({ kind: "unavailable" });
    await expect(api.casesList()).rejects.toMatchObject({ kind: "unavailable" });
  });
});
