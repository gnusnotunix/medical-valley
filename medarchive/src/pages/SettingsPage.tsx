import { useState } from "react";
import { toast } from "sonner";
import { SlidersHorizontal, Coins, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const [threshold, setThreshold] = useState(85);
  const [currencySource, setCurrencySource] = useState("nbk");
  const [autoArchive, setAutoArchive] = useState(true);

  const autoBand = threshold;

  function save() {
    toast.success("Настройки сохранены");
  }

  return (
    <div>
      <PageHeader
        title="Настройки"
        description="Параметры обработки, сопоставления и доступов операторов"
        actions={<Button onClick={save}>Сохранить изменения</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <CardTitle>Порог автосопоставления</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Позиции с уверенностью выше порога сопоставляются автоматически,
              остальные попадают в очередь верификации.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={60}
                max={99}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="flex-1 accent-[hsl(170_75%_24%)]"
              />
              <span className="data-mono w-14 text-right text-lg font-bold text-primary">
                {threshold}%
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="success">≥ {autoBand}% — авто</Badge>
              <Badge variant="warning">60–{autoBand - 1}% — ревью</Badge>
              <Badge variant="danger">&lt; 60% — unmatched</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Coins className="h-4 w-4 text-accent" />
            <CardTitle>Источник курсов валют</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Цены не в KZT конвертируются по курсу на дату прайса. Оригинальная
              сумма сохраняется для аудита.
            </p>
            <Select value={currencySource} onValueChange={setCurrencySource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nbk">Нацбанк РК (официальный)</SelectItem>
                <SelectItem value="ecb">ЕЦБ</SelectItem>
                <SelectItem value="manual">Ручной ввод</SelectItem>
              </SelectContent>
            </Select>
            <div className="rounded-md border border-border bg-surface/50 px-3 py-2 text-xs text-muted-foreground">
              Курс на сегодня: <span className="data-mono">1 USD = 470,5 ₸</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <CardTitle>Обработка и версионирование</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              label="Архивировать старую цену при изменении"
              description="История цен хранится бессрочно, старая версия не удаляется"
              checked={autoArchive}
              onChange={setAutoArchive}
            />
            <ToggleRow
              label="Флаг аномалии при отклонении цены > 50%"
              description="Резкое изменение требует ручного подтверждения оператором"
              checked
              onChange={() => {}}
            />
            <ToggleRow
              label="Предупреждение, если цена нерезидента < цены резидента"
              description="Помечает позицию для ревью"
              checked
              onChange={() => {}}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
