"use client";

import { Bell, Search, Menu, Bot } from "lucide-react";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import Link from "next/link";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200/50 bg-white/80 backdrop-blur-xl px-4 lg:px-6">
      {/* Mobile menu button and logo */}
      <div className="flex items-center gap-3">
        {/* Menu button - visible on mobile only */}
        <button
          type="button"
          onClick={() => onMenuClick?.()}
          className="flex lg:hidden items-center justify-center h-10 w-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors active:bg-gray-300"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6 text-gray-700" />
        </button>

        {/* Mobile logo */}
        <Link href="/dashboard" className="flex lg:hidden items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-white shadow-md shadow-primary/20">
            <Bot className="h-4 w-4" />
          </div>
          <span className="font-bold text-gray-900">VoxForge</span>
        </Link>
      </div>

      {/* Search - hidden on mobile */}
      <div className="hidden md:flex flex-1 items-center gap-4 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
                  "flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
              },
            }}
          />
        </div>

        {/* Notifications */}
        <button className="relative flex items-center justify-center h-10 w-10 rounded-xl hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-9 w-9 ring-2 ring-gray-100",
            },
          }}
          afterSignOutUrl="/"
        />
      </div>
    </header>
  );
}
