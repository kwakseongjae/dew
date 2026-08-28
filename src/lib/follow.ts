import type { Settings, Snapshot } from "./types";

const recount = (snapshot: Snapshot): Snapshot => {
  const running = snapshot.groups.filter((group) => group.status === "running");
  const tools = new Set(running.map((group) => group.tool));
  return {
    ...snapshot,
    activeJobs: running.length,
    liveAgentTools: tools.size,
  };
};

export const applyFollowed = (snapshot: Snapshot, settings: Settings): Snapshot => {
  const followed = new Set(
    settings.onboarded
      ? settings.followedTools
      : snapshot.detectedTools.filter((tool) => tool.followed).map((tool) => tool.id),
  );
  return recount({
    ...snapshot,
    detectedTools: snapshot.detectedTools.map((tool) => ({
      ...tool,
      followed: followed.has(tool.id),
    })),
    groups: snapshot.groups.filter((group) => followed.has(group.tool)),
  });
};
