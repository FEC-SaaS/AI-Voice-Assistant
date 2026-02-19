"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  ChevronDown,
  Users,
  Calendar,
  X,
  Radio,
  Brain,
  Target,
  Shield,
  PhoneForwarded,
  Wand2,
  UserSearch,
  type LucideIcon,
} from "lucide-react";
import { OrganizationSwitcher } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { useBranding } from "@/components/providers/branding-provider";

// A nav item is either a plain link or a collapsible group with children
interface NavLink {
  type: "link";
  title: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  type: "group";
  title: string;
  icon: LucideIcon;
  children: { title: string; href: string; icon: LucideIcon }[];
}

type NavItem = NavLink | NavGroup;

const navItems: NavItem[] = [
  { type: "link", title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { type: "link", title: "Agents", href: "/dashboard/agents", icon: Bot },
  { type: "link", title: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { type: "link", title: "Interviews", href: "/dashboard/interviews", icon: UserSearch },
  { type: "link", title: "Contacts", href: "/dashboard/contacts", icon: Users },
  {
    type: "group",
    title: "Calls",
    icon: Phone,
    children: [
      { title: "Call Logs", href: "/dashboard/calls", icon: Phone },
      { title: "Live Calls", href: "/dashboard/live", icon: Radio },
    ],
  },
  { type: "link", title: "Appointments", href: "/dashboard/appointments", icon: Calendar },
  { type: "link", title: "Receptionist", href: "/dashboard/receptionist", icon: PhoneForwarded },
  { type: "link", title: "Leads", href: "/dashboard/leads", icon: Target },
  { type: "link", title: "Intelligence", href: "/dashboard/intelligence", icon: Brain },
  { type: "link", title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { type: "link", title: "Compliance", href: "/dashboard/compliance", icon: Shield },
  { type: "link", title: "Knowledge Base", href: "/dashboard/knowledge", icon: BookOpen },
  {
    type: "group",
    title: "Phone Numbers",
    icon: Hash,
    children: [
      { title: "Manage Numbers", href: "/dashboard/phone-numbers", icon: Hash },
      { title: "Caller ID (CNAM)", href: "/dashboard/phone-numbers/cnam", icon: Shield },
    ],
  },
  { type: "link", title: "Integrations", href: "/dashboard/integrations", icon: Plug },
];

const bottomNavItems = [
  { title: "Setup Wizard", href: "/dashboard/onboarding", icon: Wand2 },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

function isGroupActive(group: NavGroup, pathname: string): boolean {
  return group.children.some(
    (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
  );
}

export function Sidebar({ isOpen = false, onClose, collapsed = false, onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const onCloseRef = useRef(onClose);
  const { brandName, brandLogoUrl, poweredByHidden } = useBranding();

  // Track which groups are manually expanded
  // Groups auto-open when a child is active; this tracks manual toggles
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Keep onClose ref updated
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Close mobile menu on route change only
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      onCloseRef.current?.();
    }
  }, [pathname]);

  const renderNavLink = (item: { title: string; href: string; icon: LucideIcon }, indent = false) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          indent && !collapsed && "ml-4 pl-3",
          isActive
            ? "bg-primary text-white shadow-md shadow-primary/25"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-white")} />
        {!collapsed && <span>{item.title}</span>}
      </Link>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const groupActive = isGroupActive(group, pathname);
    // Show expanded if manually toggled, or if a child is active
    const isExpanded = expandedGroups[group.title] ?? groupActive;

    // When sidebar is collapsed, just show the group icon — clicking goes to first child
    if (collapsed) {
      const firstChild = group.children[0]!;
      return (
        <Link
          key={group.title}
          href={firstChild.href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            groupActive
              ? "bg-primary text-white shadow-md shadow-primary/25"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <group.icon className={cn("h-5 w-5 flex-shrink-0", groupActive && "text-white")} />
        </Link>
      );
    }

    return (
      <div key={group.title}>
        <button
          onClick={() => toggleGroup(group.title)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            groupActive
              ? "text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <group.icon className={cn("h-5 w-5 flex-shrink-0", groupActive && "text-primary")} />
          <span className="flex-1 text-left">{group.title}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground/70 transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </button>
        {isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {group.children.map((child) => renderNavLink(child, true))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={brandName} className="h-9 max-w-[140px] object-contain" />
            ) : (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-md shadow-primary/20">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="text-lg font-bold gradient-text">
                  {brandName}
                </span>
              </>
            )}
          </Link>
        )}
        {collapsed && (
          brandLogoUrl ? (
            <img src={brandLogoUrl} alt={brandName} className="h-9 w-9 object-contain mx-auto" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-md shadow-primary/20 mx-auto">
              <Bot className="h-5 w-5" />
            </div>
          )
        )}
        {/* Desktop collapse button */}
        <button
          onClick={() => onCollapse?.(!collapsed)}
          className="hidden lg:flex rounded-lg p-2 hover:bg-secondary transition-colors"
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 text-muted-foreground/70 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden rounded-lg p-2 hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) =>
            item.type === "group"
              ? renderNavGroup(item)
              : renderNavLink(item)
          )}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-border/50 p-3">
        {/* Org switcher — visible only on mobile (header hides it on sm+) */}
        {!collapsed && (
          <div className="mb-2 lg:hidden">
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: "w-full",
                  organizationSwitcherTrigger:
                    "flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary transition-colors",
                },
              }}
            />
          </div>
        )}
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
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-white")} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
        {!poweredByHidden && !collapsed && (
          <p className="mt-2 text-center text-[10px] text-muted-foreground/70">
            Powered by CallTone
          </p>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex h-full flex-col bg-card/80 backdrop-blur-xl border-r border-border transition-all duration-300",
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
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-card shadow-2xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
