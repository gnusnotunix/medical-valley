import type { Service } from "@/types";
import { DATASET } from "@/api/mock/dataset";
import { delay } from "@/services/delay";

export interface SearchPartnerOffer {
  partnerId: string;
  partnerName: string;
  city: string;
  priceResidentKzt: number;
  priceNonresidentKzt?: number;
  isVerified: boolean;
  effectiveDate: string;
}

export interface SearchResult {
  service: Service;
  offers: SearchPartnerOffer[];
  minPrice: number;
  maxPrice: number;
}

export async function searchServices(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return delay([]);

  const matchedServices = DATASET.services.filter((s) => {
    if (s.serviceName.toLowerCase().includes(q)) return true;
    if (s.category.toLowerCase().includes(q)) return true;
    return s.synonyms.some((syn) => syn.toLowerCase().includes(q));
  });

  const results: SearchResult[] = matchedServices.map((service) => {
    const items = DATASET.items.filter(
      (x) => x.serviceId === service.serviceId && x.isActive,
    );

    const byPartner = new Map<string, (typeof items)[number]>();
    for (const it of items) {
      const existing = byPartner.get(it.partnerId);
      if (!existing || it.priceResidentKzt < existing.priceResidentKzt) {
        byPartner.set(it.partnerId, it);
      }
    }

    const offers: SearchPartnerOffer[] = [...byPartner.values()].map((it) => {
      const partner = DATASET.partners.find((p) => p.partnerId === it.partnerId)!;
      return {
        partnerId: partner.partnerId,
        partnerName: partner.name,
        city: partner.city,
        priceResidentKzt: it.priceResidentKzt,
        priceNonresidentKzt: it.priceNonresidentKzt,
        isVerified: it.isVerified,
        effectiveDate: it.effectiveDate,
      };
    });

    offers.sort((a, b) => a.priceResidentKzt - b.priceResidentKzt);
    const prices = offers.map((o) => o.priceResidentKzt);

    return {
      service,
      offers,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
    };
  });

  return delay(results.filter((r) => r.offers.length > 0));
}
