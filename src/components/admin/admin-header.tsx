"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

export function AdminHeader() {
  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between px-6"
      style={{
        background: "rgba(6,6,17,0.8)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(99,102,241,0.08)",
      }}
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-all duration-150"
        style={{
          color: "rgba(241,245,249,0.4)",
          border: "1px solid transparent",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#f1f5f9";
          e.currentTarget.style.background = "rgba(99,102,241,0.08)";
          e.currentTarget.style.border = "1px solid rgba(99,102,241,0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(241,245,249,0.4)";
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.border = "1px solid transparent";
        }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="flex items-center gap-4">
        {/* Live indicator */}
        <div className="hidden items-center gap-2 sm:flex">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ background: "#10b981" }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: "#10b981" }}
            />
          </span>
          <span className="text-xs font-medium" style={{ color: "rgba(241,245,249,0.35)" }}>
            Live
          </span>
        </div>

        {/* Super Admin badge */}
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(129,140,248,0.1) 100%)",
            border: "1px solid rgba(99,102,241,0.25)",
            color: "#a5b4fc",
            boxShadow: "0 0 12px rgba(99,102,241,0.15)",
          }}
        >
          <Shield className="h-3 w-3" />
          Super Admin
        </div>

        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
