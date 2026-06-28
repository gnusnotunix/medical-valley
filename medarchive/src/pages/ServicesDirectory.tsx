import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchServices,
  fetchServiceCategories,
} from "@/services/services.service";

export default function ServicesDirectory() {
  const [category, setCategory] = useState("all");

  const { data: categories } = useQuery({
    queryKey: ["service-categories"],
    queryFn: fetchServiceCategories,
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ["services", category],
    queryFn: () => fetchServices(category),
  });

  return (
    <div>
      <PageHeader
        title="Справочник услуг"
        description="Целевой справочник, к которому нормализуются позиции прайсов"
        actions={
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : !services || services.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="Услуги не найдены"
          description="В этой категории пока нет записей справочника."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Официальное название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Синонимы</TableHead>
                <TableHead>МКБ</TableHead>
                <TableHead className="text-right">Партнёров</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.serviceId}>
                  <TableCell className="font-medium">{s.serviceName}</TableCell>
                  <TableCell>
                    <Badge variant="accent">{s.category}</Badge>
                  </TableCell>
                  <TableCell className="max-w-sm">
                    {s.synonyms.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {s.synonyms.join(", ")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell className="data-mono text-xs text-muted-foreground">
                    {s.icdCode ?? "—"}
                  </TableCell>
                  <TableCell className="data-mono text-right font-semibold">
                    {s.partnersCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
