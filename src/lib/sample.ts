import type { AgentGroup, DetectedTool, Snapshot } from "./types";

const session = (
  id: string,
  tool: string,
  displayName: string,
  branch: string,
  worktree: string | null,
  pid: number,
  host: string,
  status: "running" | "done",
  hasFinished: boolean,
): AgentGroup => {
  const loc = worktree ? `on worktree/${worktree}` : `on ${branch}`;
  const suffix = hasFinished && status === "done" ? "done" : host;
  return {
    id,
    tool,
    displayName,
    repo: "dew",
    branch,
    worktree,
    pid,
    host,
    jobs: status === "running" ? 1 : 0,
    status,
    pids: [pid],
    focus: { kind: "app", appName: host, pid },
    detail: `${loc} · ${suffix}`,
    finishedAtMs: hasFinished ? Date.now() : null,
    hasFinished,
  };
};

const detected = (
  id: string,
  displayName: string,
  runningSessions: number,
  followed: boolean,
): DetectedTool => ({
  id,
  displayName,
  installed: true,
  runningSessions,
  followed,
  source: "Sample layout",
});

export const sampleDetectedTools = (): DetectedTool[] => [
  detected("cursor", "Cursor", 1, true),
  detected("opencode", "OpenCode", 1, true),
  detected("claude-code", "Claude Code", 2, true),
  detected("codex", "Codex", 0, false),
];

export const sampleSnapshot = (withDone: boolean): Snapshot => {
  const groups = [
    session(
      "live-claude-code-4101",
      "claude-code",
      "Claude Code",
      "hotfix",
      "hotfix",
      4101,
      "iTerm2",
      "running",
      false,
    ),
    session(
      "live-claude-code-4102",
      "claude-code",
      "Claude Code",
      "main",
      null,
      4102,
      "Terminal",
      "running",
      false,
    ),
    session(
      "live-claude-code-4103",
      "claude-code",
      "Claude Code",
      "login",
      "login",
      4103,
      "Warp",
      withDone ? "done" : "running",
      withDone,
    ),
    session("live-cursor-2201", "cursor", "Cursor", "main", null, 2201, "Cursor", "running", false),
    session(
      "live-opencode-3301",
      "opencode",
      "OpenCode",
      "feat/login",
      null,
      3301,
      "OpenCode",
      "running",
      false,
    ),
  ];
  const running = groups.filter((group) => group.status === "running");
  const tools = new Set(running.map((group) => group.tool));
  return {
    scannedAtMs: Date.now(),
    sample: true,
    liveAgentTools: tools.size,
    activeJobs: running.length,
    processCount: 0,
    notes: ["Sample layout — not live process data."],
    usage: [
      {
        tool: "cursor",
        displayName: "Cursor",
        available: true,
        reason: "Sample layout — not your live usage.",
        period: "weekly",
        capSeconds: 5 * 3600,
        usedSeconds: 90 * 60,
        capLabel: "5h",
        dailySeconds: [20 * 60, 35 * 60, 95 * 60, 18 * 60, 28 * 60, 55 * 60, 40 * 60],
        byok: false,
      },
    ],
    groups,
    detectedTools: sampleDetectedTools().map((tool) =>
      tool.id === "claude-code" ? { ...tool, runningSessions: withDone ? 2 : 3 } : tool,
    ),
  };
};
