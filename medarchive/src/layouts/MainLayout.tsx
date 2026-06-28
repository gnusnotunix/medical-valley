import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { fetchVerificationCount } from "@/services/dashboard.service";

export function MainLayout() {
  const { data: verificationCount } = useQuery({
    queryKey: ["verification-count"],
    queryFn: fetchVerificationCount,
  });

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar verificationCount={verificationCount ?? 0} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl animate-fade-in px-8 py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
