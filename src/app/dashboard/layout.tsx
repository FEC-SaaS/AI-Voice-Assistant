import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TRPCProvider } from "@/components/providers";
import { OrgGuard } from "@/components/auth/org-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth is enforced by authMiddleware in src/middleware.ts.
  // OrgGuard ensures user has selected an organization before accessing dashboard pages.

  return (
    <TRPCProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <OrgGuard>{children}</OrgGuard>
          </main>
        </div>
      </div>
    </TRPCProvider>
  );
}
