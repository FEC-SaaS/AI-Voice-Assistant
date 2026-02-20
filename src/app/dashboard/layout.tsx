"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TRPCProvider } from "@/components/providers";
import { BrandingProvider } from "@/components/providers/branding-provider";
import { OrgGuard } from "@/components/auth/org-guard";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <TRPCProvider>
      <BrandingProvider>
        {/* Ambient background orbs — fixed behind everything */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {/* Top-left primary glow */}
          <div className="absolute -top-32 left-[15%] h-[600px] w-[600px] rounded-full bg-indigo-600/6 blur-[120px]" />
          {/* Bottom-right violet glow */}
          <div className="absolute -bottom-32 right-[5%] h-[500px] w-[500px] rounded-full bg-violet-600/5 blur-[100px]" />
          {/* Mid-left cyan glow */}
          <div className="absolute top-1/2 -left-20 h-[350px] w-[350px] rounded-full bg-cyan-500/4 blur-[80px]" />
          {/* Very subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.018]"
            style={{
              backgroundImage: `linear-gradient(rgba(129,140,248,1) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,1) 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
            }}
          />
        </div>

        <div className="relative z-10 flex h-screen overflow-hidden bg-background">
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={sidebarCollapsed}
            onCollapse={setSidebarCollapsed}
          />
          <div className={cn(
            "flex flex-1 flex-col overflow-hidden transition-all duration-300",
          )}>
            <Header onMenuClick={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
              <OrgGuard>{children}</OrgGuard>
            </main>
          </div>
        </div>
        <FeedbackButton />
      </BrandingProvider>
    </TRPCProvider>
  );
}
