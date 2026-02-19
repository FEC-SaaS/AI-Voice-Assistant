"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";

export function AdminHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="destructive" className="gap-1.5 text-xs">
          <Shield className="h-3 w-3" />
          Super Admin
        </Badge>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
