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

interface NavLink {
  type: "link";
  title: string;
  href: string;
  icon: LucideIcon;
  color: string;        // icon color when inactive
  activeColor: string;  // icon color when active
  glowColor: string;    // glow color for active state
}

interface NavGroup {
  type: "group";
  title: string;
  icon: LucideIcon;
  color: string;
  children: { title: string; href: string; icon: LucideIcon; color: string }[];
}

type NavItem = NavLink | NavGroup;

const navItems: NavItem[] = [
  {
    type: "link", title: "Dashboard", href: "/dashboard", icon: LayoutDashboard,
    color: "text-indigo-400", activeColor: "text-indigo-300", glowColor: "rgba(99,102,241,0.3)",
  },
  {
    type: "link", title: "Agents", href: "/dashboard/agents", icon: Bot,
    color: "text-violet-400", activeColor: "text-violet-300", glowColor: "rgba(139,92,246,0.3)",
  },
  {
    type: "link", title: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone,
    color: "text-amber-400", activeColor: "text-amber-300", glowColor: "rgba(251,191,36,0.3)",
  },
  {
    type: "link", title: "Interviews", href: "/dashboard/interviews", icon: UserSearch,
    color: "text-cyan-400", activeColor: "text-cyan-300", glowColor: "rgba(34,211,238,0.3)",
  },
  {
    type: "link", title: "Contacts", href: "/dashboard/contacts", icon: Users,
    color: "text-blue-400", activeColor: "text-blue-300", glowColor: "rgba(59,130,246,0.3)",
  },
  {
    type: "group",
    title: "Calls",
    icon: Phone,
    color: "text-emerald-400",
    children: [
      { title: "Call Logs",  href: "/dashboard/calls", icon: Phone, color: "text-emerald-400" },
      { title: "Live Calls", href: "/dashboard/live",  icon: Radio, color: "text-green-400" },
    ],
  },
  {
    type: "link", title: "Appointments", href: "/dashboard/appointments", icon: Calendar,
    color: "text-rose-400", activeColor: "text-rose-300", glowColor: "rgba(251,113,133,0.3)",
  },
  {
    type: "link", title: "Receptionist", href: "/dashboard/receptionist", icon: PhoneForwarded,
    color: "text-orange-400", activeColor: "text-orange-300", glowColor: "rgba(251,146,60,0.3)",
  },
  {
    type: "link", title: "Leads", href: "/dashboard/leads", icon: Target,
    color: "text-yellow-400", activeColor: "text-yellow-300", glowColor: "rgba(250,204,21,0.3)",
  },
  {
    type: "link", title: "Intelligence", href: "/dashboard/intelligence", icon: Brain,
    color: "text-purple-400", activeColor: "text-purple-300", glowColor: "rgba(192,132,252,0.3)",
  },
  {
    type: "link", title: "Analytics", href: "/dashboard/analytics", icon: BarChart3,
    color: "text-sky-400", activeColor: "text-sky-300", glowColor: "rgba(56,189,248,0.3)",
  },
  {
    type: "link", title: "Compliance", href: "/dashboard/compliance", icon: Shield,
    color: "text-red-400", activeColor: "text-red-300", glowColor: "rgba(239,68,68,0.3)",
  },
  {
    type: "link", title: "Knowledge Base", href: "/dashboard/knowledge", icon: BookOpen,
    color: "text-teal-400", activeColor: "text-teal-300", glowColor: "rgba(45,212,191,0.3)",
  },
  {
    type: "group",
    title: "Phone Numbers",
    icon: Hash,
    color: "text-slate-400",
    children: [
      { title: "Manage Numbers", href: "/dashboard/phone-numbers",      icon: Hash,   color: "text-slate-400" },
      { title: "Caller ID (CNAM)", href: "/dashboard/phone-numbers/cnam", icon: Shield, color: "text-slate-300" },
    ],
  },
  {
    type: "link", title: "Integrations", href: "/dashboard/integrations", icon: Plug,
    color: "text-pink-400", activeColor: "text-pink-300", glowColor: "rgba(236,72,153,0.3)",
  },
];

const bottomNavItems = [
  {
    title: "Setup Wizard", href: "/dashboard/onboarding", icon: Wand2,
    color: "text-indigo-400", glowColor: "rgba(99,102,241,0.3)",
  },
  {
    title: "Settings", href: "/dashboard/settings", icon: Settings,
    color: "text-slate-400", glowColor: "rgba(148,163,184,0.3)",
  },
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

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      onCloseRef.current?.();
    }
  }, [pathname]);

  const renderNavLink = (
    item: { title: string; href: string; icon: LucideIcon; color: string; glowColor?: string },
    indent = false
  ) => {
    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.title : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          indent && !collapsed && "ml-3 pl-3",
          isActive
            ? "text-white"
            : "text-muted-foreground/80 hover:text-foreground hover:bg-white/5"
        )}
        style={isActive ? {
          background: "linear-gradient(90deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.05) 100%)",
          borderLeft: "2px solid #818CF8",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
        } : undefined}
      >
        {/* Active indicator glow */}
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-0.5 rounded-r-full"
            style={{ background: "#818CF8", boxShadow: `0 0 10px ${item.glowColor ?? "rgba(99,102,241,0.6)"}` }}
          />
        )}

        <item.icon
          className={cn(
            "h-4.5 w-4.5 flex-shrink-0 h-[18px] w-[18px] transition-all duration-200",
            isActive
              ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]"
              : cn(item.color, "group-hover:scale-110 group-hover:drop-shadow-[0_0_4px_currentColor]")
          )}
        />
        {!collapsed && <span className={isActive ? "text-white font-semibold" : ""}>{item.title}</span>}
      </Link>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const groupActive = isGroupActive(group, pathname);
    const isExpanded = expandedGroups[group.title] ?? groupActive;

    if (collapsed) {
      const firstChild = group.children[0]!;
      return (
        <Link
          key={group.title}
          href={firstChild.href}
          title={group.title}
          className={cn(
            "group flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            groupActive ? "text-white" : "text-muted-foreground/80 hover:text-foreground hover:bg-white/5"
          )}
          style={groupActive ? {
            background: "linear-gradient(90deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.05) 100%)",
            borderLeft: "2px solid #818CF8",
          } : undefined}
        >
          <group.icon className={cn(
            "h-[18px] w-[18px] flex-shrink-0 transition-all duration-200",
            groupActive ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]" : cn(group.color, "group-hover:scale-110")
          )} />
        </Link>
      );
    }

    return (
      <div key={group.title}>
        <button
          onClick={() => toggleGroup(group.title)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            groupActive
              ? "text-foreground"
              : "text-muted-foreground/80 hover:text-foreground hover:bg-white/5"
          )}
        >
          <group.icon className={cn(
            "h-[18px] w-[18px] flex-shrink-0 transition-all duration-200",
            groupActive ? cn(group.color, "drop-shadow-[0_0_4px_currentColor]") : cn(group.color, "group-hover:scale-110")
          )} />
          <span className="flex-1 text-left">{group.title}</span>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200",
            isExpanded && "rotate-180"
          )} />
        </button>
        {isExpanded && (
          <div className="mt-0.5 space-y-0.5 pl-1">
            {group.children.map((child) => renderNavLink(child, true))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <>
      {/* ── Logo ───────────────────────────────────────────────────── */}
      <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3 group">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={brandName} className="h-9 max-w-[140px] object-contain" />
            ) : (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="text-lg font-bold gradient-text tracking-tight">
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 mx-auto">
              <Bot className="h-5 w-5" />
            </div>
          )
        )}

        {/* Desktop collapse button */}
        <button
          onClick={() => onCollapse?.(!collapsed)}
          className="hidden lg:flex rounded-lg p-1.5 hover:bg-white/8 text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")} />
        </button>
        {/* Mobile close button */}
        {onClose && (
          <button onClick={onClose} className="lg:hidden rounded-lg p-1.5 hover:bg-white/8 text-muted-foreground/60 hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 px-2 py-3 overflow-y-auto scrollbar-thin">
        {!collapsed && (
          <p className="section-label px-3 mb-2">Navigation</p>
        )}
        <div className="space-y-0.5">
          {navItems.map((item) =>
            item.type === "group"
              ? renderNavGroup(item)
              : renderNavLink(item)
          )}
        </div>
      </nav>

      {/* ── Bottom Navigation ───────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] px-2 py-3 space-y-0.5">
        {!collapsed && (
          <div className="mb-2 lg:hidden">
            <OrganizationSwitcher
              appearance={{
                variables: {
                  colorBackground: "#0d0d22",
                  colorText: "#ffffff",
                  colorTextSecondary: "rgba(200,200,216,0.55)",
                  colorPrimary: "#6366f1",
                  colorInputBackground: "rgba(255,255,255,0.05)",
                  colorInputText: "#ffffff",
                  borderRadius: "12px",
                  fontFamily: "inherit",
                  fontSize: "14px",
                },
                elements: {
                  rootBox: { width: "100%" },
                  organizationSwitcherTrigger: {
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    padding: "8px 12px",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.8)",
                  },
                  organizationSwitcherTriggerIcon: { color: "rgba(255,255,255,0.4)" },
                  organizationSwitcherPopoverCard: {
                    background: "linear-gradient(160deg, #0e0e24 0%, #12102e 100%)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
                    borderRadius: "18px",
                    padding: "8px",
                  },
                  organizationSwitcherPopoverActions: { padding: "4px 0", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "4px" },
                  organizationSwitcherPopoverActionButton: { borderRadius: "10px", padding: "8px 12px", color: "rgba(200,200,216,0.75)" },
                  organizationSwitcherPopoverActionButtonText: { fontSize: "13px", fontWeight: "500" },
                  organizationSwitcherPopoverActionButtonIconBox: { background: "rgba(99,102,241,0.12)", borderRadius: "8px", color: "#818cf8" },
                  organizationSwitcherPopoverFooter: { display: "none" },
                  organizationListPreviewItem: { borderRadius: "10px", padding: "8px" },
                  organizationPreviewMainIdentifier: { color: "#ffffff", fontWeight: "600", fontSize: "13px" },
                  organizationPreviewSecondaryIdentifier: { color: "rgba(200,200,216,0.45)", fontSize: "11px" },
                  organizationPreviewAvatarBox: { borderRadius: "8px", width: "30px", height: "30px" },
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
              title={collapsed ? item.title : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive ? "text-white" : "text-muted-foreground/80 hover:text-foreground hover:bg-white/5"
              )}
              style={isActive ? {
                background: "linear-gradient(90deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.05) 100%)",
                borderLeft: "2px solid #818CF8",
              } : undefined}
            >
              <item.icon className={cn(
                "h-[18px] w-[18px] flex-shrink-0 transition-all duration-200",
                isActive ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]" : cn(item.color, "group-hover:scale-110")
              )} />
              {!collapsed && <span className={isActive ? "font-semibold" : ""}>{item.title}</span>}
            </Link>
          );
        })}

        {!poweredByHidden && !collapsed && (
          <p className="mt-3 text-center text-[10px] text-muted-foreground/40 tracking-wider uppercase">
            Powered by CallTone
          </p>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex h-full flex-col border-r border-white/[0.06] transition-all duration-300",
        "bg-[#070714]/95 backdrop-blur-xl",
        collapsed ? "w-20" : "w-64"
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={cn(
        "lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r border-white/[0.06] shadow-2xl shadow-black/50 transition-transform duration-300 ease-in-out",
        "bg-[#070714]/98 backdrop-blur-xl",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>
    </>
  );
}
