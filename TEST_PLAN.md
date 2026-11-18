# Test plan

## 1. Test levels

| Level | Tooling | Runs on |
|---|---|---|
| Core unit tests | `cargo test -p flashrecovery-core` | any OS |
| Static analysis | `cargo clippy --workspace --all-targets -- -D warnings`, `tsc -b` (strict) | any OS |
| Frontend unit/component | Vitest + Testing Library (jsdom) | any OS |
| Desktop end-to-end | Real app binary driven through its UI; screenshots + DB inspection | Linux (Stage 1), **Windows (required from Stage 2)** |
| Hardware tests | Real USB devices and deliberately damaged media | Windows lab machine |

## 2. Stage 1 test cases

| ID | Area | Case | Automated |
|---|---|---|---|
| T1.01 | DB | Migrations apply, are idempotent, persist across reopen, WAL active | `db.rs` |
| T1.02 | DB | Modified migration checksum → refuses to start | `db.rs` |
| T1.03 | DB | DB newer than app → refuses to start | `db.rs` |
| T1.04 | Audit | Chain links to genesis and verifies | `audit.rs` |
| T1.05 | Audit | UPDATE/DELETE blocked by triggers | `audit.rs` |
| T1.06 | Audit | Edited entry detected at the exact sequence | `audit.rs` + manual E2E (screenshot 08) |
| T1.07 | Audit | Deleted entry detected | `audit.rs` |
| T1.08 | Audit | Invalid actor writes nothing | `audit.rs` |
| T1.09 | Settings | Defaults, set, audit old→new, no-op not audited, unknown keys rejected | `settings.rs` |
| T1.10 | Cases | Create/read/update/delete with audit, atomic rollback on conflict | `cases.rs` |
| T1.11 | Cases | Audit contains no customer PII values | `cases.rs` |
| T1.12 | Cases | Search treats `%`/`_` literally; status filter | `cases.rs` |
| T1.13 | Validation | Control chars, lengths (Unicode-aware), case numbers, UUIDs, limits | `validation.rs`, `lib.test.ts` |
| T1.14 | UI | 14 modules registered; only Stage-1 items marked available | `lib.test.ts` |
| T1.15 | UI | Planned modules show no controls and no data | `App.test.tsx` |
| T1.16 | UI | No backend → explicit notice, never sample data | `App.test.tsx`, `lib.test.ts` |
| T1.17 | UI | Easy Mode hides/redirects professional-only modules | `App.test.tsx` |
| T1.18 | E2E | App starts, creates DB, records `app.started` | manual on Linux (RESULTS.md) |
| T1.19 | E2E | Mode switch persists and is audited | manual on Linux (screenshots 02, 07) |
| T1.20 | E2E | Create case via UI; invalid case number rejected | manual on Linux (screenshots 05, 06) |
| T1.21 | E2E | **Windows**: install, launch, repeat T1.18–T1.20 and T1.24 | ⬜ pending Windows machine |
| T1.22 | DB | Migration checksum identical for LF and CRLF checkouts | `db.rs` |
| T1.23 | Startup | Database cannot be opened → window opens, reason + log path shown, nothing written, header shows *Database error* | `applog.rs`, `DatabaseError.test.tsx` + manual E2E (audit screenshot d2) |
| T1.24 | E2E | Data persists across close/reopen and across a forced kill | manual on Linux (audit RESULTS.md) |

## 3. Plans for later stages (outline)

- **Stage 2 — devices:** enumerate with 0/1/many USB drives; hot-plug/unplug; same model ×2 (identity must differ);
  card readers with empty slots; BitLocker To Go volume; drive letter reassignment must not change identity; verify no
  write handle is ever opened (Process Monitor capture as evidence).
- **Stage 3 — imaging:** healthy drive → image hash equals source read hash; interrupted image resumes to identical
  hash; deliberately damaged media (bad-sector emulation via Linux `dm-flakey`/`dm-error` image served over USB gadget,
  plus real failing sticks) → bounded retries, accurate bad-region map; unplug mid-image → safe pause.
- **Stage 4 — engines:** known-content test images (FAT32, exFAT, NTFS) with deleted/formatted scenarios; expected
  file list + per-file SHA-256 ground truth; measure recovered vs expected honestly.
- **Stage 8:** source-protection audit, fuzzing of parsers/inputs, licence review, Windows 10/11 matrix.

## 4. Test data rules
Test images and media live under `test-data/` (git-ignored for large binaries). Every test image must have a manifest of
its expected contents and hashes. Never use real customer data in tests.
