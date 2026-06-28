# MedArchive — Admin Frontend

Фронтенд административной панели для кейса **MedPartners** (хакатон 2025):
обработка архива прайсов клиник-партнёров, нормализация услуг, верификация,
поиск.

Это **только фронтенд**. Бэкенд (FastAPI + Postgres) подключается позже через
слой `src/services/*` — компоненты с ним никогда не работают напрямую.

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

## Дизайн-система

- Палитра: глубокий тил `--primary` (бренд) + архивный янтарь `--accent`
  для статусов «проверено/официально», белые карточки на едва заметном
  холодно-сером фоне (`--surface`).
- Типографика: **Inter** для интерфейса, **IBM Plex Mono** — для всех
  числовых и идентификационных данных (цены, даты, % уверенности, БИН,
  ID документов). Это сквозная деталь: в реестре цен числа всегда
  набраны моноширинным шрифтом, как в бухгалтерской книге.
- Токены живут в `src/index.css` (CSS-переменные) и `tailwind.config.ts`.

## Текущий статус

Каркас проекта, роутинг, layout (Sidebar/Header), дизайн-токены и базовые
UI-примитивы готовы. Страницы — заглушки, генерируются по одной.
