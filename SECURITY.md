# Security

## 1. Source-device protection model (applies from Stage 2 onward)

These are **mandatory invariants**. Any code touching storage must preserve them, and each must have an automated test
before its stage is marked complete.

| # | Invariant | Planned enforcement |
|---|---|---|
| S1 | Source devices are opened read-only | Raw handles opened with `GENERIC_READ` only; a code-review rule and a unit test that grep-forbids `GENERIC_WRITE` in the device module |
| S2 | Never format, CHKDSK, repair or rewrite partition tables | No such commands exist; no shell access; engine adapters whitelist arguments (e.g. TestDisk restricted to analysis/list modes) |
| S3 | Nothing is ever written to the source | Destination validator resolves the destination volume → physical disk and rejects it if it matches the source disk identity |
| S4 | Devices identified by hardware identity, not drive letter | Identity = device-instance ID + serial (if exposed) + size + partition-table signature; re-verified immediately before every operation |
| S5 | Safe handling of device removal | Operations check identity on each reconnect; jobs pause, never retarget |
| S6 | Bounded retries on unstable media | Retry limits and per-region timeouts in the imaging engine; image first, analyse the image |
| S7 | Destination checks | Exists, writable, enough free space, not the source, path canonicalised |
| S8 | Recovered files are untrusted | Never executed or auto-opened; preview via safe decoders only; drag-and-drop navigation already blocked in the WebView |

## 2. Controls implemented in Stage 1

- **Input validation** at the backend boundary for every command (`recovery-service/src/validation.rs`): length limits
  counted in characters, control-character rejection, strict UUID parsing, enum whitelists, bounded page sizes, literal
  matching for search (LIKE wildcards escaped).
- **No SQL injection surface**: parameterised statements only; no string-built SQL from user input.
- **No shell**: no shell/process/fs/http plugins installed; no `std::process::Command` in the codebase.
- **Least-privilege IPC**: capability grants only `core:default`; only 11 explicitly registered commands; none touch
  devices or the filesystem beyond the app's own database.
- **CSP**: `default-src 'self'; script-src 'self'`; no remote origins, `object-src 'none'`, `frame-ancestors 'none'`.
- **Error hygiene**: database errors are logged locally and returned to the UI as a generic message.
- **Audit trail**: append-only (triggers), SHA-256 hash chain, full-chain verifier in the UI and on the dashboard.
  Customer PII values are *not* written into audit details (field names only — tested).
- **Migration integrity**: applied migrations are checksummed; a modified migration or a newer-than-supported schema
  stops the app instead of silently continuing.
- **SQLite hardening**: `secure_delete=ON`, `foreign_keys=ON`, WAL, busy timeout.

## 3. Known security decisions / residual risks

| Item | Status |
|---|---|
| `freezePrototype` disabled (breaks rendering) | Accepted for Stage 1 — compensated by strict CSP and no remote content (ARCHITECTURE ADR-003) |
| Audit chain is tamper-evident only | Accepted; anchoring/signing to be evaluated in Stage 8 |
| Database is not encrypted at rest | Relies on Windows user-profile ACLs. Evaluate SQLCipher or DPAPI-wrapped key for case PII in Stage 7 |
| App will need Administrator rights for raw device reads (Stage 2/3) | Plan: keep the UI unprivileged; elevate only a separate, minimal device-worker process |
| Unsigned binaries | Code signing + signed updater configured in Stage 9 |

## 4. AI safety boundary (Stage 6 design constraint)

The AI advisor may only *read* structured diagnostic summaries and *return* text recommendations. It must have no
access to commands that start, modify or cancel jobs, no access to file contents unless the user explicitly consents
per item, and cloud calls must be off by default and gated by an explicit, audited consent setting.

## 5. Dependency review

- Rust: run `cargo audit` (install `cargo-audit`) before each release.
- npm: run `npm audit --omit=dev` before each release.
- A dependency inventory with licences is generated into `docs/sbom/` (see `LICENSES.md`).

## 6. Reporting

Report suspected vulnerabilities privately to the project owner. Do not file public issues containing exploit details.
