# PROJECT HANDOVER & MASTER BUILD INSTRUCTIONS
## Project: FLASHRECOVERY AI
### Professional USB Flash Drive Data Recovery Software

You are the lead software architect, senior Windows application developer, data recovery engineer, cybersecurity specialist, and technical project manager for this project.

Your responsibility is to design, develop, test, and deliver a professional Windows desktop application named **FLASHRECOVERY AI**.

This is a real software product intended for commercial use. Do not build merely a UI prototype or a demonstration. Every feature must be implemented, tested, and verified before being marked complete.

---

# 1. PRODUCT VISION

Build an advanced yet easy-to-use data recovery application for USB flash drives and other supported storage devices.

The application must serve two user groups:

1. **Ordinary users:** People who accidentally deleted files, formatted a USB drive, lost access to a drive, or need to recover documents, photos, videos, and other files.
2. **Professional technicians:** Data recovery professionals who need detailed diagnostics, disk imaging, partition analysis, recovery controls, case management, verification, and customer reports.

The software must combine established data recovery technologies with AI-assisted diagnostics and recovery recommendations.

**Product name:** FLASHRECOVERY AI  
**Platform:** Windows 10 and Windows 11, 64-bit  
**Product type:** Windows desktop application  
**Primary language:** English, with architecture suitable for future multilingual support  
**Design direction:** Premium, professional, modern dark interface

This is initially a software-only product. Do not assume access to a physical NAND recovery laboratory or specialised hardware.

---

# 2. CORE PRODUCT PRINCIPLES

The following principles are mandatory:

- Protect the original storage device.
- Use read-only source access by default.
- Never save recovered files to the source device.
- Recover files to a separate destination drive.
- Prefer disk imaging before repeated scanning of unstable devices.
- Keep recovery operations resumable wherever possible.
- Maintain a clear audit trail.
- Provide honest recovery results.
- Never fabricate recovered files, diagnostics, device information, or success statistics.
- AI must recommend and explain; deterministic recovery engines must perform actual recovery.
- Recovery must remain functional without an internet connection.
- Cloud AI must be optional.
- Never automatically upload customer files or disk images to an AI service.

Do not claim guaranteed recovery. Recovery success depends on factors such as overwriting, flash controller behaviour, encryption, TRIM/discard, and physical damage.

---

# 3. TECHNOLOGY STACK

Use the following recommended architecture unless a documented technical limitation requires a change.

### Desktop application
- Tauri 2.x
- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React icons
- Recharts for charts

### Native backend
- Rust
- Tauri commands
- Windows native storage APIs
- Rust Windows bindings where required

### Database
- SQLite
- Database migrations
- Structured audit logs
- Local application settings

### Recovery technologies to evaluate and integrate

- GNU ddrescue: disk imaging, bad-sector handling, persistent mapfiles, and resumable acquisition.
- PhotoRec: signature-based file carving.
- TestDisk: partition and filesystem recovery.
- The Sleuth Kit: filesystem and forensic analysis.
- Windows native storage APIs: device enumeration and controlled block-device access.

Evaluate licensing and redistribution conditions before bundling any third-party engine. Maintain a software bill of materials and a complete `LICENSES.md`.

Do not assume all third-party tools can be redistributed commercially without restrictions.

---

# 4. APPLICATION MODULES

Create the application architecture to support these modules:

1. Overview Dashboard
2. Connected Devices
3. Recovery Wizard
4. Quick Recovery
5. Deep Recovery
6. Partition Recovery
7. Disk Imaging
8. Recovery Explorer
9. AI Recovery Advisor
10. Diagnostic Center
11. Recovery History
12. Customer Cases
13. Reports
14. Settings

The application must eventually support two operating modes:

### Easy Mode
A guided workflow for ordinary users with simple instructions and minimal technical terminology.

### Professional Mode
Advanced controls, imaging options, diagnostics, scan configuration, partition analysis, logs, verification, and case management.

Do not implement all these modules in the first development stage. Build them progressively according to the roadmap.

---

# 5. USER INTERFACE REQUIREMENTS

Create a premium professional desktop experience.

### Visual direction
- Deep navy and charcoal backgrounds.
- Subtle blue and cyan accents.
- Clear typography.
- Modern cards and panels.
- Consistent spacing.
- Rounded corners.
- Restrained gradients.
- Smooth but subtle animations.
- Excellent readability.
- Responsive desktop layout.

### Main layout
- Left navigation sidebar.
- Top application header.
- Main content area.
- Device status indicators.
- Easy/Professional mode selector.
- Clear recovery progress indicators.
- Consistent dialogs and notifications.

Avoid excessive decoration. The interface should look like a professional data recovery product, not a generic admin dashboard.

---

# 6. DATA RECOVERY SAFETY AND SECURITY

This is the most important engineering requirement.

### Source protection
- Never format the source device.
- Never automatically run CHKDSK or filesystem repair.
- Never modify the original partition table.
- Never write recovered files or temporary output to the source.
- Do not identify devices using drive letters alone.
- Verify device identity before starting an operation.
- Handle unexpected device removal safely.
- Limit retries when a device is unstable.

### Imaging
- Use a persistent imaging mapfile.
- Support resumable imaging.
- Track read errors and bad regions.
- Record source and destination information.
- Calculate SHA-256 hashes where appropriate.
- Verify the resulting image.
- Analyse the image rather than repeatedly accessing unstable source media.

### Destination protection
- Confirm destination availability.
- Check free space.
- Prevent accidental selection of the source as the recovery destination.
- Validate destination paths.

### Recovered files
- Treat recovered files as untrusted.
- Do not execute or automatically open recovered files.
- Use safe preview mechanisms.
- Preserve recovery metadata where possible.

### Security engineering
- Validate all inputs.
- Avoid unsafe shell command construction.
- Use safe process invocation.
- Apply least-privilege principles.
- Secure database access.
- Maintain audit logs.
- Sign application updates.
- Review dependencies for known vulnerabilities.

---

# 7. AI INTEGRATION

AI is an important differentiator of FLASHRECOVERY AI.

Build an AI Recovery Advisor that can eventually:

- Analyse device diagnostic metadata.
- Explain read errors and device status.
- Recommend an appropriate recovery workflow.
- Help users select Quick Recovery, Deep Recovery, or Disk Imaging.
- Explain recovery reports.
- Summarise scan results.
- Help technicians prepare customer reports.
- Explain why certain files may not be recoverable.

### AI architecture
Use a local-first architecture with optional cloud AI.

Offline recovery must work without AI or internet connectivity.

AI must never:
- Invent recovered files.
- Claim that a file is recoverable without evidence.
- Modify source storage.
- Start destructive operations autonomously.
- Override security controls.
- Upload customer data without explicit consent.

Keep recovery execution separate from AI recommendations.

Do not train or deploy diagnostic machine-learning models without suitable labelled USB-device datasets and validation.

---

# 8. TECHNICAL LIMITATIONS

Understand the difference between normal USB recovery and raw NAND recovery.

Normal USB block-device access does not provide direct access to NAND flash pages, controller firmware, ECC metadata, or the Flash Translation Layer.

Do not claim that the application can perform:
- Chip-off recovery.
- Controller-level reconstruction.
- Raw NAND ECC correction.
- Flash Translation Layer reconstruction.

These may be considered as separate advanced research areas in the future.

Do not assume ordinary USB drives expose SMART or NAND health information.

For physically damaged devices, clearly explain the limitations of software recovery and recommend specialist hardware recovery services where appropriate.

---

# 9. DEVELOPMENT ROADMAP

Develop the product one stage at a time.

### Stage 1 — Project Foundation and Architecture
- Inspect the development environment.
- Establish the Tauri, React, TypeScript, Rust, and SQLite architecture.
- Build the application shell.
- Build the professional dashboard.
- Create navigation for future modules.
- Implement database migrations and basic CRUD.
- Establish security and audit foundations.
- Create project documentation.
- Build and test the application.

### Stage 2 — USB Device Detection
- Enumerate connected storage devices.
- Identify devices using reliable hardware identifiers.
- Display capacity, filesystem, partitions, and device properties where available.
- Detect device removal and reconnection.
- Implement source-device protection.
- Test with real USB devices.

### Stage 3 — Disk Imaging
- Implement safe read-only acquisition.
- Integrate an appropriate imaging engine.
- Add persistent mapfiles.
- Add resumable imaging.
- Track bad sectors and read errors.
- Calculate image hashes.
- Test with healthy and deliberately damaged test media.

### Stage 4 — Recovery Engine Integration
- Evaluate and integrate PhotoRec.
- Evaluate and integrate TestDisk.
- Evaluate and integrate The Sleuth Kit.
- Support recovery from disk images.
- Implement recovery job management.
- Verify actual recovered files.

### Stage 5 — Recovery Explorer
- Display recovered files.
- Provide search and filtering.
- Organise results by file type.
- Add safe preview.
- Export to a separate destination.
- Display recovery status and verification information.

### Stage 6 — AI Recovery Advisor
- Implement AI-assisted diagnostic interpretation.
- Provide recovery recommendations.
- Add explainable results.
- Support local-first operation.
- Add optional cloud AI with consent.

### Stage 7 — Professional Technician Features
- Customer case management.
- Recovery history.
- Diagnostic reports.
- Case notes.
- Technician workflow.
- Exportable customer reports.

### Stage 8 — Security and Quality Assurance
- Perform security testing.
- Validate source protection.
- Test device disconnection.
- Test unstable media.
- Test recovery accuracy.
- Review third-party licences.
- Perform Windows compatibility testing.

### Stage 9 — Windows Release
- Build production installer.
- Configure application signing.
- Verify updates.
- Prepare documentation.
- Prepare release notes.
- Perform final acceptance testing.

---

# 10. PROJECT STRUCTURE

Use a modular structure similar to:

FLASHRECOVERY-AI/
- apps/
  - desktop/
    - src/
      - components/
      - pages/
      - dashboard/
      - devices/
      - recovery/
      - imaging/
      - explorer/
      - advisor/
      - reports/
    - src-tauri/
- engines/
  - photorec/
  - testdisk/
  - sleuthkit/
  - ddrescue/
- recovery-service/
- ai/
  - advisor/
  - diagnostics/
  - models/
  - reports/
- database/
- test-data/
- test-results/
- docs/
- README.md
- ARCHITECTURE.md
- FEATURE_STATUS.md
- SECURITY.md
- TEST_PLAN.md
- LICENSES.md
- CHANGELOG.md
- DEVELOPMENT_GUIDE.md

Adjust this structure if needed, but document architectural decisions.

---

# 11. DEVELOPMENT RULES

Follow these rules throughout the project:

1. Inspect the existing project before modifying anything.
2. Never overwrite existing user files without permission.
3. Work in small, independently verifiable stages.
4. Do not skip testing.
5. Do not build fake functionality to make the dashboard look complete.
6. Do not use mock data in production screens unless clearly labelled as demonstration data.
7. Do not mark a feature as implemented merely because its UI exists.
8. Do not claim a build succeeded unless you actually ran it.
9. Do