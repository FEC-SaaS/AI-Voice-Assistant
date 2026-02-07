import Link from "next/link";
import { Bot } from "lucide-react";

const FOOTER_LINKS = {
  Product: [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
    { href: "/sign-up", label: "Get Started" },
  ],
  Company: [
    { href: "/contact", label: "Contact" },
    { href: "/blog", label: "Blog" },
  ],
  Resources: [
    { href: "/blog", label: "Documentation" },
    { href: "/blog", label: "API Reference" },
  ],
  Legal: [
    { href: "/contact", label: "Privacy Policy" },
    { href: "/contact", label: "Terms of Service" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              <span className="font-semibold">CallTone AI</span>
            </Link>
            <p className="mt-3 text-sm text-gray-500">
              Enterprise-grade AI voice agents for modern businesses.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-900">{category}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={`${category}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-gray-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t pt-6">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} CallTone AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
