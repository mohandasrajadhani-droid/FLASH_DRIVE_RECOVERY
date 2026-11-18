# Licences

> **Not legal advice.** This is an engineering evaluation to guide architecture. Obtain review from a qualified
> software-licensing lawyer before bundling or redistributing any third-party engine commercially.

## 1. FLASHRECOVERY AI
Proprietary (`LicenseRef-Proprietary`). © FLASHRECOVERY AI. All rights reserved. (Final licence and EULA to be set by
the product owner before release.)

## 2. Third-party recovery engines — evaluation (none are bundled in Stage 1)

| Engine | Licence (as published) | Windows availability | Integration plan |
|---|---|---|---|
| **PhotoRec** (CGSecurity) | GNU GPL **v2 or later** per cgsecurity.org; some listings state GPLv3 — confirm from `COPYING` of the exact release shipped | Official Windows 64-bit builds | Separate executable invoked by argument vector; never linked |
| **TestDisk** (CGSecurity) | GNU GPL (same distribution as PhotoRec) | Official Windows builds | Separate executable; **analysis/list modes only** — any write action (partition-table write, boot-sector repair) must be blocked by the adapter |
| **GNU ddrescue** | GNU GPL (v3+ historically; recent packaging lists GPL-2.0-or-later — confirm from the release's `COPYING`) | **No official native Windows build**; available via Cygwin | Prefer native Rust imaging with a ddrescue-compatible mapfile (ADR-005). If ddrescue is ever shipped, Cygwin runtime obligations also apply |
| **The Sleuth Kit** | Mixed: mostly **Common Public License 1.0** and **IBM Public License 1.0**, a few files GPL-2+ (e.g. `srch_strings`), some BSD/public-domain | Windows builds available | Separate executables only. **CPL/IPL are listed by the FSF as GPL-incompatible**, so TSK must never be linked together with GPL code (including into one helper binary with PhotoRec/TestDisk) |

### Obligations if GPL executables are distributed alongside the proprietary app
Shipping unmodified GPL programs as separate executables in the same installer is generally treated as "mere
aggregation", which does not extend the GPL to the proprietary application. However, you must:
1. include the full licence text of each engine;
2. provide the corresponding source code (or a written offer valid for 3 years for GPLv2; equivalent for GPLv3) for the
   exact versions shipped, including any patches;
3. keep each engine a separate program: communicate via command line / files / pipes only; no linking, no shared
   address space;
4. preserve copyright notices and not misrepresent the engines as your own work;
5. for GPLv3 components on locked-down hardware: installation information requirements (not applicable to normal
   Windows PCs).

### Recommendation for Stage 4
- Treat each engine as an optional, separately licensed component with its own folder under `engines/<name>/`
  containing: exact version, upstream URL, SHA-256 of the binaries, `COPYING`, and a source archive or written offer.
- Consider offering engines as an optional download in the first commercial release until legal review is complete.

## 3. Bundled application dependencies

Generated with `python3 scripts/sbom.py` (2026-11-18):

| Inventory | Packages | Licences found |
|---|---|---|
| Rust crates shipped in the desktop binary (`docs/sbom/rust-crates.csv`, all target platforms — superset of the Windows build) | 410 | Permissive (MIT / Apache-2.0 / BSD / ISC / Zlib / Unicode-3.0 / Unlicense / 0BSD / CC0) plus 7 × **MPL-2.0** (file-level copyleft: unmodified use is fine; any modification to those files must be published). Two crates are triple-licensed `MIT OR Apache-2.0 OR LGPL-2.1-or-later` — we elect MIT/Apache-2.0. |
| npm production packages bundled into the UI (`docs/sbom/npm-packages.csv`) | 50 | MIT, ISC, BSD-3-Clause, Apache-2.0 OR MIT |

No GPL-only or AGPL dependency is present in the shipped application. Re-run the script and review the CSVs on every
dependency change; Stage 9 should switch to a standard CycloneDX SBOM (`cargo cyclonedx`, `@cyclonedx/cyclonedx-npm`).

### Key components
| Component | Licence |
|---|---|
| Tauri 2 | MIT OR Apache-2.0 |
| SQLite (bundled via `rusqlite`/`libsqlite3-sys`) | Public domain (SQLite); crates MIT |
| React, React DOM, React Router | MIT |
| Recharts | MIT |
| Lucide icons | ISC |
| Tailwind CSS (build-time) | MIT |
| Microsoft Edge WebView2 Runtime (installed by the bootstrapper) | Microsoft software licence terms — installed from Microsoft, not redistributed by us in Stage 1 |

## 4. Fonts and assets
No third-party fonts or images are bundled. The UI uses fonts that ship with Windows. The application icon
(`apps/desktop/app-icon.svg`) is original to this project.
