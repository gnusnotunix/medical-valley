/**
 * Domain entities — mirror the database schema in the case TZ (section 3),
 * so the mock API and the future FastAPI backend share the same shapes.
 */

export type FileFormat = "pdf" | "docx" | "xlsx" | "scan_pdf";

export type ParseStatus =
  | "pending"
  | "processing"
  | "done"
  | "error"
  | "needs_review";

export type Currency = "KZT" | "USD" | "RUB";

export type VerificationStatus = "verified" | "needs_review" | "rejected";

export interface Partner {
  partnerId: string;
  name: string;
  city: string;
  address: string;
  bin?: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Denormalized fields the UI reads constantly — computed by the mock
  // service layer today, by backend aggregation queries later.
  documentsCount: number;
  servicesCount: number;
  normalizationRate: number; // 0..100
  parseStatus: ParseStatus;
}

export interface PriceDocument {
  docId: string;
  partnerId: string;
  fileName: string;
  fileFormat: FileFormat;
  fileSizeKb: number;
  effectiveDate: string;
  parsedAt: string | null;
  parseStatus: ParseStatus;
  parseLog?: string;
  detectedServicesCount: number;
  uploadedAt: string;
}

export interface PriceItem {
  itemId: string;
  docId: string;
  partnerId: string;
  serviceNameRaw: string;
  serviceCodeSource?: string;
  serviceId?: string;
  priceResidentKzt: number;
  priceNonresidentKzt?: number;
  priceOriginal: number;
  currencyOriginal: Currency;
  isVerified: boolean;
  verificationNote?: string;
  effectiveDate: string;
  isActive: boolean;
}

export interface Service {
  serviceId: string;
  serviceName: string;
  synonyms: string[];
  category: string;
  icdCode?: string;
  isActive: boolean;
  partnersCount: number;
}

export interface VerificationQueueItem {
  queueId: string;
  partnerId: string;
  partnerName: string;
  serviceNameRaw: string;
  suggestedServiceId?: string;
  suggestedServiceName?: string;
  confidence: number; // 0..1
  status: VerificationStatus;
  detectedAt: string;
}

export interface PriceHistoryPoint {
  date: string;
  priceResidentKzt: number;
  priceNonresidentKzt?: number;
}

export interface DashboardStats {
  processedDocuments: number;
  partnersCount: number;
  servicesCount: number;
  normalizationSuccessRate: number; // 0..100
  itemsWaitingVerification: number;
  errorsCount: number;
}
