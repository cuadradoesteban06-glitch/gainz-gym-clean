import { ADAPTATION_BADGES, type AdaptationBadgeId } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type ForgeBadgeProps = {
  id?: AdaptationBadgeId;
  label?: string;
  className?: string;
};

export function ForgeBadge({ id, label, className }: ForgeBadgeProps) {
  const meta = id ? ADAPTATION_BADGES[id] : null;
  const text = label ?? meta?.label ?? "";
  const cls = meta?.className ?? "badge-default";
  return <span className={cn("forge-badge", cls, className)}>{text}</span>;
}

export function ForgeBadgeRow({
  badges,
  className,
}: {
  badges: AdaptationBadgeId[];
  className?: string;
}) {
  if (!badges.length) return null;
  return (
    <div className={cn("badge-row", className)}>
      {badges.map((b) => (
        <ForgeBadge key={b} id={b} />
      ))}
    </div>
  );
}
