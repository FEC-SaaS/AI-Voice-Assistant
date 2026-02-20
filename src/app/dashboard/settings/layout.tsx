"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Settings,
  User,
  Bell,
  Palette,
  Mail,
  Calendar,
  Users,
  CreditCard,
  Key,
  Webhook,
  Activity,
} from "lucide-react";

const settingsNav = [
  { title: "General",       href: "/dashboard/settings",                icon: Settings,  color: "text-slate-400" },
  { title: "Profile",       href: "/dashboard/settings/profile",        icon: User,      color: "text-blue-400" },
  { title: "Notifications", href: "/dashboard/settings/notifications",  icon: Bell,      color: "text-amber-400" },
  { title: "Branding",      href: "/dashboard/settings/branding",       icon: Palette,   color: "text-violet-400" },
  { title: "Email Branding",href: "/dashboard/settings/email",          icon: Mail,      color: "text-pink-400" },
  { title: "Calendar",      href: "/dashboard/settings/calendar",       icon: Calendar,  color: "text-emerald-400" },
  { title: "Team",          href: "/dashboard/settings/team",           icon: Users,     color: "text-cyan-400" },
  { title: "Billing",       href: "/dashboard/settings/billing",        icon: CreditCard,color: "text-green-400" },
  { title: "API Keys",      href: "/dashboard/settings/api-keys",       icon: Key,       color: "text-orange-400" },
  { title: "Webhooks",      href: "/dashboard/settings/webhooks",       icon: Webhook,   color: "text-indigo-400" },
  { title: "Activity Log",  href: "/dashboard/settings/activity",       icon: Activity,  color: "text-red-400" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
          border: "1px solid rgba(99,102,241,0.15)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-white/55">
            Manage your organization settings and preferences
          </p>
        </div>
      </div>

      <div className="flex gap-6 lg:gap-8">
        {/* ── Desktop Sidebar Nav ─────────────────────────────── */}
        <nav
          className="hidden md:flex flex-col w-52 shrink-0 rounded-2xl p-2 h-fit"
          style={{
            background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
            border: "1px solid rgba(99,102,241,0.12)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
          }}
        >
          {settingsNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-indigo-500/15 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                )}
              >
                {/* Active left bar */}
                <span
                  className={cn(
                    "absolute left-2 h-5 w-0.5 rounded-full transition-all duration-200",
                    isActive ? "bg-indigo-400 opacity-100" : "opacity-0"
                  )}
                />
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors duration-200",
                    isActive ? item.color : "text-white/30 group-hover:text-white/60"
                  )}
                />
                <span>{item.title}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Mobile Scrollable Tab Nav ──────────────────────── */}
        <div className="md:hidden w-full">
          <div
            className="flex gap-1 overflow-x-auto pb-2 rounded-2xl p-2"
            style={{
              background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
              border: "1px solid rgba(99,102,241,0.12)",
            }}
          >
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all shrink-0",
                    isActive
                      ? "bg-indigo-500/20 text-white"
                      : "text-white/45 hover:bg-white/5 hover:text-white/70"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", isActive ? item.color : "text-white/30")} />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
