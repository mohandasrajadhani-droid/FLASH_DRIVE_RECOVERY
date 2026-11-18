# Feature status

Legend: ✅ implemented **and** tested · 🟡 partial (stated scope tested) · ⬜ planned (not implemented — UI shows a
"Planned" notice with no controls). A feature is never marked ✅ because its screen exists.

_Last updated: 2026-11-18 — Stage 1 (after independent audit, see `test-results/stage-1-audit/`)._

## Stage 1 — Foundation

| Feature | Status | Evidence |
|---|---|---|
| Monorepo structure, Cargo workspace, Vite/React/TS/Tailwind app | ✅ | builds: see `test-results/stage-1/RESULTS.md` |
| Application shell: sidebar, header, routing, Easy/Professional selector | ✅ | `App.test.tsx`; real-app screenshots 01–02 |
| Overview dashboard (live data only) | ✅ | real-app screenshot 01/02; `summary.rs` tests |
| SQLite database, WAL, checksummed forward-only migrations (line-ending independent) | ✅ | `db.rs` tests (5) |
| Settings (whitelisted, typed, audited) | ✅ | `settings.rs` tests (4); screenshot 07 |
| Audit trail (append-only, hash-chained, verifier, UI viewer) | ✅ | `audit.rs` tests (7); tamper test screenshot 08 |
| Input validation (backend authoritative + client mirror) | ✅ | `validation.rs` tests (5); `lib.test.ts`; screenshot 06 |
| Customer cases — basic CRUD + search/filter | 🟡 | `cases.rs` tests (7); screenshots 04–06. Device/job linking is Stage 7. |
| Least-privilege Tauri capability + strict CSP | ✅ | `capabilities/default.json`, `tauri.conf.json` |
| Fail-safe startup + local error log | ✅ | `applog.rs` test (1); `DatabaseError.test.tsx`; audit screenshot d2 |
| Project documentation | ✅ | this repository |
| Windows build of the desktop app | ⬜ **not yet run** | Built and exercised on Linux only (see RESULTS.md). Must be built on Windows — see DEVELOPMENT_GUIDE §4. |

## Modules (14)

| Module | Easy | Status | Stage |
|---|---|---|---|
| Overview Dashboard | ✓ | ✅ | 1 |
| Connected Devices | ✓ | ⬜ | 2 |
| Recovery Wizard | ✓ | ⬜ | 4 |
| Quick Recovery | ✓ | ⬜ | 4 |
| Deep Recovery | ✓ | ⬜ | 4 |
| Partition Recovery | — | ⬜ | 4 |
| Disk Imaging | — | ⬜ | 3 |
| Recovery Explorer | ✓ | ⬜ | 5 |
| AI Recovery Advisor | ✓ | ⬜ | 6 |
| Diagnostic Center | — | ⬜ | 3 |
| Recovery History | ✓ | ⬜ | 7 |
| Customer Cases | — | 🟡 basic CRUD | 1 → 7 |
| Reports | — | ⬜ | 7 |
| Settings | ✓ | ✅ | 1 |

## Known gaps / follow-ups
- Windows build, installer and WebView2 behaviour not yet verified on Windows hardware.
- `freezePrototype` disabled (ADR-003) — to revisit in Stage 8.
- Production JS bundle is ~725 kB (Recharts); code-splitting can be added when more modules land.
- No ESLint config yet; TypeScript strict mode + clippy `-D warnings` are enforced.
- `chrono` is flagged unmaintained by RustSec (no known vulnerability) — replace in Stage 8.
- Dev-only `picomatch` ReDoS advisory has no patched release yet — re-check in Stage 8.
