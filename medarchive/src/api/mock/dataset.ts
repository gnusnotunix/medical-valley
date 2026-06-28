import { faker } from "@faker-js/faker";
import type {
  Partner,
  PriceDocument,
  PriceItem,
  Service,
  VerificationQueueItem,
  ParseStatus,
  FileFormat,
  VerificationStatus,
} from "@/types";

faker.seed(42);

const CITIES = ["Астана", "Алматы", "Шымкент", "Караганда", "Актобе", "Атырау"];

const CATEGORIES = [
  "Лаборатория",
  "Диагностика",
  "Консультация",
  "Процедура",
  "Хирургия",
];

const SERVICE_NAMES: Record<string, string[]> = {
  Лаборатория: [
    "Общий анализ крови",
    "Биохимический анализ крови",
    "Анализ мочи общий",
    "Коагулограмма",
    "Гормоны щитовидной железы (ТТГ, Т4)",
    "Липидный профиль",
    "Глюкоза крови",
    "С-реактивный белок",
  ],
  Диагностика: [
    "УЗИ органов брюшной полости",
    "ЭКГ с расшифровкой",
    "Рентген грудной клетки",
    "МРТ головного мозга",
    "КТ органов грудной клетки",
    "ФГДС (гастроскопия)",
  ],
  Консультация: [
    "Консультация терапевта",
    "Консультация кардиолога",
    "Консультация невролога",
    "Консультация эндокринолога",
    "Консультация гинеколога",
  ],
  Процедура: [
    "Внутривенная инъекция",
    "Капельница (инфузия)",
    "Перевязка раны",
    "Удаление серной пробки",
    "Физиотерапия (1 сеанс)",
  ],
  Хирургия: [
    "Удаление липомы",
    "Вскрытие абсцесса",
    "Удаление вросшего ногтя",
  ],
};

const SYNONYMS: Record<string, string[]> = {
  "Общий анализ крови": ["ОАК", "клинический анализ крови", "CBC"],
  "Консультация терапевта": ["приём терапевта", "осмотр терапевта"],
  "УЗИ органов брюшной полости": ["УЗИ ОБП", "ультразвук брюшной полости"],
  "ЭКГ с расшифровкой": ["электрокардиограмма", "ЭКГ"],
};

const RAW_VARIANTS: Record<string, string[]> = {
  "Общий анализ крови": [
    "ОАК (5-diff)",
    "Кровь общ. анализ",
    "Анализ крови общий развёрнутый",
  ],
  "Консультация терапевта": [
    "Приём врача-терапевта первичный",
    "Терапевт, консультация",
  ],
  "УЗИ органов брюшной полости": [
    "УЗИ брюшной полости (комплекс)",
    "Ультразвук ОБП",
  ],
};

const FILE_FORMATS: FileFormat[] = ["pdf", "docx", "xlsx", "scan_pdf"];

function buildServices(): Service[] {
  const services: Service[] = [];
  for (const category of CATEGORIES) {
    for (const name of SERVICE_NAMES[category]) {
      services.push({
        serviceId: faker.string.uuid(),
        serviceName: name,
        synonyms: SYNONYMS[name] ?? [],
        category,
        icdCode: faker.helpers.maybe(
          () => `${faker.string.alpha({ length: 1, casing: "upper" })}${faker.number.int({ min: 10, max: 99 })}.${faker.number.int({ min: 0, max: 9 })}`,
          { probability: 0.4 },
        ),
        isActive: true,
        partnersCount: 0,
      });
    }
  }
  return services;
}

function buildPartners(count: number): Partner[] {
  const prefixes = ["Медикер", "Сункар", "Авиценна", "Емен", "Интертич", "Дамумед", "Нур-Клиник", "Рахат-Мед", "Аксай", "Гиппократ", "Панацея", "Достар-Мед"];
  return Array.from({ length: count }, (_, i) => {
    const name = `${prefixes[i % prefixes.length]}${i >= prefixes.length ? " " + (Math.floor(i / prefixes.length) + 1) : ""}`;
    const createdAt = faker.date.past({ years: 2 }).toISOString();
    return {
      partnerId: faker.string.uuid(),
      name,
      city: faker.helpers.arrayElement(CITIES),
      address: `${faker.location.street()}, ${faker.number.int({ min: 1, max: 200 })}`,
      bin: faker.string.numeric(12),
      contactEmail: `info@${faker.internet.domainWord()}.kz`,
      contactPhone: `+7 (7${faker.string.numeric(2)}) ${faker.string.numeric(3)}-${faker.string.numeric(2)}-${faker.string.numeric(2)}`,
      isActive: faker.datatype.boolean({ probability: 0.85 }),
      createdAt,
      updatedAt: faker.date.recent({ days: 30 }).toISOString(),
      documentsCount: 0,
      servicesCount: 0,
      normalizationRate: 0,
      parseStatus: "done" as ParseStatus,
    };
  });
}

const PARSE_WEIGHTED: ParseStatus[] = [
  "done", "done", "done", "done", "done", "done",
  "processing", "needs_review", "pending", "error",
];

function buildDataset() {
  const services = buildServices();
  const partners = buildPartners(12);
  const documents: PriceDocument[] = [];
  const items: PriceItem[] = [];
  const queue: VerificationQueueItem[] = [];

  for (const partner of partners) {
    const docCount = faker.number.int({ min: 1, max: 4 });
    let partnerServiceIds = new Set<string>();

    for (let d = 0; d < docCount; d++) {
      const fmt = faker.helpers.arrayElement(FILE_FORMATS);
      const status = faker.helpers.arrayElement(PARSE_WEIGHTED);
      const effectiveDate = faker.date.between({
        from: partner.createdAt,
        to: new Date(),
      });
      const doc: PriceDocument = {
        docId: faker.string.uuid(),
        partnerId: partner.partnerId,
        fileName: `${partner.name.replace(/\s+/g, "_")}_price_${effectiveDate.getFullYear()}-${String(effectiveDate.getMonth() + 1).padStart(2, "0")}.${fmt === "scan_pdf" ? "pdf" : fmt}`,
        fileFormat: fmt,
        fileSizeKb: faker.number.int({ min: 40, max: 4200 }),
        effectiveDate: effectiveDate.toISOString(),
        parsedAt:
          status === "pending" || status === "processing"
            ? null
            : faker.date.recent({ days: 20 }).toISOString(),
        parseStatus: status,
        detectedServicesCount: 0,
        uploadedAt: faker.date.recent({ days: 25 }).toISOString(),
      };

      const itemCount = faker.number.int({ min: 8, max: 22 });
      let detected = 0;

      for (let s = 0; s < itemCount; s++) {
        const service = faker.helpers.arrayElement(services);
        const raw = faker.helpers.arrayElement(
          RAW_VARIANTS[service.serviceName] ?? [service.serviceName],
        );
        const confidence = faker.number.float({ min: 0.45, max: 0.99, fractionDigits: 2 });
        const matched = confidence >= 0.85;
        const basePrice = faker.number.int({ min: 1500, max: 85000 });
        const currency = faker.helpers.weightedArrayElement([
          { weight: 9, value: "KZT" as const },
          { weight: 1, value: "USD" as const },
        ]);

        const item: PriceItem = {
          itemId: faker.string.uuid(),
          docId: doc.docId,
          partnerId: partner.partnerId,
          serviceNameRaw: raw,
          serviceCodeSource: faker.helpers.maybe(
            () => faker.string.numeric(6),
            { probability: 0.3 },
          ),
          serviceId: matched ? service.serviceId : undefined,
          priceResidentKzt: basePrice,
          priceNonresidentKzt: faker.helpers.maybe(
            () => Math.round(basePrice * faker.number.float({ min: 1.1, max: 1.6, fractionDigits: 2 })),
            { probability: 0.5 },
          ),
          priceOriginal: currency === "USD" ? Math.round(basePrice / 470) : basePrice,
          currencyOriginal: currency,
          isVerified: matched && faker.datatype.boolean({ probability: 0.7 }),
          effectiveDate: doc.effectiveDate,
          isActive: true,
        };
        items.push(item);
        detected++;

        if (matched) partnerServiceIds.add(service.serviceId);

        if (!matched && status === "done") {
          const status2: VerificationStatus = faker.helpers.weightedArrayElement([
            { weight: 7, value: "needs_review" },
            { weight: 2, value: "verified" },
            { weight: 1, value: "rejected" },
          ]);
          queue.push({
            queueId: faker.string.uuid(),
            partnerId: partner.partnerId,
            partnerName: partner.name,
            serviceNameRaw: raw,
            suggestedServiceId: service.serviceId,
            suggestedServiceName: service.serviceName,
            confidence,
            status: status2,
            detectedAt: doc.parsedAt ?? doc.uploadedAt,
          });
        }
      }

      doc.detectedServicesCount = detected;
      documents.push(doc);
    }

    const partnerDocs = documents.filter((x) => x.partnerId === partner.partnerId);
    const partnerItems = items.filter((x) => x.partnerId === partner.partnerId);
    const verifiedCount = partnerItems.filter((x) => x.serviceId).length;

    partner.documentsCount = partnerDocs.length;
    partner.servicesCount = partnerServiceIds.size;
    partner.normalizationRate =
      partnerItems.length > 0
        ? Math.round((verifiedCount / partnerItems.length) * 100)
        : 0;
    partner.parseStatus =
      partnerDocs.find((x) => x.parseStatus === "error")?.parseStatus ??
      partnerDocs.find((x) => x.parseStatus === "processing")?.parseStatus ??
      "done";
  }

  for (const service of services) {
    const partnersWith = new Set(
      items.filter((x) => x.serviceId === service.serviceId).map((x) => x.partnerId),
    );
    service.partnersCount = partnersWith.size;
  }

  return { services, partners, documents, items, queue };
}

export const DATASET = buildDataset();
