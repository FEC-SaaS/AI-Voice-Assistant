"use client";

import { Bell, Search } from "lucide-react";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      {/* Search */}
      <div className="flex flex-1 items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="h-10 w-full rounded-md border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <OrganizationSwitcher
          appearance={{
            elements: {
              rootBox: "flex items-center",
              organizationSwitcherTrigger:
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50",
            },
          }}
        />
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-9 w-9",
            },
          }}
          afterSignOutUrl="/"
        />

        {/* Notifications */}
        <button className="relative rounded-full p-2 hover:bg-gray-100">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
      </div>
    </header>
  );
}
