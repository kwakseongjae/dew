import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type DoneBadgeProps = {
  onActivate: () => void;
  label: string;
};

export const DoneBadge = ({ onActivate, label }: DoneBadgeProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  };

  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
      className={cn(
        "animate-done-pop animate-mint-glow grid size-8 place-items-center rounded-full",
        "bg-mint text-lg font-semibold leading-none text-slate-800",
        "shadow-[0_0_16px_6px_rgba(182,240,208,0.55)]",
      )}
    >
      !
    </button>
  );
};
