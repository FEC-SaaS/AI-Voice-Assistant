"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TRPCProvider } from "@/components/providers";
import { OrgGuard } from "@/components/auth/org-guard";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auth is enforced by authMiddleware in src/middleware.ts.
  // OrgGuard ensures user has selected an organization before accessing dashboard pages.

  return (
    <TRPCProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50/50">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
        />
        <div className={cn(
          "flex flex-1 flex-col overflow-hidden transition-all duration-300",
          sidebarCollapsed ? "lg:ml-0" : "lg:ml-0"
        )}>
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <OrgGuard>{children}</OrgGuard>
          </main>
        </div>
      </div>
    </TRPCProvider>
  );
}
