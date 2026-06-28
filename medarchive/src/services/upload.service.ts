import { http, USE_MOCK_API } from "@/services/http";
import { delay } from "@/services/delay";
import type { FileFormat, ParseStatus } from "@/types";

export interface OcrItem {
  service_name_raw: string;
  service_code_source: string | null;
  category: string | null;
  service_id: string | null;
  price_resident_kzt: number | null;
  price_nonresident_kzt: number | null;
  price_original: number | null;
  price_nonresident_original: number | null;
  currency_original: "KZT" | "USD" | "RUB";
  is_verified: boolean;
  verification_note: string | null;
}

export interface OcrResult {
  file_name: string;
  file_format: FileFormat | "unknown" | "image";
  clinic_name: string | null;
  city: string | null;
  effective_date: string | null;
  parsed_at: string;
  parse_status: ParseStatus;
  parse_log: string;
  raw_content: string;
  items: OcrItem[];
}

export type JobStatus = "pending" | "processing" | "ready" | "error" | "not_found";

export interface JobView {
  job_id: string;
  file_name: string;
  status: JobStatus;
  elapsed_seconds?: number;
  result?: OcrResult;
  error?: string;
}

export interface BatchSubmitResponse {
  count: number;
  jobs: JobView[];
}

export interface BatchStatusResponse {
  count: number;
  done: number;
  jobs: JobView[];
}

export async function submitBatch(files: File[]): Promise<BatchSubmitResponse> {
  if (USE_MOCK_API) {
    return delay(
      {
        count: files.length,
        jobs: files.map((f, i) => ({
          job_id: `mock-job-${i}`,
          file_name: f.name,
          status: "pending" as JobStatus,
        })),
      },
      300,
    );
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await http.post<BatchSubmitResponse>("/api/v1/ocr/batch", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function fetchBatchStatus(jobIds: string[]): Promise<BatchStatusResponse> {
  if (USE_MOCK_API) {
    return delay({ count: jobIds.length, done: jobIds.length, jobs: [] }, 200);
  }

  const res = await http.get<BatchStatusResponse>("/api/v1/ocr/status/batch", {
    params: { job_ids: jobIds.join(",") },
  });
  return res.data;
}
