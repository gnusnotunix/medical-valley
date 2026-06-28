# MedArchive — Admin Frontend

## Стек

React 19 · TypeScript · Vite · React Router · Tailwind CSS · shadcn/ui (Radix) ·
TanStack Table · TanStack Query · Framer Motion · React Hook Form + Zod ·
Axios · Recharts · Lucide

## Запуск

```bash
npm install
npm run dev
```

Приложение поднимется на `http://localhost:5173`.

## Архитектура

```
src/
  app/            # App.tsx — таблица роутов
  pages/          # Страницы (1 файл = 1 маршрут из Sidebar)
  layouts/         # MainLayout: Sidebar + Header + Outlet
  components/
    ui/            # shadcn/ui примитивы (Button, Badge, Dialog, Table…)
    layout/        # Sidebar, Header
    shared/         # PageHeader, EmptyState, StatusBadge и т.п. — общие для всех страниц
  features/        # Код, специфичный для одной страницы (dashboard/, partners/…)
  services/        # *.service.ts — единая точка входа к данным (mock сегодня, FastAPI потом)
  api/mock/        # Faker-моки, имитирующие ответы будущего API
  types/           # Доменные типы — зеркало схемы БД из ТЗ (Partner, PriceDocument, PriceItem, Service)
  constants/       # Роуты, навигация
  utils/            # cn() и прочие хелперы
```

**Принцип:** страницы и `features/*` импортируют только из `services/*`.
Сервисы сегодня читают моки, завтра — Axios + FastAPI. UI не меняется.


