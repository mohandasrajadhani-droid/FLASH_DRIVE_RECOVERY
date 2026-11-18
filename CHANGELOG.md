# Changelog

All notable changes are documented here. Format: [Keep a Changelog](https://keepachangelog.com/); versioning: SemVer.

## [0.1.0] — 2026-11-18 — Stage 1: Project foundation

### Added
- Monorepo: Cargo workspace (`recovery-service`, `apps/desktop/src-tauri`) and Vite + React 19 + TypeScript + Tailwind 4 UI.
- `flashrecovery-core`: SQLite with WAL and checksummed forward-only migrations; schema v1 (`settings`, `cases`,
  `audit_log`, `app_meta`).
- Append-only, SHA-256 hash-chained audit trail with tamper detection and UI verifier.
- Whitelisted, typed settings: interface mode, reduce motion, operator name — all changes audited.
- Customer cases: create, edit, delete, search, status filter; automatic `FR-YYYY-NNNN` numbering.
- Application shell: sidebar navigation for all 14 modules, header with Easy/Professional selector, backend and
  device-detection status.
- Overview dashboard driven exclusively by live data (cases, audit events, audit integrity, 14-day activity, system info).
- Honest "Planned · Stage N" pages for unimplemented modules (no controls, no sample data).
- Least-privilege Tauri capability, strict CSP, drag-and-drop navigation blocked.
- Documentation set, SBOM-lite generator, Stage 1 test evidence.

### Fixed — Stage 1 independent audit (2026-11-18)
- **Security:** bundled SQLite upgraded (`rusqlite` 0.37 → 0.41, SQLite 3.54.1) to fix RUSTSEC-2026-0459.
- **Startup:** a database that cannot be opened no longer makes the app exit silently (Windows release builds have no
  console). The window opens, shows the reason and the log path, and refuses data commands.
- **Logging:** database errors are now written to a local log file instead of stderr only.
- **Migrations:** checksums ignore line endings, and `.gitattributes` pins LF, so a Windows (CRLF) checkout can no longer
  make an existing database fail its integrity check.
- **Honesty:** Overview and sidebar safety rules for unbuilt features now say which stage delivers them instead of
  reading as current features.
- **Housekeeping:** removed committed `tsconfig.tsbuildinfo`; corrected the installer output path in DEVELOPMENT_GUIDE.

### Known limitations
- Windows build not yet executed; verified on Linux (WebKitGTK) only.
- `freezePrototype` disabled (see ARCHITECTURE ADR-003).
