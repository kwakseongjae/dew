import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        glass:
          "border border-white/30 bg-white/10 text-white hover:bg-white/20",
        mint: "bg-mint text-slate-800 hover:bg-mint-soft",
        ghost: "text-white/80 hover:bg-white/10 hover:text-white",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-9 px-3.5",
        lg: "h-11 px-6 text-[15px]",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "glass",
      size: "sm",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
};
