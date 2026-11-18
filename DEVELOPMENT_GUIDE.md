# Development guide

## 1. Prerequisites (Windows 10/11 x64)

1. **Microsoft C++ Build Tools** — Visual Studio Installer → "Desktop development with C++" (MSVC + Windows SDK).
2. **WebView2 Runtime** — preinstalled on Windows 11 and current Windows 10; otherwise install the Evergreen runtime.
3. **Rust** — `rustup` with the MSVC toolchain: `rustup default stable-msvc` (tested with Rust 1.97).
4. **Node.js 22 LTS or newer** (tested with Node 22.23, npm 10.9).
5. Optional: `cargo install cargo-audit` for dependency vulnerability checks.

## 2. First run

```powershell
git clone <repo> FLASHRECOVERY-AI
cd FLASHRECOVERY-AI\apps\desktop
npm install
npm run tauri dev
```

The database is created at `%APPDATA%\ai.flashrecovery.desktop\flashrecovery.db`. Delete it to start fresh (this also
deletes the audit trail — never do this on a technician machine with real cases).

## 3. Everyday commands

| Task | Command (from) |
|---|---|
| Rust tests | `cargo test --workspace` (root) |
| Rust lint | `cargo clippy --workspace --all-targets -- -D warnings` (root) |
| Rust format | `cargo fmt --all` (root) |
| Type-check UI | `npm run typecheck` (`apps/desktop`) |
| UI tests | `npm test` (`apps/desktop`) |
| UI in a browser (no backend) | `npm run dev` → shows "backend not connected" notices by design |
| Dependency inventory | `python scripts/sbom.py` (root) |

## 4. Building the Windows installer

```powershell
cd apps\desktop
npm run tauri build
# output: target\release\bundle\msi\*.msi and target\release\bundle\nsis\*-setup.exe
```

Installers are **unsigned** until Stage 9; Windows SmartScreen will warn. Do not distribute unsigned builds to customers.

### Stage 1 Windows acceptance checklist (T1.21)
- [ ] `cargo test --workspace` and `npm test` pass on Windows.
- [ ] `npm run tauri build` succeeds; installer installs and launches.
- [ ] Overview shows *Local backend*, Audit integrity *Verified*, today's `app.started` event.
- [ ] Switch to Professional → extra modules appear; Settings → Audit log shows `ui.mode easy → professional`.
- [ ] Create a case with a blank case number → `FR-<year>-0001` assigned; invalid number `!!bad` rejected.
- [ ] Record results and screenshots in `test-results/stage-1-windows/`.

## 5. Rules (from the project handover)

1. Inspect the existing project before modifying anything; never overwrite user files without permission.
2. Work in small, independently verifiable stages; never skip tests.
3. No fake functionality; no mock data on production screens unless clearly labelled as demonstration data.
4. A feature is not "implemented" because its UI exists — update `FEATURE_STATUS.md` only with test evidence.
5. Never claim a build or test passed unless it was actually run; record evidence in `test-results/`.

> The handover document received on 2026-11-18 ends mid-sentence at rule 9 ("9. Do"). Rules 9+ are missing — see
> `docs/PROJECT_HANDOVER.md`. Please supply the remainder.

## 6. Adding things

- **New setting:** add a variant to `SettingKey` (`recovery-service/src/settings.rs`) with validation and default; add a test.
- **Schema change:** add `database/migrations/000N_<name>.sql` and register it in `db::MIGRATIONS`. Never edit an applied migration.
- **New command:** implement in the core with validation + tests → thin wrapper in `commands.rs` → register in `lib.rs`
  → typed wrapper in `src/lib/api.ts`.
- **Module goes live:** set its `status` in `src/lib/modules.ts`, add it to `IMPLEMENTED` in `App.tsx`, update tests
  and `FEATURE_STATUS.md`.

## 7. Code conventions
- Rust: `rustfmt` (120 cols), clippy clean with `-D warnings`, `thiserror` errors, no `unwrap()` outside tests.
- Every DB mutation is audited in the same transaction (`audit::append(&tx, …)`).
- TypeScript: strict + `noUncheckedIndexedAccess`; UI talks to the backend only through `lib/api.ts`.
- Audit details must never contain customer personal data values.
