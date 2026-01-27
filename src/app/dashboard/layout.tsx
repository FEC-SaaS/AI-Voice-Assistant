import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TRPCProvider } from "@/components/providers";

const isClerkConfigured = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.CLERK_SECRET_KEY
);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isClerkConfigured) {
    const { auth } = await import("@clerk/nextjs");
    const { userId } = auth();
    if (!userId) {
      redirect("/sign-in");
    }
  }

  return (
    <TRPCProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </TRPCProvider>
  );
}
