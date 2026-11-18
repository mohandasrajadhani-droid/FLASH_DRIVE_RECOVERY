# Recovery engines

Nothing is bundled yet (Stage 1). Each engine will get its own folder containing the exact version, upstream URL,
SHA-256 of shipped binaries, `COPYING`, and corresponding source or a written offer. See `LICENSES.md` and
ARCHITECTURE ADR-005/ADR-006.

| Folder | Engine | Stage | Role |
|---|---|---|---|
| `ddrescue/` | GNU ddrescue | 3 | Reference implementation; native Rust imager with compatible mapfile proposed |
| `photorec/` | PhotoRec | 4 | Signature-based carving (Deep Recovery) |
| `testdisk/` | TestDisk | 4 | Partition analysis — read-only modes only |
| `sleuthkit/` | The Sleuth Kit | 4 | Filesystem analysis (Quick Recovery) |
