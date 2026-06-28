import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Hash,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/StatCard";
import { ParseStatusBadge } from "@/components/shared/StatusBadge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  fetchPartner,
  fetchPartnerServices,
  fetchPartnerDocuments,
  fetchPriceHistory,
} from "@/services/partners.service";
import { ROUTES } from "@/constants/navigation";
import {
  formatPrice,
  formatDate,
  formatPercent,
  formatFileSize,
  formatKzt,
} from "@/utils/format";
import { FileText, Stethoscope, CheckCircle2 } from "lucide-react";

export default function PartnerDetail() {
  const { partnerId = "" } = useParams();

  const { data: partner, isLoading } = useQuery({
    queryKey: ["partner", partnerId],
    queryFn: () => fetchPartner(partnerId),
  });

  if (isLoading) {
    return (
      <div>
        <Skeleton className="mb-6 h-8 w-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!partner) {
    return (
      <EmptyState
        icon={Building2}
        title="Партнёр не найден"
        description="Возможно, запись была удалена или ссылка неверна."
      />
    );
  }

  return (
    <div>
      <Link
        to={ROUTES.partners}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Все партнёры
      </Link>

      <PageHeader
        title={partner.name}
        description={`БИН ${partner.bin ?? "—"} · добавлен ${formatDate(partner.createdAt)}`}
        actions={
          partner.isActive ? (
            <Badge variant="success">Активный партнёр</Badge>
          ) : (
            <Badge variant="neutral">Неактивен</Badge>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ContactItem icon={MapPin} label="Город" value={partner.city} />
        <ContactItem icon={Mail} label="Email" value={partner.contactEmail} mono />
        <ContactItem icon={Phone} label="Телефон" value={partner.contactPhone} mono />
        <ContactItem
          icon={Hash}
          label="Адрес"
          value={partner.address}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Прайс-документов"
          value={partner.documentsCount}
          icon={FileText}
        />
        <StatCard
          label="Услуг в прайсе"
          value={partner.servicesCount}
          icon={Stethoscope}
          accent="accent"
        />
        <StatCard
          label="Нормализация"
          value={formatPercent(partner.normalizationRate)}
          icon={CheckCircle2}
          accent="success"
        />
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Прайс-документы</TabsTrigger>
          <TabsTrigger value="services">Услуги и цены</TabsTrigger>
          <TabsTrigger value="history">История цен</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DocumentsTab partnerId={partnerId} />
        </TabsContent>
        <TabsContent value="services">
          <ServicesTab partnerId={partnerId} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab partnerId={partnerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContactItem({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div
        className={`mt-1.5 truncate text-sm text-foreground ${mono ? "data-mono" : ""}`}
        title={value}
      >
        {value}
      </div>
    </Card>
  );
}

function DocumentsTab({ partnerId }: { partnerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["partner-docs", partnerId],
    queryFn: () => fetchPartnerDocuments(partnerId),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data || data.length === 0)
    return (
      <EmptyState
        icon={FileText}
        title="Документов нет"
        description="Для этого партнёра ещё не загружены прайс-листы."
      />
    );

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Файл</TableHead>
            <TableHead>Формат</TableHead>
            <TableHead className="text-right">Размер</TableHead>
            <TableHead className="text-right">Позиций</TableHead>
            <TableHead>Дата прайса</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((doc) => (
            <TableRow key={doc.docId}>
              <TableCell className="data-mono max-w-xs truncate text-xs" title={doc.fileName}>
                {doc.fileName}
              </TableCell>
              <TableCell>
                <Badge variant="neutral">
                  {doc.fileFormat === "scan_pdf" ? "скан PDF" : doc.fileFormat.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="data-mono text-right text-muted-foreground">
                {formatFileSize(doc.fileSizeKb)}
              </TableCell>
              <TableCell className="data-mono text-right">
                {doc.detectedServicesCount}
              </TableCell>
              <TableCell className="data-mono text-sm">
                {formatDate(doc.effectiveDate)}
              </TableCell>
              <TableCell>
                <ParseStatusBadge status={doc.parseStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ServicesTab({ partnerId }: { partnerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["partner-services", partnerId],
    queryFn: () => fetchPartnerServices(partnerId),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data || data.length === 0)
    return (
      <EmptyState
        icon={Stethoscope}
        title="Услуг нет"
        description="В прайсах этого партнёра не извлечено ни одной позиции."
      />
    );

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Услуга (как в прайсе)</TableHead>
            <TableHead>Нормализована</TableHead>
            <TableHead className="text-right">Резидент</TableHead>
            <TableHead className="text-right">Нерезидент</TableHead>
            <TableHead className="text-center">Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.itemId}>
              <TableCell className="max-w-xs">
                <div className="truncate font-medium" title={row.serviceNameRaw}>
                  {row.serviceNameRaw}
                </div>
              </TableCell>
              <TableCell>
                {row.serviceName ? (
                  <span className="text-sm text-foreground">
                    {row.serviceName}
                    {row.category && (
                      <span className="ml-2 text-xs text-muted">
                        · {row.category}
                      </span>
                    )}
                  </span>
                ) : (
                  <Badge variant="warning">не сопоставлено</Badge>
                )}
              </TableCell>
              <TableCell className="data-mono text-right font-semibold">
                {formatPrice(row.priceResidentKzt)}
              </TableCell>
              <TableCell className="data-mono text-right text-muted-foreground">
                {row.priceNonresidentKzt
                  ? formatPrice(row.priceNonresidentKzt)
                  : "—"}
              </TableCell>
              <TableCell className="text-center">
                {row.isVerified ? (
                  <ShieldCheck className="mx-auto h-4 w-4 text-accent" />
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function HistoryTab({ partnerId }: { partnerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["partner-history", partnerId],
    queryFn: () => fetchPriceHistory(partnerId),
  });

  if (isLoading) return <Skeleton className="h-80" />;
  if (!data || data.points.length === 0)
    return (
      <EmptyState
        icon={Stethoscope}
        title="Недостаточно данных"
        description="История цен появится, когда у партнёра будет несколько прайсов с одной услугой."
      />
    );

  return (
    <Card>
      <CardContent className="py-6">
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            Динамика цены
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {data.serviceName}
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data.points} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 18% 91%)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => v.slice(0, 7)}
              tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v) => formatKzt(v as number)}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid hsl(214 18% 91%)",
                fontSize: 12,
              }}
              labelFormatter={(v) => formatDate(v as string)}
              formatter={(value: number, name) => [
                formatPrice(value),
                name === "priceResidentKzt" ? "Резидент" : "Нерезидент",
              ]}
            />
            <Legend
              formatter={(value) =>
                value === "priceResidentKzt" ? "Резидент" : "Нерезидент"
              }
            />
            <Line
              type="monotone"
              dataKey="priceResidentKzt"
              stroke="hsl(170 75% 24%)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="priceNonresidentKzt"
              stroke="hsl(38 65% 47%)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
