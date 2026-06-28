import type { Partner, PriceDocument, PriceItem, PriceHistoryPoint } from "@/types";
import { DATASET } from "@/api/mock/dataset";
import { delay } from "@/services/delay";

export interface PartnersFilter {
  city?: string;
  status?: "all" | "active" | "inactive";
  query?: string;
}

export async function fetchPartners(filter: PartnersFilter = {}): Promise<Partner[]> {
  let result = [...DATASET.partners];
  if (filter.city && filter.city !== "all") {
    result = result.filter((p) => p.city === filter.city);
  }
  if (filter.status === "active") result = result.filter((p) => p.isActive);
  if (filter.status === "inactive") result = result.filter((p) => !p.isActive);
  if (filter.query) {
    const q = filter.query.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q),
    );
  }
  return delay(result);
}

export async function fetchPartnerCities(): Promise<string[]> {
  const cities = [...new Set(DATASET.partners.map((p) => p.city))].sort();
  return delay(cities, 80);
}

export async function fetchPartner(id: string): Promise<Partner | undefined> {
  return delay(DATASET.partners.find((p) => p.partnerId === id));
}

export interface PartnerServiceRow extends PriceItem {
  serviceName: string | null;
  category: string | null;
}

export async function fetchPartnerServices(id: string): Promise<PartnerServiceRow[]> {
  const items = DATASET.items.filter((x) => x.partnerId === id && x.isActive);
  const rows = items.map((item) => {
    const svc = item.serviceId
      ? DATASET.services.find((s) => s.serviceId === item.serviceId)
      : undefined;
    return {
      ...item,
      serviceName: svc?.serviceName ?? null,
      category: svc?.category ?? null,
    };
  });
  return delay(rows);
}

export async function fetchPartnerDocuments(id: string): Promise<PriceDocument[]> {
  const docs = DATASET.documents
    .filter((d) => d.partnerId === id)
    .sort(
      (a, b) =>
        new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime(),
    );
  return delay(docs);
}

export async function fetchPriceHistory(
  partnerId: string,
): Promise<{ serviceName: string; points: PriceHistoryPoint[] }> {
  const items = DATASET.items.filter((x) => x.partnerId === partnerId && x.serviceId);
  const grouped = new Map<string, PriceItem[]>();
  for (const it of items) {
    const arr = grouped.get(it.serviceId!) ?? [];
    arr.push(it);
    grouped.set(it.serviceId!, arr);
  }

  let bestId = "";
  let bestLen = 0;
  for (const [id, arr] of grouped) {
    if (arr.length > bestLen) {
      bestLen = arr.length;
      bestId = id;
    }
  }

  const svc = DATASET.services.find((s) => s.serviceId === bestId);
  const base = grouped.get(bestId) ?? [];
  const now = new Date();
  const points: PriceHistoryPoint[] = base
    .slice(0, 8)
    .map((it, idx) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (7 - idx) * 2);
      const drift = 1 + (idx - 4) * 0.04;
      return {
        date: d.toISOString().slice(0, 10),
        priceResidentKzt: Math.round(it.priceResidentKzt * drift),
        priceNonresidentKzt: it.priceNonresidentKzt
          ? Math.round(it.priceNonresidentKzt * drift)
          : undefined,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return delay({ serviceName: svc?.serviceName ?? "—", points });
}
