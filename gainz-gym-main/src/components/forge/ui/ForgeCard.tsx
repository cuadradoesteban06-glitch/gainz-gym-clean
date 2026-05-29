import { cn } from "@/lib/utils";

type ForgeCardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "accent" | "success" | "glass";
};

export function ForgeCard({
  className,
  variant = "default",
  children,
  ...props
}: ForgeCardProps) {
  const variantClass =
    variant === "accent"
      ? "cardA"
      : variant === "success"
        ? "cardG"
        : variant === "glass"
          ? "card-glass"
          : "card";
  return (
    <div className={cn(variantClass, className)} {...props}>
      {children}
    </div>
  );
}
