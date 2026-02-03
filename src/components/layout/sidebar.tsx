"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Megaphone,
  Phone,
  BarChart3,
  BookOpen,
  Hash,
  Plug,
  Settings,
  ChevronLeft,
  Users,
  Calendar,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Agents", href: "/dashboard/agents", icon: Bot },
  { title: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { title: "Contacts", href: "/dashboard/contacts", icon: Users },
  { title: "Calls", href: "/dashboard/calls", icon: Phone },
  { title: "Appointments", href: "/dashboard/appointments", icon: Calendar },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { title: "Knowledge Base", href: "/dashboard/knowledge", icon: BookOpen },
  { title: "Phone Numbers", href: "/dashboard/phone-numbers", icon: Hash },
  { title: "Integrations", href: "/dashboard/integrations", icon: Plug },
];

const bottomNavItems = [
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ isOpen = true, onClose, collapsed = false, onCollapse }: SidebarProps) {
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [pathname, onClose]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-md shadow-primary/20">
              <Bot className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              VoxForge
            </span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-md shadow-primary/20 mx-auto">
            <Bot className="h-5 w-5" />
          </div>
        )}
        {/* Desktop collapse button */}
        <button
          onClick={() => onCollapse?.(!collapsed)}
          className="hidden lg:flex rounded-lg p-2 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 text-gray-400 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/25"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-white")} />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-100 p-3">
        {bottomNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-white")} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex h-full flex-col bg-white/80 backdrop-blur-xl border-r border-gray-200/50 transition-all duration-300",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
