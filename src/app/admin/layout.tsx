import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TRPCProvider } from "@/components/providers";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

function getSuperAdminIds(): string[] {
  return (process.env.ADMIN_CLERK_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const allowed = getSuperAdminIds();
  if (!allowed.includes(userId)) {
    redirect("/dashboard");
  }

  return (
    <TRPCProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden lg:ml-64">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </TRPCProvider>
  );
}
