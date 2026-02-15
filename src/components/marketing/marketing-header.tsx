"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/blog", label: "Blog" },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold gradient-text">CallTone</span>
        </Link>

        {/* Mobile: OPEN DASHBOARD centered between logo and menu icon */}
        <Link href="/sign-in" className="md:hidden">
          <button className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-all duration-300 hover:bg-amber-500 active:scale-[0.98]">
            OPEN DASHBOARD
          </button>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors duration-200 ${
                pathname === link.href
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop: only OPEN DASHBOARD (SIGN UP is in hero center) */}
        <div className="hidden md:flex items-center">
          <Link href="/sign-in">
            <button className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-500/25 hover:-translate-y-0.5 active:scale-[0.98]">
              OPEN DASHBOARD
            </button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-foreground hover:bg-secondary transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu dropdown - nav links only */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-card/95 backdrop-blur-md animate-fade-in">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  pathname === link.href
                    ? "font-medium text-foreground bg-secondary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
