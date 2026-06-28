import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/navigation";

export function Header() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `${ROUTES.search}?q=${encodeURIComponent(term)}` : ROUTES.search);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-8 backdrop-blur">
      <form onSubmit={submit} className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Найти услугу или клинику…"
          className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        />
      </form>
      <div className="ml-auto">
        <Button onClick={() => navigate(ROUTES.upload)}>
          <UploadCloud />
          Загрузить архив
        </Button>
      </div>
    </header>
  );
}
