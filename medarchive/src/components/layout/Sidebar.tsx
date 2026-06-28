import { NavLink } from "react-router-dom";
import { Archive } from "lucide-react";
import { NAV_ITEMS } from "@/constants/navigation";
import { cn } from "@/utils/cn";

interface SidebarProps {
  verificationCount?: number;
}

export function Sidebar({ verificationCount = 0 }: SidebarProps) {
  const main = NAV_ITEMS.filter((i) => i.group === "main");
  const admin = NAV_ITEMS.filter((i) => i.group === "admin");

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Archive className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-bold text-foreground">MedArchive</div>
          <div className="data-mono text-[10px] uppercase tracking-wider text-muted">
            registry · v0.1
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <NavGroup label="Реестр" items={main} count={verificationCount} />
        <NavGroup label="Администрирование" items={admin} count={verificationCount} />
      </nav>

      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-tint text-xs font-semibold text-accent">
            ОП
          </span>
          <div className="leading-tight">
            <div className="text-xs font-medium text-foreground">Оператор</div>
            <div className="text-[11px] text-muted">verifier@medpartners</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  items,
  count,
}: {
  label: string;
  items: typeof NAV_ITEMS;
  count: number;
}) {
  return (
    <div>
      <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-tint text-primary"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badgeKey === "verification" && count > 0 && (
                  <span className="data-mono rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                    {count}
                  </span>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
