import {
  LayoutGrid,
  Search,
  Building2,
  Stethoscope,
  ListChecks,
  UploadCloud,
  Settings,
  type LucideIcon,
} from "lucide-react";

export const ROUTES = {
  dashboard: "/",
  search: "/search",
  partners: "/partners",
  partnerDetail: (id: string) => `/partners/${id}`,
  services: "/services",
  verification: "/verification",
  upload: "/upload",
  settings: "/settings",
} as const;

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  group: "main" | "admin";
  badgeKey?: "verification";
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Дашборд", to: ROUTES.dashboard, icon: LayoutGrid, group: "main" },
  { label: "Поиск услуг", to: ROUTES.search, icon: Search, group: "main" },
  { label: "Партнёры", to: ROUTES.partners, icon: Building2, group: "main" },
  { label: "Справочник услуг", to: ROUTES.services, icon: Stethoscope, group: "main" },
  {
    label: "Очередь верификации",
    to: ROUTES.verification,
    icon: ListChecks,
    group: "admin",
    badgeKey: "verification",
  },
  { label: "Загрузка архива", to: ROUTES.upload, icon: UploadCloud, group: "admin" },
  { label: "Настройки", to: ROUTES.settings, icon: Settings, group: "admin" },
];
