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

  const handleMenuClick = () => {
    console.log("Layout: handleMenuClick called, setting sidebarOpen to true");
    setSidebarOpen(true);
  };

  console.log("Layout render: sidebarOpen =", sidebarOpen);

  return (
    <TRPCProvider>
      {/* Debug indicator - remove after testing */}
      {sidebarOpen && (
        <div className="fixed top-0 right-0 z-[9999] bg-red-500 text-white px-4 py-2 text-sm">
          Sidebar is OPEN
        </div>
      )}
      <div className="flex h-screen overflow-hidden bg-gray-50/50">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => {
            console.log("Layout: onClose called, setting sidebarOpen to false");
            setSidebarOpen(false);
          }}
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
        />
        <div className={cn(
          "flex flex-1 flex-col overflow-hidden transition-all duration-300",
          sidebarCollapsed ? "lg:ml-0" : "lg:ml-0"
        )}>
          <Header onMenuClick={handleMenuClick} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <OrgGuard>{children}</OrgGuard>
          </main>
        </div>
      </div>
    </TRPCProvider>
  );
}
