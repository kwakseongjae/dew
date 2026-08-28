import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { UsageSource } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DOTS = 9;

type UsageStripProps = {
  period: string;
  sources: UsageSource[];
  sample: boolean;
  onPeriodChange: (period: "weekly" | "monthly") => void;
};

const secondsToHoursLabel = (seconds: number): string => {
  const hours = seconds / 3600;
  if (hours >= 10) return `${Math.round(hours)}h`;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded}h`;
};

export const UsageStrip = ({ period, sources, sample, onPeriodChange }: UsageStripProps) => {
  const primary = sources.find((source) => source.available) ?? sources[0];
  const capSeconds = primary?.capSeconds ?? (period === "weekly" ? 5 * 3600 : undefined);
  const capLabel = primary?.capLabel ?? (capSeconds ? secondsToHoursLabel(capSeconds) : undefined);
  const daily = primary?.dailySeconds;
  const available = Boolean(primary?.available);
  const heading =
    period === "monthly"
      ? "Monthly usage"
      : capLabel
        ? `Weekly usage toward ${capLabel} cap`
        : "Weekly usage";

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="glass"
              size="sm"
              aria-label="Choose usage period"
              className="gap-1 text-[12px] text-white"
            >
              {period === "monthly" ? "Monthly" : "Weekly"}
              <ChevronDown className="size-3.5 opacity-80" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onPeriodChange("weekly")}>Weekly</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onPeriodChange("monthly")}>Monthly</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="mt-3 text-[13px] leading-5 text-white">{heading}</p>
      <div className="relative mt-3 flex min-h-0 flex-1 flex-col justify-end">
        {capLabel ? (
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[10px] tracking-wide text-white/70">{capLabel}</span>
            <span className="h-px flex-1 border-t border-dashed border-white/35" />
          </div>
        ) : null}
        <div className="grid grid-cols-7 items-end gap-2 px-0.5">
          {DAYS.map((day, index) => {
            const value = daily?.[index] ?? null;
            const filled =
              available && capSeconds && value != null
                ? Math.max(0, Math.min(DOTS, Math.round((value / capSeconds) * DOTS)))
                : 0;
            return (
              <div key={`${day}-${index}`} className="flex flex-col items-center gap-1">
                <div className="flex h-[108px] flex-col-reverse items-center gap-[5px]">
                  {Array.from({ length: DOTS }).map((_, dotIndex) => {
                    const on = dotIndex < filled;
                    return (
                      <span
                        key={dotIndex}
                        className={cn(
                          "size-[7px] rounded-full",
                          on
                            ? "bg-mint shadow-[0_0_6px_rgba(201,245,220,0.7)]"
                            : "bg-white/22",
                        )}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] text-white/75">{day}</span>
              </div>
            );
          })}
        </div>
        {!available ? (
          <p className="mt-2 text-[11px] leading-4 text-white/60">
            {primary?.reason ?? "No local usage signal."} Dew does not invent hours or read BYOK keys.
          </p>
        ) : sample ? (
          <p className="mt-2 text-[11px] leading-4 text-mint/90">Sample layout — not your live usage.</p>
        ) : (
          <p className="mt-2 text-[11px] leading-4 text-white/55">
            {primary?.reason ?? `${primary?.displayName} local usage`}
          </p>
        )}
      </div>
    </div>
  );
};
