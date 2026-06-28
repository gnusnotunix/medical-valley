import { cn } from "@/utils/cn";
import { formatConfidence } from "@/utils/format";

interface ConfidenceBarProps {
  value: number;
  threshold?: number;
  className?: string;
}

export function ConfidenceBar({
  value,
  threshold = 0.85,
  className,
}: ConfidenceBarProps) {
  const pct = Math.round(value * 100);
  const tone =
    value >= threshold
      ? "bg-success"
      : value >= 0.6
        ? "bg-warning"
        : "bg-danger";
  const textTone =
    value >= threshold
      ? "text-success"
      : value >= 0.6
        ? "text-warning"
        : "text-danger";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-surface">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("data-mono text-xs font-semibold", textTone)}>
        {formatConfidence(value)}
      </span>
    </div>
  );
}
