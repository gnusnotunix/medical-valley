import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, FileText, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ParseStatusBadge } from "@/components/shared/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchPartners,
  fetchPartnerCities,
} from "@/services/partners.service";
import { ROUTES } from "@/constants/navigation";
import { formatPercent } from "@/utils/format";
import type { Partner } from "@/types";

export default function Partners() {
  const [city, setCity] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [query, setQuery] = useState("");

  const { data: cities } = useQuery({
    queryKey: ["partner-cities"],
    queryFn: fetchPartnerCities,
  });

  const { data: partners, isLoading } = useQuery({
    queryKey: ["partners", city, status, query],
    queryFn: () => fetchPartners({ city, status, query }),
  });

  return (
    <div>
      <PageHeader
        title="Партнёры"
        description="Клиники-партнёры архива — покрытие, статус обработки, нормализация"
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию или городу"
          className="max-w-xs"
        />
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Город" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все города</SelectItem>
            {cities?.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Любой статус</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="inactive">Неактивные</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : !partners || partners.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Партнёры не найдены"
          description="Измените фильтры или поисковый запрос."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => (
            <PartnerCard key={p.partnerId} partner={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <Link to={ROUTES.partnerDetail(partner.partnerId)}>
      <Card className="h-full p-5 transition-shadow hover:shadow-hover">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground">
              {partner.name}
            </h3>
            <div className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {partner.city}
            </div>
          </div>
          {!partner.isActive && <Badge variant="neutral">Неактивен</Badge>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4 text-muted" />
            <span className="data-mono font-semibold text-foreground">
              {partner.documentsCount}
            </span>
            докум.
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Stethoscope className="h-4 w-4 text-muted" />
            <span className="data-mono font-semibold text-foreground">
              {partner.servicesCount}
            </span>
            услуг
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <ParseStatusBadge status={partner.parseStatus} />
          <Badge
            variant={
              partner.normalizationRate >= 85
                ? "success"
                : partner.normalizationRate >= 60
                  ? "warning"
                  : "danger"
            }
          >
            {formatPercent(partner.normalizationRate)} норм.
          </Badge>
        </div>
      </Card>
    </Link>
  );
}
