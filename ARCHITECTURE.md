# Architecture

## 1. Component overview

```
┌──────────────────────────── FLASHRECOVERY AI (single Windows process) ────────────────────────────┐
│                                                                                                    │
│  WebView2 (React UI)                         Rust backend (Tauri 2)                                │
│  ┌──────────────────────────┐   IPC    ┌───────────────────────────────┐                           │
│  │ pages / dashboard / ...  │ ───────▶ │ src-tauri/src/commands.rs     │  thin: typed args,        │
│  │ lib/api.ts (only caller) │ ◀─────── │  (11 commands in Stage 1)     │  delegate, map errors     │
│  └──────────────────────────┘ JSON     └──────────────┬────────────────┘                           │
│                                                       │ Rust calls                                 │
│                                        ┌──────────────▼────────────────┐                           │
│                                        │ recovery-service              │  flashrecovery-core       │
│                                        │  validation · db · audit      │  (platform-independent,   │
│                                        │  settings · cases · summary   │   unit-tested)            │
│                                        └──────────────┬────────────────┘                           │
│                                                       │                                            │
│                                        ┌──────────────▼────────────────┐                           │
│                                        │ SQLite (bundled, WAL)         │  %APPDATA%\ai.flashrecovery│
│                                        │  flashrecovery.db             │  .desktop\flashrecovery.db │
│                                        └───────────────────────────────┘                           │
│                                                                                                    │
│  Future (not built): device layer (S2) · imaging engine (S3) · engine adapters (S4) · AI (S6)     │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Layers and responsibilities

| Layer | Location | Rule |
|---|---|---|
| UI | `apps/desktop/src` | Never holds business rules. Talks to the backend **only** through `lib/api.ts`. Shows an explicit notice — never sample data — when the backend is unavailable. |
| Command layer | `apps/desktop/src-tauri/src/commands.rs` | Typed arguments only; no shell, no string-built SQL. Delegates to the core. Writes raw DB errors to the local log file (`applog.rs`) and returns a generic message. If the database failed to open at startup, every command returns that reason instead (fail-safe startup). |
| Core | `recovery-service/src` | All validation, persistence, audit. No Tauri dependency, so it is testable on any OS. |
| Storage | SQLite via `rusqlite` (bundled) | Parameterised queries only. Forward-only checksummed migrations. |

### Planned components (later stages)

| Stage | Component | Notes |
|---|---|---|
| 2 | `device` module (Windows-only, `cfg(windows)`) | SetupAPI / `IOCTL_STORAGE_QUERY_PROPERTY` / `IOCTL_DISK_GET_DRIVE_LAYOUT_EX`; identify by device-instance ID + serial + size, never by drive letter alone. Read-only handles (`GENERIC_READ`, `FILE_SHARE_READ|WRITE`). |
| 3 | Imaging engine | Native Rust, ddrescue-compatible mapfile format (see ADR-005). Separate worker process so a hung read cannot freeze the UI. |
| 4 | Engine adapters | Each third-party engine runs as a **separate child process** with an argument vector (no shell), working only on images or read-only handles. |
| 6 | AI advisor | Receives structured diagnostic metadata only. Has no access to commands that start jobs. |

## 2. Data model (schema v1)

| Table | Purpose |
|---|---|
| `schema_migrations` | version, name, SHA-256 checksum, applied time |
| `app_meta` | reserved key/value metadata |
| `settings` | whitelisted typed settings (`ui.mode`, `ui.reduce_motion`, `operator.name`) |
| `cases` | case records (UUID id, unique case number, status enum via `CHECK`) |
| `audit_log` | append-only hash chain; `UPDATE`/`DELETE` blocked by triggers |

Every data mutation and its audit entry are written in **one `BEGIN IMMEDIATE` transaction**, so a change is never
committed without its audit record, and two writers can never fork the hash chain.

## 3. Architectural decision records

### ADR-001 — Split a platform-independent core crate from the Tauri crate
*Decision:* All logic lives in `recovery-service` (`flashrecovery-core`); `src-tauri` is a thin adapter.
*Why:* Core logic can be unit-tested on CI runners of any OS, and future workers (imaging, engines) can reuse it without
pulling in the GUI. The handover's `recovery-service/` folder is used for this crate.

### ADR-002 — Hash-chained audit log in SQLite
*Decision:* SHA-256 chain with length-prefixed fields, genesis hash of zeros, triggers blocking UPDATE/DELETE, and a
full-chain verifier exposed in the UI.
*Limit:* Tamper-*evident*, not tamper-*proof* — an attacker with write access could rebuild the entire chain. Stage 8
should evaluate signed periodic exports or external anchoring for technician/forensic use.

### ADR-003 — `freezePrototype` disabled
*Decision:* Tauri's `app.security.freezePrototype` is `false`.
*Why:* With it enabled, the UI rendered a blank window (verified on 2026-11-18 by building the real app and capturing
screenshots before/after; see `test-results/stage-1/`). Compensating controls: strict CSP with `script-src 'self'`, no
remote content, no `withGlobalTauri`, minimal capability set. Revisit in Stage 8 once the incompatible dependency is
identified.

### ADR-004 — Hash-based routing
*Decision:* `HashRouter`. *Why:* Works identically under the Tauri custom protocol and `vite preview`, with no server
rewrite rules.

### ADR-005 — Imaging engine: native Rust, ddrescue-compatible mapfile (proposed for Stage 3)
*Context:* GNU ddrescue has no official native Windows build; on Windows it is normally run via Cygwin. Shipping a
Cygwin runtime adds licence obligations, a POSIX device-path layer over Windows raw devices, and an extra failure surface.
*Proposal:* Implement read-only, resumable imaging in Rust using Windows raw device handles, writing a mapfile in the
documented ddrescue format so images and maps remain interoperable with ddrescue/ddrescueview for technicians.
Validate against ddrescue on Linux with the same deliberately-damaged test media. **Decision to be confirmed at the
start of Stage 3.**

### ADR-006 — Third-party engines run out-of-process, never linked
*Decision:* PhotoRec/TestDisk (GPL) and The Sleuth Kit (CPL/IPL, which the FSF lists as GPL-incompatible) will only
ever be invoked as separate executables via argument vectors. They are never statically or dynamically linked into the
proprietary binary, and never linked with each other. See `LICENSES.md`. Legal review required before bundling.

### ADR-007 — TypeScript 5.9 rather than 7.x
*Decision:* Pin `typescript ~5.9`. *Why:* 7.x (native port) is recent; 5.9 is the conservative, widely supported
choice for a commercial build. Revisit in Stage 8.

### ADR-008 — Offline-first, system fonts
No web fonts, CDNs or remote assets. The CSP blocks all remote origins. The UI uses Segoe UI Variable / Cascadia
(present on Windows 10/11).

## 4. Easy vs Professional mode
`lib/modules.ts` is the single source of truth for navigation: each module declares its stage, honest status and whether
it appears in Easy Mode. Professional-only routes redirect to the Overview in Easy Mode. The mode is a stored, audited
setting.
