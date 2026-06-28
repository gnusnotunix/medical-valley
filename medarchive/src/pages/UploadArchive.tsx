import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import {
  submitBatch,
  fetchBatchStatus,
  type JobView,
} from "@/services/upload.service";

const EXT_META: Record<string, { label: string; icon: typeof FileText; tone: string }> = {
  pdf: { label: "PDF", icon: FileText, tone: "text-danger" },
  docx: { label: "DOCX", icon: FileText, tone: "text-primary" },
  xlsx: { label: "XLSX", icon: FileSpreadsheet, tone: "text-success" },
  xls: { label: "XLS", icon: FileSpreadsheet, tone: "text-success" },
  png: { label: "PNG", icon: ImageIcon, tone: "text-accent" },
  jpg: { label: "JPG", icon: ImageIcon, tone: "text-accent" },
  jpeg: { label: "JPG", icon: ImageIcon, tone: "text-accent" },
};

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

const POLL_INTERVAL_MS = 1500;

export default function UploadArchive() {
  const [dragging, setDragging] = useState(false);
  const [jobs, setJobs] = useState<JobView[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const startPolling = useCallback(
    (jobIds: string[]) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetchBatchStatus(jobIds);
          setJobs((prev) =>
            prev.map((j) => res.jobs.find((r) => r.job_id === j.job_id) ?? j),
          );
          if (res.done >= res.count) {
            stopPolling();
            toast.success("Обработка архива завершена");
          }
        } catch {
          stopPolling();
          toast.error("Не удалось получить статус обработки");
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);
      setSubmitting(true);
      try {
        const res = await submitBatch(files);
        setJobs(res.jobs);
        toast.info(`Принято ${res.count} файлов, обработка началась`);
        const ids = res.jobs
          .filter((j) => j.status !== "error")
          .map((j) => j.job_id);
        if (ids.length > 0) startPolling(ids);
      } catch (e) {
        toast.error("Не удалось загрузить архив. Проверьте, что бэкенд запущен.");
      } finally {
        setSubmitting(false);
      }
    },
    [startPolling],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  const doneCount = jobs.filter(
    (j) => j.status === "ready" || j.status === "error",
  ).length;
  const overall = jobs.length > 0 ? Math.round((doneCount / jobs.length) * 100) : 0;
  const isRunning = jobs.length > 0 && doneCount < jobs.length;

  return (
    <div>
      <PageHeader
        title="Загрузка архива"
        description="Загрузите прайс-листы клиник — PDF, DOCX, XLSX или сканы. Система определит формат, распознает текст и структурирует позиции через Gemini"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
          dragging
            ? "border-primary bg-primary-tint"
            : "border-border bg-surface/40 hover:border-primary/50 hover:bg-surface",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.bmp,.tiff,.tif,.webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint text-primary">
          <UploadCloud className="h-7 w-7" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          Перетащите файлы сюда
        </h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          PDF (текст и скан), DOCX, XLSX/XLS, изображения. Можно выбрать сразу
          несколько файлов — каждый обрабатывается независимо в фоне.
        </p>
        <Button className="mt-5" disabled={submitting || isRunning}>
          <UploadCloud />
          {submitting ? "Отправка…" : "Выбрать файлы"}
        </Button>
      </div>

      {jobs.length > 0 && (
        <Card className="mt-6">
          <CardContent className="py-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Прогресс обработки
                </div>
                <div className="text-xs text-muted-foreground">
                  {doneCount} из {jobs.length} файлов готово
                </div>
              </div>
              <span className="data-mono text-2xl font-bold text-primary">
                {overall}%
              </span>
            </div>
            <Progress value={overall} className="mb-5 h-2.5" />

            <ul className="space-y-2">
              {jobs.map((job) => (
                <JobRow key={job.job_id} job={job} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function JobRow({ job }: { job: JobView }) {
  const ext = extOf(job.file_name);
  const meta = EXT_META[ext] ?? { label: ext.toUpperCase() || "—", icon: FileText, tone: "text-muted" };
  const Icon = meta.icon;
  const result = job.result;

  return (
    <li className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
      <Icon className={cn("h-4 w-4 shrink-0", meta.tone)} />
      <div className="min-w-0 flex-1">
        <div className="data-mono truncate text-xs text-foreground" title={job.file_name}>
          {job.file_name}
        </div>
        {result && (
          <div className="mt-0.5 truncate text-xs text-muted">
            {result.clinic_name ?? "Клиника не определена"} ·{" "}
            {result.items.length} позиций
          </div>
        )}
      </div>
      <Badge variant="neutral">{meta.label}</Badge>
      {job.status === "processing" && job.elapsed_seconds !== undefined && (
        <span className="data-mono text-xs text-muted">
          {job.elapsed_seconds.toFixed(0)}с
        </span>
      )}
      <StatusBadge status={job.status} parseStatus={result?.parse_status} />
    </li>
  );
}

function StatusBadge({
  status,
  parseStatus,
}: {
  status: JobView["status"];
  parseStatus?: string;
}) {
  if (status === "ready") {
    if (parseStatus === "error")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
          <AlertTriangle className="h-4 w-4" />
          Ошибка
        </span>
      );
    if (parseStatus === "needs_review")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
          <AlertTriangle className="h-4 w-4" />
          Нужна проверка
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-4 w-4" />
        Готово
      </span>
    );
  }
  if (status === "processing")
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />;
  if (status === "error")
    return <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />;
  return <Clock className="h-4 w-4 shrink-0 text-muted" />;
}
