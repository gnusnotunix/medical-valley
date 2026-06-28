import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck, MapPin } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { searchServices, type SearchResult } from "@/services/search.service";
import { ROUTES } from "@/constants/navigation";
import { formatPrice, formatDate } from "@/utils/format";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [term, setTerm] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);

  useEffect(() => {
    setTerm(initial);
    setSubmitted(initial);
  }, [initial]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["search", submitted],
    queryFn: () => searchServices(submitted),
    enabled: submitted.length > 0,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(term);
    setParams(term ? { q: term } : {});
  }

  return (
    <div>
      <PageHeader
        title="Поиск услуг"
        description="Найдите услугу и сравните цены у клиник-партнёров"
      />

      <form onSubmit={submit} className="relative mb-8 max-w-2xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Например: анализ крови, УЗИ, консультация кардиолога"
          className="h-12 pl-11 text-base"
          autoFocus
        />
      </form>

      {!submitted ? (
        <EmptyState
          icon={Search}
          title="Начните поиск"
          description="Введите название услуги или категорию — покажем все клиники, где она оказывается, с ценами для резидентов и нерезидентов."
        />
      ) : isLoading || isFetching ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Search}
          title={`Ничего не найдено по запросу «${submitted}»`}
          description="Попробуйте изменить формулировку или искать по категории услуги."
        />
      ) : (
        <div className="space-y-6">
          {data.map((result) => (
            <ResultCard key={result.service.serviceId} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  const { service, offers, minPrice, maxPrice } = result;
  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {service.serviceName}
              </h2>
              <Badge variant="accent">{service.category}</Badge>
            </div>
            {service.synonyms.length > 0 && (
              <div className="mt-1 text-xs text-muted">
                Синонимы: {service.synonyms.join(", ")}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">Разброс цен (резидент)</div>
            <div className="data-mono text-sm font-semibold text-foreground">
              {formatPrice(minPrice)} — {formatPrice(maxPrice)}
            </div>
          </div>
        </div>

        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-4 text-left font-semibold">Клиника</th>
              <th className="px-4 py-2 text-left font-semibold">Город</th>
              <th className="px-4 py-2 text-right font-semibold">Резидент</th>
              <th className="px-4 py-2 text-right font-semibold">Нерезидент</th>
              <th className="py-2 pl-4 text-right font-semibold">Актуально</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer, idx) => (
              <tr
                key={offer.partnerId}
                className="border-t border-border first:border-t-0"
              >
                <td className="py-3 pr-4">
                  <Link
                    to={ROUTES.partnerDetail(offer.partnerId)}
                    className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary"
                  >
                    {offer.partnerName}
                    {offer.isVerified && (
                      <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                    )}
                  </Link>
                  {idx === 0 && (
                    <Badge variant="success" className="ml-2">
                      Минимум
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {offer.city}
                  </span>
                </td>
                <td className="data-mono px-4 py-3 text-right font-semibold text-foreground">
                  {formatPrice(offer.priceResidentKzt)}
                </td>
                <td className="data-mono px-4 py-3 text-right text-muted-foreground">
                  {offer.priceNonresidentKzt
                    ? formatPrice(offer.priceNonresidentKzt)
                    : "—"}
                </td>
                <td className="data-mono py-3 pl-4 text-right text-xs text-muted">
                  {formatDate(offer.effectiveDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
