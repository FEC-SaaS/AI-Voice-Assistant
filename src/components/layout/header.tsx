"use client";

import { Bell, Search, Menu, Bot } from "lucide-react";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import Link from "next/link";
import { useBranding } from "@/components/providers/branding-provider";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { brandName, brandLogoUrl } = useBranding();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-4 lg:px-6">
      {/* Mobile menu button and logo */}
      <div className="flex items-center gap-3">
        {/* Menu button - visible on mobile only */}
        <button
          type="button"
          onClick={() => onMenuClick?.()}
          className="flex lg:hidden items-center justify-center h-10 w-10 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors active:bg-secondary/60"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6 text-foreground" />
        </button>

        {/* Mobile logo */}
        <Link href="/dashboard" className="flex lg:hidden items-center gap-2">
          {brandLogoUrl ? (
            <img src={brandLogoUrl} alt={brandName} className="h-8 max-w-[120px] object-contain" />
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-white shadow-md shadow-primary/20">
                <Bot className="h-4 w-4" />
              </div>
              <span className="font-bold text-foreground">{brandName}</span>
            </>
          )}
        </Link>
      </div>

      {/* Search - hidden on mobile */}
      <div className="hidden md:flex flex-1 items-center gap-4 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="h-10 w-full rounded-xl border border-border bg-secondary pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Organization Switcher - compact on mobile */}
        <div className="hidden sm:block">
          <OrganizationSwitcher
            appearance={{
              elements: {
                rootBox: "flex items-center",
                organizationSwitcherTrigger:
                  "flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary transition-colors",
              },
            }}
          />
        </div>

        {/* Notifications */}
        <button className="relative flex items-center justify-center h-10 w-10 rounded-xl hover:bg-secondary transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
        </button>

        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-9 w-9 ring-2 ring-border",
            },
          }}
          afterSignOutUrl="/"
        />
      </div>
    </header>
  );
}
