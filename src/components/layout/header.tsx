"use client";

import { Bell, Search, Menu, Bot, Zap } from "lucide-react";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import Link from "next/link";
import { useBranding } from "@/components/providers/branding-provider";
import { useState } from "react";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { brandName, brandLogoUrl } = useBranding();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="relative flex h-16 items-center justify-between px-4 lg:px-6"
      style={{
        background: "linear-gradient(180deg, rgba(12,12,30,0.95) 0%, rgba(10,10,20,0.9) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Subtle top highlight line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent pointer-events-none" />

      {/* ── Left: mobile menu + logo ─────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onMenuClick?.()}
          className="flex lg:hidden items-center justify-center h-9 w-9 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/15 transition-all active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-foreground/80" />
        </button>

        <Link href="/dashboard" className="flex lg:hidden items-center gap-2.5 group">
          {brandLogoUrl ? (
            <img src={brandLogoUrl} alt={brandName} className="h-8 max-w-[120px] object-contain" />
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
                <Bot className="h-4 w-4" />
              </div>
              <span className="font-bold gradient-text">{brandName}</span>
            </>
          )}
        </Link>
      </div>

      {/* ── Center: Search ───────────────────────────────────────── */}
      <div className="hidden md:flex flex-1 items-center max-w-sm mx-6">
        <div className={`relative w-full transition-all duration-200 ${searchFocused ? "scale-[1.02]" : ""}`}>
          <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200 ${searchFocused ? "text-indigo-400" : "text-muted-foreground/50"}`} />
          <input
            type="text"
            placeholder="Search agents, campaigns, calls…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="h-9 w-full rounded-xl border pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: searchFocused ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)",
              boxShadow: searchFocused ? "0 0 0 3px rgba(99,102,241,0.12), 0 4px 12px rgba(0,0,0,0.2)" : "none",
            }}
          />
          {searchFocused && (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground/50">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* ── Right: org switcher + notifications + user ───────────── */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Live indicator pill */}
        <Link
          href="/dashboard/live"
          className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </Link>

        {/* Organization Switcher */}
        <div className="hidden sm:block">
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
                rootBox: "flex items-center",
                organizationSwitcherTrigger: {
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  padding: "6px 12px",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.8)",
                  transition: "all 0.2s",
                },
                organizationSwitcherTriggerIcon: { color: "rgba(255,255,255,0.4)" },
                organizationSwitcherPopoverCard: {
                  background: "linear-gradient(160deg, #0e0e24 0%, #12102e 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
                  borderRadius: "18px",
                  padding: "8px",
                },
                organizationSwitcherPopoverMain: { padding: "4px 0" },
                organizationSwitcherPopoverActions: { padding: "4px 0", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "4px" },
                organizationSwitcherPopoverActionButton: {
                  borderRadius: "10px",
                  padding: "8px 12px",
                  color: "rgba(200,200,216,0.75)",
                  transition: "all 0.15s",
                },
                organizationSwitcherPopoverActionButtonText: { fontSize: "13px", fontWeight: "500" },
                organizationSwitcherPopoverActionButtonIconBox: {
                  background: "rgba(99,102,241,0.12)",
                  borderRadius: "8px",
                  color: "#818cf8",
                },
                organizationSwitcherPopoverFooter: { display: "none" },
                organizationListPreviewItem: { borderRadius: "10px", padding: "8px" },
                organizationListPreviewItemBox: { borderRadius: "10px" },
                organizationListPreviewButton: { borderRadius: "10px" },
                organizationPreviewMainIdentifier: { color: "#ffffff", fontWeight: "600", fontSize: "13px" },
                organizationPreviewSecondaryIdentifier: { color: "rgba(200,200,216,0.45)", fontSize: "11px" },
                organizationPreviewAvatarBox: { borderRadius: "8px", width: "30px", height: "30px" },
                organizationAvatarUploaderContainer: { borderRadius: "10px" },
                notificationBadge: { background: "#6366f1" },
              },
            }}
          />
        </div>

        {/* Notifications */}
        <button
          className="relative flex items-center justify-center h-9 w-9 rounded-xl border border-white/8 bg-white/4 hover:bg-white/10 hover:border-white/15 transition-all group"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5 h-[18px] w-[18px] text-muted-foreground/70 group-hover:text-foreground transition-colors" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#070714]" />
        </button>

        {/* Upgrade pill — only show for free/trial users (always shown here, hide server-side if needed) */}
        <Link
          href="/dashboard/settings/billing"
          className="hidden lg:flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all"
        >
          <Zap className="h-3 w-3" />
          Upgrade
        </Link>

        <UserButton
          afterSignOutUrl="/"
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
              avatarBox: {
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                outline: "2px solid rgba(255,255,255,0.1)",
                outlineOffset: "2px",
                transition: "all 0.2s",
              },
              userButtonPopoverCard: {
                background: "linear-gradient(160deg, #0e0e24 0%, #12102e 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
                borderRadius: "18px",
                padding: "8px",
                minWidth: "240px",
              },
              userButtonPopoverMain: { padding: "4px 0" },
              userButtonPopoverActions: { padding: "4px 0", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "4px" },
              userButtonPopoverActionButton: {
                borderRadius: "10px",
                padding: "9px 12px",
                color: "rgba(200,200,216,0.75)",
                transition: "all 0.15s",
              },
              userButtonPopoverActionButton__manageAccount: {
                color: "rgba(200,200,216,0.75)",
              },
              userButtonPopoverActionButton__signOut: {
                color: "#f87171",
              },
              userButtonPopoverActionButtonText: { fontSize: "13px", fontWeight: "500" },
              userButtonPopoverActionButtonIconBox: {
                background: "rgba(99,102,241,0.12)",
                borderRadius: "8px",
                color: "#818cf8",
                width: "28px",
                height: "28px",
              },
              userButtonPopoverFooter: { display: "none" },
              userPreviewMainIdentifier: { color: "#ffffff", fontWeight: "600", fontSize: "14px" },
              userPreviewSecondaryIdentifier: { color: "rgba(200,200,216,0.45)", fontSize: "12px" },
              userPreviewAvatarBox: { width: "38px", height: "38px", borderRadius: "50%" },
              userPreviewTextContainer: { gap: "2px" },
            },
          }}
        />
      </div>
    </header>
  );
}
