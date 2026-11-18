# FLASHRECOVERY AI

Professional USB flash drive data recovery for Windows 10 / 11 (64-bit), for everyday users and recovery technicians.

> **Status: Stage 1 of 9 — Project foundation.** The application shell, local database, audit trail, settings and basic
> case records are implemented and tested. **No device access or file recovery exists yet** — those modules are visible
> in the navigation, clearly marked *Planned*, and have no controls. See [`FEATURE_STATUS.md`](FEATURE_STATUS.md).

## Principles

- The source device is opened **read-only** by default and is never written to.
- Recovered files go to a **separate destination** drive.
- Unstable media are **imaged first**, then analysed from the image.
- Results are **honest**: no fabricated files, diagnostics or success statistics, and no guaranteed recovery.
- **AI recommends and explains; deterministic engines recover.** Recovery works fully offline; cloud AI is optional and
  consent-based.

## Repository layout

| Path | Purpose |
|---|---|
| `apps/desktop/` | Tauri 2 desktop app — React 19 + TypeScript + Vite + Tailwind 4 UI |
| `apps/desktop/src-tauri/` | Thin Rust backend: Tauri commands, window, security config |
| `recovery-service/` | `flashrecovery-core` — platform-independent Rust library: DB, migrations, audit, settings, cases, validation |
| `database/migrations/` | Versioned, checksummed SQL migrations (embedded in the binary) |
| `engines/` | Evaluation notes for third-party recovery engines (nothing bundled yet) |
| `ai/` | AI Recovery Advisor workspace (Stage 6) |
| `test-data/`, `test-results/` | Test media conventions and recorded test evidence |
| `docs/` | Original project handover and supporting docs |

## Quick start (Windows development machine)

```powershell
# prerequisites: see DEVELOPMENT_GUIDE.md (Rust MSVC toolchain, Node 22+, VS C++ Build Tools, WebView2)
cd apps\desktop
npm install
npm run tauri dev          # run the desktop app with hot reload
```

```powershell
cargo test --workspace     # Rust unit tests (from repository root)
cd apps\desktop; npm test  # frontend tests
npm run tauri build        # Windows installer (.msi / NSIS .exe) — unsigned until Stage 9
```

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — components, data flow, architectural decisions
- [`FEATURE_STATUS.md`](FEATURE_STATUS.md) — what is implemented, partial, or planned
- [`SECURITY.md`](SECURITY.md) — source protection model, threat model, security controls
- [`TEST_PLAN.md`](TEST_PLAN.md) — test strategy and per-stage test plans
- [`LICENSES.md`](LICENSES.md) — third-party engine licence evaluation and dependency inventory
- [`DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md) — setup, workflow, coding rules
- [`CHANGELOG.md`](CHANGELOG.md)

## Important limitations

Ordinary USB block-device access does not expose NAND pages, controller firmware, ECC data or the Flash Translation
Layer. FLASHRECOVERY AI does **not** perform chip-off recovery, controller-level reconstruction, raw NAND ECC correction
or FTL reconstruction. Physically damaged devices should go to a specialist hardware recovery lab.
