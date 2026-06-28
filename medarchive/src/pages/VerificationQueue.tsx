import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  X,
  FileText,
  Sparkles,
  ListChecks,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfidenceBar } from "@/components/shared/ConfidenceBar";
import { VerificationStatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchQueue,
  fetchSuggestions,
  applyDecision,
  applyMatch,
} from "@/services/verification.service";
import type { VerificationQueueItem, VerificationStatus } from "@/types";
import { cn } from "@/utils/cn";
import { formatRelative } from "@/utils/format";

type StatusFilter = VerificationStatus | "all";

export default function VerificationQueue() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("needs_review");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: queue, isLoading } = useQuery({
    queryKey: ["verification", filter],
    queryFn: () => fetchQueue({ status: filter }),
  });

  const selected =
    queue?.find((q) => q.queueId === selectedId) ?? queue?.[0] ?? null;

  const decisionMut = useMutation({
    mutationFn: ({
      queueId,
      decision,
    }: {
      queueId: string;
      decision: VerificationStatus;
    }) => applyDecision(queueId, decision),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["verification"] });
      qc.invalidateQueries({ queryKey: ["verification-count"] });
      toast.success(
        vars.decision === "rejected" ? "Позиция отклонена" : "Позиция подтверждена",
      );
      setSelectedId(null);
    },
  });

  const matchMut = useMutation({
    mutationFn: ({ queueId, serviceId }: { queueId: string; serviceId: string }) =>
      applyMatch(queueId, serviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verification"] });
      qc.invalidateQueries({ queryKey: ["verification-count"] });
      toast.success("Сопоставление сохранено");
      setSelectedId(null);
    },
  });

  const pending = decisionMut.isPending || matchMut.isPending;

  return (
    <div>
      <PageHeader
        title="Очередь верификации"
        description="Несопоставленные и сомнительные позиции прайсов — подтвердите, исправьте или отклоните"
        actions={
          <Select value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="needs_review">Требуют ревью</SelectItem>
              <SelectItem value="verified">Проверенные</SelectItem>
              <SelectItem value="rejected">Отклонённые</SelectItem>
              <SelectItem value="all">Все</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <Skeleton className="h-[28rem]" />
          <Skeleton className="h-[28rem]" />
        </div>
      ) : !queue || queue.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Очередь пуста"
          description="Все позиции в этом фильтре обработаны. Переключите фильтр, чтобы увидеть остальные."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <QueueList
            items={queue}
            selectedId={selected?.queueId ?? null}
            onSelect={setSelectedId}
          />
          {selected ? (
            <ReviewPanel
              key={selected.queueId}
              item={selected}
              disabled={pending}
              onDecision={(decision) =>
                decisionMut.mutate({ queueId: selected.queueId, decision })
              }
              onMatch={(serviceId) =>
                matchMut.mutate({ queueId: selected.queueId, serviceId })
              }
            />
          ) : (
            <Card>
              <CardContent className="flex h-full items-center justify-center py-20 text-sm text-muted">
                Выберите позицию слева
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function QueueList({
  items,
  selectedId,
  onSelect,
}: {
  items: VerificationQueueItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
        {items.length} позиц. в очереди
      </div>
      <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto">
        {items.map((item) => {
          const active = item.queueId === selectedId;
          return (
            <li key={item.queueId}>
              <button
                onClick={() => onSelect(item.queueId)}
                className={cn(
                  "w-full px-4 py-3 text-left transition-colors",
                  active ? "bg-primary-tint" : "hover:bg-surface",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {item.serviceNameRaw}
                  </span>
                  <ConfidenceBar value={item.confidence} />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                  <span>{item.partnerName}</span>
                  <span>·</span>
                  <span>{formatRelative(item.detectedAt)}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ReviewPanel({
  item,
  disabled,
  onDecision,
  onMatch,
}: {
  item: VerificationQueueItem;
  disabled: boolean;
  onDecision: (decision: VerificationStatus) => void;
  onMatch: (serviceId: string) => void;
}) {
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["suggestions", item.queueId],
    queryFn: () => fetchSuggestions(item.serviceNameRaw, item.suggestedServiceId),
  });

  return (
    <Card>
      <CardContent className="space-y-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Исходная позиция прайса
            </div>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              {item.serviceNameRaw}
            </h2>
            <div className="mt-1 text-sm text-muted-foreground">
              {item.partnerName}
            </div>
          </div>
          <VerificationStatusBadge status={item.status} />
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-surface/50 px-4 py-3">
          <FileText className="h-4 w-4 shrink-0 text-muted" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Фрагмент документа: строка распознана автоматически. Извлечённое
            название не совпало со справочником с достаточной уверенностью —
            подтвердите предложение или выберите услугу вручную.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Предложения справочника
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {suggestions?.map((s, idx) => (
                <li
                  key={s.service.serviceId}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md border px-4 py-3",
                    idx === 0
                      ? "border-primary/30 bg-primary-tint/40"
                      : "border-border bg-card",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {s.service.serviceName}
                      </span>
                      {idx === 0 && <Badge variant="primary">Лучшее</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {s.service.category}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <ConfidenceBar value={s.score} />
                    <Button
                      size="sm"
                      variant={idx === 0 ? "primary" : "outline"}
                      disabled={disabled}
                      onClick={() => onMatch(s.service.serviceId)}
                    >
                      Привязать
                      <ArrowRight />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-5">
          <Button
            variant="success"
            disabled={disabled || !item.suggestedServiceId}
            onClick={() => onDecision("verified")}
          >
            <Check />
            Подтвердить предложенное
          </Button>
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => onDecision("rejected")}
          >
            <X />
            Отклонить позицию
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
