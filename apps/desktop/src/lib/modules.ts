// Single source of truth for navigation and module status.
// `status` is the honest implementation state — update it only when the
// feature is implemented AND tested (see FEATURE_STATUS.md).

import {
  Activity,
  BookOpen,
  Bot,
  Briefcase,
  FileText,
  FolderSearch,
  HardDrive,
  History,
  LayoutDashboard,
  type LucideIcon,
  Layers,
  ScanSearch,
  Settings,
  Usb,
  Wand2,
  Zap,
} from "lucide-react";

export type ModuleStatus = "available" | "partial" | "planned";

export interface AppModule {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
  /** Roadmap stage that delivers the module's core functionality. */
  stage: number;
  status: ModuleStatus;
  /** Shown in Easy Mode as well as Professional Mode. */
  easy: boolean;
  group: "overview" | "recovery" | "analysis" | "workflow" | "system";
  summary: string;
  planned: string[];
}

export const MODULES: AppModule[] = [
  {
    id: "dashboard", path: "/", label: "Overview", icon: LayoutDashboard, stage: 1, status: "available", easy: true, group: "overview",
    summary: "Application health, audit-trail integrity and recent activity.",
    planned: [],
  },
  {
    id: "devices", path: "/devices", label: "Connected Devices", icon: Usb, stage: 2, status: "planned", easy: true, group: "overview",
    summary: "Detect USB flash drives and other storage devices using hardware identifiers.",
    planned: [
      "Enumerate physical disks and volumes via Windows storage APIs",
      "Identify devices by serial / device-instance ID, never by drive letter alone",
      "Show capacity, partition layout and filesystem where available",
      "Detect removal and reconnection; protect the source device",
    ],
  },
  {
    id: "wizard", path: "/wizard", label: "Recovery Wizard", icon: Wand2, stage: 4, status: "planned", easy: true, group: "recovery",
    summary: "A guided, plain-language path from 'I lost files' to a safe recovery.",
    planned: ["Choose device and what was lost", "Recommend Quick, Deep or Imaging-first", "Pick a separate destination drive"],
  },
  {
    id: "quick", path: "/quick", label: "Quick Recovery", icon: Zap, stage: 4, status: "planned", easy: true, group: "recovery",
    summary: "Recover recently deleted files using filesystem metadata.",
    planned: ["Filesystem-aware scan (The Sleuth Kit evaluation)", "Read-only source access", "Results feed the Recovery Explorer"],
  },
  {
    id: "deep", path: "/deep", label: "Deep Recovery", icon: ScanSearch, stage: 4, status: "planned", easy: true, group: "recovery",
    summary: "Signature-based carving for formatted or damaged drives.",
    planned: ["PhotoRec-based carving (licence review pending)", "Run against disk images by preference", "Resumable job management"],
  },
  {
    id: "partition", path: "/partition", label: "Partition Recovery", icon: Layers, stage: 4, status: "planned", easy: false, group: "recovery",
    summary: "Analyse lost or damaged partition tables — analysis only, never auto-write.",
    planned: ["TestDisk-based analysis (licence review pending)", "Report candidate partitions", "No automatic writes to the source"],
  },
  {
    id: "imaging", path: "/imaging", label: "Disk Imaging", icon: HardDrive, stage: 3, status: "planned", easy: false, group: "recovery",
    summary: "Read-only, resumable sector imaging with bad-region tracking and SHA-256.",
    planned: ["Persistent mapfile and resume", "Bad-sector tracking with retry limits", "SHA-256 image hashing and verification"],
  },
  {
    id: "explorer", path: "/explorer", label: "Recovery Explorer", icon: FolderSearch, stage: 5, status: "planned", easy: true, group: "analysis",
    summary: "Browse, filter, safely preview and export recovered files.",
    planned: ["Search and filter by type", "Sandboxed preview — recovered files are untrusted", "Export to a separate destination only"],
  },
  {
    id: "advisor", path: "/advisor", label: "AI Recovery Advisor", icon: Bot, stage: 6, status: "planned", easy: true, group: "analysis",
    summary: "Explains diagnostics and recommends a workflow. It never performs recovery itself.",
    planned: ["Local-first operation; cloud AI optional with explicit consent", "Evidence-based explanations only", "Cannot start destructive operations"],
  },
  {
    id: "diagnostics", path: "/diagnostics", label: "Diagnostic Center", icon: Activity, stage: 3, status: "planned", easy: false, group: "analysis",
    summary: "Read-error maps, device behaviour and stability indicators.",
    planned: ["Read-error and latency tracking during imaging", "No assumption that USB drives expose SMART/NAND health"],
  },
  {
    id: "history", path: "/history", label: "Recovery History", icon: History, stage: 7, status: "planned", easy: true, group: "workflow",
    summary: "Every scan, image and export with its verification results.",
    planned: ["Job history linked to the audit trail", "Re-open previous results"],
  },
  {
    id: "cases", path: "/cases", label: "Customer Cases", icon: Briefcase, stage: 7, status: "partial", easy: false, group: "workflow",
    summary: "Case records for technicians. Basic create / edit / delete is available now.",
    planned: ["Link devices, images and jobs to cases (Stage 7)", "Case notes timeline", "Technician workflow states"],
  },
  {
    id: "reports", path: "/reports", label: "Reports", icon: FileText, stage: 7, status: "planned", easy: false, group: "workflow",
    summary: "Exportable, factual customer and diagnostic reports.",
    planned: ["Customer report export", "Hashes and verification evidence included", "No fabricated statistics"],
  },
  {
    id: "settings", path: "/settings", label: "Settings", icon: Settings, stage: 1, status: "available", easy: true, group: "system",
    summary: "Mode, operator name, accessibility and the audit log.",
    planned: [],
  },
];

export const GROUP_LABELS: Record<AppModule["group"], string> = {
  overview: "Overview",
  recovery: "Recovery",
  analysis: "Analysis",
  workflow: "Workflow",
  system: "System",
};

export const ROADMAP: { stage: number; title: string; icon: LucideIcon }[] = [
  { stage: 1, title: "Foundation & architecture", icon: BookOpen },
  { stage: 2, title: "USB device detection", icon: Usb },
  { stage: 3, title: "Disk imaging", icon: HardDrive },
  { stage: 4, title: "Recovery engine integration", icon: ScanSearch },
  { stage: 5, title: "Recovery Explorer", icon: FolderSearch },
  { stage: 6, title: "AI Recovery Advisor", icon: Bot },
  { stage: 7, title: "Technician features", icon: Briefcase },
  { stage: 8, title: "Security & QA", icon: Activity },
  { stage: 9, title: "Windows release", icon: Settings },
];

/** The stage currently being delivered. */
export const CURRENT_STAGE = 1;

export function visibleModules(mode: "easy" | "professional"): AppModule[] {
  return mode === "professional" ? MODULES : MODULES.filter((m) => m.easy);
}
