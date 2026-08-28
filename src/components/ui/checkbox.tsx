import { Check } from "lucide-react";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
};

export const Checkbox = ({ checked, onCheckedChange, label, disabled = false }: CheckboxProps) => {
  const handleClick = () => {
    if (disabled) return;
    onCheckedChange(!checked);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-[6px] border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70",
        checked
          ? "border-mint bg-mint text-slate-800"
          : "border-white/40 bg-white/10 text-transparent hover:bg-white/16",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
    </button>
  );
};
