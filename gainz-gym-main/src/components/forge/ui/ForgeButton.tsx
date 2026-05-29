import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const forgeButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "btn",
        outline: "btnO",
        ghost: "btnX",
        success: "btnG",
      },
      size: {
        sm: "forge-btn-sm",
        md: "",
        lg: "",
        icon: "coach-send-btn",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export type ForgeButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof forgeButtonVariants>;

export function ForgeButton({
  className,
  variant,
  size,
  ...props
}: ForgeButtonProps) {
  return (
    <button
      className={cn(forgeButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { forgeButtonVariants };
