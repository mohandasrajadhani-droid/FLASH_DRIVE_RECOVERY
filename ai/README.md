# AI Recovery Advisor (Stage 6)

Not implemented. Design constraints (from the handover and SECURITY.md §4):

- **Local-first.** Recovery works with no AI and no internet. Cloud AI is optional, off by default, and requires explicit, audited consent.
- **Advisory only.** The advisor reads structured diagnostic summaries and returns explanations/recommendations. It cannot start, modify or cancel jobs.
- **Evidence-based.** It must never invent recovered files or claim recoverability without evidence from the deterministic engines.
- **No uploads of customer files or disk images.**
- `models/`: no ML models will be trained or deployed without suitable labelled USB-device datasets and validation.

Subfolders: `advisor/` (prompting & rules), `diagnostics/` (feature extraction from scan/imaging metadata), `models/`, `reports/` (report summarisation).
