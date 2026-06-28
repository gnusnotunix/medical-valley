import { type LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/utils/cn";

type Accent = "primary" | "accent" | "success" | "warning" | "danger";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: Accent;
  hint?: string;
  trend?: { direction: "up" | "down"; value: string };
}

const ACCENT: Record<Accent, { ring: string; icon: string }> = {
  primary: { ring: "bg-primary-tint", icon: "text-primary" },
  accent: { ring: "bg-accent-tint", icon: "text-accent" },
  success: { ring: "bg-success-tint", icon: "text-success" },
  warning: { ring: "bg-warning-tint", icon: "text-warning" },
  danger: { ring: "bg-danger-tint", icon: "text-danger" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  hint,
  trend,
}: StatCardProps) {
  const a = ACCENT[accent];
  return (
    <div className="group rounded-lg border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-hover">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            a.ring,
          )}
        >
          <Icon className={cn("h-4.5 w-4.5", a.icon)} />
        </span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="data-mono text-3xl font-bold leading-none text-foreground">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "mb-0.5 inline-flex items-center gap-0.5 text-xs font-medium",
              trend.direction === "up" ? "text-success" : "text-danger",
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trend.value}
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
