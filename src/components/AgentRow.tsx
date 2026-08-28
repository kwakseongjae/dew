import type { KeyboardEvent } from "react";
import { DoneBadge } from "@/components/DoneBadge";
import type { AgentGroup } from "@/lib/types";
import { VENDOR_ICONS } from "@/lib/types";
import { cn } from "@/lib/utils";

type AgentRowProps = {
  group: AgentGroup;
  onFocus: (id: string) => void;
};

export const AgentRow = ({ group, onFocus }: AgentRowProps) => {
  const icon = VENDOR_ICONS[group.tool];
  const live = group.status === "running";
  const idle = group.status === "idle" && !group.hasFinished;

  const handleActivate = () => {
    onFocus(group.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${group.displayName} session, ${group.detail}`}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      className="flex h-12 items-center gap-3 border-b border-white/12 px-1 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/60"
    >
      <span
        className={cn(
          "size-2.5 shrink-0 rounded-full",
          live || group.hasFinished
            ? "bg-mint shadow-[0_0_8px_rgba(201,245,220,0.9)]"
            : "border border-white/45 bg-transparent",
        )}
        aria-hidden="true"
      />
      {icon ? (
        <img
          src={icon}
          alt=""
          width={18}
          height={18}
          className="size-[18px] rounded-[5px] object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-[18px] place-items-center rounded-[5px] bg-white/15 text-[10px] font-semibold text-white"
        >
          {group.displayName.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px] font-medium", idle ? "text-white/55" : "text-white")}>
          {group.displayName}
        </p>
        <p className={cn("truncate text-[12px]", idle ? "text-white/40" : "text-white/65")}>
          {group.detail}
        </p>
      </div>
      {group.hasFinished ? (
        <DoneBadge
          onActivate={handleActivate}
          label={`Session finished in ${group.displayName}. Focus the matching window.`}
        />
      ) : null}
    </div>
  );
};
