import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FileText,
  Building2,
  Stethoscope,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetchDashboard } from "@/services/dashboard.service";
import { ROUTES } from "@/constants/navigation";
import { formatDate, formatPercent } from "@/utils/format";

const STATUS_COLORS: Record<string, string> = {
  done: "hsl(152 65% 33%)",
  processing: "hsl(170 75% 24%)",
  review: "hsl(38 65% 47%)",
  error: "hsl(5 60% 47%)",
};

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader
          title="Дашборд"
          description="Обзор обработки архива и партнёрской сети"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const { stats, normalizationHistory, statusDistribution, topPartners } = data;

  return (
    <div>
      <PageHeader
        title="Дашборд"
        description="Обзор обработки архива и партнёрской сети"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Обработано документов"
          value={stats.processedDocuments}
          icon={FileText}
          accent="primary"
        />
        <StatCard
          label="Партнёры"
          value={stats.partnersCount}
          icon={Building2}
          accent="primary"
        />
        <StatCard
          label="Услуг в справочнике"
          value={stats.servicesCount}
          icon={Stethoscope}
          accent="accent"
        />
        <StatCard
          label="Автонормализация"
          value={formatPercent(stats.normalizationSuccessRate)}
          icon={CheckCircle2}
          accent="success"
          hint="Цель MVP — не менее 70%"
          trend={{ direction: "up", value: "+4%" }}
        />
        <StatCard
          label="Ждут верификации"
          value={stats.itemsWaitingVerification}
          icon={Clock}
          accent="warning"
        />
        <StatCard
          label="Ошибки обработки"
          value={stats.errorsCount}
          icon={AlertTriangle}
          accent={stats.errorsCount > 3 ? "danger" : "warning"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Динамика автонормализации</CardTitle>
            <Badge variant="primary">30 дней</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={normalizationHistory} margin={{ left: -16, right: 8 }}>
                <defs>
                  <linearGradient id="normFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(170 75% 24%)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="hsl(170 75% 24%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 18% 91%)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => v.slice(5)}
                  tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid hsl(214 18% 91%)",
                    fontSize: 12,
                    boxShadow: "0 4px 16px -4px rgb(15 23 42 / 0.12)",
                  }}
                  labelFormatter={(v) => formatDate(v as string)}
                  formatter={(value: number) => [`${value}%`, "Нормализация"]}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(170 75% 24%)"
                  strokeWidth={2}
                  fill="url(#normFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статус документов</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={84}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {statusDistribution.map((s) => (
                    <Cell key={s.key} fill={STATUS_COLORS[s.key]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid hsl(214 18% 91%)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="mt-2 space-y-1.5">
              {statusDistribution.map((s) => (
                <li key={s.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: STATUS_COLORS[s.key] }}
                  />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="data-mono ml-auto font-semibold text-foreground">
                    {s.value}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Партнёры с наибольшим покрытием</CardTitle>
          <Link
            to={ROUTES.partners}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Все партнёры
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4 text-left font-semibold">Клиника</th>
                  <th className="px-4 py-2 text-left font-semibold">Город</th>
                  <th className="px-4 py-2 text-right font-semibold">Документов</th>
                  <th className="px-4 py-2 text-right font-semibold">Услуг</th>
                  <th className="py-2 pl-4 text-right font-semibold">Нормализация</th>
                </tr>
              </thead>
              <tbody>
                {topPartners.map((p) => (
                  <tr
                    key={p.partnerId}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        to={ROUTES.partnerDetail(p.partnerId)}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.city}</td>
                    <td className="data-mono px-4 py-3 text-right">
                      {p.documentsCount}
                    </td>
                    <td className="data-mono px-4 py-3 text-right">
                      {p.servicesCount}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <Badge
                        variant={
                          p.normalizationRate >= 85
                            ? "success"
                            : p.normalizationRate >= 60
                              ? "warning"
                              : "danger"
                        }
                      >
                        {formatPercent(p.normalizationRate)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
