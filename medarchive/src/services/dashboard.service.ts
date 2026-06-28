import type { DashboardStats } from "@/types";
import { DATASET } from "@/api/mock/dataset";
import { delay } from "@/services/delay";

export interface NormalizationPoint {
  date: string;
  rate: number;
  processed: number;
}

export interface StatusSlice {
  name: string;
  value: number;
  key: "done" | "processing" | "error" | "review";
}

export interface DashboardData {
  stats: DashboardStats;
  normalizationHistory: NormalizationPoint[];
  statusDistribution: StatusSlice[];
  topPartners: {
    partnerId: string;
    name: string;
    city: string;
    documentsCount: number;
    servicesCount: number;
    normalizationRate: number;
  }[];
}

function buildHistory(): NormalizationPoint[] {
  const points: NormalizationPoint[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const base = 62 + (29 - i) * 0.9;
    const noise = Math.sin(i * 1.3) * 5;
    points.push({
      date: d.toISOString().slice(0, 10),
      rate: Math.min(96, Math.round(base + noise)),
      processed: 3 + Math.round(Math.abs(Math.sin(i)) * 9),
    });
  }
  return points;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { documents, items, partners, services, queue } = DATASET;

  const matched = items.filter((x) => x.serviceId).length;
  const normalizationRate =
    items.length > 0 ? Math.round((matched / items.length) * 100) : 0;

  const stats: DashboardStats = {
    processedDocuments: documents.filter((d) => d.parseStatus === "done").length,
    partnersCount: partners.length,
    servicesCount: services.length,
    normalizationSuccessRate: normalizationRate,
    itemsWaitingVerification: queue.filter((q) => q.status === "needs_review").length,
    errorsCount: documents.filter((d) => d.parseStatus === "error").length,
  };

  const allSlices: StatusSlice[] = [
    {
      name: "Обработано",
      key: "done",
      value: documents.filter((d) => d.parseStatus === "done").length,
    },
    {
      name: "В обработке",
      key: "processing",
      value: documents.filter(
        (d) => d.parseStatus === "processing" || d.parseStatus === "pending",
      ).length,
    },
    {
      name: "На ревью",
      key: "review",
      value: documents.filter((d) => d.parseStatus === "needs_review").length,
    },
    {
      name: "Ошибка",
      key: "error",
      value: documents.filter((d) => d.parseStatus === "error").length,
    },
  ];
  const statusDistribution = allSlices.filter((s) => s.value > 0);

  const topPartners = [...partners]
    .sort((a, b) => b.servicesCount - a.servicesCount)
    .slice(0, 6)
    .map((p) => ({
      partnerId: p.partnerId,
      name: p.name,
      city: p.city,
      documentsCount: p.documentsCount,
      servicesCount: p.servicesCount,
      normalizationRate: p.normalizationRate,
    }));

  return delay({
    stats,
    normalizationHistory: buildHistory(),
    statusDistribution,
    topPartners,
  });
}

export async function fetchVerificationCount(): Promise<number> {
  return delay(
    DATASET.queue.filter((q) => q.status === "needs_review").length,
    120,
  );
}
