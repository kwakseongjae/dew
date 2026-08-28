import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { VENDOR_ICONS, type DetectedTool } from "@/lib/types";
import { cn } from "@/lib/utils";

type ToolPickerProps = {
  tools: DetectedTool[];
  sampleOn: boolean;
  onToggle: (id: string, followed: boolean) => void;
  onClose: () => void;
  onRescan?: () => void;
};

export const ToolPicker = ({ tools, sampleOn, onToggle, onClose, onRescan }: ToolPickerProps) => {
  const handleToggle = (id: string, followed: boolean) => {
    onToggle(id, followed);
  };

  return (
    <div className="flex h-full min-h-0 flex-col text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">Follow these tools</p>
          <p className="mt-1 max-w-[520px] text-xs leading-5 text-white/65">
            Uncheck anything Dew should ignore. Unchecked tools stay out of the session list and
            will not fire the mint !.
          </p>
        </div>
        <Button variant="glass" onClick={onClose} aria-label="Close tool picker">
          Done
        </Button>
      </div>
      {sampleOn ? (
        <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-mint/90">Sample layout</p>
      ) : null}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {tools.length === 0 ? (
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <p className="text-sm text-white/85">No local coding agents detected on this machine.</p>
            <p className="mt-1 text-xs text-white/55">
              Empty is honest. Start Cursor, Claude Code, Codex, or OpenCode, then scan again.
            </p>
            {onRescan ? (
              <Button className="mt-3" variant="mint" onClick={onRescan} aria-label="Scan again">
                Scan again
              </Button>
            ) : null}
          </div>
        ) : (
          tools.map((tool) => {
            const icon = VENDOR_ICONS[tool.id];
            const handleRowToggle = () => handleToggle(tool.id, !tool.followed);
            return (
              <div
                key={tool.id}
                className="flex min-h-12 items-center gap-3 border-b border-white/12 px-1 py-2 last:border-b-0"
              >
                <Checkbox
                  checked={tool.followed}
                  onCheckedChange={(checked) => handleToggle(tool.id, checked)}
                  label={`Follow ${tool.displayName}`}
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
                    className="grid size-[18px] place-items-center rounded-[5px] bg-white/15 text-[10px] font-semibold"
                  >
                    {tool.displayName.slice(0, 1)}
                  </span>
                )}
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={handleRowToggle}
                >
                  <p className={cn("truncate text-[15px] font-medium")}>{tool.displayName}</p>
                  <p className="truncate text-[12px] text-white/60">
                    {tool.runningSessions > 0
                      ? `${tool.runningSessions} live session${tool.runningSessions === 1 ? "" : "s"}`
                      : "installed · no live session"}
                    {tool.followed ? "" : " · not followed"}
                  </p>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
