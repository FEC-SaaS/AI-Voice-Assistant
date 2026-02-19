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
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { title: "Command Center", href: "/admin", icon: LayoutDashboard },
  { title: "Organizations", href: "/admin/orgs", icon: Building2 },
  { title: "Revenue", href: "/admin/revenue", icon: DollarSign },
  { title: "Plans", href: "/admin/plans", icon: CreditCard },
  { title: "Feature Usage", href: "/admin/features", icon: BarChart3 },
  { title: "Call Activity", href: "/admin/calls", icon: Phone },
  { title: "Acquisition", href: "/admin/acquisition", icon: TrendingUp },
  { title: "Onboarding", href: "/admin/onboarding", icon: Wand2 },
  { title: "Engagement", href: "/admin/engagement", icon: Users },
  { title: "Integrations", href: "/admin/integrations", icon: Plug },
  { title: "Feedback", href: "/admin/feedback", icon: MessageSquare },
  { title: "Security", href: "/admin/security", icon: Shield },
  { title: "System", href: "/admin/system", icon: Server },
  { title: "Admin Activity", href: "/admin/activity", icon: ClipboardList },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-background lg:flex">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-destructive" />
          <span className="font-semibold text-sm">Super Admin</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
