# Stage 1 — independent technical audit

**Date:** 2026-11-18 · **Scope:** Stage 1 as delivered in `FLASHRECOVERY-AI-stage1.zip` (commit "Stage 1: project
foundation"). No new features were added. **Environment:** Ubuntu 24.04 (Linux, x86_64), Rust 1.97.0, Node 22.23.5,
npm 10.9.9, WebKitGTK 4.1 2.52.6, virtual display (Xvfb). **Windows was not available**; see "Not verified".

## Verdict

**Stage 1 is complete on Linux. It is not complete for Windows** until checklist item T1.21 (DEVELOPMENT_GUIDE §4)
passes on a Windows 10/11 PC. Three critical or high issues were found and fixed. All tests pass after the fixes.

## Results by requirement

| # | Requirement | Result | Evidence |
|---|---|---|---|
| 1 | Application builds | ✅ Linux: clean `npm ci`, `cargo test --locked`, `tsc`, `vite build`, release `tauri build` all succeed. ⬜ Windows: not built (see below). | `release-build-original.log`, `release-build-final.log`, `typecheck.log` |
| 2 | Windows desktop app launches | ⬜ **Not verified.** The release binary launches on Linux. A Windows cross-check was attempted but the Windows Rust standard library could not be downloaded in the audit environment. | screenshot a1 |
| 3 | React ↔ Rust communication | ✅ The real binary showed backend data (audit count, integrity), and UI actions changed the database: mode switch → `settings.changed`, case form → `cases` row + `case.created`. Invalid case number rejected with nothing written. | a1, a2, b2, b3; DB queries below |
| 4 | SQLite persists across restarts | ✅ Case, mode and audit chain survived a normal close **and** a forced kill (`kill -9`); `PRAGMA integrity_check` = ok; chain *Verified*. A database created by the original build opened unchanged in the fixed build. | c1, c2, e2 |
| 5 | Navigation | ✅ All 14 menu items open the right page and title; Easy Mode hides the 5 professional-only modules. | a3 |
| 6 | No fake recovery functionality | ✅ No device access, recovery, scan or sample data exists. 11 unbuilt modules show only "Planned · Stage N" with no controls (also tested in `App.test.tsx`). **Fixed:** the Overview and sidebar stated planned safety rules (read-only access, SHA-256 images) in the present tense; they now name the stage that delivers them. | a3, d2 |
| 7 | Documentation accurate | ✅ after fixes. Corrected: "errors logged locally" (they went to stderr only, which Windows release builds discard), installer output path, test counts. Added the new tests, fixes and dependency findings. | diff of `*.md` |
| 8 | No critical security issues | ✅ after fixes. Parameterised SQL only; no shell, filesystem or HTTP plugins; capability `core:default` only; strict CSP; input validated at the backend. **Fixed:** RUSTSEC-2026-0459 (bundled SQLite). | `cargo-audit.log`, `npm-audit-prod.log` |

## Issues found and fixed

| Severity | Issue | Fix | Test |
|---|---|---|---|
| **High (security)** | `cargo audit`: **RUSTSEC-2026-0459** in `libsqlite3-sys` 0.35.0 (bundled SQLite, CVSS 6.8). | `rusqlite` 0.37 → 0.41.1 (`libsqlite3-sys` 0.39.1, SQLite 3.54.1). No code changes needed. `cargo audit`: 0 vulnerabilities. | all 31 Rust tests + E2E rerun |
| **High (Windows)** | If the database could not be opened (corruption, modified migration, newer schema), setup failed and the app aborted (exit 134) **before any window appeared**. Windows release builds have no console, so the user would see the app vanish with no reason. Reproduced on Linux. | Window now opens; the reason and log-file path are shown; every data command refuses; nothing is written; header shows *Database error*; reason written to `logs/flashrecovery.log`. | `applog.rs` test, `DatabaseError.test.tsx`, screenshot d2; broken DB still had 5 audit rows afterwards |
| **High (Windows)** | Migration checksums were taken over raw bytes. Git for Windows converts text to CRLF by default, so a build from such a checkout embeds different SQL bytes, and a database created by any other build would be rejected as "modified" — combined with the issue above, the app would silently fail to start after an upgrade. | Checksums ignore line endings; `.gitattributes` pins LF. Existing LF databases keep the same checksum (verified with the original database). | `db::tests::checksum_ignores_line_endings` |
| Medium | Database errors were "logged locally" only via `eprintln!` — lost in Windows release builds. | Same log file as above. | `applog.rs` test |
| Low | Present-tense safety claims for unbuilt features on Overview and sidebar. | Reworded with the delivering stage. | d2, e2 |
| Low | Unhandled promise rejection when settings fail to load. | Caught; header shows *Database error*. | `DatabaseError.test.tsx` |
| Low | `tsconfig.tsbuildinfo` (build artefact) committed; wrong installer path in DEVELOPMENT_GUIDE. | Removed and git-ignored; path corrected. | — |

## Test outputs (after fixes)

```
cargo test --workspace --locked   → flashrecovery_core: 30 passed, 0 failed; flashrecovery_desktop: 1 passed, 0 failed
cargo clippy --workspace --all-targets -- -D warnings → clean
cargo fmt --all -- --check        → clean
tsc -b --noEmit                   → 0 errors
vitest run                        → 3 files, 16 passed, 0 failed
tauri build (release, Linux .deb) → Finished
cargo audit                       → 0 vulnerabilities; 3 warnings (see below)
npm audit --omit=dev              → found 0 vulnerabilities
npm audit (incl. dev tools)       → 6 high, all one advisory (see below)
```

Before the fixes: 29 Rust + 15 frontend tests passed, clippy clean, `cargo audit` **1 vulnerability**.

## End-to-end database evidence (real binary)

```
cases:     ('FR-2026-0001', 'Audit Test Customer', '9876543210', '16 GB HP v236w, black', 'open')
audit_log: (1,'app.started') (2,'settings.changed','ui.mode',{"from":"easy","to":"professional"})
           (3,'case.created','FR-2026-0001',{"case_id":"c2a923a1-…"})  ← no customer data in the audit trail
after close + reopen: cases 1, audit 4, ui.mode = professional, integrity Verified
after kill -9 + reopen: cases 1, audit 5, PRAGMA integrity_check = ok
broken migration checksum, original build: "panicked … Failed to setup app … migration 1 (initial_schema) was
  modified after being applied" — exit 134, no window
same database, fixed build: window open, reason shown (d2), log written, audit rows unchanged (5)
```

## Accepted / open items

- **T1.21 Windows acceptance (open):** build, install and run on Windows 10/11 — DEVELOPMENT_GUIDE §4. Stage 1 cannot
  be called complete for Windows until this passes. The new startup and log-file code compiles on Linux but has
  **not yet been compiled for Windows**.
- `chrono` 0.4.45 flagged *unmaintained* (RUSTSEC-2026-0543, no known vulnerability) — ships on Windows; replace in Stage 8.
- `glib` (unsound) and `proc-macro-error` (unmaintained) — Linux-only build dependencies; not in the Windows build
  (`cargo tree --target x86_64-pc-windows-msvc`).
- `picomatch` ≤ 4.0.7 ReDoS (GHSA-fc5q-39xc-vjpf) via Vite/Vitest — development tools only, not shipped, and no patched
  release exists yet. Re-check in Stage 8.
- `freezePrototype` remains disabled (ADR-003) — revisit in Stage 8.
- Audit chain is tamper-evident, not tamper-proof; deleting the newest entries cannot be detected without an external
  anchor (documented in ADR-002; Stage 8).
- Project handover rules 9+ are still missing.
