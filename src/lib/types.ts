export type FocusHint = {
  kind: string;
  appName?: string | null;
  pid?: number | null;
  windowTitle?: string | null;
};

export type AgentGroup = {
  id: string;
  tool: string;
  displayName: string;
  repo?: string | null;
  branch?: string | null;
  worktree?: string | null;
  pid?: number | null;
  host?: string | null;
  jobs: number;
  status: "running" | "idle" | "done" | string;
  pids: number[];
  focus: FocusHint;
  detail: string;
  finishedAtMs?: number | null;
  hasFinished: boolean;
};

export type DetectedTool = {
  id: string;
  displayName: string;
  installed: boolean;
  runningSessions: number;
  followed: boolean;
  source: string;
};

export type UsageSource = {
  tool: string;
  displayName: string;
  available: boolean;
  reason?: string | null;
  period: string;
  capSeconds?: number | null;
  usedSeconds?: number | null;
  capLabel?: string | null;
  dailySeconds?: Array<number | null> | null;
  byok: boolean;
};

export type Snapshot = {
  scannedAtMs: number;
  sample: boolean;
  groups: AgentGroup[];
  detectedTools: DetectedTool[];
  usage: UsageSource[];
  liveAgentTools: number;
  activeJobs: number;
  processCount: number;
  notes: string[];
};

export type Settings = {
  openMode: "click" | "hover" | string;
  shortcut: string;
  orbVisible: boolean;
  orbX?: number | null;
  orbY?: number | null;
  usagePeriod: "weekly" | "monthly" | string;
  sampleLayout: boolean;
  autostart: boolean;
  onboarded: boolean;
  followedTools: string[];
  lookAtCursor: boolean;
  playfulness: "off" | "calm" | "playful";
  face: "dots" | "sleepy" | "wink";
  mint: "pale" | "mid";
};

export type ConnectResult = {
  snapshot: Snapshot;
  settings: Settings;
};

export const defaultSettings = (): Settings => ({
  openMode: "click",
  shortcut: "CommandOrControl+Shift+D",
  orbVisible: true,
  orbX: null,
  orbY: null,
  usagePeriod: "weekly",
  sampleLayout: false,
  autostart: true,
  onboarded: false,
  followedTools: [],
  lookAtCursor: true,
  playfulness: "playful",
  face: "dots",
  mint: "pale",
});

export const emptySnapshot = (): Snapshot => ({
  scannedAtMs: Date.now(),
  sample: false,
  groups: [],
  detectedTools: [],
  usage: [
    {
      tool: "cursor",
      displayName: "Cursor",
      available: false,
      reason: "No local usage file for Cursor on this machine.",
      period: "weekly",
      capLabel: "5h",
      byok: false,
    },
  ],
  liveAgentTools: 0,
  activeJobs: 0,
  processCount: 0,
  notes: ["Scanner idle until Dew runs inside Tauri."],
});

export const VENDOR_ICONS: Record<string, string> = {
  cursor: "/vendors/cursor.png",
  opencode: "/vendors/opencode.png",
  "claude-code": "/vendors/claude-code.png",
  codex: "/vendors/codex.png",
};
