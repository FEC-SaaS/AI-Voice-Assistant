"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  CreditCard,
  BarChart3,
  Phone,
  TrendingUp,
  Wand2,
  Users,
  Plug,
  MessageSquare,
  Shield,
  Server,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  group?: string;
}

const navItems: NavItem[] = [
  { title: "Command Center", href: "/admin", icon: LayoutDashboard, group: "Overview" },
  { title: "Organizations", href: "/admin/orgs", icon: Building2, group: "Business" },
  { title: "Revenue", href: "/admin/revenue", icon: DollarSign, group: "Business" },
  { title: "Plans", href: "/admin/plans", icon: CreditCard, group: "Business" },
  { title: "Feature Usage", href: "/admin/features", icon: BarChart3, group: "Analytics" },
  { title: "Call Activity", href: "/admin/calls", icon: Phone, group: "Analytics" },
  { title: "Acquisition", href: "/admin/acquisition", icon: TrendingUp, group: "Analytics" },
  { title: "Onboarding", href: "/admin/onboarding", icon: Wand2, group: "Analytics" },
  { title: "Engagement", href: "/admin/engagement", icon: Users, group: "Analytics" },
  { title: "Integrations", href: "/admin/integrations", icon: Plug, group: "Platform" },
  { title: "Feedback", href: "/admin/feedback", icon: MessageSquare, group: "Platform" },
  { title: "Security", href: "/admin/security", icon: Shield, group: "Platform" },
  { title: "System", href: "/admin/system", icon: Server, group: "Platform" },
  { title: "Admin Activity", href: "/admin/activity", icon: ClipboardList, group: "Platform" },
];

const groups = ["Overview", "Business", "Analytics", "Platform"];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col lg:flex"
      style={{
        background: "linear-gradient(180deg, #06060f 0%, #08081a 50%, #060611 100%)",
        borderRight: "1px solid rgba(99,102,241,0.08)",
      }}
    >
      {/* Brand */}
      <div
        className="flex h-16 shrink-0 items-center px-5"
        style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
              boxShadow: "0 0 20px rgba(99,102,241,0.45), 0 0 8px rgba(99,102,241,0.3)",
            }}
          >
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: "#f1f5f9" }}>
              Calltone
            </div>
            <div
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "#818cf8" }}
            >
              Super Admin
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/5">
        {groups.map((group) => {
          const items = navItems.filter((i) => i.group === group);
          return (
            <div key={group} className="mb-4">
              <div
                className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "rgba(241,245,249,0.2)" }}
              >
                {group}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150"
                        style={{
                          background: isActive
                            ? "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(129,140,248,0.08) 100%)"
                            : "transparent",
                          color: isActive ? "#a5b4fc" : "rgba(241,245,249,0.4)",
                          border: isActive
                            ? "1px solid rgba(99,102,241,0.2)"
                            : "1px solid transparent",
                          boxShadow: isActive
                            ? "0 0 16px rgba(99,102,241,0.08)"
                            : "none",
                        }}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full"
                            style={{
                              background:
                                "linear-gradient(180deg, #6366f1, #818cf8)",
                            }}
                          />
                        )}
                        <item.icon
                          className="h-4 w-4 shrink-0"
                          style={{ color: isActive ? "#818cf8" : "rgba(241,245,249,0.3)" }}
                        />
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Bottom version tag */}
      <div
        className="shrink-0 px-5 py-4"
        style={{ borderTop: "1px solid rgba(99,102,241,0.06)" }}
      >
        <div className="text-[10px]" style={{ color: "rgba(241,245,249,0.15)" }}>
          Calltone Admin v1.0
        </div>
      </div>
    </aside>
  );
}
