# Test data

- Large binaries (images, media dumps) are git-ignored; store them in `test-data/media/` or an external share.
- Every test image needs a `*.manifest.json` listing filesystem, scenario (deleted / formatted / damaged), expected files with SHA-256.
- Never use real customer data.
- Stage 3+ will add scripts to generate reproducible FAT32/exFAT/NTFS test images and damaged-media emulation.
