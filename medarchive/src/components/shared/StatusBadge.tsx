import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  XCircle,
  CircleDashed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ParseStatus, VerificationStatus } from "@/types";

const PARSE_MAP: Record<
  ParseStatus,
  { label: string; variant: "success" | "warning" | "danger" | "neutral" | "primary"; icon: typeof Clock }
> = {
  done: { label: "Обработан", variant: "success", icon: CheckCircle2 },
  processing: { label: "Обработка", variant: "primary", icon: Loader2 },
  pending: { label: "В очереди", variant: "neutral", icon: CircleDashed },
  needs_review: { label: "На ревью", variant: "warning", icon: AlertTriangle },
  error: { label: "Ошибка", variant: "danger", icon: XCircle },
};

const VERIFY_MAP: Record<
  VerificationStatus,
  { label: string; variant: "success" | "warning" | "danger"; icon: typeof Clock }
> = {
  verified: { label: "Проверено", variant: "success", icon: CheckCircle2 },
  needs_review: { label: "Требует ревью", variant: "warning", icon: Clock },
  rejected: { label: "Отклонено", variant: "danger", icon: XCircle },
};

export function ParseStatusBadge({ status }: { status: ParseStatus }) {
  const cfg = PARSE_MAP[status];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant}>
      <Icon className={cn(status === "processing" && "animate-spin")} />
      {cfg.label}
    </Badge>
  );
}

export function VerificationStatusBadge({
  status,
}: {
  status: VerificationStatus;
}) {
  const cfg = VERIFY_MAP[status];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant}>
      <Icon />
      {cfg.label}
    </Badge>
  );
}

function cn(...args: (string | false | undefined)[]) {
  return args.filter(Boolean).join(" ");
}
