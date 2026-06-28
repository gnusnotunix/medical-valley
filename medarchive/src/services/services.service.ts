import type { Service } from "@/types";
import { DATASET } from "@/api/mock/dataset";
import { delay } from "@/services/delay";

export async function fetchServices(category?: string): Promise<Service[]> {
  let result = [...DATASET.services];
  if (category && category !== "all") {
    result = result.filter((s) => s.category === category);
  }
  return delay(result.sort((a, b) => a.serviceName.localeCompare(b.serviceName, "ru")));
}

export async function fetchServiceCategories(): Promise<string[]> {
  const cats = [...new Set(DATASET.services.map((s) => s.category))].sort();
  return delay(cats, 80);
}
