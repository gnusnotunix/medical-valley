import type { VerificationQueueItem, Service, VerificationStatus } from "@/types";
import { DATASET } from "@/api/mock/dataset";
import { delay } from "@/services/delay";

export interface VerificationFilter {
  status?: VerificationStatus | "all";
}

export async function fetchQueue(
  filter: VerificationFilter = {},
): Promise<VerificationQueueItem[]> {
  let result = [...DATASET.queue];
  if (filter.status && filter.status !== "all") {
    result = result.filter((q) => q.status === filter.status);
  }
  result.sort((a, b) => a.confidence - b.confidence);
  return delay(result);
}

export interface ServiceSuggestion {
  service: Service;
  score: number;
}

export async function fetchSuggestions(
  rawName: string,
  topServiceId?: string,
): Promise<ServiceSuggestion[]> {
  const q = rawName.toLowerCase();
  const scored = DATASET.services.map((service) => {
    let score = 0;
    const name = service.serviceName.toLowerCase();
    if (service.serviceId === topServiceId) score += 0.5;
    const qWords = q.split(/\s+/);
    const matchWords = qWords.filter((w) => w.length > 2 && name.includes(w));
    score += matchWords.length * 0.18;
    if (service.synonyms.some((s) => q.includes(s.toLowerCase()))) score += 0.25;
    score += Math.random() * 0.1;
    return { service, score: Math.min(0.99, score) };
  });

  scored.sort((a, b) => b.score - a.score);
  return delay(scored.slice(0, 5), 150);
}

export async function applyDecision(
  queueId: string,
  decision: VerificationStatus,
): Promise<void> {
  const item = DATASET.queue.find((q) => q.queueId === queueId);
  if (item) item.status = decision;
  return delay(undefined, 200);
}

export async function applyMatch(
  queueId: string,
  serviceId: string,
): Promise<void> {
  const item = DATASET.queue.find((q) => q.queueId === queueId);
  const svc = DATASET.services.find((s) => s.serviceId === serviceId);
  if (item && svc) {
    item.suggestedServiceId = svc.serviceId;
    item.suggestedServiceName = svc.serviceName;
    item.status = "verified";
  }
  return delay(undefined, 200);
}
