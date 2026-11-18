# Stage 1 — test results

**Date:** 2026-11-18  **Commit:** see `git log`  **Environment:** Linux x86_64 (Ubuntu 24.04 container), Rust 1.97.0,
Node 22.23.5, WebKitGTK 2.52 (Tauri's Linux WebView). **Windows has not been tested yet** (T1.21 pending).

## Automated

| Check | Result | Log |
|---|---|---|
| `cargo fmt --check` | PASS | `rust.log` |
| `cargo clippy --workspace --all-targets -- -D warnings` | PASS (0 warnings) | `rust.log` |
| `cargo test --workspace` | **29 passed, 0 failed** | `rust.log` |
| `tsc -b` (strict) | PASS | `frontend.log` |
| `vitest run` | **15 passed, 0 failed** | `frontend.log` |
| `vite build` (production) | PASS — JS 725 kB (216 kB gzip), CSS 27 kB | `frontend.log` |
| `tauri build --debug --no-bundle` (full desktop binary) | PASS on Linux | — |

## End-to-end on the real desktop binary (Linux, Xvfb + xdotool)

The actual Tauri binary was launched against a fresh data directory and driven through its UI. Screenshots are real
captures; all values shown come from the app's own SQLite database.

| ID | Scenario | Result | Evidence |
|---|---|---|---|
| T1.18 | First launch creates DB, applies migration 1, records `app.started` | PASS — DB inspected: `schema_migrations=[1 initial_schema]`, audit #1 `app.started` | `screenshots/01-dashboard-easy.png` |
| T1.19 | Switch Easy → Professional; persists across restart; audited | PASS — audit #3 `settings.changed ui.mode {"from":"easy","to":"professional"}` | `02-pro-mode.png`, `07-settings.png` |
| T1.20a | Create case with blank number via form | PASS — `FR-2026-0001` assigned; audit `case.created` holds only the case id | `04-new-case-form.png`, `05-case-created.png` |
| T1.20b | Invalid case number `!!bad number` | PASS — rejected client-side before submission | `06-validation-error.png` |
| T1.06 (E2E) | Edit audit row #3 with an external SQLite client (after dropping its trigger), relaunch | PASS — dashboard shows **Broken — at entry #3: entry contents do not match its hash** | `08-tamper-detected.png`, `08-crop.png` |

## Defects found and fixed during Stage 1 testing

| # | Defect | Fix |
|---|---|---|
| D1 | Blank window in the real app with `freezePrototype: true` (frontend fine in Chromium, no console errors) | Disabled `freezePrototype`; documented as ARCHITECTURE ADR-003 / SECURITY §3 |
| D2 | Native `<select>` rendered white (light theme) in the dark UI | `color-scheme: dark` + custom select styling |
| D3 | Stat cards showed "…" forever when backend unavailable | Show "—" on error |
| D4 | Dashboard did not refresh after a mode change (stale audit count) | Summary reloads when mode changes |
| D5 | Component tests leaked DOM between cases | Explicit RTL `cleanup()` in test setup |

## Not tested (and why)
- **Windows 10/11 build, installer, WebView2 rendering** — no Windows machine in this environment. Checklist in
  `DEVELOPMENT_GUIDE.md` §4.
- Device detection, imaging, recovery — not implemented (Stages 2–4).
