"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const settingsNav = [
  { title: "General", href: "/dashboard/settings" },
  { title: "Profile", href: "/dashboard/settings/profile" },
  { title: "Notifications", href: "/dashboard/settings/notifications" },
  { title: "Branding", href: "/dashboard/settings/branding" },
  { title: "Email Branding", href: "/dashboard/settings/email" },
  { title: "Calendar", href: "/dashboard/settings/calendar" },
  { title: "Team", href: "/dashboard/settings/team" },
  { title: "Billing", href: "/dashboard/settings/billing" },
  { title: "API Keys", href: "/dashboard/settings/api-keys" },
  { title: "Activity Log", href: "/dashboard/settings/activity" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization settings and preferences
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <nav className="hidden md:block w-48 shrink-0 space-y-1">
          {settingsNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium",
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden w-full overflow-x-auto pb-2">
          <div className="flex gap-1">
            {settingsNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
